# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample (2026-06-04):** 6 report nights in window (05-29..06-04; 05-31 was a preflight abort, no report). Recovery trend is real: 05-29 and 05-30 were near-total timeout collapses (preflight abort on unpushed commits + phase-0 MCP spiral), but **06-01→06-04 every code lane completed** (rc=0). The 06-04 07:56 run: 6 lanes done in 124s–541s each, all rc=0. The `bd14fa03e` baseline-aware-gate + bounded-lane-budgets ship (06-03) + the `a2334a3b3` PreToolUse time guard (06-02) appear to have ended the exit-124 epidemic. Per-lane 6-night completion: 07=6/6, 04=6/6, 02=4/6, 03=4/6, 05=4/6, 06=4/6, 08=4/5, 01=3/6, 09=1/2.

## FOUNDER DIRECTIVE — applied 2026-06-04 (highest priority)
- **No hard file-count cap.** Founder (06-03 + 06-04): "Stop with the hard cap of amount of files, just do what you need." The 8-file cap was truncating multi-locale ships (ja/es fell back to key strings — see 06-03/06-04 lane 05). **SHIPPED:** `LEXI_LANE_FILE_CAP` default 8→999 in `headless.sh` (effectively uncapped). The **wall-clock finalize cutoff stays** — that's SIGTERM-sprawl safety, not the file-count cap the founder objected to. Lanes: ship ALL 5 locales in one night; never leave ja/es as key strings.

## Active watches (2026-06-04)
- **Homepage LCP 7107ms** — open since 06-03, still bad 06-04. Likely showcase3D/ScrollTrigger hero. CLS was 1.0; `250c4a0d4` (GSAP pin-spacer fix) shipped but `/free/multiplayer` CLS still reads 1.0 — verify the fix actually landed on the measured route.
- **`/en/word-hunt` LCP 8188ms** + **`/en/word-wheel` LCP 5244ms** — NEW 06-04, undiagnosed. Highest-impact perf targets.
- **`/en/multiplayer` regressing again:** LCP 3010ms (06-02) → 4237ms (06-04); CLS 0.512, INP 528ms persist. Skeleton-vs-hydrated-lobby height mismatch. `/es/multiplayer` LCP 4174ms NEW (same cause).
- **Gate completion strong (06-01→06-04)** — keep the bounded-budget + baseline-gate combo; do not loosen.

## What works (validated this week)
- **Phase-0 intel brief + scoped MCP** — front-loaded ranked signals; 06-01 evening 9/9 completed, 06-04 6/6 rc=0. (validated 4+ nights)
- **Bounded lane budgets + baseline-aware gate** (`bd14fa03e`) — ended the timeout collapse; ships authored code when failing tests already fail on clean HEAD. (validated 06-03/06-04)
- **PreToolUse time+scope guard** (`a2334a3b3`) — mechanical deny past finalize cutoff; no partial-poisoned gate since. (validated 3 nights)
- **Direct-to-master single end-of-run commit** — one rollback target, one Railway deploy. 18+ nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across window. (stable)
- **`npm run build:fast` gate** — 3× faster, same signal. (stable)
- **Autonomy matrix** — reversible+small→ship; policy/auth/economy/irreversible→queue. 0 reverted. (stable)
- **PostHog REST helper** — avoids PostHog MCP hangs for data queries. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Mandatory-Minimum-Artifact** — every lane writes an artifact file; floor never zero. (stable)
- **Founder-directive fast path** — sealed-bid 05-29, share-card 06-01, word-tower-pool 06-03, file-cap removal 06-04. (validated 5×)
- **TDD on new pure modules** — dailyLetterPool 06-03 (14 tests), word-wheel rarity 06-01. Highest ship rate for new code. (stable)
- **Lightweight lanes dominate** — 07=100%, 04=100%. Low/zero MCP dependency = no timeout. (stable)

