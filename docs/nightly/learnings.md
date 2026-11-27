# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-11-21..11-27. CODE SHIPPED ON 0 NIGHTS. Last nightly commit of any kind: `fb39dadd6` (11-18) — 9 days ago.**
>
> | Night | Lanes | Gate FAIL | Error signature (re-derived from that night's log) | Commit |
> |---|---|---|---|---|
> | 11-21 | 1 | — | spend cap `rc=76` ×5 + breaker 01:15 | **NONE** |
> | 11-22 | 8 | 28 | `TS2307 'zod'` ×56, `MODULE_NOT_FOUND` ×31, `'detect-libc'` ×29 | **NONE** (`residual ship OK (6f09959c5)`) |
> | 11-23 | 8 | 5 | **`TS2688` ×276 — and nothing else** | **NONE** — log ends ON the FAIL line |
> | 11-24/-25/-26 | 8 ea | 29/16/13 | **`TS2688` ×1932 / ×1035 / ×840 — and nothing else, all three nights** | **NONE** (`residual ship OK (6f09959c5)`) |
> | 11-27 | 6 selected | pending | kept 1/1/1/3/3 | pending |
>
> Verify a ship with `git show --name-only --format='' <sha> | rg -c '^fe-next/'` — **NEVER** `residual ship OK`, `isolated-shipped`, or `kept N authored file(s)`.

> ## 🔴 HEADLINE 0 — **ROOT CAUSE FOUND, AND IT IS ONE COMMAND: `fe-next/node_modules/.bin` IS EMPTY. 0 ENTRIES. 996 PACKAGES INSTALLED.**
> Measured tonight in the **main repo**, not the clone: `ls fe-next/node_modules | wc -l` → **996** (packages
> ARE installed) · `.../@types | wc -l` → **69** · `.../.bin | wc -l` → **0**. Not "a few broken symlinks" —
> **zero**, and `node_modules/.bin/{eslint,tsc,vitest,next,jest}` are ALL MISSING.
> This is the upstream of **every** gate failure in the window. The chain: `gate-isolated.sh:520` CoW-clones
> `node_modules`, so the clone inherits the **empty `.bin`** → `_gate_ensure_bin` (`:109`) correctly detects it
> and runs `npm rebuild`, which **FAILS on every single invocation** (`'npm rebuild' self-heal failed` printed
> on all 13 gate units of 11-26 — the self-heal is a no-op) → lint/tsc/test run with no tool binaries on an
> incompletely-linked tree, emitting `TS2688` (unresolvable `@types`) or `TS2307`/`MODULE_NOT_FOUND` (`zod`,
> `detect-libc`) depending on which package npm last half-wrote — **different spelling, one cause, 5 of 6 gated
> nights** → `drop-all` discards clean lane code, 13–29 FAIL units and 30–55m of linear peel a night.
>
> **FIX (human queue — a lane must not `npm ci` the founder's dirty tree mid-run):**
> `cd fe-next && npm ci --prefer-offline` (~2–4 min), then `ls node_modules/.bin | wc -l` **MUST be >100**.
> **AND make the gate refuse an unprovisioned tree** — far better than peeling 29 units to discover it. At the
> top of the isolated gate, before the CoW clone (`gate-isolated.sh:~518`):
> ```sh
> if [ "$(ls "$PROJECT_DIR/fe-next/node_modules/.bin" 2>/dev/null | wc -l)" -lt 20 ]; then
>   log "isolated-gate: main repo node_modules/.bin has <20 entries — tree unprovisioned, SETUP not code"
>   return 2   # rc=2 → in-place fallback (:624): authored code gets a real verdict instead of drop-all
> fi
> ```
> **This supersedes last window's Headline 2 as the primary.** The grep-widening below is still needed (the
> error never prints `command not found`), but a `.bin` precheck kills the class before it is reached.

> ## 🔴 HEADLINE 1 — THE CHECKOUT IS NOW **148** COMMITS BEHIND `origin/master` AND STILL NEVER FAST-FORWARDS.
> `master` = `6f09959c5` (11-19) · `origin/master` = 148 ahead · `ahead` = 0 (clean fast-forward available) ·
> `.git/FETCH_HEAD` mtime **Nov 27 01:00** — the loop fetches nightly and never merges. Was 134 last window:
> **growing ~2/day.** `origin/master` merged **128 commits in 7 days**, zero of them nightly. Every lane authors
> against a tree missing them, so "interactive outruns the loop" is mechanical. Fix in `run.sh` right after the
> existing `git fetch`: `git merge-base --is-ancestor master origin/master && git update-ref refs/heads/master
> origin/master`, else `tg_alert` + `exit 3`. **`update-ref`, never `checkout`/`pull`** — the founder worktree
> has 142 dirty files. Emit as a patch, don't edit (H2).

> ## 🔴 HEADLINE 2 — `scripts/` IS STILL DROPPED AS CODE, SO THE LOOP CANNOT SHIP ITS OWN REPAIR.
> Re-confirmed tonight: the only `scripts/nightly` hits in `run.sh` are path vars (`:15`, `:16`) and restore
> strings (`:1161`, `:1203`, `:1212`) — **no keep/allow entry.** The `docs/` keep logic is at `:1116`–`:1119`;
> add `scripts/nightly` beside it. Outside `fe-next/`, so it cannot change the app's verdict. Until it lands,
> **every lane-7 infra fix is emitted as a patch, never an edit** (this file obeys that). **Carried 5 windows.
> Gates Headlines 0 and 1.**

> ## 🟡 HEADLINE 3 — THE SETUP CLASSIFIER GREP IS STILL ONE PATTERN SHORT (`gate-isolated.sh:51`, read tonight).
> It matches only `'command not found|[^[:alnum:]_]not found$'`. A missing `@types` **directory** never prints
> that string, so `FAIL` wins 13–29×/night. Widen it to the whole missing-provisioned-dependency class — one
> added alternation: `LC_ALL=C grep -qaE "error TS2688|error TS2307|MODULE_NOT_FOUND|Cannot find module '" "$out"`.
> Keep it even after H0's precheck lands — belt and suspenders, and it is 1 line.

> ## 🟡 HEADLINE 4 — FOUNDER TEXT ON **11-20** WAS MISSED FOR 7 NIGHTS. LAST WINDOW READ THE WRONG FILE.
> `docs/nightly/feedback/2026-11-20.ndjson` exists and is the newest — **not 11-06** as last window asserted:
> `{"from_user":"of201","text":"Fix them"}` · `{"text":"And polish it more"}` (both 11-20).
> Unaddressed inbound, 7 nights old. `ls -t docs/nightly/feedback/*.ndjson | head -1` — never assume the date.
> **Buttons remain dead** (last real `callback_data` 2026-07-26, 124 days), so `night:good`/`night:meh` does not
> exist and the sharp-self-critique trigger is unreachable. Never add buttons; never gate a lane on a vote;
> **always read the newest ndjson for free text.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **2026-11-20 inbound (NEW, unactioned): "Fix them" / "And polish it more."** Context-free in the ndjson —
  treat as a standing mandate to prefer *finishing and polishing already-identified* issues over new surfaces.
- **2026-11-07 inbound: "Can we have trial for unity?"** → shipped INTERACTIVELY (`dae168fa5`, 11-16).
  **Lane 09 must `rg -l trial fe-next/lib fe-next/components` BEFORE proposing.**
- **ADMIN-BETA TARGET LIST.** Never STEP-0 targets: `blast`/`blast/v2`, `crossword` (noindex-only), `shiritori`
  (DELETED 09-08), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06).
  **Admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`, `wheel-rush`** —
  the last has **no standalone route**, use `/en/multiplayer/`.
- **The scheduler skipping lanes is BY DESIGN** (`run.sh:421`). 11-27 selected **6/11** (01, 02, 03, 05, 07, 11),
  skipping 04, 08, 09, 10, 12 as zero-signal. `NIGHTLY_SCHEDULER=0` restores all.
- **Lane 06-seo was DROPPED 10-31** (`a6f57e90d`) — SEO routes via Growth Radar. Never re-add it.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education angles, link a live MODE. **Write
  all locale translations FIRST** — **`ru` is a live 6th locale.**

## What works (validated this week)
- **Lanes themselves are healthy.** 11-22..11-27 each ran 6–8 lanes, 1–3 files each. No `exit 124`, no
  idle-kill, in 36 nights. **Stop tuning lane prompts for reliability — the failure is 100% downstream of the
  lanes, in a tree with an empty `.bin`.** The **file-volume clamp holds** too (11-27: 1/1/1/3/3, no lane dominated).
- **The mandatory-artifact floor is the one step every lane completes** — keep it as every lane's first action.
  **It has still never shipped: 56 untracked files in `docs/nightly/artifacts/`.** Lanes write it; integration
  never commits it. Keeps avoid-#5 top-tier.
- **The `rc=2` → in-place-fallback path is the correct design** — it just never gets reached, because the one
  grep that routes to it (H3) cannot see a TS2688. Two small patches make the existing good design work.
  Likewise the **"conclusive typecheck tier before drop-all" guard** is right: it refuses to discard
  build-clean code on an undecidable red; the red is simply never decidable on an unprovisioned clone.
- **Preflight divergence → isolated ship** stays validated — 142 dirty founder files untouched all window.
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor proxy
  · try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon` NAMED
  import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET · `priority={false}` on
  Suspense-fallback images · `neo-*` tokens only · a Next `app/**/route.ts` exports ONLY handlers + route config.

