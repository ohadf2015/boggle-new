# Phase 53: Wildcard Type Cleanup - Research

**Researched:** 2026-03-04
**Domain:** TypeScript type union cleanup, test consistency, shared constants
**Confidence:** HIGH

## Summary

Wildcard was removed from the spawn distribution in Phase 47 (set to 0 in all wave distributions), but `'wildcard'` remains in the `BlastTileType` union and `BLAST_TILE_TYPE_LIST` in `shared/types/blast.ts`. This creates contradictory test assertions — some tests assert wildcard IS in the list (the canonical type tests), while newer tests written after Phase 47 assert it IS NOT. The type union also flows into `BLAST_TILE_TYPES` in multiplayer constants via `BLAST_TILE_TYPE_LIST`, and into `BLAST_TILE_BONUSES` which still assigns `wildcard: 1`.

The fix is a narrow, purely mechanical change: remove `'wildcard'` from the union and the list, then fix the 5-6 test files that assert the old 14-type reality. No game logic needs to change — wildcard is already blocked from spawning everywhere else.

**Primary recommendation:** Remove `'wildcard'` from `shared/types/blast.ts` (union + list), update the two contradictory test files (`shared/types/__tests__/blast.test.ts` and `backend/modules/__tests__/blastModeManager.test.ts`), remove the `wildcard` entry from `BLAST_TILE_BONUSES`, update stale test comments, and fix the `SPECIAL_TILE_DISTRIBUTION` and `BlastTileRules.ts` records that still carry wildcard keys.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TILE-06 | Wildcard tile removed from tile registry and spawn distribution | Remove from `BlastTileType` union, `BLAST_TILE_TYPE_LIST`, `SPECIAL_TILE_DISTRIBUTION`, and all Record<BlastTileType, ...> definitions |
| TILE-08 | Tile type enum unified between singleplayer and multiplayer into single shared `BlastTileType` in `shared/types/` | Already done structurally in Phase 46. This phase confirms the union itself no longer contains wildcard, keeping SP and MP in sync |
| SYNC-01 | All new/reworked tile types available in multiplayer blast games | `BLAST_TILE_TYPES` in `blastMultiplayerConstants.ts` derives from `BLAST_TILE_TYPE_LIST` — removing wildcard from the list automatically removes it from MP. No separate MP-side change needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type union definition | Already in use; union type removal is a compile-time change |
| Jest | project-standard | Test assertion updates | All contradictory assertions are in Jest test files |

No new libraries required. This is a pure refactor within existing files.

## Architecture Patterns

### Pattern: Single-source-of-truth type union

The canonical type lives in `shared/types/blast.ts`. Every consumer imports from there (or through `components/blast/types.ts` which re-exports). Removing from the source automatically fixes all TypeScript-typed usages. Only hardcoded string arrays and `Record<BlastTileType, ...>` objects need manual cleanup.

### Pattern: Record exhaustiveness

TypeScript `Record<BlastTileType, V>` objects are exhaustive — removing `'wildcard'` from the union means the compiler will flag any Record that still has a `wildcard` key (or is missing it). Use this as a guide: after removing from the union, run `tsc --noEmit` and fix every TS error.

### Anti-Patterns to Avoid

- **Removing only the union but not the list:** `BLAST_TILE_TYPE_LIST` is a runtime `as const` array — TypeScript will not flag it automatically. Must be updated manually in sync with the union.
- **Forgetting to update `BLAST_TILE_BONUSES`:** The `Record<BlastTileType, number>` in `blastMultiplayerConstants.ts` still has `wildcard: 1`. After union removal, TS will flag this as an excess property.
- **Fixing implementation without fixing tests:** Several test files assert the old 14-type world. They need coordinated updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all wildcard references | Manual grep | `grep -rn "wildcard" fe-next/` (excluding node_modules) | Already done in research; full list below |
| Verifying no wildcard spawns | Runtime sampling test | Existing test in `useBlastGame.mirrorGoldTier.test.ts` (1000-tile sample) | Already asserts `not.toContain('wildcard')` — becomes the regression guard |

