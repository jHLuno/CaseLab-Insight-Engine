# CaseLab Evidence-First Thin Slice Design

- **Date:** 2026-07-17
- **Status:** Approved for implementation planning
- **Scope:** First independently usable vertical slice of CaseLab Insight Engine

## Goal

Deliver an authenticated, evidence-first research workflow in which a user can create a project, add pasted text or `.txt` sources, run live OpenAI analysis, inspect every result against exact source evidence, and export an authorized Markdown report.

## Product invariants

- No visible insight is `validated` unless it links to one or more persisted evidence items.
- Every evidence item contains an exact quote and points to a source chunk in the same project.
- Evidence, themes, insights, hypotheses, and research gaps remain separate entities and UI views.
- Contradictions, limitations, confidence, and source counts are visible with each insight.
- Raw research content is confidential by default. It is never written to application logs or exposed through public storage URLs.
- A user can access only data owned by an organization they belong to.
- Analysis uses the saved project objective and an immutable snapshot of eligible source IDs.

## Scope

### Included

- English email/password sign-up and sign-in using Supabase Auth.
- One automatically provisioned personal organization per first-time user.
- Project creation, rename, archive, and deletion.
- Required project research objective and optional research questions.
- Pasted plain text and `.txt` uploads.
- Private source-file storage, normalized text, and deterministic source chunking.
- Live OpenAI analysis with versioned prompts, typed structured outputs, and server-side validation.
- Durable Trigger.dev analysis jobs with queued, running, completed, failed, and retryable states.
- Evidence, themes, insights, hypotheses, research gaps, and Markdown report export.
- Source deletion that removes its private object and all affected derived data.
- Unit, integration, and browser-flow tests using controlled fixtures rather than live AI calls.

### Explicitly deferred

- `.md`, `.csv`, `.docx`, and `.pdf` parsing.
- pgvector, embeddings, and semantic retrieval.
- PDF export.
- Organization invitations, shared teams, roles beyond the owner, and client review links.
- Social login, localization, and non-English interface copy.
- Comments, approvals, version history, templates, integrations, and external imports.

## Architecture

```text
Signed-in researcher
  -> Next.js application
     -> Supabase Auth
     -> Supabase PostgreSQL with RLS
     -> Private Supabase Storage bucket
     -> Server-side route or server action
        -> Trigger.dev analysis task
           -> OpenAI structured-output request
           -> Supabase PostgreSQL
```

### Application boundary

- The Next.js App Router application owns the English user interface, server-side authorization checks, request validation, and report download response.
- Supabase provides authentication, PostgreSQL, database migrations, row-level security (RLS), and the private source-file bucket.
- Trigger.dev runs durable analysis tasks, retries transient failures, and exposes safe run status to the application.
- OpenAI is called only from the Trigger.dev task using a server-only API key. The browser never receives provider secrets.
- The first slice analyzes all eligible chunks in a project. It deliberately does not add vector retrieval until documents exceed the bounded input limit.

### Tenant and authorization model

- A user is identified by the Supabase Auth user ID.
- Provisioning creates one `organization` and one owner `organization_member` record for a first-time user. The operation is idempotent.
- Every project belongs to one organization. Every source, chunk, analysis run, and derived output reaches its organization through that project.
- RLS protects all client-accessible tables. Server routes independently verify the authenticated user and organization membership before privileged operations.
- The Supabase service-role key is restricted to trusted server and background-task code. It is never imported into client modules.

### Source storage and input limits

- Sources are either pasted text or a UTF-8 `.txt` upload.
- A `.txt` upload is limited to 1 MiB. Pasted text is limited to 100,000 Unicode characters.
- A project’s active sources are limited to 120,000 normalized characters for one analysis run. The source action rejects an upload or paste that would exceed this cap and explains that larger-document support is not available in this slice.
- Uploaded source files live in a private bucket at `organizations/{organizationId}/projects/{projectId}/sources/{sourceId}/original.txt`.
- A source record stores metadata and normalized text; its chunks store exact start and end character offsets into the normalized text.

