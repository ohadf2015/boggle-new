# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-20..06-26 (6 report nights + tonight).** Code-ship stayed BROAD, 0 code reverts in window. **Core 7 lanes — 02 perf, 03 engagement, 04 competitor, 05 polish, 08 adsense, 09 monetization, 10 dict — shipped 7/7, 0 reverts.** Lane 01 (triage) + 06 (seo) each 5/7 — the reverts trace to **infra (usage-limit cascade 06-20, stale Supabase MCP token exit-75 06-22)**, not lane code. New lanes **11 (mode-qa)** + **12 (telemetry)** maturing: 11 drove word-tower readiness 0→45% in the window; 12 fixed `user_identified` (06-25) + `brain-drill game_started` (06-26). **BIG WIN this week: the baseline-red gate poison got FIXED** — commits `d6ae0896d` (13 red files) + `e759e8624` (8 files/15 tests) + `415c39188` (bot-broadcast assertions) cleared the pre-push gate; that was the standing #1 "what to avoid". Founder word-tower directive (06-26) already partly landed in `b636fab59`.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-26 (word-tower, 1 directive, partly shipped `b636fab59`):** (1) tower drifts to side on bad drop — keep it near CENTER ✅ (towerLean decay); (2) too-fast/weird shake when unstable — move+shake but REAL/slower ✅ (towerSway period up); (3) notifications STUCK on screen ✅ (rewardFx hard-clear); (4) HUD top buttons OVERLAP ✅ (skin picker hidden <400px); (5) **drop mechanism better — celebrate + make green-part drops POSSIBLE** ⏳ open; (6) **all upgrades actually working + add MORE interesting upgrades** ⏳ partial (10 wired; "more interesting" open). Lane 05/11 own remaining drop-feel + new upgrades.
- **2026-06-24 (6 directives):** Education "free forever" copy FALSE → swapped to trial+price ✅ (lane 09). Education images off-brand → lane 05/06 open. **Word-tower: optimize DAILY CHALLENGE, de-emphasize MP** ⏳ open (lane 05/11). **STOP deferring to human — ship it all** (autonomy, all lanes). Sealed-bid poker + daily variant → Showdown slice shipped 06-25.
- **2026-06-23:** Standing priorities — (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth (route into real `/[locale]/education` pages), (4) AUTONOMY (ship reversible, defer only irreversible). Live preamble.
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. `polish:try` 7/8 confirms appetite.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, 12 records — positive)
- **polish:try ×7 / polish:pass ×1 = 88% try-rate** — tower physics, sealed-bid reveal, alchemy dir-hint, crossword capture-lock, word-forge target. Top targets for lane 05.
- **modeqa:ontrack ×3** — word-tower readiness cards landing positive 3 nights running. Lane 11 cards earning trust.
- **idea:build ×1** — FIRST idea-build callback in 35+d (channel had been polish-only). Lane 04 should surface 1 concrete buildable idea per night so this signal has a target.
- **Zero `night:meh`, zero `reddit:*`** — no run-quality dissatisfaction; reddit silence persists (35+d), accept it.

## What works (validated this week)
- **Core 7 lanes 7/7, 0 reverts: 02 perf, 03 engagement, 04 competitor, 05 polish, 08 adsense, 09 mon, 10 dict.** Lane 10 dict = highest file-throughput (6-8 files/night, infinite es/sv crosswords). Lane 02 = most reliable perf (FK indexes, RLS initplan, idempotent migrations). (validated, strongest)
- **Baseline-red triage actually FIXED** — `d6ae0896d`+`e759e8624`+`415c39188` cleared 21 red test files blocking the pre-push gate. The gate-poison failure that dropped clean lane code 06-22/23 is now resolving. (NEW, high)
- **Low-MCP / prompt-only lanes never time out** — 04/07/12 ship every night they run; #1 reliability lever = eliminate MCP round-trips + full-test self-checks. (20+ nights)
- **Lane 05 mode-polish via TDD on pure modules + page-wire in one budget** — tower lean/sway (`towerLean.ts`/`towerSway.ts`), sealed-bid Showdown, alchemy dir-hint all TDD-green, 0 reverts. prefers-reduced-motion gated. (validated)
- **Define→wire→emit FLAG in ONE lane** (lane 03) — `exp-wordhunt-hint-v1`, `exp-daily-hub-streak-nudge-v1`, `landing-variant-homepage-v1` all live, 0 rollback. Works when render-path exists FIRST. (validated)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship (tower physics 06-26 `b636fab59`, sealed-bid Showdown 06-25, education pricing swap). (strongest)
- **Salvage-on-gate-failure floor** — 06-22/23/24/25 preserved code (`salvaged-code-*` backups) + shipped docs + flagged `TESTS-INCONCLUSIVE`. Gate-runner failure never zeroed a night. (validated)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes that skip full tsc/build finish inside budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage/partial/timeout night still shipped its lane-NN artifact (docs/ outside fe-next/, gate-clean). Floor never zero. (6/6)
- **REST-API fallback when Supabase MCP down** + idempotent stuck-migrations (`IF NOT EXISTS` / zero-callsite guards). (validated)
- **`revalidate=N` over `force-dynamic`** — ISR + blog ItemList; cumulative AdSense/LCP wins, 0 regressions. Doctrine.

