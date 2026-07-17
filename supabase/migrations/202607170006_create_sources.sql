create function public.create_source_with_chunks(
  input_source_id uuid,
  input_project_id uuid,
  input_title text,
  input_type text,
  input_storage_path text,
  input_normalized_content text,
  input_character_count integer,
  input_chunks jsonb
)
returns public.sources
language plpgsql
security definer
set search_path = public
as $$
declare
  created_source public.sources;
  active_project_character_count integer;
begin
  if not public.is_project_member(input_project_id) then
    raise exception 'not_authorized';
  end if;

  if input_type not in ('pasted_text', 'text_upload')
    or input_character_count <> char_length(input_normalized_content)
    or input_character_count <= 0 then
    raise exception 'invalid_source_input';
  end if;

  if (input_type = 'pasted_text' and input_storage_path is not null)
    or (input_type = 'text_upload' and input_storage_path is null) then
    raise exception 'invalid_source_storage';
  end if;

  select coalesce(sum(character_count), 0) into active_project_character_count
  from public.sources
  where project_id = input_project_id
    and deleted_at is null;

  if active_project_character_count + input_character_count > 120000 then
    raise exception 'project_source_limit_exceeded';
  end if;

  insert into public.sources (
    id,
    project_id,
    title,
    input_type,
    storage_path,
    normalized_content,
    character_count,
    uploaded_by
  )
  values (
    input_source_id,
    input_project_id,
    trim(input_title),
    input_type,
    input_storage_path,
    input_normalized_content,
    input_character_count,
    auth.uid()
  )
  returning * into created_source;

  insert into public.source_chunks (
    source_id,
    chunk_index,
    content,
    start_offset,
    end_offset
  )
  select
    created_source.id,
    chunk.chunk_index,
    chunk.content,
    chunk.start_offset,
    chunk.end_offset
  from jsonb_to_recordset(input_chunks) as chunk(
    chunk_index integer,
    content text,
    start_offset integer,
    end_offset integer
  )
  order by chunk.chunk_index;

  return created_source;
end;
$$;

revoke all on function public.create_source_with_chunks(uuid, uuid, text, text, text, text, integer, jsonb) from public;
grant execute on function public.create_source_with_chunks(uuid, uuid, text, text, text, text, integer, jsonb) to authenticated;
