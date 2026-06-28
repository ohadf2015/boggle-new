# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-23..06-28 (6 report nights + tonight).** **0 code reverts in window. ALL 12 lanes shipped 6/6** (degrades were MCP-absent advisor deferrals, never code faults). Gate outcomes: 0 reverts, 2 TESTS-INCONCLUSIVE (06-25/06-27, build-only re-gate passed), 1 docs-only gate-fail w/ code salvaged (06-23), 1 partial-drop (06-26). **Window wins: (1) word-tower readiness 38%→65%** (lane 11, 4 crash-guards fixed); **(2) MP brag card → named-rival fight poster** (`628b295f7`); **(3) condition-based daily quests + social feed** (`f98847780`+`c938b3e50`); **(4) Play-Games made live** (`8eb74f2e6`, was inert); **(5) results black-overlay framer-pin fixed** (`699344710`, PUSHED); **(6) asset re-encode sweep ~37MB** (celebration mp4 43→11M, mascot webp, word-vault sprites). **Founder live: blog-every-2-days** (lane 08). **#1 infra friction shifted: baseline-red gate poison is FIXED; now it's Supabase MCP token staleness — 4/6 nights silent-degraded perf/triage advisor work.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image (match existing blog image style), interesting words/word-game topic w/ SEO keywords, lean education + newest angles (e.g. "use AI to learn a language"), link a relevant game MODE sophisticatedly, witty + to-the-point, cite real sources. **Lane 08 owns; 04/06 feed topics + keywords.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending 6 nights).
- **2026-06-26 (word-tower physics, shipped `f35bcf57f`+ window):** lean/sway/notification-clear/HUD-overlap/crane-raise/dup-drop-block ✅. Open: **green-part drops + celebrate**; **more interesting upgrades** (10 wired). Lane 05/11.
- **2026-06-24/25:** Education "free forever"→trial+price ✅. **Word-tower: optimize DAILY CHALLENGE, de-emphasize MP** ⏳ open. **STOP deferring to human — ship reversible work** (autonomy). Sealed-bid Showdown shipped.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last 7d)
- **polish:try ×9 vs polish:pass ×1 = 90% try-rate** — broad mode appetite this window: word-vault, word-tower, word-forge, word-alchemy, shiritori, sealed-bid, crane, brain-drill. Top lane-05 targets. (crane got the lone pass.)
- **modeqa:ontrack:word-tower ×5** — lane 11 readiness cards trusted 5 nights running. Keep shipping them.
- **idea:build ×3, idea:pass ×0 = 100% build-rate (n=3)** — appetite for concrete BUILDABLE ideas holds. **Lane 04 must surface 1-3 buildable ideas/night w/ named target mode + file.**
- **Zero night:good/meh this 7d** — no fresh run-quality vote (silence = no dissatisfaction). **Zero reddit:* (40+ d)** — accept silence.

## What works (validated this week)
- **0 code reverts across the window; ALL 12 lanes 6/6.** Baseline-red gate poison FIXED last week → no gate-drops of clean code this window. (strongest)
- **Low-MCP / prompt-only lanes never time out** — 04/07/12 ship every night; #1 reliability lever = no MCP round-trips + no full-test self-check. (30+ nights)
- **Lane 05 mode-polish via TDD on pure modules + page-wire in one budget** — sealed-bid, word-tower physics, shiritori category-bonus all TDD-green, 0 reverts, prefers-reduced-motion gated. (validated)
- **Define→wire→emit FLAG in ONE lane** (lane 03) — flag-wiring sweep 6/6, 0 rollback, when render-path exists FIRST. Watch: dot-keys break PostHog (`blast.v2`→`blast-v2`). (validated)
- **Founder-directive fast path** — free-text directives = top of queue, same-run ship (tower physics, sealed-bid, education pricing, blog cadence). (strongest)
- **Salvage-on-gate-failure floor** — every degraded night (06-23 docs-only, 06-26 partial) preserved code + shipped docs + flagged. Gate failure never zeroed a night. (validated)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish inside budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage/timeout night still shipped its `docs/nightly/artifacts/lane-NN-*.md` (docs/ outside fe-next/, gate-clean). Floor never zero. (validated)
- **Asset re-encode = free perf, 0 risk** — celebration mp4 43→11M, mascot webp 8.7→6.8M, word-vault sprites pngquant 3→1M; all in-browser verified, asset-only. ~37MB window savings. (lane 02, doctrine)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read server dicts** — cumulative AdSense/LCP wins, dict client-leak fixed. (doctrine)
- **Multi-night refactor → big structural flip** — webpack switch (`dcdda2375`) landed only after route non-page exports moved to `_handlers`. Big wins ship when the blocker cleared a PRIOR night, not same-budget. (validated)

