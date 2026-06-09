# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-03..06-09 (7 report nights).** Two infra wins SHIPPED this window: (1) **usage-limit cascade fix** `5cb7f28a0` — `headless.sh` now detects Claude session-limit mid-run → sleeps until reset → RECOMPUTES deadline epochs before retry (stale epochs were making the lane-time-guard deny every tool = instant re-fail). (2) **force-dynamic LCP fixed** `db2f21d26`-era — word-wheel/word-hunt routes moved to `revalidate=3600`, killing the 5–6s LCP. The two dominant 124-timeout roots (`rg` EACCES, MCP stall) are now mostly **sub-step** failures caught by the Mandatory-Artifact floor, not whole-lane losses. 7-night per-lane ship: **04=7/7, 07=7/7**, 06=6/7, 08=6/7, 01/02/03/05/09≈5/7.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **Polish party games (admin-only).** Lane 05 scope. `polish:try` is the priority queue. Last-7d: **polish:try ×15 vs polish:pass ×2** — strongest single appetite signal. Recent shipped polish: Alchemy Heat, Word Forge Heat, Caption Hall, Shiritori. `polish:pass` only on word-vault + crossword → DEPRIORITIZE those. New modes stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`. Ship all 5 locales in one night. Wall-clock finalize cutoff is the real limit.

## Telegram-button feedback (last 7d, 37 records)
- **idea:build ×7 / idea:pass ×2 = 78% build rate** — founder WANTS daily-mode ideas built. Lane 05 keeps converting lane 04's S-effort daily ideas.
- **polish:try ×15 / polish:pass ×2** — dominant signal; pass only word-vault + crossword.
- **night:good ×2 / night:meh ×2** — split, BOTH below the ≥3 critique threshold; no sharp self-critique triggered. Most nights still draw zero night-quality vote = low digest-button engagement.
- **NEW: test:works ×2** — a test-validation callback type now exists. Lane 04/05 test-draft outputs get voted. Track ratio going forward.
- **reddit:* = 0** — zero reddit callbacks in 14+d (drafts may not reach user, or user doesn't button-vote them).

## Active watches (2026-06-09)
- **AutoHideHeader CLS 0.29 on `/en/multiplayer`** — spacer-div fix AUTHORED but UNSHIPPED 3 nights (06-05→06-08). `fe-next/components/AutoHideHeader.tsx`: return spacer `<div>` not `null` when hidden. Highest-ROI unshipped perf fix. Status: open, ready-to-ship.
- **Invite funnel 83% drop** — 18 invite_consumed → 3 conversions (06-06, persists). Critical engagement signal, undiagnosed.
- **`/es/multiplayer` INP 244ms + p75 LCP 4174ms; `/en/multiplayer` LCP 4237ms** — skeleton-vs-hydrated height mismatch in `PageClient.tsx` (modified tonight by lane 03 quickplay overlay — re-measure next run).
- **ES quickplay rage clicks 23** (`/multiplayer?quickPlay=true`, score 0.768) — `exp-mp-quickplay-wait-v1` wired 06-09 (QuickPlaySeekingOverlay). Watch INP/rage delta next run.
- **practice funnel 43% drop** — `/es/practice/wheelRush` 47 started → 27 completed (06-07). Undiagnosed.
- **GSC `webmasters.readonly` scope — RESOLVED 2026-06-05.** ADC re-consented; lane-06 pulls GSC live. Any lane printing "scope missing" is parroting THIS stale note, NOT a live 403. lane-08 noindex blocked by a DATA GAP (source `docs/seo-daily/<today>.md` is query-centric → zero-traffic dead pages invisible), partly addressed by `scripts/nightly/tools/dead_pages.py` (GSC page-dim). Status: scope=closed, noindex-data-gap=resolving.
- **Spanish + Hebrew SEO momentum** — ES "scrabble online" +200–271% WoW; HE `המילה היומית` +3467% (pos 9.1, needs internal links).

## Idea backlog (founder-signalled, 78% build rate)
Lane 04 surfaced (all S-effort daily): Reverse Dictionary Daily, Pyramid Descent Daily, Hidden Crown Daily, Word Venn Daily, Crowd Pick Daily. Lane 05 builds these admin-gated.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/07 both 7/7 across 06-03..06-09. Strongest signal, 13+ nights.
- **Mandatory-Minimum-Artifact floor** — even on the 06-06 6-lane timeout night, every lane shipped its artifact. Floor never zero. (strongest reliability lever)
- **Usage-limit-aware headless runner** (`5cb7f28a0`) — sleep-until-reset + RECOMPUTE deadline epochs ends the instant-fail cascade. (shipped, validate next limit event)
- **`revalidate=3600` over `force-dynamic`** on cacheable game routes — killed 5–6s LCP on word-wheel/word-hunt. (shipped)
- **Founder-directive fast path** — file-cap 06-04, party-polish 06-05 acted same night; `polish:try` queue drives lane 05 ordering. (validated 9×)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target. 26+ nights. (stable)
- **TDD on new pure modules** — highest ship rate for new code (captionHall, sabotage, wordForge heat, comboStats). (stable)
- **Security hardening via migration** (lane 01) — DEFINER REVOKEs + RLS initplan fixes, zero reverts. (stable)
- **Isolated-worktree gate + `build:fast`** — validation can't race dev server. (stable)
- **Lane 04 reddit RSS fallback** — 7/7 nights produce idea + reply drafts via RSS. (stable)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)

