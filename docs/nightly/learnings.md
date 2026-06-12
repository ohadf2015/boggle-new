# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-07..06-12 (6 report nights).** 6-night code-ship: **04=6/6, 06=6/6, 07=6/6**, 01/03/08=5/6, 02/05/10=4/6, **09=3/6**. Gate clean: **2/6** (06-08 `f30186b84` baseline-red, 06-10 `fb0fa672`); 06-07=push-fail+unverified, 06-09=docs-salvage (vitest OOM), 06-11=docs-salvage, 06-12=in-flight. Mandatory-Artifact floor kept all 6 nights non-zero. CLOSED this window: AutoHideHeader CLS 0.29 (06-10 spacer-div), WordWheelPixiRing `null.clear()` (06-10 try/catch), `practice_abandoned` event (06-12), Hebrew daily internal link (06-12 HomepageContentSection all 5 locales). **Dominant gap unchanged + WORSE: experiments wired-but-dark grew to 3** — `exp-mp-quickplay-wait-v1`, `exp-invite-arrival-clarity-v1`, `exp-practice-wheel-cta-v1` all code-complete, translated, tested, ZERO PostHog flags. 94 `/es/multiplayer` rage-clicks/7d sit unaddressed because both targeting experiments are dark. The human flag-creation step is the loop's single biggest leak.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **Polish party games (admin-only).** Lane 05 scope. `polish:try` is the priority queue. Last-7d: **polish:try ×8 vs polish:pass ×2** — strongest single appetite signal. try slugs: crane, crossword, party, shiritori×2, word-alchemy, word-forge, word-tower. word-vault = clean pass (deprioritize); crossword = MIXED (drew both try+pass — content not ordering). Shipped polish this window: ForgeHeatBar, CaptionClash crowd-verdict, ShiritoriComboMeter, TowerArchitectTier, ShiritoriGhostMultiplier, AlchemyShareCard. New modes stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`. Ship all 5 locales in one night. Wall-clock finalize cutoff is the real limit. (Lanes 05/09 STILL hit a working-set cap 06-10 + 06-12 → ES/ja dropped — see Avoid.)

## Telegram-button feedback (last 7d)
- **idea:build ×4 / idea:pass ×0 = 100% build rate** — founder still WANTS daily-mode ideas built. Lane 05 converts lane 04's S-effort ideas.
- **polish:try ×8 / polish:pass ×2** — dominant signal; word-vault clean pass, crossword mixed (try AND pass).
- **night:good ×0 / night:meh ×0** — digest run-quality button under-engaged again (most nights zero votes). No sharp self-critique triggered (threshold = meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 24+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-12)
- **PostHog flags never created (highest, WORSENING)** — 3 experiments fully wired+translated+tested but dark: `exp-mp-quickplay-wait-v1` (06-08), `exp-invite-arrival-clarity-v1` (06-10), `exp-practice-wheel-cta-v1` (06-12). All target real funnel drops; all idle. Lane 03 MUST emit a "FLAG NEEDED: <key> <variants> <hypothesis>" digest block every night until flags exist. Status: open, blocked-on-human.
- **Invite funnel 83% drop** — `invite_landed`→`invite_consumed` 18→3, 29 rage-clicks. `exp-invite-arrival-clarity-v1` wired + `invite_consumed` for returning users (06-11) — dark pending flag. Status: open, instrumented.
- **Practice funnel 43% drop** — `/es/practice/wheelRush` 47 started→27 completed. `practice_abandoned` event SHIPPED 06-12 + `exp-practice-wheel-cta-v1` registered — dark pending flag. Status: open, now instrumented (was unwired 5 nights).
- **`/es/multiplayer` INP POOR (614ms 06-10 → 352ms 06-12)** — LCP fixed via ISR `revalidate=3600` (06-12); INP still undiagnosed, n below floor. 94 rage-clicks/7d. Status: open, re-measure n≥50.
- **`/he` home CLS 0.386** — undiagnosed (06-10), n=8 below floor. Status: open, re-measure.
- **Hebrew `המילה היומית` +3467% WoW** — pos 8.7–8.9, 180 impr. Internal link SHIPPED 06-12; awaiting crawl refresh (~7d) + IndexNow (5 URLs 06-11). Status: resolving.
- **Bing parity gap** — 82–103 top-10 Google queries absent from Bing. Deferred 6/6 nights. Status: open, IndexNow batch ready.
- **Spanish SEO momentum** — "scrabble online" ES +156% impr over window, pos 6.5→5.8. Title-truncation working. Status: ride it.

