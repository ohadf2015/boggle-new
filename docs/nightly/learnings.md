# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-09..06-14 (6 report nights).** Code-ship by lane: 01=5/6 (06-09 skipped), 02=6/6, 03=6/6 (06-13 partial), 04=6/6, 05=6/6 (06-12 partial 4-langs), 06=6/6, 07=6/6, 08=5/6, 09=4/4 (10-13), 10=4/4 (10-13). Gate fully clean: **1/6 (06-10)**; rest salvaged/red. **Push failed 2/6 (06-11, 06-13)** — local commit preserved both times, daemon/remote sync the recurring failure mode now (gate-OOM is rarer). Mandatory-Artifact floor kept all 6 nights non-zero. **Dark-experiment gap NARROWED but unclosed:** all 3 (`exp-mp-quickplay-wait-v1`, `exp-invite-arrival-clarity-v1`, `exp-practice-wheel-cta-v1`) are now CODE-COMPLETE + WIRED + tested — the last graduated from registered-not-wired to wired-on-06-14. ZERO PostHog flags ≥5 nights. 94 quickPlay rage-clicks/7d + 83% invite drop + 43% practice drop all measured, all dark. **Human flag-creation is the loop's single biggest leak.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13:** "Word vault isn't fun — rework puzzles + UI, should feel like a real escape room." Lane 05 reworked the HUB (removed WorldmapPanel modal → always-visible inline corridor of 6 doors; +3 analytics events). Puzzle MECHANICS (cipher/logic depth) + A/B still deferred — directive NOT fully discharged. Status: open, lane 05.
- **Polish party games (admin-only)** (2026-06-05). Lane 05. `polish:try` is the priority queue. Last-7d: **polish:try ×7 vs idea:build ×2** — polish is the dominant appetite. try slugs this window: shiritori×2, crane×2, crossword, word-tower, word-alchemy. New modes/tiles stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap still ~8. Ship all 5 locales in one night; write translations FIRST.

## Telegram-button feedback (last 7d)
- **polish:try ×7 / polish:pass ×0** — pure-positive on polish; shiritori + crane each drew 2 tries (top targets for lane 05).
- **idea:build ×2 / idea:pass ×1 = 67% build rate** (down from 80%) — daily-mode-idea appetite cooling vs polish. Lane 04 keep surfacing, lane 05 prioritise polish over new ideas.
- **night:good ×0 / night:meh ×0** — run-quality button under-engaged (15+ nights). No self-critique trigger (threshold meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 25+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-14)
- **PostHog flags never created (highest, ≥5 nights, blocked-on-human)** — 3 experiments fully wired+translated+tested but dark: `exp-mp-quickplay-wait-v1` (06-09, quickPlay overlay), `exp-invite-arrival-clarity-v1` (06-10, status card), `exp-practice-wheel-cta-v1` (wired 06-14, retry CTA). Lane 03 MUST emit a "FLAG NEEDED: <key> <variants> <hypothesis>" digest block every night until flags exist.
- **Invite funnel 83% drop** — `invite_redirect_fired`→`invite_consumed` 18→3/7d, 94 quickPlay rage-clicks. Two dark experiments target it. Status: open, instrumented.
- **Practice funnel 43% drop** — `/es/practice/wheelRush` 47→27/7d (78.6% in 24h). `exp-practice-wheel-cta-v1` wired 06-14. Status: open, instrumented, dark pending flag.
- **`/he` home CLS 0.386 + LCP 4764ms (POOR)** — NEW 06-14, n=8 (sub-floor); RTL font-swap / direction-recalc suspected. Status: open, re-measure at n≥50 before naming suspect.
- **`/es/multiplayer` INP** — 244→614→352→452ms over the window; assessed as traffic-composition noise (no code regression found). LCP IMPROVING post-ISR: 4903→1706→…→3572ms. Status: MONITOR, do not flag below 2-night confirm.
- **`/en` home INP 360ms (n=53)** — undiagnosed, above floor. Status: open, profile.
- **Spanish "scrabble" surge** — "scrabble online" +44% impr (4669→6749), "scrabble online español" +1283% WoW, "jugar al scrabble" +231%. Pos 5.9→5.6. Status: ride hard (lane 06).
- **Hebrew daily queries** — `המילה היומית` +907% WoW (144→205 impr, pos 8.7); internal link shipped 06-11/12. Status: resolving, awaiting crawl.
- **Bing parity gap** — 105 missing top-10 queries, IndexNow batch ready. Status: open.

## Idea backlog (founder-signalled, ~67% build rate)
Lane 04 S-effort dailies: Pyramid Descent, Reverse Dictionary, Word Telescope, Shadow Word, Logic Mosaic, Clue Budget Daily. Lane 05 builds admin-gated — but polish OUTRANKS new ideas this window. Zero mechanic repeats in 30+ surfaced.

