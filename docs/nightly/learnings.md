# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-10-06..10-12. 7 scheduled nights. Lanes ran on 5. CODE SHIPPED ON 2.**
>
> | Night | Lane phase | authored | Gate | Outcome |
> |---|---|---|---|---|
> | 10-06 | 01:06→02:02 (**56 min**, 8 lanes) | 23 | PASS @43m | **SHIPPED** |
> | 10-07 | — | 0 | — | `MONTHLY SPEND CAP (rc=76)` → circuit breaker @ 09:27 |
> | 10-08 | 01:36→05:10 (3h34m, 8 lanes) | 15 | **PASS** @70m | **0 CODE SHIPPED** — `nothing to commit after excluding generated artifacts`; `c547ba1df` is the residual *docs* ship, NOT a code ship |
> | 10-09 | 01:06→02:34 (8 lanes) | 23 | **FAIL, 3 tiers, to 06:43** | docs-only salvage — **all 23 DROPPED** |
> | 10-10 | 01:07→02:22 (8 lanes) | 23 | FAIL @03:10 → repaired | **SHIPPED** `88f710507` @05:11 |
> | 10-11 | **never started** | 0 | — | `preflight: ABORT — diverged & local-only commits touch non-docs paths` @01:39 |
> | 10-12 | 01:08→ (9/12 lanes) | 21+ | pending | 6 lanes done at write time |
>
> **Read that table again: 76 authored files across 5 run-nights produced TWO code commits.** `kept N
> authored file(s)` is NOT a ship, and **`preflight: OK — repo @ <sha>` is the BASE sha — this file called it
> a ship for a week.** Verify with `rg "isolated-shipped|residual ship" <log>` + `git log --grep="autonomous
> improvement loop"`; there is no 2026-10-08 loop commit on master.
>
> **HEADLINE 1 — I CLOSED THE PREFLIGHT ABORT TOO EARLY, AND 10-11 PROVES IT. THIS IS #1.**
> Last week's rewrite said "CLOSE #2 and #3 — dirty-tree isolated-ship replaced the preflight abort."
> Wrong: **the fix only covers the DIRTY-tree path.** `scripts/nightly/lib/preflight.sh:224` still runs
> `git pull --ff-only` whenever `tree_clean=1`, and L240-250 still hard-ABORTS when the local-only commits
> touch non-docs paths. On 10-11 the founder's tree was **clean** with 7 unpushed code files (solver word
> index + wheelRush bots) → `fatal: Not possible to fast-forward` → **ABORT at 01:39, zero lanes, zero
> files, no `docs/nightly/reports/2026-10-11.md` at all.** The abort is now **dead code**: 20 lines BELOW
> it, the same branch already handles unpushed non-docs commits by setting `NIGHTLY_ISOLATED_SHIP=1` —
> which is exactly the right answer for a divergence too. **Fix: on ff-only failure with non-docs local
> commits, set `NIGHTLY_ISOLATED_SHIP=1` + `NIGHTLY_FOUNDER_BASE` and continue instead of `return 1`.**
> ~6 lines, S-effort, recovers a whole night. Lane 7 shipped this tonight — see loop-improvements/2026-10-12.md.
>
> **HEADLINE 2 — THE GATE'S REPAIR CHAIN NOW ACTUALLY WORKS, ONCE. 10-10 vs 10-09 is the experiment.**
> Both nights authored 23 files and both FAILED the first gate. 10-09 ping-ponged `oneMoreCrown`
> TS2353↔TS2741 through 3 tiers and dropped everything. 10-10 hit the new **`baseline-gate`** tier —
> it re-gated a CLEAN HEAD scoped to just the failing test file (`MpResultsScreen.studentMissed.test.tsx`),
> got PASS, correctly concluded "not a decidable pre-existing baseline", continued salvage, and
> **isolated-shipped `88f710507`**. The wedge-proof pre-existing-red check is the single best infra
> addition of the window. Residual cost: 4h11m wall-clock for one night's 23 files.
>
> **HEADLINE 3 — "the gate has no per-file bisect" WAS FALSE. `nightly_bisect_offenders` is built, tested,
> and wired** (`lib/gate-isolated.sh:373` ← `run.sh:1143`, `test/bisect-offenders.test.sh`). It logged 3
> lines on 10-10 (shipped) and **1 on 10-09** (dropped 23). The work is debugging that one invocation, not
> rebuilding the feature. **Grep for the helper before proposing to write it.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible). HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/
  `word-vault` (DELETED 07-06). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`,
  `?mode=cards`), `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** (0.15-weight
  MP-rotation pick only) — its report URL 404s by design; 10-12 lane 05 correctly used `/en/multiplayer/`.
