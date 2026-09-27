# React Doctor Audit — 2026-08-07

Scope: whole application (`fe-next/`). Tool: `react-doctor@0.9.6`.
Stack: React 19.2, Next 16 App Router, framer-motion 12.23, React Compiler ON.

Supersedes parts of [`2026-07-20-react-doctor-audit.md`](./2026-07-20-react-doctor-audit.md) — see "Correction" below.

---

## 0. Correction to the 2026-07-20 audit — the tool was never reading its config

`doctor.config.json` (added Jun 26) declared:

```json
"ignore": [ ".next/**", "android/**", "ios/**", "**/*.test.tsx", ... ]
```

`react-doctor` requires `ignore` to be an **object** (`{ files, rules, tags, overrides }`), not a bare
array. On every run since Jun 26 it printed one line to **stderr** —
`config field "ignore" must be an object (got object); ignoring this field` — and then scanned with
**no ignores at all**.

Consequences, all of which the July audit misread as tool defects:

| July conclusion | Actual cause |
|---|---|
| "Whole-repo `--lint` is a Class-4 no-op from a degraded toolchain (no `node_modules/.bin`)" | The scan drowned in `.next/`, `android/`, `ios/`, `out/`, `coverage/` and never got through the source. |
| "`artifact-baas-authority-surface` findings are in `.next/static/chunks/*.js` — noise" | Build artifacts were scanned because the ignore list was dropped. |
| "You MUST scope per directory; whole-repo does not work" | Scoping was a workaround for the broken config, not the fix. |

**Fixed** in `doctor.config.json`: `ignore` wrapped as `{ "files": [...] }`, plus
`playwright-report/**` and `test-results/**` added. Verified: the stderr warning is gone and
test-file findings dropped to 0.

This is a textbook **Class 4 (silent failure)** per `.claude/rules/60-recurring-pitfalls.md` — a
config that warns once on stderr and then proceeds as if it did not exist. Worth noting the schema
URL in the config (`https://react.doctor/schema/config.json`) points at a shape the installed
version no longer accepts; the shape was confirmed by reading the tool's own `validateIgnoreField`.

---

## 1. Method

Scanned per top-level React directory (`app`, `components`, `hooks`, `contexts`, `host`, `player`,
`standalone`, `lib`, `stores`, `utils`, `emails`) with `--no-dead-code --no-supply-chain`
(dead-code analysis is invalid when scoped — cross-directory imports look unused).

**Baseline numbers below are from the post-config-fix rescan** (`/tmp/rd-audit2/*.json`), which also
covers `supabase`, `backend`, `server`, `workers`, `shared`:

| | diagnostics | error | warning |
|---|---|---|---|
| Broken config (pre-fix, 11 dirs, test files included) | 4016 | 479 | 3537 |
| **Fixed config (16 dirs, tests excluded)** | **1715** | **190** | **1525** |

Most of the drop is test files and build artifacts leaving the scan, not code changing.
Score for `components/` at the start of this audit: **44/100**.

⚠️ A whole-repo `.` run was also attempted with `--max-duration 800`. It returned `ok: true` with
716 diagnostics — but `elapsedMilliseconds` was **800225**, i.e. it hit the budget exactly and
reported **partial** results with a success flag. Do not use a `--max-duration`-capped run as a
baseline; per-directory runs complete in ~3 minutes in parallel and are trustworthy. (Another
instance of an inconclusive result that reads as clean.)

Findings were then filtered against the known-false-positive classes established on 2026-07-20
(`no-ref-current-in-render`, `effect-needs-cleanup`, `no-impure-state-updater`,
`no-layout-property-animation` — 418 of the 479 errors), and every survivor was read in source
before being called a bug. Verdicts below are from reading the code, not from the tool.

---

## 2. THE HEADLINE FINDING — not from react-doctor

react-doctor's `supabase-client-owned-authz-field` rule fired on 12 sites. Eleven were false
positives or advisory. Chasing them into the live database surfaced a **real, exploitable
vulnerability the tool did not flag**:

### `public.profiles` is writable by any unauthenticated caller

```sql
-- UPDATE policy "Users and server can update profiles", PERMISSIVE, role: public
USING ((auth.uid() = id) OR (auth.uid() IS NULL))   -- no WITH CHECK
```

- RLS is enabled on `profiles`, but there are **0 restrictive policies** — one permissive policy
  passing is sufficient.
