# Phase 55: Tech Debt & Documentation Cleanup - Research

**Researched:** 2026-03-04
**Domain:** TypeScript refactoring, ESLint, documentation maintenance
**Confidence:** HIGH

## Summary

Phase 55 is a pure cleanup phase with no new features. All work items come directly from the v3.0 milestone audit (`v3.0-MILESTONE-AUDIT.md`). The five success criteria map to five concrete, independently-executable tasks.

The audit identified the following actionable items: (1) `blastComboEffects.ts` at 476 lines is now UNDER the 500-line limit — the split already happened via `blastComboEffectsTactical.ts`; (2) legacy constants in `types.ts` need removal, but two (`MAGNET_RADIUS`, `MAGNET_ATTRACT_BONUS`) are actively used in `useBlastGame.ts`, while three (`RAINBOW_BONUS`, `GEM_USE_BONUS`, `GEM_COLLECT_BONUS`) have no non-test consumers; (3) `blastMultiplayerConstants.ts` has a `no-duplicate-imports` lint error from separate `import` and `import type` of the same module; (4) REQUIREMENTS.md checkboxes and traceability are already correct (updated by phases 53/54); (5) ROADMAP.md has two stale `[ ]` entries for 53-01 and 54-01 plans that are complete.

**Primary recommendation:** Execute as four sequential plans — (1) verify/confirm file-size compliance, (2) remove truly-dead constants + update the one stale test that references `RAINBOW_BONUS`, (3) fix the lint error in blastMultiplayerConstants.ts, (4) update ROADMAP.md stale checkboxes and the Coverage summary in REQUIREMENTS.md.

## Audit Findings — Exact Status per Success Criterion

### SC-1: blastComboEffects.ts split under 500 lines

**Current state:** `blastComboEffects.ts` = **476 lines**. The split already occurred — tactical combos were extracted to `blastComboEffectsTactical.ts` (132 lines). The split was done as part of Phase 48 work.

**Action needed:** Verify the file is compliant. No code changes required unless lines grew since the split.

Evidence:
```
fe-next/components/blast/utils/blastComboEffects.ts         — 476 lines
fe-next/components/blast/utils/blastComboEffectsTactical.ts — 132 lines
```

Also note: `blastComboEffectsTactical.ts` line 13 has its own `no-duplicate-imports` lint suppression comment:
```typescript
import { applyToTile, fireVortex, pushExplosion } from './blastComboEffects'; // eslint-disable-line no-duplicate-imports
```
The lint suppression is because it re-imports from the same module as the `import type` on line 11. This is a lint smell but not a lint ERROR since it's suppressed. The planner should decide whether to fix or leave.

### SC-2: Legacy constants removed from types.ts

**Location:** `fe-next/components/blast/types.ts` lines 141-165.

**Dead constants (no non-test consumers):**

| Constant | Defined at | Active consumers |
|----------|-----------|-----------------|
| `RAINBOW_BONUS` | L141 | TEST ONLY: `useBlastGame.test.ts` L49, L282 |
| `GEM_USE_BONUS` | L163 | TEST ONLY: `useBlastGame.gem.test.ts` imports and assertions |
| `GEM_COLLECT_BONUS` | L165 | TEST ONLY: `useBlastGame.gem.test.ts` imports and assertions |

**NOT dead — actively used:**

| Constant | Defined at | Active consumers |
|----------|-----------|-----------------|
| `MAGNET_RADIUS` | L155 | `useBlastGame.ts` L23 import, L1098-1099 loop bounds |
| `MAGNET_ATTRACT_BONUS` | L157 | `useBlastGame.ts` L24 import, L1107 scoring |

**Key insight:** The audit said all 5 are "dead code, no consumers" — this is INCORRECT for `MAGNET_RADIUS` and `MAGNET_ATTRACT_BONUS`. Only the 3 (`RAINBOW_BONUS`, `GEM_USE_BONUS`, `GEM_COLLECT_BONUS`) are actually dead in production code (only referenced from tests).

