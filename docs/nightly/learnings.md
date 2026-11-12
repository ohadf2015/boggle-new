# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-11-06..11-11. 6 completed nights (+11-12 in flight). CODE SHIPPED ON 0.**
>
> | Night | Lanes | Files authored | Gate | Bisect | On master |
> |---|---|---|---|---|---|
> | 11-06 | 8 | 50 | FAIL | GAVE UP 6/63, 4224s | **NO COMMIT AT ALL** |
> | 11-07 | 8 | **16** | FAIL | **NO PASSING SUBSET — all 6 units failed** | **NO COMMIT AT ALL** |
> | 11-08 | 8 | 27 | FAIL | GAVE UP 6/35, 4190s | `d068f0ab1` — 11 files, **0 code** |
> | 11-09 | **0** | 0 | — | spend cap rc=76 at 01:16 | `dd7729ea6` (residual, 0 code) |
> | 11-10 | 8 | 20 | FAIL | GAVE UP 7/27, 4392s | `66a19bc5d` — 8 files, **0 code** |
> | 11-11 | 8 | 23 | FAIL | GAVE UP 7/21, 3918s | `0ee614272` — 15 files, **0 code** |
>
> **40 consecutive days of zero nightly code on master.** Verify a ship with
> `git show --name-only --format='' <sha> | rg -c '^fe-next/'` — NEVER `isolated-shipped` or `kept N authored file(s)`.
> Master meanwhile merged **#1783–#1845** from interactive sessions. The repo is healthy. **Only the loop fails.**

