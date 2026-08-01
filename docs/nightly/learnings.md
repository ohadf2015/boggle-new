# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-25..07-31 (7 nights).** **Correction to last night's headline: gate false-drops were NOT 0 — 07-30 dropped 8 code files after a 2h22m re-gate loop (03:44→06:06).** The log names the cause: every offender the parser surfaced was *non-authored*, so the peel loop ignored them, re-gated without lint, still hit `rc=1`, and called that "unattributable" → docs-only salvage. That residual `rc=1` **was the 4 known baseline-red test files.** They are no longer a tax — they are the direct cause of a code drop. Second correction: **pre-lane latency is INTERMITTENT, not chronic** — 5 of 7 nights reached lane 1 in 6–52 min (07-30: 14 s; 07-31: 16 min). Only 07-25 (5h03m) and 07-29 (4h23m) stalled, and both were load events, not a fixed bug. Tonight (07-31) was the cleanest night of the window: 5 lanes, 0 failures, all kept files.

## FOUNDER DIRECTIVE — highest priority
- **2026-07-30 (sealed-bid, binding):** lane 11 drove sealed-bid **45→79%** in 5 nights, 0 reverts. **6 consecutive nights** the verdict has been "needs 1–2 more nights," always blocked on the same thing: a **visual-QA screenshot** that agent-browser cannot take because a cookie-consent overlay renders outside the a11y tree. **Fix the tooling (pre-seed the consent cookie/localStorage before first navigation), then promote.** Do NOT re-audit code paths already verified clean. 07-31 added two open items: MP ≥2-player clash scoring unverified, and the `+{r.points}` RTL sign minor.
- **2026-07-22→07-26 (Brain Drill BUILD vote — CLOSED):** shipped 07-26. `drill_completed` = 0/7d and died 07-22, predating the ship — no traffic to validate against. Don't re-ship; surface Brain Drill somewhere discoverable before measuring again.
- **2026-07-26 (`polish:try` votes — both resolved):** `sealed-bid` Elo badge SHIPPED 07-28. `blast` Instinct Star is **out of scope** — Blast is PUBLIC. Pruned.
- **ADMIN-BETA TARGET LIST (corrected 07-29, still current).** NOT admin-gated, never pick as STEP 0 targets: `blast`/`blast/v2`, `crossword` (noindex-only), `shiritori` (graduated 07-23), `word-tower` (graduated 07-20), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06 — any pitch naming these is dead). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`.** Rotate within those three only.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language" angles, link a live MODE. **Lane 08 owns; 04/06 feed topics.** Blocked on a repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7 days)
- **2 callbacks total, both founder (`of201`), both on 07-26** — and **nothing since**. Five straight days of zero. Three consecutive windows at ≤2/wk: **the Telegram card CTA is effectively dead as a steering channel.** Stop adding buttons; surface fewer, higher-stakes ones, or accept the loop is unsteered and optimize for autonomy instead.
- **0 `night:good`, 0 `night:meh`** → no run-quality signal, far below the 3-meh self-critique threshold. Notable given 07-25 shipped nothing and 07-30 lost 8 code files.
- **2 `polish:try`** → `sealed-bid` Elo badge (shipped 07-28), `blast` Instinct Star (dead — public mode). **The vote-generating lane MUST check the admin gate BEFORE offering a polish idea**, or founder votes are spent on unactionable targets.
- **0 `idea:build`, 0 `reddit:*`, 0 `mode:keep/drop/promote`.**

## What works (validated this week)
- **Fallback gate tiers beat drop-all — but only when the offender is attributable.** `baseline-red` and `typecheck-tier` carried 07-26/27/28/29 and shipped every time. **07-30 is the counterexample that defines the limit:** when the named offenders are all *non-authored*, the peel loop ignores them, exhausts its tiers, and falls through to docs-only salvage anyway. The tier is right; its termination condition is wrong. (validated with a named failure mode)
- **Stacked-incremental mode audit (lane 11: sealed-bid 45→79% over 5 nights, 0 reverts)** — one fix per night in dependency order, TDD test per fix. Second mode running (shiritori 42→90 prior window). **But it has now plateaued 6 nights on a tooling blocker — the pattern needs an escape hatch: when 2 consecutive nights give the same verdict, escalate the blocker instead of re-auditing.** (validated, with a new failure mode)
- **Supabase Management API raw-SQL fallback (lane 02, 07-30)** — applied a 3-night-stale RLS-initplan migration live *without* MCP. **MCP is no longer load-bearing for DB work** — treat a failed probe as informational, never a blocker. Confirmed again 07-31 (probe failed attempt 1, recovered, cost 96 s). (validated, unblocks a 30-night carry)
- **Verify-already-correct and CLOSE the finding (lane 11, 07-27 + 07-30)** — `picks`-reset-in-render re-validated as React-18-blessed and closed; double-submit + disconnect paths verified clean vs the Class-3 checklist. A night that ships 0 files but retires 3 phantom findings is a real win. Write the verdict down so it isn't re-audited. (validated)
- **Root-cause a dead counter at the shared funnel, not the caller (lane 12, 07-30)** — `push_prompt_shown` cratered 20→3 because `lexiclash_games_played` only incremented as a side effect of `coinManager.addCoins()`, so coinless completions never counted. Fix went into `trackGameEnd`, the funnel every mode routes through — same shape as the 07-25 `games_completed_count` fix. **Grep a gate's WRITERS before tuning its threshold.** (validated x2)
- **Same-run flag+event WIRE, then create the flag (lane 03)** — `exp-mp-quickplay-eager-disable-v1` wired 07-28, flag created live 07-29. Lane 03 also added a `deactivate` verb to `posthog-experiment.sh` and used it the same night to kill a 4-night zombie flag. **Give a lane the write-side verb and the nightly log-only finding disappears.** (validated)
- **Revert on measured harm, same night (lane 03, 07-26)** — `exp-mp-lobby-connect-feedback-v1` drove rage clicks 6→22 over 7d; reverted immediately. The revert WAS the highest-value action of that lane-night. (validated)
- **docs-only salvage protects master** — every gate-fail drops lane CODE before push; 0 pushed-code reverts in 50+ nights. Cost is real (8 files, 07-30) but master stays green. (doctrine)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; BOOLEAN not bare Capacitor proxy; try/catch on async generation paths; `initial={false}` on above-fold Framer entrances; eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor; `DirectionalIcon` (NAMED import — a default import resolves to `undefined` and silently no-ops, 07-28) + Tailwind logical `start-`/`end-` for RTL; local JWT verify on read-only GET.** (doctrine)

## What to avoid (failed this week)
- **4 baseline-red test files are now a code-DROP cause, not a tax — #1 item.** `daily/__tests__/DailyChallengeGame.trackGameStart.test.tsx`, `tutorial/ModeCoach.test.tsx`, `api/stats/record-game/__tests__/route.test.ts`, `daily/__tests__/WordWheelResults.crossPromoTranslation.test.tsx`. On 07-30 they produced the residual `rc=1` the gate could not attribute → 2h22m re-gate → 8 code files dropped. FIX: one lane fixes all 4 outright. (open, S/M-effort, **highest ROI in the loop**)
- **The gate's peel loop has no "all offenders non-authored → SHIP" terminal state.** 07-30 log: `parser returned 11 non-authored path(s) — ignoring` → re-gate without lint → `still fails rc=1` → `not a clean baseline-poison` → salvage. It ignored the offenders but never concluded the authored set was innocent. FIX: if every named offender is non-authored across 2 consecutive peels, ship the authored set. (new, S-effort, prevents the 07-30 class outright)
- **Pre-lane stall is real but INTERMITTENT — do not over-fix.** 07-25 (01:13→06:16 baseline, 5h03m) and 07-29 (01:01→05:24, 4h23m) drained the usage window; 07-25 then hit 3 lanes rc75 → circuit-breaker → **0 ships**. The other 5 nights: 14 s to 52 min. Both stalls were *unlogged* waits before the baseline sha. FIX: log a heartbeat in the 01:00→baseline gap so the next stall is diagnosable — don't rebuild the phase. (open, S-effort, downgraded from #1)
- **MCP probe cost is load-dependent, not a fixed 1h51m hang.** Measured: 07-30 = 101 s/attempt, 07-31 = 96 s to recovery, 07-26 = 101 s/attempt. Only 07-29 hit ~1h51m/attempt (3h07m total) under extreme load. Last night's learnings generalized one pathological night into a rule — **corrected here.** The `gtimeout`-doesn't-bound-the-pipeline bug at `mcp-probe.sh:63` is still real (command substitution waits for every writer of the pipe) and worth the one-line fix, but it is NOT the loop's #1 cost. (corrected, S-effort)
- **Lane 12 ran TWICE on 07-30** and wrote two contradicting report blocks (74 events/39 DEAD vs 37 events/33 DEAD; the second rediscovered the first's own uncommitted fix and re-diagnosed it). Wasted budget + an unreadable report. FIX: skip a lane whose report header already exists. (open, S-effort)
- **Visual QA blocked 6 nights by a cookie-consent overlay** — agent-browser cannot dismiss it (`find text`, `click @ref`, coordinate `mouse down+up` all failed 07-30); the dialog renders outside the snapshot a11y tree. This is the ONLY thing holding sealed-bid at 79% and the same gap that made lane 02 re-derive CLS hypotheses for weeks. FIX: pre-seed the consent cookie / localStorage key in the browser profile before first navigation. (open, blocks 2 lanes, **now the longest-running blocker**)
- **Multiplayer CLS 0.92–0.96 CRITICAL, root cause CONFIRMED but unfixed** — the socket `connecting→lobby` full-viewport DOM swap. `NativeLanguageBanner` and `CookieConsent` both RULED OUT (don't re-test). Fix = a `RoomListView` skeleton at lobby dimensions, 4–6h → human-queue, not a lane. (open, escalate to founder)
- **Impact checks against a zero denominator read as "neutral" and teach nothing** — 07-30: `issue-probe` chips can't be clicked because the upstream `growth:game_feedback` card is throttled to ~once/few days (0/7d); `brain-drill-word-replay` was checked against a metric name that doesn't exist. FIX: assert the DENOMINATOR is plausible first, report `no-exposure`, not `neutral`. (open, mirrors Class 4)
- **`reddit-fetch search` returns garbage** (07-26, both queries non-word-game); `dailygames` RSS jq-parse-errors (07-27). The RSS *feed* path works; the *search* path does not. Fall straight through to WebSearch. (open, lane 04)
- **Don't diagnose a live run from its own report** — an in-progress report is always half-written. Verify run state by log/commit. (carried, meta)

## Open watches (carry forward)
- **4 baseline-red test files.** Status: **#1, promoted — proven to cause code drops.** Unowned — assign.
- **Gate peel loop lacks a non-authored-offender terminal state.** Status: new, S-effort, pairs with the item above.
- **Sealed-bid 79% → promotion.** 0 code blockers; needs visual QA only. 6 nights stalled. Status: open, escalate the tooling not the audit.
- **agent-browser cookie-consent dismissal.** Blocks lane 11 visual QA AND lane 02 Layout-Shifts capture. Status: open, #1 tooling gap.
- **Pre-lane 4–5h stall (2 of 7 nights).** Status: open, intermittent; add a heartbeat before rebuilding anything.
- **MP CLS 0.92+ (socket DOM swap, root cause confirmed).** Status: open, needs a 4–6h human refactor.
- **Telemetry classifier false-positives** — 25 of 33 "DEAD" events fire as `growth:<name>`. Probe `growth:<event>` volume before marking DEAD → backlog 33→~8. Status: open 3 weeks, lane 12's own top item, still deferred.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`, `exp-mp-round-feedback-top-v1` + 7 more have 0 non-test call sites. Status: open, lane 03 (wire or delete). NOTE: experiments use the `n()` hook alias — search `rg "n\('exp-" fe-next`, NOT `useExperiment`.
- **`exp-wordwheel-drag-hint-v1`** — 31d old, targets the #1 rage-click surface, control 8 vs variant 4 over 14d (n=12, inconclusive). Don't start an overlapping experiment there. Status: open, human decision.
- **Restore-queue strand** — 07-30 salvage backed up 8 code files to `~/logs/lexi-nightly/salvaged-code-20260730-010001`; age-escalation shipped `1c2e05659`. MUST append `{"resolve":"<tag>"}` after manual restore. Status: open, lane 01.
- **Brain Drill has no traffic** (`drill_completed` 0/9d). Status: open — discoverability, not features.
- **Word Tower daily-leaderboard Layer B** — founder design call. Status: open, founder.
- **Blog cadence engine** — Higgsfield hero recipe blocked on CLI install. Status: #1 founder-content, lane 08.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il` (07-23, re-verify); IndexNow Bing parity; AdSense re-submit after ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/7 ship; 07-31 spent the night on restore-queue, 0 autonomous ships |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager`, `agent-browser:agent-browser` | 6/7; Mgmt-API migration win 07-30; still needs headless Layout-Shifts capture |
| 03 engagement | `frontend-design` | 6/6 — most reliable lane in the loop; zombie flag killed 07-30 via new `deactivate` verb |
| 04 competitor | `humanizer`, `game-designer` | 2/2 ship; 1 of 2 polish ideas targeted a public mode — check the gate first |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 6/6, 0 reverts; GSAP count-up gems 07-29 + cards 07-30 |
| 06 seo | `seo-daily` | 2/2 rotation; ES `aprender inglés` meta shipped 07-28; native review mandatory |
| 07 self-learn | none — prompt-only | 2/7 (07-30, 07-31) — recovered from 4 nights scheduled out; still pin the slot |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/2 rotation; leaderboard 220→330w 07-28; hero-image blocked on CLI |
| 09 monetization | `frontend-design` | 4/4 (bundled with 03/12); no standalone features surfaced |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 1/2 rotation — lowest-frequency lane |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 5/7; sealed-bid 45→79%; **plateaued 6 nights on visual QA — escalate, don't re-audit** |
| 12 telemetry | none — prompt-only | 2/3; `push_prompt_shown` root cause 07-30; **ran twice on 07-30 — needs idempotence guard** |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (90+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
