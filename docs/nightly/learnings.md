# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-06..07-12 (7 report nights).** SALVAGE STILL THE NORM: **07-06 + 07-08 + 07-09 + 07-10 = docs-only salvage** (gate failed on lane code, docs kept). Real code merged on only 2 nights: **07-07** (tests-inconclusive/rc124, shipped UNVERIFIED-on-tests, `ae7e467`) and **07-11** (typecheck-tier when full gate wedged in TS phase, `02da330`). 07-12 pending. **0 pushed-code reverts all window** — salvage drops lane code PRE-push, master never regresses. **MILESTONE: word-tower reached 90% and was PROMOTED to Released (07-10)** — lane 11 rotated to a NEW target, **crossword** (55% first-pass, 0 hard blockers, 07-12). **#1 infra STILL: Supabase MCP token drought — absent ALL 7 nights (17 consecutive); 4 migrations (quick-play index cleanup, RLS-initplan, upsert_push_token REVOKE, is_catchup cache) written-but-UNAPPLIED.** Backbone **01/02/03/05/09 = 7/7**, **11 = 6/7** (rc124 07-11), intermittent **06 4/7, 12 4/7, 08 3/7, 04 2/7, 07 2/7, 10 2/7**. Runs avg ~17.6 min; **7/7 nights hit usage-limit backoffs**, 2/7 hit exit-124 (07-06, 07-11).

