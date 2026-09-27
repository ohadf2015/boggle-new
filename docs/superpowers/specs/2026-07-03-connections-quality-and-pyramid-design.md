# Connections (Word Bridge) — Quality Overhaul + Bridge Pyramid Mode

Date: 2026-07-03
Status: approved (autonomy directive)

## Problem

Players rate Connections puzzles badly. Evidence (prod DB, 2026-07-03):

- Hebrew feedback: 38 dislike vs 25 like; **37/38 dislikers gave up** — answers unguessable or rejected.
- `accepted_answers` is **empty on 100% of active puzzles in all locales** — only the exact bridge string is accepted; legit inflections/variants count as wrong and burn a life.
- `quality_score` never populated (0 rows) — the quality gate designed into the schema was never wired. Serving is fail-open over the whole pool.
- Generation validates only Wikipedia bigram frequency (`lib/connections/generator/validator.ts`); its own comments note Hebrew speakers reject the output (reversed smichut, English calques). No semantic/native judge exists.
- Disliked Hebrew riddles are loose adjective collocations (`סרט ישראלי`, `מדבר חם`), not compounds — many plausible answers, one accepted.
- Pools: en 237 active / he 445 / es 71 / ja 122 / sv 72 / **ru 0**. Hints missing on 88% he, 81% en.

## Goals

1. Every served puzzle passes a native-speaker quality judge (fail-closed, like Word Hunt daily).
2. Fair input: accepted answer variants + hints on every active puzzle.
3. Pools refilled per locale (incl. ru) with judged puzzles.
4. New attractor mode: **Bridge Pyramid** — 3 bridge riddles → their 3 answers become the clue words of a final riddle (find the word that pairs with all 3). Daily, shareable.

## Non-goals

- No change to daily leaderboard schema/scoring of the existing 5-puzzle daily.
- No UGC pipeline changes.
- No v2/NYT-style grouped-grid mode.

## Part A — Quality pipeline (fail-closed)

Mirrors the proven Word Hunt "bulletproof" pattern (dual-judge sweep + fail-closed serving).

### A1. Dual-judge sweep (offline, this session + reusable skill)

- Sweep ALL rows in `connections_puzzles` per locale with two independent LLM personas:
  - **Native editor**: is `word1+bridge` AND `bridge+word2` each a natural, common compound/collocation a native would recognize instantly once seen? Penalize reversed smichut, calques, generic adjective pairings.
  - **Puzzle designer**: is the bridge *fairly guessable* and *sufficiently unique* (no other common word fits both slots)? Sane difficulty label?
- Both score 0–100; row `quality_score = min(both)`. Judge also returns: `accepted_answers` variants (inflections, spelling variants, final-letter forms for he), a native non-literal `hint` when missing, and corrected `difficulty`.
- Persist: `quality_score`, `accepted_answers`, `hint`, `difficulty`; set `is_active=false` where `quality_score < 60`. Admin `bad` verdicts and auto-ban view stay authoritative (never reactivate those).
- Vehicle: session-run agent sweep (same pattern as `dictionary-improvement` skill) writing via Supabase MCP; plus a `docs/` runbook so it can be re-run.

### A2. Fail-closed materialization

- `scripts/connections/materialize-puzzles.mjs` gains gate: only materialize rows with `is_active AND quality_score >= 60`. A puzzle with NULL score does NOT ship (fail-closed). Keep `council-seed`/`authored` sources subject to the same gate — they get judged too.
- Re-materialize all locale pools after sweep. Refresh `CURATED_OPENING` for es/sv/ja/ru from top-judged easy puzzles.

### A3. Pool refill (generation + judge)

- Generate new puzzles per starving locale (es, sv, ja, ru; top-up en/he hard tier) via LLM generation constrained to true compounds/strong collocations; every candidate passes the same dual judge before insert (`source='generated'`, judged score persisted, active only if ≥60).
- Targets: ≥150 active judged puzzles per locale (ru from 0 → ≥150).

### A4. Runtime fairness fixes

- Verify guess-matching uses `acceptedAnswers` (case/nikkud-insensitive, trim); extend if exact-only.
- Hint exists on every active puzzle post-sweep, so the ad-gated hint button always has content.

## Part B — Bridge Pyramid mode

### Shape

Daily meta-puzzle: 3 base riddles + 1 finale.