**Test impact of removal:**
- `useBlastGame.test.ts` L282: `expect(result.current.gameState.score).toBe(5 + RAINBOW_BONUS)` — uses `RAINBOW_BONUS` as numeric value (5). Replace with literal `10` (5 word score + 5 constant) or inline the value.
- `useBlastGame.gem.test.ts` L6 imports `GEM_USE_BONUS`, `GEM_COLLECT_BONUS` — tests use them in assertions. Can inline the values (3 and 8) directly or keep constants as test-local values.

The comment typo at `useBlastGame.ts` L1072 (`/ Solo Rainbow Boost:`) mentioned in the audit is already fixed. Current L1118 reads `// Solo Rainbow Boost:` correctly.

### SC-3: No lint errors in blastMultiplayerConstants.ts

**File:** `fe-next/shared/constants/blastMultiplayerConstants.ts`

**Issue:** Lines 6-7 import `BLAST_TILE_TYPE_LIST` and `BlastTileType` from the same module path `@/shared/types/blast` in two separate statements:
```typescript
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import type { BlastTileType } from '@/shared/types/blast'; // eslint-disable-line no-duplicate-imports
```

The lint suppression comment on line 7 masks the error. The ESLint rule `no-duplicate-imports` requires merging these into a single import statement.

**Fix pattern (merge into one statement):**
```typescript
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '@/shared/types/blast';
```

This is valid TypeScript/ESLint syntax — `type` modifier on individual specifiers in an inline import. The `eslint-disable-line` comment should be removed after the merge.

**Confidence:** HIGH — `import { value, type Type }` inline syntax is standard TypeScript 4.5+ and supported by the project (TS 5.9.3).

### SC-4: REQUIREMENTS.md checkboxes and traceability match audit

**Current state (post-phases 53 and 54):**
- All 35 requirement checkboxes are `[x]` — no stale `[ ]` entries remain.
- Traceability table shows all 35 requirements as "Complete".
- HOWEVER: The Coverage summary at line 119 still says:
  ```
  - Pending (gap closure): 5 (TILE-06, TILE-08, SYNC-01, SYNC-02, SYNC-04)
  ```
  This is stale — those 5 are now Complete (handled in phases 53 and 54).

**Action needed:** Update the Coverage summary block:
```
- Complete: 35
- Pending (gap closure): 0
```

### SC-5: ROADMAP.md plan checkboxes match actual completion

**Current stale entries:**
```
- [ ] 53-01-PLAN.md — Remove wildcard from BlastTileType union... (line 173)
- [ ] 54-01-PLAN.md — Wire comboType into submitWord emit... (line 188)
```

Both plans are complete (phases 53 and 54 are marked Complete in the Progress table). Change to `[x]`.

**Also stale in Progress table (line 230):**
```
| 55. Gap Closure — Tech Debt & Docs Cleanup | v3.0 | 0/0 | Pending | - |
```
The Plans count says `0/0` and phase name says "Gap Closure" instead of correct name "Tech Debt & Documentation Cleanup". This should be updated to match the actual phase description once plans are defined.

The v3.0 milestone header also shows `Phases 46-52` but phases 53-55 exist — this is an editorial note, not a requirement to change.

## Standard Stack

No new libraries. All work uses existing project patterns.

| Tool | Version | Purpose |
|------|---------|---------|
| TypeScript | 5.9.3 | Type-checking after constant removal |
| ESLint | project config | Lint verification (`npm run lint`) |
| Jest | project config | Test verification (`npm run test`) |

## Architecture Patterns

### Pattern 1: Inline type imports (TypeScript 4.5+)
Merging a value import and a type-only import from the same module:
```typescript
// Before (triggers no-duplicate-imports):
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import type { BlastTileType } from '@/shared/types/blast';

// After (single statement, ESLint-clean):
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '@/shared/types/blast';
```
**Source:** TypeScript 4.5 inline type imports — supported in all TS 4.5+ projects.

### Pattern 2: Removing exported constants with test consumers
When a constant is dead in production but still in tests, two options exist:
1. Remove constant from source and inline the literal value in test assertions.
2. Remove constant from source and define it as a test-local `const`.

Option 1 (inline literals) is preferred for constants like `RAINBOW_BONUS = 5` that are simple scalars and only appear in 1-2 assertion lines.