## Data model

All domain IDs are UUIDs. Domain tables include `created_at` and `updated_at` timestamps unless the record is intentionally append-only.

| Table | Responsibility | Required integrity rules |
|---|---|---|
| `organizations` | Tenant identity | A user interacts only through membership. |
| `organization_members` | User-to-organization access | Initial release creates exactly one owner membership per newly provisioned organization. |
| `projects` | Research scope | Includes name, description, research objective, status, and organization ID. Analysis requires a non-empty objective. |
| `research_questions` | Optional project questions | Belongs to a project and is included in the analysis snapshot. |
| `sources` | Original research item | Includes project ID, title, input type, storage path when uploaded, normalized content, safe metadata, uploader ID, and deletion timestamp. |
| `source_chunks` | Traceable normalized excerpts | Includes source ID, ordered index, text, and exact character offsets. |
| `analysis_runs` | Durable analysis record | Includes project ID, immutable source-ID snapshot, objective snapshot, model configuration, prompt version, status, safe error code, and Trigger.dev run ID. |
| `evidence_items` | Exact attributable claims | Includes source ID, source chunk ID, quote, category, optional speaker label, normalized claim, and analysis run ID. Quote verification is mandatory before persistence. |
| `themes` and `theme_evidence` | Repeated patterns | A theme is scoped to one analysis run and links to one or more evidence items from that run. |
| `insights` and `insight_evidence` | Supported interpretations | An insight has status, confidence, limitations, contradiction flag, and evidence links. `validated` requires at least one evidence link. |
| `hypotheses` | Explicitly unconfirmed ideas | Uses a hypothesis-only status and may link to evidence, but never presents itself as validated. |
| `research_gaps` | Important unknowns | States why current evidence cannot answer the question and can include suggested next questions. |
| `report_exports` | Export audit metadata | Stores project ID, requesting user ID, generated time, and artifact metadata without duplicating unneeded raw source text. |

## Analysis contract and persistence order

### Run creation

1. The authenticated owner requests analysis for a project.
2. The server verifies membership, a research objective, at least one active source, and the project character cap.
3. The server inserts an `analysis_runs` record with status `queued`, an immutable source-ID snapshot, objective snapshot, model configuration, and prompt version.
4. The server triggers a Trigger.dev task with only the analysis run ID.

### Background analysis

1. The task loads the analysis run and source snapshot from trusted server code.
2. It transitions the run to `running` and records safe progress metadata only.
3. It sends the objective, optional research questions, and chunk IDs/text to OpenAI using a versioned prompt and JSON-schema structured output.
4. It validates the provider response against shared schemas.
5. It verifies every proposed evidence quote is an exact substring of its declared source chunk. Invalid evidence is rejected; the task does not repair or invent a quote.
6. It persists evidence first, then themes, then insights, hypotheses, and research gaps in a transactionally safe order.
7. It rejects a `validated` insight without persisted evidence links. Contradictory support sets the contradiction flag and requires visible limitations.
8. It marks the run `completed`, or `failed` with a safe error code and retry eligibility.

### Output semantics

- **Evidence:** exact quote or attributable source statement.
- **Theme:** repeated observation connected to evidence.
- **Insight:** interpretation connected to evidence and a confidence level.
- **Hypothesis:** plausible but unconfirmed idea; never labeled as validated.
- **Research gap:** important question the current evidence cannot answer.
- **Confidence:** measures the breadth, independence, consistency, specificity, and contradictions of evidence—not rhetorical quality.

## Deletion and data integrity

Deleting a source requires an explicit confirmation. The operation does the following in one controlled lifecycle:

