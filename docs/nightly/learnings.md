# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-10..06-15 (6 report nights).** Code-ship by lane (nights present): 01=6/6, 02=6/6, 03=4/6 (2 partial), 04=6/6, 05=6/6 (06-12 partial ja/es), 06=6/6, 07=6/6, 08=6/6, 09=6/6, 10=6/6. **Gate fully clean: 1/6 (06-10).** Other 5 nights = full-suite gate WEDGED (rc=124 timeout / file-cap) → authored code salvaged to `~/logs/lexi-nightly/salvaged-code-*`, **docs-only shipped**. **Push failed 2/6 (06-13 "lost the window" ×4 retries, 06-15).** Mandatory-Artifact floor kept all 6 nights non-zero. **Dark-experiment gap WIDENED 3→4:** `exp-mp-quickplay-wait-v1` (06-09), `exp-invite-arrival-clarity-v1` (06-10), `exp-practice-wheel-cta-v1` (wired 06-14), `exp-game-abandon-confirm-v1` (NEW 06-15). All code-complete + wired + tested; ZERO PostHog flags ≥6 nights. 94 quickPlay rage-clicks + 83% invite drop + 43% practice drop + 42% game-completion drop (185 silent abandons/7d) — all measured, all dark. **Human flag-creation is the loop's single biggest leak.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Lane 05 reworked HUB (inline 6-door corridor, +3 events). Puzzle MECHANICS (cipher jar 1.2, logic-sequence 1.4) + A/B still deferred — directive NOT fully discharged. Status: open, lane 05.
- **Polish party games (admin-only)** (2026-06-05). Lane 05. `polish:try` is the priority queue. Last-7d: **polish:try ×11 vs idea:build ×4** — polish remains dominant appetite. New modes/tiles stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap still ~8. Ship all 5 locales in one night; write translations FIRST.

## Telegram-button feedback (last 7d, 19 records)
- **polish:try ×11 / polish:pass ×2 = 85% try-rate** — pure-positive on polish; top targets for lane 05.
- **idea:build ×4 / idea:pass ×1 = 80% build rate** (up from 67%) — daily-mode-idea appetite recovered. Lane 04 keep surfacing, lane 05 still prioritise polish (11 vs 4 volume).
- **night:good ×0 / night:meh ×0** — run-quality button under-engaged (20+ nights). No self-critique trigger (threshold meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 28+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-15)
- **PostHog flags never created (highest, ≥6 nights, blocked-on-human)** — 4 experiments fully wired+translated+tested but dark. Lane 03 MUST emit a "FLAG NEEDED: <key> <variants> <hypothesis>" digest block every night until flags exist:
  - `exp-mp-quickplay-wait-v1` [control, wait-overlay] — 94 rage-clicks/7d
  - `exp-invite-arrival-clarity-v1` [control, status-card] — 83% invite drop
  - `exp-practice-wheel-cta-v1` [control, retry-cta] — 43% practice drop
  - `exp-game-abandon-confirm-v1` [control, quit-confirm] — 42% game-completion drop (185 abandons/7d)
- **Gate wedge (5/6 nights) = full vitest suite hangs** — 281–358 pool-timeout events/night; recurring red: `PracticeWheelSandbox` drag/pixiIndices mock-drift, `wordHandler.blast*` scoring/emit, `blastTileGeneration` locked/key. Full `npm run test` in the gate hits the 5400s backstop. Status: open, infra (see loop-improvements).
- **File-cap docs-only drop** — 27 blog-page ISR edits + lane code in one night exceeds gate cap. Split blog batches from lane code across nights. Status: open.
- **`/he` home regression WORSENING (now n≥50)** — CLS 0.386→0.460 (+19%), INP 158→264ms (+67%), LCP ~4358–4764ms POOR. RTL font-swap / direction-recalc suspected. Crossed sample floor 06-14 → now profile-eligible. Status: open, profile.
- **`/es/multiplayer` IMPROVING** — LCP 4903→3572ms (−13%), INP settled ~392ms post-ISR. Earlier INP swing confirmed traffic-composition noise. Status: MONITOR, de-escalate.
- **`/en` home INP 360ms (n≥50)** — undiagnosed, above floor. Status: open, profile.
- **Spanish "scrabble" surge** — "scrabble online" +44% impr, "scrabble online español" +1283% WoW, "jugar al scrabble" +231%; pos 5.9→5.6. Status: ride hard (lane 06).
- **Hebrew daily** — `המילה היומית` +907% WoW; internal link shipped 06-11/12. Status: resolving, awaiting crawl.
- **Bing parity gap** — 105 missing top-10 queries, IndexNow batch ready. Status: open.
- **Supabase MCP flaky** — unavailable 06-12/13/15; migrations written, applied next run. Status: monitor.

## Idea backlog (founder-signalled, ~80% build rate)
Lane 04 S-effort dailies: Pyramid Descent, Reverse Dictionary, Word Telescope, Shadow Word, Logic Mosaic, Clue Budget Daily. Lane 05 builds admin-gated — polish still OUTRANKS new ideas by volume. Zero mechanic repeats in 30+ surfaced.

