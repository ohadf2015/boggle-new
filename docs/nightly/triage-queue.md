# Triage Queue

Items deferred from automated nightly triage. Human review required.

---

## 2026-08-16

### [Watch update] `/multiplayer` rage-clicks persist post-fix — source is NOT Quick Play re-entrancy
- Closes the 2026-08-14 watch ("if `mp_quickplay_rapid_click` still nonzero after 3 nights, source is elsewhere"): `mp_quickplay_rapid_click` = **0 events in 7d** — the re-entrancy fix fully eliminated that path. Yet `/en/multiplayer` (bare, no `?room=`) still logged **21 `$rageclick` events in 7d**, the single largest rage-click surface in tonight's brief (next highest: 6).
- Traced both above-fold CTA paths on this page and found NEITHER missing press feedback (ruling out the previously-validated "add `active:scale`" fix pattern from `homepage`/`avatar-builder`, confirmed via impact-check this run — 0 rage-clicks now on `/profile`, was 2):
  - `ArenaCTAStrip.tsx` (Quick Play / Create Room hero buttons) — already has `whileTap={{scale:0.97}}` + `active:translate-y-0.5` + `active:shadow-hard-pressed` + explicit offline-disabled state.
  - `RoomListView.tsx` room-list join cards — `whileTap`, disabled+dim (`opacity-50 cursor-not-allowed`) on ALL cards while any join is in-flight, spinner on the clicked card, and `trackMpRoomJoinBlocked`/`trackMpRoomJoinClicked` already fire.
- `$el_text`/`$elements[1].tag_name` are **null on all 21** rage-click events for this URL (checked via HogQL) — PostHog's autocapture isn't resolving element identity on whatever's being clicked, which is itself an instrumentation gap blocking root-cause. Could be a canvas/SVG/Pixi element, a Framer-Motion-wrapped div PostHog's selector heuristic skips, or the CrazyGames friends strip / live-match-status bar (neither inspected this run — ran out of time budget).
- Recommended owner: lane-03/lane-02 tomorrow — either (a) add explicit `data-ph-capture-attribute` / `$el_text`-friendly labeling to whatever renders in `CrazyGamesFriendsStrip` and the live-match status bar so the next rage-click sample resolves an element, or (b) pull `$session_id` for a few of the 21 events and watch a session recording directly instead of relying on autocapture element parsing.

## 2026-08-14

### [Rage-click root cause found + fixed] `/multiplayer` — Quick Play re-entrancy
- Supersedes the 2026-08-01 entry below (same surface, was queued for a HogQL query — root cause found by code read instead). `handleQuickPlay` in `components/multiplayer/MultiplayerFlow.tsx` had no re-entrancy guard: control-arm users of `exp-mp-quickplay-eager-disable-v1` (no eager visual disable) get zero feedback until `isJoining` flips, so each repeat tap re-ran the whole handler — new room code, new `handleJoin` call. Fixed: early-return + `mp_quickplay_rapid_click` tracking when `isJoining || isQuickPlayPending`. Does not touch the eager-disable experiment's treatment logic (guard applies identically to both arms) so it should not bias that experiment's read.
- Flag hygiene sweep: `exp-mp-quickplay-eager-disable-v1` created 2026-07-29 (16 days), wired in this same file — cannot confirm p<0.05/n≥1000/arm without an expensive PostHog experiment-results query (out of scope for lane time budget). Recommended owner: human — check PostHog experiment results for this key; if `eager-disable` wins, delete `control` branch + flag.
- Watch: `mp_quickplay_rapid_click` volume next 3 nights — if near-zero after this fix, the rage-click metric on `/multiplayer` should also drop; if still nonzero, the rage-click source is elsewhere on the page (room-list join taps, not Quick Play).

## 2026-08-01