- `anon` holds `UPDATE`/`INSERT`/`DELETE` grants on the table.
- With no `Authorization` JWT, `auth.uid()` is `NULL`, so the second branch is unconditionally true.
- No `WITH CHECK` clause means the `USING` expression governs the post-image too.

**Proven empirically** (inside a rolled-back transaction): `SET LOCAL ROLE anon` followed by an
`UPDATE public.profiles` targeting another user's row **returned that row**.

**Impact.** The anon key is public — it ships in the browser bundle. Any third party can
`PATCH /rest/v1/profiles?id=eq.<any-user-id>` with no account and rewrite arbitrary columns on
arbitrary users: display names, and the economy columns this audit was tracing
(`streak_freeze_count`, `purchased_cosmetics`, `equipped_cosmetics`, `mp_win_streak_*`). This
defeats every "advisory" verdict on the client-side economy writes — the RLS that made them safe
does not hold for an unauthenticated caller.

`INSERT` carries the same `OR (auth.uid() IS NULL)` branch. `DELETE` has no policy, so it is denied
despite the grant.

**The NULL branch is not load-bearing.** `service_role` bypasses RLS entirely and never needed a
policy. `profiles.id` is `FK → auth.users(id) ON DELETE CASCADE`, so guest players cannot have
`profiles` rows and no guest flow can depend on it.

**Also affected — `public.custom_puzzles`:**
```sql
-- UPDATE, PERMISSIVE, role: public
USING ((creator_id = auth.uid()) OR (creator_id IS NULL AND creator_guest_fingerprint IS NOT NULL))
```
The second branch lets any anonymous caller update **any** guest-created puzzle. Lower stakes, same
shape. (`INSERT WITH CHECK true` is presumably intended — guest puzzle creation.)

> **Not remediated in this pass.** Changing a production RLS policy is an outward-facing, hard-to-
> reverse action and needs an explicit go-ahead. Proposed migration in §5.

---

## 3. Confirmed React defects (read in source)

| # | File:line | Rule | Impact |
|---|---|---|---|
| 1 | `app/[locale]/education/duels/PageClient.tsx:34` | `no-loading-flag-reset-outside-finally` | `setLoading(false)` runs only on the success path. Any throw from `getStudentClassroom`/`getLessons`/`getClassroomStudents` (or a `Promise.all` rejection) wedges the "Finding classmates" `PageLoader` **permanently**. Same dead-end shape as the onboarding drop-off tracked on 2026-08-07. |
| 2 | `app/[locale]/education/duels/[duelId]/PageClient.tsx` | same | Duel detail screen, same wedge. |
| 3 | `components/education/duels/DuelHistory.tsx:75` | same | same |
| 4 | `components/education/duels/DuelLobby.tsx:71` | same | same |
| 5 | `components/AutoHideHeader.tsx:43,51,65` | `no-prop-callback-in-render` | `onVisibilityChange(...)` invoked in the render body on all three branches → parent `setState` during child render. React logs "Cannot update a component while rendering a different component" and schedules an extra render pass on every header render. |
| 6 | `components/results/PreResultFanfare.tsx:113` | `no-prop-callback-in-render` | `onComplete()` called inside an early return during render. |
| 9 | `app/api/custom-puzzle/[puzzleCode]/route.ts:49` | `nextjs-no-side-effect-in-get-handler` | GET handler `.update({ total_plays })` with the anon client and no auth gate. CSRF-able: an `<img src=".../api/custom-puzzle/ABC123">` on any site inflates play counts. Also re-fires on Next/CDN prefetch. |
| 10 | `components/singleplayer/SinglePlayerView.tsx:331,338` | `no-random-key` | `key={resultsData.gameSessionId \|\| \`results-${Date.now()}\`}` — when `gameSessionId` is falsy the key changes every render, remounting the results component (animations restart, scroll resets). Same class as the confirmed 2026-07-20 `WordWheelGame` defect. Latent if `gameSessionId` is always set. |
| 11–14 | `components/animations/CoinTrajectory.tsx:238`, `components/blast/v2/BlastFtueOverlay.tsx:142`, `components/game/FloatingCoinAnimation.tsx:170,236` | `motion-keyframe-times-mismatch` | A 4-entry `times` paired with 3-entry keyframe arrays. See §4 — **throws in dev, silently mis-eases in prod**. |