## Complete Wildcard Reference Inventory

Confirmed via grep of all source files (excluding `node_modules`). Grouped by action needed:

### Action: Remove from type/list (source of truth)

| File | Line | What | Action |
|------|------|------|--------|
| `shared/types/blast.ts` | 24 | `\| 'wildcard'` in union | Remove from union |
| `shared/types/blast.ts` | 41 | `'wildcard'` in `BLAST_TILE_TYPE_LIST` | Remove from array |

### Action: Remove Record key (will become TS error after union change)

| File | Line | What | Action |
|------|------|------|--------|
| `shared/constants/blastMultiplayerConstants.ts` | 32 | `wildcard: 1` in `BLAST_TILE_BONUSES` | Remove key |
| `components/blast/types.ts` | 228 | `wildcard: 0` in `SPECIAL_TILE_DISTRIBUTION` | Remove key |
| `lib/phaser/logic/BlastTileRules.ts` | 40 | `wildcard: 0xc8c8ff` in `TILE_TINTS` | Remove key |
| `lib/phaser/logic/BlastTileRules.ts` | 59 | `wildcard: 0xffffff` in `TILE_BORDERS` | Remove key |
| `lib/phaser/logic/BlastTileRules.ts` | 84 | `wildcard: {...}` in `GLOW_BASES` | Remove key |

### Action: Update tests (contradictory assertions)

| File | Line | Current assertion | New assertion |
|------|------|-------------------|---------------|
| `shared/types/__tests__/blast.test.ts` | 8-9 | `toHaveLength(14)` | `toHaveLength(13)` |
| `shared/types/__tests__/blast.test.ts` | 17-19 | `toContain('wildcard')` | `not.toContain('wildcard')` (or delete test) |
| `shared/types/__tests__/blast.test.ts` | 42 | `'wildcard'` in expected array | Remove from array |
| `backend/modules/__tests__/blastModeManager.test.ts` | 232-235 | `toHaveLength(14)` + `'wildcard'` in list | `toHaveLength(13)`, remove `'wildcard'` |

### Action: Update stale comments/strings (non-blocking but clean)

| File | Line | What | Action |
|------|------|------|--------|
| `lib/phaser/logic/__tests__/BlastTileRules.test.ts` | 21 | Comment "All 14 tile types...including wildcard" | Update to "13 types" |
| `lib/phaser/logic/__tests__/BlastTileRules.test.ts` | 23 | `'wildcard'` in `ALL_TYPES` local array | Remove |
| `lib/phaser/logic/__tests__/BlastTileRules.test.ts` | 32 | `t !== 'wildcard'` filter | Remove the filter condition |
| `components/blast/utils/__tests__/blastLevelClear.test.ts` | 175-182 | Test "includes rainbow and wildcard tiles" using `makeTile(..., 'wildcard', ...)` | Rename test; replace wildcard with a valid type (e.g., `'mirror'`) |
| `components/blast/__tests__/useBlastGame.treasureGem.test.ts` | 390 | Comment listing `wildcard` as possible spawn | Update comment |
| `components/blast/__tests__/useBlastGame.rainbowBoost.test.ts` | 539 | `type === 'wildcard'` guard in loop | Remove the wildcard guard |
| `components/blast/types.ts` | 156 | JSDoc "wildcard/rainbow attracted by magnet" | Update to just "rainbow" |
| `lib/phaser/logic/BlastTileRules.ts` | 114-115 | Comment "Wildcard is in BlastTileType union but never spawned" | Remove/update comment |
| `phaser/objects/BlastTile.ts` | 727-728 | `blastType !== 'wildcard'` guard | Remove the wildcard guard |

### Already correct (no change needed)