Option 2 (test-local const) is preferred for constants like `GEM_USE_BONUS` / `GEM_COLLECT_BONUS` that appear in many places across a test file.

### Pattern 3: Comment-only constants in types.ts
The legacy constants have JSDoc comments explaining they are replaced:
```typescript
/** Bonus for rainbow tiles (legacy — replaced by RAINBOW_BOOST_MULTIPLIER) */
export const RAINBOW_BONUS = 5;
```
When removing, remove both the constant and its JSDoc comment block.

### Anti-Patterns to Avoid
- **Removing MAGNET_RADIUS/MAGNET_ATTRACT_BONUS**: Audit said "dead" but they are actively used. Do NOT remove them.
- **Suppressing lint instead of fixing**: The `// eslint-disable-line` in blastMultiplayerConstants.ts should be fixed, not kept.
- **Changing test behavior**: Tests for RAINBOW_BONUS use old flat-bonus behavior. The test at `useBlastGame.test.ts:282` expects `5 + RAINBOW_BONUS` = `10`. Do not change the test expectation; only replace the import with a literal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| TypeScript inline type import | Custom syntax | Standard `import { value, type Type }` |
| Identifying dead exports | Manual grep | Already done — audit output is definitive |

## Common Pitfalls

### Pitfall 1: Removing MAGNET_RADIUS and MAGNET_ATTRACT_BONUS
**What goes wrong:** The audit listed all 5 constants as dead. MAGNET_RADIUS and MAGNET_ATTRACT_BONUS are imported and used in `useBlastGame.ts` (lines 23-24, 1098-1099, 1107). Removing them breaks the build.
**How to avoid:** Only remove RAINBOW_BONUS, GEM_USE_BONUS, GEM_COLLECT_BONUS.

### Pitfall 2: blastComboEffectsTactical.ts duplicate import suppression
**What goes wrong:** The file imports types and values from `./blastComboEffects` in two statements (lines 11 and 13) — the same pattern suppressed in blastMultiplayerConstants.ts. If the planner includes "fix all duplicate-import suppressions," this file needs a fix too.
**How to avoid:** Scope SC-3 precisely to `blastMultiplayerConstants.ts` as the audit states, or batch both files in one plan.

### Pitfall 3: GEM_USE_BONUS/GEM_COLLECT_BONUS still in test files
**What goes wrong:** After removing from types.ts, imports in `useBlastGame.gem.test.ts` will fail to compile.
**How to avoid:** When removing from types.ts, simultaneously update all test imports to use inline literals or test-local constants.

### Pitfall 4: REQUIREMENTS.md Coverage summary mismatch
**What goes wrong:** The Coverage block says "Pending: 5" even though all requirements are now Complete. Leaving it means the summary contradicts the traceability table above it.
**How to avoid:** Update the Coverage summary block as part of SC-4.

## Code Examples

### Fix for blastMultiplayerConstants.ts lint error
```typescript
// Source: TypeScript 4.5+ inline type import syntax
// Before:
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import type { BlastTileType } from '@/shared/types/blast'; // eslint-disable-line no-duplicate-imports

// After:
import { BLAST_TILE_TYPE_LIST, type BlastTileType } from '@/shared/types/blast';
```

### After removing RAINBOW_BONUS from types.ts — test update
```typescript
// Before (useBlastGame.test.ts L49, L282):
import { GOLD_MULTIPLIER, BOMB_RADIUS, RAINBOW_BONUS, ... } from '../types';
// ...
expect(result.current.gameState.score).toBe(5 + RAINBOW_BONUS);

// After (inline the literal — RAINBOW_BONUS was 5):
import { GOLD_MULTIPLIER, BOMB_RADIUS, ... } from '../types';
// ...
expect(result.current.gameState.score).toBe(10); // 5 (word score) + 5 (rainbow flat bonus)
```

### REQUIREMENTS.md Coverage block update
```markdown
**Coverage:**
- v3.0 requirements: 35 total
- Complete: 35
- Pending (gap closure): 0
- Mapped to phases: 35
- Unmapped: 0 ✓
```

