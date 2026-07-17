# CaseLab Evidence-First Thin Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build the first authenticated vertical slice: create a research project, add pasted text or .txt sources, run live evidence-first OpenAI analysis, inspect traceable findings, and export Markdown.

**Architecture:** A pnpm workspace contains one Next.js App Router application and shared packages for typed schemas and versioned prompts. Supabase provides authentication, PostgreSQL, RLS, and private source storage; Trigger.dev runs durable analysis jobs; the server-side OpenAI adapter accepts only a strict structured result and persists evidence before all derived research entities.

**Tech Stack:** Node.js 26, pnpm 11, Next.js, React, TypeScript strict mode, Tailwind CSS, Supabase Auth/Postgres/Storage, Trigger.dev, OpenAI JavaScript SDK, Zod, Vitest, Testing Library, Playwright.

## Global Constraints

- The English interface accepts multilingual source text but does not localize UI copy in this slice.
- Store all source files in a private Supabase bucket; never expose a public URL or provider secret.
- Use database migrations, strict TypeScript, Zod schemas, and no undocumented any types.
- An insight marked validated must have one or more persisted evidence links with verified exact quotes.
- Keep evidence, themes, insights, hypotheses, and research gaps separate in API data and UI.
- Log only IDs, counts, durations, statuses, token usage, and safe error codes.
- Limit .txt uploads to 1 MiB, pasted text to 100,000 characters, and active project source text to 120,000 normalized characters.
- Delete chunks, evidence, affected analysis outputs, exports, and private files when their source or project is deleted.
- Configure the analysis model through OPENAI_ANALYSIS_MODEL. The first deployment sets this after the account owner chooses an available model.
- Tests use fixture-backed adapters and never invoke OpenAI, Trigger.dev, or a production Supabase project.

## File Structure

| Path | Responsibility |
|---|---|
| package.json, pnpm-workspace.yaml, pnpm-lock.yaml | Root workspace scripts and dependency lockfile. |
| apps/web | Next.js UI, route handlers, server actions, Trigger.dev tasks, and tests. |
| packages/shared/src | Shared Zod schemas, pure analysis guards, domain types, and report renderer. |
| packages/prompts/src/analysis-v1.ts | Versioned evidence-first model instructions and input construction. |
| supabase/migrations | PostgreSQL schema, RLS policies, storage bucket, and deletion functions. |
| docs | Setup, architectural decisions, plan, and approved design documentation. |
| .github/workflows/ci.yml | Type check, lint, unit/integration tests, and production build. |

---

### Task 1: Bootstrap the workspace and quality gates

**Files:**

- Create: package.json
- Create: pnpm-workspace.yaml
- Create: .gitignore
- Create: .env.example
- Create: apps/web/package.json
- Create: apps/web/next.config.ts
- Create: apps/web/tsconfig.json
- Create: apps/web/vitest.config.ts
- Create: apps/web/playwright.config.ts
- Create: apps/web/app/layout.tsx
- Create: apps/web/app/page.tsx
- Create: apps/web/app/globals.css
- Create: packages/shared/package.json
- Create: packages/shared/tsconfig.json
- Create: packages/prompts/package.json
- Create: packages/prompts/tsconfig.json

**Interfaces:**

- Produces root scripts: dev, lint, typecheck, test, test:e2e, build, and supabase:types.
- Produces application aliases: @/ for apps/web and @caselab/shared / @caselab/prompts for workspace packages.

- [ ] **Step 1: Write the failing workspace smoke test**

~~~ts
import { describe, expect, it } from "vitest";

describe("workspace", () => {
  it("loads the shared package", async () => {
    const shared = await import("@caselab/shared");
    expect(shared).toBeDefined();
  });
});
~~~

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: pnpm --filter @caselab/web test -- workspace.test.ts

Expected: FAIL because the workspace package and test runner do not yet exist.

- [ ] **Step 3: Create the strict pnpm/Next.js baseline**

Create a root workspace with the following command contract:

~~~json
{
  "scripts": {
    "dev": "pnpm --filter @caselab/web dev",
    "lint": "pnpm --filter @caselab/web lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm --filter @caselab/web test",
    "test:integration": "pnpm --filter @caselab/web test:integration",
    "test:e2e": "pnpm --filter @caselab/web test:e2e",
    "build": "pnpm -r build",
    "supabase:start": "supabase start",
    "supabase:db:reset": "supabase db reset"
  }
}
~~~

