# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-09..07-15 (7 report nights).** **Gate false-NEGATIVE was the story, not code quality.** The "salvage" nights (07-12/13/14) were the vitest fork-pool oversubscribing CPU under Sonnet-lane load → passing suites misread as failures → good code dropped, then restored next night (`6fb8daf47` restored 07-12+13, `2270e1de8` restored 07-14, 21 files). **ROOT CAUSE FIXED 07-14: `c3973c715` caps vitest fork concurrency + drains 2 migrations** — first real attack on the treadmill (prior nights only restored, never fixed the classifier). **0 pushed-code reverts across the window** — salvage drops PRE-push, master never regresses; restores round-trip cleanly. Backbone strong: **01 6/7, 02 6/7, 11 6/7, 09 7/7**; **03 5/7, 05 5/7, 12 5/7**; rotation lanes **04 0/7 (research-only), 06/08/10 2/7** (off-rotation). **MILESTONE: crossword 55→75→85→88% (07-12→15), ~1 night to release** (visual QA + font-serif call); word-tower stays Released. **#1 infra STILL Supabase MCP: 20 consecutive nights no connection, now 4 migrations stale-backlogged** (security_hardening_advisors, perf_policy_consolidation, word_pacts_player2_id_fk_index, RLS-initplan). One rc124 (07-11 mode-qa, reverted+re-gated).

