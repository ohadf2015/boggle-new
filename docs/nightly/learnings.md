# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-11-16..11-22. CODE SHIPPED ON 0 NIGHTS. And it got worse: 4 of 7 nights produced NO COMMIT AT ALL.**
>
> | Night | Outcome | Gate | On master |
> |---|---|---|---|
> | 11-16 | 29 authored | FAIL (TS2688 ×1656) | **NO COMMIT** |
> | 11-17 | 16 code authored | FAIL (missing eslint dep) | `4692a6eb0` — 15 files, **0 code** |
> | 11-18 | — | FAIL | `fb39dadd6` — 14 files, **0 code** |
> | 11-19 | — | FAIL (`Cannot find module '@eslint-community/eslint-utils'`) | **NO COMMIT** |
> | 11-20 | lane 1 kept 7 | never reached | **NO COMMIT — run died mid-lane-2** |
> | 11-21 | 0 authored | never reached | **NO COMMIT — MONTHLY SPEND CAP rc=76 at 01:15** |
> | 11-22 | lanes 1–5 kept 5/3/2/3/4 | pending | pending |
>
> **51 consecutive days of zero nightly code on master.** Verify a ship with
> `git show --name-only --format='' <sha> | rg -c '^fe-next/'` — NEVER `isolated-shipped` or `kept N authored file(s)`.
> Master merged **150 commits in 7 days** from interactive sessions. The repo is healthy. **Only the loop fails.**