Configure TypeScript with strict, noUncheckedIndexedAccess, and noImplicitOverride. Configure Vitest for jsdom component tests and node service tests, and configure Playwright to start the production-equivalent local web server. Add .env.example with blank placeholders only:

~~~text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_ANALYSIS_MODEL=
TRIGGER_SECRET_KEY=
~~~

- [ ] **Step 4: Run the baseline checks**

Run: pnpm install

Expected: pnpm-lock.yaml is created and every workspace package resolves.

Run: pnpm lint && pnpm typecheck && pnpm test

Expected: all commands exit 0 and the smoke test passes.

- [ ] **Step 5: Commit**

~~~bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .gitignore .env.example apps/web packages/shared packages/prompts
git commit -m "chore: bootstrap CaseLab workspace"
~~~

### Task 2: Define shared domain, input, and AI-output contracts

**Files:**

- Create: packages/shared/src/index.ts
- Create: packages/shared/src/domain.ts
- Create: packages/shared/src/schemas.ts
- Create: packages/shared/src/analysis.ts
- Create: packages/shared/src/analysis.test.ts

**Interfaces:**

- Produces AnalysisStatus, InsightStatus, Confidence, EvidenceCategory, and source input enums.
- Produces analysisOutputSchema and verifyEvidenceQuote(input).
- Produces renderable analysis records whose evidence references use UUID sourceChunkId values.

- [ ] **Step 1: Write failing tests for integrity guards**

~~~ts
it("accepts an exact evidence quote from its declared chunk", () => {
  expect(
    verifyEvidenceQuote({
      quote: "I cannot tell what I am paying for.",
      chunkText: "Participant 4: I cannot tell what I am paying for."
    })
  ).toEqual({ valid: true });
});

it("rejects a validated insight without evidence identifiers", () => {
  expect(() =>
    insightSchema.parse({
      title: "Pricing is unclear",
      description: "Customers struggle with pricing.",
      status: "validated",
      confidence: "medium",
      evidenceIds: [],
      contradictionFlag: false,
      limitations: []
    })
  ).toThrow();
});
~~~

- [ ] **Step 2: Run the contract tests to verify they fail**

Run: pnpm --filter @caselab/web test -- analysis.test.ts

Expected: FAIL because the shared schemas and verification function do not exist.

- [ ] **Step 3: Implement the schemas and pure guards**

Use Zod to export the exact status values:

~~~ts
export const insightStatusSchema = z.enum([
  "validated",
  "emerging",
  "hypothesis",
  "needs_more_research"
]);

export const confidenceSchema = z.enum(["high", "medium", "low", "unknown"]);

export function verifyEvidenceQuote(input: {
  quote: string;
  chunkText: string;
}): { valid: true } | { valid: false; reason: "quote_not_found" | "empty_quote" } {
  const quote = input.quote.trim();
  if (quote.length === 0) return { valid: false, reason: "empty_quote" };
  return input.chunkText.includes(quote)
    ? { valid: true }
    : { valid: false, reason: "quote_not_found" };
}
~~~

Define the provider result so themes and derived entities reference evidence local IDs, then validate and translate them to persisted UUIDs in the worker.

- [ ] **Step 4: Run contract and type checks**

Run: pnpm --filter @caselab/web test -- analysis.test.ts && pnpm typecheck

Expected: all tests pass and no implicit any types are reported.

- [ ] **Step 5: Commit**

~~~bash
git add packages/shared
git commit -m "feat: add evidence-first analysis contracts"
~~~

### Task 3: Add the Supabase schema, RLS, and storage lifecycle

**Files:**

- Create: supabase/config.toml
- Create: supabase/migrations/202607170001_initial_schema.sql
- Create: supabase/migrations/202607170002_rls_and_storage.sql
- Create: supabase/migrations/202607170003_deletion_lifecycle.sql
- Create: apps/web/src/server/database/types.ts
- Create: apps/web/src/server/database/database.test.ts

**Interfaces:**

- Produces tables in the approved design plus typed Database definitions generated from the local Supabase schema.
- Produces private bucket caselab-sources and database functions delete_source_cascade(source_uuid) and delete_project_cascade(project_uuid).
- Produces RLS policies based on organization_members and auth.uid().