> ## 🔴 HEADLINE 0 — **PROVEN: THE GATE'S BASELINE IS RED, SO ITS VERDICT IS VOID.**
> **The airtight proof needs no counting: `app/[locale]/layout.tsx` is authored by NO lane, and the gate
> reports a compile error in it.** A compile error in a non-authored file, in a fresh HEAD checkout, *is* a
> red baseline — full stop. Every `GATE FAILED on lane code` line in 20 nights rests on that.
> Corroboration: 11-11's peel ran `gating 1 authored file(s) [typecheck tier]` → `FAIL` six times on six
> different files (03:34–04:29), and 11-07 reported `NO PASSING SUBSET — all 6 unit(s) failed`. (Some of
> those files DO carry real errors, see Headline 3; the baseline red is the part no lane can own.)
> **Stop tuning volume, caps, lane prompts, peel strategy** — a bisect over a poisoned oracle still returns
> `drop-all`. **The fix is DELTA-GATING, not skipping judgment:** gate the *empty* authored set, record its
> error set, gate the authored set, **subtract, ship iff the delta is empty**; on a red baseline also emit
> `GATE INOPERABLE: baseline red (<n> pre-existing)` + alert and skip the bisect. No such probe exists
> (`rg -c 'baseline-probe|gating 0 authored'` → **NO MATCH**). On 11-11 that returns the right answer:
> 11 TS2307 subtracted, 6 Word Tower errors remain → code correctly rejected, ~115m saved. (Never "ship
> unjudged" — 11-11's set would have pushed a non-compiling tree.) See loop-improvements/2026-11-12.md #1.

> ## 🔴 HEADLINE 1 — ROOT CAUSE UNCHANGED AFTER **20 NIGHTS**. ONE `cp`. **FOUNDER ACTION REQUIRED.**
> `rg -Nc TS2307` per night: **11-06 → 10, 11-07 → 10, 11-08 → 12, 11-10 → 11, 11-11 → 11.**
> Every single one is byte-identical and is what makes the baseline red (Headline 0):
> ```
> app/[locale]/layout.tsx(4,31): error TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'
> ```
> Authored by no lane → `unattributable gate failure` → `docs-only salvage`. The file is gitignored
> (`fe-next/.gitignore:133`), absent in the gate's fresh checkout, and the typecheck chain never generates it:
> `rg -c 'build:i18n' scripts/nightly/lib/gate-isolated.sh` → **still NO MATCH on master (re-checked 11-12).**
> ```bash
> cd ~/git/boggle-new
> cp ~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh \
>    scripts/nightly/lib/gate-isolated.sh
> bash -n scripts/nightly/lib/gate-isolated.sh && git add -A scripts/nightly && \
>   git commit -m 'fix(nightly): gate typecheck chains run build:i18n (messagesManifest TS2307)'
> ```
> If the backup ever rotates away: add `npm run build:i18n` to the gate's typecheck chain before `tsc`
> (`build:i18n` = `tsx scripts/build-i18n-assets.ts`, `fe-next/package.json:15`; already inside
> `build:prebuild`:11, which the gate never calls). **Do not re-derive this. It is one command.**
> ⚠️ A `0` TS2307 count on **tonight's** log means the gate has not run yet (lane 07 ≈02:10, gate ≈03:30).

> ## 🔴 HEADLINE 2 — `scripts/` IS DROPPED AS CODE, SO THE LOOP CANNOT SHIP ITS OWN REPAIR.
> Re-confirmed 11-12: `rg -n 'scripts/nightly' scripts/nightly/run.sh` returns only `_restore_cmd` strings
> (:1161, :1203, :1212) — **no keep-set entry.** Add `scripts/nightly` beside the `docs/` keep logic (~:1179):
> same rationale, outside `fe-next/`, so it cannot change the app's lint/type/test/build verdict. Until it
> lands, **every lane-7 infra fix must be emitted as a copy-pasteable patch, never as an edit.**

> ## 🟡 HEADLINE 3 — LANE CODE *DOES* ALSO CARRY REAL BUGS. ONE WAS VISIBLE ON 11-11.
> Under the 11 TS2307 lines, 11-11's authored set had 6 genuine errors, all in one lane's Word Tower work,
> all the **same class** — a new identifier added at ONE site only: `exp-wordtower-busy-tap-feedback-v1`
> missing from the experiments union (TS2345 `lib/experiments.ts`) · `wt2_busy_tap` missing from
> `GrowthEvent` (TS2345) · `nudgeOnBusyTap` passed to `LetterRow`/`V2Dock` but absent from their props
> interfaces (TS2322/TS2367). **A new experiment id or growth event is a THREE-site edit.** Fixing
> Headline 1 will expose errors like these as the real remaining work — that is the point, not a regression.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **2026-11-07 inbound: "Can we have trial for unity?"** → **lane 09 (monetization / edu upsell)** owns a
  trial offer. Still unaddressed after lane 09 ran 11-06/-07/-08/-10/-11. **Name it verbatim in its prompt.**
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
- **Inbound TEXT works; BUTTONS are dead.** Newest ndjson is `2026-11-06`; its last line is still founder
  free text (`"Can we have trial for unity?"`, `of201`). Last real `callback_data` 2026-07-26 — **110 days.**
  All-time aggregate: `modeqa:ontrack:word-tower` ×6, `night:good:smoketest` ×2 (a smoke test, not a rating),
  `polish:try:*` ×4 — all pre-07-26. **No `night:good`/`night:meh` signal exists.** Never add buttons, never
  gate a lane on a vote — but DO read the newest ndjson lines for free text.
- **Player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes are healthy. 8/8 selected lanes ran `rc=0` on 11-11; 6/6 nights clean** (except 11-09's spend cap,
  not a code failure). No `exit 124`/idle-kill in 20 nights. **Stop tuning lane prompts for reliability.**
- **The mandatory-artifact floor works.** 8/8 lanes left an artifact on 11-11 and all 8 shipped inside
  `0ee614272`. It is the only thing the loop reliably delivers — keep it in every prompt, first action.
- **THE FILE-VOLUME CLAMP HELD.** Lane 1 went 32/37 → 1/4/3; nightly totals 50 → 16/27/20/23. Keep the
  clamp; it is just not the bottleneck (Headline 0).
- **The circuit breaker is correct.** 11-09 stopped after one rc=76 instead of burning 8 identical failures.
  Its only defect is the *reporting* (avoid-#3), not the decision.
- **The "conclusive typecheck tier before drop-all" guard is correct — keep it.** It refuses to discard
  build-clean code on an undecidable red. Headline 0 is why it never gets a clean answer.
- **Preflight divergence → isolated ship** stays validated (founder WIP untouched 6/6; 11-11 correctly
  ignored 14 non-authored gate-failing paths instead of blaming lanes for them).
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor
  proxy · try/catch on async generation · `initial={false}` on above-fold Framer entrances ·
  `DirectionalIcon` NAMED import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET ·
  `priority={false}` on Suspense-fallback images · `neo-*` tokens only · a Next `app/**/route.ts` exports
  ONLY handlers + route config.

## What to avoid (failed this week)
- **#1 — THE GATE HAS NO BASELINE PROBE, SO AN ENVIRONMENT RED IS CHARGED TO LANE CODE.** Headline 0; the fix is delta-gating. (new, FOUNDER, S, **highest value**)
- **#2 — THE GATE'S FRESH-CHECKOUT TYPECHECK STILL LACKS `build:i18n`.** 54 TS2307 lines across 5 gated
  logs, all one gitignored module. Cause of all 40 zero-code days. **One `cp`** (Headline 1).
  (open, FOUNDER, S, **carried 6 windows**)
- **#3 — `scripts/` IS DROPPED AS CODE; THE LOOP CANNOT SHIP ITS OWN REPAIR.** Headline 2. (open, FOUNDER, S)
- **#4 — A SPEND-CAP ABORT IS REPORTED AS A NORMAL COMPLETE RUN.** 11-09 printed `residual ship OK` + `nightly-loop complete` after running zero lanes. Needs `run-aborted-<date>.md` + a SPEND CAP card. (S)
- **#5 — A SALVAGE LOG LINE IS NOT A COMMIT.** 11-06 and 11-07 both printed the salvage line and created
  **no commit** (`git log --all --grep="improvement loop 2026-11-06"` → empty; same 11-07). Print the created
  SHA and fail loudly when `git rev-parse` finds none. (confirmed ×3, S)
- **#6 — A ZERO-CODE SHIP IS REPORTED AS SUCCESS.** 4 commits of proof (`5e3ff4bc9` `d068f0ab1` `66a19bc5d`
  `0ee614272`, all 0 `fe-next/` files). `authored CODE > 0 and 0 code committed` must be a loud **ERROR** in the Telegram card with the dropped paths + salvage stamp. (open, carried 7 windows, S)
- **#7 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID** (positional over a
  nightly-varying set). **Print `lane=<name> kept=<n> code=<n>`.** (open, carried, S)
