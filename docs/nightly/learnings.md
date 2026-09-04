# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-08-29..09-04. Of 7 nights, only 4 launched lanes (08-30, 08-31, 09-01, 09-04).**
> **08-29 died 3 KB into the log; 09-02 and 09-03 both hard-ABORTED at preflight, off-master.**
>
> **HEADLINE 1 — the loop shipped ZERO lane code for 4 consecutive gating nights.** 08-28, 08-30, 08-31 and
> 09-01 ALL ended `docs-only salvage — lane code dropped`: **73 file-drops, ~30 distinct files** (13+15+19+26,
> but 08-31 and 09-01 share ~14 identical paths). Every night the verdict chain is byte-identical: FAIL →
> non-authored parser says "baseline poison" → lint-skipped re-gate FAILs → conclusive typecheck tier →
> **`FAILED on a missing tool binary ('command not found') … node_modules/.bin unprovisioned even after
> self-heal`** → "genuinely unverifiable" → docs-only drop.
>
> **ROOT CAUSE — VERIFIED TONIGHT, and it is NOT what last week's file assumed.** `_gate_ensure_bin`
> (`gate-isolated.sh:84-96`) is guarded by `for b in eslint vitest tsc next; do [ -e .bin/$b ] || need=1`.
> `rg "self-healing with|self-heal failed|missing dev-tool"` over all four run logs returns **ZERO matches** —
> so the guard evaluated false and **the self-heal never ran**. The `cp -Rc` clone at `:459-464` leaves the
> `.bin` symlinks *present but unrunnable*, `[ -e ]` passes, and the gate then dies on `command not found`.
> **The precondition guard is the bug, not `npm rebuild`.** Swapping in `cp -a` alone would edit dead code.
> **FIX: provision + ASSERT unconditionally — run `./node_modules/.bin/eslint --version` after the clone and
> hard-fail loudly if it does not execute.** Last week's file demoted this whole item to "watch — did not
> fire"; that demotion cost a week of code.
>
> **HEADLINE 2 — the off-master preflight abort is BACK.** Last week's file said "CLOSED this week. Do not
> re-report." It fired 09-02 (on `geo/wordshake-word-wheel-citations`) and 09-03 (on `fix/user-deletion`):
> `ABORT — not on master and auto-recover unsafe (dirty tree or unpushed work)`. Both logged
> `preflight requested a timed retry — re-running once in 180 min` and **no retry log was ever written** —
> textbook Class-4 silent failure. Do not close this item again without a test.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible).
- **ADMIN-BETA TARGET LIST.** NOT admin-gated, never pick as STEP-0 targets: `blast`/`blast/v2`, `crossword`
  (noindex-only), `shiritori` (graduated 07-23), `word-tower` (graduated 07-20), `party`/`word-alchemy`/
  `word-forge`/`word-vault` (DELETED 07-06 — any pitch naming these is dead). **Surviving admin-gated set:
  `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`, `wheel-rush`.** Check the gate
  BEFORE offering a polish idea.
- **Lane 11 wheel-rush plateau — ENFORCE THE HARD STOP.** The rule was written twice and ignored twice. If a
  lane's own prior artifact names the same blocker two nights running, the lane MUST spend the night on the
  blocker or a different target, not another audit.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. **Lane 08 owns; 04/06 feed topics.** Lane 08 ran 1 of 4 launched nights (09-01).
  Cadence is effectively dead; needs a founder call or a scheduler exemption.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale
  translations FIRST.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks. `docs/nightly/feedback/*.ndjson` still stops at 2026-07-26 — now 40 days.** Seventh
  consecutive window at 0. `night:good` 0 · `night:meh` 0 · `polish:try` 0 · `idea:build` 0 · `reddit:*` 0 ·
  `mode:*` 0. The Telegram card CTA is dead as a steering channel. **Stop adding buttons.** Any lane prompt
  that says "wait for a `polish:try` vote" is unreachable — self-select instead.
- Do not confuse these with `feedback/summary-*.md` — that is the **player** sentiment digest
  (PostHog `growth:game_feedback` + Supabase `feedback_reports`), a different and also tiny signal.

## What works (validated this week)
- **The toolchain-error classifier itself is correct.** It refuses to blame lane code for a missing binary
  every single time (4/4 nights). It is doing its job; the job it protects is broken upstream. Keep it.
