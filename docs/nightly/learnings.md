# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-14..07-20 (report nights 07-14/15/16/18/19/20; 07-17 lost to preflight abort).** **This week's story = mode pipeline + engagement engine both healthy; gate + MCP still the two frictions.** (1) **Crossword RELEASED at 90%** (07-16); lane 11 rotated to **shiritori**, 0→55% in 2 nights (turn-timer countdown bar shipped) — 2 majors left (`dictCheckJa` network-vs-invalid, TDD gap). (2) **Lane 03 engagement 6/6** — 4 flags wired+evented same-night (click-feedback, lobby-connect, round-reaction, rival-word). (3) **MP CLS regression FIXED** (07-20): `AutoHideHeader` spacer null→rendered on socket reconnect drove `/en/multiplayer` to 0.979; fix = always render header, toggle visibility. **#1 remaining friction = Supabase MCP still mostly-dry** (07-20 probe 3/3 fail; ~1-2/6 nights up) + preflight-abort silent-loss (07-17).

## FOUNDER DIRECTIVE — highest priority
- **2026-07-20 (MCP still mostly-dry, corrects last week):** despite 07-16 apply, 07-20 probe failed 3/3 (cold-boot timeout) and Supabase has been absent most nights. Treat MCP as **intermittent, mostly-down**. On ANY probe:ok night, lane 01/02 drains the ~6 pending migrations FIRST (`web_vitals_player_id_fk_index` = long carry). HUMAN: mint a **never-expire** `SUPABASE_ACCESS_TOKEN` for uptime.
- **2026-07-18 (crossword GRADUATED, binding):** crossword Released. Lane 11 on **shiritori** (55% as of 07-20; remaining: `dictCheckJa` can't distinguish network-fail from invalid-word, countdown-timer TDD gap, visual QA). Do NOT resume crossword or word-tower audits.
- **2026-07-10 (word-tower GRADUATED, binding):** word-tower Released — no readiness audit. Carried: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) = founder design call, not autonomous.
- **2026-07-06 (MODE CULL, binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). STOP polishing/auditing/pitching these — feedback STILL surfaces votes for them (`idea:build` Word Alchemy, `polish:try` Word Forge/Alchemy this window); IGNORE those, they target dead modes. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic + SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window)
- **5 callbacks total, all founder (`of201`), through 07-15** (feedback file stops 07-15 — button volume low; if <2/wk flag Telegram card CTA visibility).
- **0 `night:good`, 1 `night:meh` (07-15)** — reacting to the gate-failed docs-only salvage night. Run-health complaint, not code-quality. 1 meh < 3 threshold → no sharp self-critique required. Reinforces: **gate/preflight reliability IS the user-visible quality signal.**
- **3 `idea:build`** (Blast Ghost Round, Word Alchemy elemental burst, Sealed Bid async challenge) + **3 `polish:try`** (Crossword Clue Scramble ✅ shipped, Word Forge Iron Streak, Word Alchemy particle). **2 of 3 build + 2 of 3 polish votes target CULLED modes** (Alchemy, Forge) → idea generator STILL pitching dead modes; wastes vote budget.
- **Only live-mode steering votes worth surfacing:** Blast "Ghost Round" (`idea:build`, still unbuilt) + Sealed Bid async challenge (`idea:build`). Lane 04/05 surface a buildable slice.
- **0 `reddit:*`, 0 `mode:keep/drop/promote`** this window.

## What works (validated this week)
- **Same-run flag+event WIRE (lane 03, 6/6)** — create the PostHog flag AND wire its conditional render + its event the same night. 4 shipped this window (`exp-homepage-click-feedback-v1`, `exp-mp-lobby-connect-feedback-v1`, `exp-mp-round-reaction-v1`, `exp-mp-results-rival-best-word-v1`). 0 zombie flags authored. Lane 03 is the most reliable lane. (validated)
- **Always-render + toggle-visibility beats conditional-mount for CLS** — MP CLS 0.979 root = `AutoHideHeader` spacer went null on async socket reconnect after hydration. Fix = always render header, manage show/hide via context (`isInGame`), never add/remove DOM. Applied `multiplayer/PageClient.tsx` 07-20. Audit any layout element toggled on async state. (high-value SPEED)
- **Framer Motion `initial={false}` on above-fold entrances** — `initial={{opacity:0}}` serializes `opacity:0` into SSR HTML → browser skips it as LCP candidate → LCP gated by hydration. `initial={false}` keeps variant crossfades, kills the penalty. Applied `InteractiveMascot.tsx` (07-18). Audit any above-fold `initial` opacity/scale. (high-value SPEED)
- **Attacking the gate CLASSIFIER holds** — `c3973c715` (07-14 vitest fork cap) cut vitest-rc124 salvage: 07-14/07-15 salvaged, then 0 for 3 nights. Strongest gate win in 40+ nights. (validated)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. (doctrine, 45+ nights)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF ticks** — 0 revert. Guard before `.clear()`/`.draw()`/`.geometry`/GSAP `.destroyed`; WebGL context-loss nulls render context BEFORE `destroyed=true` — guard both. Return BOOLEAN not bare Capacitor proxy. (doctrine)
- **try/catch on async generation codepaths** — bare `.then()` on a generator that can return null wedges the loader. (validated, lane 11 crossword/shiritori)
- **Autonomous least-privilege security fix** — lane 01 `REVOKE`d a stray upsert grant (07-19), no schema change — reversible, small blast radius, shipped. Grant/revoke on functions is autonomous-safe (unlike RLS-replace/drop). (validated, lane 01)
- **Telemetry impact confirmed by delta** — 07-20 verdicts: `exp-singleplayer-word-goal-v1` game_completed 4.4→9.9/day (+125%); blast `results_viewed` 0→28, word-hunt 0→12, SPA `game_abandoned` 0→165. Wire + verify-by-delta the next night works. (validated, lane 12)
- **fetchLanding parallelization** (−66% LCP) + **eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor** + **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs dicts** + **local JWT verify on read-only GET** + **`DirectionalIcon` for RTL back/exit**. (doctrine)

