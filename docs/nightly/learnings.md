# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-08..07-13 (6 report nights).** **SALVAGE TREADMILL IS BREAKING: 07-13 was a FULL gate pass** (first clean full-gate merge in the window) and **07-11 shipped via typecheck-tier** when mode-qa timed out — so **2/6 nights merged real code** and the last night was a full pass. Docs-only salvage still on 07-08/09/10/12 (4/6). **0 pushed-code reverts across the window** — salvage drops lane code PRE-push, master never regresses. **MILESTONE HELD: word-tower graduated 90%→Released 07-10;** lane 11 rotated to **crossword** and drove it **0%→55%→75%** in 3 nights (one more night = release-ready). **#1 infra IMPROVING but not solved: Supabase MCP token drought — DOWN 07-08/09/10/12, but RECOVERED via cold-boot retry on 07-11 + 07-13.** Cold-boot retry works; **4 migrations still UNAPPLIED** (upsert_push_token REVOKE, add_league_xp SECURITY DEFINER audit, teacher_access RLS, RLS-initplan) because recovered nights didn't apply them. Backbone **01/02/03/05 = 6/6**, **11 = 5/6** (rc124 07-11 mode-qa). Intermittent **09 4/6, 08 3/6, 12 3/6, 04 2/6, 06 2/6, 10 1/6, 07 1/6**. **6/6 nights hit usage-limit backoffs** (07-11 worst: 10); exit-124 on 07-11 mode-qa.