## What to avoid (failed this week)
- **#1 — `fe-next/node_modules/.bin` IS EMPTY (0 of 996) AND `npm rebuild` SELF-HEAL FAILS EVERY TIME.**
  Headline 0. Upstream of 5 of 6 gated nights. `npm ci --prefer-offline` + a `.bin`-count precheck. (**new, highest value, S**)
- **#2 — THE CHECKOUT IS 148 BEHIND `origin/master` AND NEVER FAST-FORWARDS.** Headline 1. Growing ~2/day. (carried, S)
- **#3 — `scripts/` IS DROPPED AS CODE; THE LOOP CANNOT SHIP ITS OWN REPAIR.** Headline 2. Gates #1 and #2. (carried 5×, S)
- **#4 — THE SETUP GREP MISSES TS2688/TS2307.** Headline 3; 1-line widening of `gate-isolated.sh:51`. (carried, S)
- **#5 — A RUN CAN DIE AFTER THE LANES AND LEAVE NOTHING, AND THE ARTIFACTS ARE NEVER COMMITTED ANYWAY.**
  11-23's log ends ON `isolated-gate: FAIL`; 56 artifacts untracked. Needs an EXIT trap committing
  `docs/nightly/artifacts/` on every exit path. (promoted, M)
- **#6 — A ZERO-CODE RUN IS REPORTED AS SUCCESS VIA STALE LOCAL HEAD.** `residual ship OK (6f09959c5)` printed
  on 11-22/-24/-25/-26 with 0 commits. Assert the sha differs from pre-run HEAD **and** `%s` starts
  `chore(nightly)`. (carried 11×, S) · **#7 — A SPEND-CAP ABORT IS REPORTED AS A NORMAL COMPLETE RUN**: 11-21
  was `rc=76` ×5 + breaker 01:15, yet the log's last line is `nightly-loop complete`. Needs
  `run-aborted-<date>.md` + a distinct SPEND CAP card. (carried, S)
