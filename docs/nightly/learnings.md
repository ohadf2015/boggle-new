# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-11-05..11-10. 6 completed nights (+11-11 in flight). CODE SHIPPED ON 0.**
>
> | Night | Lanes | Files authored | Gate | Bisect | On master |
> |---|---|---|---|---|---|
> | 11-05 | 8 | 46 (lane 1 = **32**) | FAIL | GAVE UP 8/61, 4636s | `5e3ff4bc9` — 12 files, **0 code** |
> | 11-06 | 8 | 50 (lane 1 = **37**) | FAIL | GAVE UP 6/63, 4224s | **NO COMMIT AT ALL** |
> | 11-07 | 8 | **16** (max 4) | FAIL | **NO PASSING SUBSET — all 6 units failed** | **NO COMMIT AT ALL** |
> | 11-08 | 8 | **27** (max 7) | FAIL | GAVE UP 6/35, 4190s | `d068f0ab1` — 11 files, **0 code** |
> | 11-09 | **0** | 0 | — | — | `dd7729ea6` (residual, 0 code) |
> | 11-10 | 8 | **20** (max 5) | FAIL | GAVE UP 7/27, 4392s | `66a19bc5d` — 8 files, **0 code** |
>
> **39 consecutive days of zero nightly code on master.** Verify a ship with
> `git show --name-only --format='' <sha> | rg -c '^fe-next/'` — NEVER `isolated-shipped` or `kept N authored file(s)`.
> Meanwhile master merged **~40 PRs (#1783–#1815) in 3 days** from interactive sessions. The repo is healthy.
> **The loop is the only thing failing.**

> ## 🔴 HEADLINE 0 — **THE VOLUME THEORY IS DEAD. THE ORACLE IS BROKEN, FULL STOP.**
> Last window blamed lane 1's 35-file keeps for starving the bisect (old avoid-#4). **That clamp
> self-resolved on 11-07** — lane 1 now keeps 1–4 files and nightly totals are 16/27/20/19, not 50.
> **The gate still failed every night.** The decisive proof is 11-07: with only **16 files in 6 units**
> the bisect ran to completion and reported `NO PASSING SUBSET — every one of 6 unit(s) failed`.
> Six independent lanes cannot all be broken. **That verdict is the signature of an
> environment-level failure, not lane code.** Stop tuning volume, caps, lane prompts and peel
> strategy: all of it is downstream of Headline 1. A cheaper bisect over a poisoned oracle still
> returns `drop-all`.

> ## 🔴 HEADLINE 1 — ROOT CAUSE UNCHANGED AFTER **19 NIGHTS**. ONE `cp`. **FOUNDER ACTION REQUIRED.**
> `rg -Nc TS2307` per night: **11-05 → 11, 11-06 → 10, 11-07 → 10, 11-08 → 12, 11-10 → 11.**
> Every one is the same module — `TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'`,
> failing `app/[locale]/layout.tsx`, authored by no lane → `unattributable gate failure` →
> `docs-only salvage`. The file is gitignored (`fe-next/.gitignore:133`), absent in the gate's fresh
> checkout, and the typecheck chain never generates it:
> `rg -c 'build:i18n' scripts/nightly/lib/gate-isolated.sh` → **still NO MATCH on master (re-checked 11-11).**
> ```bash
> cd ~/git/boggle-new
> cp ~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh \
>    scripts/nightly/lib/gate-isolated.sh
> bash -n scripts/nightly/lib/gate-isolated.sh && git add -A scripts/nightly && \
>   git commit -m 'fix(nightly): gate typecheck chains run build:i18n (messagesManifest TS2307)'
> ```
> Backup **re-verified 11-11** (58668B, Oct 23 03:20). If it ever rotates away: add `npm run build:i18n`
> to the gate's typecheck chain before `tsc` (`build:i18n` = `tsx scripts/build-i18n-assets.ts`,
> `fe-next/package.json:15`; already inside `build:prebuild`:11, which the gate never calls).
> **Do not re-derive this. It is one command. It is the whole problem.**
> ⚠️ A `0` TS2307 count on **tonight's** log means the gate has not run yet (lane 07 ≈02:10, gate ≈03:30).

> ## 🔴 HEADLINE 2 — `scripts/` IS DROPPED AS CODE, SO THE LOOP CANNOT SHIP ITS OWN REPAIR.
> Re-confirmed 11-11: `scripts/nightly` is **not** in the salvage keep-set in `scripts/nightly/run.sh`
> (~:1179, beside the `docs-only` keep logic). Add it — same rationale as `docs/`: outside `fe-next/`,
> so it cannot change the app's lint/type/test/build verdict. Until it lands, **every lane-7 infra fix
> must be emitted as a copy-pasteable patch in loop-improvements, never as an edit.**

