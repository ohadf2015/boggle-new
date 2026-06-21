# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-16..06-21 (6 report nights).** Code-ship is concentrated, not broad: Lane 05 (mode polish) is the ONLY reliable code shipper — 3/6 nights (shiritori pressure-cue `06-18`, word-alchemy streak PB `06-19`, crossword MP capture-lock `06-21`), avg 6 files/ship, 0 reverts. Lane 06 (SEO) shipped 2/6 high-impact (`06-18` +800 clicks ES scrabble reframe, `06-20` +568 clicks ES/HE title rewrites). Lane 03 wired 1 flag/night when it ran. Lanes 01/02 BLOCKED most nights by infra. **Dominant failure this window = infra, not gate.** MCP (Supabase+Sentry) unreachable 5/6 nights (token expiry); 06-20 a shared-usage cascade idle-killed 5 lanes (exit 124); 06-19 a github.com DNS preflight fail aborted the whole run. The gate-wedge bugs from last window stayed FIXED — no `next build` wedge recurred. Clean-ship verified; close that watch.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Hub shipped. Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate (promote = founder 🚀). `polish:try` 13/13 try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 17 records)
- **polish:try ×13 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish (word-tower, word-forge, word-alchemy, shiritori, sealed-bid, crossword, crane). Variable-reward + social-share dominate. Top targets for lane 05. (7+ weeks of 100% try-rate)
- **idea:build ×2 / idea:pass ×1** — slight build-lean, low volume. Polish OUTRANKS new ideas ~5:1 by volume. Lane 04 keep surfacing, lane 05 prioritise polish.
- **night:good ×1 / night:meh ×0** — positive run-quality. No self-critique trigger (threshold meh ≥3).
- **reddit:* / mode:* = 0** — zero reddit + zero mode keep/drop/promote callbacks 30+d. Accept silence.
- **Signal near-stale** — 17 records, only +2 polish:try vs last window. Delivery flat or genuinely idle. Don't over-read deltas.

