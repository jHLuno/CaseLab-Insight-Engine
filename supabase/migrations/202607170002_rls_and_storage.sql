create function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = target_project_id
      and public.is_organization_member(organization_id)
  );
$$;

create function public.storage_object_organization_id(object_name text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select nullif(
    substring(object_name from '^organizations/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'),
    ''
  )::uuid;
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.research_questions enable row level security;
alter table public.sources enable row level security;
alter table public.source_chunks enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.evidence_items enable row level security;
alter table public.themes enable row level security;
alter table public.theme_evidence enable row level security;
alter table public.insights enable row level security;
alter table public.insight_evidence enable row level security;
alter table public.hypotheses enable row level security;
alter table public.hypothesis_evidence enable row level security;
alter table public.research_gaps enable row level security;
alter table public.report_exports enable row level security;

create policy "organization members can view their organization"
on public.organizations for select
using (public.is_organization_member(id));

create policy "organization members can view memberships"
on public.organization_members for select
using (public.is_organization_member(organization_id));

create policy "organization members can view projects"
on public.projects for select
using (public.is_organization_member(organization_id));

create policy "organization members can create projects"
on public.projects for insert
with check (public.is_organization_member(organization_id));

create policy "organization members can update projects"
on public.projects for update
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "organization members can manage research questions"
on public.research_questions for all
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "organization members can view sources"
on public.sources for select
using (public.is_project_member(project_id));

create policy "organization members can create sources"
on public.sources for insert
with check (public.is_project_member(project_id));

create policy "organization members can update sources"
on public.sources for update
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

create policy "organization members can view source chunks"
on public.source_chunks for select
using (
  exists (
    select 1 from public.sources
    where sources.id = source_chunks.source_id
      and public.is_project_member(sources.project_id)
  )
);

create policy "organization members can view analysis runs"
on public.analysis_runs for select
using (public.is_project_member(project_id));

create policy "organization members can view evidence"
on public.evidence_items for select
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = evidence_items.analysis_run_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view themes"
on public.themes for select
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = themes.analysis_run_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view theme evidence"
on public.theme_evidence for select
using (
  exists (
    select 1 from public.themes
    join public.analysis_runs on analysis_runs.id = themes.analysis_run_id
    where themes.id = theme_evidence.theme_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view insights"
on public.insights for select
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = insights.analysis_run_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view insight evidence"
on public.insight_evidence for select
using (
  exists (
    select 1 from public.insights
    join public.analysis_runs on analysis_runs.id = insights.analysis_run_id
    where insights.id = insight_evidence.insight_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view hypotheses"
on public.hypotheses for select
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = hypotheses.analysis_run_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view hypothesis evidence"
on public.hypothesis_evidence for select
using (
  exists (
    select 1 from public.hypotheses
    join public.analysis_runs on analysis_runs.id = hypotheses.analysis_run_id
    where hypotheses.id = hypothesis_evidence.hypothesis_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view research gaps"
on public.research_gaps for select
using (
  exists (
    select 1 from public.analysis_runs
    where analysis_runs.id = research_gaps.analysis_run_id
      and public.is_project_member(analysis_runs.project_id)
  )
);

create policy "organization members can view report exports"
on public.report_exports for select
using (public.is_project_member(project_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caselab-sources', 'caselab-sources', false, 1048576, array['text/plain'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "organization members can access private source files"
on storage.objects for select
using (
  bucket_id = 'caselab-sources'
  and public.is_organization_member(public.storage_object_organization_id(name))
);

create policy "organization members can upload private source files"
on storage.objects for insert
with check (
  bucket_id = 'caselab-sources'
  and owner_id = auth.uid()
  and public.is_organization_member(public.storage_object_organization_id(name))
);

create policy "organization members can delete private source files"
on storage.objects for delete
using (
  bucket_id = 'caselab-sources'
  and public.is_organization_member(public.storage_object_organization_id(name))
);
