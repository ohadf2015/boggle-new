# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-10-31..11-06. 7 scheduled nights. Lanes ran on 7. CODE SHIPPED ON 0.**
>
> | Night | Gate | Bisect | Code files DROPPED | What reached master |
> |---|---|---|---|---|
> | 10-31 | FAIL 03:09 | GAVE UP 04:18 (7/71, 4155s) | **39** | 16 docs |
> | 11-01 | FAIL 03:09 | GAVE UP 04:21 (8/77, 4306s) | **42** | 17 docs |
> | 11-02 | FAIL 12:38 | GAVE UP 13:46 (3/21, 4127s) | **14** | 17 docs |
> | 11-03 | FAIL 03:56 | GAVE UP 05:08 (8/35, 4330s) | **21** | 16 docs (`d1a65b7d2`) |
> | 11-04 | FAIL 03:56 | GAVE UP 04:57 (7/59, 3619s) | **33** | 15 docs (`fed97dcbd`) |
> | 11-05 | FAIL 04:00 | GAVE UP 05:18 (8/61, 4636s) | **34** | 13 docs (`5e3ff4bc9`) |
> | 11-06 | FAIL 03:24 | GAVE UP 04:55 (6/63, 4224s) | **35** | **NOTHING — see Headline 0** |
>
> **218 code files dropped in 7 nights. 35 consecutive days of zero nightly code on master.** Verify a ship
> with `git show --stat <sha>` — NEVER `isolated-shipped <sha>` or `kept N authored file(s)`. All of
> 5e3ff4bc9 fed97dcbd d1a65b7d2 are on `origin/master` (so the push path works) yet
> `git show --name-only --format='' <sha> | rg -c '^fe-next/'` → **0 code files on each**.

> ## 🔴 HEADLINE 0 — NEW: 11-06 SHIPPED **NOTHING**, NOT EVEN DOCS. THE ARTIFACT FLOOR IS NOT A FLOOR.
> The log printed `docs-only salvage — shipping ... (16 docs)` at 04:55:59. **No such commit exists
> anywhere:** `git log --all --oneline --grep="improvement loop 2026-11-06"` → **empty**. Those docs sit
> **uncommitted in the working tree** (`learnings.md`, `impact-ledger.ndjson`, `mode-readiness.md`,
> `perf-baseline.json`, `triage-queue.md` all modified). The salvage **log line prints independently of
> the commit succeeding**, so a failed commit reads as a successful docs ship. Fix: print the SHA created
> and fail loudly when `git rev-parse` finds none. **Never report the floor as "holds 7/7" off a log line
> — check `git log --all --grep` for the night's commit.**

> ## 🔴 HEADLINE 1 — ROOT CAUSE UNCHANGED AFTER 15 NIGHTS. ONE `cp`. **FOUNDER ACTION REQUIRED.**
> `rg -Nc TS2307` per night: **10-31 → 11, 11-01 → 12, 11-02 → 7, 11-03 → 11, 11-04 → 13, 11-05 → 11,
> 11-06 → 10.** On 11-06 all 10 are the same module: `TS2307: Cannot find module
> '@/lib/i18n/messagesManifest.json'`, failing `app/[locale]/layout.tsx` — authored by no lane →
> `unattributable gate failure` → `docs-only salvage`. **Every tier, every night, by construction.**
> The file is gitignored (`fe-next/.gitignore:133`), absent in the gate's fresh checkout, and the
> typecheck chain never generates it: `rg -c 'build:i18n' scripts/nightly/lib/gate-isolated.sh` →
> **still NO MATCH on master.**
> ```bash
> cd ~/git/boggle-new
> cp ~/logs/lexi-nightly/salvaged-code-20261023-010005/scripts/nightly/lib/gate-isolated.sh \
>    scripts/nightly/lib/gate-isolated.sh
> bash -n scripts/nightly/lib/gate-isolated.sh && git add -A scripts/nightly && \
>   git commit -m 'fix(nightly): gate typecheck chains run build:i18n (messagesManifest TS2307)'
> ```
> Backup **verified present 11-07** (58668B, Oct 23 03:20) — re-confirm with one `ls`. If it ever rotates
> away: **add `npm run build:i18n` to the gate's typecheck chain before `tsc`** in `gate-isolated.sh`
> (`build:i18n` = `tsx scripts/build-i18n-assets.ts`, `fe-next/package.json:15`; already inside
> `build:prebuild`:11, which the gate never calls). **Do not re-derive this. It is one command.**
> ⚠️ **A 0 in a TS2307 count on TONIGHT's log means the gate has not run yet** — lane 07 executes ~02:10,
> the gate ~03:30. Reading the in-flight log as "fixed" is a false green (cost: most of this window).

