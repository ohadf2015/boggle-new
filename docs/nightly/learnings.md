# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-10-05..10-10. 6 scheduled nights. LANES RAN ON 5 OF 6** (10-07 died on the spend cap).
> Last rewrite was 10-05 and its window had **7 of 9 nights produce nothing**. That is fixed.
>
> | Night | Lane phase | authored | Gate | Outcome |
> |---|---|---|---|---|
> | 10-05 | **08:52→11:00** (7h34m preflight hang) | ~17 | — | 6 lanes, lane 3 rc=75 usage-limit |
> | 10-06 | 01:06→02:02 (**56 min, 8 lanes**) | 23 | PASS @43m | **SHIPPED** |
> | 10-07 | — | 0 | — | `MONTHLY SPEND CAP (rc=76)` → circuit breaker @ 09:27 |
> | 10-08 | 01:36→05:10 (**3h34m**, 8 lanes) | 15 | PASS @70m | **SHIPPED** `c547ba1df` |
> | 10-09 | 01:06→03:36 (2h30m, 8 lanes) | 23 | **FAIL ×7 over 3h07m** | docs-only salvage — **ALL 23 files DROPPED** |
> | 10-10 | 01:07→ (in flight) | 19+ | — | 6 lanes done at write time |
>
> **HEADLINE 1 — THE 10-02..10-04 PREFLIGHT ABORT IS GONE.** Every night now logs
> `preflight: working tree dirty — will run on top of WIP and ship it` → `dirty tree — skipping ff-pull
> (git-ship rebases onto origin at push time)` → `HEAD carries unpushed non-docs commits — enabling isolated
> ship`. That is last week's **#2** fixed exactly as proposed: route the diverged case into isolated-ship
> instead of aborting. **Skipping ff-pull also removed the 7h34m `git pull` hang (#3) as a side effect** —
> 10-06/08/09/10 all started lanes within 7 minutes of 01:00. **CLOSE #2 and #3.**
>
> **HEADLINE 2 — THE NEW #1 IS THAT ONE BAD FILE DROPS ALL EIGHT LANES.** 10-09 lost **23 authored files**
> to a **single two-line type error** in one lane's file:
> `components/word-craft/gems/GemHuntPageClient.tsx(379,13): error TS2353: ... 'oneMoreCrown' does not exist
>  in type '{ title; transmuteCta; transmuteAria; crownGoal }'`
> then, after a repair attempt, the exact mirror:
> `(374,11): error TS2741: Property 'oneMoreCrown' is missing in type ... but required in type ...`
> A lane added one copy key to an **inline-inferred** object literal and updated one of the two sites. The
> gate's repair loop then **ping-ponged between the two halves of the same mismatch for 3h07m across 7
> attempts** (03:36 → 06:43) before giving up and dropping everything. `scripts/nightly/run.sh` has no
> per-file bisect: `drop-and-re-gate` only re-runs with **lint skipped**, never with the offending file
> removed. One lane's typo cost the other seven lanes their entire night.
>
> **HEADLINE 3 — the salvage is now RECOVERABLE, and that is genuinely new.**
> `docs-only salvage: dropped lane code is RECOVERABLE — backup at ~/logs/lexi-nightly/salvaged-code-20261009-010003;
>  restore with: scripts/nightly/restore-salvaged-code.sh 20261009-010003`. **The 10-09 code still exists.**
> Restoring it is a 2-minute win for whoever reads this — fix `oneMoreCrown` in both sites, re-gate, ship.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible). HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/
  `word-vault` (DELETED 07-06). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`,
  `?mode=cards`), `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** (0.15-weight
  MP-rotation pick only) — its report URL 404s by design. Check the gate BEFORE offering a polish idea.
- **The lane scheduler skipping lanes is BY DESIGN.** `run.sh:421`. 8 of 12 every night this window.
  `NIGHTLY_SCHEDULER=0` restores all 12. **Not a defect.**
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. Lane 08 got 2 of 6 slots (10-06, 10-08).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap**, but the guard enforces **`file-cap=8` per lane** and blocks new edits past the
  finalize cutoff. Write all locale translations FIRST — **`ru` is a live 6th locale** despite CLAUDE.md's 5.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 76 days.** Eleventh
  consecutive window at 0. `night:good` 0 · `night:meh` 0 · `polish:try` 0 · `idea:build` 0 · `reddit:*` 0 ·
  `mode:*` 0. **The Telegram card CTA is dead as a steering channel. Stop adding buttons.** Any lane prompt
  that waits on a `polish:try` vote is unreachable — self-select instead.
- Cards still SEND fine (10-06 sent mode-readiness + game-mode-idea + 2 polish-idea cards; 10-08 sent a
  landing URL card). The outbound leg works; only the inbound callback is dead.