## What works (validated this week)
- **Founder-directive fast path** — free-text directives = top of queue, beat button signals. Word-vault hub reworked same window it was raised. (strongest)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 = 18/18 ship 06-09..06-14. #1 reliability lever = eliminate MCP round-trips. (18+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage/red night still shipped its artifact. Floor never zero. (6/6)
- **`revalidate=N` over `force-dynamic`** on SSR-cacheable routes — `/es/multiplayer` LCP 4903→1706ms (06-09), 27 blog pages 24h-cached (06-11), daily word-wheel/word-hunt (06-09). Zero regressions. Doctrine.
- **Author-then-ship in ONE budget** — AutoHideHeader CLS only closed 06-10 when one lane edited AND landed. Don't carry written-but-unshipped fixes.
- **Security hardening via DEFINER/RLS REVOKE** (lane 01) — `grant_offerwall_coins`, `upsert_player_word`, `upsert_community_word`, `upsert_level_completion`, `web_vitals` INSERT, `teacher_access_requests` INSERT — 6 shipped this window, 0 reverts, all reversible. Autonomous doctrine.
- **Drop unused indexes (0 scans)** (lane 01) — `idx_user_reports_pending/_target`, `idx_blocked_entities_expires_at`, `idx_school_leads_created`. Safe, reversible. (4 this window)
- **TDD on new pure modules** — highest ship rate for new code (comboStats, towerArchitectTier, ghostMultiplier, share cards, near-miss shudder). (stable)
- **frontend-design for mode polish** — every polish component shipped clean, 0 reverts, prefers-reduced-motion gated. (stable)
- **n≥50 sample-floor gate** (lane 02) — held `/es/multiplayer` INP swing as MONITOR not regression. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Shard pre-push tests by measured cone size** (`ef650a29e`, `03d6abaed`) — killed exit-144 OOM on translation/LanguageContext mega-hubs. (new doctrine)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)

## What to avoid (failed this week)
- **Wiring an experiment without a flag-creation handoff** — 3 dark experiments ≥5 nights. Lane 03 MUST emit "FLAG NEEDED: <key> <variants> <hypothesis>" to the digest. (highest, persisting)
- **Push-fail stranding** — 06-11 + 06-13 both failed to push (remote/daemon race); local commit survived but unsynced. Runner MUST rebase-then-push, verify by GREPPING origin content not SHA. (now the #1 gate-adjacent failure)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one 15-min budget = partial/timeout. Pick ONE polish; ship locales FIRST. (highest-frequency)
- **Working-set cap (~8) dropping a locale** — 05 hit cap → ES incomplete 06-12. Write translations BEFORE component/page. (high)
- **Vitest heap OOM wedging the gate** — 06-11 OOM'd gate (5 files fail, 2638 pass); heap at 8GB still fragile on dictionary/mega-hub nights. Pair with cone-sharding. (watch)
- **Flagging a Web-Vitals regression on sub-floor/noisy sample** — never name a suspect below n≥50 in BOTH runs; single-night INP swings = composition noise. (holding)
- **Registering an experiment but not wiring it to UI** — fixed for `exp-practice-wheel-cta-v1` (wired 06-14); register + wire + flag-handoff in ONE pass. (resolved-this-window)
- **`rg` as sole search path** — EACCES blocked callsite verification before; keep `find|xargs grep` fallback. (high)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 25+ nights, 0 signals. RSS only; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **PostHog flag-creation backlog** — 3 dark experiments. Status: blocked-on-human, surface every digest.
- **Invite 83% / Practice 43% funnel drops** — instrumented + wired, dark pending flags. Status: open.
- **`/he` home CLS 0.386 + LCP 4764ms** — new, sub-floor, re-measure. Status: open.
- **`/es/mp` INP 452ms / `/en` INP 360ms** — noisy/undiagnosed. Status: monitor.
- **Word-vault puzzle depth** (06-13 directive) — hub reworked; cipher/logic mechanics + A/B deferred. Status: open, lane 05.
- **Bing parity** — 105 missing top-10 queries, IndexNow batch ready. Status: open.
- **AdSense E-E-A-T** (lane 08) — all 27 blog pages ISR (06-11); author/bylines partial; schema propagation ~7d. Status: open, re-submit after crawl.
- **Gate clean-rate 1/6** — salvage/partial most nights; push-fail + vitest-OOM the two wedge modes. Status: watch.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered flags** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0 converts). Prune or fix tracking. Status: open.
- **Lane 09 monetization 4/4 (10-13)** — ad-UX/upsell shipping; offerwalls dark (no offline-ad-net A/B infra). Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 6 DEFINER/RLS REVOKEs + 4 index drops 06-09..06-14, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic + cone-shard OOM fix shipped 06-09/10/12 |
| 03 engagement | `frontend-design` | quickplay/invite/practice overlays wired 06-09..06-14 (dark pending flag) |
| 04 competitor | `humanizer` | 6/6; ideas + reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 06-09..06-14 polish + word-vault hub all shipped, 0 reverts |
| 06 seo | `seo-daily` | 6/6; ES scrabble +44–1283% impr, HE daily +907% |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 5/6; 27 blog ISR + JSON-LD; verification meta tag 06-13 |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback; OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (25+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
