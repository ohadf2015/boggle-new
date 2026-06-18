# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-12..06-18 (7 report nights).** Code-ship by lane: every lane 7/7 shipped (gate-salvaged or clean). **Gate wedge FIX LANDED `06be04691` (scope integration gate to changed-cone) — tonight 06-18 is the first post-fix run; verify it stops docs-only salvage over next 2 nights before declaring resolved.** Three other infra leaks ALSO closed on master this window: Supabase MCP headless probe (`7f9c145f8`/`20b569a4f` — probe TRANSPORT not auth), stranded-ref auto-dispose (`3a25418fb` — clears the 06-13 strand that failed 4 nights), reddit RSS fallback (`c5b0c4c10`). PostHog backlog narrowed to 1 dark: `exp-game-abandon-confirm-v1` WIRED `bc4d93d1f`; `exp-mp-quickplay-wait-v1`+`exp-invite-arrival-clarity-v1` live (206583/206584). Only `exp-practice-wheel-cta-v1` still unwired.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Lane 05 shipped door-corridor HUB (HubFoyer→inline rooms, escape-room theme). Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, edits existing files only, keeps admin gate (promote = founder 🚀). `polish:try` 100% try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 17 records)
- **polish:try ×11 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish (word-tower, word-forge, word-alchemy, shiritori ×2, sealed-bid ×3, crossword, crane ×2). Variable-reward + social-share dominate. Top targets for lane 05. (5+ weeks of 100% try-rate)
- **idea:build ×2 / idea:pass ×2** — even split, low volume. Polish still OUTRANKS new ideas ~5:1 by volume. Lane 04 keep surfacing, lane 05 prioritise polish.
- **night:good ×1 / night:meh ×0** — positive run-quality. No self-critique trigger (threshold meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 30+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-18)
- **Gate cone-scope fix — VERIFY (was #1 infra, now verifying)** — `06be04691` scopes integration gate to changed-cone. 06-18 first post-fix run. If next 2 nights ship code clean (no docs-only salvage), close this. If wedge recurs, chronic-red suites (`PracticeWheelSandbox` drag/pixiIndices, `wordHandler.blast*`, `blastTileGeneration`, `blastModeManager.thaw`) are leaking into the cone — fix those tests. Status: verifying.
- **`exp-practice-wheel-cta-v1` (last dark experiment)** — registered 06-14, still UNWIRED (no `PracticeWheelSandbox` retry-cta variant). 43% practice-funnel drop unmeasured. Lane 03: wire variant + emit FLAG-NEEDED in one lane. Status: open.
- **3 Supabase migrations pending manual apply** — `perf_advisor_fixes` (auth_rls_initplan + word_pacts FK index), `perf_drop_unused_index` (idx_offerwall_postbacks_user 0-scan). MCP-headless fix landed; verify these apply on next MCP-up night. Status: open, monitor.
- **`/es/multiplayer` CLS regressed 0.144→0.288 (+100%)** — exceeds 20% threshold, n≥50, root cause unknown. Highest perf priority. Status: open, lane 02 profile.
- **`/he` INP 158→264ms (+67%, n≥50)** — 3rd watch night, undiagnosed; LCP already fixed 06-16 (`AnimatedSplash` isNative-gate). Status: open, profile.
- **`/es/multiplayer` INP 352→442ms POOR** — `useGridInteraction` cellNodeMap pre-pop shipped 06-18 (moves hot-path query off frame); re-measure. Status: watch.
- **`/en` home LCP 4440ms POOR (n=57, first reading)** — need 2nd baseline before naming a suspect. Status: open.
- **Dead flags (3)** — `share-prompt-timing` (~72d ~0 exp), `show-signup-after-first-win` (inconclusive), `mp-signup-nudge-copy-v1` (0/77 converts). Recommend retire/kill. Status: open, human.
- **AdSense E-E-A-T re-submit window OPEN** — 27 blog ISR + Article/Person/HowTo schema + editorial-policy all live; re-submit ~2026-06-18+. Status: open, lane 08.
- **Spanish "scrabble" surge (ride, lane 06)** — `scrabble en español` +1283% WoW; ES MP page reframed off "sin turnos" anti-intent (+800Δ est clicks 06-18). Status: ride.
- **Bing parity gap** — 104 missing top-10 queries; IndexNow batches submitted. Status: awaiting crawl.

## Idea backlog (founder-signalled)
Lane 04 surfaced 28 ideas this window, zero mechanic repeats: Clue Budget, Room Cipher (→Word Vault), Shortest Path, Wager Word, Quote Untangle, Sealed Bid Round Table. Lane 05 builds admin-gated; polish OUTRANKS new ideas by volume.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 ship every night; #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship (Word Vault hub 06-13, 3 named asks one run). (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/red night still shipped its artifact. Floor never zero. (7/7)
- **`revalidate=N` over `force-dynamic`** — `/es/multiplayer` LCP −17% cumulative; 27 blog pages ISR-cached, 0 regressions. Doctrine.
- **Security hardening via zero-callsite DEFINER/RLS REVOKE** (lane 01) — 10 migrations this window, 0 reverts, all reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — 4+ dropped this window (offerwall_postbacks, school_leads_created, blocked_entities_expires, user_reports_pending), safe + reversible.
- **TDD on new pure modules / polish components** (lane 05) — 6 features shipped TDD-green this window (Shiritori ghost-turn + tempo + pressure-border, Alchemy echo card, Crane shudder, Sealed-bid bluff card), 0 regressions, 0 hot-fixes. prefers-reduced-motion gated. (highest new-code ship rate)
- **n≥50 sample-floor gate** (lane 02) — held `/he` + `/es/mp` swings as MONITOR until floor crossed; never named sub-floor suspects. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)
- **Infra self-repair landed** — gate cone-scope, MCP transport-probe, stranded-ref auto-dispose all fixed via lane/nightly commits this window. The loop is fixing its own plumbing. (new, verify)

