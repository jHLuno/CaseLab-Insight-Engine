# OpenRouter Gemini Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project member run verified, evidence-first analysis of saved sources using OpenRouter's Gemini 2.5 Flash-Lite model.

**Architecture:** A server action creates an immutable run snapshot and sends only its ID to a Trigger.dev task. The task loads saved chunks, calls OpenRouter with strict JSON schema, independently verifies every quote and relation, atomically persists output, and updates its status for the project page.

**Tech Stack:** Next.js 16, TypeScript strict, Zod, Supabase Postgres/RLS, Trigger.dev, OpenRouter HTTP API, Vitest, React Testing Library.

## Global Constraints

- `OPENROUTER_API_KEY` is server-only; default `ANALYSIS_MODEL` is `google/gemini-2.5-flash-lite`.
- Never log sources, prompts, quotes, provider response bodies, or credentials.
- A run snapshots active source IDs, objective, questions, model, and prompt version before queueing.
- Every persisted quote must occur verbatim in its declared stored chunk.
- A validated insight requires verified evidence. Hypotheses and research gaps remain distinct.
- Migrations are additive; tests use fixtures and never call external services.

---

### Task 1: Add prompt and provider adapter

**Files:**
- Create: `packages/prompts/src/analysis-v1.ts`
- Modify: `packages/prompts/src/index.ts`
- Create: `apps/web/src/server/analysis/analysis-provider.ts`
- Create: `apps/web/src/server/analysis/openrouter-provider.ts`
- Test: `apps/web/src/server/analysis/openrouter-provider.test.ts`
- Modify: `apps/web/.env.example`

**Interfaces:**

```ts
export type AnalysisInput = {
  objective: string;
  researchQuestions: string[];
  sourceChunks: Array<{ sourceId: string; sourceChunkId: string; content: string }>;
};
export interface AnalysisProvider {
  analyze(input: AnalysisInput): Promise<{ output: AnalysisOutput; usage: { inputTokens?: number; outputTokens?: number } }>;
}
```

- [ ] **Step 1: Write the failing test**

```ts
it("uses the configured Gemini model and strict JSON schema", async () => {
  await provider.analyze(input);
  expect(fetch).toHaveBeenCalledWith("https://openrouter.ai/api/v1/chat/completions", expect.objectContaining({
    method: "POST", headers: expect.objectContaining({ Authorization: "Bearer test-key" })
  }));
});
it("returns a safe error for malformed provider output", async () => {
  await expect(provider.analyze(input)).rejects.toThrow("Analysis provider returned an invalid response.");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @caselab/web test -- openrouter-provider.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Write the minimal implementation**

Export `analysisPromptVersion = "analysis-v1"` and an instruction requiring exact chunk UUIDs, direct quotes, evidence before derived entities, explicit research gaps, and JSON only. Call OpenRouter with `fetch`, `model: process.env.ANALYSIS_MODEL || "google/gemini-2.5-flash-lite"`, `temperature: 0`, an Authorization bearer key, and strict `response_format.json_schema`. Parse the returned content with `analysisOutputSchema`; map missing configuration, non-OK responses, timeout, and invalid JSON to safe errors without response bodies.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @caselab/web test -- openrouter-provider.test.ts && pnpm --filter @caselab/prompts typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/prompts apps/web/src/server/analysis apps/web/.env.example
git commit -m "feat: add OpenRouter analysis provider"
```

### Task 2: Independently verify analysis output

**Files:**
- Create: `apps/web/src/server/analysis/verify-output.ts`
- Test: `apps/web/src/server/analysis/verify-output.test.ts`

**Interfaces:**

```ts
export function verifyAnalysisOutput(output: AnalysisOutput, chunks: AnalysisInput["sourceChunks"]): VerifiedAnalysisOutput;
```

- [ ] **Step 1: Write the failing test**

