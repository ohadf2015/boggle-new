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

## Core principle (granted by user)
- **Anything repeatable → script it.** If a lane finds itself doing the same sequence of WebSearch / WebFetch / SQL / shell on multiple nights, codify it as a helper script under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 (self-learn) is explicitly empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user)
- **Experimental game modes OK** — lane 05 (landing) may ship a NEW game mode behind a typed flag with ≤10% rollout, provided: (a) flag default = off, (b) Playwriter E2E QA covers happy path + edge cases, (c) prior week's `loop-improvements/*.md` flagged a viable concept, (d) mode is reachable only via `?mode=<flag>` deep-link or rollout-flagged hub entry. Never expose to 100% from a nightly run — that requires human review.

## Open watches (carry forward until proven)
- Lane 04 (competitor) Reddit access: `old.reddit.com` may rate-limit unauthenticated fetches — if WebFetch returns 429 on >50% of attempts for a week, consider switching to the Reddit JSON API via OAuth.
- Lane 05 (landing variants) coverage: only ship 1 variant/week to avoid flag explosion.
- Self-learn drift: if `learnings.md` hits 200 lines for 3 nights running, the rotation logic is broken — investigate.

## Specialized Skills (maintained by lane 6)

Per-lane skill recommendations, evidence-weighted. Each lane prompt reads this section and honors it.

> Bootstrap — first 7 nights replace these with data-grounded picks.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` (validates fix before commit) | seed |
| 02 perf | `superpowers:systematic-debugging` (backend slow-query diagnosis), `web-interface-guidelines` (frontend CWV review), `code-review` | seed |
| 03 engagement | none yet — data needed | seed |
| 04 competitor/reddit | `humanizer` (Reddit drafts), `ux-writer` (idea phrasing) | seed |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai`, `usability-psychologist`, `web-interface-guidelines` (post-edit review) | seed |
| 06 SEO | `seo-daily` (mandatory), `humanizer` (meta descriptions) | seed |
| 07 self-learn | none — keep prompt-only | seed |

**Rules for lane 6 when updating this table:**
- Add a skill to a lane only if invoking it correlated with a shipped (not reverted) outcome in ≥2 nights.
- Remove a skill if its lane reverted ≥2 nights in a row with that skill in the recipe.
- Cap each lane at 4 skills; drop lowest-evidence first.
- Evidence column: `"shipped 3/3 with skill"` or `"reverted 2/3 with skill"` or `"seed"` if pre-data.
- Specialization is per-lane — never blanket-recommend a skill across all lanes.

## Reddit reply etiquette (lane 3 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer to the question (e.g. "free browser word game, no signup, multiplayer Hebrew/English support").
- Skip subreddits with strict self-promo rules (r/AskReddit, r/woahdude, etc.). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble (read rules first), r/languagelearning (high bar — only mention if vocab-training fit).
- Two drafts per thread: (a) pure-value comment, (b) value-first comment + one-line product mention as alternative. User picks.
- Use throwaway / older account, not a fresh one with 0 karma — flagged as spam instantly.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
