create function public.delete_source_cascade(source_uuid uuid)
returns table(storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_project_id uuid;
begin
  select project_id into target_project_id
  from public.sources
  where id = source_uuid
    and deleted_at is null
  for update;

  if target_project_id is null then
    raise exception 'source_not_found';
  end if;

  if not public.is_project_member(target_project_id) then
    raise exception 'not_authorized';
  end if;

  return query
  select sources.storage_path
  from public.sources
  where sources.id = source_uuid
    and sources.storage_path is not null;

  delete from public.evidence_items
  where analysis_run_id in (
    select id from public.analysis_runs where source_uuid = any(source_ids)
  );

  delete from public.themes
  where analysis_run_id in (
    select id from public.analysis_runs where source_uuid = any(source_ids)
  );

  delete from public.insights
  where analysis_run_id in (
    select id from public.analysis_runs where source_uuid = any(source_ids)
  );

  delete from public.hypotheses
  where analysis_run_id in (
    select id from public.analysis_runs where source_uuid = any(source_ids)
  );

  delete from public.research_gaps
  where analysis_run_id in (
    select id from public.analysis_runs where source_uuid = any(source_ids)
  );

  delete from public.report_exports
  where project_id = target_project_id;

  update public.analysis_runs
  set status = 'invalidated', safe_error_code = 'source_deleted'
  where source_uuid = any(source_ids);

  update public.sources
  set deleted_at = timezone('utc', now()), normalized_content = '', character_count = 0
  where id = source_uuid;

  delete from public.source_chunks where source_id = source_uuid;
end;
$$;

create function public.delete_project_cascade(project_uuid uuid)
returns table(storage_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_member(project_uuid) then
    raise exception 'not_authorized';
  end if;

  return query
  select sources.storage_path
  from public.sources
  where sources.project_id = project_uuid
    and sources.storage_path is not null;

  delete from public.projects where id = project_uuid;
end;
$$;

revoke all on function public.delete_source_cascade(uuid) from public;
revoke all on function public.delete_project_cascade(uuid) from public;
grant execute on function public.delete_source_cascade(uuid) to authenticated;
grant execute on function public.delete_project_cascade(uuid) to authenticated;
