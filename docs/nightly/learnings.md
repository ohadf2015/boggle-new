# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-09-09..09-16. 7 launched nights** (09-09, 09-10, 09-12, 09-13, 09-14, 09-15, 09-16). 09-11 had no run.
>
> **HEADLINE 1 — LAST WEEK'S #1 IS FIXED, AND THE FIX WAS OURS.** The "one lane stalls ~7.9 h then exits rc 75"
> failure last occurred on **09-10 (lane 3, 01:33 → 09:14)**. It has NOT recurred on 09-12, 09-13, 09-14, 09-15
> or 09-16 — **5 consecutive clean nights**. The 09-16 log shows exactly the per-lane wall-clock cap this file
> asked for last week, now live:
> `time-guard armed → idle-kill @ 1500s no-output, finalize @ +24m, hard backstop @ +30m, file-cap=8`
> plus `no MCP → idle leash raised to 1500s (silent rate-limit-backoff tolerance)`.
> **CLOSE IT. Do not re-report the stall. Do not propose `caffeinate -s`.** 09-16 ran lanes 1–6 in **41 minutes
> total** — the fastest lane phase in this window.
> **Honest caveat:** the guard is confirmed live only in the **09-16** log, and **09-15 lane 6 still ran 2h49m**
> (02:05 → 04:54, delivered 2 files). So: no hard rc-75 stall since 09-10, guard confirmed live 09-16, **watch
> for soft stalls** — do not assume the guard was active on 09-12..09-15.
>
> **HEADLINE 2 — THE NEW #1: THE ISOLATED GATE DROPS ALL LANE CODE ON 4 OF 6 COMPLETED NIGHTS.** Lanes now
> author plenty and keep it locally; the gate then throws the code away and ships docs only.
>
> | Night | Lanes ran | Files kept by lanes | Gate verdict |
> |---|---|---|---|
> | 09-09 | 8 | 16 | inconclusive ×2 → shipped |
> | 09-10 | 8 | 23 | **FAIL ×6 → docs-only salvage, code DROPPED (13 docs)** |
> | 09-12 | 8 | 29 | **FAIL → docs-only salvage, code DROPPED (16 docs)** |
> | 09-13 | 8 | 24 | inconclusive ×2 → shipped `da42c7ee9` |
> | 09-14 | 9 | 26 | **FAIL ×4 → docs-only salvage, code DROPPED (16 docs)** |
> | 09-15 | 9 | 39 | **FAIL ×6 → docs-only salvage, code DROPPED (17 docs)** |
>
> **THE GATE IS NOT AT FAULT — THE LANES ARE SHIPPING BROKEN CODE.** This was checked before shipping, and the
> first reading (*"the gate false-drops innocent code"*) was **WRONG**. On 09-10, 09-14 AND 09-15 the log reads:
> `gate-timeout: standalone typecheck tier FAILED (tsc/test:changed) — the authored set has a real type/test break`
> then `drop-and-re-gate: conclusive typecheck tier named an offender`. The baseline-aware path at `run.sh:851`
> **fired correctly every time** and explicitly refused to ship
> (`REFUSING baseline-red ship … a new break may be hidden`, 09-10). The gate is doing its job.
> **ROOT CAUSE: lanes self-verify with `npx eslint <changed files>` only — and eslint does not type-check.**
> This is the exact failure already in memory as `gauntlet-gate-needs-tsc-2026-09-12`: *"a gate of eslint +
> vitest let six TS errors reach the ship; only `next build` type-checks."* Every lane prompt tells you eslint
> is "fast and enough". **It is not.** A lane that touches `.ts`/`.tsx` MUST run
> `cd fe-next && npx tsc --noEmit -p tsconfig.json` (or at minimum `npx tsc --noEmit <changed files>`) before
> declaring done, or its work is dropped 4 nights out of 6.
> **SEPARATE, REAL, AND STILL WORTH FIXING: the gate's failure output is drowned in environmental noise** —
> `connect ECONNREFUSED 127.0.0.1:3000` ×96 · `::1:3000` ×96 (integration tests needing a dev server the
> isolated gate never starts) · `[vitest] No "init" export is defined on the "@sentry/nextjs" mock` ×18.
> That noise is why the gate needs 4–6 retries and a `conclusive typecheck tier` to name an offender at all.
> **Cost: 3–5 h of gate retries per night** (09-12 lanes finished 01:14, shipped 06:34 = **5h20m of gate**;
> 09-15 05:12 → 08:40 = **3h28m**; 09-14 01:28 → 04:14 = **2h46m**).
>
> **HEADLINE 3 — `rc=134` (SIGABRT) on the isolated gate fired on 6 of 6 completed nights.** Always
> `wedged 2700s idle / 5400s backstop, or a native toolchain crash`. SIGABRT under a 4 GB heap is the known
> **tsc/vitest OOM** signature, not a wedge. Each occurrence costs a full 45–90 min retry cycle.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible).
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (graduated 07-20; the 09-14 hide-it PR #1032
  was **REVERTED** by #1049 — it is public), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06).
  **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`,
  `wheel-rush`.** Check the gate BEFORE offering a polish idea.
- **The lane scheduler skipping lanes is BY DESIGN.** `run.sh:421`. 8–9 of 12 lanes per night; rotation gives
  every idle lane a slot ~every 3 nights. `NIGHTLY_SCHEDULER=0` restores all 12. **Not a defect.**
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. **Lane 08 launched 2/7** (09-13, 09-15) — up from 0/3 last week, still under the
  every-2-days ask. Watch, do not escalate yet.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap**, but the time-guard now enforces **`file-cap=8` per lane** and BLOCKS new edits
  past the finalize cutoff. Plan one complete change, not three. Write all locale translations FIRST —
  **`ru` is a live 6th locale** despite CLAUDE.md saying 5.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 52 days.** Ninth
  consecutive window at 0. `night:good` 0 · `night:meh` 0 · `polish:try` 0 · `idea:build` 0 · `reddit:*` 0 ·
  `mode:*` 0. **The Telegram card CTA is dead as a steering channel. Stop adding buttons.** Any lane prompt
  that says "wait for a `polish:try` vote" is unreachable — self-select instead.
- Do not confuse these with `feedback/summary-*.md` — that is the **player** sentiment digest, a different signal.

## What works (validated this week)
- **The per-lane time-guard SHIPPED and killed the stall.** `idle-kill @ 1500s / finalize @ +24m / hard
  backstop @ +30m / file-cap=8`, with the idle leash raised to 1500 s for no-MCP lanes. 5 clean nights, and
  09-16 ran 6 lanes in 41 min. **The loop successfully fixed its own #1 problem from last week's report.**
  (validated ×5, headline)
- **Docs-only salvage keeps the night from being a total loss, and the dropped code is RECOVERABLE.** Every
  drop logs `backup at ~/logs/lexi-nightly/salvaged-code-<tag>` + the exact
  `scripts/nightly/restore-salvaged-code.sh <tag>` command. 13–17 docs still shipped on each dropped night.
  (validated ×4)
- **Per-lane self-revert contains blast radius.** The 09-09/09-10 rc-75 deaths reverted ONLY that lane's files;
  every later lane ran clean. (validated ×2, carried)
- **The Mandatory-Minimum-Artifact floor works.** Zero total-loss lanes across 7 nights. (validated ×7)
- **Founder WIP is never lost.** `pre-lane WIP: N dirty files (snapshot …; protect list …)` fired on all 7
  nights, including 09-12's **86 dirty files**, with no reported loss. (validated ×7)
- **Verify-already-correct and CLOSE the finding** — a night that retires phantom findings is a real win.
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; BOOLEAN not bare Capacitor proxy; try/catch on async
  generation paths; `initial={false}` on above-fold Framer entrances; eslint-changed-files-only + single
  end-of-run commit; `DirectionalIcon` (NAMED import — a default import resolves to `undefined` and silently
  no-ops) + Tailwind logical `start-`/`end-` for RTL; local JWT verify on read-only GET; root-cause a dead
  counter at the shared funnel, not the caller; Supabase Management API raw-SQL fallback.** (doctrine)

## What to avoid (failed this week)
- **#1 — LANES SHIP CODE THAT DOES NOT TYPE-CHECK, AND THE GATE CORRECTLY DROPS IT. 4 of 6 completed nights.**
  `drop-and-re-gate: conclusive typecheck tier named an offender` on 09-10, 09-14 and 09-15. The gate is not
  false-dropping — the authored set really is broken. **The cause is the lane prompts: they tell you
  `npx eslint <changed files>` is "fast and enough" for self-verification, and eslint does not type-check.**
  **FIX, per lane, tonight: if you touched any `.ts`/`.tsx`, run `cd fe-next && npx tsc --noEmit` before you
  declare done** — and if it is red, fix it or `git checkout --` the file. An un-type-checked edit is worth
  less than no edit, because it drags the whole night's code down with it. (open, **#1**, S-effort per lane,
  ~4 nights of code/week recovered)
- **#2 — `rc=134` SIGABRT on the isolated gate, 6/6 completed nights.** Logged as "wedged … or a native
  toolchain crash", but SIGABRT at a 4 GB heap is the known **tsc/vitest OOM** signature. Each one burns a
  45–90 min retry. **Distinguish OOM from wedge (check for `JavaScript heap out of memory` / `Abort trap`
  before labelling it wedged) and raise `NODE_OPTIONS=--max-old-space-size` for the gate run.** (open, new,
  S-effort, ~1–3 h/night recovered)
- **#3 — The gate phase now costs 3–5 h per night, longer than every lane combined.** 09-12: lanes 1h08m, gate
  5h20m. 09-15: lanes 5h04m, gate 3h28m. It retries the FULL lint+test+build 4–6× per night. **Cap gate
  retries at 2 and alert instead of looping.** (open, new, S-effort)
- **#4 — Stranded `refs/nightly-pending/` is still THREE refs: 2026-08-03, 2026-08-06, 2026-08-28.** ~44
  nights of failed retries for 08-03. It alerts now, but never lands. The blocker is a conflict in the same
  append-only artifacts every time — `docs/nightly/impact-ledger.ndjson`, `mode-readiness.md`,
  `perf-baseline.json`. **Give those three a union merge driver in `.gitattributes`.** (open, carried,
  M-effort, high leverage)
- **#5 — Lane rc is still a useless health signal.** The only honest per-lane signal is
  `kept N authored file(s)` — and even that lies once the gate drops the code. **Emit `files_shipped=` per
  lane AFTER the gate.** (open, carried)
- **agent-browser cannot dismiss the cookie-consent overlay** — the dialog renders outside the snapshot a11y
  tree. Blocking lane 11 visual QA AND lane 02 CLS capture for a **31st+ night**. NOTE: #1046 (09-14) shrank
  the cookie bar to a compact bar — **re-test before assuming it still blocks.** (open, **longest-running**)
- **Impact checks against a zero denominator read as "neutral" and teach nothing.** Assert the DENOMINATOR is
  plausible first; report `no-exposure`, not `neutral`.
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works. Fall through to WebSearch. (lane 04)
- **Don't diagnose a live run from its own report** — an in-progress report is always half-written.
- **Subagents fabricate non-English word lists** — spot-check 5 real words per locale before shipping any
  he/ja/sv/es/ru content. (lane 10)
- **A bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803), not a column.** Verify live names
  in `information_schema.columns`; import socket payload types from `@/shared/types/socket`, never redeclare.

## Open watches (carry forward)
- **Lane code fails `tsc` and gets dropped** — 4/6 nights, `conclusive typecheck tier named an offender`.
  Status: **#1. Every lane runs `npx tsc --noEmit` before declaring done.**
- **Gate failure output is 90% environmental noise** (192 ECONNREFUSED to :3000, a broken `@sentry/nextjs`
  vi.mock) — this is why the gate needs 4–6 retries to name an offender. Status: open, S-effort, real.
- **Gate `rc=134` SIGABRT** — 6/6 nights. Status: open, new; likely OOM mislabelled as wedge.
- **Gate retry loop costs 3–5 h/night** — Status: open, new.
- **Stranded `refs/nightly-pending/2026-08-03, -08-06, -08-28`** — ~44 nights. Union merge driver.
- **agent-browser cookie-consent dismissal** — 31+ nights; re-test after #1046 shrank the bar.
- **`@sentry/nextjs` vi.mock missing an `init` export** — 18 gate errors/night. One-line mock fix, real win.
- **Integration tests dialling `localhost:3000`** — 192 refused connections/night in the gate. Tag and exclude.
- **Telemetry classifier false-positives** — probe `growth:<event>` volume before marking DEAD. Open 8 weeks.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites. Search `rg "n\('exp-" fe-next`, NOT
  `useExperiment`. Status: open, lane 03 (wire or delete).
- **Brain Drill has no traffic** (`drill_completed` 0/19d+). Status: open — discoverability, not features.
- **Word Tower hide was REVERTED** (#1032 → #1049). It is a public mode. Do not re-hide without a founder call.
- **Per-lane 7.9 h stall / rc 75** — Status: **CLOSED 09-10**, 5 clean nights + the time-guard is in the log.
- **`_gate_ensure_bin` / missing dev-tool binaries** — Status: **CLOSED 09-09.** Do not reopen.
- **Duplicated run-log lines** — Status: **CLOSED.**
- **MP CLS 0.92+** (socket `connecting→lobby` DOM swap). Fix = a `RoomListView` skeleton. Status: human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT. Status: human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 7/7 launched, kept 2–12 files each night; most reliable lane |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 6/7 kept (09-10 lost to the stall); 2–4 files/night |
| 03 engagement | `frontend-design` | 7/7 launched, kept 1–7 files — most consistent lane |
| 04 competitor | `humanizer`, `game-designer` | 4/7 launched, kept exactly 3 files each time — stable output |
| 05 landing | `frontend-design`, `impeccable`, `animate-ai` | 6/7 kept (09-09 lost to the stall); best yield, 8–9 files ×3 nights |
| 06 seo | `seo-daily` | 1/7 (09-09 only) — scheduler-starved; mandatory when it runs, native review required |
| 07 self-learn | none — prompt-only | 2/7 (09-10, 09-16); its 09-10 time-guard proposal SHIPPED |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/7 (09-13, 09-15) — up from 0/3; still under the 2-day cadence |
| 09 monetization | `frontend-design` | 6/6 launched but kept exactly **1 file every single night** — lowest yield, investigate the prompt |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/7 (09-12, 09-14), kept 7 files each — best per-run yield |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 7/7 launched, kept 2–9; **escalate the cookie blocker, don't re-audit** |
| 12 telemetry | none — prompt-only | 5/7, kept 1–2 files each; idempotence guard still unbuilt |

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
