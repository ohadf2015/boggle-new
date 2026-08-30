# react-doctor audit — 2026-08-29

Scan: `npx react-doctor@latest fe-next --verbose` (v-latest, full scan, ~25 min).
Raw dump: `diagnostics.json` (1018 findings) in the run's temp output dir.

**Headline: the raw error count is not a defect count.** 191 "errors" reduce to
**5 real defects**. The rest are a deliberate codebase-wide idiom, findings against
already-applied migrations, a non-React static asset, or rule false-positives.

**The score does not measure this.** 49 before, 49 after. Fixing 5 of 191 findings cannot
move a 0–100 composite, and the two new regression tests are themselves scanned. The
deliverable is the triage and the five verified fixes, not the number.

**The most useful finding was not in the report.** One real leak had a copy-pasted twin
that react-doctor did not flag; grepping for the *bug class* rather than the rule found
it. Two more real bugs were confirmed only by writing StrictMode tests that reproduced
them — and 25 of 26 flagged "missing cleanups" turned out to be correct code.

---

## Baselines captured before any edit

| Baseline | Value |
|---|---|
| react-doctor score | **49 before → 49 after** (unchanged, as expected) |
| `tsc --noEmit` source errors | **0** (172 reported errors are all `.next/dev/types/*` generated-artifact noise) |
| Pre-existing dirty files | 46, all from a concurrent session (quick-play / education / translations) |
| Intersection: dirty files ∩ finding files | **0** — no edit of mine touches another session's work |

After the changes below: `tsc` unchanged (172 total / **0** in source), the 46 other-session
files untouched, all affected suites green — 820 Adventure, 92 tv-broadcast, 59
results/podium, and `npm run test:backend` at **3352 passed**.

One backend suite fails, **pre-existing and unrelated**:
`backend/handlers/__tests__/wordcraftHandler.integration.test.ts` imports
`../../modules/wordcraftManager.js`, which does not exist in the repo. `backend/` is clean
in `git status`, so this is committed state on `master`; no file I touched is under
`backend/`. Worth a separate fix — the module was either never landed or was removed
without its test.

---

## Fixed

### 1. Discarded effect cleanup in animated count-ups (real leak, 2 sites)

`return () => …` written **inside a `setTimeout` callback**. The timeout callback's
return value is discarded — only a function returned from the `useEffect` body runs.
The effect's own cleanup cleared the timeout, so unmount-*before*-the-delay was safe,
but unmount-*after* it left the `animate()` controls running and (in one case) a
motion-value subscription attached.

- `host/components/tv-results/TvResultsWinnersPodium.tsx:182` — leaked `animate()` controls **and** a `rounded.on('change')` subscription
- `components/singleplayer/results/PracticeResults.tsx:113` — leaked `animate()` controls

**react-doctor flagged only the first.** The second was found by grepping the codebase
for the *bug class* (a cleanup-shaped return nested inside a timer callback), not the
rule. This is the "Class 3 — Asymmetric paths" pattern from
`.claude/rules/60-recurring-pitfalls.md`: one animated counter copy-pasted, one copy
noticed, its twin silently diverging.

Fix: hoist the handles to the effect scope so the effect's own cleanup releases them.

Regression guards added (both fail before the fix, pass after):
- `host/components/tv-results/__tests__/TvResultsWinnersPodium.cleanup.test.tsx` (new)
- `components/singleplayer/results/__tests__/PracticeResults.test.tsx` (`count-up cleanup` case)

---

## Deliberately NOT fixed — with reasons

### `no-ref-current-in-render` — 58 errors, 42 files → **0 defects, 1 rule bug**

Classified all 58 against source:

| Shape | Count | Verdict |
|---|---|---|
| `someRef.current = value` at hook body top ("latest ref" idiom) | 57 | Pattern-level decision, not 57 bugs |
| `if (!ref.current) ref.current = make()` (lazy init) | 1 | **False positive** — the rule's own help text says "the predictable null-guarded lazy initialization pattern remains supported", then flags exactly that (`hooks/useAdventureTimerStore.ts:89`) |

The 57 are one codebase-wide idiom, several with comments explaining why (e.g.
`useAdventureGridInteraction.ts:51-56` documents that the global `mouseup` listener
registers in a `useEffect` that runs after paint, so an effect-written ref would be
stale at exactly the moment it is read). Mechanically rewriting 57 sites across 42
files is a high-blast-radius timing change for a theoretical concurrent-rendering
concern, on shared `master`, with three other sessions live. **This is a deliberate
architectural call for the team, not a lint sweep.**

### `effect-needs-cleanup` — 26 errors → **1 real** (fixed above), 25 false positives

Verified each by brace-matching the enclosing effect. The rule misses several valid
cleanup shapes:

- `return unsubscribe;` — returning a cleanup *identifier* rather than an arrow function (`useSwipeGesture.ts:162`)
- cleanup in a **separate** unmount effect (`useChainEventBus.ts:58`, `useObservedHeight.ts:37`)
- handles collected into an array and released in the cleanup (`useAdMob.ts:153`)
- `.off()` teardown present and correct (`useAutoFillBots`, `useDuelSocket`, `useMultiplayerSocket`, `useSafeSocketEvent`, `useNetworkState`, `useSafeArea`, …)