- Not the same as `feedback/summary-*.md` — that is the **player** sentiment digest, a live signal.

## What works (validated this week)
- **Dirty-tree isolated-ship replaced the preflight abort — 5/5 nights reached the lane phase.** Removes
  both last week's #2 and #3 in one change. Biggest loop improvement of the window. (validated ×5)
- **Recoverable salvage backup + `restore-salvaged-code.sh`.** 10-09's 23 dropped files are on disk, not
  gone. A dropped night is now a deferred night. (validated ×1, high value)
- **The spend-cap circuit breaker is still correct engineering** — names the cause (`not a code failure`),
  refuses 7 identical failures, exits in ~12 s. Only defect unchanged: ships no artifact. (×1 this window)
- **Per-lane self-revert contains blast radius.** 10-05 lane 3 (rc=75 usage limit) and 10-07 lane 1 (rc=76)
  each reverted only their own files; later lanes ran clean. (validated ×5, carried)
- **Founder WIP is never lost.** `pre-lane WIP: N dirty files (snapshot …; protect list …)` fired every
  night; `isolated ship` left local HEAD advanced and restored the founder base at end-of-run. (×9)
- **The Mandatory-Minimum-Artifact floor holds inside a lane.** 10-10 lane 6 wrote its
  `lane-12-telemetry-coverage-2026-10-10.md` artifact before its real work.
- **A 56-minute 8-lane phase is achievable** (10-06: 01:06→02:02, 23 files). 10-08 took 3h34m for 15. The
  spread is lane prompt scope, not infra.