## What to avoid (failed this week)
- **Supabase MCP token staleness silent-degrades perf/triage** — 4/6 nights (06-25/26/27/28) MCP advisor absent → FK-index/unused-index/auth-pool work DEFERRED. Root: missing never-expire `SUPABASE_ACCESS_TOKEN` in nightly env + no preflight refresh. **NEW #1 infra.** (open)
- **Gate-runner full Vitest can still wedge** (06-25/06-27 TESTS-INCONCLUSIVE) — baseline-red fix EASED but a 900s idle wedge is structural. FIX: scope gate tests to changed files OR hard per-suite timeout+kill, never a 900s idle. (#1 test-infra, partly mitigated)
- **Reddit OAuth/JSON blocked → jq parse fails 4x** (lane 04) — search source stale all 6 nights. Wrap fetch in error-tolerant parse; OAuth un-configured, stop retrying. (kept)
- **Unguarded `Record`/lookup access crashes modes** — `TOWER_SURPRISE_META[key]`, `PERKS[id]` crashed on unknown keys; 3/4 guarded 06-27, double-scaling score open. Guard before wiring. (carry, lane 11)
- **>500-line files block flag-wiring** — `WordTowerPlay.tsx` 1248L / `WordTowerScene.tsx` 762L / `wordTowerManager.ts` 602L still over cap; modular split overdue. (carry, lane 11)
- **Over-scoped mode-polish (TDD + 5 locales + page-wire)** — write ALL 5 locales FIRST. (high-frequency)
- **Experiment whose variant-B has no conditional render** — check render-path EXISTS before creating the flag. (kept)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — 900s wedge. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. (kept)
- **Per-lane commits / headless realtime-table creation / Reddit OAuth retry** — all banned, all held. (kept)

## Open watches (carry forward)
- **Supabase MCP token staleness** — mint never-expire PAT into nightly env + preflight refresh. Status: NEW #1 infra, lane 02/01.
- **`/es/multiplayer` + `/en/multiplayer` LCP/INP** — /es LCP +23% structural (`ssr:false`×4, socket-gated); /en INP high. Needs Chrome profiler trace (not headless-reproducible). Status: open #1 perf, lane 02/03.
- **Gate-runner test wedge** — scope-to-changed-files or hard per-suite kill. Status: open #1 test-infra (eased).
- **word-tower drop-feel + green-part drops + more upgrades** (founder 06-26) + **DAILY-over-MP refocus** (06-24/25). Status: open, lane 05/11.
- **word-tower file-cap split + double-scaling score** (`wordTowerManager.ts`), setTimeout leak (`WordTowerScene.tsx`). Status: open, lane 11.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI sudo-install blocked 6 nights) + topic-rotation. Status: open #1 founder, lane 08.
- **PostHog flag dot-keys** — `blast.v2` style keys silently mis-route; rename to dashes. Status: open, lane 03.
- **Telemetry dead-event backlog** — `leaderboard_viewed` wired 0 fires; 55+ never-wired; brain-drill fixed 06-26 + verified 06-28. Status: open, lane 12.
- **ES "scrabble online" CTR gap** — 25k impr, pos 5.1, 0.1–0.6% CTR (vanity, structural — do NOT rewrite scrabble metadata; reframe to intent-matched markets). Status: ride, lane 06.
- **SECURITY DEFINER batch** — 68 functions; `upsert_push_token` REVOKE PUBLIC final 06-28; bulk audit rest before REVOKE. Status: open, lane 01.
- **`deploymentChangelog.generated.json` untracked diff every run** — gitignore or auto-gen check. Status: open, lane 01.
- **Education off-brand OG images** — copy swapped; mascot-correct Higgsfield images open. Status: open, lane 05/06/08.
- **IndexNow Bing parity (ES/SV/HE) + AdSense re-submit + Higgsfield CLI install** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 6/6; idempotent REVOKE migrations, search_path pins |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 6/6, 0 reverts — most reliable lane (asset+SSR wins) |
| 03 engagement | `frontend-design` | 6/6, flag-wiring sweep 0 rollback |
| 04 competitor | `humanizer`, `game-designer` | idea:build 100% (n=3) — surface buildable ideas w/ named mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | mode polish 6/6, 0 reverts (design non-negotiable) |
| 06 seo | `seo-daily` | 6/6; native HE/SV/JA/ES review (mandatory keep) |
| 07 self-learn | none — prompt-only | ships every night |
| 08 adsense | `humanizer`, `higgsfield-generate` | blog ISR+JSON-LD 6/6; hero-image gen blocked on CLI install |
| 09 monetization | `frontend-design` | 6/6; education pricing + tower upgrades, 0 reverts |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 6/6; infinite es/sv crosswords (top throughput) |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | readiness 38→65%; modeqa:ontrack ×5 |
| 12 telemetry | none — prompt-only | 6/6; user_identified + brain-drill game_started fixed |

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