### ROADMAP.md stale checkboxes update
```markdown
- [x] 53-01-PLAN.md — Remove wildcard from BlastTileType union, Records, and test assertions (TILE-06, TILE-08, SYNC-01) (Wave 1)
...
- [x] 54-01-PLAN.md — Wire comboType into submitWord emit + pass userId to useBlastComboDiscovery (SYNC-02, SYNC-04) (Wave 1)
```

## State of the Art

No framework or library changes. All patterns are established project conventions.

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Separate `import` + `import type` from same module | `import { value, type Type }` inline | Eliminates no-duplicate-imports errors |
| Legacy constants with doc comments | Remove constants, update test consumers | Dead code eliminated |

## Open Questions

1. **blastComboEffectsTactical.ts duplicate import suppression**
   - What we know: Line 13 has `// eslint-disable-line no-duplicate-imports` — same pattern as blastMultiplayerConstants.ts
   - What's unclear: SC-3 says "no lint errors in blastMultiplayerConstants.ts" — should tactical file be fixed too?
   - Recommendation: Fix both in the same plan for consistency. Merging in blastComboEffectsTactical.ts: `import { applyToTile, fireVortex, pushExplosion, type ComboEffectContext, type ComboEffectResult } from './blastComboEffects';`

2. **ROADMAP.md phase name for phase 55**
   - What we know: Progress table row says "Gap Closure — Tech Debt & Docs Cleanup" but phase is titled "Tech Debt & Documentation Cleanup"
   - What's unclear: Whether to update the progress table row name
   - Recommendation: Minor — update to match phase title exactly

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (project config) |
| Config file | `fe-next/jest.config.ts` |
| Quick run command | `cd fe-next && npm run test -- --testPathPattern="blastComboEffects\|blastMultiplayerConstants\|useBlastGame" --passWithNoTests` |
| Full suite command | `cd fe-next && npm run lint && npm run test` |

### Phase Requirements → Test Map
| Task | Behavior | Test Type | Automated Command |
|------|----------|-----------|-------------------|
| SC-1 verify | blastComboEffects.ts under 500 lines | static/wc | `wc -l fe-next/components/blast/utils/blastComboEffects.ts` |
| SC-2 remove constants | Types.ts exports compile clean | unit | `npm run test -- --testPathPattern="useBlastGame.test\|useBlastGame.gem"` |
| SC-3 lint fix | No no-duplicate-imports errors | lint | `npm run lint -- --quiet` |
| SC-4 docs update | REQUIREMENTS.md accurate | manual | Review Coverage block |
| SC-5 docs update | ROADMAP.md accurate | manual | Review plan checkboxes |

### Wave 0 Gaps
None — no new test files needed. Tests already exist; only modifications to existing test files (updating imports/literals when constants removed).

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `fe-next/components/blast/utils/blastComboEffects.ts` — 476 lines, already split
- Direct file inspection: `fe-next/components/blast/types.ts` L141-165 — legacy constants
- Direct file inspection: `fe-next/shared/constants/blastMultiplayerConstants.ts` L6-7 — duplicate import
- Direct grep: All consumers of `MAGNET_RADIUS`, `MAGNET_ATTRACT_BONUS`, `RAINBOW_BONUS`, `GEM_USE_BONUS`, `GEM_COLLECT_BONUS`
- Direct file inspection: `.planning/REQUIREMENTS.md` — checkboxes all `[x]`, Coverage block stale
- Direct file inspection: `.planning/ROADMAP.md` — two stale `[ ]` entries

### Secondary (MEDIUM confidence)
- `.planning/v3.0-MILESTONE-AUDIT.md` — source of all tech debt items (note: audit's "dead constants" claim for MAGNET_RADIUS/MAGNET_ATTRACT_BONUS is incorrect per direct verification)

## Metadata

**Confidence breakdown:**
- File state (SC-1, SC-2, SC-3): HIGH — direct file inspection
- Documentation state (SC-4, SC-5): HIGH — direct file inspection
- Audit accuracy: MEDIUM — MAGNET_RADIUS/MAGNET_ATTRACT_BONUS incorrectly listed as dead

**Research date:** 2026-03-04
**Valid until:** 2026-04-03 (stable codebase, no external deps)
