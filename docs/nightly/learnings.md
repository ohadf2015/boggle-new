# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-10-11..10-17. 7 scheduled nights. Lanes ran on 4. CODE SHIPPED ON 0.**
>
> | Night | Lanes | authored | Gate | Outcome |
> |---|---|---|---|---|
> | 10-11 | **0** | 0 | — | `preflight ABORT — diverged` (clean tree + unpushed code) |
> | 10-12 | 9 | 21+ | — | lanes ran; 7 lane-sections in report |
> | 10-13 | **0** | 0 | — | `MONTHLY SPEND CAP (rc=76)` @10:16 → circuit breaker |
> | 10-14 | **0** | 0 | — | `MONTHLY SPEND CAP (rc=76)` @01:06 → circuit breaker |
> | 10-15 | 9 | 27 | **FAIL @02:51** → baseline re-gate @02:54 | no ship line in log |
> | 10-16 | 9 | 21 | **FAIL ×3 tiers → 03:41** | **CODE DROPPED**, docs-only |
> | 10-17 | 5+ | 29+ (lane 4 alone kept **18**) | pending | in flight |
>
> **No `fix(nightly)`/loop commit on master in 9 days.** Every commit `243dc74b5..9a55227dd` is founder or
> company-brain work. Verify a ship with `git log --grep="autonomous improvement loop"`, never with
> `preflight: OK — repo @ <sha>` (that is the BASE sha) and never with `kept N authored file(s)`.

> ## 🔴 HEADLINE — THE ISOLATED GATE'S TYPECHECK TIER IS STRUCTURALLY RED. FIX THIS FIRST.
> 10-16 final error, verbatim:
> `app/[locale]/layout.tsx(4,31): error TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'`
> That file is **gitignored** (`fe-next/.gitignore:133`) and **generated** by `scripts/build-i18n-assets.ts`
> (`npm run build:i18n`). The gate's clean-HEAD worktree runs only `npm run build:schemas`
> (`scripts/nightly/lib/gate-isolated.sh:142,160,173`), so `tsc --noEmit` **cannot resolve it in any fresh
> checkout** — regardless of what the lanes wrote. The import has been in `app/[locale]/layout.tsx` since
> `c533d6211` (2026-08-07). Consequences, all observed on 10-16:
> - every `typecheck`/`typeonly` tier returns FAIL → "unattributable gate failure"
> - `nightly_bisect_offenders` then "named an offender" that is innocent (03:19:09)
> - drop-and-re-gate concluded "not a clean baseline-poison" and **dropped 21 real files**
> **Fix (one word, 3 sites): `npm run build:schemas && npm run build:i18n && npx --no-install tsc --noEmit`**
> at `gate-isolated.sh:142`, `:160`, `:173`. `build:prebuild` already chains exactly these two (package.json:11).
> This single edit plausibly un-drops a whole night's code. Nothing else in this file matters more.

> **HEADLINE 2 — THE SPEND CAP KILLED TWO NIGHTS AND NOTHING WARNED BEFORE 01:00.** 10-13 and 10-14 both
> died at lane 1 on `rc=76` with zero lanes, zero files, **zero `docs/nightly/reports/` section**. That is
> Pitfalls Class 4 (silent no-op) at the run level. The circuit breaker is correct; the *blindness* is not.
> **Fix: a pre-lane spend probe that writes `docs/nightly/artifacts/run-aborted-<date>.md` + sends the
> Telegram card.** (This is item #6 from last week, now with 2 more nights of cost.)

> **HEADLINE 3 — #1 FROM LAST WEEK IS CONFIRMED FIXED. CLOSE IT.** 10-13's log shows the new path firing:
> `preflight: diverged & local-only commits touch non-docs paths — leaving local alone, isolated ship
> handles it`. No abort. 10-16 and 10-17 also reached lanes with unpushed non-docs commits. Lane 7's
> 10-12 `preflight.sh` change works. Do not re-litigate it.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible). HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/
  `word-vault` (DELETED 07-06). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`,
  `?mode=cards`), `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** (MP-rotation pick
  only) — its report URL 404s by design; use `/en/multiplayer/`.
