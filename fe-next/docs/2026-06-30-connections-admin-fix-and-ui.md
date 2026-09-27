# Connections (Word Bridge): fix admin "mark bad riddles" + UI improvements

**Date:** 2026-06-30
**Goal:** Significantly improve the Connection-mode UI and the riddles, and fix the broken admin "mark bad riddles" flow (suspected Express vs Next.js route issue — confirmed).

---

## Part A — Root cause: admin can't mark bad riddles (CONFIRMED)

The app co-hosts Express + Next.js in **one** Node process (`server/index.ts`). Express
middleware runs before requests fall through to the Next.js catch-all
(`server/index.ts:199`).

`server/middleware.ts:373` runs `express.json()` for any path where
`shouldExpressParseJsonBody(path)` is true. That function returns
`isExpressRoute && !isNextAdminRoute`, where `EXPRESS_API_ROUTES` includes the
broad prefix `/api/admin` (`server/middleware.ts:17`).

The verdict-save endpoint `POST /api/admin/connections-puzzles/reviews` is a
**Next.js** route handler (`app/api/admin/connections-puzzles/reviews/route.ts`)
with **no** Express counterpart, and it was never added to the
`NEXT_ADMIN_BODY_ROUTES` opt-out list. So:

1. Express matches `/api/admin` → runs `express.json()` → **drains the request body stream**.
2. Request falls through `adminRoutes` (Bearer passes `adminAuth`, no sub-route matches → `next()`) to the Next catch-all.
3. Next's `await request.json()` waits forever for Content-Length bytes that already left the wire — never resolves nor rejects (documented at `server/middleware.ts:19-25`), so the route's `.catch(() => null)` cannot rescue it.
4. The POST hangs → times out → client `saveReviews` reports "Save failed".

**Why only marking breaks:** `GET` has no body, so `express.json()` is a no-op →
loading the review list works. Only the verdict-save `POST` hangs. Matches the
report exactly ("admin sees riddles but can't mark them").

**Verified:** `connections_puzzle_reviews` exists in prod with `PRIMARY KEY (puzzle_id)`,
so the route's `upsert(..., { onConflict: 'puzzle_id' })` succeeds once the body arrives.

### Fix (Phase 1)
Add prefix `/api/admin/connections-puzzles` to `NEXT_ADMIN_BODY_ROUTES`
(`server/middleware.ts`). Matches the established pattern (teacher-access,
feature-flags, curator-proposals). TDD: assert
`shouldExpressParseJsonBody('/api/admin/connections-puzzles/reviews') === false`
(fails before, passes after) in `server/__tests__/expressBodyParse.test.ts`.

> Ambient debt (not fixed now): `NEXT_ADMIN_BODY_ROUTES` is an opt-out allowlist —
> every future Next-only admin POST silently hangs until added (Class-4 silent
> failure). Durable fix would detect registered Express routes instead. One-liner
> is the right call now.

---

## Part B — Coverage gap: review tool only shows en + he (Phase 2)

`buildReviewRows` (`lib/connections/reviewUi.ts:45`) is hardwired to `{ he, en }`,
and `ReviewFilter.language` is typed `'all'|'he'|'en'`. Native puzzle pools exist
for `es/sv/ja` too (`lib/connections/puzzles/index.ts:16-22`) and the save
validator already accepts all 6 languages — but the admin cannot see or mark
non-en/he riddles. After the Phase 1 fix, marking is still impossible for 3 of
the 5 playable languages.

### Fix (Phase 2)
- Widen `buildReviewRows` to build rows for every locale that has a native pool
  (`en, he, es, sv, ja`).
- Widen `ReviewFilter.language` + the panel language `<select>` to those locales.
- Keep it data-driven (iterate the pools) so a future locale is one line.

UGC community riddles already have a working moderation surface
(`/api/connections/ugc/[id]/moderate`, unaffected by the body-drain trap) — out
of scope here.

---

## Part C — Connection-mode UI improvements (Phase 3)

Grounded in a read of the actual game UI (`ConnectionsGame`, `PuzzleCard`,
`ConnectionsKeyboard`, play/daily/landing clients). Concrete, bounded changes
that fit the neo-brutalist dark design system. Checklist finalized from the UI
analysis before implementation; each change keeps `t()` for all copy and RTL
support.

---

## Sequencing
1. **Phase 1** — body-parse fix (TDD) → commit. Concrete, verifiable.
2. **Phase 2** — widen review coverage to all native locales (TDD) → commit.
3. **Phase 3** — UI improvements (bounded checklist) → commit.

Verification per phase: `npm run lint`, scoped tests, `npm run build`.
