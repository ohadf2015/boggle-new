# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-20..06-25 (6 report nights).** Code-ship stayed BROAD, 0 code reverts in window. **Core 6 lanes — 02 perf, 05 polish, 07 self-learn, 08 adsense, 09 monetization, 10 dict — shipped 100%, 0 reverts.** Lane 01 (triage) 5/6, lane 06 (seo) 5/6 — the single revert each was the **06-22 exit-75 usage-limit cascade (infra, not code)**. Lane 03 (engagement) 5/6, wired 4 dark exps live. New lanes **11 (mode-qa)** + **12 (telemetry)** seeded 06-24, 1–2 runs each. **Dominant failure remains the GATE-RUNNER, not lane code:** 06-22 timeout (900s idle wedge on isolated-gate), 06-23 baseline-red tests poisoned suite (code dropped, docs salvaged), 06-24 full-test wedge again (code shipped UNVERIFIED, flagged `TESTS-INCONCLUSIVE`). MCP token drift WARN'd 06-21/22, recovered 06-23 via new never-expire PAT + transient retry. One push failed 06-21 (local commit preserved, pushed 06-22).

## FOUNDER DIRECTIVE — highest priority
- **2026-06-24 (6 directives):** (1) Education "free forever" copy is FALSE — trial/price coming; lane 09 must propose a reasonable price + trial, swap copy. (2) Education images unrelated to mascot — fix (lane 05/06). (3) **Word-tower: optimize for DAILY CHALLENGE, de-emphasize MP** (lane 05/11). (4) **STOP deferring to human — ship it all** (autonomy, all lanes). (5) **Sealed-bid = poker feel + eventual daily-challenge variant** ("best word nobody thought of", bet→points) — Showdown slice shipped 06-25 (lane 05). (6) **Reddit promo comments to lexiclash.live + improve suggestions** (lane 04).
- **2026-06-23:** Standing priorities — (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth (route into real `/[locale]/education` pages), (4) AUTONOMY (ship reversible, defer only irreversible). Live preamble.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. `polish:try` 100% try-rate (9+ wks) confirms appetite. No MODE-FEATURE commits in 14d window — directive holding.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 11 records — flat/positive)
- **polish:try ×8 / polish:pass ×1 = 89% try-rate** — crossword capture-lock, alchemy nudge, sealed-bid reveal, crane chaos/highlight, word-forge target. (single pass = crane-chaos round 06-24.) Top targets for lane 05.
- **modeqa:ontrack ×2** — word-tower 28% readiness card landed positive (same user/run). Lane 11 cards engaged on first run.
- **Zero callbacks:** idea:build, night:good/meh, reddit:*, mode:*. No run-quality dissatisfaction (meh < 3). Founder feedback shifted from idea-pitching → **implementation direction** via free-text directives.

## What works (validated this week)
- **Core 6 lanes 100%, 0 reverts: 02 perf, 05 polish, 07 self-learn, 08 adsense, 09 mon, 10 dict.** Lane 02 = #1 workhorse (6/6; JWT local-verify, playerFoundWordBatch windowing, roster throttle, policy consolidation). (validated, strongest)
- **Low-MCP / prompt-only lanes never time out** — 04/07 ship every night they run; #1 reliability lever = eliminate MCP round-trips and full-test self-checks. (20+ nights)
- **Lane 05 mode-polish via TDD on pure modules + page-wire in one budget** — crossword capture-lock, sealed-bid reveal stagger + Showdown poker slice (06-25, 8f), alchemy element-order nudge all TDD-green, 0 reverts. prefers-reduced-motion gated. (validated)
- **Define→wire→emit FLAG in ONE lane** — lane 03 wired 4 dark exps live (`exp-practice-wheel-cta-v1`, `exp-wordhunt-hint-v1`, `exp-daily-hub-streak-nudge-v1`, `exp-mp-round-feedback-top-v1`). Works when render-path exists FIRST. (validated)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship (sealed-bid Showdown 06-25, word-tower daily refocus). (strongest)
- **Salvage-on-gate-failure floor** — 06-22/23/24 all preserved code (backed up to `salvaged-code-*`) + shipped docs + flagged `TESTS-INCONCLUSIVE`. Gate-runner failure never zeroed a night. (validated)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes that skip full tsc/build finish inside budget; one rollback target. (30+ nights)
- **REST-API fallback when Supabase MCP down** + **idempotent stuck-migrations** (`IF NOT EXISTS` / zero-callsite guards) land safely on MCP-down nights. (validated)
- **Mandatory-Minimum-Artifact floor** — every salvage/partial/timeout night still shipped its lane-NN artifact (docs/ outside fe-next/, gate-clean). Floor never zero. (6/6)
- **Autonomous native back-translation review** (lane 06) — HE/SV/ES reviewed + rewritten in-run, 0 escalations. (validated)
- **`revalidate=N` over `force-dynamic`** — ISR + blog ItemList; cumulative AdSense/LCP wins, 0 regressions. Doctrine.