### Supabase migration findings — 47 errors → **not actionable as written**

`supabase-table-missing-rls` (15) + `supabase-rls-policy-risk` (32), all in
`supabase/migrations/*.sql`.

Three reasons these are not a 47-item fix list:

1. **The linter reads each migration in isolation.** A table created without RLS in
   `001_initial_schema.sql` very likely has it enabled in `002_row_level_security.sql`.
   The count is an unverified upper bound, not a security finding count.
2. **Editing an applied migration changes nothing.** These are already applied to prod;
   a real change requires a *new* migration.
3. **`supabase db push` is forbidden in this repo** — 195 of ~600 local migrations are
   pending on remote, so a push would ship other sessions' unmerged migrations to prod.

**Recommended follow-up (separate, scoped work):** query live `pg_tables` /
`pg_policies` for the actual current RLS state, diff against the intended policy set,
and write one corrective migration for whatever genuinely lacks protection. Do not
drive this from the lint output.

### `public/widget.js` — 33 errors → **false positives**

`no-unguarded-browser-global-in-render-or-hook-init` ×33 (plus 1 `insecure-crypto-risk`).
This is a standalone vanilla-JS embed script served as a static asset. It is never
server-rendered and contains no React. Browser globals are correct there by definition.

---

### 2. Duplicated side effects in `setState` updaters (2 real of 17)

`reactStrictMode: true` is set in `next.config.mjs`, so React **double-invokes every
state updater in dev**. A side effect inside an updater therefore runs twice.

I traced all 17. Most are **accidentally idempotent** — they write the same value twice
(`localStorage.setItem` with identical payload, a ref set to the same number, a nested
`setState(false)`), or they are guarded by a ref that makes the second pass a no-op
(`useEndlessMode`'s `highFloorRef` check, `useModeCoach`'s `dismissedRef` early return).
Two were not:

**`hooks/useStreakFreeze.ts:73,84` — duplicate Supabase writes.** `syncFreezeToSupabase()`
ran inside the updater with no guard. Proven: a StrictMode test showed `update()` called
**twice** per `consumeFreeze()`. Fixed by computing from `countRef` (which already mirrors
the state) and doing the persistence once, outside the updater. Because the ref advances
synchronously, back-to-back calls in one tick still compound correctly.

**`hooks/useAdventureSelection.ts:166,180` — the same word submitted twice.**
`setTimeout(() => onClickSubmit(word, prev), 0)` ran inside the updater, so a re-invoked
updater scheduled **two** timers. Proven with a StrictMode test: `onClickSubmit` called
twice for one click. Fixed by recording the pending submit in a ref (an idempotent write)
and flushing it once from a `useEffect` keyed on `selectedIndices` — which also honours
the original "submit after the state update" intent more precisely than `setTimeout(…, 0)`.

Regression guards added to `hooks/__tests__/useStreakFreeze.supabase.test.ts` and
`hooks/__tests__/useAdventureSelection.test.ts` (both fail before, pass after).

**Correction to an earlier read:** `useSeason.ts:103` looked like a network write, but
`syncPeakTierToSupabase` is a **documented no-op** (see its comment — the JSONB column is
archive-only, written solely by the `process_season_reset` RPC). Its only duplicated
effect is an idempotent `localStorage.setItem`. Not a defect.

### 3. Small real fixes

