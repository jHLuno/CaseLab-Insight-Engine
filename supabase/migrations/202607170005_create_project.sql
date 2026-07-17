create function public.create_project_with_questions(
  project_name text,
  project_description text,
  project_research_objective text,
  project_questions jsonb default '[]'::jsonb
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_organization_id uuid;
  created_project public.projects;
begin
  select organization_id into caller_organization_id
  from public.organization_members
  where user_id = auth.uid();

  if caller_organization_id is null then
    raise exception 'not_authorized';
  end if;

  insert into public.projects (organization_id, name, description, research_objective)
  values (
    caller_organization_id,
    trim(project_name),
    coalesce(project_description, ''),
    trim(project_research_objective)
  )
  returning * into created_project;

  insert into public.research_questions (project_id, question, position)
  select
    created_project.id,
    trim(question.value),
    question.position - 1
  from jsonb_array_elements_text(project_questions) with ordinality as question(value, position)
  where char_length(trim(question.value)) > 0;

  return created_project;
end;
$$;

revoke all on function public.create_project_with_questions(text, text, text, jsonb) from public;
grant execute on function public.create_project_with_questions(text, text, text, jsonb) to authenticated;