> ## 🔴 HEADLINE 2 — `scripts/` IS DROPPED AS CODE, SO THE LOOP CANNOT SHIP ITS OWN REPAIR.
> Add `scripts/nightly/**` to the salvage keep-set beside `docs/` (`scripts/nightly/run.sh`, near the
> `docs-only` keep logic ~:1179) — same rationale: outside `fe-next/`, so it cannot change the app's
> lint/type/test/build verdict. Until this lands, **every lane-7 infra fix must be emitted as a
> copy-pasteable patch in loop-improvements, never as an edit.**

> ## 🔴 HEADLINE 3 — THE PEEL IS LINEAR (2N−7); ITS PER-CALL COST IS WHAT LOSES.
> Planned calls = **2×(dropped files) − 7**, 7/7 nights (14→21, 21→35, 33→59, 34→61, 35→63, 39→71, 42→77).
> Binding constraint is per-call cost: `elapsed ÷ completed` = **~580–700s** (4224/6 on 11-06). 63 × 700s
> ≈ **12h vs a 3600s budget** → 3–8 calls, 7/7. Fix = **fewer calls AND a cheaper call**: per-lane sets
> (**8**, not 2N−7) + a tsc-only tier. Worthless until Headline 1 — a poisoned oracle fails per-lane too.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION
  growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
  HARD LINE: never touch coin amounts, ad-reward values, the coin economy, or payment logic.
- **2026-11-07 inbound: "Can we have trial for unity?"** → **lane 09 (monetization / edu upsell)** owns a
  trial offer; not a self-learn item. Carried here so it is not lost if lane 09 is skipped.