- **The lane scheduler skipping lanes is BY DESIGN.** `run.sh:421`. 8-9 of 12 every night this window.
  `NIGHTLY_SCHEDULER=0` restores all 12. **Not a defect.**
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. Lane 08 got 1 of 6 run-nights this window.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap**, but the guard enforces **`file-cap=8` per lane** and blocks new edits past the
  finalize cutoff. Write all locale translations FIRST — **`ru` is a live 6th locale** despite CLAUDE.md's 5.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 78 days.** Twelfth
  consecutive window at 0: `night:good`/`night:meh`/`polish:try`/`idea:build`/`reddit:*`/`mode:*` all 0.
  **The Telegram card CTA is dead as a steering channel. Stop adding buttons.** A lane prompt waiting on a
  `polish:try` vote is unreachable — self-select instead. Outbound still works (10-12 sent 2 cards); only
  the inbound leg is dead. `feedback-poll` now defers to the daemon as sole poller.
- Not the same as `feedback/summary-*.md` — the **player** sentiment digest is a live signal, injected into
  triage + engagement on 10-12.

## What works (validated this week)
- **`baseline-gate` wedge-proof pre-existing-red check turned a dropped night into a shipped one** (10-10,
  `88f710507`). Scope a CLEAN-HEAD re-gate to only the failing test file, then decide. (validated ×1, highest value)
- **Recoverable salvage backup + `restore-salvaged-code.sh`.** 10-09's 23 dropped files are still on disk at
  `~/logs/lexi-nightly/salvaged-code-20261009-010003`. A dropped night is a deferred night, not a lost one.
- **Dirty-tree isolated-ship.** 10-07/08/09/10 skipped ff-pull and reached lanes within 7 min of 01:00.
  Correct but **incomplete** — see Headline 1. Founder WIP restored byte-identical on every shipped night.
- **Per-lane self-revert contains blast radius.** 10-07 lane 1 (rc=76) reverted only its own files.
- **The Mandatory-Minimum-Artifact floor holds.** 10-12 produced 7 lane artifacts before the gate even ran.
- **Mandatory sample-size gate on perf claims.** 10-12 lane 02 re-queried a 7428ms LCP row with `$host`,
  found n=1, and refused to call it a regression. Fifth night of imposketch.io contamination caught.
- **"Verified clean with evidence" is a legitimate lane output.** 10-12 lane 11 closed 2 blast dimensions
  with file:line proof and shipped no code — better than a half-wired 6-file fix at the cutoff.