## What to avoid (failed this week)
- **Gate-runner full-test suite wedges 900s idle (06-22 + 06-24/25)** — full Vitest hangs on isolated-gate, hits exit-124 timeout, ships code UNVERIFIED (`TESTS-INCONCLUSIVE`). Should ease now baseline-red is cleared, but the wedge is structural. FIX: scope gate tests to changed files OR hard per-suite timeout + kill, never a 900s idle. (#1, partly mitigated)
- **No lane-start stagger under shared usage window** — 06-20 usage-limit cascade idle-killed 5 lanes (exit 124); 06-22 exit-75 reverted lanes 01+06. Need lane-start STAGGER + concurrency cap vs shared Claude quota. (open #1 infra)
- **Stale launchd Supabase MCP token** — `SUPABASE_ACCESS_TOKEN` drifts dead → exit-75 (06-22). Never-expire PAT minted but token-refresh-before-run still manual. (resolving)
- **`next build`/full `tsc`/full test in a LANE verify path** — Babel deopt + 900s wedge. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. Never reintroduce. (kept)
- **Over-scoped mode-polish in one budget** — TDD + 5 locales + page-wire = partial risk. Write ALL 5 locales FIRST. (high-frequency)
- **>500-line files block flag wiring + crash on unguarded Record access** — `WordTowerPlay.tsx` 1249L has unguarded lookups (`TOWER_SURPRISE_META[s.event]`, `TOWER_TIER_KEY[tier]`, `PERKS[id]`) that crash on unknown keys. Guard before wiring. (NEW, high — lane 11)
- **Experiment whose variant-B has no conditional render** — check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit OAuth/search-collector** — blocked 35+ nights, 0 signals; RSS fallback `c5b0c4c10`. Stop retrying OAuth; error-tolerant parse. (kept)

## Open watches (carry forward)
- **Gate-runner test wedge** — full Vitest 900s idle on isolated-gate. Scope-to-changed-files or hard per-suite kill. Status: open #1 infra (eased by baseline-red fix).
- **Shared-usage cascade** — stagger lane starts + cap concurrency vs shared Claude quota. Status: open #1 infra.
- **`/es/multiplayer` LCP regression** — 4× `ssr:false` dynamic imports, socket-gated; structural floor. Needs Chrome profiler trace. Status: open #1 perf, lane 02/03.
- **word-tower drop-feel + more upgrades** — founder 06-26: green-part drop possible + celebrate; "more interesting upgrades". Status: open, lane 05/11.
- **word-tower DAILY-over-MP refocus** — founder 06-24/25. Status: open, lane 05/11.
- **word-tower >500-line + crash guards** — `WordTowerPlay.tsx` 1249 / `WordTowerScene.tsx` 762 / `wordTowerManager.ts` 602; unguarded Record lookups. Status: open, lane 11.
- **`@arvidbt/swedish-words` ~6MB client bundle** — add to `next.config.ts` serverExternalPackages (fs-read server dict leaking to client). Status: open, lane 02 (cheap SPEED win). VERIFY the leak before acting (grep import path).
- **Telemetry backlog** — 59 DEAD events; `adventure` game_completed hole (start/0 complete) next. Status: open, lane 12.
- **Education off-brand images + free-forever copy** — copy swapped; mascot-correct images open. Status: open, lane 05/06.
- **ES "scrabble online" CTR gap** — ~10k impr, large click headroom; keyword-first title/desc rewrite in `juego-de-palabras-multijugador/page.tsx`. Status: ride, lane 06.
- **SECURITY DEFINER batch** — 68 functions; bulk audit before REVOKE. Status: open, lane 01.
- **`deploymentChangelog.generated.json` untracked diff every run** — gitignore or auto-gen check. Status: open, lane 01.
- **Dead flags (3)** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1`. Retire. Status: open, human.
- **IndexNow Bing parity** — ES/SV/HE gaps pending batch. Status: open, lane 06.
- **AdSense re-submit** — E-E-A-T bar cleared; manual op. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | idempotent migrations + REVOKE; 5/7 (reverts = infra, not code) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 7/7, 0 reverts — most reliable lane |
| 03 engagement | `frontend-design` | 3 dark exps wired live, 7/7, 0 reverts |
| 04 competitor | `humanizer`, `game-designer` | docs-only every night; idea:build ×1 this week — surface buildable ideas |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | tower/sealed-bid/alchemy polish 7/7, 0 reverts |
| 06 seo | `seo-daily` | 5/7; autonomous HE/SV/ES native review (revert = infra) |
| 07 self-learn | none — prompt-only | ships every night it runs |
| 08 adsense | `humanizer` | blog ISR + JSON-LD + E-E-A-T; 7/7, 0 gate failures |
| 09 monetization | `frontend-design` | 7/7; education pricing + tower upgrades, 0 reverts |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 7/7; infinite es/sv crosswords + clue banks (top throughput) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | readiness 0→45%; modeqa:ontrack ×3 |
| 12 telemetry | none — prompt-only | user_identified + brain-drill game_started fixed |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (35+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