> ## 🔴 HEADLINE 3 — NEW FAILURE MODE: **MONTHLY SPEND CAP KILLED 11-09 ENTIRELY, SILENTLY.**
> 01:16:08 — lane 01 returned `rc=76` (`You've hit your monthly spend limit`), the circuit breaker
> tripped correctly, **all 8 lanes were deferred**, and the run ended at `residual ship OK (dd7729ea6)`
> — a line indistinguishable from a healthy docs night. No artifact, no distinct alert. The long-carried
> "spend-cap leaves no artifact" watch has now **fired for real**. Fix: on rc=76 write
> `docs/nightly/artifacts/run-aborted-2026-11-09.md` and send a Telegram card that says SPEND CAP, not
> `complete`. Budget-check before lane 1 so the cap is predicted, not discovered.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **2026-11-07 inbound: "Can we have trial for unity?"** → **lane 09 (monetization / edu upsell)** owns a
  trial offer. Still unaddressed — lane 09 ran 11-05/-06/-07/-08/-10 and never produced it. Name it in the prompt.
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
- **Inbound TEXT works; BUTTONS are dead.** Zero `callback_data` records in 7 days; 41 files, 113 lines,
  last callback 2026-07-26 — **108 days.** Newest ndjson line is still founder free text
  (`"Can we have trial for unity?"`, `of201`). **Never add buttons, never gate a lane on a vote — but DO
  read the newest ndjson lines for free text.** No `night:good`/`night:meh` signal exists to aggregate.
- **Player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes are healthy. 6/6 ran nights, every selected lane `rc=0`** (except 11-09's cap, not a code
  failure). No `exit 124`/idle-kill in 19 nights. **Stop tuning lane prompts for reliability.**
- **THE FILE-VOLUME CLAMP WORKED.** Lane 1 went 32 → 37 → **1 → 4 → 3** after the in-prompt scope clamp;
  nightly totals halved (50 → 16/27/20/19). Keep the clamp; it is just not the bottleneck (Headline 0).
- **The circuit breaker is correct.** 11-09 stopped after one rc=76 instead of burning 8 identical
  failures. Its only defect is the *reporting* (Headline 3), not the decision.
- **The "conclusive typecheck tier before drop-all" guard is correct — keep it.** It refuses to discard
  build-clean code on an undecidable red; it just never gets a clean answer while Headline 1 stands.
- **Artifacts survive on DISK 6/6 nights** — but on disk ≠ on master (Headline 0, prior window).
- **Preflight divergence → isolated ship** stays validated (founder WIP untouched 6/6; 11-09 correctly
  excluded 6 founder WIP docs before committing).
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor
  proxy · try/catch on async generation · `initial={false}` on above-fold Framer entrances ·
  `DirectionalIcon` NAMED import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET ·
  `priority={false}` on Suspense-fallback images · `neo-*` tokens only · a Next `app/**/route.ts` exports
  ONLY handlers + route config.

## What to avoid (failed this week)
- **#1 — THE GATE'S FRESH-CHECKOUT TYPECHECK STILL LACKS `build:i18n`.** 54 TS2307 lines across 5 gated
  logs, all one gitignored module. Root cause of all 39 zero-code days. **One `cp`** (Headline 1).
  (open, FOUNDER, S, **carried 5 windows**)
- **#2 — `scripts/` IS DROPPED AS CODE; THE LOOP CANNOT SHIP ITS OWN REPAIR.** Headline 2. (open, FOUNDER, S)
- **#3 — A SPEND-CAP ABORT IS REPORTED AS A NORMAL COMPLETE RUN.** Headline 3. 11-09 printed
  `residual ship OK` + `nightly-loop complete` after shipping nothing and running zero lanes. (new, S)
- **#4 — A SALVAGE LOG LINE IS NOT A COMMIT.** 11-06 and 11-07 both printed the salvage line and created
  **no commit** (`git log --all --grep="improvement loop 2026-11-06"` → empty; same for 11-07). Two more
  nights of proof. Print the created SHA and fail loudly when `git rev-parse` finds none. (confirmed ×3, S)
- **#5 — ~~ONE LANE'S VOLUME DISCARDS EVERY OTHER LANE'S WORK~~ — RESOLVED, AND NEVER THE CAUSE.** Kept one
  window as a correction: 11-07's 16-file run failed identically. Do not revive this theory.