## What to avoid (failed this week)
- **Full-repo vitest in the gate** — wedged 5/6 nights pre-fix (281–358 pool-timeouts → rc=124 → docs-only salvage). FIX LANDED `06be04691`; do not revert to full-suite scope. (was #1 infra)
- **Defining an experiment without wiring + flag in one lane** — `exp-practice-wheel-cta-v1` registered 06-14, still dark 4 nights later: 43% funnel drop unmeasured. Rule: define→wire→emit FLAG-NEEDED in ONE lane, never define-only. (high)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one budget = partial (06-12 ja/es dropped, shiritori tempo page-wire slipped a night to `2a4ddf2c5`). Pick ONE polish; ship locales FIRST. (high-frequency)
- **Working-set cap (~8) dropping a locale** — write translations BEFORE component/page. (high)
- **Flagging a Web-Vitals regression on sub-floor/noisy sample** — never name a suspect below n≥50 in BOTH runs (`/en` LCP held at first reading). (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 30+ nights, 0 signals; RSS fallback landed `c5b0c4c10`. Stop retrying OAuth. (kept)

## Open watches (carry forward)
- **Gate cone-scope** — fix landed `06be04691`, verify 2 nights. Status: verifying, infra.
- **`exp-practice-wheel-cta-v1`** — last dark experiment, needs wiring. Status: open, lane 03.
- **3 Supabase migrations** — pending manual/MCP apply. Status: open, monitor.
- **`/es/mp` CLS +100% · `/he` INP 264ms · `/es/mp` INP 442ms · `/en` LCP 4440ms** — n≥50, profile. Status: open, lane 02.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — retire/kill. Status: open, human.
- **AdSense re-submit** — window open 06-18+. Status: open, lane 08.
- **Bing parity** — 104 missing top-10 queries, IndexNow submitted. Status: awaiting crawl.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+ / leaderboard/PageClient 519** — >500-line refactor deferred (blocks `exp-leaderboard-play-cta` wiring). Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 10 zero-callsite REVOKE + 4 index drops this window, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic (−17% /es/mp LCP) + /he LCP root-cause fix, 0 reverts |
| 03 engagement | `frontend-design` | 9+ events + 4 experiments wired; 3/4 now live |
| 04 competitor | `humanizer` | 7/7 docs-only; 28 ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 6 polish components shipped 0 reverts (ghost-turn, tempo, pressure-border, echo card, shudder, bluff) |
| 06 seo | `seo-daily` | 7/7; ES scrabble +1283%, +800Δ click reframe, HE daily emerging |
| 07 self-learn | none — prompt-only | 7/7 |
| 08 adsense | `humanizer` | 7/7; blog ISR + JSON-LD + author/editorial E-E-A-T |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (landed `c5b0c4c10`); OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (30+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).
