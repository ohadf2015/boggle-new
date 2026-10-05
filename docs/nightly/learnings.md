# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-09-27..10-05. 9 scheduled nights. LANES ACTUALLY RAN ON 2 OF THEM (10-01, 10-05).**
> Lane 7 last ran 09-16, so this rewrite spans 19 nights.
>
> **HEADLINE 1 — LAST WEEK'S #1 IS FIXED. THE GATE NO LONGER DROPS LANE CODE.**
> Last week: *"the isolated gate drops all lane code on 4 of 6 completed nights."* This week **both** nights
> that produced code **SHIPPED it**. 10-01 → `50e281c39 chore(nightly): autonomous improvement loop 2026-10-01`,
> **28 authored files across all 8 lanes**, every lane kept something. The new log path that did it:
> `isolated-gate(no-lint): PASS — authored set is test+build clean`
> `baseline-poisoned gate: failing file(s) are non-authored (pre-existing/concurrent lint error on clean HEAD)
>  AND the authored set passes test+build with lint skipped — shipping the nightly's authored work, which
>  introduced no new failure`
> That is the correct discrimination: separate *baseline* lint rot from *authored* breakage instead of
> refusing the whole set. **CLOSE the "lane code gets dropped" watch. Do not re-report it.**
> **Keep running `npx tsc --noEmit` anyway** — the gate ships on test+build, and a type error still fails build.
>
> **HEADLINE 2 — THE NEW #1 IS THAT THE LOOP DOES NOT START. 7 of 9 nights produced ZERO output, from TWO
> silent killers, neither of which is a lane problem.**
>
> | Night | What happened | Output |
> |---|---|---|
> | 09-27..09-30 | lane 1 died in **11s**, `rc=76` spend cap → circuit breaker | **0 files, 0 docs** ×4 (20-line report stubs) |
> | 10-01 | ran clean, 8 lanes, 01:14→02:33, gate PASS | **28 files, SHIPPED `50e281c39`** |
> | 10-02..10-04 | `preflight: ABORT — diverged & local-only commits touch non-docs paths` | **0** ×3 |
> | 10-05 | **7h34m hang in preflight `git pull`**, lanes 08:52→11:00+ | 6 lanes, 2–11 files each |
>
> **Killer A — `MONTHLY SPEND CAP hit (rc=76)`, 4 consecutive nights (09-27..09-30).** The log is explicit and
> correct: `lane 1 — MONTHLY SPEND CAP hit (rc=76) — not a code failure; tripping the circuit breaker now` →
> `circuit-breaker: every further lane would fail identically; stopping early`. The breaker is right; the
> problem is it then produced **nothing at all** — not even the mandatory-minimum artifacts, because lanes never
> got a turn. Four nights read as "quiet" instead of "the budget ran out on the 27th."
>
> **Killer B — `preflight: ABORT — diverged & local-only commits touch non-docs paths`, 3 consecutive nights
> (10-02..10-04).** *Verbatim* the incident already catalogued in `.claude/rules/60-recurring-pitfalls.md`
> Class 4 as **"off-master preflight hard-abort (silent for days)"** — it recurred, again silent for days. The
> founder's `wip(mp-*)` commits (09-26) sat local and non-docs, so ff-pull failed (`fatal: Not possible to
> fast-forward, aborting`) and the loop quit at ~01:05.
>
> **HEADLINE 3 — `preflight: fetching + ff-pulling master...` HUNG FOR 7h34m ON 10-05** (01:16:51 → 08:51:17,
> then `Created autostash` / `Applied autostash` / `preflight: OK`). The git call has **no timeout wrapper**.
> Consequence: tonight's lanes ran **09:00–11:00 in broad daylight**, racing the founder's live sessions for
> `.next/lock` and the git index (see `bg-task-exit-masking-and-concurrent-sessions-2026-06-27`). Lane 3
> (02-perf) burned 31 min and exited 75; lane 1 was 8× slower than on 10-01.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible). HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (public; the hide-it PR #1032 was **REVERTED**
  by #1049), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06).
  **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`,
  `wheel-rush`.** Check the gate BEFORE offering a polish idea. `wheel-rush` has **no standalone route** — it
  is a 0.15-weight MP-rotation pick only, so its report URL 404s by design.
- **The lane scheduler skipping lanes is BY DESIGN.** `run.sh:421`. 8 of 12 lanes per night, every night in this
  window. `NIGHTLY_SCHEDULER=0` restores all 12. **Not a defect.**
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language" angles,
  link a live MODE. **Lane 08 launched 1/9** (10-01); cause of the miss is the 7-of-9 no-run, not the lane.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap**, but the time-guard enforces **`file-cap=8` per lane** and BLOCKS new edits past the
  finalize cutoff. Write all locale translations FIRST — **`ru` is a live 6th locale** despite CLAUDE.md's 5.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 71 days.** Tenth
  consecutive window at 0. `night:good` 0 · `night:meh` 0 · `polish:try` 0 · `idea:build` 0 · `reddit:*` 0 ·
  `mode:*` 0. **The Telegram card CTA is dead as a steering channel. Stop adding buttons.** Any lane prompt
  that says "wait for a `polish:try` vote" is unreachable — self-select instead.
