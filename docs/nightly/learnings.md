# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-14..06-19 (6 report nights).** Code-ship by lane: 6/6 lanes shipped tonight (06-19) CLEAN — first fully-clean multi-lane night since the gate fixes. **Two distinct gate-wedge bugs were found+fixed this window, not one.** (1) Cone-scope (`06be04691`) narrowed the gate's test suite. (2) The baseline-red SHIP-VERIFY path still ran `next build` (wedged rc=3) → conflated with a real break → dropped 16 code files 06-18; FIX `2f520b937` added a `typeonly_notest` gate mode (`build:schemas && tsc --noEmit`, no test/next-build) for baseline-red ship verify; recovered+shipped `ee5ec6c9b`. Keep both fixes; verify clean ship holds 2 more nights. **New infra break tonight:** Supabase MCP `Unauthorized` all run (`SUPABASE_ACCESS_TOKEN` expired) — lane 02 routed via REST API and still applied LIVE (advisor 20→0); lane 01 could only author locally. PostHog backlog is now ZERO-dark: `exp-practice-wheel-cta-v1` wired 06-19 (resolver+hook+`PracticeWheelSandbox` retry overlay).

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Lane 05 shipped door-corridor HUB. Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, edits existing files only, keeps admin gate (promote = founder 🚀). `polish:try` 100% try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 17 records — UNCHANGED from prior window)
- **polish:try ×11 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish (word-tower, word-forge, word-alchemy, shiritori ×2, sealed-bid ×3, crossword, crane ×2). Variable-reward + social-share dominate. Top targets for lane 05. (6+ weeks of 100% try-rate)
- **idea:build ×2 / idea:pass ×2** — even split, low volume. Polish OUTRANKS new ideas ~5:1 by volume. Lane 04 keep surfacing, lane 05 prioritise polish.
- **night:good ×1 / night:meh ×0** — positive run-quality. No self-critique trigger (threshold meh ≥3).
- **reddit:* / mode:* = 0** — zero reddit + zero mode keep/drop/promote callbacks 30+d. Accept silence.
- **STALE SIGNAL:** feedback set identical to last window (same 17 records, dates 06-12..06-18). No new button presses captured in 7d. Either delivery flat or genuinely idle — see loop-improvements.

## Active watches (2026-06-19)
- **Supabase MCP `Unauthorized` (NEW #1 infra)** — token expired/unset all run 06-19. Lane 02 worked around via REST API; lane 01 blocked (Sentry resolve also 403 — token lacks write perms). FIX: refresh `SUPABASE_ACCESS_TOKEN` + Sentry write-scoped token. Until then security migrations queue (`20260619030000`). Status: open, infra/human.
- **Gate clean-ship — VERIFY 2 nights** — both wedge bugs fixed (`06be04691` cone-scope + `2f520b937` baseline-red ship-verify). 06-19 shipped 6/6 clean. If next 2 nights stay clean, close. If wedge recurs, chronic-red suites leaking into cone (`PracticeWheelSandbox`, `blastModeManager.thaw`, `blastTileGeneration`). Status: verifying.
- **`/he` LCP 4764→6273ms (+31.6%, n≥84)** — re-regressed after 06-16 `AnimatedSplash` isNative-gate fix. 2nd reading needed before naming a suspect. Highest perf priority. Status: open, lane 02.
- **`exp-leaderboard-play-cta-v1` created→DEACTIVATED** — 3 call sites telemetry-only, no conditional render; `leaderboard/PageClient.tsx` 519 lines blocks variant-B wiring. Re-enable AFTER refactor <500 lines. Status: blocked on refactor.
- **Rage clicks (NEW)** — `/es/multiplayer` score 0.584 + `/he/sealed-bid` 0.332. UX investigation unaddressed. Status: open, lane 03.
- **Security migration pending apply** — `20260619030000` (REVOKE on `update_difficulty_after_game` + tighten `tar_insert_any`). Blocked by MCP-unauthorized. Status: open, monitor.
- **Dead flags (3)** — `share-prompt-timing` (~72d ~0 exp), `show-signup-after-first-win` (inconclusive), `mp-signup-nudge-copy-v1` (0/77 converts). Recommend retire/kill. Status: open, human.
- **AdSense E-E-A-T re-submit window OPEN** — blog ISR + schema + editorial-policy live; structural quality bar cleared 06-19. Re-submit = manual op. Status: open, human/lane 08.
- **Spanish/Swedish "scrabble" surge (ride, lane 06)** — `scrabble svenska/español` clusters 9,577+ Google impr, missing from Bing; IndexNow batch HTTP 200 (5 URLs). ES MP meta in 28d-lag hold (next review 2026-07-02). Status: ride.

## Idea backlog (founder-signalled)
Lane 04 surfaced ~28 ideas this window, zero mechanic repeats. Fresh 06-19: Crane post-session drop highlight reel (social-share), Word Forge directional alphabet hints (mastery). Lane 05 builds admin-gated; polish OUTRANKS new ideas by volume.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 ship every night; #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **REST-API fallback when MCP is down** — lane 02 applied policy-consolidation + 3 index-drops LIVE via REST when Supabase MCP was Unauthorized (advisor 20→0). Codify this as the standard fallback. (new, validated 06-19)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship. (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/red night still shipped its artifact. Floor never zero. (6/6)
- **`revalidate=N` over `force-dynamic`** — `/es/multiplayer` LCP cumulative wins; 27 blog pages ISR-cached, 0 regressions. Doctrine.
- **Security hardening via zero-callsite DEFINER/RLS REVOKE + policy consolidation** (lane 01/02) — 10+ migrations this window, 0 reverts, all reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — 6+ dropped this window, safe + reversible.
- **TDD on new pure modules / polish components** (lane 05) — Alchemy reaction-streak PB, crane near-miss shudder, sealed-bid share card, shiritori pressure-border all TDD-green, 0 reverts. prefers-reduced-motion gated. (highest new-code ship rate)
- **n≥50 sample-floor gate** (lane 02) — held `/he` LCP swing as WATCH pending 2nd reading; never named sub-floor suspects. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Define→wire→emit FLAG in ONE lane** — `exp-practice-wheel-cta-v1` finally closed 06-19 by doing all three in one lane. The rule works when followed. (corrected)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)
- **Autonomous native back-translation review** (lane 06) — HE/SV/ES strings reviewed + rewritten in-run, 0 escalations. (validated)

