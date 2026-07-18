# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-12..07-18 (report nights 07-12/13/14/15/16/18; 07-17 lost).** **This week's story = PREFLIGHT ABORTS, not the gate classifier.** The 07-14 vitest fork-cap fix (`c3973c715`) largely worked: only **1 salvage (07-15)**, then **0 code-drops** since. But **07-16 preflight-aborted** on git divergence (local non-docs commits) — recovered by the 180-min retry — and **07-17 preflight-aborted entirely** (repo left on `feat/pricing-psychology-i18n` with a dirty tree; auto-recover refused as unsafe) → **whole night lost, no report**. The safety gate is CORRECT (never auto-run off-master/dirty), but a lost night is expensive and only surfaces at 9am. Backbone still strong on nights that ran: **01/02/03/09/11/12 shipped 6-7/7**; rotation lanes **04 0/7 (research-only), 06/08/10 2-3/7** (off-rotation). **MILESTONE: crossword 55→75→85→88→90% (07-12→16) — Released-ready.** **NEW mode in rotation: shiritori first-audited 07-18 at 42%** (blocker: no turn-timer UI). **#1 infra STILL Supabase MCP: 22 consecutive nights no connection, 6 migrations stale-backlogged** (up from 4).

## FOUNDER DIRECTIVE — highest priority
- **2026-07-18 (crossword GRADUATING):** crossword hit **90%** (07-16) — Released-ready. Lane 11 has ROTATED to **shiritori** (42% as of 07-18; blocker = no turn-timer UI, 15s server deadline invisible to client → silent elimination). Do NOT resume word-tower (Released 07-10) audit.
- **2026-07-10 (word-tower GRADUATED, still binding):** word-tower is Released — do NOT resume its readiness audit. Carried founder call: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) — design decision, not autonomous.
- **2026-07-06 (MODE CULL, still binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). STOP polishing/auditing/pitching these. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic + SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only (pool shrank 4 after cull).
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=3 callbacks)
- **3 callbacks in 7 days**: `night:meh:20260715` (gate-failed → docs-only salvage), `idea:build:d24d4c78` (Blast "Ghost Round", 07-11), `polish:try:crossword` (Clue Scramble, 07-11). **0 night:good, 0 reddit:*, 0 mode:keep/drop/promote, 0 idea:pass.**
- **First `night:meh` in the window** (07-15) — reacting to a GATE-FAILED docs-only salvage night. Not a code-quality complaint; it's a run-health complaint. Reinforces: preflight/gate reliability IS the user-visible quality signal, not lane output. 1 meh < 3 threshold → no sharp self-critique required, but watch.
- **Both prior `polish:try` votes already SHIPPED** (Gem Hunt Dice Bonus, Crossword Clue Scramble). Polish-idea → build loop closes reliably.
- **Only unbuilt vote = Blast "Ghost Round"** (`idea:build` 07-11) — still unbuilt. Surface a buildable slice. Lane 04/05.
- 3/7 low volume — if it dips below 2, flag Telegram card CTA visibility.

## What works (validated this week)
- **Attacking the gate CLASSIFIER worked** — `c3973c715` (07-14 vitest fork cap) cut salvage from 4/7 nights → 1 (07-15) → 0 since. First real root-fix vs the "restore next morning" reflex; holding. (validated, strongest gate win in 40+ nights)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. Restore-then-round-trip clean. (doctrine, 40+ nights)
- **Framer Motion `initial` serialized into SSR kills LCP** — `AnimatePresence` with `initial={{opacity:0}}` on the hero mascot rendered `opacity:0` in SSR HTML → browser skips it as LCP candidate → LCP gated by hydration. Fix: `initial={false}` on entrance (variant crossfades still animate). Applied to `InteractiveMascot.tsx` (07-18, was +28.8% regression). Audit any above-fold `AnimatePresence`/`motion` with an `initial` opacity/scale. (NEW, high-value SPEED pattern)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF ticks** — 0 revert across window. Guard before `.clear()`/`.draw()`/`.geometry`/GSAP `.destroyed`; return BOOLEAN not bare Capacitor proxy. WebGL context-loss nulls the render context BEFORE `destroyed=true`, so guard both. (doctrine, holds)
- **Same-run flag+event WIRE** — 07-18 `exp-mp-lobby-connect-feedback-v1` shipped WITH its `mp_lobby_join_attempted` event wired same night on both null-socket + disconnected-socket paths. No zombie flags this window. WIRE the conditional render + its event the same night. (validated, lane 03)
- **try/catch on async generation codepaths** — bare `.then()` on a generator that can return null wedges the loader. Always try/catch. (validated, lane 11 crossword)
- **`results_viewed` / `game_completed` canonical-event registry scales across modes** — brain-drill `game_completed` wired 07-18 (mirrors `trackDrillStart`→`trackGameStart`); word-hunt/blast earlier. ~12 backlog (classic/survival/wheel-rush). (resolving, lane 12)
- **A/B revert-on-regression via PostHog delta** — `exp-mp-room-join-loading-v1` reverted 07-12 (16 rageclicks/7d vs 1). Never gate UI state behind async socket latency — new `-lobby-connect-` experiment does the opposite (immediate feedback). (validated)
- **fetchLanding parallelization holds** (−66% LCP) + **eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor** + **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for RTL back/exit**. (doctrine)

