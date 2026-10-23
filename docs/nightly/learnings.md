# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-10-17..10-23. 7 scheduled nights. Lanes ran on 5. CODE SHIPPED ON 0.**
>
> | Night | Lanes | Gate | What actually reached master |
> |---|---|---|---|
> | 10-17 | 8+ | FAIL 03:12 → ship 04:29 | `d375457709` — 12 files, **all `docs/`** |
> | 10-18 | 8+ | FAIL, 10 peel attempts 02:23→04:01 | `40dddbcd1` — 16 files, **ZERO code** |
> | 10-19 + 10-20 | **0** | — | `preflight ABORT — not on master (fix/sentry-2026-10-18)`, twice, 24h apart |
> | 10-21 | 9+ | FAIL, peel 12:40→14:17+ | `c2712f82a` — **1 line of `restore-queue.ndjson`** |
> | 10-22 | 7 | **FAIL**, peel 03:08→04:45 (**BISECT BUDGET EXHAUSTED**, 7/19 calls, 4506/3600s) | `412cde5b0` — 14 files, **ZERO code**, 8 code files salvaged to disk |
> | 10-23 | 8 selected (4 skipped) | pending | in flight |
>
> **21 days, zero nightly CODE on master.** Every `fix(`/`feat(` in `git log --since="14 days ago"` is founder
> or company-brain work. Verify a ship with `git show --stat <sha>` — **never** with `isolated-shipped <sha>`
> and **never** with `kept N authored file(s)` (see #5).

> ## ✅ HEADLINE — `build:i18n` WAS MISSING FROM THE GATE FOR 6 NIGHTS. **FIXED TONIGHT (10-23, lane 7).**
> All four tsc chains in `scripts/nightly/lib/gate-isolated.sh` now run
> `npm run build:schemas && npm run build:i18n && npx --no-install tsc --noEmit` (lines 142, 160, 173, 203;
> `bash -n` clean). **Tomorrow's lane 7 must verify the oracle actually came up green** — grep the run log for
> `TS2307 .*messagesManifest`; zero matches means the fix held, any match means it did not.
> The evidence it was built on:
> Last night's log is the proof, not a theory:
> ```
> app/[locale]/layout.tsx(4,31): error TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'
> ```
> printed **11 times** (lines 1521, 1551, 1562, 1575, 1586, 1595, 1604, 1613, 1624, 1633, 1642) — once per
> gate tier, in every clean-HEAD worktree. `layout.tsx` is **not authored by any lane**, so the parser logs
> `all N gate-failing file(s) are non-authored → re-gating without lint` → still red → `unattributable gate
> failure` → `docs-only salvage`. **Every tier, every night, by construction.**
>
> **NEW AND DECISIVE:** at log line **1614**, directly under the TS2307, sat a genuine lane bug —
> `components/multiplayer/WheelRushView.tsx(840,72): error TS2322: Property 'prefersReduced' does not exist
> on type 'MyWordsChipsProps'` (exactly pitfall #7: a prop added at one site, not the other). **The gate found
> the real offender and could not act on it**, because the TS2307 above it made the set unattributable.
> So correct last week's framing: fixing `build:i18n` would **not** have shipped 10-22's code — the code was
> genuinely broken — but it would have peeled **one named file in ~17 min** instead of burning 97 minutes to
> `BISECT BUDGET EXHAUSTED` and dropping all 8.
>
> **Why it is safe inside the gate's clean-HEAD worktree** (the one open risk, now closed by static evidence —
> the full worktree dry-run blew the 15-min lane budget on the `node_modules` CoW clone, so this is how it was
> settled): `build:i18n` is `tsx scripts/build-i18n-assets.ts` (`package.json:15`), standalone, no dependency
> on `build:schemas`. Its only inputs are `translations/<lang>.js`, `i18n/normalizeMessages.ts` and
> `lib/i18n/landingNamespaces.ts` — **all tracked**, so present in any checkout. It `mkdirSync(...,
> {recursive:true})` both output dirs at lines 53–54, so no missing-dir throw on a fresh tree. Both outputs
> (`public/i18n/`, `lib/i18n/messagesManifest.json`) are gitignored, so it cannot dirty the gate's tracked set.
> `tsx` resolves from the CoW-cloned `node_modules`, same as `tsc`. (Line 833 is the
> `test:backend`/`test:frontend` chain, not a `tsc` chain — adding it there fixes nothing.)

> **HEADLINE 2 — A NON-MASTER HEAD KILLS THE WHOLE RUN AND NOTHING ESCALATES.** 10-19 and 10-20 aborted
> identically at 01:00:0x — `not on master (on fix/sentry-2026-10-18) and auto-recover unsafe` — logs 10 and
> 20 lines long, each "requested a timed retry in 180 min" that **never produced a second log**. The closed
> divergence item covers *diverged master*, not *checked out elsewhere*. The isolated gate already builds its
> own clean-HEAD worktree; it does not need the founder checkout on master.
> **Fix: when HEAD is a non-master branch, run the lanes from a worktree at `origin/master` and leave the
> founder checkout byte-identical** (`scripts/nightly/preflight.sh`) — same move that fixed divergence.
> Secondary: confirm the 180-min retry is actually scheduled, because it isn't firing.

> **HEADLINE 3 — A ZERO-CODE SHIP IS STILL REPORTED AS SUCCESS.** Three commits of proof now (10-18 16 docs,
> 10-21 1 ndjson line, 10-22 14 docs). **N authored CODE files > 0 and 0 code files committed must be a loud
> ERROR in the Telegram card, with the dropped-path list.** Otherwise every dropped night reads as a good one.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/
  `word-vault` (DELETED 07-06). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`,
  `?mode=cards`), `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** (MP-rotation pick
  only) — its report URL 404s by design; use `/en/multiplayer/`.
- **The lane scheduler skipping lanes is BY DESIGN** (`run.sh:421`). 10-23 skipped `06-seo`,
  `12-telemetry-coverage`, `04-competitor`, `08-adsense` as zero-signal. `NIGHTLY_SCHEDULER=0` restores all 12.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **`file-cap=8` is armed in the time-guard line but NOT enforced on the keep path.** Write all locale
  translations FIRST — **`ru` is a live 6th locale**.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still ends 2026-07-26 — 89 days, 112 lines total.**
  Fifteenth consecutive window at 0 across `night:*`, `polish:*`, `idea:*`, `reddit:*`, `mode:*`.
  **The inbound Telegram leg is dead. Stop adding buttons; never gate a lane on a vote.** Outbound sends fine.
- The **player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes are healthy; the gate is the bottleneck.** 10-22: 7 lanes, `rc=0` on all 7. 10-23: 5 lanes done by
  02:05, all `rc=0`, 18–40 turns, 5.9–17.8 min each. No `exit 124`, no idle-kill, in 12 of 12 lane-runs.
  **Stop tuning lane prompts for reliability. They are not failing.**
- **The Mandatory-Minimum-Artifact floor holds 5/5 lane-nights**, including every dropped one.
  `docs/nightly/artifacts/lane-*` is the only output never lost. Keep it first in every prompt.
- **Recoverable salvage.** 10-22 backed up 8 code files → `salvaged-code-20261022-010002`;
  `restore-salvaged-code.sh <stamp>` replays them. A dropped night is deferred, not lost — but nobody replays.
- **Per-tier gate escalation localizes without wedging.** lint→typecheck→typeonly→1-file all walk cleanly, and
  the bisect-budget guard (`7/19 gate calls, 4506/3600s → GAVE UP`) correctly stopped an infinite loop.
  **The machinery is sound; its oracle is poisoned.** Repair the oracle, not the loop.
- **Preflight divergence → isolated ship** stays validated (10-17/18/21/22 all reached lanes, founder WIP
  untouched). Do not re-litigate. Its sibling case is Headline 2.
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor
  proxy · try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon`
  NAMED import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET · `priority={false}` on
  Suspense-fallback images · `neo-*` tokens only · a Next `app/**/route.ts` exports ONLY handlers + route
  config (a stray export fails `next build`, not `tsc`).

## What to avoid (failed this week)
- **#1 — THE GATE'S FRESH-CHECKOUT TYPECHECK WAS MISSING `build:i18n`.** Headline 1. Cost: 6 dropped nights,
  every false "offender" the bisect named, 97 wasted minutes on 10-22 alone.
  (**SHIPPED 10-23 by lane 7** — 4 sites in `gate-isolated.sh`; verify the oracle is green tomorrow)
- **#2 — A NON-MASTER HEAD KILLS THE RUN OUTRIGHT.** Headline 2. Cost: 10-19 + 10-20, zero output. (open, S/M)
- **#3 — A ZERO-CODE SHIP IS REPORTED AS SUCCESS.** Headline 3, 3 commits of proof. (open, carried, S)
- **#4 — THE PEEL LOOP LEARNS NOTHING FROM A REPEATED ERROR SET.** 10-22: 8 single-file typecheck tiers
  03:44→04:45, **every one printing the identical TS2307**, then budget-exhausted. A *shrink* check would
  have caught it 80 min earlier. **Abort when attempt N's error set is no smaller than N-1's; cap at 3.** (S)
- **#5 — `kept N authored file(s)` IS NOT A CODE COUNT, AND `lane N` IS NOT A LANE ID.** 10-23 printed
  `lane 1 — kept 41` and `lane 2 — kept 36`; lane 2 is `11-mode-qa` and most of its 36 are **PNG screenshots**
  under `docs/nightly/mode-qa/2026-10-23/`. Meanwhile `git status --porcelain` shows 14 entries. Any per-lane
  stat read off these lines is **wrong twice over** (wrong lane, wrong denominator). **Print the lane NAME and
  a code-file subcount: `lane=<name> kept=<n> code=<n>`.** (new, S, `run.sh`)
- **#6 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Every `### Lane N` section every lane
  appends in STEP 6 is **never committed**; only `artifacts/`, `ideas/`, `loop-improvements/` and the ndjson
  ledgers ship. A machine wipe erases the history lane 7 reasons from. **Un-ignore it, or stop telling lanes
  it is their report of record** — today it is both the primary output and the least durable. (open, S)
- **#7 — ADDING A PROP TO A COMPONENT IS A TWO-SITE EDIT.** Now with a live casualty: `WheelRushView.tsx:840`
  passed `prefersReduced` to `MyWordsChips`, whose props type never got it → TS2322 → the whole 10-22 code set
  dropped. **`rg` the component's props interface AND every call site in one pass. `npx eslint` does NOT
  type-check.** (open, promoted from prompt-only to a confirmed drop cause)
- **#8 — Stranded `refs/nightly-pending/` is STILL 2026-08-03, -08-06, -08-28** — ~81 nights,
  `cherry-pick/push failed` 7 of 7. **No root `.gitattributes` exists.** Create it with `merge=union` for
  `docs/nightly/impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`. Oldest open item. (M)
- **Brief hygiene:** 10-23 logged `collector restore failed/timed out → stale fallback`, `stale: impact,
  restore, search, supabase`, `supabase=346·stale` — **4 of 10 sources stale**, including `restore=12`, the
  salvage queue lanes are meant to replay. Also: LCP top-5 is cross-tenant PostHog contamination
  (imposketch.io) — **filter `$host` in the collector, not the lane** · `reddit-fetch search` returns garbage,
  RSS works · subagents fabricate non-English word lists (spot-check 5/locale) · a bare `count` in
  supabase-js select is a PostgREST AGGREGATE (42803) · Supabase advisor warnings go stale, confirm against
  `pg_indexes`.
- **Grep for the helper before proposing to build it.** `ls scripts/nightly/lib scripts/nightly/tools` first.
- **MCP scoping works — do not escalate.** `(none)` appears only for prompt-only lanes, by design.

## Open watches (carry forward)
- **#1 and #2 together explain 6 of 7 nights of zero code. Fix those before anything else in this list.**
- **Nobody replays the salvage.** 6 nights of dropped code on disk, `restore-salvaged-code.sh` ready, and the
  brief's own `restore=12` signal is **stale**. **Lane 01 replays the newest unshipped stamp as its first act**
  once #1 lands — and the newest stamp is `20261022-010002` (8 files, incl. the known WheelRushView fix).
- **Spend-cap abort leaves no artifact** (10-13/10-14, unguarded). A pre-lane probe writing
  `docs/nightly/artifacts/run-aborted-<date>.md` + a card covers this AND Headline 2's abort.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **6+ nights**. 6 files + a gating
  condition + a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **No per-lane ship signal.** Emit `files_shipped=<n> lane=<name>` AFTER the gate (see #5).
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) —
  still blocking lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`). **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not
  features. **MP CLS 0.92+** (socket `connecting→lobby` DOM swap) — fix = a `RoomListView` skeleton; human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.
- **`/es/juego-de-palabras-multijugador`** — 23.5k impr, ~0.4% CTR, 3 title rewrites moved nothing. Not a meta
  problem. **Lane 06: stop rewriting its title.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 5/5 lane-nights; 10-23 fixed `claimOnce` shared-Redis in 10 min/30 turns. Most reliable lane — give it the salvage replay |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 5/5; 11–13 min/night, still burning ~10 min on the brief's cross-tenant LCP noise |
| 03 engagement | `frontend-design` | 5/5, lowest volume (1–3 files), 7.7–14 min — consistent, never a gate offender |
| 04 competitor | `humanizer`, `game-designer` | skipped 10-23 (zero-signal); **kept 18 on 10-17** — needs a hard in-prompt scope clamp, not a new skill |
| 05 landing | `frontend-design`, `impeccable` | 5/5, 15–19 min (longest coder lane); design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | `seo-daily` | 4/6 — skipped 10-23 as zero-signal; mandatory when it runs |
| 07 self-learn | none — prompt-only | 5/7; its 10-12 preflight fix validated. Headline 1 is now its third-window carry — escalate, don't re-describe |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/6, skipped 10-23 — blocked on AdSense approval, not on skills |
| 09 monetization | `frontend-design` | 2/6; its 37-line 10-22 artifact was its best output |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | ran 10-18 only — one output in 2 windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | ran 10-18/22/23; 10-23 was 17.8 min/40 turns (longest lane) and 36 "kept" files are mostly PNGs — cap its screenshot output |
| 12 telemetry | none — prompt-only | ran 10-22 (19 min, 49 turns, 1 file); skipped 10-23 |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (96+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