- **ADMIN-BETA TARGET LIST.** Never STEP-0 targets: `blast`/`blast/v2`, `crossword` (noindex-only),
  `shiritori` (DELETED 09-08), `word-tower` (public), `party`/`word-alchemy`/`word-forge`/`word-vault`
  (DELETED 07-06). **Admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`),
  `brain-drill`, `wheel-rush`.** `wheel-rush` has **no standalone route** — use `/en/multiplayer/`.
- **The lane scheduler skipping lanes is BY DESIGN** (`run.sh:421`). `NIGHTLY_SCHEDULER=0` restores all.
- **Lane 06-seo was DROPPED 10-31** (`a6f57e90d`) — SEO routes via Growth Radar. Never re-add it.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education angles, link a live MODE.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **Write all locale translations FIRST** — **`ru` is a live 6th locale**. `file-cap=8` is armed in the
  time-guard line but **NOT enforced on the keep path** (11-06: lane 1 kept 35).

## Telegram feedback (last 7 days)
- **CORRECTION — inbound Telegram is NOT dead. Inbound TEXT works; only BUTTONS are dead.** Newest ndjson
  line is `{"text":"Can we have trial for unity?"}` from `of201` with **no `callback_data`** — founder free
  text, arrived fine. **Buttons: ZERO callbacks; 41 files, 113 lines, last callback 2026-07-26 — 104 days.**
  **Stop adding buttons, never gate a lane on a vote — but DO read the newest ndjson lines for free text.**
- **Player** sentiment digest (`feedback/summary-*.md`) is a different, live signal — keep using it.

## What works (validated this week)
- **Lanes are healthy; the gate is the only bottleneck.** 7/7 nights every selected lane `rc=0`; no
  `exit 124`/idle-kill in 15 nights. 11-07 lanes 4 and 5 finished 02:02 and 02:10 (kept 4 and 3 files).
  **Stop tuning lane prompts for reliability — it is not the problem.**
- **Artifacts survive on DISK 7/7** (incl. 11-06, no commit) — but Headline 0: **on disk ≠ on master.**
- **THE SALVAGE REPLAY RUNS AND SELF-HEALS.** 11-06 lane 01 replayed `20261104-010003` — 33 files, 3-way
  merged, 0 skipped, eslint-clean on all 20 ts/tsx — and the merge resolved the set's one real failure
  (`RunPageClient.tsx` TS2322, fixed by `CardPickScreen.tsx` in the same set). **Keep it as lane 01's
  first act — the only mechanism turning dropped work back into shippable.**
- **The "conclusive typecheck tier before drop-all" guard is correct — keep it.** It refuses to discard
  build-clean code on an undecidable red; it just never gets a clean answer while Headline 1 stands.
- **Preflight divergence → isolated ship** stays validated (7/7 reached lanes, founder WIP untouched).
- **Doctrine (unchanged):** Pixi `.destroyed`/`.geometry` null-guards in rAF · BOOLEAN not bare Capacitor
  proxy · try/catch on async generation · `initial={false}` on above-fold Framer entrances ·
  `DirectionalIcon` NAMED import + logical `start-`/`end-` for RTL · local JWT verify on read-only GET ·
  `priority={false}` on Suspense-fallback images · `neo-*` tokens only · a Next `app/**/route.ts` exports
  ONLY handlers + route config.

## What to avoid (failed this week)
- **#0 — A SALVAGE LOG LINE IS NOT A COMMIT.** 11-06 printed "shipping (16 docs)", created none. **Verify:
  `git log --all --oneline --grep="improvement loop <date>"`.** (new, S)
- **#1 — THE GATE'S FRESH-CHECKOUT TYPECHECK STILL LACKS `build:i18n`.** 75 TS2307 lines across 7 logs,
  all one gitignored module. Root cause of all 7 drops and all 35 zero-code days. **One `cp`**
  (Headline 1). (open, FOUNDER, S, carried 4 windows)
- **#2 — `scripts/` IS DROPPED AS CODE; THE LOOP CANNOT SHIP ITS OWN REPAIR.** Headline 2. The fix was lost the night it was written, then **14 more dropped nights** believed it landed. (open, FOUNDER, S)
- **#3 — THE PEEL LOOP LOSES 7/7 ON PER-CALL COST, AND IT IS LINEAR (2N−7).** 3–8 of 21–77 calls at
  ~580–700s each, ~70 min burned nightly (**~8.2h this window**) to always reach `docs-only drop-all`.
  Fix = fewer calls (per-lane, 8) AND a cheaper call (tsc-only tier). Worthless until #1. (carried, M)
- **#4 — ONE LANE'S VOLUME DISCARDS EVERY OTHER LANE'S WORK.** 11-06: lane 1 kept **35** files vs lanes
  2–8's 1–4 each. `file-cap=8` is advertised but unenforced. **Enforce the cap on the keep path.** (S)
- **#5 — READING AN IN-FLIGHT LOG AS A RESULT IS A FALSE GREEN.** `rg -Nc TS2307` on tonight's log → 0,
  because lane 07 runs 90 min before the gate. Same class as the prose-vs-code grep miss and the `✓`→`✔`
  glyph break. **Only count errors in a log whose run reached its gate.** (new, confirmed, S)
- **#6 — A ZERO-CODE SHIP IS REPORTED AS SUCCESS.** 7 more commits of proof. `authored CODE files > 0 and
  0 code files committed` must be a loud **ERROR** in the Telegram card with the dropped-path list and the
  salvage stamp. (open, carried 5 windows, S)
- **#7 — `kept N authored file(s)` IS NOT A CODE COUNT AND `lane N` IS NOT A LANE ID** (positional over a
  nightly-varying set). **Print `lane=<name> kept=<n> code=<n>`.** (open, carried, S)
- **#8 — `docs/nightly/reports/` IS GITIGNORED (`.gitignore:82`).** Every `### Lane N` section lanes
  append in STEP 6 is never committed. **Un-ignore it, or stop calling it their report of record.** (S)