- Not the same as `feedback/summary-*.md` — that is the **player** sentiment digest, a live signal (10-05).

## What works (validated this week)
- **The baseline-poisoned-gate discrimination SHIPS lane code.** Separating pre-existing/concurrent lint rot from
  authored breakage, then shipping on test+build-clean, turned last week's 4-of-6 drop rate into 2-of-2 ships.
  **Biggest loop improvement in a month.** (validated ×2, headline)
- **Every lane yields when it gets a turn.** 10-01: 3·11·3·2·3·1·3·2 = 28 files, **zero empty lanes** — a first.
  Lane 09 (monetization) still kept exactly 1.
- **The spend-cap circuit breaker is correct engineering.** Names the cause (`not a code failure`), refuses to
  burn 7 more lanes on an identical failure, exits in 11 s instead of 8 h. Only defect: ships no artifact. (×4)
- **Per-lane self-revert contains blast radius.** 10-05 lane 3 exit 75 reverted only its own files; lanes 4–6
  ran clean after. (validated ×3, carried)
- **Founder WIP is never lost**, and `isolated ship` keeps it local. `pre-lane WIP: N dirty files (snapshot …;
  protect list …)` fired on every night reaching the lane phase, incl. 09-30's **160 dirty files**; `preflight:
  HEAD carries unpushed non-docs commits — enabling isolated ship` fired on 4 nights and the founder's
  `wip(mp-*)` commits were never pushed. (validated ×9)
- **The Mandatory-Minimum-Artifact floor works *within* a lane** — but cannot save a night that never reaches the
  lane phase (7 of 9). See "What to avoid #1".
- **Doctrine:** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor proxy · try/catch
  on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon` NAMED import (default
  = `undefined`, silent no-op) + logical `start-`/`end-` for RTL · local JWT verify on read-only GET · root-cause
  dead counters at the shared funnel · Supabase Management API raw-SQL fallback.