- **#6 — A ZERO-CODE SHIP IS REPORTED AS SUCCESS.** 3 more commits of proof (`5e3ff4bc9` `d068f0ab1`
  `66a19bc5d`, all 0 `fe-next/` files). `authored CODE files > 0 and 0 code files committed` must be a loud
  **ERROR** in the Telegram card with the dropped paths and salvage stamp. (open, carried 6 windows, S)
- **#7 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID** (positional over a
  nightly-varying set — lane 7 was `09-monetization` on 11-05/11-10 and `07-self-learn` on 11-06).
  **Print `lane=<name> kept=<n> code=<n>`.** (open, carried, S)
- **#8 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Every `### Lane N` section lanes append
  in STEP 6 is never committed. **Un-ignore it, or stop calling it their report of record.** (S)
- **#9 — THE PEEL IS LINEAR AND ITS PER-CALL COST LOSES.** 6–8 of 27–63 calls at ~600–700s each
  (4190–4636s vs a 3600s budget), 5/5 gated nights. Worth fixing only AFTER #1 — a cheaper peel over a
  poisoned oracle still lands on `drop-all`. (carried, M, **deprioritized**)
- **#10 — ADDING A PROP TO A COMPONENT IS A TWO-SITE EDIT.** `rg` the props interface AND every call site
  in one pass; `npx eslint` does NOT type-check. (open, confirmed drop cause)
- **#11 — STRANDED `refs/nightly-pending/` STILL 9** and `ls .gitattributes` → **still NONE**. Create it
  with `merge=union` for `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`,
  `restore-queue.ndjson`. Local checkout runs behind `origin/master` at lane time — fetch before the
  salvage commit. (carried, M)
- **#12 — `translations/*.js` IS A MULTI-LANE HOTSPOT AND LAST WRITE WINS.** A "vanished" i18n string is
  usually never-applied, not gate-eaten — **`git diff` it before re-fixing.** `AcademyMap.tsx`'s
  eslint-clean 2-line `unoptimized` removal is now **uncommitted 18 consecutive nights.** (carried, S)
- **Brief hygiene:** LCP top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in
  the collector, not the lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate
  non-English word lists (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST
  AGGREGATE (42803) · Supabase advisor warnings go stale, confirm vs `pg_indexes` · **grep for the helper
  before proposing to build it** (`ls scripts/nightly/lib scripts/nightly/tools`) · only count errors in a
  log whose run reached its gate.

## Open watches (carry forward)
- **#1 + #2 + #3 + #4 explain all 39 days of zero code. Nothing else matters until they land.**
- **Spend cap is now a live risk, not a hypothetical** — 11-09 lost the whole night at 01:16. A pre-lane
  budget probe + `run-aborted-<date>.md` artifact covers it.
- **Replay the NEXT-oldest salvage stamp nightly** as lane 01's first act — the only mechanism turning
  dropped work back into shippable. Oldest remaining: `20261029-010003`.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **23+ nights**. 6 files + a gating
  condition + a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) —
  still blocking lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`). **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not
  features. **MP CLS 0.92+** (socket `connecting→lobby` swap) — fix = a `RoomListView` skeleton; human queue.
- **Human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.

## Specialized Skills (maintained by lane 7)
> Figures come from `lane N — kept M authored file(s)`, positional over a nightly-varying set — best-effort
> attribution, not fact (avoid-#7). No lane shipped this window, so rows reflect scope discipline only.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 5/5; **scope clamp worked: 32/37 → 1/4/3**. Keep the salvage replay as its first act |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 5/5, exactly 2 files every night — the best-scoped lane in the loop |
| 03 engagement | `frontend-design` | 5/5, 1–3 files (11-11: 7 — watch it); never a named gate offender |
| 04 competitor | `humanizer`, `game-designer` | ran 11-08 only (kept 4); in-prompt scope clamp held |
| 05 landing | `frontend-design`, `impeccable` | 5/5, 2–5 files; design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | — | **lane DROPPED 10-31 (`a6f57e90d`)**, SEO via Growth Radar. Row kept only so no one re-adds it |
| 07 self-learn | none — prompt-only | ran 11-06/11-07. **Its 10-23 gate fix is still unshipped (Headline 2).** Must emit patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | ran 11-05 + 11-10 (1–2 files); blocked on AdSense approval, not skills |
| 09 monetization | `frontend-design` | ran 5/5 and **never produced the 11-07 founder "trial for unity" ask** — name it in the prompt. Never the coin economy |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | ran 11-07 + 11-08 (kept 2, 7) — most active in 3 windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 5/5, 1–5 files; blocked on the cookie overlay; cap its screenshot output |
| 12 telemetry | none — prompt-only | ran 11-05, 11-10, 11-11 (1–3 files) |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (108 d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
