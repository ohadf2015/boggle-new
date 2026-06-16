# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-10..06-16 (7 report nights).** Code-ship by lane (nights present): 01=7/7, 02=7/7, 03=6/7 (1 partial), 04=7/7, 05=6/7 (06-12 partial ja/es), 06=7/7, 08=6/6, 09=6/6, 10=6/6. **Gate: 4 nights DOCS-ONLY salvage (06-11..06-14, full-suite wedge), 06-15 shipped (baseline-red but code clean), 06-16 in progress.** **Push stranding NOT cleared:** the 06-13 commit (`refs/nightly-pending/2026-06-13`) STILL fails auto-recovery — 06-16 preflight again WARNed "cherry-pick/push failed; will retry next run" → 4 consecutive nights stranded. **Dark-experiment gap = 4, ZERO PostHog flags ≥7 nights:** `exp-mp-quickplay-wait-v1` (94 rage-clicks/7d), `exp-invite-arrival-clarity-v1` (83% invite drop), `exp-practice-wheel-cta-v1` (43% practice drop), `exp-game-abandon-confirm-v1` (42% game-completion drop, 185 abandons/7d). All wired+translated+tested, all dark. Human flag-creation + the stranded-push recovery are the loop's two biggest leaks. Mandatory-Artifact floor kept every lane non-zero.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Lane 05 shipped atmospheric door-corridor HUB (06-13). Puzzle MECHANICS (cipher jar 1.2 ≈ Room Cipher idea, logic-sequence 1.4) + A/B still deferred — directive NOT fully discharged. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out think reward-ad refill." Scoped, not built. Status: open, lane 05/09. NOTE: reward-ad refill touches ad-reward value → ad-UX is lane 09-flagged, economy stays human-queue.
- **Polish party games (admin-only)** (2026-06-05). Lane 05. `polish:try` priority queue. Last-7d **polish:try ×7 vs idea:build ×1** — polish stays dominant appetite. New modes/tiles behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Ship all 5 locales in one night; write translations FIRST.

## Telegram-button feedback (last 7d, 11 records)
- **polish:try ×7 / polish:pass ×0 = 100% try-rate** — pure-positive on polish; top targets for lane 05.
- **idea:build ×1 / idea:pass ×1** — low volume this week (appetite noisy at n=2). Lane 04 keep surfacing; lane 05 prioritise polish (7 vs 1 volume).
- **night:good ×1 / night:meh ×0** — first run-quality callback in 20+ nights; positive. No self-critique trigger (threshold meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 29+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-16)
- **Stranded push `refs/nightly-pending/2026-06-13` (NEW highest gate-adjacent)** — 4 nights of failed auto-recovery. Runner cherry-pick onto origin keeps failing (likely conflict vs files since merged, not network). Needs human: inspect the ref, rebase or drop it. Status: open, infra/human.
- **PostHog flags never created (highest, ≥7 nights, blocked-on-human)** — 4 experiments wired+translated+tested but dark. Lane 03 MUST emit a "FLAG NEEDED: <key> <variants> <hypothesis>" digest block every night until flags exist:
  - `exp-mp-quickplay-wait-v1` [control, wait-overlay] — 94 rage-clicks/7d
  - `exp-invite-arrival-clarity-v1` [control, status-card] — 83% invite drop
  - `exp-practice-wheel-cta-v1` [control, retry-cta] — 43% practice drop
  - `exp-game-abandon-confirm-v1` [control, quit-confirm] — 42% game-completion drop (185 abandons/7d)
- **Gate wedge (4/7 nights docs-only) = full vitest suite hangs** — 281–358 pool-timeouts/night; recurring red: `PracticeWheelSandbox` drag/pixiIndices mock-drift, `wordHandler.blast*` scoring/emit, `blastTileGeneration` locked/key, `blastModeManager.thaw` (06-15 baseline-red). Full `npm run test` in gate hits 5400s backstop. Fix = scope gate tests to changed cone. Status: open, infra.
- **Supabase MCP flaky** — unavailable 06-12/13/15/16 (4 of last 5). Migrations written, queued for manual apply (`teacher_access_requests` RLS, `word_pacts` FK index). Status: monitor.
- **`/he` home — LCP fix shipped 06-16** (AnimatedSplash now `isNative()`-gated; was showing on web, hiding at 600ms → blocking LCP). CLS 0.460 (+19%) + INP 264ms (+67%) STILL open, n≥50, profile-eligible. Status: open, profile after next baseline.
- **`/es/multiplayer` IMPROVING** — LCP 4991→4329→3572ms (−28% cumulative post-ISR revalidate=3600), INP settling ~392ms. Status: MONITOR, de-escalate.
- **`/en` home INP 360ms (n≥50)** — undiagnosed, above floor. Status: open, profile.
- **Spanish "scrabble" surge (ride hard, lane 06)** — `scrabble en español` +1283% WoW; `scrabble online` 7.6k impr pos 5.5 (0.3% CTR — structural brand gap); `alfapet online gratis` +52%. Status: ride.
- **Hebrew daily** — `המילה היומית` 295 impr pos 8.3, `מילת היום` pos 9.0; internal links shipped. Status: resolving, awaiting crawl.
- **Bing parity gap** — 105 missing top-10 queries; `scrabble online` totally absent on Bing (pos 5.6 Google). IndexNow batch ×10 submitted 06-15. Status: open, awaiting crawl.