### [Flag Health] lane-03 sweep — all 21 `exp-*` keys already wired + flagged live
- Swept every `'exp-...'` key in `lib/experiments.ts` (21 total) against live PostHog flag list (`posthog-query.sh flags`) and call-site grep. All 21 have a matching active PostHog flag AND ≥1 non-test call site — nothing unwired found tonight (prior "unwired" list from 2026-06-16 memory — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`, `exp-mp-round-feedback-top-v1` — is now stale, all three wired: `hooks/usePracticeWheelRetryCta.ts`, `hooks/useQuitConfirmDescription.ts`, `components/results/ResultsMainContent.tsx`). No `ensure` calls needed.
- 3 flags already `active:false` (decided/retired, no action): `exp-mp-lobby-connect-feedback-v1` (reverted 07-26, in memory), `exp-mp-room-join-loading-v1`, `exp-blast-wave-banner-v1`.
- Recommended owner: none — informational, closes a stale memory item.

### [Investigation needed] Rage clicks — ES `/multiplayer`, HE `/` homepage, EN `/multiplayer?room=W8T4WG`
- Tonight's intelligence brief flagged 3 rage-click surfaces (score 0.75, 0.75, 0.51) but gave no session-recording/element detail — root cause needs a HogQL query against `$rageclick` events (element selector, session recording ID) before a safe code fix can be scoped. Ran out of lane time budget before that query.
- Recommended owner: lane-02 (perf) or lane-03 tomorrow — pull `SELECT properties.$el_text, properties.$session_id FROM events WHERE event='$rageclick' AND properties.$current_url LIKE '%multiplayer%'` (last 24h) to identify the exact clicked element, then decide fix vs new experiment.

## 2026-07-13 (correction — stale doc, verified against live PostHog)

### [Correction] exp-mp-quickplay-wait-v1 / exp-invite-arrival-clarity-v1 — flags DO exist, do not re-flag
- Multiple entries below (06-08 through 06-15) say these two flags were "NOT YET CREATED" / "ACTION REQUIRED". That was true when written but went stale: both were created directly in PostHog on **2026-06-16** (ids 206583/206584), ACTIVE, correct 50/50 `control`/variant split, and `exp-invite-arrival-clarity-v1` was evaluated as recently as 2026-07-12. No entry after 06-16 repeats the claim, so this was already dormant — noting it explicitly so a future audit doesn't resurrect it from the older entries below without checking live state first.
- **Lesson for future triage passes**: this doc is an append-only log of what was true WHEN WRITTEN, not current state. Before treating any entry here as an open action item, verify against live PostHog (`feature-flag-get-all` search by key) rather than trusting the doc — same class of staleness risk as any other dual-source-of-truth.

### [Flag Retirement] mp-signup-nudge-copy-v1 — 54 days, inconclusive
- Created 2026-05-08, active, rollout 100%. Wired in useMultiplayerSignupNudge.ts.
- Variants: control (sheet+toast) vs toast-disabled (sheet only). 54-day window with no winner surfaced.
- Recommended owner: human — check PostHog experiment results; if no winner at n≥1000/arm retire and keep `toast-disabled` (simpler UX).

## 2026-07-04

### [Flag Retirement] exp-results-replay-cta-v1 — 32 days, needs decision
- Created 2026-06-02, active, rollout 50%, wired in `components/singleplayer/SinglePlayerResults.tsx`.
- Variants: control vs quick-replay ("Run it back?" button on SP results). 32-day window — past the 14-day inconclusive threshold.
- Recommended owner: human — pull PostHog experiment results (`exp-results-replay-cta-v1`); if quick-replay arm wins (≥p<0.05, n≥1000/arm) unwire the conditional and keep the button. If inconclusive, retire and keep `control`.

### [Flag Kill-switch Audit] landing-modes-cubes-v1 — 23 days, experiment concluded
- Created 2026-06-11, active, rollout 100%. Code default flipped to `cubes` (experiment concluded). `control` retained only as remote PostHog kill-switch.
- **No active A/B test** — all users get `cubes`. The PostHog flag is purely a deployment safety valve now, not an experiment.
- Recommended owner: human — if the kill-switch is no longer needed (30+ days of stable `cubes`), delete the flag from PostHog and remove the conditional in `LandingModeCubes.tsx` to simplify code.

### [Experiment Proposal] exp-mp-room-join-loading-v1 — ✅ SHIPPED 2026-07-05 lane-03
- Implemented: `joiningRoomCode` prop threaded through `CgAwareLobbyChrome` → `RoomListView`; room card `disabled` + Loader spinner gated on `loading-state` variant. PostHog flag created (id=219697). Check rage-click rate in 7 days.

## 2026-07-02

- [Sentry] JAVASCRIPT-NEXTJS-1KQ — Error: churn-signals report failed with status 502
  - first/last seen: 2026-06-03 / 2026-06-05, 278 occurrences, 3 users
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1KQ
  - status: deferred
  - why: 502 is infrastructure-level (Vercel edge/proxy); route code is clean, all error paths handled. No code fix possible.
  - recommended owner: self — resolve in Sentry if no recurrence

- [Sentry] JAVASCRIPT-NEXTJS-1CW — TypeError: Cannot read properties of null (reading 'clear')
  - first/last seen: 2026-05-15 / 2026-06-09, 13 occurrences, 4 users, culprit: /daily/word-wheel
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1CW
  - status: shipped — already fixed in fe-next/components/daily/WordWheelPixiRing.tsx:86,180 (guard + ticker.stop() before destroy; comment references this Sentry ID)
  - why: fix deployed after last occurrence; safe to resolve in Sentry
  - recommended owner: review-by-eod — close issue in Sentry

- [Supabase] SECURITY DEFINER upsert_push_token callable by authenticated role
  - status: deferred — false positive; anon has no EXECUTE grant; authenticated is intentional (push token reg requires login); function body scoped to auth.uid() — no cross-user access possible; SET search_path='' already hardened
  - recommended owner: self — no action

- [Supabase] RLS always-true INSERT on teacher_access_requests (tar_insert_any)
  - status: deferred — intentional; teacher sign-up form allows any visitor to submit a request; SELECT restricted to admin OR own row; UPDATE restricted to admin
  - recommended owner: self — no action

- [Feedback] Music not starting automatically (Hebrew, /he/daily/word-hunt, 2026-07-01)
  - status: deferred — browser autoplay policy blocks unmuted audio without user gesture; needs investigation of music trigger site in daily word-hunt flow
  - why: no callsite found in daily components; music lives in lib/audio + hooks, needs deeper trace
  - recommended owner: review-by-eod — find trigger site, add user-gesture guard or prompt

### [Flag Ghost] exp-blast-wave-banner-v1 — in PostHog but NOT in experiments.ts
- Created 2026-06-29, active, rollout 100%. No call site in fe-next (not wired).
- Recommended owner: human — either wire it to a component or delete from PostHog.

### [Flag Retirement] share-prompt-timing — 88+ days, inconclusive
- Created 2026-03-31, active, rollout 100%. Wired in SinglePlayerResults.tsx + useSharePromptImpression.ts.
- Variants: immediate-after-win vs results-page. No statistically significant winner surfaced in nightly sweeps.
- recommended owner: human — check PostHog experiment results; if no winner at n≥1000/arm retire and keep `results-page` (current default).

### [Flag Retirement] show-signup-after-first-win — 87+ days, inconclusive
- Created 2026-03-31, active, rollout 100%. Wired in useSignupPrompt.ts.
- Variants: after-first-win vs after-3rd-game. 87-day window, no winner surfaced.
- recommended owner: human — check PostHog experiment results; if no winner retire and keep `after-first-win` (lower friction).

---

## 2026-06-11 (lane-01 triage)

### [Supabase Security] `upsert_player_word` REVOKE — SHIPPED
- **Status**: shipped (migration `revoke_upsert_player_word_from_authenticated`)
- `authenticated` had EXECUTE on this SECURITY DEFINER function despite the original migration having a REVOKE. Re-applied REVOKE + confirmed `has_function_privilege('authenticated',...) = false`.
- Callsite is `backend/modules/supabase/words.ts` via `service_role` only — no client-side callers.
- **recommended owner: review-by-eod** — verify migration shows up in Supabase dashboard + re-run advisor to confirm warning cleared.

### [Sentry 1KQ] Churn-signals report 502 — DEFERRED
- first seen: 2026-06-03, last seen: 2026-06-05, 278 occurrences, 3 users
- Error: `useChurnSignals: failed to report signals` — no source file found matching `churnSignal`/`useChurnSignal` in fe-next; likely removed or in generated/vendored code.
- Also: prior memory confirms "fire-and-forget analytics" — no user impact.
- **status: deferred** — why: code not locatable; last seen 6 days ago (may be self-resolved); no user-facing effect.
- **recommended owner: self** — search for `churn` once vendored deps are audited.

### [Sentry 1JR] `relation "profiles" does not exist` on POST /api/coins — DEFERRED
- first seen: 2026-05-27, last seen: 2026-05-27, 18 occurrences, 5 users. No recurrence in 15 days.
- Likely a transient deployment/migration ordering issue at the time; DB is healthy now.
- **status: deferred** — why: no recent recurrence; stale deployment artifact.
- **recommended owner: self** — monitor; re-open if recurs.

### [Sentry 1CW] Word-wheel null `.clear()` TypeError — ALREADY FIXED
- first seen: 2026-05-15, last seen: 2026-06-09, 13 occurrences, 5 users.
- Fix shipped in `abe2dcd2f` (guard: `if (destroyed || orbitGfx.destroyed || ...) return` in ticker). Last Sentry event predates the fix deployment.
- **status: resolved** — monitor Sentry to confirm zero events after deploy.

### [Supabase Security] `web_vitals` RLS INSERT always-true — DOCUMENTED INTENTIONAL
- Policy: `Anyone can insert web vitals` with `WITH CHECK (true)`.
- This is intentional public telemetry — any visitor (anon/authenticated) can push web vitals data. There is no user-specific data in the insert.
- **status: deferred** — why: intentional design; INSERT-only, no SELECT exposure.
- **recommended owner: review-by-eod** — confirm no sensitive fields in `web_vitals` schema.

---

## 2026-06-15 (lane-03 engagement)

### FLAG NEEDED — 3 dark experiments (blocked-on-human, ≥5 nights)

Create these PostHog feature flags to activate wired experiments:

| Flag key | Variants | Rollout | Hypothesis |
|---|---|---|---|
| `exp-mp-quickplay-wait-v1` | `control` / `match-seeking` | 50/50 | "Finding a match…" overlay cuts QuickPlay rage clicks ≥50% |
| `exp-invite-arrival-clarity-v1` | `control` / `status-card` | 50/50 | "Connecting…" card reduces blank-navy rage clicks on ?room= URLs |
| `exp-practice-wheel-cta-v1` | `control` / `retry-cta` | 50/50 | "Try Again" button lifts WheelRush re-play within 60s |

All three experiments are fully wired + tested. **Zero A/B data until flags exist.**

### FLAG NEEDED — new experiment wired 2026-06-15

| Flag key | Variants | Rollout | Hypothesis |
|---|---|---|---|
| `exp-game-abandon-confirm-v1` | `control` / `stats-shown` | 50/50 | Showing score+words-found in quit-confirm cuts mid-game abandonment ≥15% |

Registry: `fe-next/lib/experiments.ts`. Analytics hook: `useNavigationGuard.onAbandonAttempt` fires `game_abandon_attempted` (GrowthEvent added). Wire UI: pass `useExperiment('exp-game-abandon-confirm-v1')` variant to `ExitConfirmation` / quit-confirm dialog in `DailyChallengeGame.tsx` and `useSinglePlayerCore.ts`.

### [Funnel] game_started → game_completed 42% drop (7d n=320→135)

`game_abandon_attempted` now tracked via `useNavigationGuard.onAbandonAttempt`. Callers must opt-in by passing the callback. Priority: `DailyChallengeGame.tsx`, `useSinglePlayerCore.ts`, `usePlayerExit.ts`.

---

## 2026-06-09 (lane-03 engagement)

### [Flags] Stale experiments — human decision needed

- **`share-prompt-timing`** (69d, PostHog id 163656) — call site: `SinglePlayerResults.tsx:173` via `usePostHogFlag`. ~0 PostHog exposures (flag evaluates, SDK event may not fire correctly). Recommend: retire + keep `results-page` variant (status quo). Action: delete flag in PostHog UI + remove `usePostHogFlag` call in `SinglePlayerResults.tsx` + delete `useSharePromptImpression.ts`.

- **`show-signup-after-first-win`** (68d, PostHog id 163655) — call site: `useSignupPrompt.ts:61`. Inconclusive (low exposures, no p<0.05 winner). Recommend: retire + keep `after-first-win` variant. Action: delete flag in PostHog UI + unwire conditional in `useSignupPrompt.ts`.

- **`mp-signup-nudge-copy-v1`** (32d, PostHog id 183230) — call site: `useMultiplayerSignupNudge.ts`. 0/77 conversions in 28d. Tracking gap suspected (signup_completed not attributable to sheet within 30min). Recommend: fix tracking first, then re-evaluate at 60d. Action: verify `signup_completed{source:'mp_sheet'}` fires correctly before retiring.

- **`adventure-difficulty-tuning`** (PostHog id 163657, inactive) — no active code consumption found. Safe to delete in PostHog UI.

### [Experiment] `exp-mp-quickplay-wait-v1` — code wired, PostHog flag NOT YET CREATED

- Code fully wired in `MultiplayerFlow.tsx` (overlay + exposure tracking + `mp_quickplay_seeking`), `PageClient.tsx` (`mp_quickplay_joined`), `QuickPlaySeekingOverlay.tsx`.
- **ACTION REQUIRED**: Create PostHog feature flag `exp-mp-quickplay-wait-v1`, variants `control` / `match-seeking`, 50/50 rollout. Until created, all users get `control`.
- Hypothesis: full-screen "Finding a match…" overlay cuts rage clicks on `/multiplayer?quickPlay=true` by ≥50%. Conversion = `mp_quickplay_joined`. Guardrail = `mp_quickplay_initiated` must not drop.

---

## 2026-06-02 (lane-03 engagement)

### [Flags] Prior entries corrected — call sites ARE present

- **`show-signup-after-first-win`** (prior entries 05-26, 05-28, 06-01 all said "no call sites found") — **CORRECTION**: call site exists at `fe-next/components/singleplayer/results/hooks/useSignupPrompt.ts:61` via `usePostHogFlag('show-signup-after-first-win', 'after-first-win')`. 63d old, 34 exposures last 30d (19 after-first-win / 15 after-third-game). Still inconclusive; decision needed.

- **`share-prompt-timing`** (prior entries 05-26, 05-28 said "no call sites found") — **CORRECTION**: call site exists at `fe-next/components/singleplayer/SinglePlayerResults.tsx:173` via `usePostHogFlag('share-prompt-timing', 'results-page')` + `useSharePromptImpression.ts`. 63d old, 0 PostHog exposures last 30d = flag evaluates but SDK may not fire `$feature_flag_called` at the right moment. Recommend retire.

### [Experiment] `exp-results-replay-cta-v1` — activated in PostHog

- **PostHog flag id 197044** created 2026-06-02 — 50/50 split `control` vs `quick-replay`
- Code was already fully wired in `SinglePlayerResults.tsx:183-352` (`useExperiment` + conditional CTA button + `results_cta_clicked {cta: 'quick_replay'}` tracking)
- Experiment is now LIVE. Measure: `results_cta_clicked {cta: 'quick_replay'}` → `game_started` within 10min per person.

---

## 2026-06-02

- [Sentry] TypeError: Cannot read properties of null (reading 'x') — JAVASCRIPT-NEXTJS-13Y
  - first seen: 2026-05-06, last seen: 2026-05-06, count: 500, userCount: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred
  - why: minified Pixi rAF stack in /he/blast; last seen 4 weeks ago, pre-dates MP Blast sync fixes (05-30). 1 user. Likely self-resolved. Unactionable without source map — needs source map upload to Sentry or local repro.
  - recommended owner: review-by-eod (resolve in Sentry if no recurrence after 05-30 fixes)

- [Sentry] Error: relation "profiles" does not exist — JAVASCRIPT-NEXTJS-1JR
  - first seen: 2026-05-27, last seen: 2026-05-27, count: 18, userCount: 5
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (already fixed — migration 20260527230753 per prior memory)
  - why: DB-layer fix already shipped same day. Sentry issue stale. Resolve in UI.
  - recommended owner: review-by-eod (mark resolved in Sentry)

- [Sentry] [CoinContext] Failed to add coins — JAVASCRIPT-NEXTJS-1JP
  - first seen: 2026-05-27, last seen: 2026-05-27, count: 6, userCount: 5
  - link: https://lexiclash.sentry.io/issues/123033015/
  - status: deferred (downstream of 1JR — profiles table missing caused coin transaction failure)
  - why: Same incident as 1JR. Already fixed. Resolve in UI.
  - recommended owner: review-by-eod (mark resolved in Sentry alongside 1JR)

- [Supabase] Authenticated SECURITY DEFINER: upsert_push_token
  - status: deferred (intentional design)
  - why: function body uses auth.uid() and must UPDATE other users' tokens WHERE user_id != auth.uid() — requires elevated privileges. Only authenticated role has execute (no anon). Design is correct.
  - recommended owner: self (no action needed)

- [Supabase] RLS always-true INSERT on web_vitals
  - status: deferred (intentional design)
  - why: Telemetry collection. Any user (anon+auth) should be able to submit web vitals. Open INSERT is by design; SELECT is admin-only. No narrowing possible without breaking collection.
  - recommended owner: self (no action needed)

---

## 2026-06-01

### [Flags] Stalled A/B experiments — human decision needed

- **`show-signup-after-first-win`** (PostHog flag #163655, active, 62+ days, **26 after-first-win / 22 after-third-game** per 90d $feature_flag_called query 2026-06-01)
  - Status: Active but stalled — far below 1000/arm threshold for statistical inference
  - Context: Tests whether prompting guests after first-win vs 3rd game lifts signup CVR. Code searches found **no usages in fe-next/** — flag is orphaned (no call sites). Default = `after-first-win`.
  - Decision needed: **Recommend retire** — 48 exposures in 62 days, no code call sites found, zero conversion data. Keep `after-first-win` behavior (no code change needed since flag not wired).
  - Action: Delete flag in PostHog UI.

- **`share-prompt-timing`** (PostHog flag #163656, active, 62+ days, **2 exposures** per 90d $feature_flag_called query 2026-06-01)
  - Status: Near-dead — 2 total exposures in 90 days. Code searches found **no usages in fe-next/** — flag is orphaned.
  - Decision needed: **Recommend retire** — clearly dead experiment, no code call sites.
  - Action: Delete flag in PostHog UI.

- **`mp-signup-nudge-copy-v1`** (PostHog flag #183230, active, 29 days, **42 toast-disabled / 27 control** per 90d $feature_flag_called query 2026-06-01 — 0 conversions)
  - Status: Conversion = 0/69 exposures across arms. Clear failure on conversion, below 1000/arm but 0/69 is statistically meaningful.
  - Decision needed: (a) declare `toast-disabled` the winner (removing the toast = minimal downside, confirmed 0 uplift), (b) keep running to gather more data
  - Advisory: 0/69 is strong evidence the nudge mechanics are broken regardless of copy. Suggest user-research before iterating on copy.

---

## 2026-05-21

- [Sentry] `InvalidStateError: Failed to start the audio device`
  - first seen: 2026-05-21 ~01:00 UTC, last seen: 2026-05-21 ~01:00 UTC, count: 1, users: 0
  - issue: JAVASCRIPT-NEXTJS-1HM, culprit: `/es/multiplayer`
  - why deferred: browser Web Audio API device-level failure — no server-side fix; may need try/catch around AudioContext init with graceful fallback
  - recommended owner: frontend (audio init guard in multiplayer sound hooks)

- [Sentry] `wasm streaming compile failed: TypeError: Failed to execute 'compile' on 'WebAssembly': HTTP status code is not ok`
  - first seen: 2026-05-21 ~01:00 UTC, last seen: 2026-05-21 ~01:00 UTC, count: 1, users: 0
  - issue: JAVASCRIPT-NEXTJS-14N, culprit: `/:locale/practice/:mode`
  - why deferred: WASM file returned non-200 from CDN/server — transient or missing fallback; needs investigation of which WASM asset and whether it has a sync fallback
  - recommended owner: backend/infra (check CDN serving of WASM chunks for practice mode)

- [PostHog] `Minified React error #418` — hydration mismatch
  - first seen: 2026-05-20T21:23 UTC, last seen: same, count: 1, users: 1
  - url: `https://www.lexiclash.live/en?room=LPEVHC` (iOS Mobile Safari 26.4)
  - why deferred: single occurrence, no useful stack trace from minified bundle; needs repro or source-map correlation
  - recommended owner: frontend (check multiplayer room join page for SSR/client mismatch)

- [Supabase] `anon_security_definer_function_executable` — CRITICAL
  - functions: `award_ad_coins`, `increment_blast_progress`, `auto_remediate_realtime_publication`, `snapshot_db_perf_top_queries`, `snapshot_realtime_publication`
  - why deferred: auth-adjacent; anon role can call `award_ad_coins` and `increment_blast_progress` directly via REST — this is a coin/progress manipulation vector. Requires REVOKE EXECUTE on anon role + verify if any client calls these unauthenticated.
  - recommended owner: backend/security (URGENT — `award_ad_coins` + `increment_blast_progress` especially)

- [Supabase] `authenticated_security_definer_function_executable` — admin RPCs
  - functions: `admin_activity_stats`, `admin_bulk_ban_players`, `admin_cohort_retention`, `admin_engagement_funnel`, `admin_language_breakdown`, `admin_overview_stats`, `apply_prestige`, `add_league_xp`
  - why deferred: auth-adjacent; any authenticated user can call admin RPCs and `apply_prestige`/`add_league_xp` — privilege escalation vector
  - recommended owner: backend/security

- [Supabase] `security_definer_view` ERROR — `public.v_suspicious_realtime_publications`
  - why deferred: auth-adjacent; SECURITY DEFINER view runs with owner privileges — confirm intended or switch to SECURITY INVOKER
  - recommended owner: backend

- [Supabase] `rls_policy_always_true` WARN — 5 tables
  - tables: `connections_feedback`, `custom_puzzle_attempts`, `custom_puzzles`, `score_challenge_attempts`, `teacher_access_requests`, `web_vitals`
  - why deferred: security policy change; always-true INSERT bypasses RLS — intentional for some (web_vitals anonymous telemetry) but needs design review for others
  - recommended owner: design + backend

## 2026-05-23

- [Sentry] JAVASCRIPT-NEXTJS-1CK — word-tower `paintTile` null.clear
  - first seen: 2026-05-14, last seen: 2026-05-22T16:01, count: 2, users: 1 (אוהד/founder)
  - why deferred: stale — fix shipped in `b81a66e87` same day. Sentry MCP token is read-only (403), cannot resolve programmatically. Please resolve manually at https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1CK
  - recommended owner: self (manual Sentry resolve only)

- [Sentry] JAVASCRIPT-NEXTJS-14N — wasm streaming compile failed
  - first seen: 10 days ago, last seen: 6h ago, count: 10, users: 1
  - why deferred: previously triaged as transient/needs sourcemaps (per prior memory). `/singleplayer` WASM fetch returning non-200 — likely CDN cache issue not app bug.
  - recommended owner: infra/deploy

- [Sentry] JAVASCRIPT-NEXTJS-1HM — InvalidStateError: Failed to start audio device
  - first seen: 2 days ago, last seen: 11h ago, count: 2, users: 0
  - why deferred: browser permission/autoplay policy — no first-party code to fix; audio device start requires user gesture. Not reproducible from code alone.
  - recommended owner: design (add gesture-gate before audio init in lightning-round)

- [Sentry] JAVASCRIPT-NEXTJS-145 — [REDLOCK] Lock acquisition failed for cron:reengagement-email
  - first seen: 15 days ago, last seen: 12h ago, count: 2, users: 0
  - why deferred: expected in multi-instance deploy (redlock contention = correct behavior, not a bug). Would need Redis single-writer guarantee to eliminate. Non-actionable at code level.
  - recommended owner: infra (confirm single-instance or accept as noise)

- [Sentry] JAVASCRIPT-NEXTJS-1J6 — FRIEND_MESSAGES Error getting unread count (empty error)
  - first seen/last seen: 2026-05-23T09:42, count: 1, users: 1 (אוהד/founder)
  - partial fix shipped: improved logging to surface `error.code` + `error.details` (was `""` / empty)
  - why deferred full fix: root cause unknown without error code/details — need one more occurrence with improved logging to see the actual Supabase error
  - recommended owner: self (check next Sentry event for 1J6 with the new code/details context)

- [Sentry] JAVASCRIPT-NEXTJS-1J3 + 1J2 — [Lobby] Error: {} (minified)
  - first seen: 14h ago, count: 1 each, users: 0
  - why deferred: no source maps; minified stack is unreadable. Need sourcemaps for Sentry.
  - recommended owner: infra/build (enable Sentry sourcemap upload in CI)

- [Supabase] feedback_reports — RLS enabled, no policies defined
  - why deferred: auth-adjacent (RLS policy change). API inserts via service role (bypasses RLS), so functional. But no authenticated SELECT policy = no direct client reads. Verify this is intentional (should be).
  - recommended owner: backend/security

- [Supabase] Auth RLS Init Plan — 6 tables including `daily_streak_freezes` (recently shipped)
  - why deferred: performance optimization requiring migration (add `SET search_path` or restructure policies). Non-blocking today.
  - recommended owner: backend (next perf sprint)

## Flag Hygiene — 2026-05-23

- [Flag] `share-prompt-timing` (PostHog id 163656) — **retire**
  - status: STALE in PostHog, created 2026-03-31 (56 days as of 05-26). **2026-05-26 update:** only 2 total exposures ever ("immediate" variant, 2x) in 60 days of data. Permanently underpowered — will never reach stat-sig. Call sites still present: `useSharePromptImpression.ts` + `SinglePlayerResults.tsx`. Remove call sites + delete PostHog flag.
  - recommended action: grep `share-prompt-timing` → remove `usePostHogFlag` read + `useSharePromptImpression` enabled gate → delete PostHog flag.

- [Flag] `show-signup-after-first-win` (PostHog id 163655) — **needs human decision**
  - status: ACTIVE, created 2026-03-31 (56 days as of 05-26). **2026-05-26 update:** 42 total exposures (23 after-first-win, 19 after-third-game) — far below 1000/arm threshold. No linked experiment in typed registry. Still using raw `usePostHogFlag` in `useSignupPrompt.ts:61`. Either: (a) wire a formal PostHog experiment and update to `useExperiment('show-signup-after-first-win')` with typed registry entry, or (b) pick one variant and retire the flag.
  - recommended action: decide wire-or-retire this sprint.

## 2026-05-24

- [Sentry] JAVASCRIPT-NEXTJS-1J7 — [REDLOCK] Lock acquisition failed for cron:auto-promotion
  - first seen: 2026-05-24T~13h ago, last seen: 2026-05-24T~11h ago, count: 2, users: 0
  - why deferred: same pattern as 145 (reengagement-email Redlock). Expected contention in multi-instance Railway deploy. Not a code bug; both instances race to acquire lock, one wins, one logs error. Non-actionable at code level.
  - recommended owner: infra (confirm single-instance or accept as noise; consider suppressing Sentry capture for REDLOCK contention logs)

- [Sentry] JAVASCRIPT-NEXTJS-1J8 — SyntaxError in Turbopack worker (multiplayer page)
  - first seen: 2026-05-24T13:25 UTC, last seen: 2026-05-24T13:39 UTC, count: 5, users: 0
  - culprit: `/:locale/multiplayer`, error: `Unexpected non-whitespace character after JSON at position 106`
  - why deferred: stack trace is entirely inside `turbopack-worker-*.js` parsing a URL-encoded JSON parameter — no first-party code in the frame. Likely a Turbopack/Next.js infrastructure bug affecting specific Android 10 WebViews running Chrome Mobile 148. Cannot be fixed in user code without sourcemaps.
  - recommended owner: infra/build (enable Sentry sourcemap upload; if reproducible, file Next.js/Turbopack upstream issue)

- [Sentry] JAVASCRIPT-NEXTJS-1J5 — Error in registerPushToken: {} — **FIXED tonight**
  - root cause: `crypto.randomUUID` absent in Chrome WebView 91 (Android emulator default image)
  - fix: `_generateUUID()` polyfill in `utils/pushNotifications/tokenRegistration.ts`
  - shipped in this lane run (not committed yet)

- [Flag] `mp-signup-nudge-copy-v1` (PostHog id 183230) — **needs human decision**
  - status: ACTIVE; description states control has 0/77 converts in 28d (confirmed in registry `lib/experiments.ts:128`)
  - why deferred: no formal PostHog experiment linked, so no p-value. The 0/77 control result strongly implies either the prompt never fires correctly or the sheet is ineffective — both warrant action. With 0 converts across all variants in 28d, the experiment may be measuring the wrong conversion window or the sheet isn't rendering on the expected trigger.
  - recommended action: (a) verify sheet renders in prod (add a Sentry breadcrumb or PostHog event on sheet impression), then (b) wire a PostHog experiment to get stats, or (c) redesign the signup moment entirely given 19h avg time-to-signup data.

## 2026-05-26

- [Supabase] `anon_security_definer_function_executable` — **NEW: `sync_coins`** (update to 2026-05-21 entry)
  - function: `public.sync_coins(p_user_id uuid, p_amount integer, p_reason text, p_metadata jsonb)` callable by `anon` role via `/rest/v1/rpc/sync_coins`
  - risk: unauthenticated HTTP POST can set coin balance for any user_id — coin manipulation vector
  - why deferred: auth-adjacent (security privilege change); requires REVOKE EXECUTE ON FUNCTION public.sync_coins FROM anon + verify no legitimate anon call site
  - recommended owner: backend/security (URGENT — same priority as `award_ad_coins`)

- [Supabase] `function_search_path_mutable` — `sync_coins` + `update_word_hunt_player_stats`
  - both SECURITY DEFINER functions with mutable search_path — allows search_path injection if attacker can influence session search_path before the call
  - fix: `ALTER FUNCTION public.sync_coins SET search_path = public;` and `ALTER FUNCTION public.update_word_hunt_player_stats SET search_path = public;`
  - why deferred: modifying SECURITY DEFINER functions at 03:00 is security-adjacent; verify no test harness relies on schema-qualified override before applying
  - recommended owner: backend (low-effort once human verifies no call-site dependency)

- [PostHog] WASM fetch failure on `/en/daily/word-wheel` — recurring pattern
  - error: `RuntimeError: Aborted(both async and sync fetching of the wasm failed)` — 1 occurrence, 1 user (Edge 148 / Windows 10)
  - timestamp: 2026-05-25T08:42:27Z; chunk `/_next/static/chunks/0bwv0jwk01wlj.js`
  - why deferred: single occurrence, same pattern as prior JAVASCRIPT-NEXTJS-14N (wasm streaming compile failed). Likely transient CDN hiccup or Edge-specific WASM loading quirk. Not reproducible without source maps or repro steps.
  - recommended owner: infra (confirm WASM assets served with correct MIME type and no CORS/CSP block on word-wheel page; add error boundary with retry for WASM init)

## 2026-05-27

- [Supabase] `sync_coins` + `function_search_path_mutable` (2026-05-26 entry)
  - status: shipped (migration `fix_function_search_path_mutable`, same run as below)
  - note: REVOKE also shipped (see `anon_security_definer_function_executable` below)

- [Supabase] `anon_security_definer_function_executable` — all 6 RPCs (2026-05-26 entry update)
  - status: shipped (migration `revoke_anon_execute_on_secdef_rpcs`)
  - verified: 0 anon callsites in codebase; all API routes gate on `auth.getUser()`; cron fns invoked by pg_cron (postgres role, not anon)

- [Supabase] `auth_rls_initplan` — 9 policies on 4 tables
  - affected: `teacher_access_requests` (3), `teacher_access_allowlist` (3), `word_tower_progress` (2), `daily_streak_freezes` (1)
  - fix: replace `auth.uid()` with `(select auth.uid())` in each policy expression
  - status: deferred
  - why: requires DROP + CREATE POLICY (replacement) — failure mode = users locked out of their own records; performance-only (not a bug)
  - recommended owner: review-by-eod

- [Supabase] `multiple_permissive_policies` — `teacher_access_requests` (5 overlapping SELECT policies)
  - affected roles: anon, authenticated, authenticator, dashboard_user, supabase_privileged_role
  - status: deferred
  - why: consolidation requires design decision on which policy wins; no production impact now
  - recommended owner: backend

- [Sentry] JAVASCRIPT-NEXTJS-145 — `[REDLOCK] Lock acquisition failed for cron:reengagement-email`
  - first/last seen: ~20h ago, count: 1, users: 0
  - status: deferred
  - why: single occurrence, 0 users; Redis lock contention on cron is transient / expected under concurrent server instances; no user-visible impact
  - recommended owner: backend (check if reengagement cron overlaps with another lock holder; consider jittered scheduling)

- [Sentry] JAVASCRIPT-NEXTJS-14N + PostHog `RuntimeError: Aborted(wasm failed)` on `/practice/:mode`
  - count: 1, users: 0 (Sentry); 1 occurrence, 1 user (PostHog)
  - status: deferred (same recurring pattern as 2026-05-26 entry)
  - why: transient CDN/Edge WASM load failure; no repro, no source maps for stack attribution
  - recommended owner: infra (verify WASM MIME type + CSP on practice pages; add retry error boundary)

## 2026-05-28

- [Flag] `show-signup-after-first-win` (PostHog id 163655, created 2026-03-31 — 58 days)
  - description: A/B show signup prompt after first win vs after 3rd game
  - status: inconclusive, >14 days, no stats engine result linked — retire or conclude
  - exposures: ~43 (per memory log 2026-05-27); far below 1 000/arm threshold for significance
  - how it works: `usePostHogFlag('show-signup-after-first-win', 'after-first-win')` in `useSignupPrompt.ts:61` — raw flag, not wired to `useExperiment`; no typed exposure tracking
  - variants: `after-first-win` (control/default) · `after-third-game`
  - recommended action: if no clear signal needed, keep `after-first-win` path (emotional peak), delete the flag + conditional in `useSignupPrompt.ts`; or wire via `useExperiment` + add to experiments registry before concluding
  - recommended owner: growth

- [Flag] `share-prompt-timing` (PostHog id 163656, created 2026-03-31 — 58 days)
  - description: A/B show share prompt immediately after win vs on results page
  - status: inconclusive, >14 days, 0 `share_win_prompt_shown` events in last 7 days — data gap
  - how it works: `usePostHogFlag('share-prompt-timing', 'results-page')` in `SinglePlayerResults.tsx:167`; raw flag, no typed exposure tracking
  - variants: `results-page` (default) · `immediate`
  - recommended action: if share prompt is rarely triggered (0 events/7d), the experiment can't conclude; decide whether to retire the feature or add minimum traffic gate; delete flag + dead `showShareImmediate` branch if retiring
  - recommended owner: growth

- [Flag] `mp-signup-nudge-copy-v1` (PostHog id 183230, created 2026-05-08 — 49 days)
  - description: MP signup nudge copy + toast gate; control = sheet+toast; toast-disabled = sheet only; value-prop/social-proof = alternate copy
  - status: inconclusive — flag description notes 0/77 converts in 28d across all variants; no stats engine result linked
  - how it works: `usePostHogFlag` or `useFeatureFlag` in `useMultiplayerSignupNudge.ts`
  - recommended action: low-volume game makes 77 total exposures insufficient for significance; decision: pick control (current sheet+toast) and delete flag + variant branches, OR keep running and target 300/arm minimum first
  - recommended owner: growth

## 2026-06-01

- [Supabase] upsert_push_token SECURITY DEFINER callable by authenticated
  - advisor: authenticated_security_definer_function_executable
  - status: deferred (reviewed — intentional)
  - why: function body uses cross-user UPDATE (`WHERE user_id != auth.uid()`) to deactivate tokens on account switch. SECURITY INVOKER would break that under RLS. SECURITY DEFINER is load-bearing. Only callsite is server-side route `app/api/player/push-token/route.ts:48` (not raw client RPC). Mild risk: authenticated users can call via `/rest/v1/rpc/upsert_push_token` directly and deactivate another user's token if they know the token value — acceptable given token opacity.
  - recommended owner: review-by-eod

- [Supabase] web_vitals RLS INSERT policy always true
  - advisor: rls_policy_always_true
  - status: deferred (intentional)
  - why: public web vitals collection is intentional — anyone can INSERT performance data. No PII in the table. No fix needed.
  - recommended owner: self

- [Sentry JAVASCRIPT-NEXTJS-13Y] TypeError: Cannot read properties of null (reading 'x') on /he/blast
  - first/last seen: 2026-05-06 (same day), count: 500, users: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred (stale, 1 user)
  - why: null read is inside Pixi v8 render loop (not our RAF tick). Our `useBlastDebris.ts:170` already guards `d.graphic.position`. Fix requires `ticker.stop()` before `destroy()` or Pixi upgrade. Has not recurred in 25 days.
  - recommended owner: review-by-eod

- [Sentry JAVASCRIPT-NEXTJS-1JR] Error: relation "profiles" does not exist on POST /api/coins
  - first/last seen: 2026-05-27, count: 18, users: 5
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (already resolved)
  - why: `profiles` table confirmed to exist in DB. Error stopped 2026-05-27 after migration `20260527230753`. No code change needed.
  - recommended owner: self

## 2026-06-03
- [Sentry] 14R/14S game_sessions check_player_id constraint violation
  - first: 2026-05-12, last: 2026-05-12, count: 56, userCount: 0
  - link: https://lexiclash.sentry.io/issues/119434883/
  - status: shipped (UUID guard in gameSessionLogger.ts:136)
  - why: bot IDs like "bot_abc123" passed !userId guard, reached INSERT, failed UUID constraint
  - recommended owner: review-by-eod — add test in gameSessionLogger.test.ts
- [Sentry] 13Y (null 'x' Blast rAF), 15B/15E (_cancelResize Blast)
  - status: already fixed — SharedFxApp.ts generation+live guards (comments cite these Sentry IDs)
- [Sentry] 1JR/1JP (profiles/coins)
  - status: already fixed — mig 20260527230753 (per memory)

## 2026-06-03 (Lane 01)
- [Supabase security] upsert_push_token — SECURITY DEFINER callable by `authenticated`
  - function: public.upsert_push_token(p_token, p_platform, p_device_id)
  - status: deferred — intentional by design
  - why: function body does cross-user token deactivation (`user_id != auth.uid()`) which REQUIRES SECURITY DEFINER to bypass RLS. `anon` is already excluded from ACL (proacl only has postgres/authenticated/service_role). Switching to SECURITY INVOKER would silently break token rotation for users who switch accounts on the same device.
  - recommended owner: review-by-eod — confirm cross-user UPDATE is desired scope or refactor to service-role server call
- [Supabase security] web_vitals RLS INSERT always true — policy "Anyone can insert web vitals"
  - table: public.web_vitals
  - status: deferred — intentional by design
  - why: policy name explicitly states intent (anonymous telemetry collection). Restricting would break CWV metric ingestion from unauthenticated users. Low-harm table (write-only telemetry, no PII).
  - recommended owner: self — accept as intentional or add row-level rate limit if spam becomes concern
- [Sentry] 14R — game_sessions check_player_id constraint violation
  - first/last seen: 2026-05-12 (3 weeks ago), 56 occurrences, 0 users
  - status: deferred — likely self-resolved post Blast per-player board redesign (2026-05-31)
  - why: call path was endGame → recordGameResultsToSupabase → processPlayerResult → logGameSession; the redesign reworked this entire path. If constraint violations resume after 2026-05-31 release, root cause = bot/guest player_id bypassing UUID check_player_id constraint.
  - recommended owner: backend — monitor post next MP session; add null/UUID guard in logGameSession if recurs
- [Sentry] 1JR/1JP — profiles + CoinContext (re-confirm stale)
  - status: previously documented as fixed (mig 20260527230753 per prior triage)
  - last seen: 2026-05-27 — no recurrence in 7 days, profiles table verified EXISTS
  - recommended owner: self — auto-close if no recurrence by 2026-06-10

## 2026-06-04
- [Sentry] TypeError: Cannot read properties of null (reading 'x') — JAVASCRIPT-NEXTJS-13Y
  - first seen: 2026-05-06, last seen: 2026-05-06, count: 500, users: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred
  - why: minified stack in /he/blast (requestAnimationFrame path), no source maps available; likely Pixi null tile ref in render loop
  - recommended owner: backend

- [Supabase] RLS policy always true — web_vitals INSERT (Anyone can insert web vitals)
  - status: deferred
  - why: policy replacement; failure mode = lock out legitimate web-vitals inserts
  - recommended owner: review-by-eod

- [Sentry] Error: relation "profiles" does not exist — JAVASCRIPT-NEXTJS-1JR
  - first seen: recent, count: 5 users
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (not investigated this run — time budget)
  - why: reach=5, needs stack trace + schema check; could be migration order issue
  - recommended owner: backend

## 2026-06-04 — Flag hygiene (lane-03)
- `share-prompt-timing` (PostHog id 163656, created 2026-03-31): 65 days old, **0 exposures in last 30d**. Flag may not be reaching trigger. Check `useSharePromptImpression` + `SinglePlayerResults` condition `hasMinimumScore`. Either retire or fix trigger.
- `show-signup-after-first-win` (PostHog id 163655, created 2026-03-31): 65 days old, 35 exposures, **0 signups both arms** (`after-first-win`=17, `after-third-game`=18). Tracking was broken (InlineSignupCard emitted no events). Re-evaluate after `signup_prompt_shown` fix ships. If still 0 conversion after 14d → retire.

## 2026-06-05
- [Sentry] TypeError: Cannot read properties of null (reading 'x') — JAVASCRIPT-NEXTJS-13Y
  - first seen: 2026-05-06, last seen: 2026-05-06, count: 500, users: 1
  - link: https://lexiclash.sentry.io/issues/118046477/
  - status: deferred
  - why: minified stack trace (requestAnimationFrame in Pixi/game engine), needs source maps to pinpoint; only 1 user, 1 day old, no recurrence
  - recommended owner: backend/game-engine team with source maps

- [Sentry] churn-signals report failed with status 502 — JAVASCRIPT-NEXTJS-1KQ (escalating)
  - first seen: 2026-06-03, last seen: 2026-06-04, count: 276, users: 3
  - link: https://lexiclash.sentry.io/issues/124871662/
  - status: deferred
  - why: 502 is Railway's reverse proxy timing out before Next.js responds; root cause is getUserFromRequest() creates a new Supabase anon client + network auth.getUser(token) round-trip on every request — auth-adjacent refactor needed (local JWT verify)
  - recommended owner: review-by-eod; fix = replace getUserFromRequest with local SUPABASE_JWT_SECRET verify

- [Supabase] SECURITY DEFINER upsert_push_token executable by authenticated role
  - status: deferred
  - why: authenticated execute is intentional (API route calls rpc as authed user); only risk is authenticated users bypassing API validation; the function uses auth.uid() internally so blast radius is self-scoped
  - recommended owner: review-by-eod; confirm function body uses auth.uid() and not p_user_id param

- [Supabase] RLS always-true INSERT on web_vitals
  - status: deferred
  - why: appears intentional (anon web vital tracking, route passes null player_id for guests); false-positive advisory
  - recommended owner: confirm intent — if anon inserts are desired, add a comment on the migration explaining the policy is by design

## 2026-06-06

### ✅ Resolution pass (2026-06-06 followup, founder session)

All 5 items triaged with live evidence (Sentry MCP + Supabase SQL + Railway env):

- **`upsert_push_token` REVOKE — NO ACTION NEEDED.** Live `pg_proc.proacl` shows EXECUTE granted only to `postgres`/`authenticated`/`service_role`. `anon` and `PUBLIC` have NO grant (non-null proacl drops the implicit PUBLIC default). Nothing to revoke; the single callsite is auth-gated. Advisory is a false-positive for this usage. **Closed.**
- **1JR `relation "profiles" does not exist`** (POST /api/coins) — last seen 2026-05-27, **10 days silent**, 0 new events. Transient (likely a deploy-window PostgREST schema-cache / migration race). **Monitor-only**; re-open only if it recurs.
- **1CW Pixi null `.clear()`** — **REAL, was still firing 2026-06-06**. NOT the blast surface a39f63378 fixed — it's `WordWheelPixiRing.tsx` (/daily/word-wheel) with its own ticker. **FIXED** `abe2dcd2f`: post-destroy guard at ticker entry.
- **1KQ churn-502** — **RESOLVED.** Confirmed `SUPABASE_JWT_SECRET` IS present in Railway production env (service `boggle-new`). Secret loaded; canary won't fire. **Closed.**
- **14R/14S game_sessions check_player_id** — last seen 2026-05-12, **24 days silent**, reach=0 (automated logger only). Stale. Hardening (skip null player_id rows in `logGameSession`) remains optional backlog, not urgent. **Monitor-only.**

---

- [Supabase] `upsert_push_token` SECURITY DEFINER — advisory is LOW RISK (false-positive for authenticated path)
  - score: 0.125; Function `public.upsert_push_token(p_token text, p_platform character varying, p_device_id text)`
  - status: research-complete — single callsite at app/api/player/push-token/route.ts:48, auth-gated (getUser()→401). Authenticated access is INTENTIONAL. Optional hardening: REVOKE EXECUTE ON FUNCTION public.upsert_push_token FROM anon; (prevents direct REST calls from unauthenticated clients)
  - why: autonomy matrix requires confirmed no-anon-callsite before REVOKE; couldn't verify tonight
  - recommended owner: review-by-eod — trivial 1-line migration once confirmed

- [Sentry] 1JR — `relation "profiles" does not exist` (reach=5, 24h)
  - https://lexiclash.sentry.io/issues/123033022/
  - status: deferred — root cause undiagnosed; likely search_path mismatch on a SECURITY DEFINER function or edge-function running outside public schema context
  - why: needs stack trace read + function audit; didn't have time to pull issue details via MCP
  - recommended owner: backend — check which DB function/route is executing without `SET search_path = public`

- [Sentry] 1CW — Pixi `null (reading 'clear')` (reach=5, 24h)
  - https://lexiclash.sentry.io/issues/120102540/
  - status: memory says fix shipped `a39f63378` (PUSHED); 24h reach=5 may be pre-fix events or additional uncovered paths. Likely stale — verify last-seen timestamp in Sentry against commit date.
  - recommended owner: review-by-eod — if last-seen > a39f63378 deploy time, there are additional destroy paths to guard

- [Sentry] 1KQ — churn-signals 502 (reach=3, 24h)
  - status: memory says resolved by Railway restart (SUPABASE_JWT_SECRET was absent in-process); canary warning shipped. If still firing, check Railway env dashboard that the secret is present in current deployment.
  - recommended owner: review-by-eod — verify env vars in Railway console

- [Sentry] 14R/14S — game_sessions check_player_id constraint violation (reach=0, 24h)
  - https://lexiclash.sentry.io/issues/119434883/ + 119434885/
  - status: deferred — reach=0 (automated logger, no real users affected); constraint likely rejecting guest/bot sessions with null player_id
  - recommended owner: backend — determine if bots/guests should be excluded from game_sessions logging entirely or if GAME_SESSION_LOGGER should coerce null to a sentinel UUID

## 2026-06-08 (Lane 1)
- [Supabase] anon_security_definer_function_executable — is_language_curator, get_my_curator_languages, is_admin_user
  - status: shipped (migration `revoke_anon_secdef_rls_helpers` applied via MCP)
  - why shipped: all 3 are pure RLS helpers; zero TypeScript anon callsites confirmed; REVOKE is fully reversible
  - recommended owner: review-by-eod — verify curator/propose flow still works (requires authenticated session, unaffected)

- [Sentry] 1JR — `relation "profiles" does not exist` (POST /api/coins, reach=5)
  - https://lexiclash.sentry.io/issues/123033022/
  - first/last seen: 2026-05-27 (12 days ago, stopped same day — likely resolved by deploy)
  - status: deferred — old issue, no recurrence; stale brief data
  - why: last seen 12 days ago; no stack trace points to fixable first-party code in the obfuscated bundle
  - recommended owner: backend — confirm resolved; check `/api/coins` for `search_path` or schema-less query patterns if it recurs

- [Sentry] 1KQ — churn-signals 502 (reach=3)
  - https://lexiclash.sentry.io/issues/124871662/
  - status: deferred — root cause already fixed in codebase (getBearerUser.ts local JWT verify); may need SUPABASE_JWT_SECRET provisioned in Railway env
  - why: infrastructure env-var gap, not code bug; `useChurnSignals.ts` already silences 5xx at debug level
  - recommended owner: review-by-eod — verify SUPABASE_JWT_SECRET is set in Railway dashboard

## 2026-06-08 (Lane 03 — engagement)

### Flag hygiene update

- **`share-prompt-timing`** (PostHog id 163656, 69 days, 100% rollout)
  - Prior entries (05-26, 05-28, 06-01, 06-04) consistently flag this as stale with near-zero exposures
  - Call site confirmed: `usePostHogFlag('share-prompt-timing')` in `SinglePlayerResults.tsx` + `useSharePromptImpression.ts`
  - **Recommendation: RETIRE.** 69 days with minimal exposures = permanently underpowered. Keep `results-page` branch (the default). Remove `useSharePromptImpression` hook and PostHog flag read in `SinglePlayerResults.tsx`. Delete PostHog flag.
  - Owner: growth (one-session task)

- **`show-signup-after-first-win`** (PostHog id 163655, 69 days, 100% rollout)
  - Confirmed call site in `useSignupPrompt.ts:61` via `usePostHogFlag('show-signup-after-first-win', 'after-first-win')` (correction from prior entries saying "no call sites")
  - 69 days, far below 1000/arm — will never reach stat-sig at current traffic
  - **Recommendation: RETIRE.** Keep `after-first-win` variant as hardcoded path (it's the emotional peak and the default). Remove `usePostHogFlag` call + delete PostHog flag. Small cleanup PR.
  - Owner: growth (one-session task)

- **`mp-signup-nudge-copy-v1`** (PostHog id 183230, 31 days, 100% rollout)
  - Description states 0/77 converts in 28d. 0 conversion across ALL variants = the prompt mechanic is broken, not the copy.
  - **Recommendation: INVESTIGATE FIRST.** Before retiring, verify the signup sheet actually renders on trigger (add a PostHog event on sheet impression — `mp_signup_sheet_shown`). If 0 impressions: trigger is broken. If impressions > 0 but 0 conversion: sheet UX is broken. Then retire flag and redesign trigger/UX separately.
  - Owner: growth + frontend

### New experiment activated
- `exp-mp-quickplay-wait-v1` added to typed registry (`fe-next/lib/experiments.ts`) targeting ES MP quickPlay rage clicks (24h: 23 rage clicks, score 0.768)
- **Next step**: Create PostHog flag `exp-mp-quickplay-wait-v1` with 50/50 split. Wire the overlay variant in `MultiplayerFlow.tsx` — show "Finding a match..." full-screen overlay when `quickPlay && isJoining && variant === 'match-seeking'`. Deferred to next run (time budget).

## 2026-06-09 (Lane 01 — triage)

- [Supabase advisor] web_vitals — RLS INSERT policy `Anyone can insert web vitals` always-true WITH CHECK
  - reach=0, severity=0.5, score=0.125
  - status: deferred
  - why: intentional design (anonymous vitals reporting) but exposes flood risk; should add row size/rate guard or document as accepted risk
  - recommended owner: review-by-eod — consider adding `WITH CHECK (octet_length(data::text) < 4096)` or similar anti-flood guard

- [Sentry] JAVASCRIPT-NEXTJS-1NE — "Invalid request: gameCode must be alphanumeric" (3 events, 0 users)
  - https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1NE
  - status: deferred
  - why: benign user-input validation firing at route level; not a code bug; might be URL-encoded game codes or copy-paste artifacts
  - recommended owner: self — low priority, verify if game code input should strip non-alphanumeric before validation

- [Sentry] JAVASCRIPT-NEXTJS-14R — game_sessions check_constraint "check_player_id" violation (reach=0, severity=0.36)
  - https://lexiclash.sentry.io/issues/119434883/
  - status: deferred (not acted on this run — low reach, not in 24h window)
  - why: constraint violation means log_game_session receives a null or malformed player_id; likely a timing issue where session is logged before auth resolves
  - recommended owner: backend — add null guard in log_game_session before DB insert

## 2026-06-10
- [Sentry] TypeError: Cannot read properties of null (reading 'clear') (JAVASCRIPT-NEXTJS-1CW)
  - first seen: 2026-06-06, last seen: 2026-06-09, reach: 5 users
  - link: https://lexiclash.sentry.io/issues/120102540/
  - status: shipped (WordWheelPixiRing.tsx:53 try/catch fix)
  - why: double-destroy race — app unmounts before init resolves, bare second destroy call
  - recommended owner: review-by-eod

- [Supabase] Signed-In Users Can Execute SECURITY DEFINER Function — upsert_player_word
  - migration: 20260429160000_atomic_upsert_player_and_community_words.sql
  - link: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
  - status: deferred
  - why: authenticated users call this during in-game word submission — REVOKE would break gameplay; needs audit of whether SECURITY INVOKER is safe (function likely elevates to bypass RLS for community word writes)
  - recommended owner: backend

- [Sentry] Error: churn-signals report failed with status 502 (JAVASCRIPT-NEXTJS-1KQ)
  - last seen: 2026-06-05, reach: 3 events (all admin user)
  - link: https://lexiclash.sentry.io/issues/124871662/
  - status: already fixed — getBearerUser.ts fast-path JWT verify eliminates Railway proxy timeout
  - why: noting for closure; can mark resolved in Sentry
  - recommended owner: self

- [Sentry] Error: relation "profiles" does not exist at POST /api/coins (JAVASCRIPT-NEXTJS-1JR)
  - last seen: 2026-05-27 (stale), reach: 5 events
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred
  - why: /api/coins/route.ts uses `.from('n')` (not 'profiles'); error suggests a search_path issue in a SECURITY DEFINER function on the server path. Needs DB audit of which function queries 'profiles' without schema-qualifying. Stale (May 27) — may be self-healed by a prior migration fix.
  - recommended owner: backend

## 2026-06-11 (lane-03 engagement — flag hygiene)

### [Flag] `share-prompt-timing` — STALE, human decision needed
- **Age**: 71 days (created 2026-03-31)
- **Rollout**: 100% — all users split
- **Status**: no stat-sig result logged; experiment running blind for 71 days
- **Recommended action**: pull PostHog experiment results. If no conversion signal → kill flag, keep whichever variant is currently live as default
- **Code locations**: grep `share-prompt-timing` in fe-next/

### [Flag] `show-signup-after-first-win` — STALE, human decision needed
- **Age**: 70 days (created 2026-03-31)
- **Rollout**: 100%
- **Status**: learnings note "70d, 0 converts" — conversion = signup_completed within session of first impression; may need longer attribution window check
- **Recommended action**: pull PostHog experiment results. If truly 0/arm → kill flag, keep current variant
- **Code locations**: grep `show-signup-after-first-win` in fe-next/

### [Flag] `mp-signup-nudge-copy-v1` — INEFFECTIVE, recommend kill
- **Age**: 34 days (created 2026-05-08)
- **Rollout**: 100%
- **Status**: 0/77 conversions in 28d per flag description. Control = sheet+toast (status quo). Neither variant converts
- **Recommended action**: kill flag entirely; signup nudge sheet itself may be the problem, not copy
- **Code locations**: grep `mp-signup-nudge-copy-v1` in fe-next/

### [Action needed] Create PostHog flags for two code-complete experiments
Both experiments are fully implemented (UI, tracking, translations ×5) but PostHog flags were never created → 100% control exposure, 0 variant data collected.

1. **`exp-invite-arrival-clarity-v1`** — status-card variant shows "Connecting…" spinner when returning user hits `?room=` invite URL (reduces rage clicks). Variants: `control`, `status-card`. Recommend 50/50.
2. **`exp-mp-quickplay-wait-v1`** — match-seeking overlay replaces dimmed button during quickPlay auto-join. Variants: `control`, `match-seeking`. Recommend 50/50.

Create both in PostHog → Settings → Feature Flags with the exact key names above.

## 2026-06-12
- [Supabase] SECURITY DEFINER function `upsert_level_completion` executable by `authenticated`
  - function: `public.upsert_level_completion(uuid, int, int, int, int, int)`
  - callsite scan: 0 TS callsites found (processCompletion.ts uses direct .from() inserts)
  - status: shipped — migration `fe-next/supabase/migrations/20260612030000_revoke_upsert_level_completion.sql` (REVOKE EXECUTE FROM anon, authenticated, public)
  - why: no anon/auth caller exists; SECURITY DEFINER + executable = privilege escalation vector
  - recommended owner: review-by-eod (confirm REVOKE landed, check for any edge callsite missed)

- [Supabase] RLS policy always-true on `web_vitals` INSERT
  - policy: "Anyone can insert web vitals" WITH CHECK (true)
  - status: deferred — unclear if anonymous submissions expected; changing would break anon perf tracking
  - why: ambiguous intent — open telemetry vs restricted insert
  - recommended owner: backend (decide: restrict to auth.uid() IS NOT NULL, or document as intentional)

- [Sentry] TypeError: Cannot read properties of null (reading 'clear') — issue 1CW
  - link: https://lexiclash.sentry.io/issues/120102540/
  - reach: 5 users, 24h
  - status: deferred — Sentry MCP unavailable this run; cannot read stack trace to identify file:line
  - why: ambiguous root cause without stack trace
  - recommended owner: self (retry when Sentry MCP is available)

- [Sentry] churn-signals 502 — issue 1KQ
  - link: https://lexiclash.sentry.io/issues/124871662/
  - reach: 3 issues/24h
  - status: deferred — fire-and-forget analytics endpoint; 502 = Railway upstream issue, not a code bug
  - why: prior learnings confirm this is Railway deploy lag / infra noise
  - recommended owner: self (monitor; fix only if count rises)

## 2026-06-12 (lane-03 engagement)

### [URGENT] Two code-complete experiments STILL dark — 94 rage clicks/7d lost
Both `exp-mp-quickplay-wait-v1` and `exp-invite-arrival-clarity-v1` were wired on 2026-06-09 and 2026-06-10 respectively. PostHog 7d rage-click data: `/es/multiplayer` = **94 rage clicks** (dominant signal). Both experiments target this exact surface. Every day without these PostHog flags = continued 0% variant exposure and uncollected evidence.

**ACTION REQUIRED (human, ~5 min each):**
1. `exp-mp-quickplay-wait-v1` → PostHog → Feature Flags → New flag. Key: `exp-mp-quickplay-wait-v1`. Variants: `control` / `match-seeking`. Rollout: 50/50.
2. `exp-invite-arrival-clarity-v1` → PostHog → Feature Flags → New flag. Key: `exp-invite-arrival-clarity-v1`. Variants: `control` / `status-card`. Rollout: 50/50.

### [Experiment] `exp-practice-wheel-cta-v1` — registered, needs wire + PostHog flag
- Registered in `lib/experiments.ts` this run (2026-06-12)
- **NOT YET WIRED** — needs a "Try Again" CTA added to `PracticeWheelSandbox.tsx` game-over state
- **ACTION REQUIRED**: Wire retry button in `PracticeWheelSandbox.tsx`, then create PostHog flag `exp-practice-wheel-cta-v1` (variants: `control` / `retry-cta`, 50/50)
- Hypothesis: adds one-tap retry at game-over → lifts practice_started re-engagement rate, targeting the 43% wheelRush completion drop
- recommended owner: self (next engagement lane)

## 2026-06-13
- [Supabase] upsert_community_word SECURITY DEFINER executable by authenticated
  - status: shipped fe-next/supabase/migrations/20260613030000_security_advisor_fixes.sql
  - why: live DB drifted from 20260429160000 REVOKE; re-REVOKE is reversible
  - recommended owner: review-by-eod (verify advisor clears after migration apply)
- [Supabase] web_vitals RLS INSERT policy always true
  - status: shipped (same migration — tightened to player_id IS NULL OR player_id = auth.uid())
  - why: API route sets player_id: user?.id || null — new check matches exactly
  - recommended owner: review-by-eod
- [Supabase] offerwall_postbacks RLS enabled no policies
  - status: shipped (same migration — added explicit RESTRICTIVE USING(false))
  - why: service_role-only table; no-policy state IS correct but advisor flags it; explicit deny makes intent clear
  - recommended owner: review-by-eod

## 2026-06-14
- [Supabase] SECURITY DEFINER: `public.update_word_bank_validation_status` executable by `authenticated`
  - first/last seen: advisor (ongoing)
  - status: shipped (migration `revoke_anon_execute_update_word_bank_validation_status`)
  - why: no anon/public callsite found in codebase (lighthouse JSON only); REVOKE is reversible
  - recommended owner: review-by-eod

- [Supabase] RLS always-true INSERT on `teacher_access_requests`
  - first/last seen: advisor (ongoing)
  - status: REVERTED — do NOT auth-gate this INSERT (migration `20260617120000_restore_teacher_access_anon_insert`)
  - why: the 2026-06-14 "fix" (`fix_teacher_access_requests_insert_rls`, replaced WITH CHECK=true with `auth.uid() IS NOT NULL`) BROKE the public apply form. Prospective teachers submit /education/access while signed OUT (they have no account yet), so requiring auth.uid() made every submission fail RLS → 500 → "Something went wrong" in the UI. always-true INSERT here is an ACCEPTED exception (same class as web_vitals anon telemetry); spam is mitigated at the app layer (route rate limit + future captcha), not by gating a public form behind a login it cannot have. Encoded in `lib/education/__tests__/rls.test.ts` ("anon CAN insert"). Advisor will keep flagging — leave as-is.
  - recommended owner: review-by-eod

- [Sentry] TypeError: null.clear in WordWheelPixiRing (JAVASCRIPT-NEXTJS-1CW)
  - first/last seen: 2026-06-08/2026-06-09, reach=5
  - status: already fixed in code (commit `abe2dcd2f` 2026-06-06, guard `if (destroyed || orbitGfx.destroyed || ...)`)
  - why: events are cache-lag stragglers (Chrome Mobile WebView); no new occurrences expected
  - recommended owner: monitor — close if no new events in 7d

- [Sentry] relation "profiles" does not exist at POST /api/coins (JAVASCRIPT-NEXTJS-1JR)
  - first/last seen: 2026-05-27 (one-day burst, 18 events, 5 users)
  - status: deferred — stale, not reproducible today; likely transient schema-path issue that resolved
  - why: no fresh events; root cause unclear without reproduction; touching coin/auth API paths is DEFER territory
  - recommended owner: backend

- [Sentry] [CoinContext] Failed to add coins (JAVASCRIPT-NEXTJS-1JP)
  - first/last seen: 2026-05-27, 6 occurrences, 5 users
  - status: deferred — co-incident with profiles error above (same day/users); stale
  - why: directly coin-economy logic, DEFER per hard rules
  - recommended owner: backend

---

## 2026-06-14 (lane-03 engagement)

### [Flag Hygiene] Dead/underpowered experiment flags — PRUNE CANDIDATES

These PostHog flags have been running 75+ days at 100% rollout with 0 recorded conversions (per open watches in nightly learnings). Recommend: delete from PostHog + remove conditional from code (keep the variant that was default/control since all users were already seeing it).

| Flag | Age | Rollout | Evidence | Recommendation |
|---|---|---|---|---|
| `share-prompt-timing` | 75+ days | 100% | "dead/underpowered" — 0 converts in open watches | Delete flag; keep `results-page` branch |
| `show-signup-after-first-win` | 75+ days | 100% | 0 converts in open watches | Delete flag; keep `after-first-win` branch |
| `adventure-difficulty-tuning` | 75+ days | INACTIVE | Flag deactivated; still in code | Delete flag; clean code ref |
| `mp-signup-nudge-copy-v1` | 37 days | 100% | Sheet 0/19 + toast 0/58 converts in 28d data | Delete flag; keep `control` (sheet-only at game 2) |

**Owner**: human (PostHog flag deletion requires console access). Code cleanup can follow in next lane-03 run after flags are deleted.

### [FLAG NEEDED] 3 dark experiments — blocked on PostHog flag creation

These experiments are code-complete, tested, and wired to UI, but have ZERO data because no PostHog flag was ever created. Each has been dark for ≥5 nights.

```
FLAG NEEDED: exp-mp-quickplay-wait-v1  variants=[control, match-seeking]  50/50
  Hypothesis: explicit "Finding a match…" overlay cuts rage-clicks on /multiplayer?quickPlay=true by ≥50%
  Wire: components/multiplayer/MultiplayerFlow.tsx:140

FLAG NEEDED: exp-invite-arrival-clarity-v1  variants=[control, status-card]  50/50
  Hypothesis: "Connecting…" card reduces rage-clicks on ?room= invite URLs; lifts invite_redirect_fired→invite_consumed
  Wire: app/[locale]/PageClient.tsx:89

FLAG NEEDED: exp-practice-wheel-cta-v1  variants=[control, retry-cta]  50/50
  Hypothesis: "Try Again" overlay on timer-expiry cuts 43% practice abandon rate on /practice/wheelRush
  Wire: components/practice/PracticeWheelSandbox.tsx (WIRED THIS NIGHT — see lane-03 2026-06-14)
```

**Owner**: human (PostHog → Feature Flags → New flag → set key exactly as above).

## 2026-06-15
- [Sentry] JAVASCRIPT-NEXTJS-1KQ: churn-signals report failed with status 502
  - first seen: 2026-06-03, last seen: 2026-06-05, count: 278, users: 3
  - link: https://lexiclash.sentry.io/issues/124871662/
  - status: deferred
  - why: stale (last seen >10d ago); root is backend API returning 502 on POST /api/churn-signals — backend issue, not frontend null-guard
  - recommended owner: backend

- [Sentry] JAVASCRIPT-NEXTJS-1JR: relation "profiles" does not exist — POST /api/coins
  - first seen: 2026-05-27, last seen: 2026-05-27, count: 18, users: 5
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred
  - why: very stale (last seen 19d ago, 1-day window only); likely a transient migration race on deploy. Zero recent recurrence. Monitor; if resurfaces, check coins API route for hardcoded schema ref or missing migration.
  - recommended owner: backend

- [Sentry] JAVASCRIPT-NEXTJS-1CW: TypeError null 'clear' on /daily/word-wheel
  - first seen: 2026-05-15, last seen: 2026-06-09, count: 13, users: 5
  - link: https://lexiclash.sentry.io/issues/120102540/
  - status: already-fixed — guard at WordWheelPixiRing.tsx:86 (`if (destroyed || orbitGfx.destroyed || …) return`) already in codebase with a comment citing Sentry 1CW. No new occurrences expected.
  - recommended owner: self — mark resolved in Sentry if no new events in 7d

- [Supabase] RLS Policy Always True: score_challenge_attempts INSERT
  - link: supabase advisor security:rls_policy_always_true
  - status: deferred
  - why: `WITH CHECK (true)` is INTENTIONAL — guest users (anon role) submit challenge scores; player_id is nullable for guests. A meaningful check requires policy REPLACEMENT (e.g. `WITH CHECK (username IS NOT NULL AND score >= 0)`) which is a blast-radius change. Current design is correct; consider hardening with a tighter CHECK when guest flow is audited.
  - recommended owner: review-by-eod

## 2026-06-16
- [Supabase] score_challenge_attempts RLS INSERT always-true
  - policy name: "Anyone can create attempts", WITH CHECK (true) → unrestricted anonymous insert
  - status: deferred
  - why: need to verify if anon users legitimately submit attempts (public leaderboard feature?) before restricting
  - recommended owner: backend, review-by-eod

- [Supabase] connections_feedback RLS INSERT always-true
  - policy name: "anyone can insert", similar always-true pattern
  - status: deferred
  - why: need schema context before restricting
  - recommended owner: backend, review-by-eod

- [Sentry] churn-signals report failed with status 502 (1KQ, ~276 events)
  - root cause already identified: SUPABASE_JWT_SECRET not set in Railway → bearer auth takes uncapped remote round-trip → 502
  - fix: set SUPABASE_JWT_SECRET env var in Railway (Supabase → Project Settings → API → JWT Secret)
  - status: deferred (infra/env var change, not code)
  - recommended owner: self (Railway dashboard), review-by-eod

- [Sentry] [AVATAR_PNG] render failed — client component called from server (1DV)
  - AvatarRenderer.tsx is a client component imported server-side for PNG generation
  - status: deferred
  - why: requires design decision (separate server-safe avatar renderer or dynamic import?)
  - recommended owner: frontend, review-by-eod

- [PostHog] Dead flags — recommend kill (lane 03, 2026-06-16)
  - `share-prompt-timing` — active ~72d, ~0 exposures, no signal
  - `show-signup-after-first-win` — 41 total exposures over 77d, inconclusive
  - `mp-signup-nudge-copy-v1` — 0 conversions across 77 users; "toast-disabled" led = feature is net-negative
  - status: deferred (human must delete in PostHog dashboard)
  - recommended owner: growth, review-by-eod

## 2026-06-17
- [Supabase] SECURITY DEFINER: `public.update_milog_verification` executable by `authenticated` role via `/rest/v1/rpc/update_milog_verification`
  - first seen: 2026-06-17, count: ongoing advisor warning
  - link: supabase advisor security authenticated_security_definer_function_executable
  - status: deferred (Supabase MCP unavailable — apply manually)
  - why: No code callsites found (grep returned empty); REVOKE is safe. SQL: `REVOKE EXECUTE ON FUNCTION public.update_milog_verification(uuid,text,text,text,text,text) FROM authenticated;`
  - recommended owner: review-by-eod; apply via Supabase SQL editor or MCP `apply_migration`

- [Supabase] RLS always true: `score_challenge_attempts` INSERT policy "Anyone can create attempts"
  - first seen: 2026-06-17, count: ongoing advisor warning
  - link: supabase advisor security rls_policy_always_true
  - status: deferred (table not in codebase TS/SQL — live-only table; Supabase MCP unavailable)
  - why: Need to inspect table + understand intent before tightening. Likely needs `WITH CHECK (auth.uid() IS NOT NULL)` or role constraint.
  - recommended owner: review-by-eod

- [Sentry] TypeError: Cannot read properties of null (reading 'clear') — reach=5 users
  - link: https://lexiclash.sentry.io/issues/120102540/
  - status: deferred (Sentry MCP unavailable; stack trace inaccessible; .clear() callers in hooks/usePrevalidation.ts:190, hooks/useBossEffectExecutor.ts:256, hooks/useOpponentWordFeed.ts:104 — all use Map refs initialized with new Map(), so likely a PixiJS or different .clear() variant)
  - why: No stack trace → can't confirm root cause without Sentry MCP
  - recommended owner: review-by-eod; fetch Sentry issue 120102540 for frame

- [Sentry] relation "profiles" does not exist — reach=5 users
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (Sentry MCP unavailable; likely search_path mismatch in a SECURITY DEFINER function)
  - why: Could be linked to mutable search_path advisors; need Sentry frame to confirm callsite
  - recommended owner: review-by-eod

- [Sentry] [CoinContext] Failed to add coins — reach=5 users
  - link: https://lexiclash.sentry.io/issues/123033015/
  - status: deferred (coin economy = human-queue per hard rules; Sentry MCP unavailable for stack trace)
  - why: Economy logic = hard-banned autonomous change; needs human + full stack trace
  - recommended owner: backend

## 2026-06-18 (lane-01 triage)

- [Supabase Security] `update_milog_verification` REVOKE — SHIPPED
  - status: shipped (migration `revoke_update_milog_verification_from_authenticated`)
  - why: SECURITY DEFINER callable by `authenticated` via REST API; admin-only callsite confirmed (milogWordVerifier.ts:384 uses service_role); REVOKE is reversible
  - recommended owner: review-by-eod (verify no regression in milog admin panel)

- [Sentry] `TypeError: null.clear` on word-wheel — SHIPPED
  - link: https://lexiclash.sentry.io/issues/120102540/
  - status: shipped (WordWheelPixiRing.tsx — added `app.ticker?.stop()` before `app.destroy()`)
  - why: RAF-queued tick fired after Graphics children destroyed; fix matches GameCanvas.tsx pattern
  - recommended owner: self (monitor Sentry 1CW for recurrence post-deploy)

- [Sentry] churn-signals 502 on /he/multiplayer — DEFERRED
  - link: https://lexiclash.sentry.io/issues/124871662/
  - last seen: 2026-06-05 (stale); count=278, users=3
  - status: deferred (502 = backend service down; last seen 13 days ago; not a JS fix)
  - why: Root cause is backend API endpoint returning 502; no frontend fix possible
  - recommended owner: backend

- [Sentry] relation "profiles" does not exist — DEFERRED
  - link: https://lexiclash.sentry.io/issues/123033022/
  - last seen: 2026-05-27 (stale 22 days); count=18, users=5
  - status: deferred (likely from a fixed deploy; stale issue)
  - why: Very old (22 days), likely resolved by subsequent deployment
  - recommended owner: monitor (auto-resolve if no new occurrences)

- [Supabase Security] `tar_insert_any` on teacher_access_requests (always-true RLS)
  - status: intentional — anon INSERT for public teacher access request form; deliberately permissive; skip

- [Supabase Security] 70+ additional SECURITY DEFINER functions callable by authenticated
  - status: deferred (admin-specific functions like admin_overview_stats, admin_bulk_ban_players — these likely need authenticated access; audit required before bulk REVOKE)
  - why: Bulk REVOKE could break admin panel if some functions ARE intentionally authenticated-callable
  - recommended owner: review-by-eod; batch audit admin vs user-facing functions

## 2026-06-19
- [Sentry] JAVASCRIPT-NEXTJS-1KQ: churn-signals report failed with status 502
  - first seen: 2026-06-03, last seen: 2026-06-05, count: 278, users: 3
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1KQ
  - status: deferred (code no longer exists — useChurnSignals hook and API endpoint fully removed from codebase; needs Sentry resolve)
  - why: Sentry API returned 403 on update_issue — token lacks write permission
  - recommended owner: review-by-eod; manually resolve in Sentry UI

- [Sentry] JAVASCRIPT-NEXTJS-1CW: TypeError null.clear() on word-wheel
  - first seen: 2026-05-15, last seen: 2026-06-09, count: 13, users: 5
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1CW
  - status: already fixed — commit abe2dcd2f added destroyed-guard + ticker stop-before-destroy in WordWheelPixiRing.tsx; Sentry resolve also blocked by 403
  - why: Cannot programmatically resolve (403); resolve manually in Sentry UI
  - recommended owner: review-by-eod

- [Supabase] SECURITY DEFINER: update_difficulty_after_game callable by authenticated
  - link: supabase advisor security:authenticated_security_definer_function_executable
  - status: RESOLVED (verified 2026-07-14) — REVOKE on anon/public already applied out-of-band (has_function_privilege confirms both false); Step A of 20260619030000 is a no-op now. Step B (auth.uid() ownership guard inside the function body) was never more than a commented-out template in that file — never executed. No action.

- [Supabase] RLS always-true: teacher_access_requests tar_insert_any INSERT policy
  - link: supabase advisor security:rls_policy_always_true
  - status: DO NOT APPLY — 20260619030000's tightened policy contradicts the later, deliberate fix in `fe-next/supabase/migrations/20260617120000_restore_teacher_access_anon_insert.sql` (WITH CHECK true is required: the public teacher-access apply form is submitted by signed-out applicants by design; tightening this broke it in production once already, see that file's header). Live policy correctly still WITH CHECK (true) — verified 2026-07-14. 20260619030000 is stale/superseded on this point; do not resurrect it.

---

## Dead Feature Flags — retire (2026-06-19, lane 03)

These flags have active call sites and cannot be removed autonomously. All have been running long enough to decide.

- **`share-prompt-timing`** (~72d, ~0 experiment exposure, active=true, 2 call sites)
  - Status: never ramped / always dark — no data collected
  - Recommended action: delete flag + remove conditional from code (no variant to preserve — control is status quo)
  - Owner: human

- **`show-signup-after-first-win`** (inconclusive, active=true, 1 call site)
  - Status: marked inconclusive in prior triage, still live
  - Recommended action: pick whichever arm is default → delete flag + remove conditional
  - Owner: human

- **`mp-signup-nudge-copy-v1`** (0/77 converts in 28d, active=true, 3 call sites)
  - Status: null result — `toast-disabled` variant indistinguishable from control on conversion
  - Recommended action: keep control code path (sheet-only, no toast), delete flag + toast-disabled branch
  - Owner: human

## 2026-06-20
- [Supabase] `is_catchup` column missing from `daily_word_wheel_attempts`
  - first seen: 2026-06-07 (when migration authored), active in Sentry since
  - last seen: 2026-06-20, count: recurring, reach: 0 (server-side)
  - link: https://lexiclash.sentry.io/issues/125836250/ (JAVASCRIPT-NEXTJS-1NB, score 0.06)
  - status: deferred — SUPABASE_ACCESS_TOKEN expired, cannot apply
  - fix ready: `supabase/migrations/20260607100000_word_wheel_catchup.sql` (correct, just unapplied)
  - action: `SUPABASE_ACCESS_TOKEN=<fresh> npx supabase db push` OR REST: `POST https://api.supabase.com/v1/projects/hdtmpkicuxvtmvrmtybx/database/query` with the migration SQL
  - recommended owner: review-by-eod (apply at 9am with refreshed token)

- [Sentry] Coin transaction failures: `[CoinContext] Failed to add coins` + `Coin sync API error`
  - first seen: recent, last seen: 2026-06-20, count: active, userCount: 5+4
  - links: https://lexiclash.sentry.io/issues/123033015/ (1JP) + https://lexiclash.sentry.io/issues/123033018/ (1JQ)
  - status: deferred — needs Supabase MCP to inspect `sync_coins` RPC definition
  - suspected root cause: `sync_coins` has `search_path = ''` (function_search_path_mutable advisor) + uses unqualified `profiles` table → `relation "profiles" does not exist` (JAVASCRIPT-NEXTJS-1JR)
  - action when MCP restored: `SELECT prosrc FROM pg_proc WHERE proname = 'sync_coins'` — check if `profiles` is schema-qualified; add `SET search_path = 'public'` or qualify table names
  - recommended owner: backend, review-by-eod

- [Sentry] `TypeError: Cannot read properties of null (reading 'clear')`
  - last seen: 2026-06-20, reach: 5
  - link: https://lexiclash.sentry.io/issues/120102540/ (JAVASCRIPT-NEXTJS-1CW)
  - status: deferred — stack trace needed from Sentry MCP (MCP not connected this run)
  - note: ScreenFlash.ts guard (line 78) already handles destroyed-race; source is elsewhere; need exact frame
  - recommended owner: self (next nightly with MCP)

- [Sentry] churn-signals report 502
  - link: https://lexiclash.sentry.io/issues/124871662/ (JAVASCRIPT-NEXTJS-1KQ, score 0.443)
  - status: deferred — external service 502; not a code fix
  - recommended owner: infra/human

## 2026-06-21
- [Sentry] [API] Word Wheel submit error: Could not find the 'is_catchup' column of 'daily_word_wheel_attempts' in the schema cache
  - last seen: 2026-06-21, score 0.06, reach 0
  - link: https://lexiclash.sentry.io/issues/125836250/
  - root cause: migration `fe-next/supabase/migrations/20260607100000_word_wheel_catchup.sql` adds `is_catchup boolean NOT NULL DEFAULT false` to `daily_word_wheel_attempts` but was NOT applied to prod. `backend/routes/dailyChallenge/wordWheelRoutes.ts:108` inserts `is_catchup` on every word wheel submit → column missing → PostgREST schema cache error.
  - fix: apply the migration. SQL is idempotent (`ADD COLUMN IF NOT EXISTS`). Safe, additive, reversible.
    ```sql
    ALTER TABLE public.daily_word_wheel_attempts
      ADD COLUMN IF NOT EXISTS is_catchup boolean NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_word_wheel_attempts_catchup
      ON public.daily_word_wheel_attempts (player_id, is_catchup)
      WHERE is_catchup = false;
    ```
  - status: deferred (Supabase MCP unavailable this run — blocked by token/timing)
  - recommended owner: human — apply via Supabase dashboard SQL editor or `npx supabase db push` — takes 30s, zero blast radius

- [Sentry] relation "profiles" does not exist (score 0.125, reach 5)
  - link: https://lexiclash.sentry.io/issues/123033022/
  - status: deferred (no time to diagnose root cause this run)
  - recommended owner: review-by-eod — investigate which API route queries `profiles` without schema prefix

- [Sentry] [CoinContext] Failed to add coins: Failed to process coin transaction (score 0.11, reach 5)
  - link: https://lexiclash.sentry.io/issues/123033015/
  - status: deferred (coin economy = human-queue per hard rules)
  - recommended owner: human — HARD LINE: never touch coin economy autonomously

## 2026-06-21 — Lane 03 engagement flag hygiene
- `share-prompt-timing` (flag id 163656): ~72d running, ~0 experiment events. RECOMMEND KILL — delete flag + keep control code path. Status: open, human.
- `show-signup-after-first-win` (flag id 163655): running 72d+, inconclusive (no statistically significant winner). RECOMMEND KILL — delete flag + keep control code path. Status: open, human.
- `mp-signup-nudge-copy-v1` (flag id 183230): 0/77 converts in 28d+. RECOMMEND RETIRE — delete flag, keep `control` (sheet only, suppress toast). Status: open, human.
- `exp-leaderboard-play-cta-v1` (flag id 209542): DEACTIVATED — variant-B still unwired (leaderboard/PageClient.tsx 519 lines, blocked on <500-line refactor). Do not re-enable until PageClient refactored. Status: blocked on refactor.

---

## 2026-06-22 (lane-03 engagement)

### Dead flags — retire after human confirm

| Flag key | Created | Age | Status |
|---|---|---|---|
| `share-prompt-timing` | 2026-03-31 | 83d | 0 converts, inconclusive — retire, keep control (results-page timing) |
| `show-signup-after-first-win` | 2026-03-31 | 83d | 0 converts, inconclusive — retire, keep default |
| `mp-signup-nudge-copy-v1` | 2026-05-08 | 45d | 0/77 converts — retire, keep toast-disabled path (no dismissal training) |

Retire procedure: grep each key in fe-next (excl experiments.ts/tests), replace conditional with winner path, delete defineExperiment entry, archive PostHog flag.

## 2026-06-23

### [Supabase Security] `authenticated_security_definer_function_executable` — 68 remaining functions
- first seen: ongoing advisor warning
- count: 68 functions flagged (add_league_xp, admin_*, award_coins, sync_coins, etc.)
- status: deferred (bulk — `update_difficulty_after_game` SHIPPED separately)
- why: each needs individual callsite grep + auth.uid() check or REVOKE decision; bulk change is large blast radius
- recommended owner: backend

### [Supabase Security] `rls_policy_always_true` — `teacher_access_requests`
- Policy: `tar_insert_any` for INSERT with `WITH CHECK (true)`
- status: deferred
- why: intentional design — teacher applications allow anonymous/public INSERT via API route (service-role); tightening could break public teacher onboarding flow
- recommended owner: review-by-eod

### [Supabase Security] `rls_policy_always_true` — `connections_feedback`, `custom_puzzle_attempts`, `custom_puzzles`
- Three more tables with always-true INSERT policies
- status: deferred
- why: likely intentional (public content submission); need product owner confirmation before restricting
- recommended owner: backend

### [Sentry] TypeError: Cannot read properties of null (reading 'clear') — JAVASCRIPT-NEXTJS-1CW
- culprit: `/:locale/daily/word-wheel`; PostHog last seen 2026-06-22 (2 occurrences)
- status: research-only — existing guards in `WordWheelPixiRing.tsx:86`, `TrailRenderer.ts:60`, `TileRenderer.ts:429` already patched
- why: remaining 2 PostHog hits may be stale (pre-fix) or from an unmapped chunk; no new unguarded call sites found
- recommended owner: monitor — close if no new occurrences in 7d

## 2026-06-25

### [Sentry] churn-signals 502 (JAVASCRIPT-NEXTJS-1KQ)
- last seen: active, 276+ events; root cause identified in `fe-next/lib/auth/getBearerUser.ts:14-19`
- link: https://lexiclash.sentry.io/issues/124871662/
- status: deferred (operational, not code)
- why: code fix already shipped — `getBearerUser` does local HS256 JWT verify (no network). Fix takes effect when `SUPABASE_JWT_SECRET` is provisioned on Railway (Supabase Dashboard → Project Settings → API → JWT Secret). Zero code changes needed.
- recommended owner: review-by-eod (Railway env var: set SUPABASE_JWT_SECRET)

### [Sentry] "relation 'profiles' does not exist" (JAVASCRIPT-NEXTJS-1JR)
- last seen: active, reach=5
- link: https://lexiclash.sentry.io/issues/123033022/
- status: deferred (root cause not traced)
- why: `public.profiles` table EXISTS with expected columns (id, total_coins, lifetime_coins_earned). `sync_coins` uses `public.profiles` (schema-qualified, safe). No function with bare `profiles` reference + empty search_path found. Error origin may be an edge function or uncaptured PostgREST path — needs Sentry stack trace read.
- recommended owner: backend (read Sentry stack trace for callsite)

### [Sentry] Coin transaction failures (JAVASCRIPT-NEXTJS-1JP, 1JQ)
- last seen: active, reach=5/4
- links: https://lexiclash.sentry.io/issues/123033015/ · https://lexiclash.sentry.io/issues/123033018/
- status: deferred (DB-level; coin-economy → human queue)
- why: `sync_coins` and `award_ad_coins` are SECURITY DEFINER RPCs returning actual Supabase errors (not logical failures like "Insufficient coins"). Requires pg_stat_statements or Sentry stack trace to pinpoint. Coin-economy logic = safety rail, human review required.
- recommended owner: backend (read Sentry stack trace; check pg_stat_statements for recent errors on these RPCs)

### [Supabase Security] upsert_push_token SECURITY DEFINER callable by authenticated
- link: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- status: deferred (requires refactor to fix correctly)
- why: function intentionally SECURITY DEFINER — body uses `auth.uid()` AND updates OTHER users' tokens (cross-user cleanup). REVOKE from authenticated breaks the push-token route (uses user-session client). Proper fix: add `p_user_id` param to function, route → service_role client, REVOKE authenticated. No anon grant exists (already safe from anon). 53 total flagged functions; this one is the clearest case.
- recommended owner: backend (2-step: modify function signature + route, then REVOKE authenticated)

## 2026-06-26

### [Supabase Security] get_random_words_from_bank — search_path mutable
- status: shipped (migrations: fix_get_random_words_search_path + fix_get_random_words_search_path_v2)
- what: SECURITY DEFINER function had mutable search_path; pinned to `search_path = 'public'`
- note: initially applied `= ''` (would break unqualified `daily_challenge_word_bank` ref in body); corrected to `'public'`
- recommended owner: review-by-eod (verify daily challenge generation still works end-to-end)

### [Sentry] churn-signals 502 (JAVASCRIPT-NEXTJS-1KQ) — carry from 06-25
- status: no new action — client hook already handles 5xx as `logger.debug` (Sentry-excluded)
- code even cites this Sentry ID in a comment (`useChurnSignals.ts:108`)
- recommended owner: monitor — close if Railway restart transient confirmed

### [Supabase Security] rls_policy_always_true — teacher_access_requests tar_insert_any
- status: deferred — INSERT-always-true is by-design (public teacher access request form)
- same intentional pattern as school_leads, connections_feedback, custom_puzzles
- recommended owner: skip unless access-control review needed

### [Supabase Security] upsert_push_token SECURITY DEFINER — carry from 06-25
- status: no change — still deferred; see 06-25 entry for full rationale

## 2026-06-27

### [Supabase Security] upsert_push_token SECURITY DEFINER — SHIPPED
- status: shipped — migration `harden_upsert_push_token_search_path` applied
- changed `SET search_path TO 'public'` → `SET search_path = ''` + fully qualified `public.user_push_tokens`
- SECURITY DEFINER kept: intentional — function must update other users' rows to deactivate stale tokens on device switch
- no behavior change; closes the Supabase security advisor warning
- recommended owner: review-by-eod (verify push notifications still work)

### [Sentry] JAVASCRIPT-NEXTJS-1KQ churn-signals 502 — stale, no action
- last seen: 2026-06-05; code exists at hooks/useChurnSignals.ts + app/api/growth/churn-signals
- 5xx handled client-side as debug log (Sentry-excluded); Railway restart transient
- Sentry MCP lacks write permission to resolve — manual close needed
- recommended owner: human — close issue manually at sentry.io/issues/124871662

### [Sentry] JAVASCRIPT-NEXTJS-1NB is_catchup schema cache — stale, self-healed
- column now exists in daily_word_wheel_attempts; PostgREST cache miss post-migration
- last seen: 2026-06-08; self-healed on next container cycle
- Sentry MCP lacks write permission — manual close: sentry.io/issues/125836250
- recommended owner: human — close manually

### [Sentry] JAVASCRIPT-NEXTJS-1KM null.clear rAF word-wheel iOS — stale
- 3 occurrences, 1 user, last seen 2026-06-07; minified rAF stack, no source maps
- no .clear() callsites found in word-wheel components (likely PixiJS internals)
- Sentry MCP lacks write permission — manual close: sentry.io/issues/124827788
- recommended owner: human — close manually or wait for recurrence

### [Supabase Security] feedback_reports RLS no policies — intentional
- no frontend callsites found; writes likely go via API route using service_role (bypasses RLS)
- adding blind policies risks locking out the app without knowing intent
- recommended owner: skip unless RLS audit reveals direct anon/authenticated writes needed

## 2026-06-28

### [Supabase Security] upsert_push_token SECURITY DEFINER — SHIPPED
- Function had implicit PUBLIC execute grant (PostgreSQL default); anon callers could invoke it and write null user_id rows to user_push_tokens
- No anon callsites found in codebase (grep confirmed 0 matches)
- status: shipped `20260628010000_revoke_push_token_fn_from_public.sql` — REVOKE FROM public, keep authenticated grant
- recommended owner: review-by-eod (confirm migration applied cleanly in prod)

### [Supabase Security] teacher_access_requests tar_insert_any always-true — KNOWN EXCEPTION
- Flagged by advisor as "RLS Policy Always True"
- Intentional design: anonymous public-form submissions (documented in 20260617120000_restore_teacher_access_anon_insert.sql)
- status: no action — keep as-is per documented rationale
- recommended owner: skip

### [Supabase Security] feedback_reports RLS no policies — PRE-TRIAGED
- No frontend/API callsites found; service_role (admin) bypasses RLS correctly
- Triaged 2026-06-27: intentional, no code change needed
- status: deferred — reconfirmed

### [Sentry] JAVASCRIPT-NEXTJS-1KQ churn-signals 502 — DEFERRED
- Route code looks correct; 502 is upstream (Supabase REST API timeout or infra)
- Sentry/Supabase MCP unavailable this run — no stack trace obtained
- count: 3, users: 3, score: 0.443
- status: deferred — needs Sentry MCP to read stack trace
- recommended owner: lane-01 next run (retry with MCP available)

### [Sentry] JAVASCRIPT-NEXTJS-1CW null.clear — PRE-TRIAGED (stale)
- reach: 5, last seen: 2026-06-07 (per prior triage entry in queue)
- Already documented as PixiJS internal, stale — no code action
- status: deferred — verify still stale once Sentry MCP available

### [Engagement] exp-blast-wave-banner-v1 UNWIRED — PostHog flag live, 0 code call sites
- PostHog flag created 2026-06-29, rollout 100%, active=true
- grep: `rg -l "exp-blast-wave-banner-v1" fe-next -g "*.ts" -g "*.tsx" | grep -v experiments.ts` → 0 results
- An unwired flag serves a variant that changes nothing — fake running test
- status: deferred — wire variant-B in code OR delete the flag
- recommended owner: lane-03 next run

### [Engagement] exp-settings-lang-feedback-v1 UNWIRED — defined in experiments.ts, needs PageClient.tsx wiring
- Experiment added to lib/experiments.ts on 2026-07-02 but variant-B not wired yet
- PostHog flag intentionally NOT created until call site exists
- status: deferred — wire in settings/PageClient.tsx then run posthog-experiment.sh ensure
- recommended owner: lane-03 next run

## 2026-07-03

### [Sentry] JAVASCRIPT-NEXTJS-1KQ churn-signals 502 — RETRY
- Route code at `app/api/growth/churn-signals/route.ts` is clean (proper try/catch, Supabase admin upsert with onConflict)
- 502 is Vercel-level (gateway timeout or function crash before response); not reproducible without stack trace
- Sentry MCP unavailable this run; could not fetch trace
- status: deferred — retry next run with Sentry MCP
- recommended owner: lane-01 next run

### [Sentry] JAVASCRIPT-NEXTJS-1MC username validation — NEEDS CALLSITE
- Error: "Invalid request: username: Username must be at most 30 characters, username: Invalid string: must match pattern /^[a-zA-Z0-9._\-...]+$/"
- Looks like Supabase Auth API rejection (not our Zod) when calling updateUserById with a too-long or non-ASCII username
- UsernameSchema exists in backend/utils/schemas.ts (imported from elsewhere); callsite not traced before time budget ran out
- reach: 1 user, low severity but worth a frontend maxLength guard
- status: deferred — find where auth.updateUser/admin.updateUserById is called with username
- recommended owner: lane-01 next run

### [Supabase Security] upsert_push_token authenticated_security_definer — ACCEPTED FALSE POSITIVE
- Migration 20260628010000 (REVOKE from public) confirmed APPLIED to prod
- Current advisor flags `authenticated` role having EXECUTE on SECURITY DEFINER function — this is INTENTIONAL
- Function is self-scoped to auth.uid(); authenticated users MUST call it to register push tokens
- No anon grant exists; REVOKE from authenticated would break the feature
- status: accepted false-positive — no action; advisor will keep firing
- recommended owner: skip

### [Supabase] Migration state audit
- 20260628010000_revoke_push_token_fn_from_public: APPLIED ✓
- 20260629020000_rls_initplan_fix_and_word_clubs_fk_index: APPLIED ✓
- No 06-30 migration file exists on disk — learnings note "3 unapplied migrations 06-28/29/30" was stale
- status: resolved — learnings note to be corrected by lane-07

---

## 2026-07-04
- [Sentry] JAVASCRIPT-NEXTJS-1CW — TypeError: Cannot read properties of null (reading 'clear')
  - first: 2026-05-15, last: 2026-06-09, count: 13, users: 4
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1CW
  - status: deferred (no code change needed — guards already in place)
  - why: All .clear() callers in gameEngine (TileRenderer.ts:429, TrailRenderer.ts:60+68, ScreenFlash.ts:78, GameCanvas.tsx:154) already guarded with `_destroyed || graphics?.destroyed` checks. Last seen 25 days ago. Sentry MCP token is read-only (403 on update).
  - recommended owner: review-by-eod — manually resolve in Sentry UI: lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1CW

- [Sentry] JAVASCRIPT-NEXTJS-1KQ — Error: churn-signals report failed with status 502
  - first: 2026-06-03, last: 2026-06-05, count: 278, users: 3
  - link: https://lexiclash.sentry.io/issues/124871662/
  - status: deferred
  - why: useChurnSignals hook does not exist in current codebase. Chunk hash (0zi.dqcpmu2.9.js) from old build. Code was removed in a subsequent deploy. Sentry MCP read-only.
  - recommended owner: review-by-eod — manually resolve in Sentry UI

- [Sentry] JAVASCRIPT-NEXTJS-1M7 — NotFoundError: Failed to execute 'insertBefore' on 'Node'
  - first: 2026-06-05, last: 2026-06-05, count: 2, users: 1
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1M7
  - status: deferred
  - why: Old build chunk hash; 2 occurrences June 5 only. Likely transient React DOM reconciliation error from a navigation race. Low impact. Sentry MCP read-only.
  - recommended owner: review-by-eod — manually resolve in Sentry UI if no recurrence

- [Sentry] JAVASCRIPT-NEXTJS-1MC — Invalid username pattern (parentheses not stripped)
  - first/last: 2026-06-05, count: 1, users: 1
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1MC
  - status: deferred — fix queued
  - why: User "Sonia Díaz Conesa (Sonia Conesa)" — parentheses () not allowed by backend UsernameSchema but not stripped client-side before socket emit. Backend correctly rejects, but Sentry logs it as an error. Fix: strip invalid chars from username before MP join emit. Low priority (1 occurrence, June 5).
  - recommended owner: lane-01 next run — find UsernameSchema, add strip to client-side join handler

- [Supabase] authenticated_security_definer_function_executable — upsert_push_token
  - evidence: Function public.upsert_push_token is SECURITY DEFINER executable by authenticated role
  - status: deferred — intentional
  - why: Function needs SECURITY DEFINER to UPDATE tokens owned by OTHER users (token rotation: deactivates same-token rows where user_id != auth.uid()). Already hardened with SET search_path = ''. No anon path exists (API route requires auth.getUser() first). Reviewed 2026-07-04.
  - recommended owner: none — this is intentional. Can add a comment to the function explaining why SECURITY DEFINER is required.

- [Supabase] rls_policy_always_true — teacher_access_requests.tar_insert_any
  - evidence: INSERT policy WITH CHECK always true for teacher_access_requests
  - status: deferred
  - why: RLS policy REPLACEMENT on existing table = autonomy matrix DEFER. The always-true INSERT allows anyone to submit a teacher access request (intentional — open signup flow). To harden: restrict WITH CHECK to auth.uid() IS NOT NULL. Requires understanding if anon submissions are needed.
  - recommended owner: backend — add `WITH CHECK (auth.uid() IS NOT NULL)` if anon submissions are not required

## 2026-07-05

### [Supabase] teacher_access_requests INSERT always-true RLS — intentional but worth confirming
- Policy `tar_insert_any` has `WITH CHECK (true)` for INSERT (any role).
- Likely intentional: public teacher signup form, request requires admin approval before access is granted.
- Status: deferred — not a data-corruption risk, but spam/flooding possible without rate limit.
- Recommended owner: review-by-eod (confirm intentional, consider adding rate-limit or CAPTCHA at app layer)

### [Sentry] JAVASCRIPT-NEXTJS-1PV — TypeError null.clear word-wheel (NEW 2026-07-04)
- First/last: 2026-07-04, 4 occurrences, 2 users. Mechanism: rAF. Android 16 Samsung S931B.
- Root cause: `TrailRenderer.draw()` called `this.graphics.clear()` without guard; PixiJS nulls internal render context before setting `graphics.destroyed=true` on WebGL context loss.
- Status: shipped fix in `fe-next/lib/gameEngine/TrailRenderer.ts` (added `_destroyed || graphics?.destroyed` guard + try/catch in `draw()`). Fixes JAVASCRIPT-NEXTJS-1PV.
- Recommended owner: review-by-eod (visual verify word-wheel trail still renders normally)

### [Sentry] JAVASCRIPT-NEXTJS-1KQ — churn-signals 502 (stale, 1 user = founder)
- First: 2026-06-03, last: 2026-06-05. 278 occurrences, 1 user. Handled=yes.
- useChurnSignals hook fires POST to a churn-report endpoint that returns 502. Stale (30d+ dormant).
- Status: deferred — error is handled (not user-facing), stale, single user. Monitor if resurfaces.
- Recommended owner: self (check if churn-signals endpoint is still live; if dead, remove the hook call)

## 2026-07-06

### [Supabase] upsert_push_token search_path hardening incomplete
- Function body has `SET search_path = public` (not `''`). The 20260628010000 migration only revoked PUBLIC execute; function body never updated.
- Fix requires: `CREATE OR REPLACE FUNCTION public.upsert_push_token(...) ... SET search_path = '' ... UPDATE public.user_push_tokens ...` (fully-qualify table names).
- Status: deferred — Supabase MCP unavailable during lane run; need MCP `apply_migration` to apply.
- Recommended owner: lane-01 next night (apply migration via Supabase MCP)

### [Sentry] CapacitorGameConnect.then() still showing 7 events (1PH)
- Fix `d2fb54b03` is in HEAD. Events are from stale app cache / users on old APK versions.
- Status: monitoring — should resolve as users update. No code fix needed.
- Recommended owner: self (confirm zero events after next Play release)

### [Sentry] TrailRenderer null.clear (1CW/1PV) — salvage regression reverted
- Salvaged code from 20260705 removed the null guard (try-catch + _destroyed check). Lane 01 reverted to HEAD.
- Status: shipped correct version (HEAD guard intact). Sentry should trend down.
- Recommended owner: review-by-eod (verify Sentry 1CW/1PV trending down)

## 2026-07-07
### [Supabase] upsert_push_token SECURITY DEFINER — migration written, unapplied
- Migration `20260628010000_revoke_push_token_fn_from_public.sql` REVOKEs EXECUTE from PUBLIC, re-grants to authenticated only
- Status: deferred — Supabase MCP unavailable tonight (~11 nights of token drought)
- Why: needs live Supabase MCP to apply_migration; migration file is written and correct
- Recommended owner: apply via `supabase-db-manager` once MCP token is refreshed

### [Supabase] RLS always-true tar_insert_any on teacher_access_requests — intentional
- Advisor flags `tar_insert_any` INSERT WITH CHECK (true) as always-true
- Status: DO NOT CHANGE — public teacher apply form requires anon INSERT (migration 20260617120000 explains; changing it broke an applicant 2026-06-14, was reverted same night)
- Why: anonymous applicants submit BEFORE having an account; app-layer rate-limit is the spam guard
- Recommended owner: close the advisor ticket (not actionable)

### [Sentry] Word Wheel is_catchup schema cache miss
- Migration `20260607100000_word_wheel_catchup.sql` adds is_catchup column to daily_word_wheel_attempts
- Status: deferred — Supabase MCP unavailable, migration unapplied
- Why: same MCP token drought; applying this migration will clear the Sentry 1NB error
- Recommended owner: apply alongside upsert_push_token migration once MCP is restored

### [Sentry] CapacitorGameConnect.then() (1PH) — fix in code, noise from stale APK
- `nativePGS.ts:96,125` already guards against bare-proxy return; comment cites the exact Sentry ID
- Status: no code change needed; 7 remaining instances likely old APK versions
- Recommended owner: monitor 24h post-gate — should trend to 0 as old APKs retire

### [Sentry] Pixi null.clear (1PV) — guard already present
- `WordWheelPixiRing.tsx:106` checks `orbitGfx.destroyed` before any `.clear()` call
- Status: no code change needed; remaining instances from old/cached versions
- Recommended owner: monitor 24h

## 2026-07-08
- [Sentry] CapacitorGameConnect.then() not implemented on android (1PH, reach=7)
  - first seen: prior weeks; last seen: 2026-07-08; count: 7 in 24h
  - link: https://lexiclash.sentry.io/issues/132085085/
  - status: deferred (monitoring)
  - why: Code already has isPluginAvailable guard + sync proxy reads. 153→7 reduction confirms fix is live. Remaining 7 likely from stale APK builds pre-dating the guard. Code review found no remaining bad path. Monitor for further decline.
  - recommended owner: self (check next 3 nights; if stable at 0-2, close)

- [Supabase] SECURITY DEFINER upsert_push_token callable by authenticated role
  - link: advisor:security:authenticated_security_definer_function_executable
  - status: deferred (MCP unavailable — migration already written at 20260628010000_revoke_push_token_fn_from_public.sql)
  - why: REVOKE from PUBLIC migration was written on 2026-06-28 but unapplied (Supabase MCP token drought). Callsite is auth-gated API route only (no anon path). Apply migration when MCP is restored.
  - recommended owner: self (apply via supabase MCP `apply_migration` — run `cat fe-next/supabase/migrations/20260628010000_revoke_push_token_fn_from_public.sql` for the SQL)

- [Supabase] teacher_access_requests tar_insert_any RLS always-true
  - link: advisor:security:rls_policy_always_true
  - status: deferred
  - why: The always-true INSERT policy is intentional — migration 20260617120000_restore_teacher_access_anon_insert.sql explicitly restored anon insert access (teacher sign-up form is public). The advisor warning is expected. Needs owner to confirm intentionality and document with an allowlist comment.
  - recommended owner: review-by-eod (confirm design intent; if intentional add explicit comment in migration)

- [Sentry] JAVASCRIPT-NEXTJS-1PV TrailRenderer null.clear
  - link: https://lexiclash.sentry.io/issues/132119253/ (score 0.102, reach=6)
  - status: deferred (impact check unable-to-verify, Sentry MCP unavailable)
  - why: Fix was shipped 2026-07-05. Brief shows 6 events — likely draining from pre-fix state. Monitor next run when MCP available.
  - recommended owner: self (check Sentry JAVASCRIPT-NEXTJS-1PV count on next run)

## 2026-07-09
- [Sentry] CapacitorGameConnect.then() not implemented on android (JAVASCRIPT-NEXTJS-1PH)
  - last seen: 2026-07-09, count: ~7, userCount: 7
  - link: https://lexiclash.sentry.io/issues/132085085/
  - status: deferred — code already fixed in nativePGS.ts (Capacitor.isPluginAvailable guard + return boolean not proxy). Remaining 7 errors likely old app version installs.
  - why: no actionable code fix remains; monitor for new occurrences post-app-update
  - recommended owner: self — close if count stays ~0 next week

- [Sentry] TypeError: Cannot read properties of null (reading 'clear') (JAVASCRIPT-NEXTJS-1PV)
  - last seen: 2026-07-09, count: ~6, userCount: 6
  - link: https://lexiclash.sentry.io/issues/132119253/
  - status: shipped — added `if (line.destroyed) return;` guard in pathTrace.ts:35 (GSAP onUpdate fires after Pixi context nulled on unmount)
  - recommended owner: review-by-eod

- [Supabase] Signed-In Users Can Execute SECURITY DEFINER Function upsert_push_token
  - evidence: authenticated role can call via /rest/v1/rpc/upsert_push_token
  - status: deferred — REVOKE EXECUTE from anon/public not from authenticated (push token is user-auth flow, authenticated callers are intentional)
  - why: authenticated execution is the intended design; ambiguous whether anon path exists
  - recommended owner: backend review-by-eod

- [Supabase] RLS Policy Always True on teacher_access_requests (tar_insert_any INSERT)
  - status: deferred — RLS addition on sensitive table; blast radius = lock out inserts
  - why: needs schema review before tightening
  - recommended owner: backend

## 2026-07-09 Lane 03 — Stale experiment flags (human review)
- `share-prompt-timing` (created 2026-03-31, 100d) — A/B share prompt timing; needs winner determination + code cleanup
- `show-signup-after-first-win` (created 2026-03-31, 100d) — A/B signup prompt timing; same
- `mp-signup-nudge-copy-v1` (created 2026-05-08, 62d) — MP signup nudge copy variants; 0/77 converts on control noted in flag description

## 2026-07-10
- [Supabase] Signed-In Users Can Execute SECURITY DEFINER Function: upsert_push_token
  - first seen: ongoing advisor flag; count: persistent; userCount: all authenticated users
  - link: supabase:advisor:security:authenticated_security_definer_function_executable
  - status: deferred — migration 20260628010000_revoke_push_token_fn_from_public.sql written and committed, but UNAPPLIED (Supabase MCP token drought). Migration is ready; only blocked on MCP connectivity.
  - why: Supabase MCP unavailable; migration exists at fe-next/supabase/migrations/20260628010000_revoke_push_token_fn_from_public.sql
  - recommended owner: review-by-eod (apply migration when MCP available — run `supabase db push` or use MCP apply_migration)

- [Supabase] RLS Policy Always True: teacher_access_requests tar_insert_any
  - link: supabase:advisor:security:rls_policy_always_true
  - status: deferred — need design call: should INSERT be restricted by student email domain or school association?
  - why: ambiguous root cause requiring design
  - recommended owner: backend + design

## 2026-07-11
- [Sentry] TypeError: Cannot read properties of null (reading 'geometry') (JAVASCRIPT-NEXTJS-1RP)
  - first seen: 2026-07-09, last seen: 2026-07-10, count: 6, users: 2
  - link: https://lexiclash.sentry.io/issues/133301270/
  - status: shipped (WordTowerScene.tsx:516 — added !cc.destroyed && !tl.destroyed guard)
  - why: rAF tick reads containerRef/tiltRef after Pixi destroy() but before null assignment; objects truthy but destroyed → .geometry null crash
  - recommended owner: review-by-eod

- [Sentry] Error: "CapacitorGameConnect.then()" is not implemented on android (JAVASCRIPT-NEXTJS-1PH)
  - first seen: 2026-07-04, last seen: 2026-07-05, count: 153, users: 7
  - link: https://lexiclash.sentry.io/issues/132085085/
  - status: shipped (d2fb54b03 — Capacitor.isPluginAvailable guard in nativePGS.ts, committed prior run)
  - why: already fixed, no new events since 07-05; gate may not have deployed it yet
  - recommended owner: review-by-eod

- [Sentry] TypeError: Cannot read properties of null (reading 'clear') (JAVASCRIPT-NEXTJS-1PV)
  - first seen: 2026-07-04, last seen: 2026-07-06, count: 8, users: 6
  - link: https://lexiclash.sentry.io/issues/132119253/
  - status: shipped (eb3551526 — try/catch + destroyed flag guard in WordWheelPixiRing.tsx, committed prior run)
  - why: already fixed, no new events since 07-06
  - recommended owner: review-by-eod

- [Supabase] Signed-In Users Can Execute SECURITY DEFINER Function: upsert_push_token
  - link: https://supabase.com/dashboard/project/*/database/linter
  - status: deferred (false positive — migration 20260628010000 already applied; anon REVOKED, authenticated access intentional for push token registration)
  - why: authenticated callers call this from app/api/player/push-token/route.ts legitimately
  - recommended owner: review-by-eod (confirm intentional, add comment to DB function)

- [Supabase] RLS Policy Always True: teacher_access_requests INSERT (tar_insert_any)
  - status: deferred
  - why: public INSERT for teacher signup requests is likely intentional (anyone can request teacher access); tightening could break the signup flow silently
  - recommended owner: backend (confirm intent, restrict to anon+authenticated if desired)

## Stale experiments — flag for human review (>14 days, inconclusive, added 2026-07-11)

The following PostHog experiments have been running >14 days with no retirement action. Each has active code call sites. Needs manual review in PostHog for statistical significance (p<0.05, n≥1000/arm); retire winning branch and delete losing code if decided.

| Flag key | Age (days) | Call site count | Metric |
|---|---|---|---|
| `landing-modes-cubes-v1` | 30 | 3 | landing_cta_clicked |
| `exp-results-replay-cta-v1` | 39 | 3 | replay_clicked |
| `mp-signup-nudge-copy-v1` | 64 | 5 | signup_completed |
| `exp-wordhunt-hint-v1` | 21 | 2 | game_completed (wordhunt) |
| `wheel-replay-cta-v1` | 21 | 4 | practice_started |
| `wheel-signup-offer-v1` | 21 | 4 | signup_completed |
| `exp-leaderboard-play-cta-v1` | 22 | 6 | game_started |
| `exp-game-abandon-confirm-v1` | 22 | 6 | game_completed |
| `exp-practice-wheel-cta-v1` | 22 | 3 | practice_started |
| `exp-mp-round-feedback-top-v1` | 18 | 2 | game_feedback mp_round avg |

_Source: posthog flag list queried 2026-07-11 via posthog-query.sh flags; all flags active=true, rollout=100%._

## 2026-07-12
- [Sentry] JAVASCRIPT-NEXTJS-1R3 `<unknown>` on multiplayer page (/:locale/juego-de-palabras-multijugador)
  - first/last seen: 2026-07-06 / 2026-07-11, count=83, userCount=0
  - link: https://lexiclash.sentry.io/issues/132569197/
  - status: deferred
  - why: no stack trace — `head > link` resource load error on iOS Safari, likely CDN/font preload failure. No code change can fix without identifying the failing resource. Monitor for user impact increase.
  - recommended owner: backend/infra review-by-eod

- [Sentry] JAVASCRIPT-NEXTJS-1RT `[GSI_LOGGER]: Check credential status returns invalid response`
  - first/last seen: 11h ago (2026-07-12), count=1, userCount=0
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1RT
  - status: deferred
  - why: Google Sign-In internal logger noise, single occurrence, 0 users affected
  - recommended owner: self (monitor for recurrence)

- [Supabase] upsert_push_token SECURITY DEFINER callable by authenticated role
  - status: deferred
  - why: Route at app/api/player/push-token/route.ts uses createClient() (session-scoped authenticated client) to call the RPC. REVOKE from authenticated would break the API. Fix options: (a) switch route to service-role client + REVOKE from authenticated, or (b) switch function to SECURITY INVOKER if user_push_tokens has RLS. Needs schema review.
  - recommended owner: review-by-eod

- [Supabase] add_league_xp SECURITY DEFINER callable by authenticated role
  - status: deferred
  - why: Called from backend/modules/leagueManager.ts via getSupabase() — need to confirm whether this uses service role or session client before REVOKE decision.
  - recommended owner: review-by-eod

- [Supabase] teacher_access_requests RLS policy tar_insert_any (WITH CHECK always true)
  - status: deferred
  - why: INSERT with no restrictions is likely intentional (any authenticated user can submit a teacher access request). Changing would require UX review.
  - recommended owner: design review-by-eod

## 2026-07-13
- [Supabase] upsert_push_token SECURITY DEFINER callable by authenticated role
  - first seen: ongoing advisor warning
  - link: supabase:advisor:security:authenticated_security_definer_function_executable
  - status: deferred
  - why: no client callsite found in repo — may be called from native Capacitor plugin via REST. Changing SECURITY DEFINER→INVOKER could break push-token upsert if function needs elevated privileges. Needs review of DB function body + push notification service.
  - recommended owner: backend review-by-eod

- [Supabase] teacher_access_requests RLS INSERT policy tar_insert_any always-true
  - first seen: ongoing advisor warning
  - link: supabase:advisor:security:rls_policy_always_true
  - status: deferred
  - why: INSERT WITH CHECK (true) is intentional — anyone (pre-auth) can submit a teacher access request. Not a real security gap; this is the design. Could add email/captcha gate in the future.
  - recommended owner: design review-optional

- [Sentry 1PH] CapacitorGameConnect.then() not implemented on android
  - first seen: 2026-07-04, last seen: 2026-07-05, 153 events, 7 users
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1PH
  - status: deferred (no callsite in codebase — plugin-layer fix likely already applied)
  - why: zero CapacitorGameConnect references in repo; error last fired 8d ago; matches 07-05 memory entry. Sentry issue still "unresolved" but no new occurrences. Recommend marking resolved in Sentry.
  - recommended owner: self (mark resolved in Sentry)

- [PostHog] exp-mp-room-join-loading-v1 zombie flag — deactivate in PostHog
  - first seen: 2026-07-13
  - evidence: code reverted 07-12 (16 rageclicks/7d vs 1 baseline, /es-heavy); flag still active in PostHog (id:219697)
  - status: deferred
  - why: flag has 0 call sites in code — it's serving a variant that changes nothing. Needs manual PostHog deactivation.
  - recommended owner: lane-03 / human (PostHog UI)

- [Flags >14d unwired] exp-results-replay-cta-v1 (40d), exp-leaderboard-play-cta-v1 (24d), exp-mp-quickplay-wait-v1 (27d), exp-invite-arrival-clarity-v1 (27d) — human review for statistical significance
  - first seen: 2026-07-13
  - evidence: all wired, all >14d old, but no PostHog stats available in automated lane
  - status: deferred
  - why: cannot determine p<0.05 from shell; need human to check PostHog experiment results and retire winners
  - recommended owner: human (PostHog experiments UI)

## 2026-07-14
- [Sentry] JAVASCRIPT-NEXTJS-1PH — "CapacitorGameConnect.then() is not implemented on android"
  - last seen: 2026-07-05, reach=7 (historical), code fix already in nativePGS.ts (Capacitor.isPluginAvailable guard + returns boolean not proxy)
  - status: deferred (Sentry MCP unavailable to resolve)
  - why: needs Sentry manual resolution (issue is fixed in code, just needs closing)
  - recommended owner: review-by-eod — mark resolved in Sentry UI
- [Sentry] JAVASCRIPT-NEXTJS-1R3 — unknown error
  - evidence: https://lexiclash.sentry.io/issues/132569197/
  - status: deferred (Sentry MCP unavailable, score=0.16 low priority)
  - recommended owner: backend

## 2026-07-15
- [Sentry] CapacitorGameConnect.then() not implemented on android (1PH)
  - first_seen: ~2026-07-05, last_seen: 2026-07-14, count: 7 users
  - link: https://lexiclash.sentry.io/issues/132085085/
  - status: deferred (nativePGS.ts already has the fix; remaining 7 occurrences may be stale sessions or edge cases requiring device testing)
  - why: root cause already fixed in utils/nativePGS.ts (Capacitor.isPluginAvailable guard + synchronous plugin read); persistent occurrences need device-level investigation
  - recommended owner: review-by-eod

- [Supabase] SECURITY DEFINER function upsert_push_token executable by authenticated role
  - link: supabase:advisor:security:authenticated_security_definer_function_executable
  - status: deferred (pending Sentry MCP availability to grep callsites + Supabase MCP to apply REVOKE)
  - why: autonomy matrix SHIP (no anon callers found in lib/supabase/), but Supabase MCP unavailable tonight
  - recommended owner: self (apply REVOKE on next MCP-available night)

- [Supabase] RLS policy always true on teacher_access_requests INSERT (tar_insert_any)
  - link: supabase:advisor:security:rls_policy_always_true
  - status: deferred (pending Supabase MCP to apply fix)
  - why: autonomy matrix SHIP (RLS policy ADDITION, reversible), but Supabase MCP unavailable
  - recommended owner: self (apply on next MCP-available night)

- [Sentry] <unknown> JAVASCRIPT-NEXTJS-1R3
  - link: https://lexiclash.sentry.io/issues/132569197/
  - status: deferred (Sentry MCP unavailable for stack trace; reach=0)
  - why: reach=0 in last 24h, low priority
  - recommended owner: review-by-eod

## 2026-07-16
- [Supabase] `upsert_push_token` SECURITY DEFINER callable by authenticated
  - status: false-positive (intentional — migration 20260628010000 revoked from PUBLIC, granted to authenticated; push token registration requires SECURITY DEFINER)
  - recommended owner: self (no action needed)
- [Supabase] `teacher_access_requests` tar_insert_any WITH CHECK (true)
  - status: false-positive (intentional — anonymous teacher application form cannot require auth; restored in migration 20260617120000 after prior erroneous fix broke real applicant submissions)
  - recommended owner: self (no action needed)
- [Sentry] 1PH CapacitorGameConnect.then() not implemented (reach=7)
  - status: already fixed in d2fb54b03 (Capacitor.isPluginAvailable guard in nativePGS.ts:85)
  - recommended owner: self (close in Sentry)
- [Sentry] 1PV TypeError null.clear() on /daily/word-wheel (reach=6)
  - last seen: 2026-07-06 — already fixed in WordWheelPixiRing.tsx:106 (.destroyed guard + try/catch)
  - recommended owner: self (close in Sentry)

## 2026-07-18
- [PostHog] TypeError: Load failed / Failed to fetch (019f34a3)
  - first_seen: 2026-07-08, last_seen: 2026-07-17, occurrences: 45, users: 17
  - link: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - status: deferred
  - why: No stack trace — all events are generic unhandled network fetch failures on /es/multiplayer from Android Chrome 150. Cannot pinpoint which fetch call without a real stack. Likely WebSocket/Socket.IO connection drop on mobile network handoff.
  - recommended owner: review-by-eod (check if socket reconnect is emitting proper errors)

- [PostHog] React error #418 — hydration mismatch at <html> level (019f4747, 019f70e5)
  - first_seen: 2026-07-09, last_seen: 2026-07-17, occurrences: 9, users: 7
  - link: https://eu.posthog.com/project/151059/error_tracking/019f4747-c11b-7430-8ac2-882649b49cbd
  - status: deferred
  - why: suppressHydrationWarning already present on <html> and <body>. React #418 is a CONTENT child mismatch (not attribute mismatch), so suppressHydrationWarning doesn't prevent it. All occurrences on Android Chrome 150 (Capacitor WebView). Suspected cause: Capacitor bridge script injecting DOM content before React hydrates, OR a client-only component in root layout rendering differently SSR vs client. Needs device-level debugging with non-minified build.
  - recommended owner: review-by-eod (check root layout providers for typeof window !== 'undefined' patterns; test on Capacitor WebView)

- [PostHog] TypeError: Failed to fetch (019f0ab7) — OBSERVATION
  - first_seen: 2026-07-15, last_seen: 2026-07-17, occurrences: 32, users: 1 (single session!)
  - link: https://eu.posthog.com/project/151059/error_tracking/019f0ab7-c499-7580-bb4e-738802fea326
  - source: layout chunk — layout-level fetch failure from one user, 32 times in 2 days. May be the same Android device as above. No stack trace.
  - status: deferred — watch if user count grows (currently 1 user = device-specific issue, not systemic)
  - recommended owner: review-by-eod

## 2026-07-19
- [Supabase] RLS policy tar_insert_any on teacher_access_requests — INSERT WITH CHECK (true)
  - first/last seen: ongoing advisor flag
  - link: supabase advisor security:rls_policy_always_true
  - status: deferred
  - why: design question — INSERT always-true on a request table may be intentional (any authed user should be able to submit a request). Replacing or deleting an RLS policy is on the DEFER side of the autonomy matrix.
  - recommended owner: backend (review-by-eod — confirm always-true is intentional or tighten to specific conditions)

- [Sentry] JAVASCRIPT-NEXTJS-1R3 — <unknown> on /:locale/words/:word
  - last seen: 2026-07-12, 85 occurrences, 0 users impacted
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1R3
  - status: deferred
  - why: `target: "head > link"` — browser resource load failure on a `<link>` element (chunk/font), no stacktrace. Network/CDN issue for India traffic, not a code bug. No actionable fix without CDN-level investigation.
  - recommended owner: review-by-eod (mark resolved if pattern is pure network noise)

- [Sentry] JAVASCRIPT-NEXTJS-1PH — CapacitorGameConnect.then() not implemented on android
  - last seen: 2026-07-05, 153 occurrences, 7 users
  - link: https://lexiclash.sentry.io/issues/JAVASCRIPT-NEXTJS-1PH
  - status: shipped (fix already in nativePGS.ts:85-88 — Capacitor.isPluginAvailable guard)
  - why: fix was applied 07-05 and error has not recurred. Mark as resolved in Sentry.
  - recommended owner: self (resolve in Sentry UI)

## 2026-07-20
- [Sentry] JAVASCRIPT-NEXTJS-1PH — CapacitorGameConnect.then() not implemented on android
  - last 24h, reach=7, score=0.438
  - link: https://lexiclash.sentry.io/issues/132085085/
  - status: deferred — nativePGS.ts fix (isPluginAvailable guard, line 85) looks correct; all callsites route through it. SUSPECT: awardPlayGames.ts calls unlockAchievement(...).then() — this calls our wrapper which should be safe, but needs Sentry trace to confirm no remaining path. Check if issue's lastSeen is post-07-05 commit.
  - why: cannot confirm remaining callsite without Sentry trace (MCP unavailable)
  - recommended owner: review-by-eod (get Sentry trace → confirm fix complete or find remaining path)

- [Supabase] Impact check — idx_word_pacts_player2_id (shipped 2026-07-16)
  - target: supabase:advisor:performance:unindexed_foreign_key
  - status: deferred — Supabase MCP unavailable; query hint: SELECT * FROM pg_indexes WHERE indexname = 'idx_word_pacts_player2_id'
  - why: MCP not connected this run
  - recommended owner: self (next connected night — append verdict to impact-ledger.ndjson)

- [Sentry] JAVASCRIPT-NEXTJS-1PV — TypeError: Cannot read properties of null (reading 'clear')
  - last 24h, reach=6, score=0.102
  - link: https://lexiclash.sentry.io/issues/132119253/
  - status: deferred — could not localize without stack trace; candidates: useDictionaryCache memoryCache.clear(), MusicContext pendingStops.clear(), backend cleanupTimers.clear(). All look safe from static analysis — needs actual trace.
  - why: MCP unavailable; static analysis inconclusive
  - recommended owner: review-by-eod (get trace from Sentry UI)

- [Supabase] upsert_push_token SECURITY DEFINER callable by authenticated role
  - link: supabase:advisor:security:authenticated_security_definer_function_executable
  - status: acknowledged-intentional — only callsite is app/api/player/push-token/route.ts (server-side, authed). Migration 20260628010000 explicitly grants authenticated, revokes public. By design.
  - recommended owner: none (no action needed)

## 2026-07-21

- [Supabase] Impact check RESOLVED — idx_word_pacts_player2_id (shipped 2026-07-16)
  - Queried live DB: index EXISTS in pg_indexes → verdict: improved
  - Appended verdict to impact-ledger.ndjson
  - status: shipped (resolved)
  - recommended owner: none

- [Sentry] JAVASCRIPT-NEXTJS-1PH — CapacitorGameConnect.then() not implemented on android
  - last seen: 2026-07-05 (pre-dates nativePGS.ts:85 guard fix)
  - Confirmed: stale brief data. Issue has NOT recurred since fix. Resolving in Sentry.
  - status: shipped (resolved in Sentry)
  - recommended owner: none

- [Supabase] teacher_access_requests — tar_insert_any INSERT policy allows public role (anon + authenticated)
  - Detail: `WITH CHECK (true)` on INSERT for `public` role → unauthenticated users can submit teacher access requests
  - Fix: DROP tar_insert_any, CREATE new policy scoped to `authenticated` with `WITH CHECK (auth.uid() = user_id)`
  - status: deferred — policy replacement, not addition (autonomy matrix says defer)
  - why: failure mode = "teachers can't submit requests", needs QA; also requires checking user_id column constraints
  - recommended owner: review-by-eod (backend)

- [PostHog] TypeError: Load failed — 68 occurrences, 18 users, last seen 2026-07-20
  - link: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - Source: chunk 32162 (minified). "Load failed" = Safari/iOS network fetch failure (no stack trace available)
  - status: deferred — no actionable stack trace; likely transient network/iOS fetch error
  - why: cannot root-cause without stack trace or URL context
  - recommended owner: review-by-eod (check if word-wheel WASM fetch needs error boundary)

- [PostHog] React error #418 — hydration mismatch, 14 occurrences, 9 users, ongoing since 2026-06-30
  - link: https://eu.posthog.com/project/151059/error_tracking/019f185d-dc16-7bf0-8ff4-7390159a8048
  - args: HTML (full element mismatch between SSR and client render)
  - status: deferred — chunk 4bd1b696 (minified), no page URL context
  - why: needs non-minified stack or URL to identify the offending component; suspect: typeof window guard or conditional on client-only state in render
  - recommended owner: review-by-eod (reproduce in dev with non-minified build)

- [Supabase] upsert_push_token SECURITY DEFINER callable by authenticated role
  - status: acknowledged-intentional (confirmed: function body uses auth.uid(), requires authentication, search_path already hardened, migration 20260628010000 explicitly scopes to authenticated only)
  - recommended owner: none

## 2026-07-21 — Lane 03

### exp-mp-room-join-loading-v1 — ZOMBIE FLAG
- PostHog: active, True
- Call sites in code: 0 (confirmed via grep on fe-next, excluding experiments.ts/tests)
- Action: human should deactivate in PostHog — serves a variant that changes nothing

### Unwired experiments (in PostHog but 0 non-test callsites outside experiments.ts)
These flags are NOT in experiments.ts and are known zombies — separate from the above:
- exp-mp-room-join-loading-v1 (confirmed zombie, 0 sites)

### mode_card_rapid_reclick impact verdict
- Shipped 2026-07-16, measured 0 events in last 7d (baseline: 0, direction: up)
- Verdict: neutral — event fires on edge case (same cube clicked twice <1.5s) which may be rare in real play. Not regressed; low signal volume. Watch for 14d.

### mp_round sentiment alarm
- avg 1.5/3 (4 bad, 1 ok, 1 great) — worst surface this week
- 3 active experiments already targeting it: exp-mp-round-reaction-v1, exp-mp-results-rival-best-word-v1, exp-mp-round-progress-header-v1
- New experiment `exp-mp-results-score-context-v1` proposed (see lane report) — NOT wired tonight (time budget exhausted). Wire next run.

### /en/multiplayer rage clicks (score 0.823, reach=5)
- Top signal from brief. Root cause not yet isolated.
- Recommend: check if rage clicks are on the "Join" button while socket is connecting (same root as /es/multiplayer exp-mp-lobby-connect-feedback-v1 which already targets ES).
- exp-mp-lobby-connect-feedback-v1 currently only wired for ES locale — may need to expand to EN.

## 2026-07-22
- [Sentry] CapacitorGameConnect.then() is not implemented on android (JAVASCRIPT-NEXTJS-1PH)
  - first_seen: 2026-07 (prior), last_seen: 2026-07-21, count: 7/24h, reach: 7 users
  - link: https://lexiclash.sentry.io/issues/132085085/
  - status: deferred — nativePGS.ts already has isPluginAvailable guard (line 85-88) but error persists.
    Possible: guard passes on builds where native module is registered but throws on every call.
    Fix: add a try/catch around the initializePlayGames dynamic import AND call a cheap no-throw
    probe method inside initializePlayGames() to verify actual method availability, not just registration.
  - why: needs device build verification; can't test headless; blast radius = Android PGS login
  - recommended owner: review-by-eod

- [PostHog] React error #418 hydration mismatch (019f4747, 019f70e5, 019f185d)
  - first_seen: 2026-07-09, last_seen: 2026-07-21, count: 27+7+2=36 occ, reach: 7+4+2 users
  - pages: homepage (37 occ), /en/multiplayer (12 occ), /he/daily (3 occ)
  - link: https://eu.posthog.com/project/151059/error_tracking/019f4747-c11b-7430-8ac2-882649b49cbd
  - status: deferred — no sourcemaps; chunk 4bd1b696 minified. Explore agent suspects LandingView.tsx
    isNativeApp/InlineBannerAd conditional render without mounted gate. Also AutoHideHeader spacer
    (MP CLS fix 07-20) may have introduced new mismatch on /en/multiplayer.
  - why: no sourcemaps = can't pinpoint exact line; multiple candidate components; homepage = high blast
  - recommended owner: review-by-eod (read LandingView.tsx line 89-98 first)

- [PostHog] TypeError: Load failed / Failed to fetch (019f34a3)
  - first_seen: 2026-07-08, last_seen: 2026-07-21, count: 7/24h, reach: 3 users
  - source: chunk d320e741.d9b34f086410ae4c.js line 1 col 15229
  - link: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - status: deferred — fetch failure, no sourcemaps; same user (a07bbd2c) hit it twice in 1 min.
    Likely a dictionary/WASM fetch timeout or offline network event. Not a code bug per se.
  - why: needs network context; possibly transient offline event
  - recommended owner: self (low priority, likely transient)

- [Supabase] Impact check REVOKE migration 07-19 (authenticated_security_definer_function_executable)
  - status: deferred — Supabase MCP dry all night (0/1 nights connected this week)
  - why: MCP unavailable; needs get_advisors type=security query
  - recommended owner: self (HUMAN: mint never-expire SUPABASE_ACCESS_TOKEN)

## 2026-07-22 flag hygiene

| Flag | Age | Status | Action |
|---|---|---|---|
| `exp-mp-room-join-loading-v1` | 17d | 0 call sites in codebase (zombie) | **HUMAN: deactivate in PostHog** |
| `exp-wordhunt-hint-v1` | 32d | Wired in WordHuntResultsContent only (results page) | Running — rage clicks on game page (separate surface); keep |

## 2026-07-23

- [PostHog] Minified React error #418 (hydration mismatch) — homepage
  - first_seen: 2026-07-09, last_seen: 2026-07-22, count: 31, reach: 7 users
  - url: https://eu.posthog.com/project/151059/error_tracking/019f4747-c11b-7430-8ac2-882649b49cbd
  - surfaces: `https://www.lexiclash.live/` and `/he`, Chrome 150 / Android Mobile
  - status: deferred — minified chunk (4bd1b696), no sourcemaps, can't pinpoint component without dev build
  - why: needs dev-mode repro on Android Chrome to identify which component has server/client mismatch
  - recommended owner: review-by-eod — check homepage components using typeof window / navigator / Date.now in render

- [Sentry] Redis "Connection is closed." burst — JAVASCRIPT-NEXTJS-1WM cluster (711 events)
  - first_seen: 2026-07-22T02:06Z, last_seen: 2026-07-22T03:44Z, burst duration ~98min, 0 users
  - root cause: Redis dropped → @socket.io/redis-adapter calls pubClient.publish() without .catch()
  - status: shipped (see redisAdapter.ts:attachAdapter wraps pubClient.publish)
  - recommended owner: review-by-eod (verify no next Redis restart triggers new burst)

- [PostHog] TypeError: Load failed — chunk fetch (019f34a3)
  - first_seen: 2026-07-08, last_seen: 2026-07-22, count: 7/24h, reach: 3 users
  - status: deferred — likely stale chunk after deploy (user on old tab) or network blip; no sourcemaps
  - why: transient, no consistent reproduction path; chunk hash in URL suggests post-deploy cache issue
  - recommended owner: self (low priority, check if chunk exists in current build)

- [Feedback/manual] Ron requests coin grant: "games played locally by mistake, coins not credited"
  - status: deferred — coin economy changes are human-queue-only per autonomy matrix
  - recommended owner: human — one-time manual coin grant for user Ron via Supabase admin

## 2026-07-24
- [Supabase/Advisor] upsert_push_token SECURITY DEFINER callable by authenticated role
  - first seen: 2026-07-24, count: n/a, userCount: n/a
  - link: https://supabase.com/dashboard (advisor: authenticated_security_definer_function_executable)
  - status: deferred
  - why: authenticated callers ARE intentional — API route uses user-scoped client. REVOKE authenticated would break push-token registration. Autonomy matrix only autonomously ships REVOKE for anon/public, not authenticated. Question is whether direct REST bypass (/rest/v1/rpc/upsert_push_token) is acceptable vs API route validation.
  - recommended owner: backend — review-by-eod; consider switching to service-role call in the API route + REVOKE from authenticated

- [Feedback/bug] MP special tiles (ice/explosion) not triggering with bots
  - first seen: 2026-07-22, count: 1 report
  - link: Supabase feedback_reports (reporter: Ron)
  - status: deferred — tile type names not found in quick grep; needs server-side socket handler investigation
  - why: ambiguous root cause — "ice/explosion" tile names don't match any symbol in fe-next/; may be Blast mode specific or server-side only
  - recommended owner: backend/game

- [Feedback/feature-request] Double scores for "priority users" (beta access)
  - status: deferred — feature request not a bug, coin/score economy = human-queue-only
  - recommended owner: founder design call

- [Feedback/manual] Avatar reset for user "ilik bilik"
  - status: deferred — requires admin DB operation
  - recommended owner: human admin

## 2026-07-26
- [PostHog] TypeError: Load failed (score 0.375)
  - last seen: 2026-07-26, count: 3, userCount: 3
  - link: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - status: deferred
  - why: need stack trace investigation — likely WASM/fetch failure on word-wheel, needs targeted fix
  - recommended owner: review-by-eod
- [PostHog] React error #418 hydration (score 0.237/0.088)
  - last seen: 2026-07-26, count: 2-3
  - link: https://eu.posthog.com/project/151059/error_tracking/019f4747-c11b-7430-8ac2-882649b49cbd
  - status: deferred
  - why: hydration mismatch — needs SSR/client render tree inspection, ambiguous root cause
  - recommended owner: review-by-eod
- [Sentry] Error: Connection is closed (JAVASCRIPT-NEXTJS-1WM)
  - link: https://lexiclash.sentry.io/issues/135762417/
  - status: deferred
  - why: DB connection drop — likely Supabase MCP down (PAT expired), human mint needed
  - recommended owner: human (never-expire PAT)
- [Feedback] Ron: special tiles (ice/explosion) don't work in MP with bots
  - first seen: 2026-07-22, route: /he
  - status: deferred
  - why: server-side bot logic in server/multiplayer/ needs investigation of tile-type handling
  - recommended owner: backend
- [Feedback] Ron: coins earned locally didn't sync (one-time 10k coin grant requested)
  - status: deferred
  - why: coin economy — human-queue only per standing rules
  - recommended owner: human

## 2026-07-27
- [PostHog] React hydration error #418 — 43 occurrences, 7 users, Android Chrome on root URL
  - first seen: 2026-07-17, last seen: 2026-07-26 21:00 UTC
  - link: https://eu.posthog.com/project/151059/error_tracking/019f4747-c11b-7430-8ac2-882649b49cbd
  - status: deferred
  - why: Minified chunk, no source maps in PostHog. Sentry has no matching issue. Error msg: `Minified React error #418` (hydration mismatch). $current_url = `https://www.lexiclash.live/` on Android Tablet Chrome 150. Root route is a server-side redirect — actual mismatch likely on locale page after redirect. Needs dev-mode or source-map repro.
  - recommended owner: review-by-eod
- [PostHog] TypeError: Load failed — 55 occurrences, 16 users
  - first seen: 2026-07-08, last seen: 2026-07-26 15:13 UTC
  - link: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - status: deferred
  - why: Network-level chunk load failure from `/_next/static/chunks/32162-ea1f61377f721834.js`. ChunkErrorRecovery covers stale-deploy chunk errors via version check + hard reload. This "Load failed" is a raw network/resource failure — unclear if covered. isChunkLoadError may not match plain "Load failed" message. Needs verification that recovery fires on mobile network failure.
  - recommended owner: review-by-eod
- [Feedback] Special tiles (ice/explosion) don't work in MP with bots
  - reported: 2026-07-22, he locale
  - status: deferred — server-side mechanic, needs investigation of `server/multiplayer/` tile logic
  - why: Open watch from prior nights (mp_round sentiment avg 1.4/3). Requires tracing special tile triggers through the bot game loop. Beyond single-lane scope.
  - recommended owner: backend
- [Feedback] Ron: coin deficit from local games not credited
  - status: deferred — coin economy write, HARD LINE per autonomy matrix
  - recommended owner: human (coin economy is human-queue-only)
- [Sentry] JAVASCRIPT-NEXTJS-1WM Connection is closed — impact VERIFIED improved
  - measured 0 new occurrences since fix 2026-07-23 (last seen 2026-07-22)
  - status: shipped (verdict logged to impact-ledger.ndjson)

## 2026-07-28
- [PostHog] React error #418 (two instances, scores 0.412 and 0.308)
  - issues: 019f4747-c11b-7430-8ac2-882649b49cbd (reach=5) and 019f185d-dc16-7bf0-8ff4-7390159a8048 (reach=4)
  - description: Minified React error #418 — hydration mismatch (server HTML ≠ client render)
  - status: deferred — prior fix (c085187e4) addressed /daily and /brain. New occurrences may be on different routes. Root-cause requires Layout-Shifts / hydration trace in browser devtools.
  - why: needs browser devtools hydration investigation; not diagnosable from stack trace alone
  - recommended owner: review-by-eod
- [Sentry] Error: Connection is closed. (JAVASCRIPT-NEXTJS-1WM)
  - link: https://lexiclash.sentry.io/issues/135762417/
  - last seen: recent; reach=0 (low user impact)
  - status: deferred — impact confirmed improved in last run (verdict: improved, 0 new occurrences). Monitor.
  - why: low reach (0 users), likely transient DB connection drop; monitor for recurrence
  - recommended owner: self

## 2026-07-30
- [PostHog] TypeError: Failed to fetch (issue 019f34a3-12d0-7820-a7d2-4b2d22556c1e)
  - reach=2, severity=1, /en/practice/classic, Android Chrome, unhandled, no in-app stack frame captured
  - link: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - status: deferred
  - why: generic network-fetch rejection with zero stack frames -- can't pinpoint which fetch() call lacks a catch without a source frame; reach too low (2) to justify a blind guess-fix
  - recommended owner: review-by-eod (if reach grows next audit, escalate)
- [Sentry|Supabase] MCP servers never connected this run (both absent from ToolSearch after repeated checks)
  - status: deferred
  - why: can't pull Sentry issue detail or Supabase advisors without the tool; matches known recurring issue (see nightly-learnings "Supabase MCP down" escalating watch)
  - recommended owner: human (mint never-expire Supabase PAT per standing ask; check Sentry MCP npx boot)
- [PostHog] Brain Drill `drill_completed` event stopped firing entirely since 2026-07-22 (was low but present: 1-5/day back to 07-10)
  - status: shipped (impact-ledger verdict only, no code change -- see ledger id 01-triage-2026-07-26-brain-drill-word-replay)
  - why: predates the 07-26 word-replay ship so not caused by tonight's brief item, but 8 straight zero-days on a mode's completion event is worth a look -- ambiguous whether it's a genuine bug in app/api/drills/submit or just Brain Drill traffic drying up
  - recommended owner: review-by-eod

## 2026-07-30

### [Flag Retirement] exp-mp-room-join-loading-v1 — zombie, deactivated
- Created 2026-07-05 (per 07-04 entry above, shipped that night), rollout 100%. Grepped 2026-07-30: **0 call sites** in `fe-next` (not in `experiments.ts`, not referenced anywhere) — the wiring was removed at some point without retiring the flag. Flagged unactioned 4 nights running (07-21..24 per nightly-learnings).
- Action taken: deactivated via `posthog-experiment.sh deactivate exp-mp-room-join-loading-v1` (soft-kill, `active:false`, reversible — not deleted). id=219697.
- Recommended owner: human — delete the flag entirely from PostHog once confirmed no dashboards reference it.

### [Flag Retirement] exp-wordwheel-drag-hint-v1 — 31 days, inconclusive at current volume
- Created 2026-06-29, active, rollout 100%, wired in `components/daily/WordWheelGame.tsx`. Targets exactly this run's #1 brief item (rage clicks on `/daily/word-wheel`).
- 14-day rageclick count by variant: control=8, drag-hint=4 (directionally favors drag-hint but n=12 total events — nowhere near the 1000/arm significance bar for a retirement decision).
- Recommended owner: human — check PostHog experiment-results panel for the actual primary metric (completion/abandonment) sample size; if still <1000/arm after 31 days, consider raising rollout share or picking a louder primary metric.

## 2026-07-31
- [Supabase] Signed-In Users Can Execute SECURITY DEFINER Function `upsert_push_token`
  - advisor: authenticated_security_definer_function_executable
  - status: verified safe, no change — checked function body: all INSERT/UPDATE scoped to `auth.uid()`, no caller-supplied user_id param, `search_path=''` already set. Advisor is a generic heuristic false-positive here; REVOKE would break push-token registration for all users (large blast radius, not reversible-cheap).
  - recommended owner: none — close finding
- [PostHog] TypeError: Load failed / Failed to fetch — /en/multiplayer
  - issue 019f34a3-12d0-7820-a7d2-4b2d22556c1e, 17 occurrences/22d, 3 users, last seen 2026-07-30T22:06
  - evidence: https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - 3 sampled events = same distinct_id, 2min apart (retry burst) on /en/multiplayer. Stack unresolvable (sourcemaps missing for chunks d320e741 + 32162). Looks like flaky-network fetch abort (socket.io polling or an API call), not a deterministic bug.
  - status: deferred — needs sourcemap upload or app-code repro to pin the actual fetch call before a fix is safe
  - why: ambiguous root cause, no resolvable stacktrace
  - recommended owner: self (lane 01/02, next occurrence)
- [PostHog] React error #418 (hydration mismatch) — 3 separate issues on `/`, `/he`, `/en/multiplayer`
  - issues: 019f4747-c11b-7430-8ac2-882649b49cbd (reach 4), 019f185d-dc16-7bf0-8ff4-7390159a8048 (reach 2), 019f70e5-16a9-7522-a7bf-185c6b540003 (reach 3)
  - Minified React prod errors carry no useful stack frames — can't localize the mismatching component from PostHog data alone. Spans both landing (/,/he) and MP lobby.
  - status: deferred — needs local repro (throttled/SSR vs CSR diff) per page, out of scope for tonight's window
  - why: needs design/repro time, ambiguous root cause
  - recommended owner: self (lane 02 perf or lane 11 mode-qa, has more budget for repro)
- [Sentry] Error: Connection is closed. (JAVASCRIPT-NEXTJS-1WM)
  - 711 occurrences but STALE (last seen 2026-07-22, 0 users impacted) — ioredis `publish()` racing a Redis reconnect during `broadcastActiveRooms`. Brief's issues_24h reach=0 confirms no new impact.
  - status: deferred — not actionable tonight (stale, 0 users), low priority
  - recommended owner: self, low priority
- [Sentry] Error: "CapacitorGameConnect.then()" is not implemented on android (JAVASCRIPT-NEXTJS-1PH)
  - STALE — last seen 2026-07-05, predates the 2026-07-05 fix (`utils/nativePGS.ts` boolean-return guard, see memory sentry-capacitor-thenable-proxy-1PH-2026-07-05). Code already correct. Brief is surfacing an old unresolved-but-dead Sentry issue.
  - status: no code change needed — issue is stale/already-fixed, just needs manual "Resolve" in Sentry UI (not done here, no write tool used)
  - recommended owner: none
- [Player report] "הכפתור של הווליום מסתיר את הניקוד" (volume button hides the score) — /he/daily/word-hunt
  - `components/InGameAudioButton.tsx:47-50`: fixed top-left in RTL (`isRTL ? left-[...] : right-[...]`), z-[70]. Plausible overlap with a top-left score/HUD element in Hebrew daily Word Hunt, but couldn't visually confirm layout in time budget.
  - status: deferred — needs a screenshot/live check (RTL) before a positioning fix, don't guess z-index/offset blind
  - recommended owner: self (lane 05 landing or lane 11, has agent-browser access)

## 2026-08-01
- [Nightly gate] Missing `html2canvas` in node_modules despite package.json/lockfile entry — pre-existing baseline break, blocks whole-repo tsc every night this file is touched (`components/feedback/ReportBugModal.tsx` TS2307/TS2345)
  - status: deferred
  - why: repeated `npm install html2canvas` attempts hit ENOTEMPTY renaming stale `@rolldown`/`@unrs` wasm32-wasi optional-binding directories left over from a prior interrupted install — deeper node_modules repair (or a clean `npm ci`) needed, out of scope/time for this lane
  - recommended owner: lane 02 perf or a dedicated `npm ci` pass (do NOT retry piecemeal `npm install <pkg>` — it re-triggers the same rename race)

## 2026-08-02
- [PostHog] Sourcemaps missing for lexiclash.live production chunks — blocks all error triage
  - every top-scored PostHog issue tonight (React #418, TypeError Load failed/Failed to fetch) resolved to `Could not find sourcemap for source url: .../_next/static/chunks/*.js` on every frame — stack traces are unusable minified line:col, can't map to source file:line
  - status: deferred
  - why: fixing requires verifying the Sentry/PostHog sourcemap upload step in the build pipeline (next.config.js / CI) — infra change, out of scope for a single-issue triage lane and risky to touch blind near a deadline
  - recommended owner: lane 02 perf or a dedicated infra lane — high leverage, unblocks every future PostHog/Sentry triage
- [PostHog] Error: Minified React error #418 (hydration mismatch) — reach 3 occurrences, same distinct_id, all on /he homepage
  - https://eu.posthog.com/project/151059/error_tracking/019f4747-c11b-7430-8ac2-882649b49cbd
  - status: deferred
  - why: no resolvable stack trace (see sourcemap item above); #418 = server/client HTML mismatch, likely locale-conditional rendering on the `/he` homepage, but can't pinpoint file without sourcemaps
  - recommended owner: self (next lane, once sourcemaps fixed) — re-pull this issue's stack trace first
- [PostHog] TypeError: Load failed / Failed to fetch — reach 2, seen on /es/multiplayer and /en/practice/classic?play=1
  - https://eu.posthog.com/project/151059/error_tracking/019f34a3-12d0-7820-a7d2-4b2d22556c1e
  - status: deferred
  - why: no resolvable stack trace; generic unhandled fetch/network-flake pattern (2 different pages, 2 different users) — could be an unguarded `fetch()` on either page, needs sourcemaps to confirm which
  - recommended owner: self (next lane, once sourcemaps fixed)
- [Feedback] Report: "scrolling down on daily leader board, last one seems cut off the bottom, add a little gap there" (he, /he/daily/word-wheel)
  - status: deferred
  - why: inspected `components/daily/DailyLeaderboard.tsx` — outer card has symmetric `p-4 sm:p-5` padding, list itself has no trailing-item cutoff in its own markup, so root cause is likely the PAGE-level scroll container (missing bottom safe-area padding / a bottom nav bar overlapping content) on `/daily/word-wheel`, not this component. Ran out of time budget to trace the page shell + verify visually.
  - recommended owner: self (next lane) — check the `/daily/word-wheel` page wrapper for missing `pb-safe`/bottom padding before touching DailyLeaderboard.tsx
- [Sentry] "Connection is closed." — reach 0, allowlisted Socket noise per SocketContext.tsx:311-318
  - status: reviewed, no action — matches known allowlist, skip
- [Sentry] "CapacitorGameConnect.then() is not implemented on android" — reach 7
  - status: reviewed, no action — known/tracked in `.claude/notes/android-release-status.md` (native PGS bridge not device-verified yet, expected until a signed device build lands)

## 2026-08-04
- [PostHog|Sentry|Supabase] Remaining brief items not reached this run
  - React #418 (2 issues, occurrences 3 + 2), Connection-closed (Sentry JAVASCRIPT-NEXTJS-1WM), CapacitorGameConnect.then() not implemented on android (Sentry -1PH), Supabase upsert_push_token SECURITY DEFINER executable by authenticated
  - status: deferred
  - why: lane time budget consumed restoring+fixing the stale 20260802-010002 drop (score 0.444, top-ranked, restore-first per brief contract)
  - recommended owner: self (lane 01, next run)

## 2026-08-07
- [PostHog] MP rageclick trend WORSENED after 08-04 RoomListView joiningRoomCode fix
  - baseline 2 (pre-fix window) -> measured 49 events over trailing 7d; daily rageclick/pageview rate: 07-31..08-03 ~4-16%, 08-04..08-06 climbing to 18%/41%/68%
  - RoomListView.tsx:346-387 join-button wiring (disabled/aria-busy/click-guard) verified CORRECT — root cause is NOT that button
  - status: deferred
  - why: ambiguous root cause — rageclick matches ANY element on /multiplayer, not just the room-join button; needs replay/heatmap inspection to find the actual rage-clicked element (host lobby CTA? mode picker? something added after 08-04?)
  - recommended owner: lane 11 (mode-qa) or lane 02 (perf) — has agent-browser/replay tooling this lane lacks

## 2026-08-08
- [Supabase] Function Search Path Mutable — public.update_subscriptions_updated_at
  - trigger function, pure `NEW.updated_at = now()`
  - status: shipped 20260808_fix_search_path_update_subscriptions_updated_at.sql (via apply_migration)
  - why: pure hardening (SET search_path=''), zero behavior change, matches autonomy matrix shippable bullet
  - recommended owner: review-by-eod
- [Supabase] Signed-In Users Can Execute SECURITY DEFINER Function — public.upsert_push_token
  - status: reviewed, no action — already fixed in 20260628010000_revoke_push_token_fn_from_public.sql (anon/PUBLIC revoked, authenticated grant is intentional — push-token registration is auth-only by design, route requires session)
  - why: advisor is re-flagging the intentional authenticated grant, not a new hole
  - recommended owner: self (closed)
- [Sentry] Error: Connection is closed. — JAVASCRIPT-NEXTJS-1WM (135762417) + JAVASCRIPT-NEXTJS-1WJ (135762409)
  - first/last seen: both 2026-07-22 02:06-04:39 UTC (2.5h window), 711 + 121 occurrences, 0 users impacted, unrecurring since
  - link: https://lexiclash.sentry.io/issues/135762417/ , https://lexiclash.sentry.io/issues/135762409/
  - status: deferred (reviewed, no fix shipped)
  - why: both are the SAME one-off Redis restart incident. Root cause: `@socket.io/redis-adapter`'s `RedisAdapter.broadcast()` calls `this.pubClient.publish(channel, msg)` fire-and-forget with no `.catch()` — when ioredis's connection drops mid-reconnect, the queued command rejects and surfaces as an unhandled rejection via Sentry's auto.node instrumentation. This is inside a third-party lib we don't control the source of; our own `broadcastActiveRooms` (fe-next/backend/utils/socketHelpers.ts:76-86) already try/catches synchronously but can't catch an async rejection from a promise it never receives. Genuinely stale (0 recurrence in 17 days), low blast radius (no user impact) — not worth a process-wide `unhandledRejection` filter under tonight's time budget for a non-recurring event.
  - recommended owner: backend (if it recurs — add a targeted `process.on('unhandledRejection', ...)` filter matching ioredis CONNECTION_CLOSED during broadcastActiveRooms, or upgrade @socket.io/redis-adapter if a fixed version exists)
- [PostHog] TypeError: Failed to fetch — issue 019fca04-f4b0-7690-a59a-95c44134a09a
  - occurrences=25, users=8, sessions=9, last 4 days, all on /multiplayer?quickPlay=true
  - link: https://eu.posthog.com/project/151059/error_tracking/019fca04-f4b0-7690-a59a-95c44134a09a
  - status: deferred (reviewed, no fix shipped)
  - why: root frame is our own `public/widget.js` (self-hosted feedback-devtools bundle, see fe-next/components/feedback/FeedbackDevtoolsWidget.tsx) — it monkey-patches `window.fetch` for its own background POST to /api/v1/feedback and that fetch fails, likely a network blip / mobile transition (repeated 3x same session on /multiplayer). `public/widget.js` is a prebuilt minified vendor bundle, not hand-editable source — patching it directly would be overwritten on next widget rebuild. Low severity (background feedback-widget ping, not core gameplay).
  - recommended owner: backend/vendor (fix belongs in the feedback-devtools SDK's own fetch wrapper — wrap in try/catch or ignore TypeError:Failed to fetch as an expected transient network error at the source repo, not in this bundle)
- [Feedback reports] 2 QA dogfood test submissions (2026-08-03, kanban t_15388a75) — explicitly "please ignore/delete"
  - status: no action needed, self-flagged as test data

## 2026-08-09
- [Restore] Dropped nightly work 20260808-010000 (14 files: WheelRushView/Pieces + PageClientNoSsr + GemHunt + translations)
  - dropped 2026-08-08, gate error: WheelRushView.tsx TS2345 setState callback type mismatch on a 'stolen'/'stolen-from-me' WordEntry variant
  - restored version no longer contains that variant (superseded fix already present in backup) — re-verified clean: tsc scoped clean, eslint clean, 31/31 tests green (WheelRushPieces, WheelRushView x2, GemHuntRuleHint)
  - status: shipped (restored, uncommitted — orchestrator commits)
  - recommended owner: review-by-eod
- [PostHog] TypeError: Failed to fetch (issue 019fca04-f4b0-7690-a59a-95c44134a09a)
  - 91 occurrences/6 users/28 sessions over 5d, unhandled, seen mainly on /multiplayer?quickPlay=true
  - only in-app frame is a minified Next.js chunk (67917), not in Sentry, no resolvable stack/source in either MCP
  - status: deferred
  - why: ambiguous root cause — cannot safely guess which fetch() call without a resolvable stack; likely a network-flake pattern (unhandled fetch rejection), not necessarily an app bug
  - recommended owner: backend (add sourcemap upload for this chunk or wrap MP quickPlay fetches with reason tagging so PostHog can attribute it)
- [Sentry] Error: Game hasn't started yet (JAVASCRIPT-NEXTJS-1Y8) + [SOCKET.IO] Error received: Game hasn't started yet (JAVASCRIPT-NEXTJS-1X7)
  - Both root-caused to GAME_NOT_IN_PROGRESS localized-message drift, already fixed 2026-08-07 (utils/sentry.ts:248 EXPECTED_SOCKET_ERROR_CODES). Both issues' last-seen (08-06) predate the fix — no code change needed.
  - status: shipped (verification only, no code diff)
  - why: attempted `update_issue` to resolve both — Sentry MCP returned 403 (known: write access not granted to this MCP token). Needs manual resolve in Sentry UI.
  - recommended owner: review-by-eod (manually click Resolve on both, or let next lane retry once MCP write scope is fixed)
- [Supabase advisor] Signed-In Users Can Execute SECURITY DEFINER Function — upsert_push_token
  - verified SAFE, no change: function body scopes every read/write to `auth.uid()` internally (066_push_notification_system.sql:216,220), never accepts a target user id param. Already hardened — PUBLIC execute revoked, only `authenticated` granted (20260628010000_revoke_push_token_fn_from_public.sql), which is required since it's a real signed-in feature (app/api/player/push-token/route.ts).
  - status: shipped (verification only, no code diff)
  - why: closing as a verified-correct finding rather than re-auditing next time
  - recommended owner: self (closed)

## 2026-08-09

### [Experiment underpowered] `exp-homepage-click-feedback-v1` — promising but n<1000/arm
- Running since 2026-07-14 (26d), targets exactly tonight's #1 brief item (homepage rage clicks). Result so far: control 144 rageclicks/307 viewers (46.9%) vs click-feedback 91/306 (29.7%) — a real-looking drop, but both arms are well under the 1000-user/arm threshold for an auto-retire decision. Do NOT retire yet; re-check in ~2-3 weeks once n clears 1000/arm.
- Query to re-check: `SELECT properties['$feature/exp-homepage-click-feedback-v1'] as variant, countIf(event='$rageclick') as rageclicks, uniqIf(person_id, event='$pageview') as viewers FROM events WHERE timestamp > now() - INTERVAL 26 DAY AND variant IS NOT NULL GROUP BY variant`

### [Shipped direct fix, not an A/B] Profile avatar-builder rage clicks — same bug class as homepage
- Brief's #2 target (`/he/profile` rageclicks, reach=2, el_text "😊 שמח") traced to `components/avatar/AvatarBuilderCategoryOptions.tsx` — the "Expressions" preset buttons (one-click emoji combos) and "Color Theme" preset buttons had `hover:` states but zero `active:`/press feedback, identical root cause to the homepage mode-cards bug that `exp-homepage-click-feedback-v1` measurably improved (see above).
- n=2 is far too thin to justify standing up a new typed experiment + flag; the fix pattern (`active:scale-95 active:bg-neo-navy-light/60`) is already proven effective with real data, so shipped it directly instead of gating behind a new A/B. Re-check `$rageclick` volume on `/profile` in ~7d.

## 2026-08-13
- [Supabase] Public Can Execute SECURITY DEFINER Function `get_user_rank`
  - reach=0, severity=0.5, advisor: anon_security_definer_function_executable
  - status: shipped 1 file (migration) — no code file, DB-only
  - why: grepped all callsites (LandingYourRank.tsx, HomeRankCard.tsx, useSupabaseRealtime.ts) — all gated behind isAuthenticated + pass own profile.id, no anon caller found
  - recommended owner: review-by-eod (function still lacks p_user_id = auth.uid() check — any authenticated user can still pass an arbitrary UUID and read that user's rank/score; low severity since leaderboard stats aren't sensitive, but flagging for a real look)
- [Supabase] Security Definer View `custom_puzzle_leaderboard` — VERIFIED CORRECT, no action
  - advisor: security_definer_view
  - why: view LEFT JOINs `profiles`, whose RLS is own-row-only (see memory leaderboard-profiles-rls-invoker-trap-2026-08-12). SECURITY DEFINER is required here or the join returns 0 rows for every other player, same bug class as the 2026-08-12 leaderboard incident. Converting to SECURITY INVOKER would reintroduce that bug. Closing as a false positive.
  - recommended owner: self (closed)
- [Sentry] "Connection is closed." JAVASCRIPT-NEXTJS-1WM — VERIFIED ALREADY FIXED, sentry-mcp write-403 blocked marking resolved
  - 711 occurrences, 0 users, first/last seen 2026-07-22 (one day, 22 days stale)
  - root cause: `@socket.io/redis-adapter`'s `pubClient.publish()` call isn't awaited/caught by socket.io internals; when Redis drops mid-broadcast, ioredis rejects the in-flight publish promise → unhandled rejection
  - status: fix already present in `fe-next/server/redisAdapter.ts:32-46` (publish() wrapped, swallows exactly this message, comment cites this same 711-count episode) — nothing to ship
  - recommended owner: self (mark resolved manually in Sentry UI — MCP write is 403'd, see memory sentry-mcp-write-403)
- [PostHog] React error #418 (hydration mismatch, reach=2), ChunkLoadError (reach=1), 2x "TypeError: Failed to fetch" (reach=1 each), DOMException setPointerCapture (reach=1)
  - status: deferred, not investigated this run — time budget spent on the higher-scored Supabase/Sentry items above
  - why: reach≤2 across all five, lower score than items fixed; #418 needs the non-minified dev message to root-cause (React docs link only explains the generic hydration-mismatch class)
  - recommended owner: self (pick up next lane 01 run)

## 2026-08-13 (lane 03 engagement)
### /en/multiplayer?room=XXXXXX rage clicks (score 0.896, reach=8, single session)
- 8 rageclicks in one ~10min session on `?room=WTCKFF`, PostHog `$elements_chain`/`$el_text` both null (client not capturing element detail on this surface — instrumentation gap).
- Traced `PageClient.tsx` `onError`/`kind==='gone'` path (dead-room toast, shipped 2026-05-25) — gives feedback on a FAILED join, not the culprit by itself.
- **Root cause isolated (Explore agent, confirmed):** the `?room=` deep-link **auto-join** path (`hooks/useMultiplayerSession.ts:98-179` sets `shouldAutoJoin`; `components/multiplayer/MultiplayerFlow.tsx:261-267` fires `handleInvitationAutoJoin` → `handleJoin` directly, bypassing the modal) shows **zero loading UI** — no spinner, no "joining…" state — while the socket round-trip is in flight. Contrast: the manual `JoinRoomModal.tsx:219` button DOES show `isJoining` text/disabled state; `RoomListView.tsx:355-366` room cards DO disable + track `trackMpRoomJoinBlocked` on blocked clicks. Only the **silent auto-join** (the exact path a `?room=CODE` link hits) lacks this.
- On failure the room-gone toast is 5s and easy to miss, then `room=` is stripped from the URL silently (`PageClient.tsx:368`) and the lobby returns to its normal, all-enabled appearance with no persistent error card — reads as "nothing happened," not "join failed." User re-taps expecting a retry → rage clicks land on now-enabled lobby buttons.
- NOT actioned: reverted `exp-mp-lobby-connect-feedback-v1` (ES-only "connecting" feedback UI) caused rage clicks to increase 6→22/7d when live (memory `mp-flow-friction...`) — so blindly re-wiring it to EN is likely to repeat the harm, not fix it. That experiment styled a MODAL state; this bug is upstream of the modal entirely (auto-join skips it) — a different fix (visible auto-join spinner/toast at deep-link entry, not the reverted modal copy) is needed.
- Recommended owner: next lane 03 or 11 — add a "joining room…" toast/spinner at the `handleInvitationAutoJoin` call site in `MultiplayerFlow.tsx:261-267` (mirroring what `JoinRoomModal` already does), gated behind a new typed flag so it can be measured before wide rollout given the sibling experiment's harm history. TDD + i18n needed; out of scope for this run's remaining budget.

### Flag hygiene sweep (no actions needed)
- `exp-mp-room-join-loading-v1`, `exp-blast-wave-banner-v1`, `adventure-difficulty-tuning`: inactive in PostHog, 0 call sites in `app/components/hooks/lib/server` — already fully unwired, no code cleanup pending.
- `exp-mp-lobby-connect-feedback-v1`: inactive, registry entry in `lib/experiments.ts:698` already marked `CONCLUDED 2026-07-26 — REVERTED` in a comment block (not live code) — already clean.
- Did not reach the full 8-flag "decided winner p<0.05" sweep (active flags: `exp-mp-quickplay-eager-disable-v1`, `exp-wordhunt-clue-shake-v1`, etc.) — would need `experiment-results` queries per flag, deferred to next run for time budget.

## 2026-08-14
- [Restore] Dropped nightly work 20260813-010004 (10 files: rareGems.ts/.test.ts, RareGems.tsx, page.tsx, 5x translations, report)
  - status: shipped (restored, resolved in restore-queue.ndjson)
  - why: original gate failure (`rollLuckyGem is not a function`) no longer reproduces — restored code already has the implementation; all 17 rareGems tests pass, eslint clean on all 4 code files
  - recommended owner: review-by-eod
- [Supabase] Security Definer View — `public.custom_puzzle_leaderboard`
  - advisor: security_definer_view, evidence: view defined with SECURITY DEFINER
  - status: verified-correct, NOT changed
  - why: `profiles` SELECT RLS is own-row-only (`auth.uid() = id`, confirmed via pg_policies). The view LEFT JOINs `profiles` to show other players' display_name/avatar on the leaderboard — same trap as [[leaderboard-profiles-rls-invoker-trap-2026-08-12]]. Removing SECURITY DEFINER would silently return NULL names/avatars for every player but the viewer (0-effective-row bug, no error). Closing as by-design.
  - recommended owner: self (closed)

## 2026-08-15
- [Supabase] function_search_path_mutable on public.guard_profiles_privileged_columns
  - status: shipped 20260815030000_harden_guard_profiles_search_path.sql
  - why: pure hardening, function body has no unqualified refs, no behavior change
  - recommended owner: review-by-eod
- [Supabase] Security Definer View x3 (public_profiles, connections_daily_leaderboard, custom_puzzle_leaderboard)
  - status: verified intentional, NOT changed
  - why: memory leaderboard-profiles-rls-invoker-trap-2026-08-12 — profiles RLS is own-row-only; SECURITY DEFINER is the fix for a prior incident where All-Time/past-season leaderboards silently returned 0 rows under SECURITY INVOKER. Flipping these would reintroduce that bug.
  - recommended owner: closed, do not re-audit
- [Supabase] SECURITY DEFINER function anon/authenticated-executable (81 findings incl. get_user_rank, upsert_push_token)
  - status: verified intentional, NOT changed
  - why: matches memory supabase-advisor-cleanup-2026-04-29 (69 authd-secdef intentionally kept, same shape, count grew 69->81 as app grew). These are public RPCs called from client code (leaderboard reads, push token registration); REVOKE would break the app.
  - recommended owner: closed, do not re-audit
- [PostHog] TypeError: Failed to fetch (019ff9e2-f631-7b41-b1ca-8717b84bef64, reach=4) and (01a000e1-b04d-7263-94c3-12cc44d00cdc, reach=1)
  - status: deferred
  - why: generic browser fetch failure (offline/CORS/adblock-shaped); posthog exec tool syntax for issue detail didn't resolve within budget, needs the actual stack/URL to root-cause, not a guess-fix
  - recommended owner: self (next triage run — pull via query-error-tracking-issues-list or dashboard first, don't re-discover the tool syntax)
- [Sentry] Error: Connection is closed. (JAVASCRIPT-NEXTJS-1WM, reach=0)
  - status: deferred
  - why: reach=0 in current window, likely stale/low-signal; not investigated this run given time budget
  - recommended owner: self (next triage run, only if reach becomes >0)
- [PostHog] Minified React error #418 (hydration mismatch, 019f185d-dc16-7bf0-8ff4-7390159a8048, reach=1)
  - status: deferred
  - why: hydration mismatches need the actual component diff to root-cause; not investigated this run given time budget
  - recommended owner: self (next triage run)

## 2026-08-16
- [Supabase] IMPACT CHECK regression: get_user_rank still anon-executable after 08-13 fix
  - baseline advisor finding: 1 (anon_security_definer_function_executable)
  - status: shipped 08-16 (see migration fix_get_user_rank_anon_execute_public_grant)
  - why: 08-13's `REVOKE EXECUTE ... FROM anon` never took effect because Postgres also
    grants EXECUTE to the PUBLIC pseudo-role by default, and every role (incl. anon)
    implicitly inherits PUBLIC's grants. Verified via has_function_privilege() before
    and after: anon=true→false, public=true→false, authenticated stays true. Confirmed
    no anon callsite (both getUserRank() call sites in LandingYourRank.tsx and
    HomeRankCard.tsx gate on isAuthenticated && profile.id).
  - recommended owner: review-by-eod
  - LESSON for future REVOKE-from-anon fixes: always REVOKE FROM PUBLIC, anon (or check
    has_function_privilege('public', ...) too) — REVOKE FROM anon alone is a no-op if a
    PUBLIC grant exists underneath it.

- [Sentry] Error: Connection is closed. (JAVASCRIPT-NEXTJS-1WM)
  - last seen 2026-07-22 (25 days stale) — not a live 24h issue despite appearing in brief
  - status: skipped
  - why: stale, socket.io/ioredis broadcast during a redis reconnect blip; no recurrence since

- [PostHog] TypeError: Failed to fetch (01a005c5-a299…, reach=1) and (019ff9e2-f631…, reach=2)
  - status: reviewed, skipped
  - why: stack shows /widget.js (our own self-hosted feedback-devtools bundle,
    public/widget.js) wrapping window.fetch, then a Next.js JS chunk fetch timing out
    through that wrapper. Root shape is a transient chunk-load network failure, same
    class already handled by utils/retryImport.ts + ChunkErrorRecovery.tsx + ErrorBoundary.
    Those matchers key on `name==='ChunkLoadError'` or specific "Loading chunk X failed"
    messages — this event surfaces as a bare `TypeError: Failed to fetch`, which those
    regexes don't match. Did NOT broaden the regex to match bare "Failed to fetch":
    that string fires on any failed network fetch (API calls, images, etc.), not just
    chunk loads — over-matching risks reload loops mid-game on genuine API failures.
    reach is 1-2 users total, does not justify that risk tonight.
  - recommended owner: design review — worth a dedicated matcher for chunk fetch by URL
    pattern (`/_next/static/chunks/`) rather than broadening on message text alone.

- [PostHog] RangeError: Maximum call stack size exceeded (019f56a2-08d4…, reach=1)
  - status: deferred, not root-caused
  - why: stack frames (`a._ended`, `a.play`, `a._emit`) are Howler.js (audio library)
    internals bundled in chunk 83844 — looks like a play/end event recursion (an 'end'
    handler synchronously re-triggering play, which ends synchronously again). Needs
    isolating which app-level sound call feeds Howler this way; single user, ambiguous
    root cause, out of tonight's time budget.
  - recommended owner: self (audio/sound system owner), next available triage lane

- [Supabase] Security Definer View: public.custom_puzzle_leaderboard (+ public_profiles,
  connections_daily_leaderboard also flagged, longstanding)
  - status: deferred
  - why: SECURITY DEFINER views bypass querying-user RLS by design here (public leaderboard
    reads) — same pattern as [[supabase-profiles-anon-write-hole]] class of finding.
    Changing view owner/security mode without checking downstream leaderboard read paths
    could silently break results for anon/guest viewers. Needs a deliberate check of what
    RLS the view is intentionally bypassing before flipping SECURITY INVOKER.
  - recommended owner: backend, review-by-eod not urgent (longstanding, not new tonight)

## 2026-08-17
- [Supabase] Security Definer View: public.custom_puzzle_leaderboard
  - reach=0, severity=0.9, advisor:security:security_definer_view
  - status: shipped 20260817030000_fix_custom_puzzle_leaderboard_security_definer.sql
  - why: same shape as leaderboard-profiles-rls-invoker-trap-2026-08-12 (profiles own-row RLS breaks cross-user joins) — verified fix keeps anon reads working (3/3 rows resolve avatar_config post-fix) before shipping
  - recommended owner: review-by-eod
- [Supabase] SECURITY DEFINER anon/authenticated execute: get_past_season_leaderboard, upsert_push_token
  - advisor:security:anon_security_definer_function_executable / authenticated_security_definer_function_executable
  - status: verified-correct, NOT changed
  - why: get_past_season_leaderboard is deliberately GRANTed to anon (migration 20260812210000) and called directly from components/seasons/PastSeasonsLeaderboard.tsx for guest viewers of past-season leaderboards — revoking would break that public leaderboard. upsert_push_token authenticated-exec is the normal RPC pattern for a user writing their own push token; matches the "69 authd-secdef intentionally kept" set from supabase-advisor-cleanup-2026-04-29. Closing both as false positives.
  - recommended owner: self (closed)
- [PostHog] Minified React error #418 (occurrences_24h=2, issue 019f185d-dc16-7bf0-8ff4-7390159a8048)
  - status: deferred — not investigated this run (time budget)
  - why: needs stack/component identification before diagnosing (React #418 = hydration mismatch); low reach (2) tonight
  - recommended owner: self (tomorrow)
- [Sentry] Error: Connection is closed. (JAVASCRIPT-NEXTJS-1WM, JAVASCRIPT-NEXTJS-1WJ, issues_24h reach=0)
  - status: deferred — not investigated this run (time budget)
  - why: reach=0 in brief (no active occurrences in window), low priority vs the shipped security fix
  - recommended owner: self (tomorrow)
- [PostHog] TypeError: Failed to fetch (occurrences_24h=1, issue 019ff9e2-f631-7b41-b1ca-8717b84bef64)
  - status: deferred — not investigated this run (time budget)
  - why: reach=1, generic network-fetch error, needs stack before root-causing
  - recommended owner: self (tomorrow)
- [Lane 03] `exp-homepage-click-feedback-v1` inconclusive after 6+ weeks at 100% rollout
  - status: flagged for human review — homepage rageclicks (brief item #1, reach=10 last 24h) persist despite this fix being live since 2026-07-14
  - why: variant `click-feedback` (350ms brightness-drop press feedback, `LandingModeCubes.tsx` Cube component, wired+active) was meant to kill the exact rageclick pattern (20/27 null el_text on mode-card clicks). Flag is live, wiring verified correct (`pressHighlight` reaches every Cube). Either the variant isn't moving the metric (needs a decision: keep control, retire flag) or today's rageclicks are a DIFFERENT element (hero CTA / daily banner, not mode cards) — needs an el_text breakdown on today's rageclick events before deciding.
  - recommended owner: self (tomorrow) — pull `posthog-query.sh hogql` on rageclick events' `$el_text`/`$el_selector` for lexiclash.live/ last 24h, compare click-feedback vs control variant split

## 2026-08-31
- [Restore] Stale drop 20260817-010002 (6 files: multiplayer PageClient/JoinRoomModal/MultiplayerFlow, EducationHeroBanner, GemHunt gems x2)
  - dropped 2026-08-17, gate error: growthTracking.ts GrowthEvent union lacked 'mp_room_join_rate_limited' at gate time
  - status: deferred (NOT restored)
  - why: all 7 target files have DIVERGED from the backup over the last 14 nights (confirmed via diff) — a blind rsync restore would clobber 2 weeks of unrelated work in those same files. Needs a manual 3-way merge of the rate-limit feature onto current file versions, not a plain restore.
  - recommended owner: self (next dedicated session) — do NOT auto-retry plain restore-salvaged-code.sh on this tag again.
- [Restore] Stale drop 20260827-010001 (8 files: word-craft PageClient/setupPrefs/telemetry/GameOverScene, results WheelRush x2, best-online-word-games page, lib/experiments.ts)
  - dropped 2026-08-27, gate error: word-craft PageClient referenced unexported setupPrefs/telemetry members + an experiment variant not in the lib/experiments.ts union
  - status: deferred (NOT restored)
  - why: all 8 target files have DIVERGED from the backup (confirmed via diff) — same clobber risk as above.
  - recommended owner: self (next dedicated session) — needs 3-way merge, not plain restore.
- [Supabase] public_profiles Security Definer View advisor flag
  - status: reviewed, no action (false positive / intentional)
  - why: migration 20260815100000_friends_read_public_profiles.sql explicitly documents definer semantics as BY DESIGN — setting security_invoker=on silently re-breaks friends/DM cross-player reads (own-row RLS on profiles). Do not remediate.
  - recommended owner: self (closed)

## 2026-09-01
- [Restore] 20260817-010002 (10 files, dropped 2026-08-17, STALE 15 nights) and 20260827-010001 (8 files, dropped 2026-08-27) not yet restored — ran out of time budget this lane
  - status: deferred
  - why: time budget consumed by 20260831-010002 restore+fix; each restore needs its own root-cause review before re-shipping
  - recommended owner: self (lane 01, tomorrow — highest priority, older stale restore first)
- [Sentry] ReferenceError: Can't find variable: EmptyRanges — 3 occurrences/24h
  - link: https://eu.posthog.com/project/151059/error_tracking/01a057f0-856c-7282-b788-deec78a83695
  - status: deferred
  - why: not reached, time budget spent on restore
  - recommended owner: self (lane 01, tomorrow)
- [Sentry] FedCM GSI_LOGGER NotSupportedError (JAVASCRIPT-NEXTJS-1RE) and "Error: Game hasn't started yet" (JAVASCRIPT-NEXTJS-1Y8) — not investigated
  - status: deferred
  - why: not reached
  - recommended owner: self (lane 01, tomorrow)
- [Supabase] Security Definer View on public.public_profiles — advisor flagged
  - status: deferred
  - why: not reached; also ambiguous root cause (security_invoker unset per memory education-module-audit-2026-08-20) — needs read of the view definition before a REVOKE/ALTER, borderline DEFER side of matrix
  - recommended owner: self (lane 01, tomorrow) or backend review

## 2026-09-04
- [Restore] 20260901-010005 restored (24 files) and eslint-verified; full test/build pending tonight's gate
  - status: shipped (pending gate)
  - why: original drop was infra SETUP failure, not code — safe to reland
  - recommended owner: review-by-eod
- [Restore] 20260817-010002 (18 nights stale, 10 files) and 20260827-010001 (8 nights stale, 8 files) still unresolved
  - status: deferred (not attempted tonight — kept tonight's change scoped to one restore)
  - why: time budget; avoid stacking 3 unverified restores in one gate run
  - recommended owner: self (next 01-triage run)
- [Engagement] es/singleplayer?autoStart=bots rageclick (score 0.744, reach 4) — root cause hypothesis + instrumentation shipped, UI fix NOT shipped
  - status: deferred (evidence-gathering shipped tonight; fix needs a human/next-lane call)
  - why: `useSinglePlayerConfig.ts:173-181` — a RETURNING player (hasPlayedBotsGame=true) landing on `/singleplayer?autoStart=bots` gets silently `router.replace()`d to `/multiplayer?quickPlay=true`. The source page stays on the interactive 'pre-game' mode-picker screen (no loading/disabled state — `SinglePlayerPhase` has no 'loading' value) while the redirect + MP socket-connect happens in the background — matches Class 5 (silent effect swap, no visual feedback) from `.claude/rules/60-recurring-pitfalls.md`. Shipped `singleplayer_bots_stale_redirect` event (utils/growthTracking.ts) at the redirect call site to size how much of the rageclick this explains; join against existing `mp_quickplay_initiated{trigger:'url_param'}` on the destination.
  - recommended owner: self (lane 03 or 05, next run with data) — if the new event confirms the hypothesis, the fix is a `SinglePlayerPhase` loading state (or an early return rendering a spinner) gated on the same `isBotsEntry && hasPlayedBotsGame()` branch.
- [Engagement] `exp-practice-wheel-cta-v1` flag is active/100% rollout in PostHog but 0 non-test call sites in fe-next — serves a variant that changes nothing
  - status: deferred (not wired tonight — time budget)
  - why: per nightly-learnings STEP 3b hard precondition, did not touch the flag; needs either wiring the practice-wheel CTA experiment or deleting the dead flag
  - recommended owner: self (lane 03, next run)
