# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-17..06-22 (6 report nights).** Code-ship BROADENED this window — last week's "lane 05 is the only reliable shipper" is now stale. **Lane 02 (perf) shipped 6/6 nights** (policy consolidation, FK indexes, RLS-initplan, `/he` LCP work), 0 reverts — the new most-reliable code shipper. Lane 05 (mode polish) ~4/6 (shiritori tempo, alchemy streak PB, crossword capture-lock). Lane 06 (SEO) ~4/6 (HE daily titles, ES scrabble intent-flip, SV copy). Lanes 08/10 ~5/6. **Dominant failure remains infra, not gate** — but two infra watches CLOSED this window via shipped self-heals (off-master preflight `d91b5fa76`, MCP transient-transport retry `8c705ba2c`) + a never-expire Supabase PAT minted 06-21. MCP still bit lanes 01+06 on 06-22 (preflight + exit-75) so it is RESOLVING, not resolved. Two gate failures early window (06-17, 06-18 code salvaged) then clean; 06-21 push failed (local commit preserved).

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, escape-room feel." Hub shipped. Puzzle MECHANICS (cipher jar, logic-sequence) + A/B still deferred. Status: open, lane 05.
- **2026-06-02 (resurfaced 06-15):** "Tower built with DAILY LETTERS; when they run out → reward-ad refill." Scoped, not built. Reward-ad value = lane 09-flagged; economy stays human-queue. Status: open, lane 05/09.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate (promote = founder 🚀). `polish:try` 10/10 try-rate confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 12 records — volume DOWN from 17)
- **polish:try ×10 / polish:pass ×0 = 100% try-rate** — pure-positive on mode polish (word-tower, alchemy, shiritori, sealed-bid, crossword, crane). Variable-reward + social-share dominate. Top targets for lane 05. (8+ weeks of 100% try-rate)
- **idea:build ×1 / idea:pass ×1** — even split, very low volume. Polish still OUTRANKS new ideas ~5:1 by volume. Lane 04 keep surfacing, lane 05 prioritise polish.
- **night:good / night:meh = 0** — no run-quality signal this window. No self-critique trigger (threshold meh ≥3).
- **reddit:* / mode:* = 0** — zero reddit + zero mode keep/drop/promote callbacks 35+d. Accept silence.
- **Signal going idle** — 12 records (was 17). Delivery flat or genuinely idle. Don't over-read deltas.

## What works (validated this week)
- **Lane 02 perf ships every night** — 6/6 this window (FK indexes, policy consolidation, RLS-initplan, revalidate doctrine), 0 reverts. New #1 reliable code shipper. (validated)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 ship every night they run; #1 reliability lever = eliminate MCP round-trips. (20+ nights)
- **Lane 05 mode-polish via TDD on new pure modules** — shiritori tempo, alchemy streak PB, crossword capture-lock all TDD-green, 0 reverts. prefers-reduced-motion gated. (validated)
- **REST-API fallback when Supabase MCP is down** — lane 02 applies policy consolidation + index drops LIVE via REST when MCP Unauthorized. Standard fallback. (validated 06-19)
- **Infra self-heal beats silent abort** — `d91b5fa76` off-master preflight auto-recovers onto master when lossless else alerts; `8c705ba2c` retries MCP boot probe on transient transport fail. Both from prior loop-improvements. (NEW, shipped this window)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship. (strongest)
- **Mandatory-Minimum-Artifact floor** — every salvage/partial/timeout night still shipped its artifact. Floor never zero. (6/6)
- **`revalidate=N` over `force-dynamic`** — blog ISR + `/es/mp` LCP cumulative wins, 0 regressions. Doctrine.
- **Security hardening via zero-callsite DEFINER/RLS REVOKE + policy consolidation** (lane 01/02) — 0 reverts all window, reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01/02) — safe + reversible.
- **Define→wire→emit FLAG in ONE lane** — `exp-wordhunt-hint-v1` (06-21) closed same-run. Rule works when followed. (corrected)
- **n≥50 sample-floor gate** (lane 02) — held `/he` LCP + `/es` CLS swings as WATCH; never named sub-floor suspects. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)
- **Autonomous native back-translation review** (lane 06) — HE/SV/ES reviewed + rewritten in-run, caught SV verb-form bug 06-21, 0 escalations. (validated)

