# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-08-07..08-13 (7 calendar nights, but only 4 launched lanes).**
> **THE HEADLINE: 08-10, 08-11 and 08-12 ran ZERO lanes.** All three aborted at 01:01 in preflight —
> `not on master (on feat/polar-payments | feat/polar-legal-copy | improve/2026-08-11) and auto-recover
> unsafe (dirty tree or unpushed work)`. Each log is **16 lines**. The founder now works on feature
> branches during the day and leaves the checkout off-master and dirty; the loop demands master+clean.
> That is 3 of 7 nights of total loss and it is the single biggest item in the loop right now.
> **Corrections to last week's learnings:** (1) the 08-08/08-09 code drops were NOT caused by the 4
> baseline-red test files — the logs classify them as a `.bin`-unprovisioned SETUP failure *followed by*
> a fallback/typecheck-tier **wedge**, which is the terminal cause and is still undiagnosed. (2) Those
> drops were **recovered** — `b0bbf2f37` + `68dc528e4` restored both salvage tags to master. Do not
> write "the loop shipped nothing"; the drops round-tripped, the 3 dead nights did not.

## FOUNDER DIRECTIVE — highest priority
- **2026-08-13 (new, blocking the whole loop):** the loop must survive a **dirty, off-master checkout**.
  The founder's own branch work is legitimate and will not stop. Either preflight runs the night in a
  **git worktree pinned to `origin/master`**, or the abort must at minimum **alert on Telegram** instead
  of writing 16 lines and dying. Three silent nights is Class-4 silent failure at loop scale.
- **2026-07-30 (sealed-bid) — SUPERSEDED.** Lane 11 rotated off sealed-bid to **wheel-rush** and has now
  run 4 straight nights (08-07/08/09/13) all ending "needs 1–3 more nights", always blocked on the same
  two things: **live visual QA** and **HE/JA native translation review**. Same plateau shape as
  sealed-bid. **Escalate the blocker, do not re-audit the code paths.**