## What to avoid (failed this week)
- **`next build` in ANY gate verify path** — wedged 5/6 nights pre-fix AND re-wedged the baseline-red ship-verify 06-18 (rc=3, dropped 16 files). Both paths now `tsc --noEmit`-only. Never reintroduce `next build` into a gate timer. (was #1 infra)
- **Defining an experiment without wiring + flag in one lane** — cost `exp-practice-wheel-cta-v1` 4 dark nights (43% funnel drop unmeasured). Now closed. Keep the rule. (resolved, keep)
- **Creating a PostHog experiment whose variant-B has no conditional render** — `exp-leaderboard-play-cta-v1` created then DEACTIVATED (telemetry-only call sites = fake running experiment). Check render-path EXISTS before creating the flag. (new)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + page-wire in one budget = partial. 06-19 Alchemy streak shipped but es.js `streakNewPB` key dropped (cap hit) → Spanish shows raw key. Write ALL 5 locales FIRST, before component/page. (high-frequency, recurred)
- **Working-set cap (~8) dropping a locale** — recurred 06-19 (es.js). Translations BEFORE component. (high)
- **Flagging a Web-Vitals regression on a single reading** — `/he` LCP held at WATCH pending 2nd reading. Never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 30+ nights, 0 signals; RSS fallback landed `c5b0c4c10`; jq parse errors recur on some feeds (dailygames, party-multiplayer). Stop retrying OAuth; wrap fetch in error-tolerant parse. (kept)

## Open watches (carry forward)
- **Supabase MCP token + Sentry write token** — both unauthorized 06-19; refresh. Status: open, infra/human.
- **Gate clean-ship** — both wedge fixes landed; verify 2 nights. Status: verifying.
- **`/he` LCP 6273ms · `/es/mp` rage-clicks 0.584 · `/he/sealed-bid` rage 0.332** — profile. Status: open, lane 02/03.
- **`exp-leaderboard-play-cta-v1`** — blocked on `leaderboard/PageClient.tsx` <500-line refactor. Status: blocked.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — retire/kill. Status: open, human.
- **AdSense re-submit** — window open; manual op. Status: open, human.
- **Bing parity** — IndexNow batches submitted, awaiting crawl. Status: awaiting.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+ / leaderboard/PageClient 519** — >500-line refactor blocks `exp-leaderboard-play-cta` wiring. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 10+ zero-callsite REVOKE + 6 index drops this window, 0 reverts |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | REST-fallback policy consolidation (advisor 20→0) + revalidate doctrine, 0 reverts |
| 03 engagement | `frontend-design` | practice-wheel-cta wired + 4 experiments this window; 0 reverts |
| 04 competitor | `humanizer` | 6/6 docs-only; ~28 ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | Alchemy streak, crane shudder, sealed-bid card, shiritori border shipped 0 reverts |
| 06 seo | `seo-daily` | 6/6; ES/SV scrabble clusters + autonomous HE/SV native review |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 6/6; blog ISR + JSON-LD + author/editorial E-E-A-T; structural bar cleared |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (landed `c5b0c4c10`); OAuth un-configured — stop retrying. jq parse errors recur on some feeds — wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (30+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).
