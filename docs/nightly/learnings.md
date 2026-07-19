# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-13..07-19 (report nights 07-13/14/15/16/18/19; 07-17 lost to preflight abort).** **This week's story = two multi-week blockers RESOLVED.** (1) **Supabase MCP drought BROKE** — probe:ok on **07-16 AND 07-19**; `word_pacts_player2_id_fk_index` migration applied via `exec_sql` (CONCURRENTLY, zero lock) 07-16. Backlog 6→5. Not "22 consecutive dry" — it's intermittent (~2/6 nights up), and a recovered night DOES drain the queue. (2) **Crossword GRADUATED at 90%** (07-16) → Released; lane 11 rotated to **shiritori**, now **55%** (42%→55%, turn-timer countdown bar shipped). Gate classifier healthy post-`c3973c715` (fork cap): salvage 1/6 (07-15). Backbone **01/02/03/05/11 shipped 5/5** on nights run. **#1 remaining friction = preflight abort (07-17, whole night lost, no alert until 9am).**

## FOUNDER DIRECTIVE — highest priority
- **2026-07-19 (MCP drought BROKEN):** MCP connected 07-16 + 07-19; one migration drained. On ANY connected night lane 01/02 drains the 5 remaining pending migrations FIRST (esp. `web_vitals_player_id_fk_index`, 22-night carry). Still human-blocked on minting a **never-expire** `SUPABASE_ACCESS_TOKEN` for full nightly uptime (vs ~1/3).
- **2026-07-18 (crossword GRADUATED, binding):** crossword hit **90%** (07-16) — Released. Lane 11 is on **shiritori** (55% as of 07-19; remaining: `dictCheckJa` can't distinguish network-fail from invalid-word, countdown-timer TDD gap, visual QA). Do NOT resume crossword or word-tower audits.
- **2026-07-10 (word-tower GRADUATED, binding):** word-tower is Released — no readiness audit. Carried: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) = founder design call, not autonomous.
- **2026-07-06 (MODE CULL, binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). STOP polishing/auditing/pitching these — the feedback stream STILL surfaces polish votes for them; IGNORE those, they target dead modes. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic + SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window)
- **1 `night:meh` (07-15)** — reacting to the GATE-FAILED docs-only salvage night. Run-health complaint, not code-quality. 1 meh < 3 threshold → no sharp self-critique required. Reinforces: **gate/preflight reliability IS the user-visible quality signal.**
- **0 `night:good`, 0 `mode:keep/drop/promote`, 0 `reddit:*`** this window (feedback file stops 07-15 — button volume dipped; if <2/wk flag Telegram card CTA visibility).
- **`polish:try`/`idea:build` votes keep landing on CULLED modes** (word-vault, word-forge, word-alchemy — deleted 07-06). The idea generator (lane 04/05) is pitching dead modes → wastes the founder's vote budget. FIX: filter the mode pool against the cull list before generating cards. Live-mode votes: shiritori (Category Chain Bonus), brain-drill (Spaced Resurrection), crossword (Clue Scramble ✅ shipped), sealed-bid, crane.
- **Only unbuilt live-mode vote worth surfacing = Blast "Ghost Round"** (`idea:build` 07-11, still unbuilt). Lane 04/05 surface a buildable slice.

## What works (validated this week)
- **A recovered MCP night DRAINS the migration queue** — 07-16 applied `word_pacts_player2_id_fk_index` via `exec_sql` CONCURRENTLY, zero lock. The drought was CONNECTIVITY (intermittent PAT/transport), not the apply-step. On any probe:ok night, run migrations FIRST. (NEW, resolves 3-week narrative)
- **Framer Motion `initial={false}` on above-fold entrances** — `AnimatePresence`/`motion` with `initial={{opacity:0}}` serializes `opacity:0` into SSR HTML → browser skips it as LCP candidate → LCP gated by hydration. `initial={false}` keeps variant crossfades, kills the penalty. Applied `InteractiveMascot.tsx` (07-18). Audit any above-fold `initial` opacity/scale. (high-value SPEED)
- **Attacking the gate CLASSIFIER holds** — `c3973c715` (07-14 vitest fork cap) cut salvage 4/7 → 1/6 (07-15) → 0 since. Strongest gate win in 40+ nights. (validated)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. (doctrine, 40+ nights)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF ticks** — 0 revert (WordTower SmashScene, WordWheel, Blast results-highlight trap). Guard before `.clear()`/`.draw()`/`.geometry`/GSAP `.destroyed`; WebGL context-loss nulls render context BEFORE `destroyed=true` — guard both. Return BOOLEAN not bare Capacitor proxy. (doctrine)
- **Same-run flag+event WIRE** — 07-18 `exp-mp-lobby-connect-feedback-v1` + `mp_lobby_join_attempted`; 07-19 `game_abandoned` SPA path + `mp_round_ready_clicked`. Ship the conditional render AND its event the same night — no zombie flags authored this window. (validated, lane 03)
- **try/catch on async generation codepaths** — bare `.then()` on a generator that can return null wedges the loader. (validated, lane 11 crossword/shiritori)
- **Autonomous least-privilege security fix** — lane 01 `REVOKE`d a stray upsert grant (07-19), no schema change — reversible, small blast radius, shipped. Grant/revoke on functions is autonomous-safe (unlike RLS-replace/drop). (NEW, lane 01)
- **fetchLanding parallelization** (−66% LCP) + **eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor** + **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for RTL back/exit**. (doctrine)