### Framer-motion `times` mismatch — verified against the installed library

Confirmed by reading `motion-dom`/`motion-utils` rather than assuming:

- `getValueTransition` spreads the transition into **every** animated property
  (`{...transition, ...transition[key]}`), so a top-level `times` applies to all of them — which is
  exactly why a 3-entry keyframe array breaks.
- `remainder = times.length - keyframes.length; remainder > 0 && fillOffset(times, remainder)`
  **appends further offsets** when `times` is the longer array, widening the mismatch.
- `interpolate` then hits
  `invariant(inputLength === output.length, "Both input and output ranges must be the same length")`.
- `invariant` is `() => {}` when `NODE_ENV === 'production'` and **throws** otherwise.

So: **dev = thrown Error inside the animation; prod = silent, wrong easing.**

Per-value `times` overrides are supported — but **they do not reliably inherit**. There are two
`getValueTransition` implementations installed, and they disagree:

- `framer-motion/dist:1344` merges: `{ ...transition, ...transition[key] }`.
- `motion-dom/dist:2963` calls `resolveTransition(valueTransition, transition)`, and
  `resolveTransition` merges the parent **only if the sub-object sets `inherit`** — otherwise it
  returns the sub-object as-is, replacing the whole transition.

So a bare `x: { times: [...] }` risks silently dropping `duration` / `repeat` / `ease` — on the FTUE
hint that would have killed `repeat: Infinity` and left a one-shot default-duration glide. The fix
therefore **restates** `duration`/`repeat`/`ease` inside each per-value sub-object, which is correct
under either implementation. Note the static rule going 4 → 0 does **not** verify this; the rule only
counts array lengths.

---

## 4. Verified NOT defects

Checked in source and dismissed — do not re-investigate:

- `nextjs-async-client-component` @ `contexts/MusicContext.tsx:559` — `NOOP_ASYNC` is a utility
  function, not a component.
- `effect-observer-needs-disconnect` ×2 (`BannerCoordinatorMount.tsx:142`,
  `WordCraftPixiStage.tsx:60`) — both `disconnect()` in cleanup.
- `no-unguarded-browser-global-in-render-or-hook-init` ×4 (`global-error.tsx:41`,
  `AvatarBuilderModal.tsx:478`, `StickyReadyBar.tsx:120`, `WordHuntGame.tsx:96`) — all client-only,
  all in try/catch.
- `no-hydration-branch-on-browser-global` — **all 19 are false positives** (`'use client'`, or the
  global is read inside a helper/`useMemo`/effect rather than the render path).
  `components/landing/LandingYourRank.tsx:24` was the one candidate that genuinely server-renders,
  and it survived a closer look: its `hadSession` (localStorage) value only participates in the
  branch `if (!hadSession && !loading && !isAuthenticated) return null`, and `useAuthState`
  initialises `loading` to `true` (`contexts/auth/hooks/useAuthState.ts:21`). On the first render
  both server and client therefore take the skeleton branch regardless of `hadSession`, and
  `hadSession` can only change output after auth resolves — which is post-hydration. No mismatch.
  The `useState`-initializer peek is doing exactly what its comment claims.
- `unsafe-json-in-html` (56) — **all noise.** Every JSON-LD block in `components/seo/` is a
  build-time constant; no user-controllable data reaches any of them.
- `supabase-client-owned-authz-field` — 5 are server-side/service-role (`lib/education/allowlist.ts`,
  `lib/pushReminders.ts`, `lib/subscriptions.ts`, `lib/welcomeEmail.ts`). For the client-side ones,
  live `pg_policies` confirms the ownership columns **are** pinned to `auth.uid()`
  (`game_cognitive_scores.user_id`, `word_clubs.owner_id`, `word_club_members.user_id`,
  `friend_messages.sender_id`, `friend_challenges.challenger_id`). Their safety is nonetheless
  undermined by §2 for `profiles`.
- `nextjs-no-side-effect-in-get-handler` — 3 of 6 are cache-only writes, no DB mutation
  (`admin/insights`, `game-mode-stats`, `growth/referral`). `engagement/calendar:71` and
  `word-tower/wreck:36` do mutate on GET but are JWT-gated, so not CSRF-able — anti-pattern, not a
  hole.