## FOUNDER DIRECTIVE — highest priority
- **2026-07-10 (word-tower GRADUATED, still binding):** word-tower is Released — **do NOT resume its readiness audit.** Lane 11 now audits **crossword** (75% as of 07-13; ~1 night to release-ready: visual QA + ClueBar UX + ja/ru keyboard/puzzles). Carried founder call: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) — design decision, not autonomous.
- **2026-07-06 (MODE CULL, still binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). **STOP polishing/auditing/pitching these.** adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic + SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only (pool shrank 4 after cull).
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=3)
- **3 callbacks in 6 days** (up from 1/7 last window): `idea:build:d24d4c78` (Blast "Ghost Round", 07-11), `polish:try:wordcraft-run` (Gem Hunt Session Dice Bonus, 07-09), `polish:try:crossword` (Crossword Clue Scramble, 07-11). **0 night:good/meh, 0 reddit:*, 0 mode:keep/drop/promote, 0 idea:pass.**
- **Both polish votes were ACTED ON** — lane 05 built Gem Hunt Session Dice Bonus (07-10) + activation chip (07-11); crossword Clue Scramble was spec'd 07-12. The polish-idea → build loop is working; keep surfacing `.live`-host polish cards.
- **Signal: build the Blast Ghost-Round idea** — the standing `idea:build` vote (07-11), still unbuilt. Lane 04/05 should surface a buildable slice.
- 3/6 is still low volume — if it dips again, flag Telegram card CTA visibility.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. (strongest, 40+ nights)
- **Full gate CAN pass clean now** — 07-13 merged all lane code on a full lint+type+test+build. First full pass in the window; the treadmill is breakable when lanes stay small + eslint-verify their own files. Reduced-tier (typecheck) remains the fallback ship path when the full gate wedges (07-11). (improving)
- **Mode-readiness treadmill graduated a 2nd-stage target fast** — crossword 0%→55%→75% in 3 nights via systematic audit (game logic → hooks → edge cases). null-generation-result loader-stuck bug caught + fixed 07-13. Cadence ~3-4 nights/mode. (validated, repeatable)
- **01/02/03/05 = 6/6 backbone** — triage restore/Sentry-guards, perf, engagement funnel + PostHog-delta reverts, mode polish ship EVERY night. fetchLanding parallelization holds /en p75 LCP −66% (6904→2308ms). (validated, strongest lanes)
- **Sentry null-guard sweep clears real crashes, verified by delta** — pathTrace 1PV **8→0 post-fix (verified 07-13)**, WordTowerScene 1RP `.geometry` guard (07-11), BiomeEventEmitter React-state rewrite (07-09), wikipedia check_word_length 1QA-cluster length filter (07-12). Guard Pixi `.clear()`/`.draw()`/`.geometry`/GSAP `.destroyed` before use; return BOOLEAN not bare Capacitor proxy. (doctrine, holds)
- **Supabase MCP cold-boot retry recovers the token** — 07-11 + 07-13 recovered after a cold-boot retry (07-13 at 01:12:47). The retry mechanism works; the gap is that recovered nights still don't APPLY the 4 pending migrations. (new — retry validated, apply-step missing)
- **Revert-on-regression works** — 07-12 reverted `exp-mp-room-join-loading-v1` (16 rageclicks/7d vs 1 baseline). Engagement lane catches its own regressions via PostHog delta. (validated)
- **Polish-idea → build loop closes** — both `polish:try` votes this window became shipped lane-05 slices within 1-2 nights. (new)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish in budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every degraded lane still ships `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). (validated)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for back/exit arrows** (RTL). (doctrine)

## What to avoid (failed this week)
- **Supabase MCP drought — 4 migrations still unapplied** — even on recovered nights (07-11/07-13) the lanes didn't apply the backlog. Fix: (a) mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env, (b) on a recovered-MCP night, lane 01/02 MUST apply the pending-migration queue, not just detect recovery. (#1 infra, improving via cold-boot retry but apply-step is the new gap)
- **Usage-limit backoffs 6/6 nights, exit-124 on 07-11** — mode-qa hit 10 backoffs → 120s sleep → rc124 timeout → lane reverted. Heavy lanes (11-mode-qa, 06-seo) prone. Stagger heavy lanes; per-suite hard kill so a wedge never rides the idle backstop to rc124. (recurring, #2 infra)
- **Gate wedge / salvage still 4/6 nights** — full gate wedges in TS/test phase most nights; only 07-13 full-passed. Not fully stabilized. Next: scope Vitest to changed-files + per-suite hard kill (never idle→rc124). (recurring)
- **`results_viewed` per-mode — blast still silent** — word-wheel (07-11) + word-hunt (07-12) fixed; `BlastResultsSummary` still fires `blast_results_viewed` (wrong event name) not canonical `results_viewed`. ~12 mode-specific results components remain. Each mode's results view needs its own emit. (resolving, lane 12)
- **Game completion crater / `game_abandoned` gap** — 460→245 games/7d = 53% completion; `game_abandoned` instrumentation GAP confirmed (can't see WHERE they drop). Wire game_abandoned before diagnosing. (open, lane 12/03)
- **Multiplayer CLS + INP** — CLS 0.574–1.043 (/en,/es,/he; conditional banners inject post-hydration). 07-12 removed `collapseSpacerWhenHidden` (expect ~0.29) — VERIFY landed. /es/multiplayer INP 318→414ms (n=66, floor). Homepage LCP 6319ms (393KB animated winner.webp). (resolving, lane 02)
- **Engagement flag graveyard** — 07-09 found 33 experiments dark/unwired (`useExperiment` imported by 0 components). WIRE the conditional render the SAME night as the flag; delete zombie flags (>14d) before new ones. (recurring, lane 03)
- **Lane 05 over-scope → research-only nights (07-12, 07-13)** — write ALL 5 locales FIRST, then a slice that fully wires in one budget. Two research-only nights in a row = ship a smaller slice instead. (high-frequency)
- **Flagging a Web-Vitals regression on one reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Unguarded `Record`/lookup access + >500-line files block flag-wiring** — guard `MAP[key]` before wiring. (carry, lane 11)
- **Reddit OAuth/JSON blocked → RSS fallback, error-tolerant parse, stop retrying.** (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk; eslint-changed-files-only. Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Supabase MCP: apply the 4 pending migrations on a recovered night** — cold-boot retry works; the miss is not applying the backlog. Status: #1 infra, improving. HUMAN: mint never-expire PAT.
- **Gate wedge / salvage** — scope-Vitest-to-changed + per-suite kill so mode-qa never rides to rc124. Status: #2 infra, lane 07/infra.
- **`results_viewed` — blast `BlastResultsSummary` emits wrong event** — rename to canonical `results_viewed`. Status: resolving, lane 12.
- **Game completion crater / `game_abandoned` gap** — instrument abandonment before diagnosing the 53% drop. Status: open, lane 12/03.
- **Multiplayer CLS fix verify** — confirm 07-12 `collapseSpacerWhenHidden` removal landed ~0.29. Status: resolving, lane 02.
- **Crossword readiness 75%→release** — 1 more night: visual QA, ClueBar toggle UX, ja/ru keyboard, ja/ru puzzles still english, font-serif token, noindex. Status: open, lane 11.
- **Blast "Ghost Round" (idea:build 07-11)** — the standing steering vote, still unbuilt. Surface a buildable slice. Status: open, lane 04/05.
- **Word Tower daily-leaderboard Layer B** — founder design call (1/day vs unlimited). Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 6/6 ship; restore + Sentry-guard fixes; REVOKE/RLS migrations written-but-unapplied (MCP) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 6/6 backbone; /en LCP −66%, MP CLS fix, Pixi null-guards |
| 03 engagement | `frontend-design` | 6/6 backbone; funnel + PostHog-delta revert (exp-mp-room-join 07-12) |
| 04 competitor | `humanizer`, `game-designer` | 2/6; idea:build Blast Ghost-Round; surface buildable ideas w/ named LIVE mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 6/6 mode polish; 0 reverts; polish-votes → shipped slices |
| 06 seo | `seo-daily` | 2/6 content lane; ES education queries; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | 1/6 (scheduler skips) |
| 08 adsense | `humanizer`, `higgsfield-generate` | 3/6; JSON-LD/BreadcrumbList when it runs; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | 4/6; daily-first funnel + rewarded warming |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 1/6 (scheduler skips); Wiktionary+Russian throughput |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 5/6 (rc124 07-11); word-tower GRADUATED, crossword 0→75% |
| 12 telemetry | none — prompt-only | 3/6; results_viewed per-mode wiring; game_abandoned gap open |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (73+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
