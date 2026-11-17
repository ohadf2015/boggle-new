# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-11-11..11-16. 6 completed nights. CODE SHIPPED ON 0.**
>
> | Night | Lanes | Files authored | Gate | Bisect | On master |
> |---|---|---|---|---|---|
> | 11-11 | 8 | 23 | FAIL | GAVE UP 7/21, 3918s | `0ee614272` — 15 files, **0 code** |
> | 11-12 | 8 | 15 | FAIL | GAVE UP | `630931388` — 15 files, **0 code** |
> | 11-13 | 8 | — | FAIL | GAVE UP | `3f6c014a7` — 15 files, **0 code** |
> | 11-14 | 8 | — | FAIL | GAVE UP | `5fe4b3a8c` — 15 files, **0 code** |
> | 11-15 | 8 | — | FAIL | GAVE UP | `dbf64c5bc` — 12 files, **0 code** |
> | 11-16 | 8 | **29** | FAIL | **GAVE UP — NO PASSING SUBSET (all 12 units failed typecheck)** | **NO COMMIT AT ALL** |
>
> **45 consecutive days of zero nightly code on master.** Verify a ship with
> `git show --name-only --format='' <sha> | rg -c '^fe-next/'` — NEVER `isolated-shipped` or `kept N authored file(s)`.
> Master meanwhile merged **#1973–#1994** from interactive sessions (273 commits in 8 days). The repo is healthy.
> **Only the loop fails.**