- **Doctrine:** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor proxy ·
  try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon`
  NAMED import (default = `undefined`, silent no-op) + logical `start-`/`end-` for RTL · local JWT verify on
  read-only GET · root-cause dead counters at the shared funnel · Supabase Management API raw-SQL fallback.

## What to avoid (failed this week)
- **#1 — ONE FILE'S TYPE ERROR DROPS ALL 8 LANES. The gate is all-or-nothing on the authored set.**
  10-09: 23 files lost to `oneMoreCrown` TS2353/TS2741 in `GemHuntPageClient.tsx`. **Fix: parse the file
  paths out of the `tsc`/test failure, drop ONLY those authored files, re-gate once.** On 10-09 that ships
  21–22 of 23 instead of 0. `scripts/nightly/run.sh` ~L1000 already has the `drop-and-re-gate` hook — it
  just drops *lint*, not *files*. (open, **#1**, M-effort, ~1 night/6 recovered + kills the retry storm)
- **#2 — ADDING A COPY KEY TO AN INLINE-INFERRED OBJECT LITERAL IS A TWO-SITE EDIT, AND LANES KEEP DOING
  ONE.** Both 10-09 errors are the same mismatch seen from each end: add the key to the literal → TS2353
  at the consumer; add it to the consumer → TS2741 at the literal. **Rule for every lane: when you add a
  copy/props key, `rg` the key's sibling (`crownGoal` here) and edit EVERY site in the same edit, then
  `cd fe-next && npx tsc --noEmit` before finalizing.** `npx eslint` does NOT type-check. (open, **#2**,
  prompt-only fix)
- **#3 — THE GATE REPAIR LOOP HAS NO PROGRESS CHECK AND BURNED 3h07m ON 7 ATTEMPTS.** It flipped between
  TS2353 and TS2741 — the error *moved* but never shrank. **Abort the loop when attempt N's error set is
  the same size as N-1's, or after 2 attempts, whichever is first.** 3 hours of compute bought nothing.
  (open, **#3**, S-effort)
- **#4 — The spend cap still ships zero artifacts (10-07).** `circuit-breaker: … stopping early` →
  `summary composer failed/timed out — deterministic inline brief` → nothing on disk. **Write
  `docs/nightly/artifacts/run-aborted-<date>.md` with the reason + unblock command and commit it docs-only.**
  Carried from last week unfixed; cost is now 1 night/6 instead of 4/9. (open, carried, S-effort)
- **#5 — Stranded `refs/nightly-pending/` is STILL the same three refs: 2026-08-03, 2026-08-06, 2026-08-28.**
  ~68 nights for 08-03, warned on all 6 nights this window. Blocker unchanged: conflicts in the same
  append-only artifacts — `docs/nightly/impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`.
  **Give those three a `merge=union` driver in `.gitattributes`.** (open, carried, M-effort — oldest item)
- **#6 — `supabase` MCP fails its boot probe on 5 of 6 nights** (`fail:transport(no response — npx
  boot/connect failed)`, 3 attempts, then `WARN — MCP 'supabase' not connected`). On 10-08 `sentry` failed
  too. Known cause class: **`npx` cold-boot under load hangs subagents** (see MEMORY 09-07 cluster).
  **Pin the MCP server to a local install instead of `npx`.** (open, new, S/M-effort)
- **`run-intel: collector supabase failed/timed out → stale fallback` on 6 of 6 nights**; 10-08 also lost
  `restore`, `impact`, `flagged-puzzles`, `sentry` — 5 of ~9 sources stale while the brief still printed
  ranked signals and read healthy. **Print per-source age in days; >3d = no-signal, not stale-signal.**
- **agent-browser cannot dismiss the cookie-consent overlay** — dialog renders outside the snapshot a11y
  tree. Blocks lane 11 visual QA and lane 02 CLS capture. #1046 shrank the bar — re-test. (open, longest-running)
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works. Fall through to WebSearch. (lane 04)
- **Subagents fabricate non-English word lists** — spot-check 5 real words per locale before shipping any
  he/ja/sv/es/ru content. (lane 10)
- **A bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803), not a column.** Verify live
  names in `information_schema.columns`; import socket payload types from `@/shared/types/socket`, never
  redeclare.

## Open watches (carry forward)
- **All-or-nothing gate: 1 bad file drops 8 lanes** — 10-09, 23 files. Status: **#1, new.**
- **Copy keys added to inline-inferred literals break `tsc` at the other site** — Status: **#2, new.**
- **Gate repair loop has no progress check (3h07m / 7 attempts)** — Status: **#3, new.**
- **Spend cap ships no artifact** — 10-07. Status: open, carried from 10-05.
- **Stranded `refs/nightly-pending/2026-08-03, -08-06, -08-28`** — ~68 nights. Union merge driver.
- **`supabase` MCP npx boot probe fails 5/6 nights** — Status: open, new.
- **4–5 of 9 intel collectors serve stale data while reporting ready** — Status: open, carried.
- **agent-browser cookie-consent dismissal** — re-test after #1046.
- **Diverged-master preflight ABORT** — **CLOSED 10-06.** Dirty-tree isolated-ship path. Do not reopen.
- **No timeout on preflight `git pull`** — **CLOSED 10-06.** ff-pull is skipped on a dirty tree.
- **Lane code dropped by the gate** — **REOPENED 10-09** after being closed on 10-01. Cause is different
  this time: not baseline lint rot (that discrimination still works and shipped 10-06/10-08) but a real
  authored type error with no per-file bisect. Tracked as #1.
- **Gate `rc=134` SIGABRT** — not observed on any of the 4 gate runs this window. Status: watch.
- **Gate is the longest phase** — 43m (10-06, PASS), 70m (10-08, PASS), 3h07m (10-09, FAIL×7). Status: #3.
- **Per-lane stall / rc 75-76** — guard holds on all 5 nights (`idle-kill @ 900–1500s, finalize @ +24m,
  backstop @ +30m, file-cap=8`). Status: CLOSED at lane level.
- **Lane rc is still a useless health signal** — `kept N authored file(s)` is the only honest one, and it
  over-reports after a salvage drop (10-09 "kept 23", shipped 0). **Emit `files_shipped=` per lane AFTER
  the gate.** Status: open, carried.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites. Search `rg "n\('exp-" fe-next`, NOT
  `useExperiment`. **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not features.
  **MP CLS 0.92+** (socket `connecting→lobby` DOM swap) — fix = a `RoomListView` skeleton; human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit
  after ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.
- **Zero-slot lanes this window** — 07-self-learn got 1 of 6 (tonight), 10-dictionary 0 of 6,
  12-telemetry-coverage 1 of 6, 04-competitor 2 of 6. Status: scheduler rotation, by design.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/5 nights, kept 2·2·2·1·5 — most reliable lane |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 4/5 (10-05 rc=75 usage limit); kept 4·3·1·3 |
| 03 engagement | `frontend-design` | 5/5, kept 1·3·4·3 — consistent |
| 04 competitor | `humanizer`, `game-designer` | 2/6 slots; stable when it runs |
| 05 landing | `frontend-design`, `impeccable`, `animate-ai` | 5/5 — but **authored 10-09's gate-killing `oneMoreCrown`**; design quality non-negotiable, add `tsc --noEmit` to its finalize |
| 06 seo | `seo-daily` | 3/6 slots; mandatory when it runs |
| 07 self-learn | none — prompt-only | 2/6 (10-06, 10-10); its time-guard proposal shipped and holds |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/6, kept 3 then 2 |
| 09 monetization | `frontend-design` | kept 1–2 files/night — prompt still too narrow |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 0/6 — scheduler-skipped every night |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 5/5, kept 11·2·2·3·2 — highest single-night yield in the loop |
| 12 telemetry | none — prompt-only | 1/6 (10-10); idempotence guard still unbuilt |

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
