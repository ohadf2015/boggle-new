# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-19..06-24 (6 report nights).** Code-ship stayed BROAD. **Lanes 02 (perf), 03 (engagement), 04 (competitor), 05 (mode-polish), 06 (seo), 08 (adsense) all shipped 6/6, 0 reverts** — the reliable core. Lane 01 (triage) 4/6 (reverted 06-22 exit 75 usage-cascade). Lanes 09/10 ~4/6. **NEW lanes 11 (mode-qa) + 12 (telemetry) launched 06-24 — 1/6 each, expected ramp.** **Dominant failure remains infra, not gate**, but gate failures recurred: **06-22 (lanes 01+06 exit 75, usage-limit cascade, both reverted) AND 06-23 (lane code gate-failed on baseline-red tests, docs salvaged + code backed up).** Root of 06-23: pre-existing red tests on clean master (DrillWordLimits, PracticeWheelSandbox, WordTowerCrane) poisoned the suite. MCP token drift WARN'd 06-21/22, recovered 06-23. One push failed 06-21 (local commit preserved, retried 06-22).

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23:** Standing founder priorities — (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth (route into real `/[locale]/education` pages), (4) AUTONOMY (ship reversible fixes, defer only irreversible). Injected as preamble. Status: live.
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI." Hub shipped. Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate (promote = founder 🚀). `polish:try` 100% try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 8 records — flat/positive)
- **polish:try ×8 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish. Variable-reward + social-share dominate. Top targets for lane 05. (9+ weeks of 100% try-rate)
- **idea:build / reddit:* / mode:* / night:meh = 0** in window — zero volume. Polish OUTRANKS new ideas. No run-quality dissatisfaction (meh < 3 threshold). Accept silence on reddit/mode (35+d).

## What works (validated this week)
- **Six lanes shipped 6/6, 0 reverts: 02 perf, 03 engagement, 04 competitor, 05 polish, 06 seo, 08 adsense** — the reliable core. Lane 02 = #1 workhorse (policy consolidation 20→0 advisor WARNs, RLS-initplan fix, FK indexes, drop-unused). Lane 03 wired 4 dark exps live (`exp-practice-wheel-cta-v1`, `exp-wordhunt-hint-v1`, `exp-daily-hub-streak-nudge-v1`, `exp-mp-round-feedback-top-v1`). (validated)
- **Define→wire→emit FLAG in ONE lane** — lane 03 closed 4 dark-exp definitions same-run (def existed → add PostHog flag + hook + telemetry call). Rule works when render-path exists FIRST. (strongest this week)
- **REST-API fallback when Supabase MCP is down** — lanes 01/02 authored policy/index/REVOKE migrations LIVE via REST on MCP-down nights. Standard fallback. (validated)
- **Idempotent stuck-migrations land safely** — `is_catchup` (06-23) + `admin_dashboard_insights` REVOKE (06-24) via `IF NOT EXISTS` / zero-callsite guards. Idempotent + reversible = safe autonomous. (validated)
- **Autonomous security hardening** (lane 01) — SECURITY DEFINER scope + always-true RLS REVOKE ship without manual review when idempotent + no anon callsite. 0 reverts when not blocked by cascade. (validated)
- **Low-MCP / prompt-only lanes never time out** — 04/07 ship every night they run; #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **Lane 05 mode-polish via TDD on new pure modules** — word-alchemy streak PB, crossword capture-lock, sealed-bid reveal stagger, alchemy element-order nudge all TDD-green, 0 reverts. prefers-reduced-motion gated. (validated)
- **Infra self-heal beats silent abort** — `d91b5fa76` off-master preflight auto-recover; `8c705ba2c` MCP boot retry. Both contained the 06-22 cascade (only lanes 01/06 lost, not all). (validated, shipped)
- **`revalidate=N` over `force-dynamic`** — guides ISR (86400s) + blog ItemList +14 posts; cumulative AdSense/LCP wins, 0 regressions. Doctrine.
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship. (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/partial/timeout night still shipped its artifact. Floor never zero. (6/6)
- **Drop unused indexes (0 scans) + n≥50 sample-floor gate** (lane 02) — safe + reversible; held /he LCP + /es CLS swings as WATCH, never named sub-floor suspects. (validated)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes that skip full tsc/build finish inside budget; one rollback target. (30+ nights)
- **Autonomous native back-translation review** (lane 06) — HE/SV/ES reviewed + rewritten in-run, 0 escalations. (validated)

## What to avoid (failed this week)
- **Baseline-red tests poison the gate** — 06-23 lane code gate-failed because DrillWordLimits, PracticeWheelSandbox, WordTowerCrane tests PRE-FAIL on clean master. A lane's clean code gets dropped for unrelated red. FIX: gate should scope tests to changed files OR quarantine known-red suites; lane 01 should triage these 3 red baselines. (NEW, high)
- **No lane-start stagger under shared usage window** — 06-22 lane 01 hit usage-limit backoff (120s wait > deadline) → exit 75 cascade risk. Self-heal contained it to 2 lanes. Still need lane-start STAGGER + concurrency cap vs shared 1M-token Sonnet window. (open #1 infra)
- **Trusting a stale launchd MCP token** — `SUPABASE_ACCESS_TOKEN` drifts dead; WARN'd preflight 06-21/22, recovered 06-23. Never-expire PAT minted 06-21; transient retried `8c705ba2c`. (resolving)
- **`next build` in ANY gate verify path** — both paths `tsc --noEmit`-only. Babel deopt + 900s idle wedge. Never reintroduce. (kept)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + page-wire in one budget = partial; es.js `streakNewPB` key dropped 06-19 (cap hit) → Spanish raw key. Write ALL 5 locales FIRST. (high-frequency)
- **Creating an experiment whose variant-B has no conditional render** — `exp-leaderboard-play-cta-v1` DEACTIVATED (0 renders, blocked on leaderboard/PageClient <500 refactor). Check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — /he LCP (3.3–6.3s oscillation) held at WATCH (now -6% improving). Never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 35+ nights, 0 signals; RSS fallback `c5b0c4c10`. Stop retrying OAuth; wrap fetch in error-tolerant parse. (kept)

## Open watches (carry forward)
- **`/es/multiplayer` LCP regression 3.1→5.9s (+53%)** — CRITICAL, structural floor (4× dynamic imports, socket-gated). Needs Chrome profiler trace. Status: open #1 perf, lane 02/03.
- **`/he` LCP 3.3–6.3s oscillation** — now -6% improving; needs profiler confirm. Status: resolving, lane 02.
- **Shared-usage cascade** — stagger lane starts + cap concurrency vs shared Claude quota. Status: open #1 infra.
- **Baseline-red test triage** — DrillWordLimits, PracticeWheelSandbox, WordTowerCrane pre-fail on clean master; poison gate. Status: open, lane 01.
- **word-tower readiness 28%** — 5 blockers: `versusMatch.ts:113` placementMultiplier client desync (MP-class bug), WordTowerPlay.tsx 1249 lines / WordTowerScene.tsx 762 / wordTowerManager.ts 602 (all >500), TOWER_SURPRISE_META unguarded. Status: open, lane 11.
- **brain-drill missing `game_started` event** — has game_completed, no entry event → broken funnel. Highest-value telemetry fix. Status: open, lane 12.
- **Telemetry registry: 108 events, 59 DEAD (bare-name), 4 CRATERED** — ~12-item backlog. Status: open, lane 12.
- **word_wheel `is_catchup`** — migration applied 06-23; VERIFY prod 500s (Sentry JS-NEXTJS-1NB, 15d) clear. Status: resolving.
- **Sentry 1CW (null.clear) / 1JR (profiles relation) / 1KQ (502)** — stale 15–28d, no new occurrences, likely resolved. Sentry MCP write-scope 403 blocks manual resolve. Status: open (write-scope).
- **SECURITY DEFINER batch** — 68 functions flagged; needs bulk audit before REVOKE. Status: open, lane 01.
- **`exp-leaderboard-play-cta-v1`** — blocked on leaderboard/PageClient 519-line <500 refactor. Status: blocked.
- **Word-vault puzzle depth** (06-13) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — `share-prompt-timing` (72d, 0 exposure), `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0/77 converts). Retire. Status: open, human.
- **IndexNow Bing parity** — 120+ ES/SV/HE gaps pending batch submit. Status: open, lane 06.
- **AdSense re-submit** — E-E-A-T bar cleared 6/6; manual op. Status: open, human.
- **ES/SV "scrabble" cluster** (ride, lane 06) — ES "scrabble online" 10k+ impr pos 5.2 (CTR 0.34% vs 6% gap), SV "alfapet" +657% impr. 28d-lag hold, next review 2026-07-02. Status: ride.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+ / leaderboard 519** — >500-line refactor blocks flag wiring. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | zero-callsite REVOKE + idempotent migrations shipped 4/6 (06-22 revert = usage-cascade, not code) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | shipped 6/6, 0 reverts — most reliable |
| 03 engagement | `frontend-design` | 4 dark exps wired live 6/6, 0 reverts |
| 04 competitor | `humanizer` | docs-only every night; ~4-5 ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | alchemy/crossword/sealed-bid polish shipped 6/6, 0 reverts |
| 06 seo | `seo-daily` | shipped 6/6; autonomous HE/SV/ES native review |
| 07 self-learn | none — prompt-only | ships every night it runs |
| 08 adsense | `humanizer` | blog ISR + JSON-LD + E-E-A-T; 6/6, 0 gate failures |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | seed — first audit 06-24 (word-tower 28%) |
| 12 telemetry | none — prompt-only | seed — research-only 06-24 (registry audit) |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (landed `c5b0c4c10`); OAuth un-configured — stop retrying. jq parse errors recur on some feeds — wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (35+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