> ## 🔴 HEADLINE 0 — ONE ROOT CAUSE, THREE SYMPTOMS: **THE CoW `node_modules` CLONE IS INCOMPLETE AND THE CLASSIFIER ONLY RECOGNISES ONE OF ITS FACES.**
> Re-derived tonight from each night's own log (never inherited):
> - 11-15/-16 → `error TS2688: Cannot find type definition file for 'aria-query'` (1449 / 1656 lines, **100% of all errors**)
> - 11-17 → `.bin` dev-tool symlinks missing; `npm rebuild` self-heal **failed**; 5 peel units, all FAIL
> - 11-19 → `Cannot find module '@eslint-community/eslint-utils'` from inside `node_modules/eslint/lib/...`
>
> Three different strings, **one cause**: `cp -Rc` / `cp -R` (`gate-isolated.sh:520-525`) does not reproduce a working
> `node_modules`. The main repo is fine (`ls fe-next/node_modules/@types | wc -l` → 69). **No lane can author any of these.**
>
> **And the gate ALREADY KNOWS — it says so and then ignores itself.** 11-17 logged
> *"toolchain-error classifier will treat any resulting 'command not found' as a SETUP failure, not a code failure"*
> and the very next line was `isolated-gate: FAIL (lane code broke lint/test/build)`. Why: the predicate
> (`gate-isolated.sh:51`, verified tonight) greps **only** `command not found|not found$`. A missing *module* and a
> missing *@types* dir never print that string, so every one of them falls through to "lane code broke it" → drop-all.
>
> **Patch — widen the predicate to the whole missing-provisioned-dependency class (emit, don't edit; see Headline 1):**
> ```sh
> # scripts/nightly/lib/gate-isolated.sh:51 — replace the single grep with:
>   LC_ALL=C grep -qaE 'command not found|[^[:alnum:]_]not found$' "$out" 2>/dev/null && return 0
>   # Missing provisioned dependency in the CoW clone — NEVER authorable by a lane.
>   # TS2688 = @types absent (11-15: 1449, 11-16: 1656 lines → drop-all).
>   # MODULE_NOT_FOUND = a dep's own transitive dep absent (11-19: @eslint-community/eslint-utils).
>   LC_ALL=C grep -qaE "error TS2688|MODULE_NOT_FOUND|Cannot find module '" "$out" 2>/dev/null
> ```
> This returns rc=2 SETUP → in-place fallback (`:624`) → the authored files get a REAL verdict instead of `drop-all`,
> and it skips the ~30–55m linear peel that learns nothing. **Do this first; nothing else in this file outranks it.**

> ## 🔴 HEADLINE 1 — `scripts/` IS STILL DROPPED AS CODE, SO THE LOOP CANNOT SHIP ITS OWN REPAIR.
> Re-confirmed 11-22: `rg -c 'scripts/nightly' scripts/nightly/run.sh` → 6, all `LIB_DIR`/`LANES_DIR`/`_restore_cmd`
> strings — **no keep-set entry.** Add `scripts/nightly` beside the `docs/` keep logic (~:1179); it is outside
> `fe-next/`, so it cannot change the app's lint/type/test/build verdict. Until it lands, **every lane-7 infra fix is
> emitted as a copy-pasteable patch, never as an edit** (this file obeys that). Carried 3 windows.

> ## 🔴 HEADLINE 2 — **NEW: THE LOOP NOW CLAIMS A FOREIGN COMMIT AS ITS OWN SHIP.**
> 11-21 hit the monthly spend cap 15 minutes in (lane 01 `rc=76`), tripped the circuit breaker, authored **0 files** —
> then printed `residual ship OK (6f09959c5)`. **`6f09959c5` is the founder's `fix(auth): paint the sheet Google
> button` (#2029), not a nightly commit.** A run that shipped nothing reported a success with someone else's sha.
> `git rev-parse` the sha you created, assert `git log -1 --format=%s <sha>` matches `chore(nightly)`, and `tg_alert`
> loudly otherwise. This is the 5th variant of "a log line is not a commit" and the first that is actively misleading.

> ## 🟡 HEADLINE 3 — **NEW: TWO NIGHTS DIED FOR NON-GATE REASONS. THE LOOP NOW HAS THREE INDEPENDENT ZERO-CODE PATHS.**
> (a) gate drop-all (Headline 0), (b) **11-20 the run died mid-lane-2** — log ends inside `11-mode-qa`'s time-guard arm
> line, no integration, no commit, lane 01's 7 kept files lost; (c) **11-21 spend cap at 01:15**. Fixing the gate alone
> now buys back at most 3 of 7 nights. The spend cap is a *budget* decision for the founder, not an engineering bug —
> but it must be REPORTED as a cap, not as a complete run (`run-aborted-<date>.md` + a distinct SPEND CAP card).

> ## 🟡 HEADLINE 4 — LANE CODE ALSO CARRIES REAL BUGS: THE ONE-SITE-IDENTIFIER CLASS.
> An identifier added at ONE site only — an experiment id missing from the `lib/experiments.ts` union · a growth event
> missing from `GrowthEvent` · a prop passed but absent from the child's props interface. **A new experiment id or
> growth event is a THREE-site edit; a new prop is two.** `npx eslint` type-checks NOTHING. Fixing Headline 0 will
> *expose* these as the real remaining work. That is the point.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **2026-11-07 inbound: "Can we have trial for unity?"** → lane 09 owns a trial offer, but trial work SHIPPED
  interactively (`dae168fa5`, 11-16). **Lane 09 must `rg -l trial fe-next/lib fe-next/components` BEFORE proposing.**
- **ADMIN-BETA TARGET LIST.** Never STEP-0 targets: `blast`/`blast/v2`, `crossword` (noindex-only),
  `shiritori` (DELETED 09-08), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/`word-vault`
  (DELETED 07-06). **Admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`),
  `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** — use `/en/multiplayer/`.
- **The lane scheduler skipping lanes is BY DESIGN** (`run.sh:421`). `NIGHTLY_SCHEDULER=0` restores all.
- **Lane 06-seo was DROPPED 10-31** (`a6f57e90d`) — SEO routes via Growth Radar. Never re-add it.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education angles, link a live MODE.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **Write all locale translations FIRST** — **`ru` is a live 6th locale.**

## Telegram feedback (last 7 days)
- **Inbound TEXT works; BUTTONS are dead.** Newest ndjson is still `2026-11-06`; its last line is founder free text
  (`"Can we have trial for unity?"`). Last real `callback_data` 2026-07-26 — **119 days.**
  All-time aggregate: `modeqa:ontrack:word-tower` ×6, `night:good:smoketest` ×2 (a smoke test, not a rating),
  `polish:try:*` ×4 — all pre-07-26. **No `night:good`/`night:meh` signal exists.** Never add buttons, never gate a
  lane on a vote — but DO read the newest ndjson lines for free text.
- **Player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes themselves are healthy.** Tonight 5 lanes ran clean in 49 min (01:21→02:10), 2–5 files each. No `exit 124`,
  no idle-kill, in 31 nights. **Stop tuning lane prompts for reliability — the failure is 100% downstream of the lanes.**
- **The mandatory-artifact floor works whenever a commit happens** — the only thing the loop reliably delivers. Keep
  it as every lane's first action. (Lost on no-commit nights: 4 of 7 this window.)
- **The file-volume clamp holds.** 11-22: 5/3/2/3/4. No lane dominated. Not the bottleneck; keep it.
- **The SETUP-reclassification mechanism is the single best idea in the loop** — it already refuses to blame lane code
  for a missing `.bin` symlink. Headline 0 is that same mechanism, one grep wider.
- **The "conclusive typecheck tier before drop-all" guard is correct — keep it.** It refuses to discard build-clean
  code on an undecidable red; it just never gets a clean answer, because the clone's baseline is red.
- **Preflight divergence → isolated ship** stays validated — founder WIP untouched every night it ran.
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor proxy ·
  try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon` NAMED import +
  logical `start-`/`end-` for RTL · local JWT verify on read-only GET · `priority={false}` on Suspense-fallback images ·
  `neo-*` tokens only · a Next `app/**/route.ts` exports ONLY handlers + route config.