- `no-fetch-response-used-without-status-check` (56) — the one user-facing site worth checking,
  `app/[locale]/account/delete/PageClient.tsx:55`, **does** check `res.ok`; it just reads
  `res.json()` first. An HTML error page makes that parse throw, and the surrounding `catch`
  already surfaces `t('settings.deleteAccountError')` and clears the loading flag. Cosmetic
  ordering, not a blank-state bug. Left alone.
- `no-set-state-after-await-in-effect` — only `community/[boardCode]/PageClient.tsx:24` has a
  reachable race (rapid board-to-board navigation), and it already clears loading in a `finally`.
  Design-acceptable.
- The four bulk error classes carried over from 2026-07-20 remain false positives here
  (React Compiler is ON): `no-ref-current-in-render` (161), `effect-needs-cleanup` (85),
  `no-impure-state-updater` (40), plus `no-layout-property-animation` (132, perf style).

---

## 5. Proposed RLS migration (NOT applied — needs explicit approval)

```sql
-- profiles: drop the unauthenticated escape hatch.
-- service_role bypasses RLS, so it never needed this branch;
-- profiles.id is FK -> auth.users(id), so no guest row can depend on it.
DROP POLICY "Users and server can update profiles" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING  ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY "Users and server can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- custom_puzzles: stop anon from updating arbitrary guest-created puzzles.
-- MUST ship together with the RPC below, or the play counter silently stops.
DROP POLICY "custom_puzzles_update_policy" ON public.custom_puzzles;
CREATE POLICY "custom_puzzles_update_policy" ON public.custom_puzzles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = creator_id)
  WITH CHECK ((SELECT auth.uid()) = creator_id);

-- A player is not the creator, so counting a play can no longer be a direct
-- UPDATE. Route it through a definer function that can ONLY bump the counter.
-- Also fixes the lost-update race in the current read-modify-write.
CREATE OR REPLACE FUNCTION public.increment_custom_puzzle_plays(p_puzzle_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.custom_puzzles SET total_plays = COALESCE(total_plays, 0) + 1
  WHERE id = p_puzzle_id;
$$;
REVOKE ALL ON FUNCTION public.increment_custom_puzzle_plays(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_custom_puzzle_plays(uuid) TO anon, authenticated;
```

> **Coupling — read before applying.** The `custom_puzzles` policy above and the
> `total_plays` write in `app/api/custom-puzzle/[puzzleCode]/submit/route.ts` are now linked. That
> write currently succeeds only because the permissive guest branch exists. Tighten the policy
> without adding the RPC (and switching the route to `supabase.rpc('increment_custom_puzzle_plays', …)`)
> and the counter stops updating **silently** — precisely the Class-4 shape this repo keeps getting
> bitten by. Ship them in one migration or neither. `profiles` has no such coupling and can be
> tightened on its own.

**Dependency audit — done, nothing breaks.** Every `profiles` write in the repo was enumerated and
classified by key:

- **service_role** (bypasses RLS, unaffected): `backend/modules/supabase/playerStats.ts`,
  `engagementManager`, `engagementComeback`, `weeklyQuestManager`, `backend/routes/admin/*`,
  `app/api/ranked/match/route.ts`, all `app/api/admin/*`.
- **anon + authenticated session, scoped to own row** (`.eq('id', user.id)` after
  `getAuthedUser()`/`auth.getUser()`): the browser hooks (`useCosmetics`, `useStreakFreeze`,
  `useMpWinStreak`), `lib/supabase.ts`, and the `app/api/**` profile routes.
- **anon + no session: none found.**

The one case that looked like a guest write — `app/api/education/classroom/join/route.ts:58` —
calls `signInAnonymously()` first, so the caller has a real `auth.uid()` and Supabase's
`authenticated` role (anonymous users are authenticated users with `is_anonymous: true`). It
satisfies `auth.uid() = id` and is covered by `TO authenticated`. Casual multiplayer guests keep
localStorage-only identity and never touch `profiles`.

Guest-created `custom_puzzles` do lose creator-edit ability under the proposed policy; if that flow
matters, move the write behind a server route that validates `creator_guest_fingerprint` rather
than exposing the branch to RLS.

Add a `WITH CHECK` to any policy that currently relies on `USING` alone — without it, a row can be
updated *into* a state the policy would not have allowed.

---

## 6. What was fixed in this pass