- **#9 — `translations/*.js` IS A MULTI-LANE HOTSPOT AND LAST WRITE WINS.** A "vanished" i18n string is
  usually never-applied, not gate-eaten — **`git diff` it before re-fixing.** Same for `AcademyMap.tsx`'s
  eslint-clean 2-line `unoptimized` removal: **uncommitted 14 consecutive nights.** (carried, S)
- **#10 — ADDING A PROP TO A COMPONENT IS A TWO-SITE EDIT.** The `CardPickScreen`/`RunPageClient` TS2322
  `activeCards` is in the 11-06 log again. **`rg` the props interface AND every call site in one pass;
  `npx eslint` does NOT type-check.** (open, confirmed drop cause)
- **#11 — STRANDED `refs/nightly-pending/` GREW 3 → 9.** Was 08-03/-08-06/-08-28; now also **10-28..11-02**,
  each `cherry-pick/push failed` every run — yet 11-03/04/05 commits ARE on `origin/master`, so the
  dual-write strands even on nights that push fine. `ls .gitattributes` → **still NONE**; create it with
  `merge=union` for `impact-ledger.ndjson`, `mode-readiness.md`, `perf-baseline.json`. Local checkout sits
  **20 commits behind `origin/master`** at lane time — fetch before the salvage commit. (escalated, M)
- **Brief hygiene:** LCP top-5 is cross-tenant PostHog contamination (imposketch.io) — **filter `$host` in
  the collector, not the lane** · `reddit-fetch search` returns garbage, RSS works · subagents fabricate
  non-English word lists (spot-check 5/locale) · a bare `count` in a supabase-js select is a PostgREST
  AGGREGATE (42803) · Supabase advisor warnings go stale, confirm vs `pg_indexes` · **grep for the helper
  before proposing to build it** (`ls scripts/nightly/lib scripts/nightly/tools`).

## Open watches (carry forward)
- **#0 + #1 + #2 + #3 together explain all 35 days of zero code. Nothing else matters until they land.**
- **Replay the NEXT-oldest stamp nightly** — 11-06 took `20261104-010003`; oldest left `20261029-010003`.
- **Spend-cap / abort leaves no artifact.** A pre-lane probe writing
  `docs/nightly/artifacts/run-aborted-<date>.md` + a Telegram card covers this and `not on master`.
- **Blast disconnect/reconnect-mid-wave board reset** — MAJOR, carried **19+ nights**. 6 files + a gating
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
> attribution, not fact (avoid-#7).

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ran 7/7; **35 kept files on 11-06 is the #1 reason the bisect loses** — clamp it; keep the salvage replay as its first act |
| 02 perf | `superpowers:systematic-debugging`, `agent-browser:agent-browser` | 7/7; 2 files/night — well-scoped; still burns time on cross-tenant LCP noise |
| 03 engagement | `frontend-design` | 7/7, 2 files/night, 5–7 min (11-07: 02:02→02:10) — never a named gate offender |
| 04 competitor | `humanizer`, `game-designer` | skipped 11-06 (zero-signal); kept 4 on 11-07 — the in-prompt scope clamp held |
| 05 landing | `frontend-design`, `impeccable` | 7/7, 2–3 files/night (11-07: 3); design quality non-negotiable; keep `tsc --noEmit` in its finalize |
| 06 seo | — | **lane DROPPED 10-31 (`a6f57e90d`)**, SEO via Growth Radar. Row kept only so no one re-adds it |
| 07 self-learn | none — prompt-only | 7/7. **Its 10-23 gate fix is still unshipped (Headline 2).** Must emit patches, not edits |
| 08 adsense | `humanizer`, `higgsfield-generate` | ran 11-06 (kept 1); blocked on AdSense approval, not on skills |
| 09 monetization | `frontend-design` | ran 11-06 rc=0; **owns the 11-07 founder "trial for unity" ask**; never the coin economy |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | skipped 11-06; ~1 output in 3 windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | blocked on the cookie overlay; cap its screenshot output |
| 12 telemetry | none — prompt-only | ran 11-05 + 11-06 (artifact only) |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (104 d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish/Russian strings are AI-generated — flag commits for native review.