## FOUNDER DIRECTIVE — highest priority
- **2026-07-10 (word-tower GRADUATED, still binding):** word-tower is Released — do NOT resume its readiness audit. Lane 11 audits **crossword** (88% as of 07-15; ~1 night: visual QA, font-serif token decision; ja/ru keyboard fallback expected since puzzles are English; keep noindex until landing). Carried founder call: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) — design decision, not autonomous.
- **2026-07-06 (MODE CULL, still binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). STOP polishing/auditing/pitching these. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic + SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only (pool shrank 4 after cull).
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=3)
- **3 callbacks in 7 days** (flat, no new files after 07-11): `polish:try:wordcraft-run` (Gem Hunt Dice Bonus, 07-09), `idea:build:d24d4c78` (Blast "Ghost Round", 07-11), `polish:try:crossword` (Crossword Clue Scramble, 07-11). **0 night:good/meh, 0 reddit:*, 0 mode:keep/drop/promote, 0 idea:pass.**
- **Both `polish:try` votes SHIPPED** — Gem Hunt Dice Bonus (lane 05, 07-10) and Crossword Clue Scramble (lane 05, i18n+tests 6 locales 07-14, timer-cleanup+aria polish 07-15). Polish-idea → build loop closes reliably; keep surfacing `.live`-host polish cards.
- **Only unbuilt vote = Blast "Ghost Round"** (`idea:build` 07-11) — surface a buildable slice. Lane 04/05.
- 3/7 low volume — if it dips below 2, flag Telegram card CTA visibility.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. Restore-then-round-trip is clean (`6fb8daf47`, `2270e1de8`). (strongest, 40+ nights)
- **Attacking the gate CLASSIFIER, not just restoring** — `c3973c715` (07-14) caps vitest fork concurrency so CPU contention under Sonnet lanes stops misreading passing suites as breaks. FIRST root-cause fix vs the prior "restore next night" reflex. Watch whether 07-16+ full-pass rate climbs. (new, promising)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF ticks** — pathTrace 1PV −67%→0 (14d, 07-09), WordTowerScene+SmashScene 1RP baseline 6→2 (−67%, verified). Applied proactively to ALL rAF tick sites; 0 revert 7 nights. Guard before `.clear()`/`.draw()`/`.geometry`/GSAP `.destroyed`; return BOOLEAN not bare Capacitor proxy. (doctrine, holds)
- **try/catch on async generation codepaths** — CrosswordPageClient null-generation trap (07-12) + null-result freeplay (07-13): bare `.then()` on a generator that can return null wedges the loader. Always try/catch, never assume a resolved value. (validated, repeatable)
- **`results_viewed` canonical-event registry scales across modes** — word-wheel (+18 d7, 07-14), word-hunt (+12 d7, 07-15), blast highlight-trap escape (07-15). Each mode fired a custom name; central map → canonical `results_viewed`. ~12 backlog (classic/survival/wheel-rush). (resolving, lane 12)
- **`game_abandoned` SPA-nav path** — `emitAbandonOnSpaNavigate()` + `useGameStartTelemetry` (07-14) captures back-button/logo-tap mid-game abandons previously invisible; completion reads 53–56% with the crater now measurable. (new, lane 12)
- **Engagement revert-on-regression via PostHog delta** — `exp-mp-room-join-loading-v1` reverted 07-12 (16 rageclicks/7d vs 1 baseline; disabled-button gated behind async socket state). Lesson: never gate UI state behind network latency. (validated)
- **fetchLanding parallelization holds** — season_rpc ‖ game_results ‖ hunt_stats ‖ modeStats = −66% LCP (1921ms vs 6522ms), reconfirmed 07-12. (doctrine)
- **eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor** — lanes skipping full tsc/build finish in budget; degraded lanes still ship `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). (30+ nights)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for back/exit arrows** (RTL). (doctrine)

## What to avoid (failed this week)
- **Supabase MCP drought — 20 consecutive nights no connection, 4 migrations stale-backlogged** — triage WRITES migrations nightly but apply is blocked. Fix: (a) mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env, (b) on any recovered-MCP night lane 01/02 MUST drain the pending queue FIRST. (#1 infra, unresolved — human-blocked on PAT)
- **Gate false-negative from CPU contention** — root cause (vitest fork oversubscription) fixed 07-14 (`c3973c715`); prior 3 nights only RESTORED, wasting a full lane each morning. If salvage recurs post-fix, next suspect is per-suite idle-timeout (rc124), not fork count. (recurring → root-fixed, verify next week)
- **rc124 on heavy lanes** — 07-11 mode-qa hit exit-124 idle-timeout → reverted+re-gated. Heavy lanes (11-mode-qa, 06-seo) prone. Stagger heavy lanes; per-suite hard kill so a suite never rides the idle backstop. (recurring)
- **Flag DEFINED without same-run WIRE** — engagement 07-09/11 shipped "nothing" because flags had 0 call sites at definition. Now wired same-run (07-14 exp-homepage-click-feedback live same night). WIRE the conditional render the SAME night; delete zombie flags (>14d). (recurring → improving, lane 03)
- **Lane 05 over-scope → research-only** (07-12) — Clue Scramble spec written, impl deferred to 07-14. Write ALL 5 locales FIRST, then a slice that fully wires in one budget. (high-frequency, lane 05)
- **Game completion crater** — 53–56% completion, 262 abandons/period. Instrumentation now EXISTS (07-14 SPA path) — next step is diagnosing WHERE they drop, not more wiring. (open → diagnosable, lane 12/03)
- **Homepage LCP: 393KB animated winner.webp, no poster frame** — SSR budget TTFB-dominant (~1500ms). Add a poster/static first frame. (open, lane 02)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk; eslint-changed-files-only. Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Supabase MCP: drain 4 pending migrations on a recovered night** — apply-step is the miss. HUMAN: mint never-expire PAT into nightly env. Status: #1 infra, unresolved.
- **Gate full-pass rate post-`c3973c715`** — did the vitest fork cap convert salvage→full? Verify 07-16..07-18. Status: #2 infra, lane 07.
- **Game completion crater** — instrumentation landed 07-14; diagnose the drop point next. Status: open→diagnosable, lane 12/03.
- **Crossword readiness 88%→release** — 1 night: visual QA + font-serif token decision. ja/ru keyboard fallback expected; noindex intentional until landing. Status: open, lane 11.
- **Blast "Ghost Round" (idea:build 07-11)** — the one unbuilt steering vote. Surface a buildable slice. Status: open, lane 04/05.
- **Telemetry backlog ~12 events** — next: classic/survival/wheel-rush `results_viewed`. blast highlight-trap fixed 07-15. Status: resolving, lane 12.
- **MP CLS architectural** — PageClient conditional-banner reflow; 07-12 spacer-collapse fix held but AutoHideHeader needs refactor off conditional rendering. Status: open, lane 02.
- **Word Tower daily-leaderboard Layer B** — founder design call (1/day vs unlimited). Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403 + zombie-flag PostHog deactivation** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 6/7 ship; Pixi null-guards (1PV/1RP verified by delta); RLS/REVOKE migrations written-but-unapplied (MCP dry 20 nights) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 6/7; MP CLS spacer-collapse held; fetchLanding −66% LCP; homepage-webp poster open |
| 03 engagement | `frontend-design` | 5/7; flag wiring + PostHog-delta revert (exp-mp-room-join 07-12); game_abandoned SPA path 07-14 |
| 04 competitor | `humanizer`, `game-designer` | 0/7 code (research-only every night); both polish votes shipped via lane 05; Ghost-Round idea unbuilt |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5/7 mode polish; 0 reverts; polish-votes → shipped slices (Gem Hunt, Clue Scramble, Shiritori) |
| 06 seo | `seo-daily` | 2/7 rotation; ES education page + breadcrumb JSON-LD; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | 3/7; ID'd vitest fork contention (fixed 07-14) + MCP backlog |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/7; schema/word-count audits; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | 7/7; SupporterInterestCard, flag wiring, daily-first funnel |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/7 rotation; word-bank index + candidate review; Hebrew promotion-race fix (`d21d9f1a0`) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 6/7 (rc124 07-11); word-tower Released, crossword 55→88% |
| 12 telemetry | none — prompt-only | 5/7; results_viewed word-wheel/hunt/blast; game_abandoned SPA gap closed 07-14 |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (80+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
