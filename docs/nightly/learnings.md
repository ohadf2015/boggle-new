# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-09..07-14 (6 report nights).** **Full-gate pass 07-11 + 07-14 (2/6); docs-only salvage 07-09/10/12/13 (4/6).** 07-14 = strongest night: **9/12 lanes shipped code on a full lint+type+test+build**. Correction to last week's log: **07-13 was salvage, NOT a full pass** — git `6fb8daf47` restored "salvaged code from 07-12 and 07-13 gate drops" on 07-14, so the treadmill is real but breakable (small + eslint-verified lanes pass). **0 pushed-code reverts across the window** — salvage drops lane code PRE-push, master never regresses; salvage-then-restore now round-trips cleanly. **MILESTONE: crossword drove 55%→75%→85% (07-12/13/14), release-ready in 1 more night** (visual QA + font-serif confirm) — word-tower stays Released. **#1 infra STILL Supabase MCP: flaky/absent most of the span, 4 migrations UNAPPLIED and now stale-backlogged** (upsert_push_token, add_league_xp SECURITY DEFINER audit, teacher_access RLS, RLS-initplan) — apply-on-recovery step is the missing move. Backbone **01/02/03/11 strong (4-5/6)**; **05 4/6, 09 5/6**; rotation lanes **04/06/08/10/12 2/6** (off-rotation, not failures). rc124 idle-timeout on **07-12 mode-qa** (reverted, re-gated clean).

