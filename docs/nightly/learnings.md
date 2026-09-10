# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-09-04..09-10. Of 7 nights, 3 launched lanes (09-06, 09-09, 09-10).** 09-05, 09-07 and 09-08
> had no scheduled run (09-08 log is 631 B, a manual stub).
>
> **HEADLINE 1 — THE GATE IS FIXED. The loop shipped real code again.** Last week's `_gate_ensure_bin` /
> `command not found` chain that cost 4 consecutive nights of lane code is **GONE**. 09-09 shipped
> `dcb36a657` with 2 real code files (`app/[locale]/play-boggle-online-free/page.tsx`,
> `components/singleplayer/useSinglePlayerConfig.ts`) plus 15 docs, and the report records
> *"shipped type-checked (standalone tsc) + affected-tests-green"*. `rg "command not found"` returns **ZERO**
> on the **09-09 and 09-10** logs — but still MATCHES on **09-06**, so the loss streak ran 5 nights and the
> fix landed on 09-09. Evidence for CLOSED = 2 clean nights, not 3. **Close it. Do not re-report it. Do not
> "fix" `_gate_ensure_bin`.**
>
> **HEADLINE 2 — the new #1: one lane per night STALLS ~7.9 h and is then killed by the deadline guard.**
> Three launched nights, three different lanes, one identical shape:
>
> | Night | Lane that died | Window | Duration | rc |
> |---|---|---|---|---|
> | 09-06 | lane 2 `11-mode-qa` | 01:35 → 09:25 | **7h50m** | 75 |
> | 09-09 | lane 4 `05-landing` | 01:54 → 09:48 | **7h54m** | 75 |
> | 09-10 | lane 3 `02-perf` | 01:33 → 09:14 | **7h41m** | 75 |
>
> **The 7.9 h is NOT a usage-limit wait — that reading is wrong and was corrected before this file shipped.**
> The 09-10 log holds exactly ONE backoff event, and it reads:
> `USAGE-LIMIT hit (BACKOFF) — wait 120s would resume past 06:30; aborting (rc=75)`. That is the **06:30
> deadline guard working as designed**, firing instantly — a 7.9 h `sleeping 120s` loop would have left ~230
> lines. So `rc 75` is the *symptom*: the lane had already stalled for hours, and rc 75 is simply how a
> stalled lane exits once it wakes past the deadline.
> **The stall itself is UNEXPLAINED and is the real bug.** Lane 3 on 09-10 logged exactly one tool call
> across 7h41m — a dispatched `Explore` subagent — matching the known failure `machine sleep kills subagents
> silently`. `caffeinate -i -w $$` is wired at `run.sh:34`, but `-i` holds only an *idle*-sleep assertion and
> does not survive a lid close. Every other lane on those nights finished in a normal 8–18 min, and the dead
> lane's files are reverted (`reverting THIS lane's own files only`).
> **Cost: 1 lane lost per night (~12% of output) + the night ends at 10:30 instead of ~03:00.**
> **FIX THAT WORKS UNDER EITHER MECHANISM: a per-lane WALL-CLOCK CAP (~25–30 min → revert, advance).**
> Do NOT "cap the usage-limit retry" — `rg "exit 75|EX_TEMPFAIL" scripts/nightly/run.sh` returns nothing;
> run.sh only *classifies* rc 75 at `:445`/`:512`, the CLI emits it. There is no in-lane wait loop to cap.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible).
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08** in `2e13200f9` — any pitch naming it is dead), `word-tower`
  (graduated 07-20), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06). **Surviving
  admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`, `wheel-rush`.**
  Check the gate BEFORE offering a polish idea.
- **The lane scheduler skipping lanes is BY DESIGN, not a bug.** `run.sh:421` —
  `"8/12 lanes selected — skipping zero-signal lanes … rotation gives every idle lane a slot ~every 3 nights"`.
  Last week's file wrongly logged lane 04/06/10's low launch count as a failure. It is the scheduler working.
  `NIGHTLY_SCHEDULER=0` restores all 12. **Do not file this as a defect again.**
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. **Lane 08 owns; 04/06 feed topics.** Lane 08 launched 0 of 3 nights this window.
  Cadence is dead; needs a founder call or a scheduler exemption (it is being scored zero-signal).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all locale
  translations FIRST — **`ru` is a live 6th locale** despite CLAUDE.md saying 5.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 46 days.** Eighth
  consecutive window at 0. `night:good` 0 · `night:meh` 0 · `polish:try` 0 · `idea:build` 0 · `reddit:*` 0 ·
  `mode:*` 0. **The Telegram card CTA is dead as a steering channel. Stop adding buttons.** Any lane prompt
  that says "wait for a `polish:try` vote" is unreachable — self-select instead.
