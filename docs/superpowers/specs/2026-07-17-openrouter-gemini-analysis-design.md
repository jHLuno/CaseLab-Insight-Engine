# OpenRouter Gemini analysis design

**Date:** 2026-07-17  
**Status:** Approved in conversation; awaiting written-spec review  
**Scope:** Add the first live analysis flow to an existing authenticated CaseLab project.

## Decision

CaseLab will call OpenRouter from server-only code using `google/gemini-2.5-flash-lite`. The account owner supplies `OPENROUTER_API_KEY`; product users do not select a model, create provider accounts, or receive provider credentials.

The user explicitly approved sending saved research text to OpenRouter and the selected underlying Gemini provider for this version. This is documented because source material is confidential by default.

The provider integration stays behind an `AnalysisProvider` interface. The configured model is stored on each analysis run, so a future provider (for example Ollama or OpenAI) can be added without changing the research workflow or reinterpreting prior runs.

## User flow

1. An authenticated project member adds one or more sources and supplies a non-empty research objective.
2. The project page shows sources as ready and exposes **Run analysis** only when those preconditions are true.
3. The action creates an immutable run snapshot containing active source IDs, the objective, optional research questions, model, and prompt version. It then queues a background job with only the run ID.
4. The project page shows accessible queued, running, completed, and failed states. A failed retryable run offers **Retry analysis** without losing earlier runs or sources.
5. A completed run presents evidence first, followed by themes, insights, hypotheses, and research gaps. Each evidence item displays its exact quote and opens its source chunk. Validated insights always include linked evidence; hypotheses and gaps remain visibly distinct.

No conversational chat UI, user-selectable model setting, export, embeddings, or semantic retrieval are part of this increment. The existing bounded source limit keeps the run input small enough for direct chunk analysis.

## Architecture and data flow

```text
Project page
  -> authenticated server action
  -> analysis_runs snapshot (queued)
  -> Trigger.dev task (analysisRunId only)
  -> load authorized source chunks from Supabase
  -> OpenRouter / Gemini 2.5 Flash-Lite (strict JSON schema)
  -> Zod validation + exact quote verification
  -> evidence_items first, then derived records
  -> completed/failed run status returned to the project page
```

- The browser never receives raw provider credentials or calls OpenRouter directly.
- `OPENROUTER_API_KEY` and `ANALYSIS_MODEL` are server-only environment variables. The default model is `google/gemini-2.5-flash-lite`.
- The OpenRouter adapter uses strict JSON-schema output, with a low-variance request configuration. CaseLab validates the response again rather than trusting provider conformance.
- The durable task receives only an analysis run ID, retrieves inputs itself, and never logs prompt text, chunks, quotes, provider responses, or API keys.
- Each run records only safe metadata: selected model, prompt version, input/output token counts when provided, duration, source count, and a safe failure code.

## Evidence and failure rules

The prompt requires chunk UUID references and exact quotes. Post-provider verification rejects:

- quotes that do not occur verbatim in their declared chunk;
- unknown chunks or evidence local IDs;
- themes, hypotheses, or insights that reference missing evidence;
- a validated insight with no verified evidence;
- malformed or unsupported structured output.

Any rejection marks the run failed with a user-safe code. No partial derived records are visible. Transient provider and network failures are retryable; configuration and validation failures are not automatically retried. If the material cannot support an answer, the provider returns research gaps rather than an invented conclusion.

## Database/API changes

The existing tables support the required entities. One additive Supabase migration will add controlled RPCs or policies for:

- creating an authorized run snapshot;
- updating run status and safe usage metadata from trusted task code;
- atomically persisting verified evidence and dependent entities;
- reading one project member's analysis history and completed result graph.

The public action contract is limited to a project ID for queuing and an analysis-run ID for retrying. Background task payloads contain `analysisRunId` only. No raw source text crosses either application boundary.

## Files and dependencies

Expected changes include:

- `supabase/migrations/` — one additive analysis access/persistence migration.
- `packages/prompts/` — versioned Gemini-neutral evidence-first prompt.
- `apps/web/src/server/analysis/` — run lifecycle, provider interface, OpenRouter adapter, validation, and persistence services.
- `apps/web/trigger/` — Trigger.dev client and analysis task.
- `apps/web/src/components/analysis/` and project page — run action, status, history, results, and evidence inspection.
- `apps/web/.env.example` and root environment documentation — OpenRouter configuration without real values.
- Tests for each service and UI state.

Use the platform `fetch` API rather than adding an OpenRouter SDK: the endpoint is OpenAI-compatible and the project does not need another dependency. Trigger.dev remains the existing approved background-job choice.

## Verification

- Unit tests use fixture providers only; they never call OpenRouter, Trigger.dev, or real source data.
- Regression tests prove that quote mismatches and unsupported validated insights cannot persist.
- Service tests cover authorization, missing objective/sources, immutable snapshots, failure/retry transitions, and safe error mapping.
- Component tests cover disabled, queued, running, completed, failed, empty, and retry states.
- Migration contract tests cover new tables/functions/policies as applicable.
- Final verification runs lint, typecheck, unit tests, build, and a manual local project analysis once the account owner configures valid Supabase, Trigger.dev, and OpenRouter credentials.

## Configuration required from the account owner

```env
OPENROUTER_API_KEY=
ANALYSIS_MODEL=google/gemini-2.5-flash-lite
TRIGGER_SECRET_KEY=
```

The OpenRouter key is added only to `apps/web/.env.local` for local development and deployment environment settings for production; it is never committed. Trigger.dev must be configured before a real background analysis can run.