## What to avoid (failed this week)
- **Over-scoped lane work** — 06-06 lane 05 attempted TDD+5-locales+animation in one budget, timed out. One complete change ships; three half-finished ship nothing. (highest-frequency failure)
- **`rg` as sole search path** — EACCES 06-06/07 stalled lanes; `find|xargs grep` fallback too slow. Lanes must degrade gracefully. (high)
- **Authoring a perf fix but not shipping it** — AutoHideHeader CLS fix written 3 nights running, never landed. Author-then-ship in ONE lane budget or don't start. (new, high)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 14+ nights, 0 signals. Use RSS; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **AutoHideHeader CLS 0.29** — first noticed 06-05, status: open, fix authored & ready.
- **Invite funnel 83% drop** — status: critical engagement, undiagnosed.
- **`/es/multiplayer` INP 244ms / LCP 4174ms** — status: open, re-measure post-quickplay-overlay.
- **practice funnel 43% drop** (`/es/practice/wheelRush`) — status: open, undiagnosed.
- **GSC token scope** — RESOLVED 2026-06-05. noindex-data-gap=resolving (dead_pages.py). Status: closed/resolving.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered experiment flags** — `share-prompt-timing` (70d), `show-signup-after-first-win` (69d), `mp-signup-nudge-copy-v1` (0/77 converts). Prune or fix tracking. Status: open.
- **Lane 09 monetization ≈5/7** — ad-UX/education upsell shipping; offerwalls still dark. Status: open.
- **Zero night-quality votes most nights** — digest button under-engaged. Status: watch.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `security` | DEFINER/RLS sec fixes shipped 06-04/05/08, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | RLS initplan + CLS + force-dynamic→revalidate shipped 06-04/05/09 |
| 03 engagement | `frontend-design` | quickplay overlay + experiment wiring shipped 06-04/08/09 |
| 04 competitor | `humanizer` | 7/7; idea + reddit drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | polish shipped 5/7; alchemy/forge/captionHall/shiritori heat |
| 06 seo | `seo-daily` | 6/7; ES title-truncation CTR + dead_pages.py noindex feed |
| 07 self-learn | none — prompt-only | 7/7 |
| 08 adsense | `humanizer` | 6/7; JSON-LD (Article/ItemList) + word-count ships |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`33f8641c3`); OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (14+ d)** — drafts may not reach user, OR user simply doesn't button-vote them. Investigate delivery once; else accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
