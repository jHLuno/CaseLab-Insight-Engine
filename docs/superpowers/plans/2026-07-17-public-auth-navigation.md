# Public Authentication Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public CaseLab landing page visibly actionable by linking users to sign-in and account creation without requiring Supabase environment values.

**Architecture:** Keep the existing `HomePage` as the no-configuration fallback. Add Next App Router `Link` controls inside that component so they remain available before authentication is configured; the existing proxy and auth routes continue to own all session behavior.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest.

## Global Constraints

- Do not expose Supabase credentials in the browser.
- Keep the English UI and evidence-first product language.
- Preserve the current public fallback when Supabase variables are absent.
- Verify UI behavior with a render test and a browser snapshot.

---

### Task 1: Add public account-navigation controls

**Files:**

- Modify: `apps/web/src/__tests__/home-page.test.tsx`
- Modify: `apps/web/src/components/home-page.tsx`

**Interfaces:**

- Produces public `href="/sign-in"` and `href="/sign-up"` navigation from `HomePage`.

- [ ] **Step 1: Write the failing test**

```tsx
expect(markup).toContain('href="/sign-in"');
expect(markup).toContain('href="/sign-up"');
expect(markup).toContain("Create your account");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @caselab/web test -- home-page.test.tsx`

Expected: FAIL because the landing page has no account navigation.

- [ ] **Step 3: Add the minimal implementation**

```tsx
<nav aria-label="Account navigation" className="home-page__actions">
  <Link href="/sign-in">Sign in</Link>
  <Link href="/sign-up">Create your account</Link>
</nav>
```

- [ ] **Step 4: Verify the test and browser view**

Run: `pnpm --filter @caselab/web test -- home-page.test.tsx`

Expected: PASS.

Run the app and inspect `/` in a browser snapshot.

- [ ] **Step 5: Commit and push**

```bash
git add apps/web/src/__tests__/home-page.test.tsx apps/web/src/components/home-page.tsx docs/superpowers/plans/2026-07-17-public-auth-navigation.md
git commit -m "fix: add landing page account navigation"
git push
```
