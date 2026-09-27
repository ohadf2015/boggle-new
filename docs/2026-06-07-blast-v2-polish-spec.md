# Blast Mode v2 Polish — Spec (2026-06-07)

Goal (founder, ohadf2015): bonus-word calc, blast/falling physics, result-page insights,
over-tall towers, **progress not saved**, **chest progress broken**, HUD design.

## Evidence (DB + code, this session)

- Migration `20260512110115_blast_v2_tables` IS applied. Tables exist.
- `blast_progress`: 5 rows, all `max_level_cleared=0, total_coins_earned_blast=0, current_chest_progress=0.00`.
- `blast_level_clears`: 43 rows, rich (coins 110–290, gems 9–21, cascades 2–5) — **every row `stars=1`**.
- `blast_chests`: **0 rows** (no chest ever opened).
- User `00952ce3` cleared L1–15 yet progress `current_level=2`. `updated_at` frozen at the
  level-1 INSERT instant (155ms) — *before* the level-1 clear insert (373ms).

## ROOT CAUSE (CONFIRMED, current code)

`increment_blast_progress(uuid,numeric,integer,integer)` declares
`RETURNS TABLE(total_coins_earned_blast integer, current_chest_progress numeric, current_chest_number integer)`.
Those OUT names shadow the table columns, so:

```
ERROR 42702: column reference "total_coins_earned_blast" is ambiguous
```

The UPDATE throws **every call** → `max_level_cleared`/coins/chest_progress never persist;
`current_level` only ever gets the value from the `INSERT` (clear-level/route.ts:93).
Chest never fills → `blast_chests` empty. `clear-level/route.ts:124` swallows the error
(`{ data: updated }`, no `error`) → invisible for ~25 days.

Same class as repo's prior `fix_sync_coins_ambiguity` / `fix_sync_coins_qualify_table_refs`.
`authed_can_exec=true` → not a privilege issue. `current_chest_progress` is `numeric(3,2)`
(exact) so open-chest's `>= 1.0` gate has no float bug.

Secondary: `clear-level/route.ts:76` `const stars = 1` — server NEVER computes the real
rating despite the level being resolved at line 63. `starRating()` lives in `lib/blast/v2/anti-cheat.ts`.

Functional (bonus): `lib/blast/v2/bonus-dict-loaders.ts` returns empty sets (stubbed) →
the L25 bonus-dictionary mechanic is dead; bonus words only resolve via the async
`/api/dictionary/check` round-trip (perceived lag).

## Phases (highest-confidence first; commit per phase, ask before commit)

**A — Progress + chest persistence (CONFIRMED, backend).**
1. Migration: recreate `increment_blast_progress` with table-qualified column refs.
2. `clear-level/route.ts`: capture + log RPC/insert errors; compute real server-side stars via `starRating()`.
3. Backfill 5 corrupt `blast_progress` rows from `blast_level_clears` (coins + max_level + current_level; chest best-effort).
4. TDD: route test (RPC error surfaced; stars computed). Apply migration via MCP + commit file.

**B — Result insights (#3).** Real stars + interesting, true stats in BlastLevelCompleteCard/FailedCard.

**C — Bonus words (#1).** Length-scaled bonus scoring; fix/replace dead bonus-dict path.

**D — Tower height (#4).** Lower/smarter silhouette ceilings, wider sophisticated shapes.

**E — Physics (#2).** Admin Playwriter playtest → tune fall cadence/squash/cascade telegraph.

**F — HUD (#7).** `/impeccable` pass on BlastHud + BlastChestBadge.