## What to avoid (failed this week)
- **Trusting a stale launchd MCP token** — `SUPABASE_ACCESS_TOKEN` in `~/.claude.json` drifts dead independent of shell env. Never-expire PAT minted 06-21 fixes the 401 expiry; transient transport retried `8c705ba2c`. But MCP still failed lanes 01+06 on 06-22 — don't assume fixed. (resolving)
- **No lane-start stagger under a shared usage window** — 06-20 cascade idle-killed 5 lanes (exit 124) as the shared Claude usage window drained. `e9c75581b` added cutoff-guard + stall alert; still need lane-start STAGGER + concurrency cap. (open #1)
- **`next build` in ANY gate verify path** — both paths now `tsc --noEmit`-only. Never reintroduce. (kept)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + page-wire in one budget = partial; es.js `streakNewPB` key dropped 06-19 (cap hit) → Spanish raw key. Write ALL 5 locales FIRST. (high-frequency, recurred)
- **Working-set cap (~8) dropping a locale** — translations BEFORE component. (high)
- **Creating an experiment whose variant-B has no conditional render** — `exp-leaderboard-play-cta-v1` DEACTIVATED (telemetry-only). Check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — `/he` LCP + `/es` CLS held at WATCH. Never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 35+ nights, 0 signals; RSS fallback `c5b0c4c10`; jq parse errors recur. Stop retrying OAuth; wrap fetch in error-tolerant parse. (kept)

## Open watches (carry forward)
- **Shared-usage cascade** — stagger lane starts + cap concurrency vs shared Claude quota. Status: open #1 infra.
- **Supabase + Sentry MCP reachability** — token-expiry FIXED (never-expire PAT) + transient retry shipped, but preflight + lanes 01/06 still failed 06-22. Sentry MCP 403 (write scope). Status: resolving, infra.
- **word_wheel_catchup migration unapplied (prod 500s)** — `wordWheelRoutes.ts:108` inserts missing `is_catchup` col. 2-line SQL, human. Status: urgent, open.
- **MP lobby INP regression** — `/multiplayer` p75 248→736 (06-20/21); 1Hz countdown re-rendered whole view. Fix `241476876` isolated countdown. Status: resolving, verify p75 next RUM.
- **`/he` LCP ~6.3s · `/es/mp` CLS 0.288 · rage-clicks (`/es/mp` 0.584, `/he/sealed-bid` 0.332)** — profile. Status: open, lane 02/03.
- **`exp-leaderboard-play-cta-v1`** — blocked on `leaderboard/PageClient.tsx` 519-line <500 refactor. Status: blocked.
- **Word-vault puzzle depth** (06-13 directive) — hub shipped; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Tower daily-letters + reward-ad refill** (06-02 directive) — scoped, not built. Status: open, lane 05/09.
- **Dead flags (3)** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0/77 converts). Retire/kill. Status: open, human.
- **AdSense re-submit** — window open since 06-17; E-E-A-T bar cleared; manual op. Status: open, human.
- **ES/SV "scrabble" cluster (ride, lane 06)** — title rewrites + SV verb-form fix shipped; 28d-lag hold, next review 2026-07-02. Status: ride.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+ / leaderboard/PageClient 519** — >500-line refactor blocks flag wiring. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | zero-callsite REVOKE + index drops, 0 reverts (MCP-blocked many nights) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | shipped 6/6 this window, 0 reverts — most reliable |
| 03 engagement | `frontend-design` | wordhunt-hint flag wired 06-21/22; 0 reverts |
| 04 competitor | `humanizer` | docs-only every night; ~18 ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | shiritori/alchemy/crossword polish shipped ~4/6, 0 reverts |
| 06 seo | `seo-daily` | shipped 4/6; autonomous HE/SV/ES native review |
| 07 self-learn | none — prompt-only | ships every night it runs |
| 08 adsense | `humanizer` | blog ISR + JSON-LD + E-E-A-T; structural bar cleared, 0 reverts |

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
