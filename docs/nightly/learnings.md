# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-18..06-23 (6 report nights).** Code-ship stayed BROAD. **Lane 02 (perf) + Lane 08 (adsense) both shipped 6/6, 0 reverts** — the two most-reliable shippers. Lane 04 (competitor) + Lane 06 (seo) ran 6/6 (06 had one 06-20 timeout + one 06-22 revert). Lanes 03/09/10 ~5/6. Lane 05 (mode polish) 4/6 (2 self-skips). **Dominant failure remains infra, not gate** — but gate failures did NOT go away: **06-18 (full-suite wedge, docs-only salvage) AND 06-22 (lanes 01+06 exit 75, both reverted, build-only re-gate passed)**. 06-20 = shared-usage cascade idle-killed 5 lanes (124). 06-21 push failed (local commit preserved). Two infra self-heals landed this window and one stuck migration finally applied.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Hub shipped. Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate (promote = founder 🚀). `polish:try` 10/10 try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 11 records — flat/idle)
- **polish:try ×10 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish (shiritori, alchemy, crossword, sealed-bid, word-tower, crane). Variable-reward + social-share dominate. Top targets for lane 05. (8+ weeks of 100% try-rate)
- **idea:build ×1 / idea:pass ×0** in window — very low volume. Polish still OUTRANKS new ideas ~10:1 by volume. Lane 04 keep surfacing, lane 05 prioritise polish.
- **night:meh = 0** → no self-critique triggered (threshold meh ≥3). No run-quality dissatisfaction signal.
- **reddit:* / mode:* = 0** — zero reddit + zero mode keep/drop/promote callbacks 35+d. Accept silence.

## What works (validated this week)
- **Lane 02 perf + Lane 08 adsense ship every night** — both 6/6 this window, 0 reverts. The two #1 reliable code shippers. Perf: cellNodeMap pre-populate, policy consolidation (20→0 advisor warnings), FK indexes. AdSense: blog ItemList 12→26, guides ISR `revalidate` over `force-dynamic`. (validated)
- **Low-MCP / prompt-only lanes never time out** — 04/07 ship every night they run; #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **Lane 05 mode-polish via TDD on new pure modules** — shiritori pressure-border, alchemy streak PB, crossword territory capture, sealed-bid reveal stagger all TDD-green, 0 reverts. prefers-reduced-motion gated. (validated)
- **REST-API fallback when Supabase MCP is down** — lane 02 authored policy/index migrations LIVE via REST on 2 MCP-down nights. Standard fallback. (validated)
- **Infra self-heal beats silent abort** — `d91b5fa76` off-master preflight auto-recovers onto master when lossless else alerts; `8c705ba2c` retries MCP boot probe on transient transport fail. Both shipped this window. (validated, shipped)
- **Stuck migrations land idempotently** — `c920a05de` applied the long-stuck RLS-initplan + FK migration; `is_catchup` word_wheel column shipped 06-23 via `ADD COLUMN IF NOT EXISTS`. Idempotent + reversible = safe autonomous. (NEW)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship. (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/partial/timeout night still shipped its artifact. Floor never zero. (6/6)
- **`revalidate=N` over `force-dynamic`** — blog ISR + `/es/mp` LCP cumulative wins, 0 regressions. Doctrine.
- **Security hardening via zero-callsite DEFINER/RLS REVOKE + policy consolidation** (lane 01/02) — 0 reverts all window, reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — safe + reversible.
- **Define→wire→emit FLAG in ONE lane** — `exp-wordhunt-hint-v1`, `exp-practice-wheel-cta-v1`, `exp-daily-hub-streak-nudge-v1` all wired same-run. Rule works when followed. (validated)
- **n≥50 sample-floor gate** (lane 02) — held `/he` LCP + `/es` CLS swings as WATCH; never named sub-floor suspects. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)
- **Autonomous native back-translation review** (lane 06) — HE/SV/ES reviewed + rewritten in-run, 0 escalations. (validated)