- [ ] **Step 1: Write failing integration assertions**

~~~ts
it("prevents a non-member from selecting another organization project", async () => {
  const result = await selectProjectsAs(nonMemberUserId);
  expect(result).toEqual([]);
});

it("removes source-derived evidence when an owner deletes a source", async () => {
  await deleteSourceAs(ownerUserId, sourceId);
  expect(await countEvidenceForSource(sourceId)).toBe(0);
});
~~~

- [ ] **Step 2: Run the integration tests against a local Supabase instance**

Run: pnpm --filter @caselab/web test:integration -- database.test.ts

Expected: FAIL because no migration or local database helpers exist.

- [ ] **Step 3: Implement migrations and generated database types**

Create the tables described in the approved design. Use foreign keys, check constraints for enum-like values, and unique constraints for ordered chunks. Enable RLS on every public table. Create a private bucket with a 1 MiB text/plain restriction. Implement policies so an authenticated member can access only rows reachable through their organization membership. Use SECURITY DEFINER deletion functions only after checking the caller is a project member; delete storage objects with trusted server code after the transaction identifies the exact paths.

- [ ] **Step 4: Apply migrations and run integration tests**

Run: pnpm supabase:start

Expected: local Supabase services are healthy.

Run: pnpm supabase:db:reset && pnpm --filter @caselab/web test:integration -- database.test.ts

Expected: RLS and deletion assertions pass.

- [ ] **Step 5: Commit**

~~~bash
git add supabase apps/web/src/server/database
git commit -m "feat: add secure CaseLab data model"
~~~

### Task 4: Implement Supabase SSR authentication and organization provisioning

**Files:**

- Create: apps/web/src/server/supabase/browser.ts
- Create: apps/web/src/server/supabase/server.ts
- Create: apps/web/src/server/supabase/admin.ts
- Create: apps/web/src/server/auth/require-user.ts
- Create: apps/web/src/server/auth/provision-organization.ts
- Create: apps/web/app/(auth)/sign-in/page.tsx
- Create: apps/web/app/(auth)/sign-up/page.tsx
- Create: apps/web/app/auth/callback/route.ts
- Create: apps/web/proxy.ts
- Create: apps/web/src/server/auth/provision-organization.test.ts

**Interfaces:**

- Produces requireUser(): Promise<{ userId: string; email: string; organizationId: string }>.
- Produces provisionOrganization(userId, email) that is safe to call more than once.

- [ ] **Step 1: Write failing provisioning tests**

