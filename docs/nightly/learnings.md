# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-11..06-17 (7 report nights).** Code-ship by lane: 01=6/7, 02=6/7, 03=5/7, 04=6/7 (docs-only by design), 05=5/7 (2 partial), 06=7/7, 07=7/7, 08=7/7, 09=6/7, 10=6/7. **Gate: still wedging — 5/6 nights docs-only salvage (06-12,13,14,16) on full-vitest timeout; 06-15/06-17 code clean.** **Two human-blocked seams remain the loop's biggest leaks:** (1) PostHog flag creation — 2 of 4 dark experiments finally got flags 06-17 (`exp-mp-quickplay-wait-v1`, `exp-invite-arrival-clarity-v1`); 2 still dark (`exp-practice-wheel-cta-v1` 43% drop, `exp-game-abandon-confirm-v1` 42% drop / 185 abandons/7d — latter has NO wiring component found yet). (2) Stranded push `refs/nightly-pending/2026-06-13` — STILL unrecovered after 4+ nights; cherry-pick onto moved origin keeps failing. Mandatory-Artifact floor kept every lane non-zero.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Lane 05 shipped door-corridor HUB (HubFoyer, escape-room theme). Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, edits existing files only, keeps admin gate (promote = founder 🚀). `polish:try` 100% try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 14 records)
- **polish:try ×9 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish; 8/9 mapped to existing modes (crane, sealed-bid, word-vault, alchemy, crossword, shiritori, word-forge). Variable-reward + social-share = dominant return-hooks (5/9). Top targets for lane 05.
- **idea:build ×1 (Shortest Path) / idea:pass ×2 (Clue Budget, Quote Untangle)** — low volume; polish OUTRANKS new ideas 9:1. Lane 04 keep surfacing, lane 05 prioritise polish.
- **night:good ×1 / night:meh ×0** — positive run-quality callback (06-15). No self-critique trigger (threshold meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 30+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-17)
- **PostHog flag backlog (highest, blocked-on-human)** — 2 dark experiments remain: `exp-practice-wheel-cta-v1` [control, retry-cta] 43% practice drop; `exp-game-abandon-confirm-v1` [control, quit-confirm] 42% completion drop / 185 abandons/7d (NO wiring component found — lane 03 must build the variant before flag matters). Lane 03 emit "FLAG NEEDED" digest until live. 2 flags created 06-17 = gap narrowing 4→2.
- **Stranded push `refs/nightly-pending/2026-06-13` (#1 gate-adjacent)** — 4+ nights failed auto-recovery; cherry-pick onto moved origin fails (conflict, not network). Needs human: inspect ref, rebase or drop. Status: open, infra/human.
- **Gate wedge (5/6 nights docs-only) = full vitest suite hangs** — 281–358 pool-timeouts/night; chronic-red suites: `PracticeWheelSandbox` drag/pixiIndices mock-drift, `wordHandler.blast*`, `blastTileGeneration`, `blastModeManager.thaw`. Full `npm run test` hits 5400s backstop → rc=124 → docs-only salvage. Fix = scope gate tests to changed cone. Status: open, infra (#1 priority).
- **Supabase MCP flaky** — unavailable 06-15/06-17 (and 06-12/13 earlier). 3 migrations queued for manual apply (`perf_advisor_fixes`, `auth_rls_initplan` on web_vitals + teacher_access_requests, `word_pacts` FK index). Status: monitor.
- **`/he` home Web Vitals** — LCP volatility (4764→6273→fixed 06-16 via `isNative()`-gating AnimatedSplash). CLS 0.460→0.199 improving; INP 158→264ms (+67%) still open, n≥50, profile-eligible. Status: open, profile.
- **`/es/multiplayer`** — LCP/INP IMPROVING (4991→3572ms −28%, ISR revalidate=3600). BUT CLS regressed 0.144→0.288 (+100%), cause TBD. Status: watch CLS 2+ nights.
- **`/en` home INP 360ms (n≥50)** — undiagnosed above floor. Status: open, profile.
- **Spanish "scrabble" surge (ride hard, lane 06)** — `scrabble en español` +231%, `scrabble online` +1283% WoW 6.7k impr pos 5.5 (0.3% CTR = structural brand gap); `alfapet online gratis` +52%. Status: ride.
- **Hebrew daily (lane 06)** — `המילה היומית` pos 8.3 200+ impr, `מילת היום` pos 9.0; internal links shipped all 5 locales. Status: resolving, awaiting crawl.
- **Bing parity gap** — 105 missing top-10 queries; `scrabble online` absent on Bing (pos 5.6 Google). IndexNow batch submitted 06-15. Status: awaiting crawl.

## Idea backlog (founder-signalled)
Lane 04 surfaced this window (zero mechanic repeats in 35+): Clue Budget, Room Cipher (→Word Vault), Shortest Path (idea:build), Wager Word, Quote Untangle, Sealed Bid Round Table. Lane 05 builds admin-gated; polish OUTRANKS new ideas 9:1 by volume.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07/08 = 28/28 ship 06-11..06-17. #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship (Word Vault hub 06-13). (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/red night still shipped its artifact. Floor never zero. (7/7)
- **`revalidate=N` over `force-dynamic`** — `/es/multiplayer` LCP −28% cumulative, zero regressions. Doctrine.
- **Security hardening via DEFINER/RLS REVOKE** (lane 01) — 5+ migrations this window, 0 reverts, reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — 4 dropped this window (blocked_entities_expires, school_leads_created, user_reports_target, offerwall_postbacks_user), safe + reversible.
- **TDD on new pure modules** — highest ship rate for new code (bluff-counter share 13, near-miss shudder, shiritori tempo hook 11). (stable)
- **frontend-design for mode polish** (lane 05) — 4 polish components shipped clean 0 reverts (Alchemy share, Crane shudder, Sealed-bid bluff, Shiritori tempo), prefers-reduced-motion gated.
- **n≥50 sample-floor gate** (lane 02) — held `/he` + `/es/mp` swings as MONITOR until floor crossed. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Shard pre-push tests by measured cone size** — killed exit-144 OOM on translation mega-hubs.
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)
- **Native white-flash root-caused at last** (06-16) — PreResultFanfare entrance tweens, gated behind `prefersStaticFullscreenOverlay()`; 6 prior fixes failed by never reproducing. Lesson: reproduce before fixing.

## What to avoid (failed this week)
- **Running the full vitest suite in the gate** — 5/6 nights wedged on pool-timeouts + chronic-red suites. rc=124 → docs-only salvage. Gate MUST scope tests to changed-cone. (highest infra)
- **Wiring an experiment without flag-creation handoff** — gap narrowed 4→2 (06-17) but `exp-game-abandon-confirm-v1` was DEFINED with no wiring component → can't even A/B. Define→wire→FLAG-NEEDED in one lane, never define-only. (high)
- **Push-fail stranding NOT self-healing** — 06-13 ref failed 4+ nights. Cherry-pick onto moved origin needs conflict handling or drop path, not blind retry. (#1 gate-adjacent)
- **Blog-ISR batch + lane code in one night** — 27 files + lane edits exceed gate cap → code dropped. Split blog batches from feature code. (kept)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one budget = partial (06-12 ja/es dropped, 06-17 shiritori page-wire deferred). Pick ONE polish; ship locales FIRST. (high-frequency)
- **Working-set cap (~8) dropping a locale** — write translations BEFORE component/page. (high)
- **Flagging a Web-Vitals regression on sub-floor/noisy sample** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 30+ nights, 0 signals. RSS only; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **Gate wedge / full-suite timeout** — scope gate tests to changed-cone. Status: open, infra (#1).
- **Stranded push `refs/nightly-pending/2026-06-13`** — 4+ nights unrecovered. Status: open, human/infra.
- **PostHog flag backlog (2 dark)** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1` (needs wiring first). Status: open.
- **Invite 83% / Practice 43% / Game-completion 42% funnel drops** — instrumented; 2 wired+flagged 06-17, 2 pending. Status: open.
- **`/he` INP 264ms + `/es/mp` CLS 0.288 + `/en` INP 360ms** — n≥50, profile next baseline. Status: open, profile.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Bing parity** — 105 missing top-10 queries, IndexNow submitted. Status: awaiting crawl.
- **AdSense E-E-A-T** (lane 08) — 27 blog ISR + Article schema + bylines + editorial policy done; re-submit window ~2026-06-18+. Status: open.
- **Lane 10 (dictionary) slowest lane** — progressive slowdown contributes to gate timeout. Status: watch.
- **Dead flags** — `share-prompt-timing` (~72d ~0 exp), `show-signup-after-first-win` (41, inconclusive), `mp-signup-nudge-copy-v1` (0/77 converts). Recommend retire/kill. Status: open, human.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5+ DEFINER/RLS REVOKEs + 4 index drops this window, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic (−28% /es/mp LCP) + cone-shard OOM fix, 0 reverts |
| 03 engagement | `frontend-design` | 9 events instrumented + 4 experiments wired 06-11..06-17 |
| 04 competitor | `humanizer` | 6/7 docs-only; ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 4 polish components shipped 0 reverts |
| 06 seo | `seo-daily` | 7/7; ES scrabble +1283% impr, HE daily emerging |
| 07 self-learn | none — prompt-only | 7/7 |
| 08 adsense | `humanizer` | 7/7; blog ISR + JSON-LD + author/editorial E-E-A-T |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback; OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (30+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).