1. Player solves 3 independent bridge riddles (word1 · ? · word2). Their bridges A, B, C.
2. Finale: A, B, C displayed as the three clue words; find M that forms a compound/strong collocation with each (Remote-Associates shape).
3. Share grid variant with pyramid emoji layout; same lives/hint economics as daily.

### Data

New table `connections_pyramid_puzzles`:

```
id text pk            -- {locale}-pyr-{n}
locale text
meta_answer text      -- M
meta_accepted text[]
meta_hint text
base jsonb            -- [{word1,bridge,word2,accepted,hint,difficulty} x3] (bridge = A/B/C)
difficulty text
quality_score numeric
is_active boolean
source text
created_at/updated_at
```

Self-contained base riddles (not FK into `connections_puzzles`) — a pyramid is authored as a unit so the 3 bridges are guaranteed to pair with M. Generated offline: pick M → find A,B,C pairing with M → build a base riddle around each → dual-judge the whole pyramid (each base riddle + finale fairness). Materialized to `lib/connections/puzzles/generated/pyramid.<locale>.generated.ts`, same deterministic daily selection (FNV-1a date:locale hash) as existing daily.

Initial content: ≥30 judged pyramids per locale for en+he; es/sv/ja/ru follow-up.

### UI / routes

- Route `app/[locale]/connections/pyramid` alongside daily/play/community.
- Reuses `PuzzleCard` input machinery; new `PyramidProgress` visual: 3 base slots stacked under the apex slot, solved bridges slide up into the finale as its clue words.
- Scoring: base riddles per difficulty (existing table), finale 500. Local streak + share; **no separate leaderboard in MVP** (results screen + share grid only).
- Entry points: card on connections landing + daily-complete cross-promo ("Try today's Pyramid").
- i18n: all new strings via `t()` in all 6 locales.

### Failure/edge behavior

- Pool empty for locale → mode card hidden (no dead route).
- Base riddle give-up reveals bridge and still feeds finale (marked 🟥 in share grid).
- Finale wrong guesses cost lives from the same 3-life pool; out of lives = run over, reveal, share.

## Testing

- TDD per project rules. Unit: pyramid daily selection determinism, gate filter in materializer, accepted-answer matching (he final letters, case), scoring, share grid. Component: pyramid flow (3 solved → finale unlock → win/lose).
- Judge sweep verified by counts: every active row has score ≥60, hint, ≥1 accepted answer.

## Runbook — re-running the judge sweep

The sweep is an agent-run content op (no runtime code). To re-run (e.g. after a new import):

1. Partition work by id ranges: `select id, ntile(N) over (partition by locale order by id) from connections_puzzles where is_active` — one agent per bucket, ranges are static so concurrent agents never collide.
2. Per agent (sonnet): judge each row as two personas — native editor (both phrases natural + very common; reversed smichut/calques/technical terms/generic adjective pairings fail) and puzzle designer (bridge guessable + unique, difficulty sane). `quality_score = least(editor, designer)`; also emit accepted_answers variants, answer-free native hint, corrected difficulty.
3. Persist per ~25-row chunk with a single `update … from (values …)` statement; `is_active = (q >= 60)`. Fresh candidates are inserted `is_active=false, quality_score=null` by generator agents and only activated by an independent judge agent.
4. Enforce admin verdicts after: `update connections_puzzles p set is_active=false from connections_puzzle_reviews r where r.puzzle_id=p.id and r.verdict='bad' and p.is_active;`
5. Verify: zero active rows with NULL score or empty hint; then `node scripts/connections/materialize-puzzles.mjs <locales…>` (gated `quality_score >= 60`, fail-closed) and commit the regenerated pools.
6. GOTCHA (learned 2026-07-03): agents sometimes "finish" without persisting — always verify by state (`count(quality_score)`) per range, never trust the agent's summary.

Pyramids: same pattern over `connections_pyramid_puzzles` (judge the unit: 3 base riddles + finale fairness), then `node scripts/connections/materialize-pyramids.mjs <locales…>`.

## Rollout

1. A1 sweep he+en first (biggest pain), then es/sv/ja; A3 ru generation.
2. A2 gate + re-materialize + A4 → ship (this closes "puzzles are bad").
3. B pyramid en+he → ship behind landing card.