## Idea backlog (founder-signalled, 100% build rate)
Lane 04 surfaced (all S-effort daily, last 6 nights): Pyramid Descent, Reverse Dictionary, Word Telescope, Shadow Word, Logic Mosaic, Clue Budget Daily. Lane 05 builds these admin-gated. Zero mechanic repeats in 30+ surfaced.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 = 18/18 ship across 06-07..06-12. Strongest reliability signal, 18+ nights. #1 lever = eliminate MCP round-trips.
- **Mandatory-Minimum-Artifact floor** — every salvage night (06-07/09/11) still shipped its artifact. Floor never zero.
- **`revalidate=N` over `force-dynamic`** on SSR-cacheable routes — word-wheel/word-hunt (06-09), `/multiplayer` (06-12 `revalidate=3600`), all 27 blog pages (06-11 `revalidate=86400`). word-wheel LCP 4903→1706ms (65%). Zero regressions 6 nights. Now doctrine.
- **Author-then-ship in ONE budget** — AutoHideHeader CLS closed 06-10 only when one lane both edited AND landed. Don't carry a written-but-unshipped fix across nights (it took 3).
- **Security hardening via migration** (lane 01) — DEFINER REVOKEs (push_token, curator fns, grant_offerwall_coins, upsert_player_word 06-11, upsert_level_completion 06-12) — 5 ships, 0 reverts, all reversible, no blast-radius. Autonomously shippable doctrine.
- **TDD on new pure modules** — highest ship rate for new code (forge/shiritori/tower heat, ghost-multiplier, AlchemyShareCard). (stable)
- **Founder-directive fast path** — `polish:try` queue drives lane 05 ordering; ideas voted `build` within 1 night. (validated)
- **frontend-design for mode polish** — 6 polish components shipped this window, 0 reverts; prefers-reduced-motion gated consistently.
- **n≥50 sample-floor gate** (`00d96ad3f`, lane 02 prompt) — killed the `/es/multiplayer` INP false-regression class. (validated)
- **Usage-limit-aware runner** (`5cb7f28a0`) — sleep-until-reset + recompute deadline epochs. (holding)
- **Lane 04 reddit RSS fallback + idea drafts** — 6/6 nights produce 5 ideas + 3 reply drafts. (stable)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)

## What to avoid (failed this week)
- **Wiring an experiment without a flag-creation handoff** — 3 dark experiments now accruing. Lane 03 MUST emit a one-line "FLAG NEEDED: <key> <variants> <hypothesis>" block to the digest so the human creates it; otherwise the work never measures anything. (highest, WORSENING)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one 15-min budget = consistent timeout/partial. 05 left Combo Meter unwired (06-09); 05/09 dropped ES/ja at file cap (06-10, 06-12). Pick exactly ONE polish; ship locales FIRST. (highest-frequency failure)
- **Working-set file cap dropping a locale** — 05/09 hit cap → Spanish/Japanese incomplete, rolled forward. Write translations before component/page. (high)
- **MCP-heavy lanes timing out** — 02/09 each timed out 2/6 (advisor + index analysis; ad-net APIs). Cap MCP round-trips; prefer prompt-only paths. (high, recurring)
- **Flagging a Web-Vitals regression on sub-floor sample** — never issue a verdict/name a suspect below n≥50 in BOTH runs. Gate now in `prompts/02-perf.md`. (corrected, holding)
- **`rg` as sole search path** — EACCES blocked lane 01 callsite verification (06-07); keep `find|xargs grep` fallback. (high)
- **Push-fail stranding** — 06-07 commit stranded (non-fast-forward, daemon advanced master mid-run). Runner should rebase before push. (watch)
- **Vitest abort-trap wedging gate** — 06-09 lane 10 OOM-wedged even pre-8GB; heap raised `b266ca10e` but still fragile on dictionary nights. (watch)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 24+ nights, 0 signals. RSS only; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **PostHog flag-creation backlog** — 3 dark experiments. Status: blocked-on-human, surface every digest.
- **Invite funnel 83% drop** — instrumented, dark pending flag. Status: open.
- **Practice funnel 43% drop** — now instrumented (`practice_abandoned` 06-12), dark pending flag. Status: open.
- **`/he` home CLS 0.386 + `/es/mp` INP** — undiagnosed, n below floor. Status: open, re-measure.
- **Bing parity** — 82–103 missing top-10 queries. Status: open, IndexNow batch ready.
- **AdSense E-E-A-T** (lane 08) — author page 26 posts; all 27 blog pages now ISR (06-11). Bylines/dates partial; schema propagation ~7d. Status: open, re-submit after crawl warms.
- **Gate clean-rate 2/6** — 4/6 nights salvage/unverified. Heap 8GB; vitest abort-traps still wedge gate on dictionary nights. Status: watch.
- **Supabase `word_scores`/`connections_puzzles` multi-permissive SELECT policies** — double row-scan. Status: deferred (needs curator audit).
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered flags** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0 converts). Prune or fix tracking. Status: open.
- **Lane 09 monetization 3/6** — ad-UX/upsell shipping; offerwalls still dark (no offline-ad-net A/B infra). Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5 DEFINER/RLS REVOKEs shipped 06-07..06-12, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic + CLS spacer shipped 06-09/10/12 |
| 03 engagement | `frontend-design` | quickplay/invite/practice overlays wired 06-08..06-12 (dark pending flag) |
| 04 competitor | `humanizer` | 6/6; 5 ideas + 3 reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 6 polish components shipped this window, 0 reverts |
| 06 seo | `seo-daily` | 6/6; ES title-truncation CTR + ES +156% impr |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 5/6; FAQPage/ItemList/VideoGame JSON-LD + 27 blog pages ISR |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`33f8641c3`); OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (24+ d)** — accept silence; do not keep re-investigating delivery.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