- **#8 — NEVER INHERIT LAST NIGHT'S ROOT CAUSE.** Vindicated twice again: last window called the `@types` gap a
  classifier problem (it is a `.bin`/provisioning problem) and read the feedback dir as ending 11-06 (it ends
  11-20). Re-derive: `rg -aNo "error TS[0-9]+|MODULE_NOT_FOUND|Cannot find module '[^']*'" <log> | sort | uniq -c | sort -rn`. (4×, S)
- **#9 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID.** 11-27 printed
  `lane 4 — kept 3` while the scheduler never selected lane 04. **Print `lane=<name> kept=<n> code=<n>`.** (carried, S)
- **#10 — `docs/nightly/reports/` AND `docs/nightly/feedback/` ARE BOTH GITIGNORED** (`.gitignore:81,82`), so
  every STEP-6 append and every founder message is uncommitted and invisible to review. **Un-ignore both, or make
  `artifacts/` the sole contract and drop STEP 6.** (carried, S — now also explains H4's 7-night miss)
- **#11 — A NEW EXPERIMENT ID OR GROWTH EVENT IS A THREE-SITE EDIT** (`lib/experiments.ts` union + call site +
  `GrowthEvent`); a new prop is two. `npx eslint` type-checks NOTHING. Fixing #1 *exposes* these as the real
  remaining work. That is the point. (confirmed drop cause)
