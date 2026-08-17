# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-08-11..08-17. Five nights launched (08-13,14,15,16,17); 08-11 and 08-12 were the tail of the
> off-master dead streak.**
> **THE HEADLINE: the #1 item from last week is FIXED.** Preflight no longer hard-aborts on a dirty/off-master
> checkout. It now logs `working tree dirty — will run on top of WIP and ship it`, takes a **pre-lane WIP
> snapshot** + protect list (`~/logs/lexi-nightly/wip-protect-*.list`), and when the founder has unpushed
> commits it does an **isolated ship** (nightly diff only, via worktree — founder work left local). Five
> consecutive nights launched. Do not carry the "3 dead nights" item forward; it is closed.
> **Second headline: the gate now has a conclusive tier that RECOVERS nights.** On 08-16 the authored set
> failed lint AND failed lint-skipped re-gate (rc=1), and instead of the old docs-only drop the gate ran
> `build:schemas + tsc --noEmit + test:changed` on the authored set, PASSED, and **shipped the code**
> (`b907e9cbd`). That is the wedge item from last week converting into a working fallback.

## FOUNDER DIRECTIVE — highest priority
- **2026-07-30 (sealed-bid) — SUPERSEDED.** Lane 11 has now run **wheel-rush 6 straight nights**
  (08-07/08/09/13/16/17), every night ending on the same two blockers: **live visual QA** and **HE/JA native
  translation review**. Neither is a code blocker. **STOP re-auditing wheel-rush code.** Next lane-11 night:
  either fix the visual-QA tooling (cookie-consent pre-seed) or rotate to another admin-gated mode.
- **ADMIN-BETA TARGET LIST (still current).** NOT admin-gated, never pick as STEP 0 targets:
  `blast`/`blast/v2`, `crossword` (noindex-only), `shiritori` (graduated 07-23), `word-tower` (graduated
  07-20), `party`/`word-alchemy`/`word-forge`/`word-vault` (DELETED 07-06 — any pitch naming these is dead).
  **Surviving admin-gated set: `sealed-bid`, `word-craft` (`?mode=gems`, `?mode=cards`), `brain-drill`,
  `wheel-rush`.** Rotate within those only. Check the gate BEFORE offering a polish idea.