## What to avoid (failed this week)
- **#1 — A NIGHT THAT DIES BEFORE THE LANE PHASE SHIPS NOTHING, NOT EVEN AN ARTIFACT. 7 of 9 nights.**
  Both killers abort in `preflight`/`lane 1`, so the per-lane artifact floor never engages and the report stays
  a 20-line stub. **Fix: on any pre-lane abort (`rc=76` spend cap, preflight ABORT), write
  `docs/nightly/artifacts/run-aborted-<date>.md` with the reason + the exact unblock command, commit it docs-only,
  and send ONE Telegram alert.** A loop that fails loudly on night 1 costs one night; this one cost seven.
  (open, **#1**, S-effort, ~7 nights/9 recovered)
- **#2 — `preflight: ABORT — diverged & local-only commits touch non-docs paths` is a KNOWN, RECURRING,
  SILENT killer (10-02, 10-03, 10-04).** Already in `.claude/rules/60-recurring-pitfalls.md` Class 4 as
  *"off-master preflight hard-abort (silent for days)"* — and it did it again, for days. The trigger is normal
  founder behaviour: unpushed non-docs WIP on master. **It must ALERT, and it should not abort at all** — the
  `isolated ship` path already exists for exactly this case and ran fine on 09-27..09-30. Route the diverged
  case into isolated-ship instead of exiting. (open, **#2**, S/M-effort)
- **#3 — `preflight: fetching + ff-pulling master...` has NO TIMEOUT and hung 7h34m on 10-05.** Pure Class 4.
  Downstream cost: lanes ran 09:00–11:00 against the founder's live sessions (lock/index contention), and lane
  3 exited 75. **Wrap it in `timeout 300` and alert on rc 124.** (open, new, S-effort)
- **#4 — The monthly spend cap was hit on 09-27 and nothing adapted for 4 nights.** No degraded mode, no
  "docs-only night", no notice. **The breaker should fall back to a zero-token docs night** (regenerate the
  intel brief + feedback digest, which both work without model calls) rather than exit. (open, new, M-effort)
- **#5 — Stranded `refs/nightly-pending/` is STILL three refs: 2026-08-03, 2026-08-06, 2026-08-28.** ~63 nights
  of failed retries for 08-03, warned on all 9. Blocker unchanged: a conflict in the same append-only artifacts
  every time — `docs/nightly/impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`. **Give those three
  a `merge=union` driver in `.gitattributes`.** (open, carried, M-effort — oldest unfixed item here)
- **#6 — `summary composer failed/timed out — deterministic inline brief` on 4 of 4 no-run nights.** Composing
  a summary of nothing hides the real headline. Skip it when `authored == 0 && abort_reason != ""` and surface
  `abort_reason` instead. (open, new, S-effort)
- **agent-browser cannot dismiss the cookie-consent overlay** — dialog renders outside the snapshot a11y tree.
  Blocks lane 11 visual QA and lane 02 CLS capture. **#1046 shrank the bar — re-test before assuming it still
  blocks.** (open, **longest-running**)
- **`run-intel: collector <x> failed/timed out → stale fallback` on EVERY night** — `supabase` on all 9, plus
  `impact`/`restore`/`search` on 10-05. The brief still emits 40 ranked signals, so it reads healthy while 4 of
  9 sources are stale. **Print per-source age in days; >3d = no-signal, not stale-signal.** (open, new)
- **Impact checks vs a zero denominator read as "neutral" and teach nothing** — assert the DENOMINATOR is
  plausible first; report `no-exposure`. **Never diagnose a live run from its own half-written report.**
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works. Fall through to WebSearch. (lane 04)
- **Subagents fabricate non-English word lists** — spot-check 5 real words per locale before shipping any
  he/ja/sv/es/ru content. (lane 10)
- **A bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803), not a column.** Verify live names in
  `information_schema.columns`; import socket payload types from `@/shared/types/socket`, never redeclare.
  **And `npx eslint <changed files>` does NOT type-check** — touched `.ts`/`.tsx` → `cd fe-next && npx tsc
  --noEmit` before declaring done, time permitting.

## Open watches (carry forward)
- **Pre-lane aborts ship zero artifacts** — 7/9 nights. Status: **#1, new.**
- **Diverged-master preflight ABORT** — 3 nights, and a repeat of a catalogued Class-4 incident. Status: **#2.**
- **No timeout on preflight `git pull`** — 7h34m hang 10-05. Status: open, new, S-effort.
- **Monthly spend cap with no degraded mode** — 4 nights lost. Status: open, new.
- **Stranded `refs/nightly-pending/2026-08-03, -08-06, -08-28`** — ~63 nights. Union merge driver.
- **agent-browser cookie-consent dismissal** — re-test after #1046.
- **4 of 9 intel collectors serve stale data while reporting "ready"** — Status: open, new.
- **Lane code dropped by the gate** — Status: **CLOSED 10-01.** The `baseline-poisoned gate` path discriminates
  baseline rot from authored breakage and shipped 2/2. Do not reopen.
- **Gate `rc=134` SIGABRT (6/6 last week)** — **not observed on 10-01 or 10-05**, but only 2 gate runs in the
  window. Status: downgraded to watch — weak evidence, not a fix.
- **Gate retry loop costing 3–5 h/night** — 10-01 gate ran 02:33→04:54 (**2h21m**, one PASS, no retry storm).
  Status: improving; still the longest single phase.
- **Per-lane 7.9 h stall / rc 75** — guard holds (`idle-kill @ 900–1500s, finalize @ +24m, backstop @ +30m,
  file-cap=8` on all 14 lane launches); 10-05 lane 3 exit 75 capped at 31 min. Status: **CLOSED** at lane level
  — the stall moved UP into preflight (see #3).
- **Lane rc is still a useless health signal** — `kept N authored file(s)` is the only honest one. Emit
  `files_shipped=` per lane AFTER the gate. Status: open, carried.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites. Search `rg "n\('exp-" fe-next`, NOT
  `useExperiment`. Status: open, lane 03. **Brain Drill has no traffic** (`drill_completed` 0/19d+) —
  discoverability, not features. **Telemetry classifier false-positives** — probe `growth:<event>` volume
  before marking DEAD; open 9 weeks. **MP CLS 0.92+** (socket `connecting→lobby` DOM swap) — fix = a
  `RoomListView` skeleton; human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after ≥5
  informational pages clear 400w; Sentry MCP write-403 (blocked a 10-05 triage close-out); Supabase never-expire
  PAT. Status: human.
- **Zero-slot lanes** — 06 seo, 10 dict, 12 telemetry got 0 of 9. Status: open, resolves with #1–#3.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 2/2 nights that ran; kept 3 then 2 — most reliable lane |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 1/2 (10-05 exit 75 after 31m); kept 3 on 10-01 |
| 03 engagement | `frontend-design` | 2/2, kept 3 then 2 — consistent |
| 04 competitor | `humanizer`, `game-designer` | 1/9 launched (scheduler-skipped 6×); kept 3 — stable when it runs |
| 05 landing | `frontend-design`, `impeccable`, `animate-ai` | 2/2, kept 2 each; design quality non-negotiable |
| 06 seo | `seo-daily` | 0/9 — scheduler-starved 4 nights running; mandatory when it runs |
| 07 self-learn | none — prompt-only | 1/9 (10-05); its 09-10 time-guard proposal shipped and holds |
| 08 adsense | `humanizer`, `higgsfield-generate` | 1/9, kept 2; blog cadence missed — cause is the no-run, not the lane |
| 09 monetization | `frontend-design` | 1/1 launched, kept exactly **1 file** — 7th straight night at 1; prompt is too narrow |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 0/9 — scheduler-skipped every night |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 2/2, kept **11 files both nights** — highest yield in the loop |
| 12 telemetry | none — prompt-only | 0/9 — scheduler-skipped; idempotence guard still unbuilt |

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