- **#12 — THE LINEAR PEEL COSTS 30–55m AND LEARNS NOTHING** — 13–29 FAIL units a night for one empty `.bin`.
  Fixing #1 removes the need entirely. (carried, M, **deprioritized**)
- **#13 — STRANDED `refs/nightly-pending/` IS STILL 10 AND `.gitattributes` STILL DOES NOT EXIST** (verified
  tonight). Create it with `merge=union` for `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`,
  `restore-queue.ndjson`. (M)
- **#14 — `translations/*.js` IS A MULTI-LANE HOTSPOT, LAST WRITE WINS.** A "vanished" i18n string is usually
  never-applied, not gate-eaten — **`git diff` before re-fixing.** (carried, S) · **#15 — 83+ salvage backups
  stacked; replaying is pointless until #1/#2 land (same unprovisioned stale tree).** (S)
- **Brief hygiene:** LCP top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in the
  collector, not the lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate non-English
  word lists (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803) ·
  Supabase advisor warnings go stale, confirm vs `pg_indexes` · **grep for the helper before building it** ·
  only count errors in a gated log.

## Open watches (carry forward)
- **#1 + #2 + #3 + #4 + #5 + #6 + #7 explain all ~56 days of zero code. Nothing else matters until they land.
  #1 is a single `npm ci` away.**
- **`origin/master` merged 128 commits in 7 days while the loop's tree sat at 11-19.** Any lane proposing work
  must `git log --since="7 days ago" --oneline origin/master | rg -i '<keyword>'` — **`origin/master`, not the
  148-stale `master`.** Recent merges: definer-RPC grants, push dupes, heap/session audits, CI perf, Duo polish.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **40+ nights**. 6 files + a gating
  condition + a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y tree) — still blocking
  lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`) · **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not
  features · **MP CLS 0.92+** (socket `connecting→lobby` swap) — fix = a `RoomListView` skeleton; human queue.
- **Human queue** — `cd fe-next && npm ci` (#1, unblocks everything); monthly spend cap; GSC creds drifted to
  `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after ≥5 pages clear 400w; Sentry MCP write-403;
  Supabase never-expire PAT; the 11-20 founder text ("Fix them" / "And polish it more") still needs a target.

## Specialized Skills (maintained by lane 7)
> Figures come from positional `lane N — kept M` lines — best-effort, not fact (avoid-#9). No lane shipped code this window, so rows reflect scope discipline only.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 6/7 (kept 1 on 11-25/-26/-27). Drop the salvage replay as its first act until avoid-#1/#2 land — 83 stamps replay onto the same unprovisioned tree |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | ran 11-24..-27 (2/2/3/1 files). Clamp holding; never a named gate offender |
| 03 engagement | `frontend-design` | 2/1/3/1 files across 11-24..-27; still the best-scoped lane in the loop |
| 04 competitor | `humanizer`, `game-designer` | **skipped by the scheduler 11-26 AND 11-27 as zero-signal.** Row kept; do not force-schedule |
| 05 landing | `frontend-design`, `impeccable` | 4/3/1/3 files across 11-24..-27; design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo · 10 dict · 12 telemetry | 06: — · 10: `dictionary-improvement`, `crossword-clue-craft` · 12: none | **06 was DROPPED 10-31 (`a6f57e90d`)**, SEO via Growth Radar — row kept only so no one re-adds it. **10 skipped 11-26 and 11-27 as zero-signal, idle 4 windows.** 12 scheduled 11-25/-26, skipped 11-27 — lowest-evidence row in the table |
| 07 self-learn | none — prompt-only | ran 11-26/-27. Found the empty `.bin` (H0) by measuring the main repo, overturning last window's classifier diagnosis, and found the missed 11-20 founder text (avoid-#8 twice). Emits patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | ran 11-24 (4) / 11-25 (2); skipped 11-27. Blocked on AdSense approval, not skills |
| 09 monetization | `frontend-design` | scheduled 11-24/-25, skipped 11-27, no distinct kept line. The 11-07 "trial for unity" ask shipped INTERACTIVELY (`dae168fa5`) — **must grep `origin/master` before proposing.** Never the coin economy |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | ran 11-24..-27 clean — the 11-20 mid-lane death has not recurred in 7 nights; safe to keep scheduling. Still blocked on the cookie overlay |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (124 d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