- **The lane scheduler skipping lanes is BY DESIGN** (`run.sh:421`). `NIGHTLY_SCHEDULER=0` restores all 12.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **The guard enforces `file-cap=8` per lane** (confirmed in 10-17's time-guard line). **10-17 lane 4 kept
  18 files** — either the cap is not enforced on that lane's path or docs are exempt. A 18-file lane is the
  exact shape that poisons a gate. Write all locale translations FIRST — **`ru` is a live 6th locale**.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 83 days.** Thirteenth
  consecutive window at 0 across `night:*`, `polish:*`, `idea:*`, `reddit:*`, `mode:*`. **The inbound
  Telegram leg is dead. Stop adding buttons; never gate a lane on a vote.** Outbound cards still send.
- The **player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Preflight divergence → isolated ship** (Headline 3). 10-13/15/16/17 all reached the lane phase with
  founder WIP left byte-identical. Validated ×4 — the single best infra change of the prior window.
- **Per-tier gate escalation DOES localize a failure** — 10-16 walked lint→typecheck→1-file re-gates
  without wedging. The machinery is sound; its oracle is poisoned (Headline 1). Repair the oracle, not the loop.
- **Recoverable salvage backup.** 10-16's 21 dropped files are on disk; `restore-salvaged-code.sh <stamp>`
  replays them. 10-15 lane 1 and 10-16 lane 1 both *used* it unprompted. A dropped night is a deferred night.
- **The Mandatory-Minimum-Artifact floor holds** — `docs/nightly/artifacts/lane-*` written on every
  lane-running night, including nights whose code was dropped.
- **Doctrine (unchanged, all still true):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not
  bare Capacitor proxy · try/catch on async generation · `initial={false}` on above-fold Framer entrances ·
  `DirectionalIcon` NAMED import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET ·
  `priority={false}` on Suspense-fallback images · no hardcoded colors, `neo-*` tokens only.

## What to avoid (failed this week)
- **#1 — THE GATE'S FRESH-CHECKOUT TYPECHECK IS MISSING `build:i18n`.** See Headline 1. Cost: 21 files on
  10-16 + every false "offender" the bisect has ever named. (open, **S-effort, 3 one-word edits**)
- **#2 — A SPEND-CAP ABORT LEAVES NO ARTIFACT AND NO ALERT.** 10-13, 10-14. (open, carried 3 windows, S)
- **#3 — A GATE "PASS" THAT SHIPS ZERO CODE IS STILL UNGUARDED.** Not observed this window only because no
  gate passed. **N>0 authored code files + 0 committed must be an ERROR with the excluded-path list.** (open, S)
- **#4 — ADDING A KEY TO AN INLINE-INFERRED OBJECT LITERAL IS A TWO-SITE EDIT.** `rg` a sibling key and
  edit every site in one pass. `npx eslint` does NOT type-check. (open, prompt-only)
- **#5 — THE GATE IS THE LONGEST PHASE AND HAS NO SHRINK CHECK.** 10-15: 02:51→02:54+. 10-16: **02:58→03:41,
  5 re-gates, ended dropping everything.** **Abort the peel loop when attempt N's error set is no smaller
  than N-1's.** With #1 fixed this mostly evaporates. (open, carried, S)
- **#6 — Stranded `refs/nightly-pending/` is STILL 2026-08-03, -08-06, -08-28** — ~75 nights,
  `cherry-pick/push failed` on 7 of 7. **Give `impact-ledger.ndjson`, `mode-readiness.md`,
  `perf-baseline.json` a `merge=union` driver in `.gitattributes`.** Oldest open item here. (M)
- **#7 — `supabase` + `sentry` MCP fail the boot probe** (10-12 both, 3 attempts). `npx` cold-boot under
  load hangs subagents. **Pin both to a local install.** (open, S/M)
- **#8 — stale preflight lock seen twice** (10-16 `pid=11512 age=86402s`, 10-17 `pid=25706 age=86402s`).
  Auto-cleared correctly, but an 86400s age means **the prior run never released it** — a run is dying
  without its trap firing. Watch. (new)
- **Brief hygiene, unchanged:** collector `supabase` stale-fallback on 7/7 nights · the LCP top-5 is
  cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in the collector, not the lane** ·
  `reddit-fetch search` returns garbage, the RSS feed path works · subagents fabricate non-English word
  lists (spot-check 5 real words/locale) · a bare `count` in supabase-js select is a PostgREST AGGREGATE
  (42803) · Supabase advisor warnings go stale — confirm against `pg_indexes`.
- **Grep for the helper before proposing to build it.** `ls scripts/nightly/lib scripts/nightly/test` first.

## Open watches (carry forward)
- **#1–#8 above are the live watches.** Do not re-close last window's preflight item (Headline 3 closed it).
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **4 nights**. 6 files + a gating
  condition + a TDD reconnect test. **Never fits a 15-min lane. Stop re-auditing it nightly — human queue.**
- **No per-lane ship signal.** `kept N` over-reports on every dropped night. **Emit `files_shipped=` per
  lane AFTER the gate.** (open, carried)
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) —
  blocks lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites (`rg "n\('exp-" fe-next`).
  **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not features.
  **MP CLS 0.92+** (socket `connecting→lobby` DOM swap) — fix = a `RoomListView` skeleton; human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit
  after ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.
- **`/es/juego-de-palabras-multijugador`** — 23.5k impr, ~0.4% CTR, 3 title rewrites moved nothing.
  **Not a meta problem. Lane 06: stop rewriting its title.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 4/4 lane-nights, kept 4·8·5·3; also self-served `restore-salvaged-code.sh` twice |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 4/4, kept 2·4·2·3; still burns ~10 min/night on the brief's cross-tenant LCP noise |
| 03 engagement | `frontend-design` | 4/4, kept 3·3·2·1 — consistent, low volume |
| 04 competitor | `humanizer`, `game-designer` | 4/4 but **kept 18 on 10-17** — over cap; needs a scope clamp, not a new skill |
| 05 landing | `frontend-design`, `impeccable` | 4/4, kept 2·3·2 — design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | `seo-daily` | 3/4, kept 1·1·3 — mandatory when it runs |
| 07 self-learn | none — prompt-only | 3/7 nights (10-12, 10-16, 10-17); its preflight fix shipped and is validated |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/4, kept 4·1 |
| 09 monetization | `frontend-design` | 2/4, kept 1·2 — prompt still too narrow |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 0/7 — scheduler-skipped every night, 2 windows running |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | scheduler-skipped most nights; carried blast MAJOR it cannot finish in 15 min |
| 12 telemetry | none — prompt-only | kept 7 files on 10-12 — prior window's biggest single-lane yield |

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
