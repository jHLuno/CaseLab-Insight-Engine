create function public.queue_analysis_run(
  input_project_id uuid,
  input_model text,
  input_prompt_version text
)
returns public.analysis_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  project_objective text;
  source_snapshot uuid[];
  question_snapshot jsonb;
  created_run public.analysis_runs;
begin
  if not public.is_project_member(input_project_id) then
    raise exception 'not_authorized';
  end if;

  select research_objective into project_objective
  from public.projects
  where id = input_project_id;

  select array_agg(id order by created_at) into source_snapshot
  from public.sources
  where project_id = input_project_id
    and deleted_at is null;

  if char_length(trim(coalesce(project_objective, ''))) = 0
    or cardinality(source_snapshot) is null then
    raise exception 'analysis_requires_objective_and_source';
  end if;

  select coalesce(jsonb_agg(question order by position), '[]'::jsonb) into question_snapshot
  from public.research_questions
  where project_id = input_project_id;

  insert into public.analysis_runs (
    project_id,
    source_ids,
    objective_snapshot,
    research_questions_snapshot,
    model,
    prompt_version,
    status
  ) values (
    input_project_id,
    source_snapshot,
    trim(project_objective),
    question_snapshot,
    trim(input_model),
    trim(input_prompt_version),
    'queued'
  ) returning * into created_run;

  return created_run;
end;
$$;

create function public.retry_analysis_run(input_run_id uuid)
returns public.analysis_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  retried_run public.analysis_runs;
begin
  select * into retried_run
  from public.analysis_runs
  where id = input_run_id
  for update;

  if retried_run.id is null or not public.is_project_member(retried_run.project_id) then
    raise exception 'not_authorized';
  end if;

  if retried_run.status <> 'failed' then
    raise exception 'analysis_run_not_retryable';
  end if;

  update public.analysis_runs
  set status = 'queued', safe_error_code = null
  where id = input_run_id
  returning * into retried_run;

  return retried_run;
end;
$$;

create function public.persist_verified_analysis_output(
  input_run_id uuid,
  input_output jsonb,
  input_usage jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_run public.analysis_runs;
  output_item jsonb;
  linked_local_id text;
  evidence_id uuid;
  entity_id uuid;
  source_chunk_content text;
  source_chunk_source_id uuid;
  evidence_id_map jsonb := '{}'::jsonb;
begin
  select * into current_run
  from public.analysis_runs
  where id = input_run_id
  for update;

  if current_run.id is null or current_run.status <> 'running' then
    raise exception 'analysis_run_not_running';
  end if;

  for output_item in select value from jsonb_array_elements(input_output -> 'evidence') loop
    select source_id, content into source_chunk_source_id, source_chunk_content
    from public.source_chunks
    where id = (output_item ->> 'sourceChunkId')::uuid;

    if source_chunk_source_id is null
      or source_chunk_source_id <> (output_item ->> 'sourceId')::uuid
      or not (source_chunk_source_id = any(current_run.source_ids))
      or position(output_item ->> 'quote' in source_chunk_content) = 0 then
      raise exception 'invalid_verified_evidence';
    end if;

    insert into public.evidence_items (
      analysis_run_id,
      source_id,
      source_chunk_id,
      quote,
      category,
      speaker_label,
      normalized_claim
    ) values (
      input_run_id,
      source_chunk_source_id,
      (output_item ->> 'sourceChunkId')::uuid,
      output_item ->> 'quote',
      output_item ->> 'category',
      nullif(output_item ->> 'speakerLabel', ''),
      output_item ->> 'claim'
    ) returning id into evidence_id;

    evidence_id_map := evidence_id_map || jsonb_build_object(output_item ->> 'localId', evidence_id::text);
  end loop;

  for output_item in select value from jsonb_array_elements(input_output -> 'themes') loop
    insert into public.themes (analysis_run_id, title, description)
    values (input_run_id, output_item ->> 'title', output_item ->> 'description')
    returning id into entity_id;

    for linked_local_id in select value from jsonb_array_elements_text(output_item -> 'evidenceLocalIds') loop
      evidence_id := nullif(evidence_id_map ->> linked_local_id, '')::uuid;
      if evidence_id is null then raise exception 'missing_evidence_reference'; end if;
      insert into public.theme_evidence (theme_id, evidence_id) values (entity_id, evidence_id);
    end loop;
  end loop;

  for output_item in select value from jsonb_array_elements(input_output -> 'insights') loop
    if output_item ->> 'status' = 'validated'
      and jsonb_array_length(output_item -> 'evidenceLocalIds') = 0 then
      raise exception 'validated_insight_without_evidence';
    end if;

    insert into public.insights (
      analysis_run_id, title, description, status, confidence, contradiction_flag, limitations
    ) values (
      input_run_id,
      output_item ->> 'title',
      output_item ->> 'description',
      output_item ->> 'status',
      output_item ->> 'confidence',
      coalesce((output_item ->> 'contradictionFlag')::boolean, false),
      coalesce(output_item -> 'limitations', '[]'::jsonb)
    ) returning id into entity_id;

    for linked_local_id in select value from jsonb_array_elements_text(output_item -> 'evidenceLocalIds') loop
      evidence_id := nullif(evidence_id_map ->> linked_local_id, '')::uuid;
      if evidence_id is null then raise exception 'missing_evidence_reference'; end if;
      insert into public.insight_evidence (insight_id, evidence_id) values (entity_id, evidence_id);
    end loop;
  end loop;

  for output_item in select value from jsonb_array_elements(input_output -> 'hypotheses') loop
    insert into public.hypotheses (analysis_run_id, title, description, suggested_validation)
    values (
      input_run_id,
      output_item ->> 'title',
      output_item ->> 'description',
      output_item ->> 'suggestedValidation'
    ) returning id into entity_id;

    for linked_local_id in select value from jsonb_array_elements_text(output_item -> 'evidenceLocalIds') loop
      evidence_id := nullif(evidence_id_map ->> linked_local_id, '')::uuid;
      if evidence_id is null then raise exception 'missing_evidence_reference'; end if;
      insert into public.hypothesis_evidence (hypothesis_id, evidence_id) values (entity_id, evidence_id);
    end loop;
  end loop;

  for output_item in select value from jsonb_array_elements(input_output -> 'researchGaps') loop
    insert into public.research_gaps (analysis_run_id, question, reason, suggested_next_questions)
    values (
      input_run_id,
      output_item ->> 'question',
      output_item ->> 'reason',
      output_item -> 'suggestedNextQuestions'
    );
  end loop;

  update public.analysis_runs
  set status = 'completed', usage = coalesce(input_usage, '{}'::jsonb), safe_error_code = null
  where id = input_run_id;
end;
$$;

revoke all on function public.queue_analysis_run(uuid, text, text) from public;
revoke all on function public.retry_analysis_run(uuid) from public;
revoke all on function public.persist_verified_analysis_output(uuid, jsonb, jsonb) from public;
grant execute on function public.queue_analysis_run(uuid, text, text) to authenticated;
grant execute on function public.retry_analysis_run(uuid) to authenticated;
grant execute on function public.persist_verified_analysis_output(uuid, jsonb, jsonb) to service_role;