## What works (validated this week)
- **Founder-directive fast path** — free-text directives = top of queue, beat button signals. (strongest)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 = 18/18 ship 06-10..06-15. #1 reliability lever = eliminate MCP round-trips. (18+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage/red night still shipped its artifact. Floor never zero. (6/6)
- **`revalidate=N` over `force-dynamic`** on SSR-cacheable routes — `/es/multiplayer` LCP −13% sustained, 27 blog pages 24h-cached, daily routes. Zero regressions. Doctrine.
- **Security hardening via DEFINER/RLS REVOKE** (lane 01) — 10 migrations shipped this window (offerwall/word/community/level upserts, web_vitals + teacher_access_requests INSERT), 0 reverts, all reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01) — 4 this window, safe + reversible.
- **TDD on new pure modules** — highest ship rate for new code (towerArchitectTier, ghostMultiplier, near-miss shudder, sealed-bid bluff counter). 5–13 tests/feature. (stable)
- **frontend-design for mode polish** (lane 05) — 6/6 polish components shipped clean, 0 reverts, prefers-reduced-motion gated.
- **n≥50 sample-floor gate** (lane 02) — held `/es/mp` INP swing + `/he` sub-floor as MONITOR until 06-14. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Shard pre-push tests by measured cone size** (`ef650a29e`, `03d6abaed`) — killed exit-144 OOM on translation/LanguageContext mega-hubs.
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)

## What to avoid (failed this week)
- **Wiring an experiment without a flag-creation handoff** — now 4 dark experiments ≥6 nights, gap WIDENING not narrowing. Lane 03 MUST emit "FLAG NEEDED" digest block. (highest, persisting)
- **Running the full vitest suite in the gate** — 5/6 nights wedged on pool-timeouts (281–358/night) + chronic red suites (PracticeWheelSandbox, wordHandler.blast*). rc=124 → docs-only salvage. Gate should scope tests to changed-cone, not full-repo. (highest infra)
- **Push-fail stranding** — 06-13 (×4 "lost the window") + 06-15 failed to push; local commit survived unsynced. Runner MUST rebase-then-push, verify by GREPPING origin content not SHA. (#1 gate-adjacent failure)
- **Blog-ISR batch + lane code in one night** — 27 files + lane edits exceed gate cap → code dropped 3 nights. Split blog batches from feature code.
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one 15-min budget = partial/timeout. Pick ONE polish; ship locales FIRST. (high-frequency)
- **Working-set cap (~8) dropping a locale** — 05 hit cap → ja/es incomplete 06-12. Write translations BEFORE component/page. (high)
- **Flagging a Web-Vitals regression on sub-floor/noisy sample** — never name a suspect below n≥50 in BOTH runs. (holding)
- **`rg` as sole search path** — EACCES blocked callsite verification before; keep `find|xargs grep` fallback. (high)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 28+ nights, 0 signals. RSS only; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **PostHog flag-creation backlog (4 dark experiments)** — blocked-on-human, surface every digest. Status: open.
- **Gate wedge / full-suite timeout** — scope gate tests to changed-cone. Status: open, infra.
- **Invite 83% / Practice 43% / Game-completion 42% funnel drops** — instrumented + wired, dark pending flags. Status: open.
- **`/he` home CLS 0.460 + INP 264ms (+67%)** — now n≥50, profile-eligible. Status: open, profile.
- **`/en` INP 360ms** — undiagnosed above floor. Status: open.
- **Word-vault puzzle depth** (06-13 directive) — hub reworked; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Bing parity** — 105 missing top-10 queries, IndexNow ready. Status: open.
- **AdSense E-E-A-T** (lane 08) — all 27 blog ISR; author/bylines partial; re-submit window ~2026-06-18+. Status: open.
- **Lane 10 (dictionary) slowest lane** — 59m avg (29–73m range); progressive slowdown contributes to gate timeout. Status: watch.
- **Gate clean-rate 1/6** — full-suite timeout + push-fail the two wedge modes. Status: watch.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead flags** — `share-prompt-timing` (~72d, ~0 exposures), `show-signup-after-first-win` (41 total, inconclusive), `mp-signup-nudge-copy-v1` (0/77 converts), `adventure-difficulty-tuning`. Recommend retire/kill. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 10 DEFINER/RLS REVOKEs + 4 index drops 06-10..06-15, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic + cone-shard OOM fix, 0 reverts |
| 03 engagement | `frontend-design` | 4 experiments wired 06-09..06-15 (all dark pending flag) |
| 04 competitor | `humanizer` | 6/6; ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 06-10..06-15 polish + word-vault hub all shipped, 0 reverts |
| 06 seo | `seo-daily` | 6/6; ES scrabble +44–1283% impr, HE daily +907% |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 6/6; 27 blog ISR + JSON-LD + verification meta |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback; OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (28+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
