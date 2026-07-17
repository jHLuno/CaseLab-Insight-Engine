# CaseLab Insight Engine

CaseLab is an evidence-first workspace for qualitative research. It stores project sources privately, extracts direct evidence, and keeps themes, insights, hypotheses, and research gaps visibly distinct.

## Run locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

Configure Supabase values in `apps/web/.env.local`, then run the additive migrations:

```bash
pnpm exec supabase db push
```

## Live analysis setup

CaseLab uses OpenRouter with `google/gemini-2.5-flash-lite` by default. Add these values only to `apps/web/.env.local` locally, and to your deployment environment in production:

```env
OPENROUTER_API_KEY=
ANALYSIS_MODEL=google/gemini-2.5-flash-lite
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_REF=
```

Create the OpenRouter key in the application owner’s account. It is never entered by a CaseLab user or sent to the browser. Analysis content is sent from CaseLab’s server to OpenRouter and its selected Gemini provider; usage is billed to the application owner.

Create a Trigger.dev project, copy its secret key and project reference, then register the background task from `apps/web`:

```bash
npx trigger.dev@latest dev
```

The app sends Trigger.dev only an analysis run ID. The task loads stored sources securely, calls the provider with strict structured output, and independently verifies every quote before saving a result.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Never commit `.env.local` or provider credentials.
