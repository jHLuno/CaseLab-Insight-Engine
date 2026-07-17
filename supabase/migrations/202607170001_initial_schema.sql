create extension if not exists pgcrypto;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (organization_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text not null default '',
  research_objective text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.research_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 2000),
  position integer not null check (position >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (project_id, position)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 255),
  input_type text not null check (input_type in ('pasted_text', 'text_upload')),
  storage_path text,
  normalized_content text not null,
  character_count integer not null check (character_count >= 0),
  uploaded_by uuid not null references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (input_type = 'pasted_text' and storage_path is null)
    or (input_type = 'text_upload' and storage_path is not null)
  )
);

create table public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) > 0),
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset > start_offset),
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_id, chunk_index),
  unique (source_id, id)
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_ids uuid[] not null check (cardinality(source_ids) > 0),
  objective_snapshot text not null check (char_length(trim(objective_snapshot)) > 0),
  research_questions_snapshot jsonb not null default '[]'::jsonb,
  model text not null,
  prompt_version text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'invalidated')),
  safe_error_code text,
  trigger_run_id text,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  source_id uuid not null,
  source_chunk_id uuid not null,
  quote text not null check (char_length(trim(quote)) > 0),
  category text not null check (category in ('pain', 'need', 'motivation', 'objection', 'desire', 'language_pattern', 'other')),
  speaker_label text,
  normalized_claim text not null check (char_length(trim(normalized_claim)) > 0),
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (source_id, source_chunk_id) references public.source_chunks(source_id, id) on delete cascade
);

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.theme_evidence (
  theme_id uuid not null references public.themes(id) on delete cascade,
  evidence_id uuid not null references public.evidence_items(id) on delete cascade,
  primary key (theme_id, evidence_id)
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  status text not null check (status in ('validated', 'emerging', 'hypothesis', 'needs_more_research')),
  confidence text not null check (confidence in ('high', 'medium', 'low', 'unknown')),
  contradiction_flag boolean not null default false,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.insight_evidence (
  insight_id uuid not null references public.insights(id) on delete cascade,
  evidence_id uuid not null references public.evidence_items(id) on delete cascade,
  primary key (insight_id, evidence_id)
);

create table public.hypotheses (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  suggested_validation text not null check (char_length(trim(suggested_validation)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.hypothesis_evidence (
  hypothesis_id uuid not null references public.hypotheses(id) on delete cascade,
  evidence_id uuid not null references public.evidence_items(id) on delete cascade,
  primary key (hypothesis_id, evidence_id)
);

create table public.research_gaps (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  question text not null check (char_length(trim(question)) > 0),
  reason text not null check (char_length(trim(reason)) > 0),
  suggested_next_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  generated_at timestamptz not null default timezone('utc', now()),
  artifact_metadata jsonb not null default '{}'::jsonb
);

create index projects_organization_id_idx on public.projects(organization_id);
create index sources_project_id_active_idx on public.sources(project_id) where deleted_at is null;
create index source_chunks_source_id_idx on public.source_chunks(source_id, chunk_index);
create index analysis_runs_project_id_idx on public.analysis_runs(project_id, created_at desc);
create index evidence_items_analysis_run_id_idx on public.evidence_items(analysis_run_id);

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger research_questions_set_updated_at before update on public.research_questions
for each row execute function public.set_updated_at();
create trigger sources_set_updated_at before update on public.sources
for each row execute function public.set_updated_at();
create trigger analysis_runs_set_updated_at before update on public.analysis_runs
for each row execute function public.set_updated_at();