## FOUNDER DIRECTIVE — highest priority
- **2026-07-10 (word-tower GRADUATED, still binding):** word-tower is Released — do NOT resume its readiness audit. Lane 11 now audits **crossword** (85% as of 07-14; ~1 night to release: visual QA, font-serif token decision, ja/ru keyboard fallback is expected since puzzles are English, keep noindex until landing). Carried founder call: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) — design decision, not autonomous.
- **2026-07-06 (MODE CULL, still binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). STOP polishing/auditing/pitching these. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic + SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only (pool shrank 4 after cull).
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=3)
- **3 callbacks in 6 days** (flat vs last window): `polish:try:wordcraft-run` (Gem Hunt Session Dice Bonus, 07-09), `idea:build:d24d4c78` (Blast "Ghost Round", 07-11), `polish:try:crossword` (Crossword Clue Scramble, 07-11). **0 night:good/meh, 0 reddit:*, 0 mode:keep/drop/promote, 0 idea:pass.**
- **Both `polish:try` votes are now SHIPPED** — Gem Hunt Dice Bonus (lane 05, 07-10) and Crossword Clue Scramble (lane 05, i18n+tests complete all 6 locales 07-14). The polish-idea → build loop closes reliably; keep surfacing `.live`-host polish cards.
- **Only unbuilt vote = Blast "Ghost Round"** (`idea:build` 07-11) — surface a buildable slice. Lane 04/05.
- 3/6 low volume again — if it dips below 2, flag Telegram card CTA visibility.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. Salvage-then-restore round-trips (`6fb8daf47` restored 07-12+07-13 drops cleanly). (strongest, 40+ nights)
- **Full gate passes when lanes stay small + eslint-verify own files** — 07-11 + 07-14 full passes; 07-14 merged 9/12 lanes. The treadmill breaks with scope discipline. Reduced-tier (typecheck) remains the fallback ship path when the full gate wedges (07-11). (improving)
- **Mode-readiness treadmill is repeatable + fast** — crossword 55%→75%→85% in 3 nights via systematic audit (game logic → hooks → edge cases). null-generation-result loader-stuck bug caught 07-12; ClueBar accidental-toggle (button→div) + useCrosswordGame spurious-effect refs 07-14. Cadence ~3-4 nights/mode. (validated, repeatable)
- **01/02/03 backbone (4-5/6)** — triage restore/Sentry-guards, perf audit, engagement funnel + PostHog-delta reverts ship most nights. fetchLanding parallelization holds /en p75 LCP gains; /es MP CLS 0.369→0.296 verified 07-14. (validated, strongest lanes)
- **Sentry null-guard sweep clears real crashes, verified by delta** — pathTrace 1PV 8→0 (verified 07-12); WordTowerScene 1RP `.geometry` guard baseline 6→2 (−67%, verified 07-14); word-length 1QA-cluster length filter (07-12) stopped constraint violations. Guard Pixi `.clear()`/`.draw()`/`.geometry`/GSAP `.destroyed` before use; return BOOLEAN not bare Capacitor proxy. (doctrine, holds)
- **Engagement revert-on-regression works** — 07-12 reverted `exp-mp-room-join-loading-v1` (16 rageclicks/7d vs 1 baseline, 10/16 on /es/MP) same night via PostHog delta. (validated)
- **Polish-idea → build loop closes** — both `polish:try` votes this window shipped as lane-05 slices within 1-3 nights. (validated)
- **`results_viewed` per-mode wiring nearly done** — word-wheel (07-11), word-hunt (07-12), **blast BlastResultsSummary 07-14 (22 tests, canonical event name)**. ~34 backlog events remain but the recurring blast-wrong-name bug is CLOSED. (resolving→mostly-done, lane 12)
- **`game_abandoned` SPA gap instrumented** — `emitAbandonOnSpaNavigate()` (07-14) captures mid-game SPA abandons previously invisible; funnel now reads 56% completion with 262 abandons surfaced. Diagnose the crater next. (new)
- **eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor** — lanes skipping full tsc/build finish in budget; degraded lanes still ship `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). (30+ nights)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for back/exit arrows** (RTL). (doctrine)

## What to avoid (failed this week)
- **Supabase MCP drought — 4 migrations unapplied and now stale-backlogged** — MCP flaky/absent most of the span; even on partially-recovered nights lanes did NOT apply the queue. Fix: (a) mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env, (b) on any recovered-MCP night lane 01/02 MUST drain the pending-migration queue before other work. (#1 infra, unresolved)
- **Gate wedge / salvage 4/6 nights** — full gate wedges in TS/test phase on idle-timeout (rc124), not code errors. Only 07-11/07-14 full-passed. Next: scope Vitest to changed-files + per-suite hard kill so a suite never rides the idle backstop to rc124. (recurring, #2 infra)
- **rc124 on heavy lanes** — 07-12 mode-qa hit exit-124 idle-timeout → reverted. Heavy lanes (11-mode-qa, 06-seo) prone. Stagger heavy lanes; per-suite hard kill. (recurring)
- **Game completion crater** — 262 abandons/period, 56% completion. Instrumentation now EXISTS (07-14) — next step is diagnosing WHERE they drop, not more wiring. (open→diagnosable, lane 12/03)
- **Engagement flag graveyard** — 33 experiments were dark/unwired (07-09); 7-10 stale >14d flagged each night with no p-values; zombie flag `exp-mp-room-join-loading-v1` (id 219697) reverted in code but still active in PostHog. WIRE the conditional render the SAME night as the flag; delete zombie flags (>14d) before new ones. (recurring, lane 03 — improving: 15/15 wired by 07-14)
- **Lane 05 over-scope → research-only nights (07-12)** — write ALL 5 locales FIRST, then a slice that fully wires in one budget. Two research-only nights = ship a smaller slice instead. (high-frequency)
- **Homepage LCP: 393KB animated winner.webp, no poster frame** — SSR budget TTFB-dominant (1500ms). Add a poster/static first frame. (open, lane 02)
- **Flagging a Web-Vitals regression on one reading / below n≥50 in BOTH runs** — /es MP INP 318→414ms is below the revision threshold (n too low); do not name a suspect yet. (holding)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk; eslint-changed-files-only. Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Supabase MCP: drain the 4 pending migrations on a recovered night** — apply-step is the miss. Status: #1 infra, unresolved. HUMAN: mint never-expire PAT into nightly env.
- **Gate wedge / salvage** — scope-Vitest-to-changed + per-suite kill so mode-qa never rides to rc124. Status: #2 infra, lane 07/infra.
- **Game completion crater** — instrumentation landed 07-14; now diagnose the drop point. Status: open→diagnosable, lane 12/03.
- **Crossword readiness 85%→release** — 1 night: visual QA + font-serif token decision. ja/ru keyboard fallback expected (English puzzles); noindex intentional until landing. Status: open, lane 11.
- **Blast "Ghost Round" (idea:build 07-11)** — the one unbuilt steering vote. Surface a buildable slice. Status: open, lane 04/05.
- **Telemetry backlog ~34 events** — next: word-hunt or wheel-rush `results_viewed`. blast bug CLOSED 07-14. Status: resolving, lane 12.
- **Word Tower daily-leaderboard Layer B** — founder design call (1/day vs unlimited). Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403 + zombie-flag PostHog deactivation** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/6 ship; restore + Sentry-guard fixes (1PV/1RP verified by delta); REVOKE/RLS migrations written-but-unapplied (MCP) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 4/6; /es MP CLS −20% verified, Pixi null-guards; homepage-LCP webp open |
| 03 engagement | `frontend-design` | 5/6; funnel + PostHog-delta revert (exp-mp-room-join 07-12); game_abandoned instrumented 07-14 |
| 04 competitor | `humanizer`, `game-designer` | 2/6 rotation; both polish votes shipped; Blast Ghost-Round idea still unbuilt |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 4/6 mode polish; 0 reverts; polish-votes → shipped slices (Gem Hunt, Clue Scramble) |
| 06 seo | `seo-daily` | 2/6 rotation; ES education preposition fixes; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | 2/6 (scheduler rotation) |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/6; BreadcrumbList JSON-LD added; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | 5/6; flag wiring, daily-first funnel |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/6 rotation; Wiktionary+Russian throughput |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 5/6 (rc124 07-12); word-tower Released, crossword 55→85% |
| 12 telemetry | none — prompt-only | 2/6; results_viewed blast fixed 07-14; game_abandoned gap closed |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (74+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