| File | What | Why already fine |
|------|------|-----------------|
| `components/blast/utils/blastWaveConfig.ts` | "No wildcard in any wave" comment | Accurate — leave as-is |
| `components/blast/utils/__tests__/blastWaveConfig.test.ts` | `dist.wildcard ?? 0` checks | Uses `?? 0` so safe if key absent; tests still pass |
| `lib/phaser/logic/BlastTileRules.ts` | `BLAST_TILE_CONFIGS` uses `Exclude<BlastTileType, 'standard' \| 'wildcard'>` | Already excludes wildcard; after union removal, just becomes `Exclude<BlastTileType, 'standard'>` |
| `components/blast/__tests__/useBlastGame.mirrorGoldTier.test.ts` | Asserts `not.toContain('wildcard')` | Already the correct assertion; becomes regression guard |

## Common Pitfalls

### Pitfall 1: BLAST_TILE_TYPE_LIST not auto-caught by TypeScript

**What goes wrong:** The `as const` array at line 27-42 of `blast.ts` is typed `readonly BlastTileType[]`. After removing `'wildcard'` from the union, the string literal `'wildcard'` in the array becomes a TS error. This IS caught — but only if you update the union first.

**How to avoid:** Update union and list in the same edit. Run `tsc --noEmit` immediately after.

### Pitfall 2: blastWaveConfig tests use `dist.wildcard ?? 0`

**What goes wrong:** These tests use optional chaining with fallback (`?? 0`), meaning they pass whether or not wildcard is a key. They are already testing the right behavior (wildcard = 0 in all waves) and do not need to change.

**How to avoid:** Leave these tests alone. They are forward-compatible with the removal.

### Pitfall 3: BlastTileRules ALL_TYPES local array

**What goes wrong:** `lib/phaser/logic/__tests__/BlastTileRules.test.ts` defines its own local `ALL_TYPES` array that includes `'wildcard'` (line 23). The `getBlastTileTint` test iterates `ALL_TYPES` and expects a valid hex for every type. After removing wildcard from the union, the tint/border/glow Records will no longer have a wildcard key — so calling `getBlastTileTint('wildcard')` will return `undefined` or throw.

**How to avoid:** Update the local `ALL_TYPES` array in the test file to remove `'wildcard'`. The `SPECIAL_TYPES` filter on line 32 (`t !== 'wildcard'`) then becomes a no-op and can be removed.

### Pitfall 4: blastLevelClear test uses wildcard as tile type

**What goes wrong:** `blastLevelClear.test.ts` line 178 creates a tile with `type: 'wildcard'`. After removing from the union, this becomes a TypeScript error.

**How to avoid:** Replace `'wildcard'` with any valid special tile type in that test (e.g., `'mirror'`). The test logic (counting uncleared specials) is unaffected by which specific type is used.

### Pitfall 5: Pre-existing test failures (do not own)

**What goes wrong:** Running the full test suite shows 4 pre-existing failures unrelated to this phase (NeoLoader, SinglePlayerGame, GlobalBottomNav, PlayerWaitingViewShareButton). Do not get confused — these are documented in MEMORY.md as pre-existing.

**How to avoid:** Filter test runs to blast-related suites when verifying this phase's work.

## Code Examples

### Removing from union and list
```typescript
// shared/types/blast.ts — BEFORE
export type BlastTileType =
  | 'standard'
  | 'gold'
  // ... other types ...
  | 'wildcard';  // REMOVE THIS LINE

export const BLAST_TILE_TYPE_LIST: readonly BlastTileType[] = [
  'standard',
  // ... other types ...
  'wildcard',  // REMOVE THIS LINE
] as const;
```

### Removing from Record (BLAST_TILE_BONUSES)
```typescript
// shared/constants/blastMultiplayerConstants.ts — BEFORE
export const BLAST_TILE_BONUSES: Record<BlastTileType, number> = {
  standard: 1,
  // ...
  wildcard: 1,  // REMOVE THIS LINE
};
```

### Updating the contradictory test
```typescript
// shared/types/__tests__/blast.test.ts — AFTER
it('should contain exactly 13 tile types', () => {
  expect(BLAST_TILE_TYPE_LIST).toHaveLength(13);
});

it('should NOT contain wildcard', () => {
  expect(BLAST_TILE_TYPE_LIST).not.toContain('wildcard');
});
```