- **`utils/mobileOAuth.ts:96`** — `window.open(url, '_blank')` gained `'noopener'`. Without it the OAuth page keeps a `window.opener` handle and can redirect the original tab (reverse tabnabbing).
- **`types/bad-words.d.ts` — deleted, not patched.** It declared both `export default Filter` and `export = Filter`, which is illegal (TS2309). While fixing it I found `@types/bad-words@3.0.3` is already a declared dependency and covers the module correctly (`export = BadWordsFilter`, matching `bad-words@3.0.4`'s CJS `module.exports = Filter`). The hand-written shim was a redundant second declaration of the same module — and the `as unknown as { list: string[] }` cast at `backend/utils/profanityFilter.ts:14` shows `@types` was the declaration actually in effect. Removing the file fixes the error and drops the duplicate-declaration hazard. `tsc` after: unchanged at 172 total / 0 source.
- **Layout-thrashing animations** — `TvPlayerCard.tsx` (score bar) and `FullWidthBannerLayout.tsx` (accent line) animated `width`, forcing a layout pass every frame. Switched to `scaleX` + `origin-left`, which is compositor-only and visually identical for a solid fill. The score bar matters most: it re-animates per score update for every player card on a TV screen (rooms go up to 50 players). Tests updated to assert the same proportion via `transform`.

---

## Follow-up round — the two items flagged above, now fixed

### 4. `subscription_events` was writable by anyone (real security hole)

The 32 `supabase-rls-policy-risk` findings could not be judged from the migration files, so
I queried live state instead. Results:

- **Tables with RLS disabled: zero.** All 15 `supabase-table-missing-rls` findings were
  artifacts of reading each migration in isolation — later migrations enable it, exactly as
  predicted.
- **Permissive non-SELECT policies: 7, not 32.** Six are intentional public submission
  forms (`connections_feedback`, `custom_puzzles`, `custom_puzzle_attempts`, `school_leads`,
  `score_challenge_attempts`, `teacher_access_requests`).
- **The seventh was a genuine hole.** `subscription_events` had a policy *named* "Service
  role full access" that was never given a `TO` clause, so it defaulted to **PUBLIC**. Since
  `service_role` bypasses RLS anyway, the policy did nothing for its stated purpose and
  granted anon + authenticated `ALL` on a billing table.

Verified live before: `SET LOCAL ROLE anon` could `INSERT`. Verified after: the same insert
raises `42501 new row violates row-level security policy`. The table is empty (0 rows), so
nothing leaked — but any anonymous caller could have forged subscription events.

The sibling table `subscriptions` had **already** been corrected to `TO service_role`; this
one was missed — the same Class-3 asymmetric-path shape as the leak in §1.

Migration: `20260829120000_scope_subscription_events_policy_to_service_role.sql`, applied to
remote via the Supabase MCP (**not** `db push` — 195 local migrations are pending on remote
and a push would ship other sessions' unmerged work to prod).

**Same root cause in the code.** `upsertSubscription` and `logSubscriptionEvent` both wrote
via `createClient()` — the request-scoped cookie client, which is `anon` inside a payment
webhook. `subscriptions` already refused those writes (service_role-only), and the
`subscription_events` insert succeeded *only* because of the hole above. Both now use
`createAdminClient() ?? await createClient()`, the pattern already documented at
`lib/subscriptions.ts:39`. Two regression tests added to `lib/__tests__/subscriptions.rls.test.ts`.

Note: `subscriptions` and `subscription_events` are both empty, which is equally consistent
with "no one has subscribed yet" and "writes were failing". I could not distinguish the two,
so no claim is made about lost data.

Five tables have RLS enabled with **zero** policies (`app_config`,
`connections_ugc_votes`, `daily_word_suggestions`, `dictionary_quality_metrics`,
`feedback_reports`). That is deny-all — fail-closed and safe — but worth confirming it is
intentional service-role-only access rather than an oversight.

### 5. `wordcraftHandler.integration.test.ts` — orphaned test, deleted

It imported `../wordcraftHandler.js` and `../../modules/wordcraftManager.js`. **Neither has
ever existed in git history** — zero commits touch either path. The test was added by
`90c30550f`, a commit titled "fix(wordcraft): add arrow key navigation to setup radiogroups",
alongside unrelated `WordCraftSetup.tsx` work: a broad `git add` swept in a stray 169-line
file from another branch. The only other copy is a stale `.next-merge-verify/` build artifact.

Deleted. `npm run test:backend` now passes **314 suites / 3352 tests, zero failures** (was 1
failing suite).

This is the shared-checkout commit hazard in the flesh — and the reason the changes in this
document were committed with explicit paths rather than `git add -A`.

---

## Remaining real work (triaged, not done)

- **`player/components/in-game/WordsRemaining.tsx:106`** — also animates `width`, deliberately left alone: it is a single `rounded-full` bar, and `scaleX` would squash its end cap into an ellipse for a negligible gain. Revisit only if it shows up in a profile.
- **`utils/friendMessages.ts:90`, `utils/friendsHeadToHead.ts:232`** — flagged as "client writes a Supabase authz field". These are **reads** taking an optional `userId` to skip a redundant `auth.getUser()` round-trip (50–200 ms), an intentional optimisation documented in the code and in `.claude/rules/50-supabase-perf.md`. Not a code fix — but worth confirming RLS actually constrains those tables by `auth.uid()`, since that is what makes passing a client-supplied id safe.
- **`app/api/admin/insights/route.ts:21`** — "side effect in a GET handler" is an in-memory read-through response cache behind `verifyAdminAuth`, not state mutation. Low value.
- **`hooks/useWordCraftModeFlag.ts:19`** — reads `window.location` during render, which is a genuine React-rules violation, but it cannot currently produce a hydration mismatch: every branch under `WordCraftClient` is `dynamic(..., { ssr: false })`, so the server renders nothing for all three modes, and `isAdmin` from `useAuth` already re-decides the mode after hydration. Converting it to an effect would break 5 tests and add a Territory flash for admins. Left as-is; fix it if an SSR-rendered branch is ever added.
- **The other 15 `no-impure-state-updater` sites** — idempotent today, but they rely on that being true. Worth normalising opportunistically when touching those hooks: keep the updater pure, do the effect in the caller or a `useEffect`.

## Warnings (827) — not triaged

Dominated by `unused-export` (162) and `unused-file` (115). Worth a separate dead-code
pass; note the scanner does not know about dynamic imports or Next.js route
conventions, so that list needs the same verification discipline applied above.