## Idea backlog (founder-signalled)
Lane 04 S-effort dailies surfaced this window (zero mechanic repeats in 35+): Shadow Word, Logic Mosaic, Clue Budget, Room Cipher (→Word Vault 1.2), Wager Word, Shortest Path, Quote Untangle. Lane 05 builds admin-gated — polish still OUTRANKS new ideas by volume (7:1).

## What works (validated this week)
- **Founder-directive fast path** — free-text directives = top of queue, ship same run (Word Vault hub 06-13). (strongest)
- **Low-MCP / prompt-only lanes never time out** — 04/06 = 14/14 ship 06-10..06-16; lane 07 prompt-only 7/7. #1 reliability lever = eliminate MCP round-trips. (19+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage/red night still shipped its artifact. Floor never zero. (7/7)
- **`revalidate=N` over `force-dynamic`** — `/es/multiplayer` LCP −28% cumulative; 27 blog pages 24h-cached; daily routes. Zero regressions. Doctrine.
- **Security hardening via DEFINER/RLS REVOKE** (lane 01) — 10 migrations this window, 0 reverts, all reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — 5 this window, safe + reversible.
- **TDD on new pure modules** — highest ship rate for new code (towerArchitectTier 7, ghostMultiplier 7, alchemy share 11, near-miss shudder 5, sealed-bid bluff counter 13). (stable)
- **frontend-design for mode polish** (lane 05) — 6 polish components shipped clean, 0 reverts, prefers-reduced-motion gated.
- **n≥50 sample-floor gate** (lane 02) — held `/he` + `/es/mp` swings as MONITOR until floor crossed. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Shard pre-push tests by measured cone size** — killed exit-144 OOM on translation/LanguageContext mega-hubs.
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)

## What to avoid (failed this week)
- **Wiring an experiment without a flag-creation handoff** — 4 dark experiments ≥7 nights, gap NOT narrowing. Lane 03 MUST emit "FLAG NEEDED" digest block. (highest, persisting)
- **Running the full vitest suite in the gate** — 4/7 nights wedged on pool-timeouts (281–358/night) + chronic red suites. rc=124 → docs-only salvage. Gate must scope tests to changed-cone. (highest infra)
- **Push-fail stranding NOT self-healing** — 06-13 ref has failed auto-recovery 4 nights running. Cherry-pick onto a moved origin needs conflict handling or a drop path, not blind retry. (#1 gate-adjacent failure)
- **Blog-ISR batch + lane code in one night** — 27 files + lane edits exceed gate cap → code dropped. Split blog batches from feature code across nights.
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one budget = partial/timeout. Pick ONE polish; ship locales FIRST. (high-frequency)
- **Working-set cap (~8) dropping a locale** — 05 hit cap → ja/es incomplete 06-12. Write translations BEFORE component/page. (high)
- **Flagging a Web-Vitals regression on sub-floor/noisy sample** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 29+ nights, 0 signals. RSS only; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **Stranded push `refs/nightly-pending/2026-06-13`** — 4 nights unrecovered. Status: open, human/infra.
- **PostHog flag-creation backlog (4 dark experiments)** — blocked-on-human, surface every digest. Status: open.
- **Gate wedge / full-suite timeout** — scope gate tests to changed-cone. Status: open, infra.
- **Invite 83% / Practice 43% / Game-completion 42% funnel drops** — instrumented + wired, dark pending flags. Status: open.
- **`/he` CLS 0.460 + INP 264ms** — n≥50, LCP fix shipped 06-16, profile CLS/INP after next baseline. Status: open, profile.
- **`/en` INP 360ms** — undiagnosed above floor. Status: open.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Bing parity** — 105 missing top-10 queries, IndexNow submitted. Status: awaiting crawl.
- **AdSense E-E-A-T** (lane 08) — 27 blog ISR + Article schema + bylines + editorial policy + author page (678w) done; re-submit window ~2026-06-18+. Status: open.
- **Lane 10 (dictionary) slowest lane** — progressive slowdown contributes to gate timeout. Status: watch.
- **Dead flags** — `share-prompt-timing` (~70d ~0 exp), `show-signup-after-first-win` (41, inconclusive), `mp-signup-nudge-copy-v1` (0/77 converts). Recommend retire/kill. Status: open, human.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 10 DEFINER/RLS REVOKEs + 5 index drops 06-10..06-16, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic (−28% /es/mp LCP) + cone-shard OOM fix, 0 reverts |
| 03 engagement | `frontend-design` | 4 experiments wired 06-09..06-15 (all dark pending flag) |
| 04 competitor | `humanizer` | 7/7; ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 06-10..06-16 polish + word-vault hub all shipped, 0 reverts |
| 06 seo | `seo-daily` | 7/7; ES scrabble +1283% impr, HE daily emerging |
| 07 self-learn | none — prompt-only | 7/7 |
| 08 adsense | `humanizer` | 6/6; 27 blog ISR + JSON-LD + author/editorial E-E-A-T |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback; OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (29+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