## What to avoid (failed this week)
- **Idea/polish generator STILL pitches CULLED modes** — this window's own feedback: `idea:build` Word Alchemy, `polish:try` Word Forge + Word Alchemy — all deleted 07-06. The cull-list filter proposed last week was NOT shipped. FIX (lane 04/05): filter the mode pool against the cull list before generating cards. (carried, still open)
- **Supabase MCP mostly-dry** — 07-20 probe 3/3 cold-boot fail; absent most nights despite a 07-16 apply. 6 migrations pending, FK-index + RLS audits blocked. Last week's "drought broke" was over-optimistic — it's ~1-2/6 nights up. (open, escalating)
- **Preflight abort eats a whole night, silently until 9am** — 07-17 aborted on dirty tree + off-master; auto-recover correctly refused → NO report, night lost, 1 `night:meh`. The abort is CORRECT; the SILENCE is the bug. FIX: (a) Telegram-alert on preflight abort WITH reason, (b) pre-midnight cron warns if repo off-master/dirty. (#1 friction, carried unshipped)
- **Homepage LCP regressed + CLS new** — homepage LCP 4117→5301ms (+28.8%, AnimatePresence serialized `opacity:0`), CLS 0.903 NEW (`NativeLanguageBanner` + `AutoHideHeader` spacer mismatch). `winner.webp` ~393KB no poster frame. Lane 02 fixes need visual QA before ship. (open, lane 02)
- **Typecheck flake shipped at reduced strength (07-16, 07-19)** — unattributable red; `tsc --noEmit` + `test:changed` pass independently. Cause unknown; accepted risk. Watch for a real regression hiding behind "flake". (open watch)
- **`next build`/full `tsc`/full test in a LANE verify path** — banned; eslint-changed-files-only. Per-lane commits / demoting `logger.warn→debug` to silence Sentry / headless realtime-table creation — banned, held. (kept)

## Open watches (carry forward)
- **Supabase MCP mostly-dry (~1-2/6 nights)** — drain ~6 pending migrations on each connected night (`web_vitals_player_id_fk_index` long carry). HUMAN: mint never-expire `SUPABASE_ACCESS_TOKEN`. Status: open, escalating.
- **Cull-list filter on idea/polish generator** — votes wasted on dead modes 2nd week running. Status: open, lane 04/05, NOT YET SHIPPED.
- **Preflight-abort alerting** — lost 07-17, no alert. HUMAN: keep repo on master + clean, or add pre-midnight dirty-tree warn + abort Telegram alert. Status: #1 friction, carried.
- **Homepage LCP 5301ms + CLS 0.903 + 393KB webp no poster** — needs visual QA before ship. Status: open, lane 02.
- **Shiritori 55%→release** — `dictCheckJa` network-vs-invalid, countdown TDD gap, visual QA. 2-3 nights → ~75-80%. Status: open, lane 11.
- **Telemetry backlog ~32 events** — next: survival `results_viewed` (56 game_completed, 0 results_viewed); `lobby_daily_ember_shown` orphan (346→0, dead `LobbyDailyEmber.tsx`) — remove component or wire; add orphan events to `GrowthEvent` union so classifier catches them. Status: resolving, lane 12.
- **Zombie flag `exp-mp-room-join-loading-v1`** — active in PostHog, 0 call sites. HUMAN: deactivate. Status: open.
- **Blast "Ghost Round" + Sealed Bid async** (`idea:build`) — 2 live-mode steering votes unbuilt. Status: open, lane 04/05.
- **Word Tower daily-leaderboard Layer B** — founder design call. Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install + Sentry MCP write-403** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/6 ship; Pixi null-guards; REVOKE security fix 07-19 (MCP up ~1-2/6) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 2/6 (research-heavy); MP CLS fix shipped 07-20; homepage LCP/CLS + webp-poster open |
| 03 engagement | `frontend-design` | 6/6 — most reliable; 4 flags wired+evented same-night; 0 zombie flags |
| 04 competitor | `humanizer`, `game-designer` | research-only; polish votes ship via lane 05; MUST filter cull-list (2nd wk unfixed) |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5/6 mode polish (crossword ClueScramble, shiritori, sealed-bid); 0 reverts |
| 06 seo | `seo-daily` | 3/6 rotation; ES multiplayer `scrabble online` (+694 clicks) rewrite; native review mandatory |
| 07 self-learn | none — prompt-only | ID'd cull-filter-gap + MCP over-optimism correction; fork-cap validated |
| 08 adsense | `humanizer`, `higgsfield-generate` | 1/6 rotation; ≥300w audits; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | 4/6 docs+copy companion to 03/12; daily-first funnel |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 1/6 rotation; candidate review |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 5/6; crossword 85→90% Released; shiritori 0→55% |
| 12 telemetry | none — prompt-only | 4/6; +125% word-goal, results_viewed/game_abandoned wired + delta-verified |

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