- **Doctrine:** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor proxy ·
  try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon` NAMED
  import (default = `undefined`, silent no-op) + logical `start-`/`end-` for RTL · local JWT verify on
  read-only GET · `priority={false}` on Suspense-fallback images · Supabase Management API raw-SQL fallback.

## What to avoid (failed this week)
- **#1 — THE CLEAN-TREE PREFLIGHT ABORT COST ALL OF 10-11.** **FIXED + regression-tested by lane 7 on
  10-12** (`preflight.sh`, `test/preflight.test.sh`: RED 54/4 on old, GREEN 58/0 on new). Verify on the next
  clean-tree diverged night before closing it here.
- **#2 — A GATE "PASS" THAT SHIPS ZERO CODE IS A SILENT FAILURE, AND IT ATE 10-08's 15 FILES.** Gate PASSED
  06:20:01; next line is `nothing to commit after excluding generated artifacts — treating as no-change`
  (twice), then `residual ship OK (c547ba1df)` — docs only. No alert, run reported success. Pitfalls
  **Class 4** exactly. **Fix: gate PASS on N>0 authored code files + 0 committed = ERROR; alert with the
  excluded-path list, never "no-change".** (open, **#2**, S-effort, 15 files/night)
- **#3 — ONE FILE'S TYPE ERROR CAN STILL DROP ALL 8 LANES — but the bisect is BUILT, so debug it.**
  `nightly_bisect_offenders` exists (`lib/gate-isolated.sh:373` ← `run.sh:1143`, has a test) and ran: 3
  `bisect` lines on 10-10 (shipped) vs **1 on 10-09** (dropped 23). **Read why the 10-09 invocation found no
  offenders** — its oracle is the `quick` typecheck tier, which a `next build` TS wedge can make
  inconclusive rather than attributing. (open, **#3**, M-effort)
- **#4 — ADDING A COPY/PROPS KEY TO AN INLINE-INFERRED OBJECT LITERAL IS A TWO-SITE EDIT.** 10-09's
  `oneMoreCrown` TS2353 at the consumer ↔ TS2741 at the literal is the same mismatch from each end.
  **Every lane: when you add a key, `rg` a sibling key (`crownGoal`) and edit EVERY site in one edit, then
  `cd fe-next && npx tsc --noEmit`.** `npx eslint` does NOT type-check. (open, **#3**, prompt-only)
- **#5 — THE GATE IS THE LONGEST PHASE AND HAS NO PROGRESS CHECK.** 43m (10-06 PASS) · 70m (10-08 PASS) ·
  **4h09m (10-09 FAIL×3 tiers)** · **2h49m (10-10 FAIL→repair→ship)**. 10-09 flipped between two errors —
  the error *moved* but never shrank. **Abort the loop when attempt N's error set is no smaller than N-1's,
  or after 2 attempts.** (open, carried, S-effort)
- **#6 — Early exits ship zero artifacts (10-07 spend cap, 10-11 preflight).** Both nights are invisible
  outside the raw log. **Write `docs/nightly/artifacts/run-aborted-<date>.md` with the reason + unblock
  command, commit it docs-only.** (open, carried 2 windows, S-effort)
- **#7 — Stranded `refs/nightly-pending/` is STILL 2026-08-03, -08-06, -08-28** — ~70 nights,
  `cherry-pick/push failed` on all 7 nights. Blocker: conflicts in append-only artifacts.
  **Give `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json` a `merge=union` driver in
  `.gitattributes`.** (open, carried, M — oldest item here; note #1's fix raises conflict odds, so these
  two are coupled)
- **#8 — `supabase` MCP fails its boot probe; `sentry` now joins it.** Both failed 3 attempts on 10-08 and
  10-12. Cause: **`npx` cold-boot under load hangs subagents** (MEMORY 09-07). **Pin both to a local
  install.** (open, S/M)
- **`collector supabase failed/timed out → stale fallback` on 7 of 7 nights**, yet the brief printed
  `supabase=346` signals. 10-12 now marks `(stale: …)`. **Next: per-source age in days; >3d = no-signal.**
- **The brief's LCP top-5 is cross-tenant PostHog contamination** (imposketch.io), 5 consecutive nights; an
  own-domain `$host`+`n>50` sweep returns ZERO rows. Lane 02 burns 10 min/night re-deriving this.
  **Filter `$host` in the collector, not the lane.**
- **agent-browser cannot dismiss the cookie-consent overlay** — dialog renders outside the snapshot a11y
  tree. Blocks lane 11 visual QA (10-12: "code-audit only"). (open, longest-running)
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works. Fall through to WebSearch. (lane 04)
- **Subagents fabricate non-English word lists** — spot-check 5 real words per locale before shipping any
  he/ja/sv/es/ru content. (lane 10)
- **A bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803), not a column.** Verify live
  names in `information_schema.columns`; import socket payload types from `@/shared/types/socket`.
- **Supabase advisor warnings go stale** — 10-12's `vocabulary_lessons.classroom_id` FK-index row was
  already satisfied. Confirm against `pg_indexes` before "fixing" one.
- **Grep for the helper before proposing to build it.** Two of last week's "missing" items existed
  (`bisect_offenders`; the dirty-tree isolated ship). `ls scripts/nightly/lib scripts/nightly/test` first.

## Open watches (carry forward)
- **#1-#8 above are the live watches** — preflight abort (10-11), gate-PASS-ships-nothing (10-08), bisect
  invocation (10-09), two-site copy keys, gate progress check, abort artifacts, stranded refs, MCP npx boot.
  **#1 fixed + regression-tested by lane 7 on 10-12 — do not re-close it in this file until a clean-tree
  diverged night has demonstrably reached the lane phase.**
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **3 nights** (10-10, 10-12).
  `blastGrid`/`blastTileStates`/`blastPlayerMoves` computed server-side, never read client-side. Fix spans
  6 files + a gating condition + a TDD reconnect test. **Never fits a 15-min lane — needs a human session.
  Stop re-auditing it nightly.**
- **No per-lane ship signal** — `kept N authored file(s)` over-reports (10-09 "kept 23", shipped 0; 10-08
  "kept 15", shipped 0). **Emit `files_shipped=` per lane AFTER the gate.** Status: open, carried.
- **agent-browser cookie-consent dismissal** — re-test after #1046. **Gate `rc=134` SIGABRT** — not seen
  this window, watch. **Per-lane stall / rc 75-76** — guard held 5/5, CLOSED at lane level.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites. Search `rg "n\('exp-" fe-next`, NOT
  `useExperiment`. **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not features.
  **MP CLS 0.92+** (socket `connecting→lobby` DOM swap) — fix = a `RoomListView` skeleton; human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit
  after ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.
- **`/es/juego-de-palabras-multijugador` CTR** — 23.5k impr, ~0.4% CTR, 3 prior title rewrites (Jul/Aug)
  moved nothing. **Not a meta problem. Lane 06: stop rewriting its title; it needs a structural look.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/5 run-nights, kept 2·2·5·4 — most reliable lane |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 5/5; kept 3·1·3·3 — but burns 10 min/night re-deriving the brief's cross-tenant LCP noise |
| 03 engagement | `frontend-design` | 5/5, kept 1·1·3·1 — consistent, low volume |
| 04 competitor | `humanizer`, `game-designer` | 1/7 slots (scheduler-skipped); stable when it runs |
| 05 landing | `frontend-design`, `impeccable`, `animate-ai` | 5/5 — authored 10-09's gate-killing `oneMoreCrown`; design quality non-negotiable, **add `tsc --noEmit` to its finalize** |
| 06 seo | `seo-daily` | 4/7 slots; mandatory when it runs |
| 07 self-learn | none — prompt-only | 2/7 (10-10, 10-12); its time-guard proposal shipped and holds |
| 08 adsense | `humanizer`, `higgsfield-generate` | 1/7, kept 2 |
| 09 monetization | `frontend-design` | kept 1-2 files/night — prompt still too narrow |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 0/7 — scheduler-skipped every night |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 5/5, kept 2·3·2·2 — but 3 nights on one carried blast MAJOR it cannot finish in 15 min |
| 12 telemetry | none — prompt-only | 2/7; **kept 7 files on 10-12 — the window's single biggest lane yield** |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (90+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