- **#8 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Every STEP-6 `### Lane N` append is
  never committed — only `artifacts/` reaches master. **Un-ignore it, or make `artifacts/` the sole contract.** (S)
- **#9 — A NEW EXPERIMENT ID OR GROWTH EVENT IS A THREE-SITE EDIT.** Headline 3: union in
  `lib/experiments.ts` + `GrowthEvent` union + call site. A new prop is two sites (interface AND every call site). `npx eslint` does NOT type-check — it catches none of these. (confirmed drop cause)
- **#10 — THE PEEL IS LINEAR AND ITS PER-CALL COST LOSES.** 6–7 of 21–63 calls at ~600–700s each
  (3918–4636s vs a 3600s budget), 5/5 gated nights. Worth fixing only AFTER #1 and #2. (carried, M, **deprioritized**)
- **#11 — STRANDED `refs/nightly-pending/` STILL 9** and `ls .gitattributes` → **still NONE**. Create it with
  `merge=union` for `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`,
  `restore-queue.ndjson`. Fetch before the salvage commit. (carried, M)
- **#12 — `translations/*.js` IS A MULTI-LANE HOTSPOT AND LAST WRITE WINS.** A "vanished" i18n string is
  usually never-applied, not gate-eaten — **`git diff` it before re-fixing.** `AcademyMap.tsx`'s 2-line
  `unoptimized` removal is **uncommitted 19 nights.** (carried, S)
- **#13 — ~~ONE LANE'S VOLUME DISCARDS EVERY OTHER LANE'S WORK~~ — DEAD. 11-11 failed on ONE file. Never revive.**
- **Brief hygiene:** LCP top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in
  the collector, not the lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate
  non-English word lists (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST
  AGGREGATE (42803) · Supabase advisor warnings go stale, confirm vs `pg_indexes` · **grep for the helper
  before building it** (`ls scripts/nightly/lib scripts/nightly/tools`) · only count errors in a gated log.

## Open watches (carry forward)
- **#1 + #2 + #3 + #5 + #6 explain all 40 days of zero code. Nothing else matters until they land.**
- **Spend cap is a live risk, not a hypothetical** — 11-09 lost the whole night at 01:16. A pre-lane budget
  probe + `run-aborted-<date>.md` artifact covers it.
- **Replay the NEXT-oldest salvage stamp nightly** as lane 01's first act — the only mechanism turning
  dropped work back into shippable. Oldest remaining: `20261029-010003`. Newest: `20261111-010005` (9 files).
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **24+ nights**. 6 files + a gating
  condition + a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) —
  still blocking lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`). **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not
  features. **MP CLS 0.92+** (socket `connecting→lobby` swap) — fix = a `RoomListView` skeleton; human queue.
- **Human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.

## Specialized Skills (maintained by lane 7)
> Figures come from positional `lane N — kept M` lines — best-effort attribution, not fact (avoid-#7). No lane shipped code this window, so rows reflect scope discipline only.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 6/6; **scope clamp worked: 32/37 → 1/4/3**. Keep the salvage replay as its first act |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 6/6, exactly 2 files every night — the best-scoped lane in the loop |
| 03 engagement | `frontend-design` | 6/6, 1–3 files (11-11: 7 — watch it); never a named gate offender |
| 04 competitor | `humanizer`, `game-designer` | ran 11-08 only (kept 4); in-prompt scope clamp held |
| 05 landing | `frontend-design`, `impeccable` | 6/6, 2–7 files; design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | — | **lane DROPPED 10-31 (`a6f57e90d`)**, SEO via Growth Radar. Row kept only so no one re-adds it |
| 07 self-learn | none — prompt-only | ran 11-06/-07/-11/-12. **Its 10-23 gate fix is still unshipped (Headline 2).** Must emit patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | ran 11-10 + 11-11 (1 file each); blocked on AdSense approval, not skills |
| 09 monetization | `frontend-design` | ran 6/6 and **still never produced the 11-07 founder "trial for unity" ask** — name it verbatim. Never the coin economy |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | ran 11-07 + 11-08 (kept 2, 7) — most active in 3 windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 6/6, 1–5 files; blocked on the cookie overlay; cap its screenshot output |
| 12 telemetry | none — prompt-only | ran 11-10 + 11-11 (1–3 files) |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (110 d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