| Fix | Files | Test |
|---|---|---|
| `ignore` config shape — the whole audit was reading a dropped config | `doctor.config.json` | Verified by re-run: stderr warning gone, test-file findings 0 |
| `onVisibilityChange` moved out of the render body into an effect, fired once per visibility *change* (ref keeps an unstable inline callback from re-firing it) | `components/AutoHideHeader.tsx` | 2 new tests in `components/__tests__/AutoHideHeader.test.tsx`; RED confirmed (called twice on mount / on every re-render) before the fix, 11/11 green after |
| `onComplete()` moved out of the render body into an effect | `components/results/PreResultFanfare.tsx` | covered by existing suite |
| Loader wedge closed on all 4 education-duel screens: fetches wrapped in `try/catch/finally`, flag cleared in `finally`, errors logged with context (never a silent swallow) | `app/[locale]/education/duels/PageClient.tsx`, `app/[locale]/education/duels/[duelId]/PageClient.tsx`, `components/education/duels/DuelHistory.tsx`, `components/education/duels/DuelLobby.tsx` | 6 new rejection tests, RED-first; 108/108 green across the duels suites. On `[duelId]` the four per-branch `setIsChecking(false)` calls were collapsed into one `finally` — clearing it per-branch is how the spinner wedged originally, and a fifth branch would have re-introduced it |
| `Date.now()` key fallback → stable constant | `components/singleplayer/SinglePlayerView.tsx` | existing suite |
| framer `times`/keyframe lengths reconciled ×4 (3 by padding the short array — holds the end value while the coin fades; 1 by per-value `times`, because padding would have turned an even glide into a dart-and-hold) | `CoinTrajectory.tsx`, `FloatingCoinAnimation.tsx` ×2, `BlastFtueOverlay.tsx` | **no test** — keyframe arrays are not meaningfully unit-testable, and an AST scanner for the class is over-engineering. Verified by re-scan: rule count 4 → 0 |
| `total_plays` increment removed from the unauthenticated GET and moved to the rate-limited, de-duplicated submit POST | `app/api/custom-puzzle/[puzzleCode]/route.ts`, `.../submit/route.ts` | — |

Post-fix rescan confirms `motion-keyframe-times-mismatch` 4 → 0, `no-random-key` 2 → 0,
`no-prop-callback-in-render` 7 → 0.

**Score:** `components/` **44 → 48**.

**On the `AutoHideHeader` change specifically.** Moving the callback from render to an effect moves
it from "same commit" to "after paint", which would matter if a parent used the boolean for layout
(a stale first frame → shift → CLS, the exact hazard the component's own comments are built around).
Checked: **no consumer anywhere in `app/`, `components/`, `host/`, `player/`, `standalone/` passes
`onVisibilityChange` at all** — every call site is a bare `<AutoHideHeader />`. The prop is currently
exercised only by its tests, so there is no layout consumer to regress. If one is added later it
should derive visibility from the same three hooks rather than take the callback, so both components
agree within a single render.

**`total_plays` semantics changed** (product-visible): it counted *link loads* and now counts
*completed, de-duplicated submissions*. Existing rows are a mix of both, and counts shown in
`PuzzleBrowse` will grow much more slowly from here.

**Verification:** `npx tsc --noEmit` — **clean, 0 errors**. `eslint` clean on all 10 changed files. `npx vitest run` over
`components/__tests__/AutoHideHeader.test.tsx`, `components/singleplayer`, `components/results`,
`components/custom-puzzle`: **851 passed, 1 failed**. The failure is
`components/results/__tests__/ResultsPodiumMood.test.tsx` ("gives ONLY the first-place avatar a
'win' mood"), which imports `ResultsPodium` — a file this audit did not touch and which is
unmodified in git. **Pre-existing failure on master, not caused by these changes**, but it is red
and should be looked at.

## 7. Not covered

- **Dead-code / unused-export analysis** — invalid under per-directory scoping; needs one
  whole-repo run now that the config is fixed.
- **Supply-chain scan** — not run.
- The `no-transition-all` (733) and `no-scale-from-zero` (226) performance classes were not
  triaged individually; they are style-level and dominated by the design system.
- ~180 accessibility warnings (`label-has-associated-control` 52,
  `control-has-associated-label` 41, `no-static-element-interactions` 39,
  `click-events-have-key-events` 38) were **not** triaged. The project targets WCAG 2.1 AA, so this
  is the largest untriaged block worth a dedicated pass.