## What to avoid (failed this week)
- **Gate-runner full-test suite wedges 900s idle (06-22 + 06-24)** — isolated-gate hangs on the full Vitest run, hits exit-124 timeout, ships code UNVERIFIED. #1 failure mode now. FIX: scope gate tests to changed files OR add a hard per-suite timeout + kill, never a 900s idle. (NEW, #1)
- **Baseline-red tests poison the gate (06-23)** — DrillWordLimits, PracticeWheelSandbox, WordTowerCrane PRE-FAIL on clean master; a lane's clean code gets dropped for unrelated red. FIX: gate scopes to changed files OR quarantines known-red suites; lane 01 should triage these 3. (high, carry)
- **No lane-start stagger under shared usage window** — 06-22 lane 01 hit usage-limit backoff (120s > deadline) → exit 75 cascade, reverted lanes 01+06. Need lane-start STAGGER + concurrency cap vs shared 1M-token Claude window. (open #1 infra)
- **Trusting a stale launchd MCP token** — `SUPABASE_ACCESS_TOKEN` drifts dead; WARN'd 06-21/22, recovered 06-23. Never-expire PAT minted; transient retry shipped. (resolving)
- **`next build`/full `tsc`/full test in a LANE verify path** — Babel deopt + 900s idle wedge. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. Never reintroduce in a lane. (kept)
- **Over-scoped mode-polish in one budget** — TDD + 5 locales + page-wire = partial risk; es.js key dropped 06-19 (cap hit). Write ALL 5 locales FIRST. (high-frequency)
- **Experiment whose variant-B has no conditional render** — `exp-leaderboard-play-cta-v1` DEACTIVATED (0 renders, blocked on PageClient <500 refactor). Check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 35+ nights, 0 signals; RSS fallback `c5b0c4c10`. Stop retrying OAuth; wrap fetch in error-tolerant parse. (kept)

## Open watches (carry forward)
- **Gate-runner test wedge** — full Vitest hangs 900s idle on isolated-gate (06-22, 06-24). Scope-to-changed-files or hard per-suite kill. Status: open #1, infra.
- **Baseline-red triage** — DrillWordLimits, PracticeWheelSandbox, WordTowerCrane pre-fail on clean master. Status: open, lane 01.
- **Shared-usage cascade** — stagger lane starts + cap concurrency vs shared Claude quota. Status: open #1 infra.
- **`/es/multiplayer` LCP 3.1→5.9s (+53%)** — structural floor (4× dynamic imports, socket-gated). Needs Chrome profiler trace. Status: open #1 perf, lane 02/03.
- **`/he` LCP 3.3–6.3s oscillation** — now -6% improving; needs profiler confirm. Status: resolving, lane 02.
- **word-tower readiness 28%** — 5 blockers: `versusMatch.ts:113` placementMultiplier client desync, WordTowerPlay.tsx 1249 / WordTowerScene.tsx 762 / wordTowerManager.ts 602 (all >500), TOWER_SURPRISE_META unguarded. Founder: refocus DAILY over MP. Status: open, lane 05/11.
- **brain-drill missing `game_started` event** — has game_completed, no entry → broken funnel. Highest-value telemetry fix. Status: open, lane 12.
- **Telemetry registry: 108 events, 59 DEAD, 4 CRATERED** — ~12-item backlog. Status: open, lane 12.
- **Education "free forever" copy = FALSE** — founder wants trial + reasonable price; lane 09 propose pricing, lane 05/06 swap copy + mascot-correct images. Status: open, founder #1/#2.
- **word_wheel `is_catchup`** — migration applied 06-23; VERIFY prod 500s (Sentry JS-NEXTJS-1NB, 15d) clear. Status: resolving.
- **SECURITY DEFINER batch** — 68 functions flagged; bulk audit before REVOKE. Status: open, lane 01.
- **`exp-leaderboard-play-cta-v1`** — blocked on leaderboard/PageClient 519-line <500 refactor. Status: blocked.
- **Word-vault puzzle depth** (06-13) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — `share-prompt-timing` (72d), `show-signup-after-first-win`, `mp-signup-nudge-copy-v1`. Retire. Status: open, human.
- **IndexNow Bing parity** — 120+ ES/SV/HE gaps pending batch submit. Status: open, lane 06.
- **AdSense re-submit** — E-E-A-T bar cleared; manual op. Status: open, human.
- **ES/SV "scrabble" cluster** (ride, lane 06) — ES "scrabble online" 10k impr pos 5.2 (CTR 0.34% vs ~6% gap = ~568 click deficit), SV "alfapet" +657% impr. 28d-lag hold, next review 2026-07-02. Status: ride.
- **`PageClient.tsx` / `SinglePlayerResults.tsx` / leaderboard 519** — >500-line files block flag wiring. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | idempotent migrations + REVOKE shipped 5/6 (06-22 revert = usage-cascade, not code) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 6/6, 0 reverts — most reliable lane |
| 03 engagement | `frontend-design` | 4 dark exps wired live, 5/6, 0 reverts |
| 04 competitor | `humanizer` | docs-only every night; reddit drafts + ideas, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | crossword/sealed-bid/alchemy polish 5/5, 0 reverts |
| 06 seo | `seo-daily` | 5/6; autonomous HE/SV/ES native review (06-22 revert = cascade) |
| 07 self-learn | none — prompt-only | ships every night it runs |
| 08 adsense | `humanizer` | blog ISR + JSON-LD + E-E-A-T; 4/4, 0 gate failures |
| 09 monetization | `frontend-design` | 5/5; Monetag zone + CSP + ad-UX, 0 reverts |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 5/5; es/sv/he dict + clue banks |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | seed — word-tower 28% audit, modeqa:ontrack ×2 (06-24/25) |
| 12 telemetry | none — prompt-only | seed — registry audit 06-24 (59 dead events) |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (35+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