## What to avoid (failed this week)
- **#1 — THE CoW `node_modules` CLONE IS INCOMPLETE AND THE CLASSIFIER CATCHES ONE OF ITS THREE FACES.** Headline 0; the 3-line widening of `gate-isolated.sh:51` is the whole fix. (FOUNDER, S, **highest value**)
- **#2 — THE DEEPER FIX: MAKE THE CLONE WHOLE.** `_gate_ensure_bin` self-heals `.bin` only, and on 11-17 even that
  failed. Add an `@types`-count-vs-source check + `npm ci --prefer-offline`, or symlink `node_modules` read-only. (M)
- **#3 — `scripts/` IS DROPPED AS CODE; THE LOOP CANNOT SHIP ITS OWN REPAIR.** Headline 1. (carried 3×, S)
- **#4 — A ZERO-CODE OR ZERO-FILE RUN IS REPORTED AS SUCCESS — NOW WITH A FOREIGN SHA.** Headline 2. Both
  `authored code > 0, committed = 0` and `0 authored + a "ship OK"` must be loud **ERROR** cards. (carried 9×, S)
- **#5 — A RUN CAN DIE MID-LANE AND LEAVE NOTHING** (11-20, killed inside lane 2; lane 01's 7 files lost). No
  integration ran, so not even the artifact floor shipped. Needs a trap committing artifacts on any exit. (new, M)
- **#6 — A SPEND-CAP ABORT IS REPORTED AS A NORMAL COMPLETE RUN** (11-21, rc=76). Needs `run-aborted-<date>.md`
  + a distinct SPEND CAP card. Now confirmed with real damage. (carried, promoted, S)
- **#7 — NEVER INHERIT LAST NIGHT'S ROOT CAUSE.** TS2307/`messagesManifest` was carried 6 windows past its death;
  TS2688 would have been too — it read **0** on 11-17/-19. Re-derive nightly:
  `rg -No 'error TS[0-9]+|MODULE_NOT_FOUND|Cannot find module .[^ ]*' <newest gated log> | sort | uniq -c | sort -rn`.
  (confirmed twice, process, S)
- **#8 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID** (positional over a
  nightly-varying set). **Print `lane=<name> kept=<n> code=<n>`.** (carried, S)
- **#9 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Confirmed again tonight: every STEP-6 `### Lane N`
  append is never committed. **Un-ignore it, or make `artifacts/` the sole contract and drop STEP 6.** (carried, S)