- **docs-only salvage is genuinely recoverable.** Every drop wrote a backup + a `restore-queue.ndjson` row,
  and 08-31 and 09-01 both carry `{"resolve":...}`. Nothing was lost, only delayed. (validated ×2)
- **`restore-salvaged-code.sh` is NOT the restore path — 3-way `git merge-file` is.** Lanes 01 on 08-28,
  08-30 and 09-01 all correctly reached for per-night merge-file over the blind-rsync script. (validated ×3)
- **Isolated ship when the founder has unpushed commits** — nightly diff goes out via worktree, founder
  commits stay local. Fired 08-28, 08-30, 09-01, no collision. (validated ×3)
- **Dirty-tree preflight + WIP snapshot/protect list** — zero founder WIP lost on any launched night.
- **Per-lane MCP scoping + idle leash** (`no MCP → idle leash raised to 1500s`) — no lane hit the idle killer
  this window. The 09-04 `USAGE-LIMIT hit (BACKOFF) — sleeping 120s` retry on lane 03 recovered to rc=0.
- **Verify-already-correct and CLOSE the finding.** A night that ships 0 files but retires phantom findings is
  a real win. (carried)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; BOOLEAN not bare Capacitor proxy; try/catch on async
  generation paths; `initial={false}` on above-fold Framer entrances; eslint-changed-files-only + single
  end-of-run commit + Mandatory-Minimum-Artifact floor; `DirectionalIcon` (NAMED import — a default import
  resolves to `undefined` and silently no-ops) + Tailwind logical `start-`/`end-` for RTL; local JWT verify on
  read-only GET; root-cause a dead counter at the shared funnel, not the caller; same-run flag+event WIRE then
  create the flag; Supabase Management API raw-SQL fallback (MCP is not load-bearing).** (doctrine)