```ts
it("rejects a quote absent from its declared chunk", () => {
  expect(() => verifyAnalysisOutput(outputWithInventedQuote, chunks)).toThrow("quote_not_found");
});
it("rejects a validated insight that references rejected evidence", () => {
  expect(() => verifyAnalysisOutput(outputWithRejectedEvidence, chunks)).toThrow("missing_evidence_reference");
});
it("keeps a gap-only result when evidence is insufficient", () => {
  expect(verifyAnalysisOutput(gapOnlyOutput, chunks).researchGaps).toHaveLength(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @caselab/web test -- verify-output.test.ts`

Expected: FAIL because the verifier does not exist.

- [ ] **Step 3: Write the minimal implementation**

Index chunks by UUID and check each evidence quote with `verifyEvidenceQuote`. Retain accepted evidence IDs only; require all theme, insight, and hypothesis references to belong to that set. Re-apply the validated-insight evidence rule after verification. Return only verified entities and preserve research gaps.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @caselab/web test -- verify-output.test.ts apps/web/src/__tests__/analysis.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/analysis/verify-output.ts apps/web/src/server/analysis/verify-output.test.ts
git commit -m "feat: verify evidence-backed analysis output"
```

### Task 3: Add run lifecycle and atomic persistence

**Files:**
- Create: `supabase/migrations/202607170007_analysis_runs.sql`
- Modify: `apps/web/src/server/database/types.ts`
- Modify: `apps/web/src/server/database/database.integration.test.ts`
- Create: `apps/web/src/server/analysis/run-service.ts`
- Create: `apps/web/src/server/analysis/persist-output.ts`
- Test: `apps/web/src/server/analysis/run-service.test.ts`

**Interfaces:**

```ts
queueAnalysisRun(projectId: string): Promise<{ id: string; status: "queued" }>;
retryAnalysisRun(runId: string): Promise<{ id: string; status: "queued" }>;
loadAnalysisInput(runId: string): Promise<AnalysisInput>;
persistVerifiedOutput(runId: string, output: VerifiedAnalysisOutput, usage: SafeUsage): Promise<void>;
```

- [ ] **Step 1: Write the failing test**

```ts
it("snapshots only active project sources", async () => {
  await expect(queueAnalysisRun(projectId)).resolves.toMatchObject({ status: "queued" });
});
it("rejects a project without both objective and source", async () => {
  await expect(queueAnalysisRun(projectId)).rejects.toThrow("research objective and at least one source");
});
it("sends verified output to one persistence RPC", async () => {
  await persistVerifiedOutput(runId, verifiedOutput, usage);
  expect(rpc).toHaveBeenCalledWith("persist_verified_analysis_output", expect.any(Object));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @caselab/web test -- run-service.test.ts`

Expected: FAIL because the lifecycle service and RPCs do not exist.

- [ ] **Step 3: Write the migration and services**

Add `queue_analysis_run(project_uuid, analysis_model, analysis_prompt_version)` as a `security definer` RPC: check `is_project_member`, reject blank objectives and no active sources, snapshot source IDs and ordered questions, then insert a queued row. Add `persist_verified_analysis_output(input_run_id, input_output jsonb, input_usage jsonb)` restricted to the service role: insert evidence first, map local IDs, then insert dependent themes, insights, hypotheses, gaps and joins, and finally mark completed. Any SQL exception rolls back the function. Add function types; load the immutable run and chunks via the admin client only inside background code.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @caselab/web test -- run-service.test.ts database.integration.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202607170007_analysis_runs.sql apps/web/src/server/database apps/web/src/server/analysis
git commit -m "feat: add durable evidence analysis runs"
```

### Task 4: Add Trigger.dev orchestration

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/trigger/client.ts`
- Create: `apps/web/trigger/analyze-project.ts`
- Create: `apps/web/src/server/analysis/run-actions.ts`
- Test: `apps/web/src/server/analysis/analyze-project.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("sends only an analysis run ID to Trigger.dev", async () => {
  await startAnalysisAction(projectId);
  expect(trigger).toHaveBeenCalledWith("analyze-project", { analysisRunId: expect.any(String) });
});
it("marks transient provider failure retryable without persisting output", async () => {
  await executeAnalysisTask({ analysisRunId }, failingProvider);
  expect(markFailed).toHaveBeenCalledWith(analysisRunId, "provider_unavailable");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @caselab/web test -- analyze-project.test.ts`

Expected: FAIL because the action and task do not exist.

- [ ] **Step 3: Write the minimal implementation**

Install the current compatible `@trigger.dev/sdk` with `pnpm --filter @caselab/web add @trigger.dev/sdk`. The task accepts exactly `{ analysisRunId: string }`, marks the run running, loads the snapshot, calls the provider, verifies it, persists it, and records only safe usage. It marks classified errors failed; transient errors are rethrown for Trigger retries. The action queues the run, triggers the task, and redirects to the project page without source content in URL or payload.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @caselab/web test -- analyze-project.test.ts && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/trigger apps/web/src/server/analysis
git commit -m "feat: run analysis in Trigger.dev"
```

### Task 5: Build analysis controls and results UI

**Files:**
- Create: `apps/web/src/components/analysis/run-analysis-button.tsx`
- Create: `apps/web/src/components/analysis/analysis-status.tsx`
- Create: `apps/web/src/components/analysis/analysis-results.tsx`
- Test: `apps/web/src/components/analysis/analysis-ui.test.tsx`
- Modify: `apps/web/app/projects/[projectId]/page.tsx`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Write the failing test**

```tsx
it("disables Run analysis without an objective and source", () => {
  render(<RunAnalysisButton canRun={false} action={action} />);
  expect(screen.getByRole("button", { name: "Run analysis" })).toBeDisabled();
});
it("links each evidence quote to its source chunk", () => {
  render(<AnalysisResults result={completedRun} />);
  expect(screen.getByRole("link", { name: /view source evidence/i })).toHaveAttribute("href", expect.stringContaining("chunk"));
});
it("renders Hypothesis and Research gap separately", () => {
  render(<AnalysisResults result={completedRun} />);
  expect(screen.getByText("Hypothesis")).toBeVisible();
  expect(screen.getByText("Research gap")).toBeVisible();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @caselab/web test -- analysis-ui.test.tsx`

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Write the minimal implementation**

Render an Analysis section below Sources. Explain why a disabled button cannot run. Use `role="status"` for queued/running and `role="alert"` for failed status; show retry only when safe. Show evidence cards before themes and insights, with quote, category, source title, chunk anchor, limitations, and text labels for status/contradictions. Render the latest completed result while later runs execute.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @caselab/web test -- analysis-ui.test.tsx && pnpm --filter @caselab/web build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/projects/'[projectId]'/page.tsx apps/web/src/components/analysis apps/web/app/globals.css
git commit -m "feat: show evidence-backed analysis results"
```

### Task 6: Document configuration and release-check the flow

**Files:**
- Modify: `.env.example`
- Create: `apps/web/.env.example`
- Modify: `README.md` if present, otherwise create it

- [ ] **Step 1: Document safe configuration**

Add empty `OPENROUTER_API_KEY`, `ANALYSIS_MODEL=google/gemini-2.5-flash-lite`, and `TRIGGER_SECRET_KEY` examples. Explain that keys belong in `apps/web/.env.local` locally and deployment settings in production, never Git. State that analysis content is sent to OpenRouter and its selected Gemini provider and the app owner pays usage.

- [ ] **Step 2: Run complete automated verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: every command exits 0.

- [ ] **Step 3: Perform manual acceptance test**

With configured Supabase, Trigger.dev, and OpenRouter: create a project with an objective, upload test-only text containing a known exact sentence, run analysis, observe status, inspect the evidence quote and source link, and confirm the fixture test rejects a fabricated quote. Do not use confidential material for this check.

- [ ] **Step 4: Commit and push**

```bash
git add .env.example apps/web/.env.example README.md
git commit -m "docs: explain OpenRouter analysis setup"
git push origin main
```

## Self-review

- Tasks 1–2 cover structured provider output and independent evidence verification.
- Tasks 3–4 cover snapshots, authorization, atomic persistence, durable execution, status, and retry.
- Task 5 covers empty, disabled, queued, running, completed, failed, evidence, hypothesis, and research-gap UI states.
- Task 6 covers configuration, privacy disclosure, automated checks, and live acceptance testing.
