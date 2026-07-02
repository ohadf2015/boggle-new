# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-27..07-02 (6 report nights).** Gate outcomes DEGRADED vs prior window: **3 CONSECUTIVE docs-only gate-salvages (06-28/29/30)** + a **07-01 01:00 preflight ABORT** (tree not on master / dirty — shared tree on `fix/he-daily-word-meaning`) + 5 lanes failed exit-75/1 on 07-01. Root of the 3 salvages = the gate Vitest/next-build TS-phase wedge; **fix landed 07-02 `c826e1924`** ("skip next-build TS phase in ALL gate tiers"). 07-02 ran clean. **0 pushed-code reverts** (salvage drops lane code pre-push, never a master regression). **Most reliable lanes: 02-perf 7/7 (avg 9.2m), 11-mode-qa 7/7 (avg 15.3m).** **Window wins:** (1) **word-tower readiness 58%→79%** (lane 11, 6 nights: crash guards, daily-challenge audit, dict-retry UI, a11y/i18n); (2) **4 mode-polish ships** — Hot Streak Perks (WT), Shiritori Category Chain Bonus, Word Forge Tier Labels, Sealed Bid decaying-multiplier (partial); (3) **3 autonomy Supabase RPC hardenings** (search_path + REVOKE, `upsert_push_token`/`get_friend_threads`); (4) **posthog-coverage.sh extractor fix** recovered 7 live events (mp_results_viewed 264/7d); (5) **Wiktionary clue-bank + Russian locale** push (07-01). **#1 infra: Supabase MCP token staleness — absent 6/6 nights, 3 migrations (20260628/29/30) still unapplied.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-30 (Word Vault):** "Word vault isn't actually fun — rework the puzzles + UI, should feel like a real escape room, fun to explore." Captured in lane-04 ideas (escape-room redesign, mastery hook, M effort). Lane 05/09 to pick up.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game/word topic w/ SEO keywords, education + newest angles ("use AI to learn a language"), link a game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-26 (word-tower physics, shipped `f35bcf57f`+):** lean/sway/notification-clear/HUD/crane/dup-block ✅. Open: green-part drops + celebrate; more upgrades; **DAILY-over-MP refocus** + daily-leaderboard backend (the ONE blocker to 90% readiness — needs founder design call: 1-attempt/day vs unlimited). Lane 05/11.
- **2026-06-24/25:** Education "free forever"→trial+price ✅. **STOP deferring to human — ship reversible work** (autonomy). Sealed-bid Showdown shipped.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d)
- **polish:try ×13 vs polish:pass ×1 = 93% try-rate** — broad mode appetite holds: brain-drill ×3, word-tower ×2, word-vault ×2, crane, sealed-bid, word-forge, crossword. Top lane-05 targets. (word-vault got the lone pass, then a fresh escape-room directive.)
- **idea:build ×6 vs idea:pass ×1 = 86% build-rate (n=7)** — appetite for concrete BUILDABLE ideas w/ named mode+file. Lane 04 must keep surfacing 1-3/night.
- **modeqa:ontrack:word-tower ×5-6** — lane 11 readiness cards trusted 6 nights running. Keep shipping them.
- **Zero night:good/meh + zero structured reddit:* callbacks this 7d.** One TEXT reddit directive: "start light promo comments to lexiclash.live." Silence = no dissatisfaction; accept it.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. (strongest, holding across every degraded night)
- **02-perf + 11-mode-qa are the reliability backbone** — both 7/7, no timeout, no salvage-drop. Asset/SSR perf wins + systematic mode-QA are the highest-yield lanes. (validated)
- **Lane 05 mode-polish via TDD on pure module + page-wire in one budget** — Hot Streak Perks, Shiritori bonus, Word Forge tiers all TDD-green, prefers-reduced-motion gated, all 5 locales. (validated)
- **Autonomy fast-path** — 3 reversible Supabase RPC hardenings shipped + marked 9am-skim, none needed a human. Founder-aligned; keep shipping reversible, defer only irreversible. (validated)
- **Salvage-on-gate-failure floor** — 06-28/29/30 all preserved lane code to `~/logs/lexi-nightly/salvaged-code-<tag>/` + shipped docs. Gate failure never zeroed a night. (validated — but 3-in-a-row is a cost, not a win; see "avoid")
- **Founder-directive fast path** — free-text directives = top of queue (Word Vault escape-room captured same night). (strongest)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish inside budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every degraded/failed lane still shipped its `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). Floor never zero. (validated)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read server dicts** (06-27, ~6MB client-leak fixed) — cumulative AdSense/LCP wins. (doctrine)
- **Helper-script-the-repeatable** — `posthog-coverage.sh` extractor bug fix (06-30) recovered 7 live events; scripts pay off. (validated)

## What to avoid (failed this week)
- **Gate wedge → 3 CONSECUTIVE docs-only salvages (06-28/29/30)** — next-build's silent "Running TypeScript" phase + full Vitest tripped the idle watchdog. Fix `c826e1924` (07-02) skips the next-build TS phase in ALL gate tiers. **MONITOR 07-03/04: if a salvage recurs, the fix is incomplete** — next step is scope-Vitest-to-changed-files + per-suite hard kill (never a 5400s idle). (was #1 test-infra; fix landed, verifying)
- **Supabase MCP token staleness — 6/6 nights, WORSENING** — no never-expire `SUPABASE_ACCESS_TOKEN` in nightly env → FK-index/RLS-initplan/auth-pool DB work deferred, 3 migrations (20260628/29/30) written-but-unapplied. **#1 infra.** Fix: mint never-expire PAT into nightly env + preflight refresh probe. (open, worsening)
- **07-01 preflight ABORT — shared tree on a feature branch + dirty** (`fix/he-daily-word-meaning`, RC-0 hazard) → whole 01:00 run rejected, 5 lanes failed exit-75/1. Nightly REQUIRES tree-on-master + clean; a concurrent session left it switched. Preflight should auto-stash/checkout-master or alert loudly, not silent-abort. (open)
- **Lane 03 keeps DEFINING flags with no render path** — `exp-blast-wave-banner-v1`, `exp-wordwheel-drag-hint-v1`, `exp-settings-lang-feedback-v1` all created/defined with 0 code call sites = zombie/dark flags, 0 evals. RULE (re-stated, keeps being violated): lane 03 must WIRE the conditional render in the SAME night, or NOT create the flag. Delete zombies before making new ones. (recurring)
- **Lane 05 over-scope — 8/8 file cap hit, sealed-bid page.tsx deferred** — engine+tests+translations shipped but UI unwired = a half-mode. Write ALL 5 locales FIRST, then pick a slice that fully wires in one budget. (high-frequency)
- **Lane 09 ship-drought — 0 code shipped 6/6 nights** (research-only or reverted). Monetization lane needs a concrete reversible slice per night (ad-UX flag, education upsell copy) — NOT another research doc. (open, worsening)
- **Unguarded `Record`/lookup access crashes modes** — `TOWER_SURPRISE_META[key]`, `PERKS[id]` crashed on unknown keys (fixed 06-27). Guard before wiring. (carry, lane 11)
- **>500-line files block flag-wiring + split** — `WordTowerPlay.tsx` / `WordTowerScene.tsx` / `wordTowerManager.ts` still over cap. (carry, lane 11)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding; 07-01 /en/multiplayer CLS=0.401 correctly cleared n≥52 → fixed 07-02.)
- **Reddit OAuth/JSON blocked → search source stale all window** (lane 04). Use RSS fallback, error-tolerant parse, stop retrying. (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. (kept)
- **Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation** — all banned, all held. (kept)

## Open watches (carry forward)
- **Supabase MCP token staleness** — mint never-expire PAT + preflight refresh probe; apply 3 pending migrations. Status: #1 infra, lane 02/01.
- **Gate wedge** — `c826e1924` fix landed 07-02; verify no salvage 07-03/04, else scope-to-changed + per-suite kill. Status: verifying, lane 07.
- **07-01-style preflight abort** — preflight should recover (stash + checkout master) or alert, not silent-reject a whole run. Status: open, lane 01/infra.
- **Word Tower daily-leaderboard backend (Layer B)** — the ONE blocker from 79%→90%; needs founder design call (1-attempt/day vs unlimited, singular scoring). Status: open, lane 11 + founder.
- **PostHog zombie/dark flags** — delete `exp-daily-hub-streak-nudge-v1`; wire-or-delete `exp-blast-wave-banner-v1`/`exp-wordwheel-drag-hint-v1`/`exp-settings-lang-feedback-v1`. Status: open, lane 03.
- **Sealed-bid page.tsx completion** — 4 edits specified in 07-02 artifact (rAF decay timer, display chip, multiplier pass, UI ship). Status: open, lane 05.
- **Telemetry `results_viewed` genuine-0** — 81 SP completions, 0 events (not a classifier gap); `daily_challenge_completed` added to CANONICAL_DUAL_EMIT 07-02. 56+ DEAD events remain. Status: open, lane 12.
- **`/es/multiplayer` LCP + `/en/multiplayer` INP** — need Chrome profiler trace (not headless-reproducible). Status: #1 perf, lane 02/03.
- **word-tower drop-feel + green-part drops + more upgrades + file-cap split** (founder 06-26). Status: open, lane 05/11.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked) + topic rotation. Status: #1 founder, lane 08.
- **ES "scrabble online" CTR gap** — vanity, structural; do NOT rewrite scrabble metadata, reframe to intent-matched markets. Status: ride, lane 06.
- **SECURITY DEFINER batch** — REVOKE PUBLIC sweep underway (2 done this window); bulk-audit rest before REVOKE. Status: open, lane 01.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 4/6 shipped (2 RPC hardenings); idempotent REVOKE + search_path pins |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 7/7, avg 9.2m — most reliable lane (asset+SSR+CLS wins) |
| 03 engagement | `frontend-design` | ships but keeps making dark flags — wire render-path FIRST |
| 04 competitor | `humanizer`, `game-designer` | idea:build 86% (n=7); surface buildable ideas w/ named mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 3/6 mode-polish shipped, 0 reverts (design non-negotiable) |
| 06 seo | `seo-daily` | 6/6 content shipped; native HE/SV/JA/ES review (mandatory keep) |
| 07 self-learn | none — prompt-only | ships every night (except 07-01 whole-run abort) |
| 08 adsense | `humanizer`, `higgsfield-generate` | blog ISR+JSON-LD 6/6; hero-image gen blocked on CLI install |
| 09 monetization | `frontend-design` | 0 code 6/6 (ship-drought) — needs a reversible slice/night |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | Wiktionary +988 clues + Russian locale (top throughput) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | readiness 58→79%; modeqa:ontrack ×5-6 |
| 12 telemetry | none — prompt-only | posthog-coverage.sh extractor fix recovered 7 live events |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (40+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