> ## 🔴 HEADLINE 0 — **ROOT CAUSE CHANGED. IT IS NO LONGER TS2307. IT IS `TS2688`, AND THE GATE ALREADY HAS THE FIX PATTERN.**
> `rg -No 'error TS[0-9]+' run-20261116-010001.log | sort | uniq -c` → **1656 lines, 100% `TS2688`, zero of anything else.**
> Same on 11-15 (1449, all TS2688). `rg -Nc TS2307` on 11-13/-14/-15/-16 → **0**. The old messagesManifest headline is DEAD —
> stop acting on it, stop running the `cp` from the 10-23 backup.
> ```
> error TS2688: Cannot find type definition file for 'aria-query'.   (× ~69 packages × 24 typecheck invocations)
> ```
> `TS2688` = tsc cannot see `node_modules/@types/*`. **The main repo has all 69** (`ls fe-next/node_modules/@types | wc -l`
> → 69, `aria-query` present). So the loss happens inside the gate's **CoW `node_modules` clone**
> (`gate-isolated.sh:520-525`, `cp -Rc` → `cp -R` fallback). This is an ENVIRONMENT red charged to lane code.
> **The gate ALREADY classifies this exact situation correctly for one sibling case and just doesn't recognise this one.**
> `nightly_gate_output_is_toolchain_error()` (`gate-isolated.sh:49-52`) greps only `command not found` → rc=2 SETUP →
> in-place fallback, code never dropped (`:624`). `TS2688` is the *same class*: a missing provisioned dependency, never
> something a lane can author. **One-line patch — add it to that predicate:**
> ```sh
> # scripts/nightly/lib/gate-isolated.sh:51 — replace the single grep with:
>   LC_ALL=C grep -qaE 'command not found|[^[:alnum:]_]not found$' "$out" 2>/dev/null && return 0
>   # TS2688 "Cannot find type definition file" = @types never provisioned in the CoW clone.
>   # Never authorable by a lane; same SETUP class as a missing .bin symlink (2026-11-16: 1656 lines → drop-all).
>   LC_ALL=C grep -qa 'error TS2688' "$out" 2>/dev/null
> ```
> On 11-16 that returns rc=2, the in-place gate runs, and the 29 authored files get a REAL verdict instead of `drop-all`.
> It also saves the ~55m peel (`03:19:44` after a `02:47:14` fail). **Delta-gating (last window's ask) is still the right
> general fix; this is the 3-line version of it that lands tonight.**

> ## 🔴 HEADLINE 1 — `scripts/` IS STILL DROPPED AS CODE, SO THE LOOP CANNOT SHIP ITS OWN REPAIR.
> Re-confirmed 11-17: `rg -n 'scripts/nightly' scripts/nightly/run.sh` → only `LIB_DIR`/`LANES_DIR`/`_restore_cmd`
> strings (:15, :16, :246, :1161, :1203, :1212) — **no keep-set entry.** Add `scripts/nightly` beside the `docs/` keep
> logic (~:1179): outside `fe-next/`, so it cannot change the app's lint/type/test/build verdict. Until it lands,
> **every lane-7 infra fix must be emitted as a copy-pasteable patch, never as an edit** (this file obeys that).

> ## 🔴 HEADLINE 2 — 11-16 PRINTED `docs-only salvage … (15 docs)` AND CREATED **NO COMMIT.**
> `git log --since="8 days ago" master | rg -i 'improvement loop'` → 11-10, -11, -12, -13, -14, **-15 … and nothing for -16.**
> The salvage line is not a commit (now confirmed ×4: 11-06, 11-07, 11-16, + the 11-09 abort). Even the mandatory-artifact
> floor was lost that night. **`git rev-parse` the created SHA, print it, and `tg_alert` loudly when it is empty.**

> ## 🟡 HEADLINE 3 — LANE CODE ALSO CARRIES REAL BUGS; THE 11-11 CLASS IS STILL THE ONE TO WATCH.
> A new identifier added at ONE site only: an experiment id missing from the `lib/experiments.ts` union · a growth
> event missing from `GrowthEvent` · a prop passed but absent from the child's props interface.
> **A new experiment id or growth event is a THREE-site edit; a new prop is two.** `npx eslint` type-checks NOTHING —
> it catches none of these. Fixing Headline 0 will *expose* errors like these as the real remaining work. That is the point.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **2026-11-07 inbound: "Can we have trial for unity?"** → **lane 09 (monetization / edu upsell)** owns a trial offer.
  Interactive sessions have since shipped trial work (`dae168fa5` fresh-14-days + one-tap checkout, 11-16) — **lane 09
  must now read `rg -l trial fe-next/lib fe-next/components` BEFORE proposing anything, or it will duplicate shipped work.**
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
  (`"Can we have trial for unity?"`, `of201`). Last real `callback_data` 2026-07-26 — **115 days.**
  All-time aggregate: `modeqa:ontrack:word-tower` ×6, `night:good:smoketest` ×2 (a smoke test, not a rating),
  `polish:try:*` ×4 — all pre-07-26. **No `night:good`/`night:meh` signal exists.** Never add buttons, never gate a
  lane on a vote — but DO read the newest ndjson lines for free text.
- **Player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes are healthy. 8/8 selected lanes ran on 11-16; 6/6 nights clean.** No `exit 124`/idle-kill in 25 nights.
  **Stop tuning lane prompts for reliability — the failure is 100% downstream of the lanes.**
- **The mandatory-artifact floor works when a commit happens** — it is the only thing the loop reliably delivers.
  Keep it in every prompt, as the first action. (11-16 lost it only because no commit was created at all; Headline 2.)
- **The file-volume clamp holds.** Authored totals 23 → 15 → 29; no single lane dominated. Keep it; not the bottleneck.
- **The gate's SETUP-reclassification pattern is the single best mechanism in the loop** — it already refuses to blame
  lane code for a missing `.bin` symlink. Headline 0 is just that same mechanism, one grep wider.
- **The "conclusive typecheck tier before drop-all" guard is correct — keep it.** It refuses to discard build-clean
  code on an undecidable red. It never gets a clean answer because the baseline is red.
- **Preflight divergence → isolated ship** stays validated — founder WIP untouched 6/6 nights.
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor proxy ·
  try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon` NAMED import +
  logical `start-`/`end-` for RTL · local JWT verify on read-only GET · `priority={false}` on Suspense-fallback images ·
  `neo-*` tokens only · a Next `app/**/route.ts` exports ONLY handlers + route config.

## What to avoid (failed this week)
- **#1 — `TS2688` IS AN ENVIRONMENT RED CHARGED TO LANE CODE.** Headline 0. 1656 lines on 11-16, 1449 on 11-15.
  **3-line patch to `gate-isolated.sh:51`.** (new, FOUNDER, S, **highest value — do this first**)
- **#2 — THE CoW `node_modules` CLONE LOSES `@types/`.** The deeper cause under #1 (`gate-isolated.sh:520-525`).
  `_gate_ensure_bin` self-heals `.bin` only; add the same check for `@types` count vs the source repo, and
  `npm ci --prefer-offline` (or re-clone) when it diverges. (new, FOUNDER, M)
- **#3 — `scripts/` IS DROPPED AS CODE; THE LOOP CANNOT SHIP ITS OWN REPAIR.** Headline 1. (open, FOUNDER, S)
- **#4 — A SALVAGE LOG LINE IS NOT A COMMIT.** Headline 2 — now ×4, and 11-16 lost even the artifact floor.
  Print the SHA; alert when `git rev-parse` finds none. (confirmed ×4, S)
- **#5 — A ZERO-CODE SHIP IS REPORTED AS SUCCESS.** 5 commits of proof (`0ee614272` `630931388` `3f6c014a7`
  `5fe4b3a8c` `dbf64c5bc`, every one 0 `fe-next/` files). `authored CODE > 0 and 0 code committed` must be a loud
  **ERROR** in the Telegram card with the dropped paths + salvage stamp. (open, carried 8 windows, S)
- **#6 — THE OLD TS2307/`messagesManifest` HEADLINE IS STALE AND WAS CARRIED 6 WINDOWS PAST ITS DEATH.**
  It read 0 on four straight nights while this file still called it "the cause of all zero-code days."
  **Lane 7 must re-derive the error histogram from the newest gated log every night, never inherit last night's
  root cause.** `rg -No 'error TS[0-9]+' <newest gated log> | sort | uniq -c | sort -rn | head` is the whole check.
  (new, process, S)
- **#7 — A SPEND-CAP ABORT IS REPORTED AS A NORMAL COMPLETE RUN.** Needs `run-aborted-<date>.md` + a SPEND CAP card. (S)
- **#8 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID** (positional over a
  nightly-varying set). **Print `lane=<name> kept=<n> code=<n>`.** (open, carried, S)
- **#9 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Every STEP-6 `### Lane N` append is never
  committed — only `artifacts/` reaches master. **Un-ignore it, or make `artifacts/` the sole contract.** (S)
- **#10 — A NEW EXPERIMENT ID OR GROWTH EVENT IS A THREE-SITE EDIT.** Headline 3. (confirmed drop cause)
- **#11 — THE PEEL IS LINEAR AND ITS PER-CALL COST LOSES.** 11-16: 12 units, `02:47` fail → `03:19` give-up (~32m
  burned to learn nothing). Worth fixing only AFTER #1. (carried, M, **deprioritized**)
