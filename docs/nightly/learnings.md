# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-29):** 6 data nights in window (05-24 thru 05-29). Fleet ship rate: 31/47 lane-runs (66%); 13 timed out (28%); 3 kept-partial (6%); 0 cap-reverted. Tier: 04 = 100% (6/6); 07 = 100% (5/5); 06 = 83% (5/6); 08 = 60% (3/5); 03 = 50% (3/6); 01 = 33% (2/6); 02 = 33% (2/6); 05 = 33% (2/6).

## Active watches (2026-05-29 — see docs/specs/nightly-hardening-2026-05-28.md)
- **git-ship preserve+reset on push-conflict** — validated 05-28/05-29 (no stranded commits since fix `a53d0c3c0`). Invariant: local master == origin/master after every run.
- **KEEP_TIMEOUT_PARTIALS = ON** — first validation 05-29: lanes 01/02/03 timed out but kept 17/13/10 partial files respectively (all gate-validated). WATCH: if docs-only-salvage nights tick UP from half-written code poisoning the gate, escalate.
- **Mandatory-Minimum-Artifact contract** — all lanes produce `docs/nightly/artifacts/lane-NN-<date>.md`. Confirmed working 05-29.
- **Phase 0 intelligence brief** — first deployment 05-29 (`364c9f4f0`+`66a7631f8`). 11 signals injected per-lane. Stale sources: search/sentry/supabase (MCP hang on collection). PostHog+Railway healthy. Verify utility after 2-3 nights.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 12 nights. (kept)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. Proven 10+ nights. (kept)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. (kept)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives in 12 nights. (kept)
- **Autonomy matrix** — if reversible + small blast → ship; if policy/auth/irreversible → queue. Validated 05-26, 05-27, 05-28: 6 autonomous fixes (search_path, REVOKE, pathTrace null, sync_coins qualify, RLS initplan, WASM build), 0 reverted. (promoted)
- **PostHog REST helper** — PostHog MCP hangs eliminated for data queries. Validated 6 nights. (stable)
- **MCP outage graceful degrade** — preflight abort→retry+degrade. Validated 6 nights. (stable)
- **File caps removed** — zero cap-reverts since 05-24. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. Validated 6 nights. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. Validated 6 nights. (stable)
- **Per-MCP-call timeout 60s** — 5 clean nights, no false clips. (stable)
- **Stream-json tool timeline** — hung MCP call attributable by name. (stable)
- **Lightweight lanes dominate** — 04 (100%), 07 (100%), 06 (83%). MCP dependency = failure predictor. (kept)
- **Docs-only salvage path** — recovers docs value when code gate fails. 5/6 nights. (stable)
- **KEEP_TIMEOUT_PARTIALS** — first validation 05-29. Lanes 01/02/03 kept gate-validated partial work on timeout. Upgrade from pure-loss. (new)
- **Founder-directive fast path** — lane 05 shipped 05-29 by skipping PostHog step. Confirms PostHog MCP = lane 05 bottleneck. (new)
- **Phase 0 intel brief** — deployed 05-29. Injects ranked signals per-lane without live MCP calls. (new, unvalidated)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode (34%).** 16/47 lane-runs timed out. Per-call 60s clip helps but cumulative sequential hangs still exceed lane budget. Target <15%.
- **Lane 01 triage = 2/6 (33%).** Sentry+Supabase MCP hang. When it ships, output is high-value (6 autonomous security fixes in 2 nights). KEEP_TIMEOUT_PARTIALS saved partial work 05-29.
- **Lane 02 perf = 2/6 (33%).** Supabase execute_sql suspected. High-value on ship (LCP opacity fix, CLS skeleton).
- **Lane 05 landing = 2/6 (33%).** PostHog MCP confirmed bottleneck (05-29 shipped by skipping it). Normal path: 4 consecutive timeouts.
- **Reddit JSON API blocked (05-29)** — returns HTML for all UAs. OAuth or alternative needed. Lane 04 still shipped via WebSearch fallback.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **MCP_TOOL_TIMEOUT** — 5 nights at 60s. No false clips. Try 45s on 05-30.
- **Reddit OAuth migration** — JSON API blocked 05-29. If blocked 2 more nights, build OAuth flow or use Pullpush.
- **Lane 05 = PostHog MCP bottleneck** — route through Phase 0 REST data, skip live MCP.
- **Phase 0 stale sources** — search/sentry/supabase collectors returned empty 05-29. Fix auth or mark optional.
- **Spanish SEO window** — ES Scrabble queries +168-2000% WoW. Lane 06 targeting. Time-sensitive, 5 nights.
- **`/en/multiplayer` LCP p75 ~3165ms** — game-client hydration. Trending improvement from 5806ms. Skeleton SSR needed.
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27. Predates crane commit. Re-check 05-30.
- **Admin-session perf noise** — filter admin player_ids from HogQL. First noticed 05-22.
- **`show-signup-after-first-win` flag** — 61d, 43 exposures. Wire or retire.
- **`results_viewed` event** — instrumented 05-27+05-28. Verify flowing by 05-30.
- **KEEP_TIMEOUT_PARTIALS quality** — first use 05-29. Monitor for half-written files breaking gate.
- **Sealed bid playtest** — shipped 05-29. Awaiting founder feedback.
- **Lane 08 value signal** — 3/5 ships but mostly no-ops. Consider merging into lane 06.

## Telegram-button feedback (last 7d)
- `idea:pass` x1 — 05-23 ("games actually finish" passed)
- `idea:build` x1 — 05-26 ("Survival Rounds" — FIRST BUILD TAP)
- Founder text x1 — 05-28 ("Build sealed bid, admin-only")
- **No `night:good/meh`, `reddit:*`, `mode:*` taps.** 3 signals in 7 days. Sparse.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | shipped 2/6; autonomy matrix approach more impactful |
| 02 perf | `superpowers:systematic-debugging` | shipped 2/6; timeout not skill gap |
| 03 engagement | none | shipped 3/6 (trending up); prompt-driven |
| 04 competitor | `humanizer` | shipped 6/6; applied to Reddit drafts |
| 05 landing | `frontend-design` (mandatory) | shipped 2/6; skipped when page pre-exists |
| 06 seo | `seo-daily` (mandatory) | shipped 5/6; consistent output |
| 07 self-learn | none — prompt-only | shipped 5/5 |
| 08 adsense | `humanizer` | shipped 3/5; copy quality when ships |

**Rules for lane 7 updating this table:**
- Add a skill if invoking it correlated with a shipped (not reverted) outcome in >=2 nights.
- Remove a skill if its lane reverted >=2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count).
- Cap each row at 4 skills; drop lowest-evidence first.
- Lane 5 ALWAYS keeps `frontend-design` or `impeccable:craft`. Lane 6 ALWAYS keeps `seo-daily`.

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-29.** OAuth needed for lane 04 Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