- **2026-06-27 (blog cadence):** new blog every 2 days — word-game + education/"AI to learn a language"
  angles, link a live MODE. **Lane 08 owns; 04/06 feed topics.** Blocked on a Higgsfield hero-image recipe.
  NOTE: lane 08 was **scheduler-skipped** on 08-16 and 08-17 as a zero-signal lane — if the founder still
  wants the cadence, lane 08 must be exempted from the skip list, or the cadence is silently dead.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality,
  (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only
  irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing
  admin-gated mode/night, EXISTING files only, keeps the admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale
  translations FIRST.

## Telegram-button feedback (last 7 days)
- **ZERO callbacks, again.** `docs/nightly/feedback/*.ndjson` still stops at **2026-07-26** — now **22 days**
  with no button press. **Fifth consecutive window at 0.** The Telegram card CTA is dead as a steering
  channel. Stop adding buttons; optimize for autonomy. Treat any lane prompt that says "wait for a
  `polish:try` vote" as unreachable and self-select instead.
- Do not confuse these with `feedback/summary-*.md` — those are the **player** sentiment digest (PostHog
  `growth:game_feedback` + Supabase `feedback_reports`), a different and also tiny signal.
- **0 `night:good`, 0 `night:meh`, 0 `polish:try`, 0 `idea:build`, 0 `reddit:*`, 0 `mode:*`.**

## What works (validated this week)
- **Dirty-tree preflight + WIP snapshot/protect list.** 5/5 nights launched with a dirty founder tree; zero
  founder WIP lost. This single change took the loop from 3-of-7 dead to 5-of-5 alive. (validated ×5)
- **The conclusive typecheck tier (`build:schemas + tsc --noEmit + test:changed`) on an unattributable red.**
  08-16: saved a full night of lane code that the old path would have dropped. 08-14: correctly refused
  (it wedged) and fell to docs-only salvage. It is right in both directions — keep it, and keep the log line
  that says which branch it took. (validated ×2, both polarities)
- **drop-and-re-gate's non-authored parser.** 08-15 (47 paths) and 08-16 (45 paths) both correctly refused to
  blame lane code for a pre-existing baseline lint error. No false drop from baseline poison this week.
- **The salvage→restore round-trip.** `restore-queue.ndjson` is **fully resolved** — 08-09, 08-13 and 08-14
  all carry `{"resolve":"<tag>"}`. Nothing stranded. (validated ×3)
- **Isolated ship when the founder has unpushed commits** — nightly diff goes out via worktree, founder
  commits stay local. Fired 08-14 and 08-15, no collision. (validated ×2)
- **The lane scheduler (new).** 8/12 lanes/night, zero-signal lanes skipped with ~3-night rotation. Nights
  now finish in ~1.5–3h instead of 6–9h (08-13 ran to 10:07, 08-17 finished 02:31). Big win — but see the
  lane-08 exemption warning above.
- **Root-cause a dead counter at the shared funnel, not the caller** (lane 12) — carried, validated ×3.
- **Same-run flag+event WIRE, then create the flag** (lane 03) — carried, still the right order.
- **Supabase Management API raw-SQL fallback** — MCP is not load-bearing for DB work. (carried)
- **Verify-already-correct and CLOSE the finding.** A night that ships 0 files but retires phantom findings is
  a real win. (carried)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; BOOLEAN not bare Capacitor proxy; try/catch on async
  generation paths; `initial={false}` on above-fold Framer entrances; eslint-changed-files-only + single
  end-of-run commit + Mandatory-Minimum-Artifact floor; `DirectionalIcon` (NAMED import — a default import
  resolves to `undefined` and silently no-ops) + Tailwind logical `start-`/`end-` for RTL; local JWT verify on
  read-only GET.** (doctrine)

## What to avoid (failed this week)
- **#1 — Two nightly-pending refs have been stranded since 08-03/08-06 and only WARN.** Every one of the last
  5 logs prints `preflight: WARN — could not auto-recover refs/nightly-pending/2026-08-03 (cherry-pick/push
  failed); will retry next run` (and the same for 08-06). **The retry has failed ~14 nights running** and
  nothing escalates. This is textbook Class-4 silent failure: a retry loop that never succeeds and never
  alerts is indistinguishable from "nothing to do". Either cherry-pick them by hand, or make the 3rd
  consecutive failure a Telegram alert / hard stop. (open, **highest ROI**, S-effort)
- **#2 — Lane 11 plateaued 6 nights on wheel-rush** for the same two non-code reasons. The rule "escalate the
  blocker, don't re-audit" was written last week and then not followed for two more nights. Make it a prompt
  hard-stop: if the lane's own prior artifact names the same blocker twice, the lane MUST spend the night on
  the blocker (or a different mode), not the audit. (open, M-effort, prompt change)
- **#3 — The gate still fails on the authored set nearly every night.** 08-14 FAILED→salvage, 08-15 FAILED,
  08-16 FAILED→rescued by the typecheck tier. Three of four gating nights went red before any recovery tier.
  The recovery machinery is now good enough that this reads as healthy — it is not. Each red costs ~40–90 min
  of gate wall-clock. Instrument WHICH check reddens (lint vs test vs build) per night into a one-line
  machine-readable record so lane 7 can attribute it instead of guessing. (open, new, S-effort)
- **Every line in the run log is printed TWICE.** Confirmed on 08-17 (`lane=01-triage rc=0` etc. all duplicated
  verbatim). Logs are 2.1 MB for a 1.5 h night; it doubles every grep and every log read a lane does. A tee/
  redirect is double-plumbed in `run.sh`. (open, new, S-effort)
- **agent-browser still cannot dismiss the cookie-consent overlay** — the dialog renders outside the snapshot
  a11y tree. Now blocking lane 11 visual QA AND lane 02 CLS capture for a **13th+ night**. FIX: pre-seed the
  consent cookie/localStorage before first navigation. (open, **longest-running blocker in the loop**)
- **`_gate_ensure_bin` self-heals with `npm rebuild`, which is broken on this workstation** (ENOTDIR redlock
  symlink). Copy/symlink `.bin` from the primary checkout instead. Did not fire this week — demote to watch.
  (open, S-effort, `scripts/nightly/lib/gate-isolated.sh:76`)
- **4 baseline-red test files** — still tracked, still not this week's cause; the non-authored parser now
  absorbs them. Keep as a low watch. (open, demoted)
- **Impact checks against a zero denominator read as "neutral" and teach nothing.** Assert the DENOMINATOR is
  plausible first; report `no-exposure`, not `neutral`. Applies to lane 7's own tables — never write `x/7`
  when only 5 nights launched. (carried)
- **`reddit-fetch search` returns garbage**; the RSS *feed* path works, the *search* path does not. Fall
  straight through to WebSearch. (carried, lane 04 — which has not launched in 2 weeks)
- **Don't diagnose a live run from its own report** — an in-progress report is always half-written. (carried)

## Open watches (carry forward)
- **Stranded `refs/nightly-pending/2026-08-03` + `2026-08-06`** — 14 nights of silent failed retries.
  Status: **#1, unowned, assign.**
- **agent-browser cookie-consent dismissal** — blocks lane 11 visual QA AND lane 02 CLS capture.
  Status: open, #1 tooling gap, 13+ nights.
- **Wheel-rush readiness** — 6 nights, blocked on visual QA + HE/JA native review, no code blockers.
  Status: open, escalate tooling or rotate mode.
- **Gate reddens on the authored set most nights** — needs per-check attribution. Status: open, new.
- **Duplicated run-log lines** — Status: open, new, S-effort.
- **Lane 08 (blog cadence) is being scheduler-skipped** while the founder directive still asks for a post
  every 2 days. Status: open, needs a founder call or a scheduler exemption.
- **Preflight off-master abort** — Status: **CLOSED this week.** Do not re-report.
- **Restore queue** — Status: **CLEAN**, all three tags resolved. Keep the habit.
- **MP CLS 0.92+ (socket `connecting→lobby` DOM swap, root cause confirmed).** `NativeLanguageBanner` and
  `CookieConsent` both RULED OUT. Fix = a `RoomListView` skeleton at lobby dimensions, 4–6h.
  Status: open, human queue.
- **Telemetry classifier false-positives** — 25 of 33 "DEAD" events fire as `growth:<name>`. Probe
  `growth:<event>` volume before marking DEAD. Status: open 5 weeks, lane 12's own top item.
- **Unwired-but-typed experiments** — `exp-practice-wheel-cta-v1`, `exp-game-abandon-confirm-v1`,
  `exp-mp-round-feedback-top-v1` + 7 more have 0 non-test call sites. Status: open, lane 03 (wire or delete).
  NOTE: experiments use the `n()` hook alias — search `rg "n\('exp-" fe-next`, NOT `useExperiment`.
- **Brain Drill has no traffic** (`drill_completed` 0/13d+). Status: open — discoverability, not features.
- **GSC/human queue** — GSC creds drifted to `lf-finance.co.il` (re-verify); IndexNow Bing parity; AdSense
  re-submit after ≥5 informational pages clear 400w; Sentry MCP write-403; Supabase never-expire PAT.
  Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/5 launched nights rc=0; drove the 08-14 salvage restore |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager`, `agent-browser:agent-browser` | 5/5 rc=0 — most consistent lane; shipped education-hero LCP lazy 08-17 |
| 03 engagement | `frontend-design` | 4/4 launched rc=0; flag hygiene steady |
| 04 competitor | `humanizer`, `game-designer` | 0/5 — scheduler-skipped every night this window; no data |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5/5 launched, 0 reverts |
| 06 seo | `seo-daily` | 2/5 rotation (08-15, 08-16); native review mandatory |
| 07 self-learn | none — prompt-only | 3/5 (skipped 08-15 as zero-signal); closed the off-master item |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/5, skipped 08-16+08-17 — blog cadence at risk |
| 09 monetization | `frontend-design` | 3/5 (bundled with 03/12) |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 0/5 this window — 2 windows with no run; candidate for retirement at 7 |
| 11 mode-qa | `senior-qa`, `ccgs-design-review`, `agent-browser:agent-browser` | 5/5 launched; wheel-rush **plateaued 6 nights — escalate, don't re-audit** |
| 12 telemetry | none — prompt-only | 2/5; idempotence guard (skip if report header exists) still unbuilt |

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
