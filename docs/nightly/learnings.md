# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 6** each night from the prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> Bootstrap content below — replaced after first 7 nights of data.

## What works (kept across runs)
- Direct-to-master push (no PRs) — matches project pref, no merge churn.
- Single end-of-run commit with all lane changes — one rollback target, one Railway deploy.
- Ground-truth audit before any landing-page edit — kills fabricated-feature bugs early.
- `npm run build:fast` over full `build` for nightly gate — 3× faster, same correctness signal.

## What to avoid (failed in past)
- Per-lane commits — many rollback targets when something breaks at 03:00 with no one watching.
- Auto-rollback on KPI dip — Railway deploy lag = false-positives; alert-and-queue instead.
- Headless Claude writing new realtime tables — burned 94% DB CPU once. Hard-banned.
- Demoting `logger.warn → debug` to clean Sentry — root-cause or queue, never silence.

## Open watches (carry forward until proven)
- Lane 3 (Firecrawl) cost: monitor monthly spend; cap at $20/mo or switch to weekly cadence.
- Lane 4 (landing variants) coverage: only ship 1 variant/week to avoid flag explosion.
- Self-learn drift: if `learnings.md` hits 200 lines for 3 nights running, the rotation logic is broken — investigate.

## Reddit reply etiquette (lane 3 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer to the question (e.g. "free browser word game, no signup, multiplayer Hebrew/English support").
- Skip subreddits with strict self-promo rules (r/AskReddit, r/woahdude, etc.). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble (read rules first), r/languagelearning (high bar — only mention if vocab-training fit).
- Two drafts per thread: (a) pure-value comment, (b) value-first comment + one-line product mention as alternative. User picks.
- Use throwaway / older account, not a fresh one with 0 karma — flagged as spam instantly.

## Stat-framing reminders (memory anchors)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