- Do not confuse these with `feedback/summary-*.md` — that is the **player** sentiment digest
  (PostHog `growth:game_feedback` + Supabase `feedback_reports`), a different and also tiny signal.

## What works (validated this week)
- **The isolated gate now provisions its toolchain correctly and ships.** 09-09 shipped a real code commit
  (`dcb36a657`); the **09-09 and 09-10** logs record no `command not found`. **09-06 still does** — the fix
  landed 09-09, so this is 2 clean nights. The single largest loss channel in the loop is closed.
  (validated ×2, headline)
- **Per-lane self-revert contains a blast radius perfectly.** All three usage-limit deaths reverted ONLY the
  dead lane's own files (`reverting THIS lane's own files only`) and the remaining 4–5 lanes ran clean to
  completion afterwards. One lane dying no longer poisons the night. (validated ×3)
- **The Mandatory-Minimum-Artifact floor works.** Every launched lane, including ones that shipped no code,
  left a `docs/nightly/artifacts/lane-NN-*.md`. Zero total-loss lanes this window. (validated ×3)
- **Duplicated run-log lines are FIXED** — `head -40 | uniq -c` on the 09-10 log shows every line exactly
  once. Last week's carried S-effort item is done; drop it.
- **The stranded-ref retry now ALERTS instead of failing silently** —
  `preflight: WARN — could not auto-recover refs/nightly-pending/2026-08-28 … will retry next run`.
  The Class-4 silent no-op is gone even though the ref is still stuck.
- **Preflight dirty-tree handling matured** — `will run on top of WIP and ship it` +
  `skipping ff-pull (git-ship rebases onto origin at push time)`. No founder WIP lost, and the off-master
  hard-ABORT did NOT fire on any launched night this window.
- **Verify-already-correct and CLOSE the finding.** 09-09 lane 01: *"everything traced came back either
  clean or already-fixed"* — a night that retires phantom findings is a real win. (carried)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; BOOLEAN not bare Capacitor proxy; try/catch on async
  generation paths; `initial={false}` on above-fold Framer entrances; eslint-changed-files-only + single
  end-of-run commit; `DirectionalIcon` (NAMED import — a default import resolves to `undefined` and silently
  no-ops) + Tailwind logical `start-`/`end-` for RTL; local JWT verify on read-only GET; root-cause a dead
  counter at the shared funnel, not the caller; Supabase Management API raw-SQL fallback (MCP is not
  load-bearing).** (doctrine)

## What to avoid (failed this week)
- **#1 — One lane per night STALLS ~7.9 h with no output, then exits rc 75 and its work is reverted.**
  3/3 launched nights, always a different lane. The lane goes silent ~01:50 and does not resume until
  ~09:20; on 09-10 it logged ONE tool call (an `Explore` subagent) in the whole span. **rc 75 is the exit,
  not the cause** — the single backoff line reads `wait 120s would resume past 06:30; aborting (rc=75)`,
  i.e. the deadline guard firing correctly on an already-dead lane.
  **FIX: a per-lane WALL-CLOCK CAP (~25–30 min) → revert that lane, advance to the next.** This recovers the
  lane and the ~7.9 h regardless of whether the stall is a hung subagent (machine sleep) or a usage block,
  and every later lane demonstrably runs fine. Do NOT cap "the usage retry" — no such loop exists in run.sh.
  Secondary: `caffeinate -i` (`run.sh:34`) holds only an *idle*-sleep assertion and will not survive a lid
  close; `-s`/`-d` is the stronger assertion if sleep is confirmed as the mechanism.
  (open, **#1**, S/M-effort, ~1 lane/night recovered)
- **#2 — The usage window may already be depleted at launch.** On 09-10 lanes 1+2 spent only 18 min before
  lane 3 died, and the 5-hour pool is shared with the founder's own daytime sessions. **Probe the remaining
  window at preflight and log one line**, so a starved night is diagnosable instead of looking like a lane
  bug — and so #1's diagnosis can be confirmed rather than inferred. (open, new, S-effort)
- **#3 — Stranded `refs/nightly-pending/` is still THREE refs: 2026-08-03, 2026-08-06, 2026-08-28.** Now
  ~38 nights of failed retries for 08-03. It alerts now, but never lands. The blocker is a conflict in the
  same append-only artifacts every time — `docs/nightly/impact-ledger.ndjson`, `mode-readiness.md`,
  `perf-baseline.json`. **Give those three a union merge driver in `.gitattributes` and the class
  disappears.** (open, carried, M-effort, high leverage)
- **#4 — Lane rc is still a useless health signal.** Lanes that died at the usage limit and lanes that shipped
  both surface as "continuing". The only honest per-lane signal in the log is `kept N authored file(s)`.
  **Emit `files_shipped=` per lane after the gate**; any dashboard keyed on rc is blind. (open, carried)
- **agent-browser cannot dismiss the cookie-consent overlay** — the dialog renders outside the snapshot a11y
  tree. Blocking lane 11 visual QA AND lane 02 CLS capture for a **25th+ night**. FIX: pre-seed the consent
  cookie/localStorage before first navigation. (open, **longest-running blocker in the loop**)
- **Impact checks against a zero denominator read as "neutral" and teach nothing.** Assert the DENOMINATOR is
  plausible first; report `no-exposure`, not `neutral`. Never write `x/7` when only 3 nights launched.
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works, the *search* path does not. Fall
  straight through to WebSearch. (carried, lane 04)
- **Don't diagnose a live run from its own report** — an in-progress report is always half-written. (carried)
- **Subagents fabricate non-English word lists** — spot-check 5 real words per locale before shipping any
  he/ja/sv/es/ru content. (carried, lane 10)
- **A bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803), not a column.** Verify live names
  in `information_schema.columns`; import socket payload types from `@/shared/types/socket`, never redeclare
  locally — a redeclared type crashed the one paying teacher 32× (09-09).

## Open watches (carry forward)
- **Per-night lane stall → rc 75 kill** — 3/3 launched nights, ~7.9 h + 1 lane lost each. Mechanism unproven
  (hung subagent vs usage block); a wall-clock cap fixes both. Status: **#1, assign now.**
- **Depleted window at launch** — Status: open, new; needs a preflight probe to settle #1's mechanism.
- **Stranded `refs/nightly-pending/2026-08-03, -08-06, -08-28`** — Status: open, ~38 nights. Union merge driver.
- **agent-browser cookie-consent dismissal** — Status: open, #1 tooling gap, 25+ nights.
- **Lane 08 (blog cadence) launched 0/3** while the founder asks for a post every 2 days. The scheduler is
  scoring it zero-signal. Status: open, needs a founder call or an exemption flag.
- **Wheel-rush readiness** — blocked on visual QA + HE/JA native review, no code blockers. Status: rotate.
- **Restore queue: tag `20260827-010001` has NO resolve line** (8 files unrestored). Status: open, 1 stranded tag.
- **MP CLS 0.92+** (socket `connecting→lobby` DOM swap). Fix = a `RoomListView` skeleton at lobby dimensions,
  4–6 h. Status: open, human queue.
- **Telemetry classifier false-positives** — 09-10 lane 12 reported `DEAD: 69 (context-gated, ex…)`; most fire
  as `growth:<name>`. Probe `growth:<event>` volume before marking DEAD. Status: open 7 weeks.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites. Search `rg "n\('exp-" fe-next`, NOT
  `useExperiment`. Status: open, lane 03 (wire or delete).
- **Brain Drill has no traffic** (`drill_completed` 0/13d+). Status: open — discoverability, not features.
- **`_gate_ensure_bin` / missing dev-tool binaries** — Status: **CLOSED 09-09**, verified by a real shipped
  code commit + zero `command not found` in 2 logs. Do not reopen without a fresh log match.
- **Off-master preflight ABORT** — Status: **quiet** (did not fire on any launched night this window). Watch.
- **Duplicated run-log lines** — Status: **CLOSED**, verified on the 09-10 log.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT. Status: human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 3/3 launched, kept files each night; 09-09 correctly CLOSED phantom findings |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 2/3 (09-10 lost to the usage window); `supabase-db-manager` dropped — no perf evidence |
| 03 engagement | `frontend-design` | 3/3 launched, kept 2–5 files each night — most consistent lane |
| 04 competitor | `humanizer`, `game-designer` | 1/3 (09-06) — scheduler-rotated, not broken |
| 05 landing | `frontend-design`, `impeccable`, `animate-ai` | 2/3 (09-09 lost to the usage window), 0 reverts when it runs |
| 06 seo | `seo-daily` | 1/3 (09-09); mandatory — native review required |
| 07 self-learn | none — prompt-only | 1/3 (09-10); scheduler skipped it 09-09 |
| 08 adsense | `humanizer`, `higgsfield-generate` | **0/3** — blog cadence at risk, needs an exemption |
| 09 monetization | `frontend-design` | 2/3 (09-06, 09-09); kept only 1 file each — low yield, watch |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 1/3 (09-06, kept 5 files — best per-run yield) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 2/3 (09-06 lost to the usage window); **escalate the blocker, don't re-audit** |
| 12 telemetry | none — prompt-only | 2/3 (09-09, 09-10); idempotence guard still unbuilt |

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
