# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-22..06-27 (6 report nights + tonight).** Code-ship stayed BROAD, **0 code reverts in window**. **Core game/perf lanes — 02 perf, 03 engagement, 04 competitor, 05 polish, 06 seo, 10 dict, 11 mode-qa — shipped 6/6.** 01 triage 5/6, 07 self-learn 5/6 (reverts = infra: exit-75 stale-token 06-22/23, not lane code). 08/09/12 = 4/6 (MCP-degraded nights, not code faults). **THREE big wins landed: (1) baseline-red gate poison FIXED** — `d6ae0896d`+`e759e8624`+`415c39188` cleared 21 red files that had been dropping clean lane code; **(2) build engine flipped turbopack→webpack** (`dcdda2375`, ~3.5× less homepage JS) after the route-export refactor (`8f9bc4fb7`,`2d111a5ec`); **(3) app-wide CWV** — CookieConsent CLS kill (`9d25b7a3d`), MP lobby SSR (`a83548724`), prefetch-storm cut (`d954247cc`). **Word-tower readiness 0→58%** over the window (lane 11). Founder tonight: **new blog every 2 days** (lane 08 owns — image-generated, words/education topic, mode-link, cited sources).

## FOUNDER DIRECTIVE — highest priority
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image (match existing blog image style), interesting words/word-game topic with SEO keywords, lean into education + newest angles (e.g. "use AI to learn a language"), link to a relevant game MODE in a sophisticated way, witty + to-the-point, cite/link real sources (research, news, blogs, reddit if used). **Lane 08 owns; lanes 04/06 feed topic + keyword research.**
- **2026-06-26 (word-tower physics, shipped `b636fab59`+`228e0482b`+`d78e6b6f6`+`709a3c2c8`):** lean/sway/notification-clear/HUD-overlap ✅. Open: **green-part drops possible + celebrate**; **more interesting upgrades** (10 wired). Lane 05/11.
- **2026-06-24/25:** Education "free forever" → trial+price ✅. **Word-tower: optimize DAILY CHALLENGE, de-emphasize MP** ⏳ open (lane 05/11). **STOP deferring to human — ship reversible work** (autonomy, all lanes). Sealed-bid Showdown shipped.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d — strongly positive)
- **idea:build ×12 vs idea:pass ×4 = 75% build-rate** — MAJOR shift (was ×1 in 35d). Some are likely smoketest-seed, but appetite for concrete BUILDABLE ideas is now loud. **Lane 04 must surface 1-3 buildable ideas/night with a named target mode + file.**
- **polish:try ×40 / polish:pass ×3 = 93% try-rate** — broad mode appetite: sealed-bid, word-tower, word-forge, word-alchemy, word-vault, crane, crossword, shiritori, party, brain-drill, blast. Top lane-05 targets.
- **modeqa:ontrack:word-tower ×4** — lane 11 readiness cards trusted 4 nights running.
- **night:good ×3, night:meh ×2** (1 smoketest, 1 aged 06-03) — no fresh run-quality dissatisfaction.
- **test:works ×3** — results QA harness signal positive. **Zero reddit:* (35+d)** — accept silence.

## What works (validated this week)
- **0 code reverts across the window; core 7 lanes 6/6.** Lane 10 dict + 06 seo = highest throughput (6 files/night). Lane 02 perf = most reliable structural wins (FK indexes, RLS initplan, SSR flips). (strongest)
- **Baseline-red gate poison FIXED** — `d6ae0896d`+`e759e8624`+`415c39188` cleared 21 red files. The #1 standing gate-drop cause is resolved; TESTS-INCONCLUSIVE frequency should fall. (NEW, high)
- **Multi-night refactor → engine flip** — webpack switch (`dcdda2375`) landed only after route non-page exports were moved to `_handlers` siblings (`2d111a5ec`,`8f9bc4fb7`). Big structural wins ship when the blocker is cleared in a PRIOR night, not same-budget. (NEW)
- **Low-MCP / prompt-only lanes never time out** — 04/07/12 ship every night they run; #1 reliability lever = no MCP round-trips + no full-test self-check. (25+ nights)
- **Lane 05 mode-polish via TDD on pure modules + page-wire in one budget** — tower lean/sway, sealed-bid, alchemy dir-hint, centerMagnet all TDD-green, 0 reverts, prefers-reduced-motion gated. (validated)
- **Define→wire→emit FLAG in ONE lane** (lane 03) — 7 experiments live, 0 rollback, when render-path exists FIRST. (validated)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship (tower physics 06-26, sealed-bid 06-25, education pricing). (strongest)
- **Salvage-on-gate-failure floor** — every degraded night (06-22/23/25/26) preserved code + shipped docs + flagged `TESTS-INCONCLUSIVE`/partial-drop. Gate failure never zeroed a night. (validated)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes that skip full tsc/build finish inside budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage/timeout night still shipped its lane-NN artifact (docs/ outside fe-next/, gate-clean). Floor never zero. (validated)
- **`revalidate=N` over `force-dynamic`** — ISR + blog ItemList; cumulative AdSense/LCP wins, 0 regressions. Doctrine.
- **serverExternalPackages for fs-read server dicts** — `@arvidbt/swedish-words` 6MB client leak fixed by listing dict packages; verify import path before acting. (NEW, resolved)