## What to avoid (failed this week)
- **Preflight abort on unpushed founder commits** — 05-29/05-30/05-31 rejected on dirty HEAD (unpushed `leaderboard/page.tsx`). Still NO handler; this caused the worst nights of the window. Status: needs a stash-or-warn path. #1 unaddressed infra gap.
- **Phase-0 MCP spiral** — 05-29/05-30: serial Sentry+Supabase+PostHog calls on lanes 01/02/03 summed past budget → cascade timeout. MAX_MCP_CALLS cap still un-shipped.
- **Phased multi-night locale ships** — sealed-bid + word-tower both needed 2–3 nights to finish ja/es. With the file cap now removed, land ALL locales in ONE night.
- **Over-scoped lane work** — three half-finished edits ship nothing; one complete gate-clean change ships. (kept)
- **Reddit JSON API blocked (10+ nights)** — RSS fallback `33f8641c3` works from residential IP; JSON/OAuth still dead. Use RSS, stop retrying JSON.
- **Search collector dead 10+ nights** — 0 signals. Remove it.
- Per-lane commits — banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn→debug` to silence Sentry — root-cause or queue, never mute. (kept)
- **Self-summarizing a wrong root cause** — read the actual log + all runs for a date, not prior summaries. (kept)

## Open watches (carry forward)
- **Homepage LCP 7107ms / word-hunt 8188ms / word-wheel 5244ms** — NEW/open, undiagnosed. Status: critical.
- **`/en/multiplayer` LCP 4237ms re-regression + CLS 0.512 + INP 528ms** — skeleton height mismatch in `PageClient.tsx`. Status: open, worsening.
- **`/free/multiplayer` CLS 1.0** — supposedly fixed `250c4a0d4`; still measuring 1.0. Verify fix reached the route. Status: open.
- **Preflight abort handler for unpushed commits** — 3 nights lost to it. Status: open, high.
- **MCP cumulative timeout** — MAX_MCP_CALLS=3 proposed, un-shipped. Status: open (10 nights).
- **`PageClient.tsx` line bloat** (519→600+) + `SinglePlayerResults.tsx` 500+ — refactor deferred. Status: open.
- **Dead experiment flags** — `show-signup-after-first-win`, `share-prompt-timing` wired, 0 exposures. Prune. Status: open.
- **GSC token scope** — `webmasters.readonly` missing from ADC; lanes 06/08 fall back to Bing-only. 9+ nights. Status: open.
- **Reddit OAuth migration** — blocked 10+ nights; RSS fallback covers it. Spec `docs/nightly/reddit-oauth-setup.md`. Status: low (RSS works).
- **Founder idea:build backlog** — Fading Grid Sprint (05-29), Word Detective daily (06-01), Word Heist MP (06-02), all un-built. Status: open.
- **Word Tower daily-letter wiring** — module shipped 06-03; hook+UI+reward-ad integration next (founder 06-02 free-text: daily letters, run-out gate, reward-ad refill/hint/sabotage). Status: open, founder-requested.
- **Admin-session perf noise** — filter admin player_ids from HogQL. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | 3/6; succeeds scoped to 1 fix (churn-signals 500 06-04) |
| 02 perf | `superpowers:systematic-debugging` | 4/6; LCP fixes shipped 06-01/06-04 |
| 03 engagement | none | 4/6; prompt-driven, event instrumentation shipped 3 nights |
| 04 competitor | `humanizer` | 6/6; applied to idea drafts, 0 timeouts |
| 05 landing | `frontend-design` (mandatory) | 4/6; sealed-bid + word-tower-sabotage UI shipped |
| 06 seo | `seo-daily` (mandatory) | 4/6; reliable scoped to title/meta/cross-links |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 4/5; word-count/content ships, GSC-scope-blocked |

**Rules for lane 7 updating this table:**
- Add a skill if invoking it correlated with a shipped (not reverted) outcome in ≥2 nights.
- Remove a skill if its lane reverted ≥2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count).
- Cap each row at 4 skills; drop lowest-evidence first.
- Lane 5 ALWAYS keeps `frontend-design` or `impeccable:craft`. Lane 6 ALWAYS keeps `seo-daily`.

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use the RSS fallback (`33f8641c3`); OAuth still un-configured.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
