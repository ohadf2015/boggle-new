# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-28..07-03 (6 settled report nights; 07-03 gate runs AFTER lanes — unknowable from lane 07).** Gate reliability RECOVERED late-window: **3 consecutive docs-only salvages (06-28/29/30)** from the gate Vitest/next-build TS-phase wedge → **fix `c826e1924` landed 07-02** ("skip next-build TS phase in ALL gate tiers"). **07-02 shipped nightly-authored code** (`78cbd1c9e`) + a salvage-safety fix (`27f61a310` "re-verify before docs-only drop-all + resilient telegram alerts"), so the wedge appears resolved — **MONITOR 07-03/04 for recurrence**. **07-01 01:00 preflight ABORT** (shared tree on `fix/he-daily-word-meaning`, dirty) rejected the whole run; 8h-later recovery run (`081801`) partially completed. **0 pushed-code reverts all window** — salvage drops lane code pre-push, never regresses master; the window still merged substantial real code (blast feel batch, word-tower crane+bloxx, MP combo/rejoin, daily word-quality, Russian locale, perf JWT-verify). **Most reliable lanes: 02-perf, 05-landing, 06-seo, 11-mode-qa, 12-telemetry all ~7/7.** **Window wins:** word-tower readiness **58%→82%** (lane 11); mode-polish ships (Shiritori Category Chain, Word Forge Tier Labels, Word Alchemy elemental burst, Sealed Bid partial); Russian 6th locale; Wiktionary +988 clues; daily word-quality bulletproofing. **#1 infra STILL: Supabase MCP token staleness — down 06-27..06-30 (4 nights), 07-01+ recovered but flaky (07-03 3 failed probes then OK); 3 migrations (20260628/29/30) written-but-unapplied.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-30 (Word Vault):** "Word vault isn't actually fun — rework the puzzles + UI, should feel like a real escape room, fun to explore." Lane 04 idea captured (escape-room redesign, M effort). Lane 05/09 to pick up. (word-vault got a fresh `polish:try` this window — appetite confirmed.)
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic w/ SEO keywords, education + "use AI to learn a language" angles, link a game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-26 (word-tower physics, shipping since `f35bcf57f`):** lean/sway/crane/HUD/drop-feel ✅ (crane scores visible load `ace446f72`, Bloxx momentum drops `9db96d51a`). Open: **DAILY-over-MP refocus + daily-leaderboard backend (Layer B)** = the ONE blocker 82%→90%; needs founder design call (1-attempt/day vs unlimited; spec `docs/specs/word-tower-daily-seed.md`). Lane 05/11 + founder.
- **2026-06-24/25:** Education "free forever"→trial+price ✅. **STOP deferring to human — ship reversible work** (autonomy). Sealed-bid Showdown engine shipped.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d, n=17)
- **polish:try ×11 across 9 modes, 0 pass/drop/promote** — broad mode appetite, zero rejection: brain-drill ×2 (top), shiritori, word-forge, sealed-bid, word-tower, word-vault, word-alchemy, crossword, anagram ×1 each. Top lane-05 targets. n too small to rank beyond "brain-drill leads."
- **idea:build ×4 vs idea:pass ×1 = 80% build-rate (n=5)** — appetite for concrete BUILDABLE ideas w/ named mode+file. Lane 04 keep surfacing 1-3/night.
- **modeqa:ontrack:word-tower ×2** — lane 11 readiness cards still trusted. Keep shipping them.
- **Zero night:good/meh + zero reddit:* callbacks this 7d.** Silence = no dissatisfaction; accept it.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. Window still merged big real code (blast, word-tower, MP, Russian, perf). (strongest, holds every night)
- **02-perf + 11-mode-qa + 05-landing + 06-seo + 12-telemetry ~7/7** — the reliability backbone. Asset/SSR/CLS perf wins, systematic mode-QA, mode-polish, native-review SEO, event-registry maintenance = highest-yield lanes. (validated)
- **Lane 05 mode-polish via TDD on pure module + page-wire in one budget** — Shiritori Category Chain, Word Forge Tier Labels, Word Alchemy elemental burst all TDD-green, prefers-reduced-motion gated, 5 locales. (validated)
- **Autonomy fast-path** — reversible Supabase RPC hardenings + mode polish shipped + marked 9am-skim, none needed a human. Founder-aligned. (validated)
- **Salvage-on-gate-failure floor** — 06-28/29/30 preserved lane code to `~/logs/lexi-nightly/salvaged-code-<tag>/` + shipped docs; `27f61a310` added re-verify-before-drop + resilient alerts. Gate failure never zeroed a night. (validated — but 3-in-a-row was a cost; see "avoid")
- **Founder-directive fast path** — free-text directives = top of queue (Word Vault escape-room captured same night). (strongest)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish in budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every degraded/failed lane still shipped its `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). Floor never zero. (validated)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read server dicts** + **local JWT verify on read-only GET routes** (`583c5034b`,`0bf1278d4`) — cumulative AdSense/LCP/auth-latency wins. (doctrine)
- **Helper-script-the-repeatable** — `posthog-coverage.sh` extractor fix recovered 7 live events. (validated)

## What to avoid (failed this week)
- **Gate wedge → 3 CONSECUTIVE docs-only salvages (06-28/29/30)** — next-build's silent "Running TypeScript" phase + full Vitest tripped the 5400s idle watchdog. Fix `c826e1924` (07-02) skips the next-build TS phase in ALL gate tiers; 07-02 shipped code = fix appears live. **MONITOR 07-03/04: if a salvage recurs, fix is incomplete** — next step is scope-Vitest-to-changed-files + per-suite hard kill (never a 5400s idle). (was #1 test-infra; fix landed, verifying)
- **Supabase MCP token staleness — 4-night drought 06-27..06-30, still flaky (07-03 3 failed probes → OK)** — blocked FK-index/RLS-initplan/auth-pool DB work; 3 migrations (20260628/29/30) written-but-unapplied. **#1 infra.** Fix: mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env + preflight refresh probe + retry-with-backoff on cold boot. (open, recovering but not fixed)
- **07-01 preflight ABORT — shared tree on a feature branch + dirty** (`fix/he-daily-word-meaning`) → whole 01:00 run rejected, 5 lanes failed exit-75/1, 8h recovery. Preflight should auto-stash + checkout-master or alert LOUDLY, not silent-reject. (open)
- **Lane 03 — VERIFY flag wiring, not just definition** — window improved (exp-wordhunt-hint, exp-landing-quick-play-v1 wired w/ render path), but RULE stands: WIRE the conditional render the SAME night or don't create the flag; delete zombies before new ones. (recurring, improving)
- **Lane 05 over-scope — file-cap hit, Sealed Bid page.tsx deferred (8/12 files 07-02)** — engine+tests+translations shipped but UI unwired = a half-mode. Write ALL 5 locales FIRST, then pick a slice that fully wires in one budget. (high-frequency)
- **Lane 09 ship-drought** — monetization lane thin on shipped code; needs a concrete reversible slice/night (ad-UX flag, education upsell copy), NOT another research doc. (open)
- **Unguarded `Record`/lookup access crashes modes** — `TOWER_SURPRISE_META[key]`, `PERKS[id]` (fixed 06-27). Guard before wiring. (carry, lane 11)
- **>500-line files block flag-wiring + split** — `WordTowerPlay.tsx`/`WordTowerScene.tsx`/`wordTowerManager.ts` over cap. (carry, lane 11)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding; /en/multiplayer CLS correctly cleared then fixed `AutoHideHeader` 07-02.)
- **Reddit OAuth/JSON blocked → search source stale all window** (lane 04). Use RSS fallback, error-tolerant parse, stop retrying. (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. (kept)
- **Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation** — all banned, all held. (kept)

## Open watches (carry forward)
- **Supabase MCP token staleness** — mint never-expire PAT + preflight refresh probe + cold-boot retry; apply 3 pending migrations. Status: #1 infra, lane 02/01.
- **Gate wedge** — `c826e1924` landed 07-02, 07-02 shipped code; verify no salvage 07-03/04, else scope-to-changed + per-suite kill. Status: verifying, lane 07.
- **07-01-style preflight abort** — preflight should recover (stash + checkout master) or alert, not silent-reject. Status: open, lane 01/infra.
- **Word Tower daily-leaderboard backend (Layer B)** — the ONE blocker 82%→90%; needs founder design call. Status: open, lane 11 + founder.
- **PostHog zombie/dark flags** — audit all defined flags for 0 call sites; wire-or-delete. Status: open, lane 03.
- **Sealed-bid page.tsx completion** — rAF decay timer, display chip, multiplier pass, UI ship. Status: open, lane 05.
- **Telemetry dead events** — ~56 DEAD of 110 registered; `daily_challenge_completed` added to CANONICAL_DUAL_EMIT 07-02; `results_viewed` genuine-0 + `game_started` random-mode-premature open. Status: open, lane 12.
- **`/es/multiplayer` LCP + `/en/multiplayer` INP** — need Chrome profiler trace (not headless-reproducible). Status: #1 perf, lane 02/03.
- **word-tower green-part drops + more upgrades + file-cap split** (founder 06-26). Status: open, lane 05/11.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked) + topic rotation. Status: #1 founder, lane 08.
- **SECURITY DEFINER batch** — REVOKE PUBLIC sweep underway; bulk-audit rest before REVOKE. Status: open, lane 01.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 6/7 shipped; idempotent REVOKE + search_path pins |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 7/7 — reliability backbone (asset+SSR+CLS+JWT-verify) |
| 03 engagement | `frontend-design` | 7/7; flags now wired w/ render path — keep verifying wiring |
| 04 competitor | `humanizer`, `game-designer` | idea:build 80% (n=5); surface buildable ideas w/ named mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | mode-polish 7/7, 0 reverts (design non-negotiable) |
| 06 seo | `seo-daily` | 7/7 content; native HE/SV/JA/ES review (mandatory keep) |
| 07 self-learn | none — prompt-only | ships every night (except 07-01 whole-run abort) |
| 08 adsense | `humanizer`, `higgsfield-generate` | blog ISR+JSON-LD 6/7; hero-image gen blocked on CLI install |
| 09 monetization | `frontend-design` | ship-drought — needs a reversible slice/night |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | Wiktionary +988 clues + Russian locale (top throughput) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | readiness 58→82%; modeqa:ontrack ×2 |
| 12 telemetry | none — prompt-only | 7/7; event-registry + dual-emit fixes |

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