1. Marks the source unavailable so it cannot appear in new retrieval or analysis requests.
2. Removes its private storage object through the Storage API.
3. Removes its source chunks, evidence items, and evidence links.
4. Invalidates every analysis run whose source snapshot included the deleted source and removes that run’s themes, insights, hypotheses, gaps, and export artifacts.
5. Leaves unaffected runs intact. The project shows that a new analysis is required for the remaining active sources.

Project deletion applies the same process to every project source and derived artifact. Audit records retain only safe identifiers, actor, event type, and timestamps; they never retain raw research text.

## User experience

### Screens and states

1. **Sign up / sign in:** English email/password flow with clear confirmation and recovery states.
2. **Empty dashboard:** explains the evidence-first workflow and offers project creation.
3. **Create project:** requires project name and research objective; research questions are optional.
4. **Project sources:** supports pasted text and one `.txt` upload per action; shows source title, type, size/counts, and deletion control.
5. **Analysis status:** shows queued, running, completed, or failed status, a safe error message, and retry when eligible.
6. **Research workspace:** separate Evidence, Themes, Insights, Hypotheses, and Research Gaps views. Status and confidence always use text and iconography in addition to color.
7. **Insight detail:** displays source count, exact supporting quotes, source title, limitations, confidence, and contradiction flag within one or two interactions.
8. **Report export:** renders Markdown from persisted, authorized records and downloads it with project title and generated date.

### Failure and empty behavior

- Source validation errors name the corrective action, such as choosing a readable `.txt` file or reducing total source text.
- A provider, task, or network failure does not discard the analysis run. The UI explains whether retry is available.
- The workspace distinguishes no sources, sources awaiting analysis, no evidence found, and no results due to a failed run.
- No response or log exposes raw source text, provider prompts, API keys, access tokens, or stack traces.

## Testing strategy

### Unit tests

- Request and provider-output schemas.
- Source character/byte limits and deterministic chunk offsets.
- Exact evidence quote verification.
- Confidence/status guards, including rejection of unsupported validated insights.
- Markdown report composition and distinction between evidence, insights, hypotheses, and gaps.

### Integration tests

- Authentication, organization membership, and RLS authorization boundaries.
- Project and source lifecycle, including invalid source input and character-cap enforcement.
- Analysis-run state transitions and safe failure records.
- Source deletion cleanup for storage references, chunks, evidence, and affected outputs.
- Structured output validation and evidence-link persistence.

### Browser-flow tests

- Sign in, create a project, add text, run fixture-backed analysis, inspect evidence, and export Markdown.
- Empty, loading, failure, retry, and unauthorized states.
- Keyboard access and readable status/error semantics for key interactions.

Tests never call OpenAI or Trigger.dev. Adapter fixtures simulate successful, malformed, unsupported, and transient-failure outcomes without using private research material.

## Environment and operational constraints

- Environment variables include public Supabase URL/key, server-only Supabase service-role key, OpenAI API key, Trigger.dev secret key, and the configured analysis model/prompt version.
- Public environment variables contain only values safe for browser delivery. Secrets remain server-only and are documented without sample credentials.
- Production logging records IDs, counts, run statuses, latency, token usage, and safe error codes only.
- Database and RLS changes are migration files. Destructive changes require an explicit, reversible plan.

## Acceptance criteria

- A signed-in user can create a project with an objective and add three small qualitative sources.
- The user can trigger a live OpenAI run without engineering intervention and observe progress or a retryable failure.
- Every displayed insight links to exact stored evidence, source information, confidence, and limitations.
- Hypotheses and research gaps remain visually and semantically distinct from validated insights.
- A user can export a Markdown report that preserves these distinctions.
- A user can delete a source and observe its private file and affected derived results removed from future use.
- Linting, strict type checking, unit/integration/browser tests, accessibility checks, and authorization checks pass before release.

## Follow-on milestones

1. Add document parsers, larger-source ingestion, and retrieval with embeddings/pgvector.
2. Add PDF export and richer report presentation.
3. Add organization invitations, roles, and collaborative review.
4. Add localization and regional integrations.
