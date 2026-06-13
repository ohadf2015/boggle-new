# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-08..06-13 (6 report nights).** 6-night code-ship: **01=6/6, 04=6/6, 06=6/6, 07=6/6, 08=6/6**; 05=6/6 (06-13 huge — adventure rework + wordcraft Conquest + personalization + brain + landing all landed); 02=5/6; 03=5/6 (gate-fail 06-09/06-11, partial 06-13); 09/10=5/6 (06-09 timeout). Gate fully clean: ~1/6 (06-10); 06-08 baseline-red, 06-09/06-11 docs-salvage, 06-12 code-salvage, 06-13 partial+heavy-ship. Mandatory-Artifact floor kept all 6 nights non-zero. **06-13 was the strongest ship night of the window** — founder-directive rework loop converted three named requests (word-vault escape-room, adventure, wordcraft Conquest) into shipped code in one run. **Dominant gap unchanged: experiments wired-but-dark still = 3** (`exp-mp-quickplay-wait-v1`, `exp-invite-arrival-clarity-v1`, `exp-practice-wheel-cta-v1`) — code-complete, translated, tested, ZERO PostHog flags ≥5 nights. 94 `/es/multiplayer` rage-clicks/7d unaddressed because targeting experiments are dark. Human flag-creation is the loop's single biggest leak.

## FOUNDER DIRECTIVE — highest priority
- **2026-06-13 (new):** "Word vault isn't actually fun — rework puzzles + parts of UI, should feel like a real escape room and fun to explore." Lane 05 scope. NOTE: word-vault drew a `polish:pass` button vote this window — but a free-text directive OUTRANKS button feedback (button-pass = "ordering fine"; text = "content misses"). Read them as different axes, not a contradiction.
- **Polish party games (admin-only)** (2026-06-05). Lane 05. `polish:try` is the priority queue. Last-7d: **polish:try ×11 vs polish:pass ×2** — strongest appetite signal. try slugs: crane×2, shiritori×2, word-alchemy×2, word-tower, word-forge, sealed-bid, party, crossword. pass: word-vault (now superseded by directive), crossword (MIXED — drew both). New modes stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set cap still ~8 (see Avoid). Ship all 5 locales in one night; write translations FIRST.

## Telegram-button feedback (last 7d)
- **idea:build ×4 / idea:pass ×1 = 80% build rate** (was 100%) — founder still wants daily-mode ideas built; one pass = first non-build, mild filter signal. Lane 05 converts lane 04's S-effort ideas.
- **polish:try ×11 / polish:pass ×2** — dominant signal; crane/shiritori/word-alchemy each drew 2 tries.
- **night:good ×0 / night:meh ×0** — run-quality button under-engaged again. No sharp self-critique triggered (threshold meh ≥3).
- **reddit:* = 0** — zero reddit callbacks 24+d. Accept silence; do not re-investigate delivery.

## Active watches (2026-06-13)
- **PostHog flags never created (highest, ≥5 nights)** — 3 experiments fully wired+translated+tested but dark: `exp-mp-quickplay-wait-v1` (06-08), `exp-invite-arrival-clarity-v1` (06-10), `exp-practice-wheel-cta-v1` (06-12, NOT yet wired to UI). All target real funnel drops; all idle. Lane 03 MUST emit a "FLAG NEEDED: <key> <variants> <hypothesis>" digest block every night until flags exist. Status: open, blocked-on-human.
- **Invite funnel 83% drop** — `invite_landed`→`invite_consumed` 18→3, 29 rage-clicks. `exp-invite-arrival-clarity-v1` wired (06-10/11) — dark pending flag. Status: open, instrumented.
- **Practice funnel 43% drop** — `/es/practice/wheelRush` 47→27. `practice_abandoned` SHIPPED 06-12; `exp-practice-wheel-cta-v1` registered but UI-wire pending. Status: open, partially instrumented.
- **`/es/multiplayer` INP** — 352ms (06-12) → 452ms (06-13, +28%, both n≥50). Assessed as traffic-composition noise, no code regression found. LCP fixed via ISR `revalidate=3600` (06-12). Status: MONITOR 2 more nights before naming a suspect.
- **`/he` home CLS 0.386** — undiagnosed (06-10), n=8 below floor. Status: open, re-measure.
- **Hebrew `המילה היומית` +3467% WoW** — internal link SHIPPED 06-12; awaiting crawl refresh (~7d) + IndexNow. Status: resolving.
- **Bing parity gap** — 82–103 top-10 Google queries absent from Bing. Deferred. Status: open, IndexNow batch ready.
- **Spanish SEO momentum** — "scrabble online" ES +156% impr, pos 6.5→5.8. Status: ride it.

## Idea backlog (founder-signalled, ~80% build rate)
Lane 04 surfaced (S-effort daily): Pyramid Descent, Reverse Dictionary, Word Telescope, Shadow Word, Logic Mosaic, Clue Budget Daily. Lane 05 builds these admin-gated. Zero mechanic repeats in 30+ surfaced.