## What to avoid (failed this week)
- **Gate-runner full Vitest can still wedge (06-25 TESTS-INCONCLUSIVE, 06-26 partial-drop)** — baseline-red fix EASED it but a 900s idle wedge is structural. FIX: scope gate tests to changed files OR hard per-suite timeout+kill, never a 900s idle. (#1 infra, partly mitigated)
- **Stale launchd Supabase/Sentry MCP token → exit-75 (06-22/23) + MCP-absent boots (06-25/26/27)** — retry recovered most, but lane 02 deferred DB-advisor work on absent nights. Token-refresh-before-run still manual. (resolving)
- **No lane-start stagger under shared Claude usage window** — 06-20 cascade idle-killed 5 lanes; need lane-start STAGGER + concurrency cap. (open #1 infra)
- **`next build`/full `tsc`/full test in a LANE verify path** — 900s wedge + Babel deopt. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. (kept)
- **>500-line files block flag-wiring + crash on unguarded Record access** — `WordTowerPlay.tsx` 1248L / `WordTowerScene.tsx` 762L / `wordTowerManager.ts` 602L still over cap; unguarded lookups crash on unknown keys. Guard before wiring; modular split overdue. (carry, lane 11)
- **Over-scoped mode-polish (TDD + 5 locales + page-wire)** — write ALL 5 locales FIRST. Sealed-bid needed 3 nights (06-22/23/25) to settle. (high-frequency)
- **Experiment whose variant-B has no conditional render** — check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Per-lane commits / headless realtime-table creation / Reddit OAuth retry** — all banned, all held. (kept)

## Open watches (carry forward)
- **`/es/multiplayer` + `/en/multiplayer` LCP/INP** — /es LCP +53% over window (structural `ssr:false`×4, socket-gated); /en INP 504ms + CLS 0.392. Needs Chrome profiler trace. Status: open #1 perf, lane 02/03.
- **Gate-runner test wedge** — scope-to-changed-files or hard per-suite kill. Status: open #1 infra (eased).
- **Shared-usage cascade** — stagger lane starts + cap concurrency. Status: open #1 infra.
- **word-tower drop-feel + green-part drops + more upgrades** — founder 06-26. Status: open, lane 05/11.
- **word-tower DAILY-over-MP refocus** — founder 06-24/25. Status: open, lane 05/11.
- **word-tower file-cap split + crash guards + double-scaling score** (`wordTowerManager.ts:159`), setTimeout leak (`WordTowerScene.tsx:372`), swallowed network errors. Status: open, lane 11.
- **Telemetry: `leaderboard_viewed` wired 06-23 but 0 fires** (PostHog init timing?); `brain-drill game_started` wired 06-26, 0 plays since; `adventure` 0 completes (by-design). 55+ never-wired backlog. Status: open, lane 12.
- **Blog cadence engine** — founder 06-27 wants new blog every 2d; needs a topic-rotation + Higgsfield hero-image recipe so it's repeatable, not hand-crafted. Status: NEW, lane 08.
- **Education off-brand OG images** — copy swapped; mascot-correct Higgsfield images open. Status: open, lane 05/06/08.
- **ES "scrabble online" CTR gap** — 11,689 impr, pos 5.1, large click headroom; keyword-first title/desc rewrite in `juego-de-palabras-multijugador/page.tsx`. Status: ride, lane 06.
- **SECURITY DEFINER batch** — 68 functions; bulk audit before REVOKE. Status: open, lane 01.
- **`deploymentChangelog.generated.json` untracked diff every run** — gitignore or auto-gen check. Status: open, lane 01.
- **Dead flags (3)** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1`. Retire. Status: open, human.
- **IndexNow Bing parity (ES/SV/HE) + AdSense re-submit** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | idempotent migrations + REVOKE; 5/6 (reverts = infra) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 6/6, 0 reverts — most reliable lane |
| 03 engagement | `frontend-design` | 7 exps wired live, 6/6, 0 reverts |
| 04 competitor | `humanizer`, `game-designer` | idea:build ×12 this week — surface buildable ideas w/ named mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | tower/sealed-bid/alchemy polish 6/6, 0 reverts |
| 06 seo | `seo-daily` | 6/6; native HE/SV/JA/ES review (mandatory keep) |
| 07 self-learn | none — prompt-only | ships every night it runs |
| 08 adsense | `humanizer`, `higgsfield-generate` | blog ISR + JSON-LD; NEW blog-every-2d needs hero-image gen |
| 09 monetization | `frontend-design` | education pricing + tower upgrades, 0 reverts |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 6/6; infinite es/sv crosswords (top throughput) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | readiness 0→58%; modeqa:ontrack ×4 |
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