## FOUNDER DIRECTIVE — highest priority
- **2026-07-10 (word-tower GRADUATED):** word-tower hit 90% → Released. **STOP the per-night word-tower readiness audit** — it's shipped. Lane 11 now audits **crossword** (55%, next graduate target). Open founder call carried: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day vs unlimited) — design decision, not autonomous.
- **2026-07-06 (MODE CULL, still binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). **STOP polishing/auditing/pitching these** — Word-Vault redesign directive is VOID; any report text resurfacing a Word-Vault pitch is stale. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic w/ SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Rotation pool shrank by 4 after the cull — pick from surviving modes only.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=1 settled)
- **VOLUME COLLAPSED: only 1 callback in 7 days** — `idea:build:d24d4c78` (Blast "Ghost Round", 07-09). **0 night:good/meh, 0 reddit:*, 0 mode:keep/drop/promote, 0 idea:pass.**
- **Signal: build the Blast Ghost-Round idea** — the ONE explicit vote this window. Lane 04/05 should surface a buildable slice.
- **Near-total silence ≠ dissatisfaction** — accept it, don't over-correct. But 1/7 is low enough the buttons may be under-noticed; if it persists another week, flag Telegram card CTA visibility (loop-improvements).

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. (strongest, holds every night, 40+ nights)
- **Reduced-strength gate tiers are the ONLY code-ship path when the gate wedges** — 07-07 shipped tsc+affected-tests when full test suite hit rc124; 07-11 shipped typecheck-tier when full gate wedged in TS phase. Both merged real Sentry fixes. Beats blanket docs-only drop. (the only 2 code ships this window)
- **Mode-readiness treadmill GRADUATED a mode** — word-tower 84%→90% over the window, PROMOTED to Released 07-10. Systematic per-night component audit + Sentry-guard sweep works end-to-end. Now pointed at crossword. (validated — first mode graduation)
- **01/02/03/05/09 = 7/7 backbone** — triage restore, asset/SSR/CLS/LCP perf, engagement funnel + reverts, mode polish, monetization funnel ship EVERY night. fetchLanding parallelization drove /en p75 LCP −66% (6904→2308ms). (validated, strongest lanes)
- **Sentry null-guard sweep clears real crashes** — pathTrace 1PV, WordTowerSmashScene 1R6/1R7, WordTowerScene 1RP, wikipediaWordFetcher 1QA-cluster all fixed + verified IMPROVED. Guard Pixi `.clear()`/`.draw()`/`.geometry` vs post-unmount null ctx; return BOOLEAN not bare Capacitor proxy. (doctrine, holds)
- **Revert-on-regression works** — 07-12 reverted exp-mp-room-join-loading-v1 (16 rageclicks/7d vs 1 baseline, /es-heavy). Engagement lane catches its own regressions via PostHog delta. (validated)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish in budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every degraded lane still shipped `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). Floor never zero. (validated)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for back/exit arrows** (RTL). (doctrine)

## What to avoid (failed this week)
- **Supabase MCP token drought — 17 consecutive nights, 0 DB migrations applied** — blocks RLS-initplan/index-cleanup/REVOKE/cache work; 4 migrations written-but-unapplied. **#1 infra, worsening (3+ weeks).** Fix: mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env + preflight refresh probe + retry-with-backoff. Sentry MCP also absent 07-08. (open, HUMAN escalate)
- **Gate wedge / salvage treadmill unsustainable** — 4 of 6 scorable nights docs-only-salvaged; the full gate wedges in TS or test phase and only reduced-tier paths ship code. NOT stabilizing. Next: scope Vitest to changed-files + per-suite hard kill (never idle→rc124). (#2 infra, recurring)
- **Gate rc=124 idle-timeout (07-06, 07-07 tests, 07-09, 07-11 mode-qa)** — full test suite / mode-qa lane wedges at idle backstop → INCONCLUSIVE. Distinguish timeout-kill from pass; per-suite kill. (recurring)
- **`results_viewed` wired-but-silent per-mode** — root-caused 07-09: SinglePlayerResults only hit by dead solo-bots/practice/challenge; active modes have their OWN results components that never emitted. Fixed word-wheel (07-11) + word-hunt (07-12). **REMAINING: blast results component.** Each mode's results view needs its own emit. (resolving, lane 12)
- **Game completion funnel crater** — 07-11/07-12: 460→245 sessions = 53% completion (7d), `game_abandoned` instrumentation GAP confirmed (can't see WHERE they drop). Wire game_abandoned before diagnosing. (new, lane 12/03)
- **Multiplayer CLS critical** — 0.574–1.043 (n=80); conditional banners suspected. Fix shipped 07-12 (removed `collapseSpacerWhenHidden`, expect ~0.29). Verify next night. (resolving, lane 02)
- **Usage-limit backoffs 7/7 nights** — every run hit the rate ceiling ≥once (120s backoff). Heavy lanes (06-seo, 11-mode-qa) prone. Keep per-lane budgets tight; stagger heavy lanes. (new, recurring)
- **Lane 05 over-scope → deferred UI wire** — write ALL 5 locales FIRST, then a slice that fully wires in one budget. (high-frequency)
- **Lane 03 — WIRE the conditional render the SAME night as the flag; delete zombie flags before new ones.** 10 stale experiments (>14d) flagged 07-11. (recurring)
- **Flagging a Web-Vitals regression on one reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Unguarded `Record`/lookup access + >500-line files block flag-wiring** — guard `MAP[key]` before wiring; WordTower files over cap. (carry, lane 11)
- **Reddit OAuth/JSON blocked → RSS fallback, error-tolerant parse, stop retrying.** (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk; eslint-changed-files-only. Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Supabase MCP token drought** — mint never-expire PAT + preflight probe + cold-boot retry; apply 4 pending migrations. Status: #1 infra, 17 nights, HUMAN.
- **Gate wedge / salvage treadmill** — scope-Vitest-to-changed + per-suite kill. Status: #2 infra, lane 07/infra. (`VirtualGamesList.tsx:39:23` lint RESOLVED 07-10 — retired.)
- **`results_viewed` — blast results component still silent** — apply the per-mode emit pattern. Status: resolving, lane 12.
- **Game completion crater / `game_abandoned` gap** — instrument abandonment before diagnosing the 53% drop. Status: new, lane 12/03.
- **Multiplayer CLS fix verify** — confirm 07-12 `collapseSpacerWhenHidden` removal landed ~0.29. Status: resolving, lane 02.
- **Crossword readiness 55%→release** — new lane-11 target post word-tower graduation. Status: open, lane 11.
- **Word Tower daily-leaderboard Layer B** — founder design call (1/day vs unlimited). Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **Blast "Ghost Round" idea (idea:build 07-09)** — the one steering vote; surface a buildable slice. Status: open, lane 04/05.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 7/7 ship; restore + REVOKE/RLS migrations written-but-unapplied (MCP drought) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 7/7 backbone; fetchLanding LCP −66%, MP CLS fix, Pixi null-guards |
| 03 engagement | `frontend-design` | 7/7 backbone; funnel + PostHog-delta reverts (exp-mp-room-join 07-12) |
| 04 competitor | `humanizer`, `game-designer` | 2/7; idea:build Blast Ghost-Round; surface buildable ideas w/ named LIVE mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 7/7 mode polish; 0 reverts (design non-negotiable) |
| 06 seo | `seo-daily` | 4/7 content lane; ES education queries; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | 2/7 (skipped 5 nights — scheduler) |
| 08 adsense | `humanizer`, `higgsfield-generate` | 3/7; JSON-LD when it runs; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | 7/7; daily-first funnel + rewarded warming |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/7 intermittent (scheduler skips); Wiktionary+Russian top throughput |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 6/7 backbone; word-tower GRADUATED 90%→Released; now crossword 55% |
| 12 telemetry | none — prompt-only | 4/7; results_viewed per-mode wiring; game_abandoned gap open |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (67+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
