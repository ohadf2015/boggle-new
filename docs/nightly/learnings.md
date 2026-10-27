# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-10-21..10-27. 7 scheduled nights. Lanes ran on 7. CODE SHIPPED ON 0.**
>
> | Night | Lanes | Gate | Code files DROPPED | What reached master |
> |---|---|---|---|---|
> | 10-21 | 9 | FAIL → bisect GAVE UP 14:17 (7/31 calls, 4514/3600s) | **19** | `c2712f82a` — 14 docs |
> | 10-22 | 7 | FAIL → GAVE UP 04:45 (7/19, 4506s) | **8** | `412cde5b0` — 14 docs |
> | 10-23 | 8 | FAIL → GAVE UP 05:06 (7/23, 4153s) | **10** | `469aaed99` — 16 docs |
> | 10-24 | 9 | FAIL → GAVE UP 14:11 (6/**61**, 3626s) | **34** | `2453cd95a` — 17 docs |
> | 10-25 | 8 | FAIL → GAVE UP 03:57 (8/29, 4504s) | **18** | `131c16452` — 15 docs |
> | 10-26 | 7 | FAIL 08:32, docs-only (no bisect) | **11** | `4d8f6402e` — 11 docs (`git show --stat`: zero code) |
> | 10-27 | 7 | pending | — | in flight |
>
> **100 code files dropped in 6 nights. 27 consecutive days of zero nightly code on master.** Every
> `fix(`/`feat(` in `git log --since="14 days ago"` is founder or company-brain work (10-26 alone has ~30 —
> all founder). Verify a ship with `git show --stat <sha>` — **never** with `isolated-shipped <sha>`, which
> printed on 10-23/24/25 for docs-only commits, and **never** with `kept N authored file(s)`.

> ## 🔴 HEADLINE — THE GATE'S OWN REPAIR IS CATEGORICALLY UNSHIPPABLE BY THE LOOP. **FOUNDER ACTION REQUIRED.**
> Last night's lane 7 wrote `build:i18n` into the four tsc chains of `scripts/nightly/lib/gate-isolated.sh`
> and declared it shipped. It was not. **`scripts/` is code, so the docs-only salvage reverted it** —
> the exact failure it was written to prevent. Proof, all three legs:
> 1. `rg -n 'build:i18n' scripts/nightly/lib/gate-isolated.sh` → **no match on master.** Lines 142/160/173/203
>    still read `npm run build:schemas && npx --no-install tsc --noEmit`.
> 2. The edit survives only as a backup: `salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh`
>    (`rg -l build:i18n ~/logs/lexi-nightly/salvaged-code-*` hits that one path and nothing else).
> 3. `git log --oneline -- scripts/nightly/lib/gate-isolated.sh` top entry is `743f71b6fc`, pre-dating 10-23.
>
> So the TS2307 never stopped. `rg -Nc TS2307 <log>` per night: **10-21 → 12, 10-22 → 11, 10-23 → 13,
> 10-24 → 10, 10-25 → 11, 10-26 → 4.** All four on 10-26 are
> `app/[locale]/layout.tsx(4,31): error TS2307: Cannot find module '@/lib/i18n/messagesManifest.json'`.
> `layout.tsx` is authored by no lane → `all N gate-failing file(s) are non-authored` → `unattributable gate
> failure` → `docs-only salvage`. **Every tier, every night, by construction.**
>
> **AND: last night's "verify the oracle is green" check was a FALSE NEGATIVE of my own making.** The
> handed-down command was `rg 'TS2307 .*messagesManifest'` — a *space* after TS2307, where the real output
> has a *colon*. It returned 0 on all 7 logs and read as "fix held". This is pitfall #4 (silent failure) and
> the `✓`→`✔` glyph lesson, committed by this lane. **Grep the error CODE alone (`rg -c TS2307`), never a
> code plus prose.**
>
> **THE FIX (founder, S, 5 min — the loop cannot do this itself):**
> ```bash
> cd ~/git/boggle-new
> cp ~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh \
>    scripts/nightly/lib/gate-isolated.sh
> bash -n scripts/nightly/lib/gate-isolated.sh && git add -A scripts/nightly && \
>   git commit -m 'fix(nightly): gate typecheck chains run build:i18n (messagesManifest TS2307)'
> ```
> Then **add `scripts/nightly/**` to the salvage keep-set** alongside `docs/` (`scripts/nightly/run.sh`,
> near the `docs-only` keep logic at ~:1179). Same rationale as `docs/`: outside `fe-next/`, cannot affect
> the app's lint/type/test/build verdict — so it is gate-neutral by definition. Without this, every future
> loop self-repair is reverted on the night it is written.

> **HEADLINE 2 — `build:i18n` IS SAFE IN THE GATE WORKTREE (settled, do not re-litigate).** `tsx
> scripts/build-i18n-assets.ts` (`package.json:15`), standalone, no dependency on `build:schemas`. Inputs
> (`translations/<lang>.js`, `i18n/normalizeMessages.ts`, `lib/i18n/landingNamespaces.ts`) are all tracked →
> present in any checkout. `mkdirSync(..., {recursive:true})` at lines 53–54. Both outputs (`public/i18n/`,
> `lib/i18n/messagesManifest.json`) are gitignored → cannot dirty the tracked set. `tsx` resolves from the
> CoW-cloned `node_modules`. (Line 833 is the `test:backend`/`test:frontend` chain — adding it there fixes nothing.)

> **HEADLINE 3 — A ZERO-CODE SHIP IS STILL REPORTED AS SUCCESS.** Six commits of proof in this window alone.
> `N authored CODE files > 0 and 0 code files committed` must be a loud **ERROR** in the Telegram card with
> the dropped-path list and the salvage stamp. Until it is, every dropped night reads as a good one — which
> is exactly how this bug survived two full windows.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (**DELETED 09-08**), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/
  `word-vault` (DELETED 07-06). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`,
  `?mode=cards`), `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** (MP-rotation pick
  only) — its report URL 404s by design; use `/en/multiplayer/`.
- **The lane scheduler skipping lanes is BY DESIGN** (`run.sh:421`). 10-27 skipped `10-dictionary`,
  `04-competitor`, `08-adsense` as zero-signal. `NIGHTLY_SCHEDULER=0` restores all 12.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **Write all locale translations FIRST** — **`ru` is a live 6th locale**. `file-cap=8` is armed in the
  time-guard line but NOT enforced on the keep path.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still ends 2026-07-26 — 93 days, 112 lines total.**
  Sixteenth consecutive window at 0 across `night:*`, `polish:*`, `idea:*`, `reddit:*`, `mode:*`.
  **The inbound Telegram leg is dead. Stop adding buttons; never gate a lane on a vote.** Outbound sends fine.
- The **player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes are healthy; the gate is the only bottleneck.** 7/7 nights every selected lane finished `rc=0`.
  10-27 ran lanes 1–7 in **77 minutes total** (01:00 → 02:17), 3–16 min each — the fastest night on record.
  No `exit 124`, no idle-kill, 7 nights running. **Stop tuning lane prompts for reliability.**
- **The Mandatory-Minimum-Artifact floor holds 7/7**, including every dropped night. `docs/nightly/artifacts/`
  is the only output never lost. Keep it first in every prompt.
- **Recoverable salvage works mechanically.** All 6 dropped nights have a backup + a working
  `restore-salvaged-code.sh <stamp>`. It is how tonight's headline was proven. **But nobody replays it** —
  and `salvaged-code-20261024-010154` holds **34 files**, the largest unshipped set.
- **Per-tier gate escalation localizes without wedging**, and the bisect-budget guard correctly stops the
  infinite loop. **The machinery is sound; its oracle is poisoned.** Repair the oracle, not the loop.
- **Preflight divergence → isolated ship** stays validated (7/7 reached lanes, founder WIP untouched).
  No `not on master` abort in this window — the 10-19/10-20 failure mode did not recur. Do not re-litigate.
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor
  proxy · try/catch on async generation · `initial={false}` on above-fold Framer entrances · `DirectionalIcon`
  NAMED import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET · `priority={false}` on
  Suspense-fallback images · `neo-*` tokens only · a Next `app/**/route.ts` exports ONLY handlers + route config.

## What to avoid (failed this week)
- **#1 — THE LOOP CANNOT SHIP ITS OWN REPAIR; `scripts/` IS DROPPED AS CODE.** Headline 1. Cost: the
  `build:i18n` fix lost on the night it was written, then 3 more dropped nights believing it had landed.
  **Every lane-7 infra fix must go in the loop-improvements doc as a copy-pasteable patch, not an edit.** (open, FOUNDER)
- **#2 — THE GATE'S FRESH-CHECKOUT TYPECHECK STILL LACKS `build:i18n`.** 61 TS2307 lines across 6 logs.
  Root cause of all 6 drops. Fix is one `cp` from the 10-23 salvage (Headline 1). (open, FOUNDER, S)
- **#3 — VERIFYING A FIX WITH A PROSE-MATCHING GREP IS A FALSE NEGATIVE.** `rg 'TS2307 .*messagesManifest'`
  (space) vs `TS2307: Cannot find module` (colon) → 0 hits, read as green, cost a whole window.
  **Match the error CODE alone.** Same class as the `✓`→`✔` break. (new, carried into every lane)
- **#4 — A ZERO-CODE SHIP IS REPORTED AS SUCCESS.** Headline 3, now 6 commits of proof. (open, carried 3 windows, S)
- **#5 — THE PEEL LOOP LEARNS NOTHING FROM A REPEATED ERROR SET.** 10-24 burned **61 minutes on 6 of 61**
  planned gate calls, every tier printing the identical TS2307. **Abort when attempt N's error set is no
  smaller than N−1's; cap at 3.** Would have saved ~5 hours across this window. (open, carried, S)
- **#6 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID.** `lane N` is
  positional over the *selected* set, which changes nightly with the scheduler — so 10-26's "lane 6" and
  10-27's "lane 6" are different lanes. Any per-lane stat read off these lines is wrong twice over.
  **Print `lane=<name> kept=<n> code=<n>`.** (open, carried, S, `run.sh`)
- **#7 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Every `### Lane N` section lanes append
  in STEP 6 is never committed; only `artifacts/`, `ideas/`, `loop-improvements/` and the ndjson ledgers
  ship. The 7 report files this lane reads exist **only on this machine**. **Un-ignore it, or stop telling
  lanes it is their report of record.** (open, carried, S)
- **#8 — ADDING A PROP TO A COMPONENT IS A TWO-SITE EDIT.** `WheelRushView.tsx:840` → `MyWordsChips`
  TS2322 dropped the whole 10-22 set. **`rg` the props interface AND every call site in one pass.
  `npx eslint` does NOT type-check.** (open, confirmed drop cause)
- **#9 — Stranded `refs/nightly-pending/` is STILL 2026-08-03, -08-06, -08-28** — ~85 nights, `cherry-pick/push
  failed` 7/7. **No root `.gitattributes`.** Create it with `merge=union` for `docs/nightly/impact-ledger.ndjson`,
  `mode-readiness.md`, `perf-baseline.json`. Oldest open item. (M)
- **Brief hygiene:** stale-source warnings recur nightly (`collector restore failed → stale fallback`). LCP
  top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in the collector, not the
  lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate non-English word lists
  (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST AGGREGATE (42803) · Supabase
  advisor warnings go stale, confirm against `pg_indexes` · **grep for the helper before proposing to build
  it** (`ls scripts/nightly/lib scripts/nightly/tools`) · MCP scoping works, do not escalate — `(none)`
  appears only for prompt-only lanes, by design.

## Open watches (carry forward)
- **#1 + #2 together explain all 27 days of zero code. Nothing else in this list matters until they land.**
- **Nobody replays the salvage.** 6 stamps on disk (`20261021`–`20261026`), 100 files, script ready.
  **Lane 01 replays the newest stamp as its first act** once #2 lands — newest is `20261026-010726` (11 files);
  largest is `20261024-010154` (34).
- **Spend-cap / abort leaves no artifact.** A pre-lane probe writing `docs/nightly/artifacts/run-aborted-<date>.md`
  + a Telegram card covers this and the `not on master` abort.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **10+ nights**. 6 files + a gating
  condition + a reconnect test. **Never fits a 15-min lane. Human queue. Stop re-auditing nightly.**
- **agent-browser cannot dismiss the cookie-consent overlay** (dialog outside the a11y snapshot tree) —
  still blocking lane 11 visual QA. Longest-running open item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1` + 9 more, 0 non-test call sites
  (`rg "n\('exp-" fe-next`). **Brain Drill has no traffic** (`drill_completed` 0) — discoverability, not
  features. **MP CLS 0.92+** (socket `connecting→lobby` DOM swap) — fix = a `RoomListView` skeleton; human queue.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.
- **`/es/juego-de-palabras-multijugador`** — 23.5k impr, ~0.4% CTR, 3 title rewrites moved nothing. Not a meta problem. **Lane 06: stop rewriting its title.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 7/7; fastest coder lane (10-27: 16 min, 4 files). Most reliable — give it the salvage replay |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 7/7; **10-27 kept 9 files, highest of any lane** — watch its blast radius; still burns time on cross-tenant LCP noise |
| 03 engagement | `frontend-design` | 7/7, lowest volume (1–3 files), 3–20 min — never a named gate offender |
| 04 competitor | `humanizer`, `game-designer` | skipped 10-27 (zero-signal); **kept 18 on 10-17** — needs a hard in-prompt scope clamp, not a new skill |
| 05 landing | `frontend-design`, `impeccable` | 7/7, 2 files/night in this window (down from 15–19 min sprawl); design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | `seo-daily` | 6/7 — mandatory when it runs; `docs/seo-daily/2026-10-26.md` (124 lines) is its only output that ever ships |
| 07 self-learn | none — prompt-only | 7/7. **Its 10-23 gate fix was dropped by the gate (Headline 1).** It must emit patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | skipped 3/7 — blocked on AdSense approval, not on skills |
| 09 monetization | `frontend-design` | ran 10-26 (23-line artifact); 2/7 — scheduler reads it as low-signal |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | skipped 10-27; ~1 output in 3 windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | ran 10-26 (3-line artifact — blocked on the cookie overlay); cap its screenshot output |
| 12 telemetry | none — prompt-only | not selected this window |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (100+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