## What to avoid (failed this week)
- **Preflight abort eats a whole night, silently until 9am** — 07-17 aborted on dirty tree + off-master (`feat/pricing-psychology-i18n`); auto-recover correctly refused (never auto-run off-master/dirty) → NO report, night lost, 1 `night:meh`. The abort is CORRECT; the SILENCE is the bug. Fix: (a) Telegram-alert on preflight abort WITH the reason, (b) pre-midnight cron warns if repo is off-master or dirty. (#1 friction, carried)
- **Idea/polish generator pitches CULLED modes** — feedback shows repeated `polish:try:word-vault/word-forge/word-alchemy`; deleted 07-06. Filter the pool against the cull list. (NEW)
- **Homepage LCP: ~393KB animated `winner.webp`, no poster frame** — `initial={false}` (07-18) removed the hydration penalty; webp weight/poster still open. Add a static first frame/poster. (open, lane 02)
- **MP CLS structural + WORSENING** — `/en/multiplayer` CLS 0.979, `/es` 0.716 CRITICAL (up from 0.574/0.716). Root = header/spacer removed on async socket state after hydration. Fix = always render header, toggle visibility not DOM presence (needs visual QA + small refactor). (open, lane 02, escalating)
- **`next build`/full `tsc`/full test in a LANE verify path** — banned; eslint-changed-files-only. Per-lane commits / demoting `logger.warn→debug` to silence Sentry / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Preflight-abort alerting** — lost 07-17. HUMAN: keep repo on master + clean between nights, or add pre-midnight dirty-tree warn + abort Telegram alert. Status: #1 friction, carried.
- **Supabase MCP up ~2/6 nights (intermittent, not dead)** — drain 5 pending migrations on each connected night. HUMAN: mint never-expire `SUPABASE_ACCESS_TOKEN` for full uptime. Status: RESOLVING (drought broke 07-16).
- **MP CLS 0.979 worsening** — needs header-always-render refactor + visual QA. Status: open, escalating, lane 02.
- **Homepage webp poster frame** — 393KB no-poster. Status: open, lane 02.
- **Shiritori 55%→release** — `dictCheckJa` network-vs-invalid, countdown TDD gap, visual QA. 1-2 nights. Status: open, lane 11.
- **Cull-list filter on idea/polish generator** — votes wasted on dead modes. Status: NEW, lane 04/05.
- **Blast "Ghost Round" (idea:build 07-11)** — one unbuilt live-mode steering vote. Status: open, lane 04/05.
- **Telemetry backlog ~33 events** — next: classic/survival/wheel-rush `results_viewed`/`game_completed`; `lobby_daily_ember_shown` orphan (raw postHog, not in `GrowthEvent` union → add so classifier catches it); `rewarded_ad_offered` −71% (context-gated, no call site — investigate ad-flow). Status: resolving, lane 12.
- **Word Tower daily-leaderboard Layer B** — founder design call. Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403 + zombie-flag `exp-mp-room-join-loading-v1` PostHog deactivation** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/5 nights-run ship; Pixi null-guards; REVOKE security fix + migration applied 07-16 (MCP up 2/6) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 5/5; Framer `initial={false}` LCP fix (07-18); MP CLS 0.979 + webp-poster open |
| 03 engagement | `frontend-design` | 5/5; same-run flag+event wire (07-18/19); PostHog-delta revert holds |
| 04 competitor | `humanizer`, `game-designer` | research-only; polish votes ship via lane 05; must filter cull-list |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5/5 mode polish (crossword ClueScramble, shiritori, sealed-bid); 0 reverts |
| 06 seo | `seo-daily` | 3/3 rotation; ES multiplayer CTR rewrites; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | ID'd MCP-drought-broke + cull-list-filter gap; fork-cap fix validated |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/2; ≥300w audits; education hub link; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | docs-only companion to 03/12; daily-first funnel |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/2 rotation; candidate review |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 5/5; crossword 55→90% Released; shiritori 42→55% |
| 12 telemetry | none — prompt-only | 3/3; brain-drill game_completed (07-18); orphan-event → add to GrowthEvent union |

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
