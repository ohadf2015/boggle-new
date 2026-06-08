# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-03..06-08 (6 report nights).** MAX_MCP_CALLS cap **SHIPPED 06-04** — MCP-spiral collapse did NOT recur 06-07/06-08. Dominant blockers shifted to **ripgrep EACCES** (06-06/07) + **force-dynamic route LCP**. 06-08 run: 12×rc=0, 6×rc=124 — but the 124s are now SUB-STEPS (MCP probes / rg fallbacks), not whole-lane timeouts; Mandatory-Artifact floor caught every lane. 6-night per-lane ship: **04=7/7, 06=7/7, 07=7/7, 08=7/7**, 05=5/7, 01=4/7, 02=3/7, 03=2/7, 09=2/7.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **Polish party games (admin-only).** Lane 05 scope. `polish:try` callback frequency IS the priority queue. Last-7d clicks: **word-tower ×2, word-forge ×2, word-alchemy ×2, sealed-bid ×2, party/caption-clash ×2, word-vault ×1**. `polish:pass` on word-vault + crossword → DEPRIORITIZE those. Keep new modes behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP` 8→999 (shipped 06-04). Ship all 5 locales in one night. Wall-clock finalize cutoff stays the real limit.

## Telegram-button feedback (last 7d)
- **night:meh ×1 (06-03), night:good ×0** — 1 of 7 below the ≥3 self-critique threshold; no sharp critique triggered, but 06-03 lane work was thin (lanes 03/05 partial). Most nights drew zero night-quality vote = low engagement with the digest button.
- **idea:build ×4 / idea:pass ×1 = 80% build rate** — founder WANTS daily-mode ideas built. Built hashes: e77690d3, a462044e, 6fd3c339, 5c571d75. Lane 05 should keep converting lane 04's S-effort daily ideas.
- **polish:try ×11, polish:pass ×2** — strong appetite for party-game polish; pass only on word-vault + crossword.

## Active watches (2026-06-08)
- **ripgrep EACCES (06-06/07)** — `rg` permission error blocks lane 01/02 search; `find|xargs grep` fallback too slow. **Now the #1 infra blocker** (MCP cap resolved the old #1). Investigate binary perms / sandbox.
- **force-dynamic route LCP** — `/en/daily/word-wheel` 6168ms, `/he/daily/word-wheel` 5504ms, `/he/brain` 5444ms; 4 routes `force-dynamic` → no SSR caching. Highest-impact perf target now homepage LCP is fixed.
- **`/es/multiplayer` INP 704ms + `/en/multiplayer` p75 LCP 4237ms (+621ms regress)** — skeleton-vs-hydrated height mismatch in `PageClient.tsx`.
- **Invite funnel 83% drop** — 18 invite_consumed → 3 conversions (06-06, persists). Critical engagement signal, undiagnosed.
- **GSC `webmasters.readonly` scope missing** — 9+ nights; blocks lane 06/08 noindex decisions + IndexNow. Status: open.
- **Spanish SEO momentum** — title-truncation fixes shipping; Hebrew `המילה היומית` +3467% WoW (pos 9.1, needs internal links).

## Idea backlog (founder-signalled)
- `idea:build` 80% rate. Lane 04 surfaced (all S-effort daily): Reverse Dictionary Daily, Pyramid Descent Daily, Hidden Crown Daily, Word Venn Daily, Crowd Pick Daily. Lane 05 builds these admin-gated.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07/08 all 7/7 across 06-03..06-08. Strongest signal, 12+ nights running.
- **MAX_MCP_CALLS cap (shipped 06-04)** — MCP collapse did NOT recur 06-07/08 despite prior 3 events. Cap WORKS. (validated)
- **Mandatory-Minimum-Artifact floor** — 06-08 had 6 sub-step 124s yet every lane shipped its artifact. Floor never zero. (stable, strongest reliability lever)
- **Founder-directive fast path** — file-cap 06-04, party-polish 06-05 acted same night; `polish:try` queue drives lane 05 ordering. (validated 8×)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target, one deploy. 25+ nights. (stable)
- **TDD on new pure modules** — highest ship rate for new code (captionHall 8 tests, sabotage 6, wordForge heat). (stable)
- **Security hardening via migration** (lane 01) — DEFINER REVOKEs + RLS initplan fixes shipped 06-04/05/08, zero reverts. (stable)
- **Isolated-worktree gate + `build:fast`** — validation can't race dev server. (stable)
- **Lane 04 reddit RSS fallback** — 7/7 nights produce idea + reply drafts via RSS (JSON API still blocked). (stable)
- **eslint-changed-files-only self-check** — lanes that skip full `tsc`/`build` and eslint only their diff finish inside budget. (validated)

## What to avoid (failed this week)
- **Over-scoped lane work** — 06-06 lane 05 attempted TDD+5-locales+animation in one budget, kept 11 files, timed out. One complete change ships; three half-finished ship nothing. (repeated, highest-frequency failure now)
- **`rg` as sole search path** — EACCES 06-06/07 stalled lanes with no fast fallback. Lanes must degrade gracefully. (new, high)
- **force-dynamic on cacheable game routes** — 4 routes pay 5–6s LCP for no dynamic benefit. (new perf anti-pattern)
- **Preflight abort on unpushed commits / wrong branch** — 06-04 + 06-05 01:00 lost nights; still no stash-or-warn. (kept, high)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 14+ nights, 0 signals. Use RSS; stop retrying OAuth; remove search collector. (kept)

## Open watches (carry forward)
- **ripgrep EACCES** — #1 infra blocker. Status: open, investigate sandbox/perms.
- **force-dynamic route LCP** (word-wheel/brain 5.5–6.2s) — undiagnosed caching. Status: critical perf.
- **Invite funnel 83% drop** — Status: critical engagement, undiagnosed.
- **GSC token scope** (`webmasters.readonly`) — 9+ nights. Status: open.
- **`/es/multiplayer` INP 704ms** — Status: open, height-mismatch suspect.
- **Preflight abort handler** — Status: open, high.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered experiment flags** — `share-prompt-timing` (69d, 0-2 exp), `show-signup-after-first-win` (68d), `mp-signup-nudge-copy-v1` (0/77 converts, tracking gap). Prune or fix tracking. Status: open.
- **Lane 09 monetization 2/7** — ayeT offerwall dark-committed, not live. Status: open.
- **Zero night-quality votes most nights** — digest button under-engaged. Status: watch.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `security` | DEFINER/RLS sec fixes shipped 06-04/05/08, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | RLS initplan + CLS(AutoHideHeader)+LCP preload shipped 06-04/05/08 |
| 03 engagement | none | prompt-driven; experiment wiring shipped 06-04/08 |
| 04 competitor | `humanizer` | 7/7; idea + reddit drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | polish shipped 5/7; captionHall/wordForge/alchemy heat |
| 06 seo | `seo-daily` | 7/7; ES title-truncation CTR fixes, +200% ES momentum |
| 07 self-learn | none — prompt-only | 7/7 |
| 08 adsense | `humanizer` | 7/7; JSON-LD (Article/ItemList) + word-count ships, GSC-scope-blocked |

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
