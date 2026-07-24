# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-19..07-24 (6 report nights; 07-17 lost earlier).** **This week's story = the GATE is the whole friction budget.** Lanes themselves are healthy — 5/6 landing ships, shiritori graduated, engagement 4/5 — but the gate (a) FALSE-DROPPED clean lane code 2 of 6 nights (07-21, 07-23; both restored next day via `40f7838bf` / `8a9b047d4`) and (b) runs a **2–6h wall-clock tail** (lanes finish ~03:30, drop-and-re-gate re-runs the conclusive typecheck tier to 06:47/07:08). Both are the SAME root: unattributable red → drop-all instead of bisect-to-offender. **#1 fix = finish `ad65aa350` into a full subset-peel backstop.** Secondary friction: **Supabase MCP down all 6 nights** (6 migrations now 3–27d stale) + **lane 02 can't do headless visual QA** so it research-cycles the same CLS hypotheses 6 nights with no landed root-cause.

## FOUNDER DIRECTIVE — highest priority
- **2026-07-23 (shiritori GRADUATED, binding):** shiritori promoted 90% → Released (6-night stacked build: timer→network-err+TDD→RTL→i18n+visualQA). Lane 11 now on **sealed-bid** (45% baseline as of 07-24). **Do NOT resume shiritori/crossword/word-tower audits.** Sealed-bid open MAJOR: countdown timer tracked (`roundDeadline`) but never rendered in `SealedBidVersus.tsx` — players can't see the 30s auto-resolve window.
- **2026-07-22 (founder BUILD vote, binding):** founder voted `idea:build` on **Brain Drill Post-Session Word Replay** (`913934c2`) — flash top-3 missed words letter-by-letter after each drill, ~2s each with score delta. S-effort (reuse existing word-reveal animation). NYT Crossplay "Cross Bot" precedent. Lane 04/05 build this next.
- **2026-07-20 (word-tower GRADUATED, binding):** word-tower Released. Carried: word-tower **daily-challenge Layer B** (leaderboard backend, 1-attempt/day) = founder design call, not autonomous.
- **2026-07-06 (MODE CULL, binding):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly. (No culled-mode pitches surfaced THIS window — the idea-gen cull-list gap appears resolved; monitor.)
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — generated hero image, word-game + education/"AI to learn a language" angles, link a live MODE. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. Pick from surviving modes only.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7 days)
- **Only 2 callbacks in window, both founder (`of201`).** Button volume very low — if <2/wk persists, flag Telegram-card CTA visibility.
- **0 `night:good`, 0 `night:meh`** this window → no run-quality complaint signal (below the 3-meh self-critique threshold). Silence on run-health despite 2 gate false-drops — founder trusts the next-day restore.
- **1 `idea:build`** → **Brain Drill Post-Session Word Replay** (07-22) — LIVE mode, actionable, now a binding directive (see above).
- **1 `modeqa:ontrack`** → shiritori (07-20) — founder confirming the mode-readiness cadence is on the right track. Reinforces the stacked-incremental audit pattern.
- **0 `reddit:*`, 0 `mode:keep/drop/promote`.**

## What works (validated this week)
- **Stacked-incremental mode audit (lane 11, shiritori 42%→90% over 5 nights, 0 reverts)** — one fix per night in dependency order (timer → network-error+TDD → RTL DirectionalIcon → i18n final pass → visual QA → promote). Founder `modeqa:ontrack` vote confirms. Mirror for sealed-bid. (validated, strongest mode win)
- **Same-run flag+event WIRE (lane 03, 4/5 ship)** — create the PostHog flag AND wire its render + event same night. Shipped `exp-mp-round-reaction-v1`, `-rival-best-word-v1`, `-wordhunt-clue-shake-v1`, `-round-issue-probe-v1` (finalized 07-24, flag id:235417). Lane 03 remains most reliable. (validated)
- **Small-diff variable-reward mode polish, 5-locale-first (lane 05, 5/6 ship, 0 revert)** — sealed-bid speed-bonus, gem-hunt dice risk/reward, shiritori speed-bonus, word-tower safe-area. All ≤7 files, locales written first. `frontend-design` skill on each. (validated)
- **Autonomous least-privilege security fix (lane 01)** — `REVOKE EXECUTE upsert_push_token FROM PUBLIC` (07-19); `redisAdapter.ts` publish-catch guard killing 711 Sentry events during a Redis restart (07-23). Grant/revoke + try-catch guards = reversible, small blast radius, ship without asking. (validated)
- **Telemetry impact confirmed by delta** — `exp-singleplayer-word-goal-v1` game_completed 4.4→9.9/day (+125%); blast `results_viewed` 0→56; homepage rage clicks 27→14. Wire + verify-by-delta the next night works. (validated, lane 12)
- **docs-only salvage protects master** — every gate-fail drops lane CODE before push; a gate false-negative never regresses master, and code is recoverable from `salvaged-code-*` backup. 0 pushed-code reverts, 45+ nights. (doctrine)
- **Pixi `.destroyed`/`.geometry` null-guard chain in rAF; return BOOLEAN not bare Capacitor proxy; try/catch on async generation codepaths; `initial={false}` on above-fold Framer entrances; fetchLanding parallelization; eslint-changed-files-only + single end-of-run commit + Mandatory-Minimum-Artifact floor; `DirectionalIcon` for RTL back/exit; local JWT verify on read-only GET.** (doctrine)