## What to avoid (failed this week)
- **Preflight abort eats whole nights, silently until 9am** — 07-16 aborted on git divergence (local non-docs commits; recovered via 180-min retry), **07-17 aborted entirely on `feat/pricing-psychology-i18n`+dirty tree → NO report, night lost**. The abort is CORRECT (never auto-run off-master/dirty) but there's no live alert. Fix: (a) Telegram-alert on preflight abort with the reason, (b) a pre-midnight cron that warns if repo is off-master or dirty. (#1 friction this window, NEW)
- **Supabase MCP drought — 22 consecutive nights, 6 migrations stale-backlogged** (was 4). 07-18 failed after 3 attempts (transport errors). Fix: mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env; on any recovered night lane 01/02 drains the queue FIRST. (#1 infra, human-blocked on PAT)
- **Homepage LCP: 393KB animated winner.webp, no poster frame; SSR budget 1500ms TTFB-dominant** — mascot `initial={false}` fix (07-18) removed the hydration penalty but the webp weight/poster is still open. Add a poster/static first frame. (open, lane 02)
- **MP CLS structural** — `/es/multiplayer` CLS 0.716 CRITICAL, `/en` 0.574; AutoHideHeader spacer removed on async socket state. Fix = always render header, toggle visibility not DOM presence (needs visual QA). (open, lane 02)
- **rc124 on heavy lanes** — no rc124 this window, but 02-perf (1370s) + 03-engagement (1310s) on 07-18 ran long. Per-suite hard kill so a suite never rides the idle backstop. (watch)
- **`next build`/full `tsc`/full test in a LANE verify path** — banned; eslint-changed-files-only. Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Preflight-abort alerting** — 2 lost/degraded nights this window. HUMAN: keep repo on master + clean between nights, or add pre-midnight dirty-tree warn. Status: NEW #1 friction.
- **Supabase MCP: drain 6 pending migrations on a recovered night** — apply-step is the miss. HUMAN: mint never-expire PAT. Status: #1 infra, unresolved (22 nights).
- **Gate full-pass rate post-`c3973c715`** — 1 salvage (07-15) then 0; fork-cap fix holding. Keep watching for rc124 recurrence. Status: resolving.
- **Shiritori readiness 42%→release** — blocker: no turn-timer UI (silent 15s elimination); + reconnect edge case + visual QA. 2-3 nights. Status: open, lane 11.
- **Game completion crater** — instrumentation landed (07-14 SPA `game_abandoned`); diagnose the drop point next, not more wiring. Status: open→diagnosable, lane 12/03.
- **Blast "Ghost Round" (idea:build 07-11)** — the one unbuilt steering vote. Surface a buildable slice. Status: open, lane 04/05.
- **Telemetry backlog ~12 events** — next: classic/survival/wheel-rush `results_viewed`; `rewarded_ad_offered` CRATERED −71% (context-gated, no call site — investigate ad-flow, not a code regression). Status: resolving, lane 12.
- **Word Tower daily-leaderboard Layer B** — founder design call. Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403 + zombie-flag PostHog deactivation (`exp-mp-room-join-loading-v1` 0 call sites)** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 7/7 nights-run ship; Pixi null-guards; RLS/index migrations written-but-unapplied (MCP dry 22 nights) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 7/7; Framer `initial={false}` LCP fix (07-18); MP CLS + webp-poster open |
| 03 engagement | `frontend-design` | 7/7; same-run flag+event wire (07-18); PostHog-delta revert (07-12) |
| 04 competitor | `humanizer`, `game-designer` | 0/7 code (research-only); polish votes ship via lane 05; Ghost-Round unbuilt |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5/7 mode polish; 0 reverts; polish-votes → shipped slices |
| 06 seo | `seo-daily` | 3/7 rotation; ES education CTR rewrites; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | ID'd preflight-abort friction + MCP backlog; fork-cap fix validated |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/7; schema/word-count audits; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | 7/7; companion to 03/12; daily-first funnel |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/7 rotation; word-bank index + candidate review |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 7/7; crossword 55→90% Released-ready; shiritori first-audit 42% |
| 12 telemetry | none — prompt-only | 5/7; game_completed brain-drill + test (07-18); canonical registry scaling |

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