- **#12 — STRANDED `refs/nightly-pending/` IS NOW 10** (was 9) and `ls .gitattributes` → **still NONE.** Create it
  with `merge=union` for `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`, `restore-queue.ndjson`.
  Fetch before the salvage commit. (carried, M)
- **#13 — `translations/*.js` IS A MULTI-LANE HOTSPOT AND LAST WRITE WINS.** A "vanished" i18n string is usually
  never-applied, not gate-eaten — **`git diff` it before re-fixing.** (carried, S)
- **#14 — 5 SALVAGE BACKUPS ARE NOW STACKED UNREPLAYED** (`salvaged-code-20261112…20261116`). Lane 01's replay of
  the next-oldest stamp is the only mechanism converting dropped work back to shippable — it is not keeping up with
  the drop rate. Replaying is pointless until #1 lands (it re-enters the same poisoned gate). (carried, S)
- **Brief hygiene:** LCP top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in the
  collector, not the lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate non-English word
  lists (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803) · Supabase
  advisor warnings go stale, confirm vs `pg_indexes` · **grep for the helper before building it**
  (`ls scripts/nightly/lib scripts/nightly/tools`) · only count errors in a gated log.

## Open watches (carry forward)
- **#1 + #2 + #3 + #4 + #5 explain all 45 days of zero code. Nothing else matters until they land.**
- **Interactive sessions are outrunning the loop 273:0 in 8 days.** Any lane proposing work must first
  `git log --since="7 days ago" --oneline master | rg -i '<its keyword>'` — #1973–#1994 covered edu practice, trials,
  billing portal, IME, class-join parking. Proposing those again is pure waste.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **29+ nights**. 6 files + a gating condition +
  a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) — still
  blocking lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`). **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not features.
  **MP CLS 0.92+** (socket `connecting→lobby` swap) — fix = a `RoomListView` skeleton; human queue.
- **Human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after ≥5
  informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.

## Specialized Skills (maintained by lane 7)
> Figures come from positional `lane N — kept M` lines — best-effort attribution, not fact (avoid-#8). No lane shipped code this window, so rows reflect scope discipline only.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 6/6 (11-16: kept 5). Keep the salvage replay as its first act — but 5 stamps now stacked, see avoid-#14 |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 6/6. **11-16 spiked to 9 kept files — watch it**; was exactly 2/night for 3 windows |
| 03 engagement | `frontend-design` | 6/6, 2 files on 11-16; never a named gate offender — the best-scoped lane in the loop |
| 04 competitor | `humanizer`, `game-designer` | ran 11-16 (kept 3); in-prompt scope clamp held |
| 05 landing | `frontend-design`, `impeccable` | 6/6, 3 files on 11-16; design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | — | **lane DROPPED 10-31 (`a6f57e90d`)**, SEO via Growth Radar. Row kept only so no one re-adds it |
| 07 self-learn | none — prompt-only | ran 11-11/-12/-16/-17. **Carried a dead root cause 6 windows (avoid-#6) — must re-derive nightly.** Emits patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | 1 file/night; blocked on AdSense approval, not skills |
| 09 monetization | `frontend-design` | ran 6/6. The 11-07 "trial for unity" ask was shipped INTERACTIVELY on 11-16 (`dae168fa5`) — **must grep master before proposing.** Never the coin economy |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | most active in 3 windows; idle this one |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 6/6, 1–5 files; blocked on the cookie overlay; cap its screenshot output |
| 12 telemetry | none — prompt-only | ran 11-15 (1–3 files) |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (115 d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