## What works (validated this week)
- **Founder-directive fast path** — 06-13 converted 3 named text directives (word-vault, adventure, wordcraft) into shipped code in one run. Direct founder text = top of queue, beats button signals. (strongest new validation)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 = 18/18 ship 06-08..06-13. #1 reliability lever = eliminate MCP round-trips. (18+ nights)
- **Mandatory-Minimum-Artifact floor** — every salvage night still shipped its artifact. Floor never zero. (6/6)
- **`revalidate=N` over `force-dynamic`** on SSR-cacheable routes — `/multiplayer` (06-12), 27 blog pages (06-11), word-wheel/word-hunt (06-09). word-wheel LCP 4903→1706ms. Zero regressions. Doctrine.
- **Author-then-ship in ONE budget** — AutoHideHeader CLS closed 06-10 only when one lane both edited AND landed. Don't carry written-but-unshipped fixes.
- **Security hardening via migration** (lane 01) — DEFINER REVOKEs (push_token, curator fns, grant_offerwall_coins, upsert_player_word, upsert_level_completion) — shipped repeatedly, 0 reverts, all reversible. Autonomously shippable doctrine.
- **TDD on new pure modules** — highest ship rate for new code (forge/shiritori/tower heat, ghost-multiplier, share cards, territory.ts Conquest, towerSurprise). (stable)
- **frontend-design for mode polish** — many polish components shipped this window, 0 reverts; prefers-reduced-motion gated consistently.
- **n≥50 sample-floor gate** (lane 02 prompt) — killed `/es/multiplayer` INP false-regression class; 06-13 INP move correctly held as MONITOR not regression. (validated)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target. 30+ nights. (stable)

## What to avoid (failed this week)
- **Wiring an experiment without a flag-creation handoff** — 3 dark experiments accruing ≥5 nights. Lane 03 MUST emit one-line "FLAG NEEDED: <key> <variants> <hypothesis>" to the digest so the human creates it. (highest, persisting)
- **Registering an experiment but not wiring it to UI** — `exp-practice-wheel-cta-v1` registered 06-12, still not surfaced. Register + wire + flag-handoff in ONE pass, or it measures nothing. (new)
- **Over-scoped mode-polish (lanes 05/09)** — TDD + 5 locales + animation + page-wire in one 15-min budget = timeout/partial. Pick exactly ONE polish; ship locales FIRST. (highest-frequency failure)
- **Working-set file cap (~8) dropping a locale** — 05/09 hit cap → Spanish/Japanese incomplete (06-10, 06-12). Write translations BEFORE component/page. (high)
- **MCP-heavy lanes timing out** — 02/09/10 each timed out at least once (advisor + index analysis + ad-net APIs). Cap MCP round-trips. (recurring)
- **Flagging a Web-Vitals regression on sub-floor or noisy sample** — never name a suspect below n≥50 in BOTH runs; treat single-night INP swings as composition noise pending a 2-night confirm. (corrected, holding)
- **`rg` as sole search path** — EACCES blocked lane 01 callsite verification (06-07); keep `find|xargs grep` fallback. (high)
- **Push-fail stranding** — daemon advanced master mid-run. Runner should rebase before push. (watch)
- **Vitest abort-trap wedging gate** — 06-09 OOM-wedged; heap raised to 8GB but still fragile on dictionary nights. (watch)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 24+ nights, 0 signals. RSS only; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **PostHog flag-creation backlog** — 3 dark experiments. Status: blocked-on-human, surface every digest.
- **Invite funnel 83% drop / Practice funnel 43% drop** — instrumented, dark pending flags. Status: open.
- **`/he` home CLS 0.386 + `/es/mp` INP 452ms** — undiagnosed/noisy, re-measure. Status: open.
- **Bing parity** — 82–103 missing top-10 queries, IndexNow batch ready. Status: open.
- **AdSense E-E-A-T** (lane 08) — all 27 blog pages ISR (06-11); bylines/dates partial; schema propagation ~7d. Status: open, re-submit after crawl warms.
- **Gate clean-rate ~1/6** — salvage/partial most nights; vitest abort-traps still wedge gate on dictionary nights. Status: watch.
- **Word-vault puzzle depth** (06-13 founder directive) — hub UI reworked; cipher/logic puzzle mechanics + A/B deferred. Status: open, lane 05.
- **Supabase `word_scores`/`connections_puzzles` multi-permissive SELECT policies** — double row-scan. Status: deferred (needs curator audit).
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered flags** — `share-prompt-timing`, `show-signup-after-first-win`, `mp-signup-nudge-copy-v1` (0 converts). Prune or fix tracking. Status: open.
- **Lane 09 monetization 5/6** — ad-UX/upsell shipping; offerwalls still dark (no offline-ad-net A/B infra). Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5+ DEFINER/RLS REVOKEs shipped 06-08..06-12, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | revalidate>force-dynamic + CLS spacer shipped 06-09/10/12 |
| 03 engagement | `frontend-design` | quickplay/invite/practice overlays wired 06-08..06-12 (dark pending flag) |
| 04 competitor | `humanizer` | 6/6; 5 ideas + 3 reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 06-13 adventure+wordcraft+vault all shipped, 0 reverts |
| 06 seo | `seo-daily` | 6/6; ES title-truncation CTR + ES +156% impr |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 6/6; FAQPage/ItemList/VideoGame JSON-LD + 27 blog pages ISR |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback; OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (24+ d)** — accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
