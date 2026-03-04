---
phase: 52-multiplayer-sync-new-mechanics-in-multiplayer
plan: "04"
subsystem: blast-combo-codex-persistence
tags: [supabase, persistence, combo-codex, tdd, api-route]
dependency_graph:
  requires:
    - fe-next/components/blast/hooks/useBlastComboDiscovery.ts (existed)
    - fe-next/components/blast/utils/blastCombos.ts (BlastComboType)
    - fe-next/utils/supabase/server.ts (createClient pattern)
  provides:
    - POST /api/blast/combo-codex (additive merge endpoint)
    - GET /api/blast/combo-codex (fetch user's codex)
    - Supabase-backed combo codex persistence
    - Cross-device sync via localStorage + server union merge
  affects:
    - fe-next/components/blast/hooks/useBlastComboDiscovery.ts
tech_stack:
  added:
    - blast_combo_codex Supabase table (migration 20260304010000)
  patterns:
    - Handler function extraction for testability (handlePostComboCodex, handleGetComboCodex, mergeDiscoveredCombos)
    - Fire-and-forget fetch with .catch(() => {}) for non-fatal sync
    - useEffect init GET + localStorage union merge pattern
key_files:
  created:
    - fe-next/app/api/blast/combo-codex/route.ts
    - fe-next/app/api/blast/combo-codex/__tests__/route.test.ts
    - fe-next/supabase/migrations/20260304010000_add_blast_combo_codex.sql
  modified:
    - fe-next/components/blast/hooks/useBlastComboDiscovery.ts
    - fe-next/components/blast/hooks/__tests__/useBlastComboDiscovery.test.ts
decisions:
  - Handler functions exported separately (handlePost/Get) to enable unit testing without Next.js Request mock complexity
  - mergeDiscoveredCombos is a pure exported function — testable in isolation, reused in both POST handler and hook
  - Hook accepts optional `userId` param (not useUser hook) for simplicity and to avoid context dependency
  - Fire-and-forget POST: localStorage written first, server sync is best-effort
  - Init GET merges by union: server data never shrinks local state
  - `as unknown as ComboCodexSupabase` cast in route.ts to bridge typed service client without full Supabase type import
metrics:
  duration: "~15 min"
  completed: "2026-03-04"
  tasks: 2
  files: 5
---

# Phase 52 Plan 04: Combo Codex Supabase Persistence Summary

Supabase-backed combo codex with additive localStorage+server union merge and fire-and-forget POST on discovery.

## What Was Built

### Task 1: POST/GET API endpoint (`/api/blast/combo-codex`)

New Next.js API route at `fe-next/app/api/blast/combo-codex/route.ts` following the existing `/api/blast/result` pattern:

- **POST**: Reads existing `blast_combo_codex` row, computes union with incoming combos, upserts merged set. Additive — never shrinks. Returns merged array.
- **GET**: Returns `discovered_combos` array for authenticated user. Returns empty array if no record.
- **Auth**: Both handlers return 401 for unauthenticated requests via `createClient()` from server.
- **Handler exports**: `handlePostComboCodex`, `handleGetComboCodex`, `mergeDiscoveredCombos` exported for direct unit testing.

Migration file: `fe-next/supabase/migrations/20260304010000_add_blast_combo_codex.sql`

```sql
CREATE TABLE IF NOT EXISTS blast_combo_codex (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discovered_combos text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Note: Migration must be applied via `npm run db:migrate` before deploying.

### Task 2: useBlastComboDiscovery Supabase sync

Updated `fe-next/components/blast/hooks/useBlastComboDiscovery.ts`:

- Accepts optional `{ userId?: string }` parameter (backward compatible — no args = unauthenticated path).
- **On discovery**: After saving to localStorage, if `userId` is set, fires POST to `/api/blast/combo-codex` (fire-and-forget, `.catch(() => {})` — non-fatal).
- **On mount**: If `userId` is set, GETs server data and unions with localStorage. If merged set is larger, updates both state and localStorage.
- No fetch calls when unauthenticated.

## Test Results

34 tests total across 2 suites — all pass.

**`combo-codex/__tests__/route.test.ts`** (15 tests):
- `mergeDiscoveredCombos`: 5 tests covering union, dedup, empty cases, additive guarantee
- `handleGetComboCodex`: 3 tests (existing record, no record, DB crash)
- `handlePostComboCodex`: 6 tests (merge, empty existing, dedup, 400 validation, 500 upsert fail)
- Auth guard: 1 test

**`useBlastComboDiscovery.test.ts`** (19 tests = 9 existing + 10 new):
- POST fire-and-forget: auth/unauth path, no-duplicate-POST, API failure non-fatal
- Init GET merge: auth/unauth, union into state, localStorage writeback, failure fallback
- Backward compat: no-args usage

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error in test file**
- Found during: Task 1 verification (tsc --noEmit)
- Issue: `result.data.discoveredCombos` typed as `unknown`, blocking `.filter()` call
- Fix: Added explicit `as string[]` cast in test
- Files modified: `fe-next/app/api/blast/combo-codex/__tests__/route.test.ts`
- Commit: d90a29a8

**2. [Rule 3 - Blocking] Test for "no POST on already-discovered combo" crashed**
- Found during: Task 2 GREEN phase
- Issue: Test set `global.fetch = jest.fn()` without a response, but authenticated hook's init `useEffect` calls `fetch(GET)` which returned undefined
- Fix: Changed test to use `mockFetchSuccess` for the init GET, then `mockClear()` before the assertion
- Files modified: test file only
- No separate commit (fixed before commit)

### Out-of-scope Issue (Deferred)

Pre-existing lint error in `fe-next/shared/constants/blastMultiplayerConstants.ts`:
```
7:1  error  '@/shared/types/blast' import is duplicated  no-duplicate-imports
```
Not caused by this plan. Logged to deferred-items.

## Self-Check: PASSED

Files created/exist:
- `fe-next/app/api/blast/combo-codex/route.ts` ✓
- `fe-next/app/api/blast/combo-codex/__tests__/route.test.ts` ✓
- `fe-next/supabase/migrations/20260304010000_add_blast_combo_codex.sql` ✓
- `fe-next/components/blast/hooks/useBlastComboDiscovery.ts` ✓ (modified)
- `fe-next/components/blast/hooks/__tests__/useBlastComboDiscovery.test.ts` ✓ (modified)

Commits:
- `8465763c` feat(52-04): add /api/blast/combo-codex POST/GET with additive merge ✓
- `ad1fdea2` feat(52-04): wire useBlastComboDiscovery to Supabase sync ✓
- `d90a29a8` fix(52-04): resolve TypeScript type error in combo-codex test ✓