- **ADMIN-BETA TARGET LIST (still current).** NOT admin-gated, never pick as STEP 0 targets:
  `blast`/`blast/v2`, `crossword` (noindex-only), `shiritori` (graduated 07-23), `word-tower`
  (graduated 07-20), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06 — any pitch naming
  these is dead). **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`),
  `brain-drill`, `wheel-rush`.** Rotate within those only. Check the gate BEFORE offering a polish idea.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. **Lane 08 owns; 04/06 feed topics.** Blocked on a Higgsfield hero-image recipe.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale
  translations FIRST.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks.** The `docs/nightly/feedback/*.ndjson` series **stops at 2026-07-26** — 18 days with
  no button press at all. This is the **fourth consecutive window at ~0**. The Telegram card CTA is dead
  as a steering channel; stop adding buttons and optimize for autonomy instead.
- Do not confuse these with `feedback/summary-*.md` — those are the **player** sentiment digest (PostHog
  `growth:game_feedback` + Supabase `feedback_reports`), a different signal. 08-13 digest: **1 response
  total** (mp_round, avg 2.0), 0 bug reports in 7d. Denominator far too small to steer on.
- **0 `night:good`, 0 `night:meh`, 0 `polish:try`, 0 `idea:build`, 0 `reddit:*`, 0 `mode:*`.**

## What works (validated this week)
- **The salvage→restore round-trip actually works end to end.** 08-08 (14 files) and 08-09 (19 files)
  were both false-dropped, both backed up, both restored to master (`b0bbf2f37`), both marked
  `{"resolve":"<tag>"}` in `restore-queue.ndjson`. The recovery path is no longer theoretical — it is
  the reason a bad gate week still shipped code. (validated ×2, same week)
- **docs-only salvage protects master.** Every gate-fail drops lane CODE before push; still 0 pushed-code
  reverts in 50+ nights. Cost is real (33 files across 2 nights) but master stays green. (doctrine)
- **The toolchain-error classifier correctly refused to blame lane code.** `gate-isolated.sh` caught
  `command not found` and classified rc=2 SETUP, explicitly logging "never a code failure that would drop
  clean authored code." It did its job — the drop came from the *next* stage. Keep the classifier.
- **Lane 02 + lane 03 remain the most reliable lanes** — rc=0 on every night that launched, and lane 02
  shipped a complete 5-locale slice on 08-13 (`rareGems.ts` + test + component + all translations).
- **Root-cause a dead counter at the shared funnel, not the caller** (lane 12) — carried; validated ×2.
- **Same-run flag+event WIRE, then create the flag** (lane 03) — carried; still the right order.
- **Supabase Management API raw-SQL fallback** — MCP is not load-bearing for DB work. A failed probe is
  informational, never a blocker. (carried, validated)
- **Verify-already-correct and CLOSE the finding.** A night that ships 0 files but retires phantom
  findings is a real win — write the verdict down so it is not re-audited. (carried)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; BOOLEAN not bare Capacitor proxy; try/catch on
  async generation paths; `initial={false}` on above-fold Framer entrances; eslint-changed-files-only +
  single end-of-run commit + Mandatory-Minimum-Artifact floor; `DirectionalIcon` (NAMED import — a
  default import resolves to `undefined` and silently no-ops) + Tailwind logical `start-`/`end-` for RTL;
  local JWT verify on read-only GET.** (doctrine)

## What to avoid (failed this week)
- **#1 — Preflight hard-aborts off-master and says nothing.** 3 nights, 0 lanes, 16-line logs. Each log
  ends `preflight requested a timed retry — re-running once in 180 min`, but **no second log file exists
  for any of the three nights** (mtimes all 01:01) — so the retry appears never to have produced output
  (inference from file state, not from an explicit log line). No Telegram alert fired. This is the exact
  Class-4 shape the repo's own pitfalls doc names. (open, **highest ROI in the loop**)
- **#2 — The terminal gate failure is a WEDGE, and it is undiagnosed.** All three gating nights stacked
  the same way: first tier fails → fallback → **fallback also wedges** → salvage. 08-07:
  `rc=134: wedged 2700s idle / 5400s backstop` then fallback `rc=3`. 08-08: SETUP rc=2 → in-place
  fallback rc=2 → `conclusive typecheck tier ALSO wedged`. 08-09: `rc=1` at 03:37 (before any `.bin`
  issue at 04:39) → `typecheck tier ALSO wedged`. **The in-place fallback runs in the real checkout with
  a working `.bin` and still failed all three nights** — so fixing `.bin` provisioning alone would not
  have saved any of them. Instrument the wedge before proposing a fix. (open, new)
- **`_gate_ensure_bin` self-heals with `npm rebuild`, which is broken on this workstation.** Project
  memory: `npm install` dies with an ENOTDIR redlock symlink error here. The self-heal therefore cannot
  succeed; the log's own fallback line admits it ("'npm rebuild' self-heal failed"). Copy/symlink `.bin`
  from the primary checkout instead. Real, but **secondary to the wedge** — do not sell it as the fix.
  (open, S-effort, `scripts/nightly/lib/gate-isolated.sh:76`)
- **4 baseline-red test files — still present, but DEMOTED.** `git ls-files` confirms all four still
  exist. However `cb1702842` (08-12) fixed a *different* red set (`ResultsPodiumMood`, `soloDaily`,
  `vitest.setup.ts`), and this week's drops are attributable to the wedge, not to these. Keep as a watch;
  they are no longer the #1 item and last week's "proven to cause code drops" claim was over-fitted to a
  single 07-30 log line. (open, M-effort, downgraded)
- **Lane 11 has plateaued 4 nights on wheel-rush** for the same two reasons every night (visual QA +
  HE/JA native review). Two consecutive identical verdicts should escalate the blocker, not buy another
  night of code audit. (open, the rule from last week was written and then not followed)
- **Visual QA still blocked by the cookie-consent overlay** — agent-browser cannot dismiss it; the dialog
  renders outside the snapshot a11y tree. Now blocking lane 11 (readiness %) AND lane 02 (Layout-Shifts
  capture) for a **10th+ night**. FIX: pre-seed the consent cookie/localStorage before first navigation.
  (open, **longest-running blocker in the loop**)
- **Impact checks against a zero denominator read as "neutral" and teach nothing.** Assert the
  DENOMINATOR is plausible first; report `no-exposure`, not `neutral`. Applies to lane 7's own tables
  too — never write `x/7` when only 4 nights launched. (carried, mirrors Class 4)
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works, the *search* path does not. Fall
  straight through to WebSearch. (carried, lane 04)
- **Don't diagnose a live run from its own report** — an in-progress report is always half-written.
  Verify run state by log/commit. (carried, meta)

## Open watches (carry forward)
- **Preflight off-master abort (3 nights lost).** Status: **#1, new, unowned — assign.**
- **Gate fallback/typecheck-tier wedge.** Status: #2, new, undiagnosed. Needs instrumentation (log rc +
  last output line before the idle kill) before any fix.
- **`gate-isolated.sh` `.bin` self-heal uses a broken `npm rebuild`.** Status: open, S-effort.
- **agent-browser cookie-consent dismissal.** Blocks lane 11 visual QA AND lane 02 CLS capture.
  Status: open, #1 tooling gap, 10+ nights.
- **Wheel-rush readiness** — 4 nights, blocked on visual QA + HE/JA native review, no code blockers.
  Status: open, escalate tooling not audit.
- **4 baseline-red test files** — confirmed still tracked. Status: open, demoted from #1.
- **MP CLS 0.92+ (socket `connecting→lobby` DOM swap, root cause confirmed).** `NativeLanguageBanner`
  and `CookieConsent` both RULED OUT. Fix = a `RoomListView` skeleton at lobby dimensions, 4–6h.
  Status: open, human queue.
- **Telemetry classifier false-positives** — 25 of 33 "DEAD" events fire as `growth:<name>`. Probe
  `growth:<event>` volume before marking DEAD. Status: open 4 weeks, lane 12's own top item, deferred.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more have 0 non-test call sites. Status: open, lane 03 (wire or
  delete). NOTE: experiments use the `n()` hook alias — search `rg "n\('exp-" fe-next`, NOT `useExperiment`.
- **Restore queue is CLEAN** — 08-08 and 08-09 both carry `{"resolve":"<tag>"}`; no 08-07 code backup
  exists (that night salvaged docs only). Nothing stranded. Status: closed this week, keep the habit.
- **Brain Drill has no traffic** (`drill_completed` 0/9d+). Status: open — discoverability, not features.
- **Blog cadence engine** — Higgsfield hero recipe blocked on CLI install. Status: #1 founder-content, lane 08.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il` (re-verify); IndexNow Bing parity;
  AdSense re-submit after ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire
  PAT. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 3/4 launched nights; 08-08 shipped search_path DDL, 08-09 drove the salvage restore |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager`, `agent-browser:agent-browser` | 4/4 rc=0 — most consistent lane; still needs headless Layout-Shifts capture |
| 03 engagement | `frontend-design` | 4/4 rc=0; flag hygiene steady |
| 04 competitor | `humanizer`, `game-designer` | 1/4 (ran 08-08 only); low frequency, no reverts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 3/4, 0 reverts |
| 06 seo | `seo-daily` | 2/4 rotation; native review mandatory |
| 07 self-learn | none — prompt-only | 3/4 (08-13 recovered the 3 dead nights nobody had surfaced) |
| 08 adsense | `humanizer`, `higgsfield-generate` | 3/4; FAQ page 08-09; hero-image still blocked on CLI |
| 09 monetization | `frontend-design` | 3/4 (bundled with 03/12) |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 0/4 this window — lowest-frequency lane, watch for irrelevance |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 4/4 launched; wheel-rush **plateaued 4 nights — escalate, don't re-audit** |
| 12 telemetry | none — prompt-only | 3/4; idempotence guard (skip if report header exists) still unbuilt |

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