~~~ts
it("creates exactly one owner organization for a new user", async () => {
  await provisionOrganization(userId, "researcher@example.com");
  await provisionOrganization(userId, "researcher@example.com");
  expect(await countOwnerMemberships(userId)).toBe(1);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: pnpm --filter @caselab/web test -- provision-organization.test.ts

Expected: FAIL because authentication and provisioning services do not exist.

- [ ] **Step 3: Implement SSR clients and pages**

Use the Supabase SSR package for cookie-safe browser/server clients. Keep the admin client inside a server-only module. Sign-up creates the Auth user; the callback or first authenticated request provisions the personal organization idempotently. Protect all application routes with proxy middleware and redirect unauthenticated users to /sign-in.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- provision-organization.test.ts && pnpm typecheck

Expected: provisioning is idempotent and all auth modules type-check.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web
git commit -m "feat: add Supabase authentication"
~~~

### Task 5: Build project management with objective validation

**Files:**

- Create: apps/web/src/server/projects/project-schema.ts
- Create: apps/web/src/server/projects/project-service.ts
- Create: apps/web/src/server/projects/project-actions.ts
- Create: apps/web/app/(app)/layout.tsx
- Create: apps/web/app/(app)/page.tsx
- Create: apps/web/app/(app)/projects/new/page.tsx
- Create: apps/web/app/(app)/projects/[projectId]/page.tsx
- Create: apps/web/src/components/projects/project-form.tsx
- Create: apps/web/src/components/projects/project-list.tsx
- Create: apps/web/src/server/projects/project-service.test.ts

**Interfaces:**

- Produces createProject(input: { name: string; description?: string; researchObjective: string; researchQuestions: string[] }): Promise<Project>.
- Produces getProjectForUser(projectId, user): Promise<Project | null>.

- [ ] **Step 1: Write failing service tests**

~~~ts
it("rejects a project without a research objective", async () => {
  await expect(createProject({ name: "Pricing study", researchObjective: "", researchQuestions: [] }))
    .rejects.toThrow("research objective");
});
~~~

- [ ] **Step 2: Run the project test to verify it fails**

Run: pnpm --filter @caselab/web test -- project-service.test.ts

Expected: FAIL because the project service does not exist.

- [ ] **Step 3: Implement server actions and calm empty states**

Validate input at the action boundary with Zod, derive organization identity through requireUser, and insert via the authenticated server client. The dashboard must render a no-projects explanation, project list, and create-project call to action. Project pages must return notFound for inaccessible IDs.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- project-service.test.ts

Expected: project validation and organization isolation assertions pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web
git commit -m "feat: add research projects"
~~~

### Task 6: Add secure pasted-text and .txt source ingestion

**Files:**

- Create: apps/web/src/server/sources/source-schema.ts
- Create: apps/web/src/server/sources/normalize-source.ts
- Create: apps/web/src/server/sources/chunk-source.ts
- Create: apps/web/src/server/sources/source-service.ts
- Create: apps/web/src/server/sources/source-actions.ts
- Create: apps/web/src/components/sources/paste-source-form.tsx
- Create: apps/web/src/components/sources/upload-source-form.tsx
- Create: apps/web/src/components/sources/source-list.tsx
- Create: apps/web/src/server/sources/source-service.test.ts

**Interfaces:**

- Produces normalizeSourceText(text): string and chunkSource(input): Array<{ index: number; text: string; startOffset: number; endOffset: number }>.
- Produces createPastedSource(projectId, input) and createUploadedSource(projectId, file).
- Produces deleteSource(projectId, sourceId) with explicit caller confirmation at the UI layer.

- [ ] **Step 1: Write failing boundary tests**

~~~ts
it("keeps deterministic offsets while chunking normalized text", () => {
  const chunks = chunkSource("One. Two. Three.", { maxCharacters: 8 });
  expect(chunks[0]).toMatchObject({ index: 0, startOffset: 0 });
  expect(chunks.map((chunk) => chunk.text).join("")).toContain("One.");
});

it("rejects a .txt file larger than one MiB", async () => {
  await expect(validateTextFile(oversizedTextFile)).rejects.toThrow("1 MiB");
});
~~~

- [ ] **Step 2: Run source tests to verify they fail**

Run: pnpm --filter @caselab/web test -- source-service.test.ts

Expected: FAIL because ingestion and chunking functions do not exist.

- [ ] **Step 3: Implement ingestion and private storage**

Normalize line endings without altering quoted words. Chunk deterministically on paragraph/sentence boundaries while retaining offsets. Enforce individual and aggregate limits before database writes. Upload only validated UTF-8 .txt data to the private bucket, persist the source and chunks transactionally, and never log content. The UI distinguishes loading, invalid file, aggregate limit, empty source, success, and retryable network error states.

- [ ] **Step 4: Verify source lifecycle**

Run: pnpm --filter @caselab/web test -- source-service.test.ts && pnpm lint

Expected: limit, chunk offset, and error-state tests pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web
git commit -m "feat: add secure research sources"
~~~

### Task 7: Create analysis-run lifecycle and Trigger.dev entry point

**Files:**

- Create: apps/web/src/server/analysis/run-schema.ts
- Create: apps/web/src/server/analysis/run-service.ts
- Create: apps/web/src/server/analysis/run-actions.ts
- Create: apps/web/trigger/client.ts
- Create: apps/web/trigger/analyze-project.ts
- Create: apps/web/src/components/analysis/run-analysis-button.tsx
- Create: apps/web/src/components/analysis/analysis-status.tsx
- Create: apps/web/src/server/analysis/run-service.test.ts

**Interfaces:**

- Produces queueAnalysisRun(projectId): Promise<{ analysisRunId: string; status: "queued" }>.
- Produces analysis task payload { analysisRunId: string } only; source text never travels through the browser task trigger.
- Produces retryAnalysisRun(analysisRunId) only for failed retryable runs.

- [ ] **Step 1: Write failing state-transition tests**

~~~ts
it("creates a queued run with an immutable source snapshot", async () => {
  const run = await queueAnalysisRun(projectId);
  expect(run.status).toBe("queued");
  expect(await sourceSnapshotFor(run.analysisRunId)).toEqual([sourceId]);
});

it("rejects analysis without an objective and active source", async () => {
  await expect(queueAnalysisRun(emptyProjectId)).rejects.toThrow("research objective");
});
~~~

- [ ] **Step 2: Run analysis-run tests to verify they fail**

Run: pnpm --filter @caselab/web test -- run-service.test.ts

Expected: FAIL because no run service or Trigger.dev task exists.

- [ ] **Step 3: Implement durable run orchestration**

Create the run after authorization and precondition checks. Persist source IDs, objective, research questions, model, and prompt version at queue time. Trigger the durable task with only the database run ID. Surface safe queued/running/completed/failed state and retry action to authorized project users.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- run-service.test.ts

Expected: all state transition tests pass without calling Trigger.dev.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web
git commit -m "feat: add durable analysis runs"
~~~

### Task 8: Implement the versioned prompt, OpenAI adapter, and quote verification

**Files:**

- Create: packages/prompts/src/analysis-v1.ts
- Create: packages/prompts/src/index.ts
- Create: apps/web/src/server/analysis/openai-adapter.ts
- Create: apps/web/src/server/analysis/analysis-provider.ts
- Create: apps/web/src/server/analysis/verify-output.ts
- Create: apps/web/src/server/analysis/openai-adapter.test.ts
- Create: apps/web/src/server/analysis/verify-output.test.ts

**Interfaces:**

- Produces AnalysisProvider.analyze(input: AnalysisInput): Promise<AnalysisOutput>.
- Produces verifyAnalysisOutput(input): VerifiedAnalysisOutput that contains only quotes found in declared chunks.
- Uses packages/prompts analysisPromptVersion = "analysis-v1".

- [ ] **Step 1: Write failing provider-boundary tests**

~~~ts
it("drops evidence whose quote is not present in the declared chunk", () => {
  const result = verifyAnalysisOutput(providerOutputWithInventedQuote, chunks);
  expect(result.rejectedEvidence).toHaveLength(1);
  expect(result.output.evidence).toHaveLength(0);
});

it("never returns a validated insight when all its evidence was rejected", () => {
  const result = verifyAnalysisOutput(validatedInsightWithRejectedEvidence, chunks);
  expect(result.output.insights).toHaveLength(0);
});
~~~

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run: pnpm --filter @caselab/web test -- openai-adapter.test.ts verify-output.test.ts

Expected: FAIL because the adapter and verifier do not exist.

- [ ] **Step 3: Implement the evidence-first provider boundary**

Build a versioned instruction that forbids invented quotes, demands direct sourceChunkId references, separates categories, surfaces uncertainty, and asks for a research gap where support is insufficient. Use the OpenAI SDK from server-only code with a strict JSON schema derived from the shared Zod output schema. Set store to false. Treat refusal, malformed output, provider timeout, and schema mismatch as safe analysis failures. Independently validate all quotes and derived references after provider parsing.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- openai-adapter.test.ts verify-output.test.ts && pnpm typecheck

Expected: fixture adapters pass all validation tests; no API key is required.

- [ ] **Step 5: Commit**

~~~bash
git add packages/prompts apps/web
git commit -m "feat: add verified OpenAI analysis adapter"
~~~

### Task 9: Persist verified output from the durable worker

**Files:**

- Create: apps/web/src/server/analysis/persist-output.ts
- Create: apps/web/src/server/analysis/persist-output.test.ts
- Modify: apps/web/trigger/analyze-project.ts
- Modify: apps/web/src/server/analysis/run-service.ts

**Interfaces:**

- Consumes VerifiedAnalysisOutput and an analysisRunId.
- Produces persisted evidence IDs, theme links, insight links, hypotheses, research gaps, status transition, and safe metrics.

- [ ] **Step 1: Write failing persistence tests**

~~~ts
it("persists evidence before linked insights", async () => {
  await persistVerifiedOutput(analysisRunId, verifiedOutput);
  expect(await insightEvidenceCount(analysisRunId)).toBeGreaterThan(0);
});

it("marks a failed provider run with a safe retryable error code", async () => {
  await executeAnalysisTask(analysisRunId, failingProvider);
  expect(await runStatus(analysisRunId)).toEqual({
    status: "failed",
    errorCode: "provider_unavailable",
    retryable: true
  });
});
~~~

- [ ] **Step 2: Run persistence tests to verify they fail**

Run: pnpm --filter @caselab/web test -- persist-output.test.ts

Expected: FAIL because verified output is not persisted.

- [ ] **Step 3: Implement transactionally safe persistence**

In the Trigger.dev task, load the exact source snapshot, set status running, invoke the provider, verify output, and insert evidence before all dependent entities. Map provider-local references to database IDs. Roll back partial derived records if a transaction fails. Save only safe model usage metrics and update the run status. Do not write raw chunks, prompts, or provider output to logs.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- persist-output.test.ts

Expected: persistence order, error state, and retry behavior pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web
git commit -m "feat: persist evidence-backed analysis results"
~~~

### Task 10: Build the evidence inspection workspace

**Files:**

- Create: apps/web/src/server/workspace/workspace-service.ts
- Create: apps/web/app/(app)/projects/[projectId]/workspace/page.tsx
- Create: apps/web/src/components/workspace/workspace-tabs.tsx
- Create: apps/web/src/components/workspace/evidence-card.tsx
- Create: apps/web/src/components/workspace/theme-list.tsx
- Create: apps/web/src/components/workspace/insight-card.tsx
- Create: apps/web/src/components/workspace/hypothesis-list.tsx
- Create: apps/web/src/components/workspace/research-gap-list.tsx
- Create: apps/web/src/components/workspace/insight-card.test.tsx

**Interfaces:**

- Produces getWorkspace(projectId, user) with only records authorized for the project organization.
- Renders status with text and icon, exact evidence quote, source title, source count, confidence, limitation list, and contradiction indicator.

- [ ] **Step 1: Write a failing interaction test**

~~~tsx
it("shows exact supporting evidence when the insight is opened", async () => {
  render(<InsightCard insight={fixtureInsight} />);
  await userEvent.click(screen.getByRole("button", { name: /view evidence/i }));
  expect(screen.getByText(fixtureEvidence.quote)).toBeVisible();
  expect(screen.getByText(fixtureEvidence.sourceTitle)).toBeVisible();
});
~~~

- [ ] **Step 2: Run the UI test to verify it fails**

Run: pnpm --filter @caselab/web test -- insight-card.test.tsx

Expected: FAIL because workspace components do not exist.

- [ ] **Step 3: Implement accessible evidence-first UI**

Create a calm project workspace with separate navigable views for Evidence, Themes, Insights, Hypotheses, and Research Gaps. Do not collapse hypotheses into insights. Use semantic headings, buttons, lists, disclosure controls, visible focus styles, accessible names, and text labels alongside all colors. Render meaningful empty, loading, and failed-run states.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- insight-card.test.tsx && pnpm lint

Expected: interaction and accessibility-oriented component tests pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web
git commit -m "feat: add evidence inspection workspace"
~~~

### Task 11: Add source/project deletion and Markdown reporting

**Files:**

- Create: packages/shared/src/report.ts
- Create: packages/shared/src/report.test.ts
- Create: apps/web/src/server/reports/report-service.ts
- Create: apps/web/app/(app)/projects/[projectId]/report/route.ts
- Create: apps/web/src/components/projects/delete-source-dialog.tsx
- Create: apps/web/src/components/projects/delete-project-dialog.tsx
- Modify: apps/web/src/server/sources/source-actions.ts
- Modify: apps/web/src/server/projects/project-actions.ts

**Interfaces:**

- Produces renderMarkdownReport(input: AuthorizedProjectReport): string.
- Produces download route that authorizes the requester before rendering.
- Produces confirmed delete actions that invoke the deletion lifecycle and redirect safely.

- [ ] **Step 1: Write failing report and deletion tests**

~~~ts
it("renders evidence separately from hypotheses in Markdown", () => {
  const markdown = renderMarkdownReport(fixtureReport);
  expect(markdown).toContain("## Evidence");
  expect(markdown).toContain("## Hypotheses requiring validation");
});

it("does not export an inaccessible project", async () => {
  await expect(downloadReportAs(nonMemberUserId, projectId)).rejects.toThrow("not found");
});
~~~

- [ ] **Step 2: Run the tests to verify they fail**

Run: pnpm --filter @caselab/web test -- report.test.ts

Expected: FAIL because report generation and confirmed deletion actions do not exist.

- [ ] **Step 3: Implement lifecycle controls and report export**

Use the database deletion lifecycle from Task 3 and remove storage objects with the trusted server client. Confirm destructive UI actions by project/source name. Generate Markdown only from authorized persisted records, include project title and generated date, and clearly distinguish evidence, themes, insights, hypotheses, gaps, limitations, and recommendations.

- [ ] **Step 4: Verify**

Run: pnpm --filter @caselab/web test -- report.test.ts && pnpm typecheck

Expected: report semantics and authorization checks pass.

- [ ] **Step 5: Commit**

~~~bash
git add apps/web packages/shared
git commit -m "feat: add report export and data deletion"
~~~

### Task 12: Complete browser coverage, documentation, and CI

**Files:**

- Create: apps/web/e2e/research-flow.spec.ts
- Create: apps/web/e2e/fixtures/analysis-output.json
- Create: README.md
- Create: .github/workflows/ci.yml
- Modify: AGENTS.md
- Modify: docs/superpowers/specs/2026-07-17-evidence-first-thin-slice-design.md

**Interfaces:**

- Produces fixture mode for browser tests through an explicitly test-only AnalysisProvider.
- Produces setup documentation for Supabase, Trigger.dev, OpenAI, migrations, environment variables, and test commands.

- [ ] **Step 1: Write the failing end-to-end flow**

~~~ts
test("researcher creates a project, analyzes sources, inspects evidence, and exports Markdown", async ({ page }) => {
  await signInAsFixtureResearcher(page);
  await page.getByRole("link", { name: /create project/i }).click();
  await page.getByLabel(/project name/i).fill("Pricing research");
  await page.getByLabel(/research objective/i).fill("Understand pricing confusion");
  await page.getByRole("button", { name: /create project/i }).click();
  await page.getByLabel(/paste research text/i).fill("I cannot tell what I am paying for.");
  await page.getByRole("button", { name: /add source/i }).click();
  await page.getByRole("button", { name: /run analysis/i }).click();
  await expect(page.getByRole("heading", { name: /insights/i })).toBeVisible();
  await page.getByRole("button", { name: /view evidence/i }).click();
  await expect(page.getByText("I cannot tell what I am paying for.")).toBeVisible();
  await expect(page.getByRole("link", { name: /download markdown/i })).toBeVisible();
});
~~~

- [ ] **Step 2: Run the end-to-end test to verify it fails**

Run: pnpm test:e2e -- research-flow.spec.ts

Expected: FAIL until fixture authentication, provider mode, and the full user flow are wired.

- [ ] **Step 3: Wire fixture dependencies and documentation**

Make the browser test boot against local Supabase and a fixture-only analysis provider selected by NODE_ENV=test. Document that live analysis requires the account owner to configure valid Supabase, Trigger.dev, and OpenAI credentials. Document the privacy implication that API content is not used for training by default but production retention controls require an account-level decision. Update AGENTS command examples to the verified root scripts. CI runs install with frozen lockfile, lint, typecheck, unit/integration tests, and build; run Playwright when local service dependencies are available.

- [ ] **Step 4: Run the full verification suite**

Run: pnpm lint

Expected: exit 0.

Run: pnpm typecheck

Expected: exit 0.

Run: pnpm test

Expected: all unit and integration tests pass.

Run: pnpm build

Expected: production build completes.

Run: pnpm test:e2e

Expected: full fixture-backed research flow passes when local Supabase is running.

- [ ] **Step 5: Commit**

~~~bash
git add README.md AGENTS.md .github apps/web docs packages
git commit -m "test: cover evidence-first research flow"
~~~

## Plan self-review

- Spec coverage: Tasks 1–12 cover the approved architecture, data model, authentication, ingestion, durable live analysis, exact quote verification, workspace, export, deletion, documentation, and release checks.
- Intentional deferrals: non-text parsers, vector retrieval, PDF export, collaboration, social login, and localization have no implementation tasks.
- Security coverage: Tasks 3, 4, 6, 8, 9, and 11 enforce RLS, private storage, server-only keys, output verification, safe logs, and deletion cleanup.
- Placeholder review: no incomplete implementation markers found.
- Type consistency: all analysis flows use analysisRunId, projectId, sourceChunkId, and VerifiedAnalysisOutput as introduced in Tasks 2, 5, 6, and 8.