### Updating blastLevelClear test
```typescript
// components/blast/utils/__tests__/blastLevelClear.test.ts — AFTER
it('includes rainbow and mirror tiles', () => {
  const grid = makeGrid([
    makeTile(0, 0, 'rainbow', false),
    makeTile(1, 1, 'mirror', false),  // was 'wildcard'
  ]);
  const result = buildAutoTriggerSequence(grid);
  expect(result).toHaveLength(2);
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (frontend: `npm run test:frontend`, backend: `npm run test:backend`) |
| Config file | `fe-next/jest.config.ts` |
| Quick run command | `cd fe-next && npx jest --testPathPattern="shared/types/__tests__/blast|useBlastGame.mirrorGoldTier|blastModeManager|BlastTileRules" --no-coverage` |
| Full suite command | `cd fe-next && npm run test -- --no-coverage` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TILE-06 | `BLAST_TILE_TYPE_LIST.length === 13` and no `'wildcard'` | unit | `npx jest --testPathPattern="shared/types/__tests__/blast" --no-coverage` | Yes (needs update) |
| TILE-06 | `BLAST_TILE_TYPES` (MP constant) has 13 types | unit | `npx jest --testPathPattern="blastModeManager" --no-coverage` | Yes (needs update) |
| TILE-06 | `generateTileStates` never produces wildcard | unit | `npx jest --testPathPattern="useBlastGame.mirrorGoldTier" --no-coverage` | Yes (already passes) |
| TILE-08 | `BlastTileType` union same for SP and MP | type-check | `cd fe-next && npx tsc --noEmit` | Via tsc |
| SYNC-01 | MP uses same tile pool as SP (no wildcard) | unit | `npx jest --testPathPattern="blastModeManager" --no-coverage` | Yes (needs update) |

### Sampling Rate
- **Per task commit:** `cd fe-next && npx jest --testPathPattern="shared/types/__tests__/blast|useBlastGame.mirrorGoldTier|blastModeManager|BlastTileRules|blastLevelClear" --no-coverage`
- **Per wave merge:** `cd fe-next && npm run test:frontend -- --no-coverage`
- **Phase gate:** Quick suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — all test files already exist. Updates are in-place edits to existing assertions.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wildcard as active type with 0.17 spawn rate | Wildcard zeroed out in all wave distributions | Phase 47 | No wildcard tiles spawn, but type still exists in union causing test contradictions |
| Separate SP/MP tile type enums | Single `BlastTileType` in `shared/types/blast.ts` | Phase 46 | TILE-08 structurally complete; this phase finishes it by removing the stale wildcard entry |

## Open Questions

1. **`blastWaveConfig.test.ts` `dist.wildcard ?? 0` pattern**
   - What we know: Tests check `dist.wildcard ?? 0 === 0` — safe whether or not key exists
   - What's unclear: Whether to remove these checks as dead code now
   - Recommendation: Leave as-is — they are harmless, document that wildcard will simply not appear in the distribution Record (since it's no longer a valid key to set), and the `?? 0` makes the tests forward-compatible with the removal.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all 8 source files listed above — all wildcard occurrences enumerated by grep
- `shared/types/blast.ts` — canonical definition, lines 10-42 read directly
- `shared/constants/blastMultiplayerConstants.ts` — full file read
- `shared/types/__tests__/blast.test.ts` — full file read, contradictions confirmed
- `lib/phaser/logic/BlastTileRules.ts` — full file read, Record entries confirmed
- `components/blast/utils/blastWaveConfig.ts` — relevant section read, "no wildcard" comment confirmed
- Test run: `npx jest --testPathPattern="useBlastGame.mirrorGoldTier"` — confirmed 1 test failing (`wildcard is NOT in BLAST_TILE_TYPE_LIST`)

## Metadata

**Confidence breakdown:**
- Source inventory: HIGH — exhaustive grep of all source files
- Test impact: HIGH — each failing/stale test identified and fix specified
- Architecture: HIGH — simple union removal with TS compiler as guide

**Research date:** 2026-03-04
**Valid until:** Indefinite (stable TypeScript refactor; no external dependencies)