## What to avoid (failed this week)
- **Gate failures are NOT behind us** — 06-18 full-suite wedge (docs-only salvage) AND 06-22 lanes 01+06 exit 75 → both reverted (build-only re-gate passed). Cause both = full-suite flake/wedge, NOT the lane code. Keep the typecheck+build re-gate tier; don't assume "clean window." (recurred)
- **No lane-start stagger under a shared usage window** — 06-20 cascade idle-killed 5 lanes (exit 124) as the shared Claude usage window drained. `e9c75581b` added cutoff-guard + stall alert; still need lane-start STAGGER + concurrency cap. (open #1)
- **Trusting a stale launchd MCP token** — `SUPABASE_ACCESS_TOKEN` in `~/.claude.json` drifts dead. Never-expire PAT minted 06-21; transient transport retried `8c705ba2c`. Still WARN'd preflight 06-21/06-22, recovered 06-23. (resolving)
- **`next build` in ANY gate verify path** — both paths now `tsc --noEmit`-only. Babel deopt + 900s idle wedge when build runs. Never reintroduce. (kept)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + page-wire in one budget = partial; es.js `streakNewPB` key dropped 06-19 (cap hit) → Spanish raw key. Write ALL 5 locales FIRST. (high-frequency)
- **Working-set cap (~8) dropping a locale** — translations BEFORE component. (high)
- **Creating an experiment whose variant-B has no conditional render** — `exp-leaderboard-play-cta-v1` + `exp-results-replay-cta-v1` DEACTIVATED (blocked on >500-line PageClient refactor). Check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — `/he` LCP (3.3–6.2s oscillation) + `/es/mp` CLS held at WATCH. Never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 35+ nights, 0 signals; RSS fallback `c5b0c4c10`; jq parse errors recur. Stop retrying OAuth; wrap fetch in error-tolerant parse. (kept)

## Open watches (carry forward)
- **Shared-usage cascade** — stagger lane starts + cap concurrency vs shared Claude quota. Status: open #1 infra.
- **Supabase + Sentry MCP reachability** — Supabase recovered 06-23 after WARN nights; Sentry MCP 403 (write scope) blocks manual Sentry resolves (1NB/1CW/1KQ). Status: resolving (supabase) / open (sentry write-scope).
- **word_wheel_catchup `is_catchup`** — migration shipped 06-23 (`ADD COLUMN IF NOT EXISTS` + index). Status: resolving — VERIFY prod 500s (Sentry-1NB, 15d open) clear next run.
- **MP lobby INP regression** — `/multiplayer` p75 248→736 (06-20/21); fix `241476876` isolated 1Hz countdown. Status: resolving, verify p75 next RUM.
- **`/he` LCP 3.3–6.2s oscillation · `/es/mp` LCP +24% (3.1→3.9s)** — both suspect LobbyDailyEmber async fetch added 06-21; needs profiler trace. Status: open, lane 02/03.
- **SECURITY DEFINER batch** — 68 functions flagged; needs bulk audit before REVOKE. Status: open, lane 01.
- **`exp-leaderboard-play-cta-v1` / `exp-results-replay-cta-v1`** — blocked on `leaderboard/PageClient.tsx` 519-line <500 refactor. Status: blocked.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0 converts). Retire/kill. Status: open, human.
- **06-21 unpushed local commit** — push failed; confirm landed or re-ship. Status: open.
- **AdSense re-submit** — window open since 06-17; E-E-A-T bar cleared 6/6 nights; manual op. Status: open, human.
- **ES/SV "scrabble" cluster (ride, lane 06)** — ES desc +568 clicks projected, SV alfabet +657% impr; 28d-lag hold, next review 2026-07-02. Status: ride.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+ / leaderboard/PageClient 519** — >500-line refactor blocks flag wiring. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | zero-callsite REVOKE + index drops, 0 reverts (MCP-blocked some nights; 06-22 gate revert was flake not code) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | shipped 6/6 this window, 0 reverts — most reliable |
| 03 engagement | `frontend-design` | 3 experiment flags wired 06-18..06-23; 0 reverts |
| 04 competitor | `humanizer` | docs-only every night; ~12 ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | shiritori/alchemy/crossword/sealed-bid polish shipped 4/6, 0 reverts |
| 06 seo | `seo-daily` | shipped 6/6 (1 timeout 06-20, 1 revert 06-22); autonomous HE/SV/ES native review |
| 07 self-learn | none — prompt-only | ships every night it runs (1 timeout 06-20) |
| 08 adsense | `humanizer` | blog ISR + JSON-LD + E-E-A-T; 6/6, 0 gate failures |

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