- **#10 — A NEW EXPERIMENT ID OR GROWTH EVENT IS A THREE-SITE EDIT.** Headline 4. (confirmed drop cause)
- **#11 — THE LINEAR PEEL COSTS 30–55m AND LEARNS NOTHING.** 11-17: 5 units, all FAIL on the same missing module.
  Fixing #1 removes the need; delta-gating remains the right general fix. (carried, M, **deprioritized**)
- **#12 — STRANDED `refs/nightly-pending/` IS 10 AND `.gitattributes` STILL DOES NOT EXIST.** Create it with
  `merge=union` for `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`, `restore-queue.ndjson`. (M)
- **#13 — `translations/*.js` IS A MULTI-LANE HOTSPOT, LAST WRITE WINS.** A "vanished" i18n string is usually
  never-applied, not gate-eaten — **`git diff` before re-fixing.** (carried, S)
- **#14 — 83 SALVAGE BACKUPS ARE NOW STACKED** (`~/logs/lexi-nightly/salvaged-code-*`), 16 code files in the 11-17
  stamp alone. Lane 01's replay cannot keep up, and **replaying is pointless until #1 lands** — same broken clone. (S)
- **Brief hygiene:** LCP top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in the
  collector, not the lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate non-English word
  lists (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803) · Supabase
  advisor warnings go stale, confirm vs `pg_indexes` · **grep for the helper before building it**
  (`ls scripts/nightly/lib scripts/nightly/tools`) · only count errors in a gated log.

## Open watches (carry forward)
- **#1 + #2 + #3 + #4 + #5 + #6 explain all 51 days of zero code. Nothing else matters until they land.**
- **Interactive sessions are outrunning the loop 150:0 in 7 days.** Any lane proposing work must first
  `git log --since="7 days ago" --oneline master | rg -i '<its keyword>'` — recent merges covered edu practice XP,
  trials, billing, desktop entry sheets, class accuracy, teacher reminders. Proposing those again is pure waste.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **35+ nights**. 6 files + a gating condition +
  a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) — still
  blocking lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`). **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not features.
  **MP CLS 0.92+** (socket `connecting→lobby` swap) — fix = a `RoomListView` skeleton; human queue.
- **Human queue** — monthly spend cap (budget call, blocks whole nights); GSC creds drifted to `lf-finance.co.il`;
  IndexNow Bing parity; AdSense re-submit after ≥5 pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.

## Specialized Skills (maintained by lane 7)
> Figures come from positional `lane N — kept M` lines — best-effort attribution, not fact (avoid-#8). No lane shipped code this window, so rows reflect scope discipline only.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 5/7 (11-22 kept 5; 11-21 died on the spend cap, not its own fault). Keep the salvage replay as its first act — but 83 stamps now stacked, see avoid-#14 |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | ran 11-22 (kept 3). The 11-16 spike to 9 did not recur — clamp holding |
| 03 engagement | `frontend-design` | 2 files on 11-22; never a named gate offender — still the best-scoped lane in the loop |
| 04 competitor | `humanizer`, `game-designer` | ran 11-22 (kept 3); in-prompt scope clamp held |
| 05 landing | `frontend-design`, `impeccable` | 4 files on 11-22; design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | — | **lane DROPPED 10-31 (`a6f57e90d`)**, SEO via Growth Radar. Row kept only so no one re-adds it |
| 07 self-learn | none — prompt-only | ran 11-17/-22. Re-derived the root cause from each night's own log this time and found it had changed twice (avoid-#7). Emits patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | 1 file/night when scheduled; blocked on AdSense approval, not skills |
| 09 monetization | `frontend-design` | idle this window. The 11-07 "trial for unity" ask shipped INTERACTIVELY (`dae168fa5`) — **must grep master before proposing.** Never the coin economy |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | idle 2 windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | **ran 11-20 and the whole run died inside it** (avoid-#5) — investigate its exit before scheduling it again; blocked on the cookie overlay |
| 12 telemetry | none — prompt-only | idle this window |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (119 d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