## What to avoid (failed this week)
- **#1 — `_gate_ensure_bin`'s PRECONDITION GUARD never fires, so the gate dies on `command not found` 4/4
  nights and the loop loses 100% of its code.** Verified: the self-heal log lines appear in **none** of the
  four run logs. `[ -e node_modules/.bin/<tool> ]` passes on symlinks the `cp -Rc` clone left unrunnable.
  **FIX: drop the guard — after the clone, always assert `./node_modules/.bin/eslint --version` executes;
  if it does not, provision by `cp -a` from the primary checkout and hard-fail loudly if that still fails.**
  Do NOT just swap `npm rebuild` for `cp -a`: that line is never reached.
  File: `scripts/nightly/lib/gate-isolated.sh:84-96` (guard) + `:459-464` (clone).
  (open, **#1 by an enormous margin**, S-effort, ~30 distinct files/week recovered)
- **#2 — The gate burns 2h20m–2h50m per night running the SAME doomed sequence 5+ times.** 08-31: 02:39→04:59.
  09-01: 03:04→05:32. Once `_gate_ensure_bin` reports a failed self-heal, every downstream tier is
  pre-determined to hit `command not found`. **Short-circuit: if the .bin provision fails, skip straight to
  in-place fallback and alert — do not run four more full gates to rediscover it.** (open, new, S-effort)
- **#3 — Preflight off-master ABORT regressed** (09-02, 09-03) and its "retry in 180 min" **never ran**.
  Two dead nights out of seven. The retry must actually schedule (and log), or the abort must alert. (open,
  **REOPENED**, M-effort)
- **#4 — Stranded `refs/nightly-pending/` is now THREE refs: 2026-08-03, 2026-08-06, and 2026-08-28.** The
  retry has silently failed ~19 nights for 08-03. New this week: the isolated ship blocks on a conflict in
  the SAME three files every time — `docs/nightly/impact-ledger.ndjson`, `mode-readiness.md`,
  `perf-baseline.json`. Those are append-only/regenerated artifacts; give them a union merge driver
  (`.gitattributes`) and the conflict class disappears. (open, M-effort, high leverage)
- **#5 — Lane rc is a useless health signal: every lane returned rc=0 on every launched night** while the
  night shipped zero code. `rc=0` means "the agent process exited", not "work landed". Any dashboard or
  scheduler keyed on rc is blind. Emit a per-lane `files_shipped=` line after the gate instead. (open, new)
- **Every line in the run log is still printed TWICE.** Re-confirmed on 09-04. A tee/redirect is
  double-plumbed in `run.sh`; it doubles every log grep a lane does. (open, carried, S-effort)
- **agent-browser cannot dismiss the cookie-consent overlay** — the dialog renders outside the snapshot a11y
  tree. Blocking lane 11 visual QA AND lane 02 CLS capture for a **20th+ night**. FIX: pre-seed the consent
  cookie/localStorage before first navigation. (open, **longest-running blocker in the loop**)
- **Impact checks against a zero denominator read as "neutral" and teach nothing.** Assert the DENOMINATOR is
  plausible first; report `no-exposure`, not `neutral`. Never write `x/7` when only 4 nights launched.
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works, the *search* path does not. Fall
  straight through to WebSearch. (carried, lane 04)
- **Don't diagnose a live run from its own report** — an in-progress report is always half-written. (carried)
- **Subagents fabricate non-English word lists** — spot-check 5 real words per locale before shipping any
  he/ja/sv/es content. (carried, lane 10)

## Open watches (carry forward)
- **`_gate_ensure_bin` npm-rebuild self-heal** — 4/4 nights, 100% of lane code lost. Status: **#1, assign now.**
- **Preflight off-master abort** — Status: **REOPENED** (09-02, 09-03). Its retry is a silent no-op.
- **Stranded `refs/nightly-pending/2026-08-03, -08-06, -08-28`** — Status: open, ~19 nights of silent retries.
  Conflict is always the same 3 nightly artifacts → union merge driver.
- **agent-browser cookie-consent dismissal** — Status: open, #1 tooling gap, 20+ nights.
- **Wheel-rush readiness** — blocked on visual QA + HE/JA native review, no code blockers. Status: rotate.
- **Duplicated run-log lines** — Status: open, S-effort.
- **Lane 08 (blog cadence) ran 1 of 4** while the founder directive asks for a post every 2 days.
  Status: open, needs a founder call.
- **Restore queue: tag `20260827-010001` has NO resolve line** (8 files still unrestored); 08-31 and 09-01 are
  resolved. Status: open, one stranded tag.
- **MP CLS 0.92+** (socket `connecting→lobby` DOM swap; `NativeLanguageBanner` and `CookieConsent` RULED OUT).
  Fix = a `RoomListView` skeleton at lobby dimensions, 4–6h. Status: open, human queue.
- **Telemetry classifier false-positives** — 25 of 33 "DEAD" events fire as `growth:<name>`. Probe
  `growth:<event>` volume before marking DEAD. Status: open 6 weeks.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more, 0 non-test call sites. Search `rg "n\('exp-" fe-next`, NOT
  `useExperiment`. Status: open, lane 03 (wire or delete).
- **Brain Drill has no traffic** (`drill_completed` 0/13d+). Status: open — discoverability, not features.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il`; IndexNow Bing parity; AdSense re-submit after
  ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT. Status: human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 4/4 launched rc=0; drove the merge-file restore 3 nights |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager`, `agent-browser:agent-browser` | 4/4 rc=0 — most consistent lane |
| 03 engagement | `frontend-design` | 4/4 rc=0; recovered from a usage-limit backoff on 09-04 |
| 04 competitor | `humanizer`, `game-designer` | 1/4 (08-31 only) — near-permanent scheduler skip |
| 05 landing | `frontend-design`, `impeccable`, `animate-ai` | 4/4 launched, 0 reverts (`impeccable:craft` was not a real skill name — corrected) |
| 06 seo | `seo-daily` | 1/4 (09-01); native review mandatory |
| 07 self-learn | none — prompt-only | 2/4 (08-30, 09-04); the file it rewrites went 18 days stale |
| 08 adsense | `humanizer`, `higgsfield-generate` | 1/4 (09-01) — blog cadence at risk |
| 09 monetization | `frontend-design` | 3/4 (08-30, 08-31, 09-01) |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/4 (08-30, 08-31) — recovered from 2 dead windows |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 4/4 launched; **escalate the blocker, don't re-audit** |
| 12 telemetry | none — prompt-only | 2/4 (09-01, 09-04); idempotence guard still unbuilt |

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
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