## Active watches (2026-06-21)
- **Supabase MCP token expiry (NEW #1 infra, RECURRING)** — `Unauthorized`/no-connect 5/6 nights (06-16,17,18,20,21). Root cause: `SUPABASE_ACCESS_TOKEN` PAT in `~/.claude.json` `.mcpServers.supabase.env` drifted DEAD (HTTP 401) while interactive shell token stayed fresh — launchd inherits no shell env. FIX = jq-swap that key to a valid PAT (test via Mgmt API `/v1/projects` → 200/401; backup file first); `build_lane_mcp_config` re-reads per lane so a mid-run swap reaches later lanes. Sentry MCP also 403 (write scope missing). Status: open, infra/human — needs durable token-refresh + preflight credential probe.
- **Shared-usage cascade (NEW #2 infra)** — 06-20 lane 03 idled >300s → exit 124, then lanes 06/07/09/10 also idle-killed as the shared Claude usage window drained (56 dirty files + concurrent spawns). 5/10 lanes lost. `e9c75581b` added cutoff-guard + stall Telegram alert; still need lane-start STAGGER + concurrency cap vs usage window. Status: open, infra.
- **Preflight network-abort (NEW #3 infra)** — 06-19 `run-011237` aborted whole run on github.com DNS resolution fail; manual re-run at 11:41 recovered. Preflight should RETRY transient DNS before aborting. Status: open, infra.
- **URGENT prod bug (06-21)** — migration `20260607100000_word_wheel_catchup.sql` NOT applied to prod; `wordWheelRoutes.ts:108` inserts `is_catchup` col that doesn't exist → 500 on word-wheel submit (Sentry). 2-line idempotent SQL, 30s in dashboard. Status: open, human (MCP-blocked).
- **`/he` LCP 4.4s→6.3s (+43% 06-16, +31.6% 06-19)** + **`/es/multiplayer` CLS 0.144→0.288 (+100% 06-17)** — perf regressions, no root-cause in 4 nights. Held at WATCH pending 2nd ≥n50 reading. Suspect above-fold mascot/splash asset. Highest perf priority. Status: open, lane 02.
- **Rage clicks** — `/es/multiplayer` 0.584, `/he/sealed-bid` 0.332, `/he/daily/word-hunt` 0.693 (06-21 wired `exp-wordhunt-hint-v1` to kill dead "tap leaderboard" hint). Status: open, lane 03.
- **`exp-leaderboard-play-cta-v1` DEACTIVATED** — blocked on `leaderboard/PageClient.tsx` 519-line refactor (<500 to wire variant-B render). Status: blocked on refactor.
- **Dead flags (3)** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0/77 converts). Retire/kill. Status: open, human.
- **AdSense E-E-A-T re-submit window OPEN** — structural bar cleared 06-17+; blog ISR + schema + editorial policy live. Manual op. Status: open, human/lane 08.
- **ES/SV "scrabble" cluster (ride, lane 06)** — 10K+ impr at pos 5.3, 0.4% vs 6% CTR target; title rewrites shipped. SV verb-form bug fixed 06-21 ("bilda ord" not "forma ord"). 28d-lag hold, next review 2026-07-02. Status: ride.

## Idea backlog (founder-signalled)
Lane 04 surfaced ~18 ideas this window, zero mechanic repeats. Fresh: Word Vault Whisper Hint (passive stuck-detect), Daily Crossword hidden meta-answer, Crane post-session drop highlight reel (social-share). Lane 05 builds admin-gated; polish OUTRANKS new ideas by volume.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 ship every night they run; #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **Lane 05 mode-polish via TDD on new pure modules** — shiritori tempo+pressure-cue, alchemy streak PB, crossword capture-lock all TDD-green, 0 reverts. prefers-reduced-motion gated. Highest new-code ship rate. (validated)
- **REST-API fallback when Supabase MCP is down** — lane 02 applied policy consolidation + index drops LIVE via REST (advisor 20→0) when MCP Unauthorized. Standard fallback now. (validated 06-19)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship. (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/partial/timeout night still shipped its artifact. Floor never zero. (6/6)
- **Gate clean-ship holds** — both wedge fixes (`06be04691` cone-scope + `2f520b937` typeonly_notest baseline-red verify) held; no `next build` wedge recurred this window. CLOSE this watch. (verified)
- **`revalidate=N` over `force-dynamic`** — blog ISR + `/es/mp` LCP cumulative wins, 0 regressions. Doctrine.
- **Security hardening via zero-callsite DEFINER/RLS REVOKE + policy consolidation** (lane 01/02) — 0 reverts all window, reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — 5→8 dropped, safe + reversible.
- **Define→wire→emit FLAG in ONE lane** — `exp-practice-wheel-cta-v1` (06-19) + `exp-wordhunt-hint-v1` (06-21) both closed same-run. Rule works when followed. (corrected)
- **n≥50 sample-floor gate** (lane 02) — held `/he` LCP + `/es` CLS swings as WATCH; never named sub-floor suspects. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)
- **Autonomous native back-translation review** (lane 06) — HE/SV/ES reviewed + rewritten in-run, caught SV verb-form bug 06-21, 0 escalations. (validated)

## What to avoid (failed this week)
- **Trusting a stale launchd MCP token** — `SUPABASE_ACCESS_TOKEN` in `~/.claude.json` drifts dead independent of shell env; cost lanes 01/02 most of their autonomous power 5/6 nights. ADD a preflight credential probe that swaps/refreshes before lanes run. (new #1)
- **No lane-start stagger under a shared usage window** — 06-20 cascade idle-killed 5 lanes (exit 124). Stagger + cap concurrency vs the shared Claude quota. (new #2)
- **Aborting a whole run on a transient preflight DNS fail** — 06-19 github.com resolution blip killed the run; an 11:41 re-run worked. Retry transient network before abort. (new #3)
- **`next build` in ANY gate verify path** — both paths now `tsc --noEmit`-only. Never reintroduce. (kept, was #1)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + page-wire in one budget = partial; es.js `streakNewPB` key dropped 06-19 (cap hit) → Spanish raw key. Write ALL 5 locales FIRST. (high-frequency, recurred)
- **Working-set cap (~8) dropping a locale** — translations BEFORE component. (high)
- **Creating an experiment whose variant-B has no conditional render** — `exp-leaderboard-play-cta-v1` DEACTIVATED (telemetry-only call sites = fake running experiment). Check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — `/he` LCP + `/es` CLS held at WATCH. Never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 30+ nights, 0 signals; RSS fallback landed `c5b0c4c10`; jq parse errors recur on some feeds. Stop retrying OAuth; wrap fetch in error-tolerant parse. (kept)

## Open watches (carry forward)
- **Supabase + Sentry MCP tokens** — expired/unauthorized 5/6 nights; need durable refresh + preflight probe. Status: open, infra/human.
- **Shared-usage cascade** — stagger lane starts + cap concurrency. Status: open, infra.
- **Preflight transient-network abort** — retry DNS before aborting run. Status: open, infra.
- **word_wheel_catchup migration unapplied (prod 500s)** — 2-line SQL, human. Status: urgent, open.
- **`/he` LCP 6.3s · `/es/mp` CLS 0.288 · rage-clicks (`/es/mp` 0.584, `/he/sealed-bid` 0.332)** — profile. Status: open, lane 02/03.
- **`exp-leaderboard-play-cta-v1`** — blocked on `leaderboard/PageClient.tsx` <500-line refactor. Status: blocked.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — retire/kill. Status: open, human.
- **AdSense re-submit** — window open; manual op. Status: open, human.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+ / leaderboard/PageClient 519** — >500-line refactor blocks flag wiring. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | zero-callsite REVOKE + index drops, 0 reverts (infra-blocked many nights) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | REST-fallback policy consolidation (advisor 20→0) + revalidate doctrine, 0 reverts |
| 03 engagement | `frontend-design` | 2 flags wired this window (practice-wheel-cta, wordhunt-hint); 0 reverts |
| 04 competitor | `humanizer` | docs-only every night; ~18 ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | shiritori/alchemy/crossword polish shipped 3/6, 0 reverts |
| 06 seo | `seo-daily` | shipped 2/6 (+800/+568 clicks); autonomous HE/SV/ES native review |
| 07 self-learn | none — prompt-only | ships every night it runs |
| 08 adsense | `humanizer` | blog ISR + JSON-LD + E-E-A-T; structural bar cleared, 0 reverts |

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
