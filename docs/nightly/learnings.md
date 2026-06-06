# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-01..06-06 (6 report nights).** MCP collapse RECURRED 06-06 (3rd event after 06-02). Sentry+Supabase MCPs failed to connect; lanes 01/02/03 all rc=124. Lane 04+07 still 6/6 (zero MCP dependency). **MAX_MCP_CALLS cap is now 12+ nights overdue — the single most impactful unshipped infra fix.** Per-lane 6-night completion: **04=6/6, 07=6/6**, 01=5/6, 02=4/6, 03=4/6, 05=4/6, 06=4/6, 08=4/6, 09=2/6.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **(06-05) Polish party games (admin-only).** Lane 05 scope. `polish:try` callback frequency IS the priority queue — **sealed-bid ×3, word-tower ×2, word-alchemy ×2**, blast ×1, word-vault ×1, word-forge ×1, caption-clash ×1. Work top-clicked slugs first. Keep new modes behind `{isAdmin && …}` per permissions grant below.
- **(06-04, still active) No hard file-count cap.** `LEXI_LANE_FILE_CAP` default 8→999. Ship ALL 5 locales in one night. Wall-clock finalize cutoff stays.

## Active watches (2026-06-06)
- **MCP collapse 3rd recurrence (06-06)** — Sentry+Supabase MCPs failed to connect after 3 attempts each; lanes 01/02/03 timed out. **MAX_MCP_CALLS=3 cap + graceful MCP-skip = #1 infra gap.**
- **`/en/multiplayer` CLS 0.057→0.29 (×5)** — `AutoHideHeader` returns `null` → layout shift on hydrate. Fix authored, NOT shipped 2 nights. Land it.
- **Homepage LCP 7107ms / `/en/word-hunt` 8188ms / `/en/word-wheel` 5244ms** — open since 06-03, undiagnosed. Highest-impact perf targets.
- **`/en/multiplayer` INP 528–584ms + LCP ~4237ms** — skeleton-vs-hydrated-lobby height mismatch in `PageClient.tsx`.
- **ripgrep EACCES (06-06)** — lane 01 blocked by permission error on rg. Fallback too slow. Investigate.
- **Invite funnel 83% drop** (06-06 lane 03) — 18 invite_consumed → 3 conversions. New critical engagement signal.
- **Spanish SEO +200-271% WoW** (06-06 lane 06) — capitalize on momentum.

## Idea backlog (founder-signalled via Telegram)
- `idea:build` ×4: Survival Rounds, Fading Grid Sprint, Word Detective daily, Word Heist MP.
- `idea:pass` ×2: "Games actually finish", Language Family Classification.
- **67% build rate** — founder WANTS ideas built. Prioritize for lane 05.

## What works (validated this week)
- **Low-MCP lanes never time out** — 04=6/6, 07=6/6 across 06-01..06-06 incl. both collapse nights. (strongest signal)
- **Bounded budgets + baseline-aware gate** — ships on calm nights; breaks under MCP load. (validated with limits)
- **Ground-truth audit before edits** — zero fabricated-feature bugs. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target, one Railway deploy. 20+ nights. (stable)
- **TDD on new pure modules** — highest ship rate for new code (heatMeter, curator ratify, dailyLetterPool). (stable)
- **Founder-directive fast path** — file-cap 06-04, party-polish 06-05 acted same night. (validated 7×)
- **Security hardening via migration** (lane 01) — DEFINER fixes + anon REVOKEs shipped 06-01/02/04, zero reverts. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. (stable)
- **Isolated-worktree gate + `build:fast`** — validation can't race dev server; 3× faster. (stable)
- **Mandatory-Minimum-Artifact** — floor never zero even on killed lanes. (stable)
- **PostHog REST helper** — avoids PostHog MCP hangs. (stable)
- **Curator features ship fast** — P0→P1→admin-UI in 3 days (06-03..06-06 git log). (new signal)

## What to avoid (failed this week)
- **MCP-spiral collapse RECURRED 06-06** — 3rd event. Sentry+Supabase MCPs failed to connect; 01/02/03 all rc=124. `MAX_MCP_CALLS` cap un-shipped 12+ nights. **#1 infra gap.**
- **Over-scoped lane work** — 06-06 lane 05 attempted TDD+5-locales+animation in one budget; kept 11 files, timed out. One complete change ships; three half-finished ship nothing. (repeated)
- **Preflight abort on unpushed commits** — 06-04 01:00 (unpushed commits) + 06-05 01:00 (wrong branch). No stash-or-warn. (kept, high)
- **Reddit JSON/OAuth blocked 12+ nights** — RSS fallback works. Use RSS, stop retrying. (kept)
- **Search collector dead 12+ nights** — 0 signals. Remove it. (kept)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)

## Open watches (carry forward)
- **MAX_MCP_CALLS cap** — un-shipped 12+ nights; caused 06-02 + 06-06 collapses. Status: **CRITICAL**.
- **CLS 0.29 (AutoHideHeader null)** — fix authored, unshipped 2 nights. Status: ship-ready.
- **Homepage/word-hunt/word-wheel LCP** — undiagnosed. Status: critical.
- **Preflight abort handler** — 2 nights lost (06-04/05 01:00). Status: open, high.
- **GSC token scope** — `webmasters.readonly` missing from ADC. 12+ nights. Status: open.
- **ripgrep EACCES** — new 06-06. Status: investigate.
- **Invite funnel 83% drop** — new 06-06. Status: critical engagement.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead experiment flags** — 4 wired, 0 exposures. Prune or create flags. Status: open.
- **Lane 09 monetization 2/6** — ayeT offerwall dark-committed, not live. Status: open.
- **No reddit callbacks in 7d** — drafts may not reach user. Investigate delivery. Status: new.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `security` | sec-hardening shipped 06-01/02/04, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | db index + CLS/LCP fixes shipped 06-04/05 |
| 03 engagement | none | prompt-driven; experiment wiring shipped 3 nights |
| 04 competitor | `humanizer` | 6/6; idea + reddit drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | polish shipped 4 nights; animate-ai added for Word Alchemy heat |
| 06 seo | `seo-daily` | title rewrites improve CTR; Spanish +200-271% |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | JSON-LD + word-count ships; GSC-scope-blocked |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`33f8641c3`); OAuth un-configured.
- **Zero reddit callbacks in 7d feedback** — drafts may not be reaching user. Investigate.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