## What to avoid (failed this week)
- **Gate drop-all on unattributable red = the whole friction budget** — 07-21 dropped 14 clean files, 07-23 dropped 11; both build-clean, both restored next day. The conclusive-typecheck-tier re-gate runs 2–6h AFTER lanes finish (to 06:47 / 07:08). Root cause: red bisects to drop-ALL, not to the one offending source. FIX: finish `ad65aa350` "peel the offending source" into a full **subset-peel backstop** (bisect authored set → drop only the failing file). Shrinks BOTH the false-drops and the 2–6h tail. (#1 friction, deferred class-killer)
- **Lane 02 research-cycles the same CLS hypotheses 6 nights** — 2 fixes landed (AutoHideHeader spacer 07-20, ad-banner spacer 07-21) but each <2% CLS impact; MP CLS stuck 0.962–0.979 CRITICAL, homepage 0.889–0.903. Root cause needs a **Layout Shifts panel capture the lane can't do headless**, so it re-derives the same suspects (socket transitions, AnimatePresence SSR opacity:0, skeleton→room height) nightly. FIX: give lane 02 an agent-browser/Playwright Layout-Shifts capture OR force one-hypothesis-tested-per-night. (open, lane 02, tied to CLS 0.9→<0.1)
- **Supabase MCP down all 6 nights (23rd→27th consecutive)** — 6 migrations stalled 3–27d (`web_vitals_player_id` FK index oldest). Impact verdicts + index-health + RLS audits blocked. HUMAN: mint a **never-expire** `SUPABASE_ACCESS_TOKEN`. (open, escalating — flagged 6× unactioned)
- **Zombie flag `exp-mp-room-join-loading-v1`** — active in PostHog, 0 call sites, flagged for human deactivation 4 nights running (07-21..24), never actioned. HUMAN: deactivate. (open, trivial, unactioned)
- **Typecheck-tier "unattributable red" flake (07-19, 07-22)** — `tsc --noEmit` + `test:changed` pass independently; red is undecidable. Shipped at reduced strength. Same classifier weakness as the drop-all — the subset-peel backstop fixes this too. (open watch)
- **Don't diagnose a live run from its own report** — the 07-24 report looked "timed-out / missing Outcome" to a mid-run reader, but self-learn was simply still executing at 03:19. An in-progress report is always half-written; verify run state by log/commit, not report completeness. (new, meta)

## Open watches (carry forward)
- **Gate subset-peel backstop** — the deferred class-killer; ends "parser always one format behind." Status: #1 friction, DEFERRED.
- **Supabase MCP down (27d migration carry)** — drain 6 pending on any connected night. HUMAN: never-expire PAT. Status: open, escalating.
- **CLS crisis 0.9 across routes, 6 nights, no root-cause fix** — needs headless visual QA. Status: open, lane 02.
- **Sealed-bid 45%→release** — MAJOR: countdown timer not rendered in `SealedBidVersus.tsx`; MINOR: `sealed-bid/solo/page.tsx` ArrowLeft RTL. 2-3 nights → ~90%. Status: open, lane 11.
- **Brain Drill word-replay (founder BUILD vote)** — build next. Status: open, lane 04/05.
- **MP round sentiment avg 1.4/3 (critical)** — root cause: special tiles unresponsive with bots (he locale). `exp-mp-round-issue-probe-v1` wired 07-24 to triage; needs server-side investigation of `server/multiplayer/` tile logic. Status: open, lane 01/03.
- **Telemetry classifier false-positives** — 25 of 33 "DEAD" events fire as `growth:<name>` not bare name; only ~10 dual-emit. FIX `nightly_coverage_classify` to probe `growth:<event>` volume before marking DEAD → backlog 33→~8. Genuine holes: survival `results_viewed` (58 completed, 0 events), connections `game_completed` deviator (`completed = status==='correct'` vs always-true). Status: resolving, lane 12.
- **Word Tower daily-leaderboard Layer B** — founder design call. Status: open, founder.
- **Blog cadence engine** — needs repeatable Higgsfield hero recipe (CLI install blocked). Status: #1 founder-content, lane 08.
- **GSC auth creds drift** — 07-23 returned `lf-finance.co.il` instead of lexiclash. HUMAN: re-verify. IndexNow Bing parity + AdSense re-submit + Higgsfield CLI + Sentry MCP write-403. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 3/6 ship (MCP-gated); REVOKE 07-19, redis guard 07-23; MCP down all 6 |
| 02 perf | `superpowers:systematic-debugging`, `playwriter` | 2 fixes <2% impact; needs headless Layout-Shifts capture (add playwriter) |
| 03 engagement | `frontend-design` | 4/5 — most reliable; 4 flags wired+evented; 0 zombie flags authored |
| 04 competitor | `humanizer`, `game-designer` | 2/2 ship; 6 evidence-backed ideas; Brain Drill won founder BUILD vote |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5/6 mode polish, 0 reverts; variable-reward axis |
| 06 seo | `seo-daily` | 4/4 rotation; ES `scrabble online` (12k impr); native review mandatory |
| 07 self-learn | none — prompt-only | corrected cull-filter-stale + gate-tail framing; 2/6 by rotation |
| 08 adsense | `humanizer`, `higgsfield-generate` | 2/2 rotation; ≥300w audits; hero-image blocked on CLI |
| 09 monetization | `frontend-design` | 5/5 (bundled with 03/12); no standalone features surfaced |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 1/6 rotation |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 5/6; shiritori 42→90 Released; sealed-bid 45% baseline |
| 12 telemetry | none — prompt-only | 6/6 research; classifier false-positive breakthrough 07-23 |

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
