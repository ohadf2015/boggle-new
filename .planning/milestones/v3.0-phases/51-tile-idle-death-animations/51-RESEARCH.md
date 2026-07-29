# Phase 51: Tile Idle and Death Animations — Research

**Researched:** 2026-03-04
**Domain:** Phaser 3 tween-based animations on BlastTile / LetterTile layer
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TILE-10 | Each tile type has unique idle animation in Phaser layer (breathing, wobble, shimmer, cycling, etc.) | Foundation already in BlastTile.startTypeSpecificTween(); needs extension for mirror, silver, diamond; existing test file BlastTile.idle.test.ts covers patterns |
| TILE-11 | Each tile type has unique death/clear animation in Phaser layer (shatter, dissolve, refract, burst, etc.) | Foundation in BlastTile.playClearAnimation() (generic squash+particles); needs per-type branching; existing test file BlastTile.clearAnimation.test.ts covers harness |
</phase_requirements>

---

## Summary

Phase 51 adds per-type idle and death animations to all 13 `BlastTileType` values (standard + 12 specials). The Phaser layer is `fe-next/phaser/objects/BlastTile.ts`, which extends `LetterTile.ts`. The base breathing idle and generic squash-clear are already implemented and tested. This phase closes the two gaps: (1) the 3 new tile types from Phase 47 (mirror, silver, diamond) have no idle personality yet, and (2) every tile type plays the same generic squash-rotate-fade clear instead of a type-specific death.

The existing architecture is clean and ready: `startTypeSpecificTween()` is the hook for TILE-10, and `playClearAnimation()` is the hook for TILE-11. Both have test harnesses in `__tests__/`. Adding new behavior follows the established pattern of adding switch-case branches + jest assertions that match tween properties.

**Primary recommendation:** Extend `startTypeSpecificTween()` with mirror/silver/diamond cases, then branch `playClearAnimation()` by tile type. Write tests first (project mandates strict TDD). Two plan files as scoped in the phase outline.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Phaser 3 | ^3.87.0 | Game engine — tweens, particles, graphics | Already in project, transpilePackages wired, jest mock present |
| Jest + phaser mock | project standard | Unit tests without DOM/canvas | `__mocks__/phaser.ts` stubs all needed APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `scene.tweens.add()` | Phaser API | Scale, alpha, angle, y offset animations | All idle tweens |
| `scene.tweens.addCounter()` | Phaser API | Numeric counter (e.g., hue 0→360) | Rainbow/prism color cycling |
| `scene.add.particles()` | Phaser API | Burst emitters for death effects | All clear particles |
| `scene.make.graphics()` | Phaser API | Dynamic texture generation for particles | Shared by existing clear particle code |

No new npm packages needed.

---

## Architecture Patterns

### Existing Project Structure (relevant files)
```
fe-next/phaser/
├── objects/
│   ├── BlastTile.ts                    # MODIFY — idle + death animations
│   ├── LetterTile.ts                   # READ ONLY — base breathing in startBreathingTween()
│   ├── BlastParticleManager.ts         # READ ONLY — may reuse ensureParticleTexture pattern
│   └── __tests__/
│       ├── BlastTile.idle.test.ts      # MODIFY — add mirror/silver/diamond idle tests
│       └── BlastTile.clearAnimation.test.ts  # MODIFY — add per-type death tests
fe-next/lib/phaser/logic/
│   └── BlastTileRules.ts               # MODIFY — add tints/borders/glow for mirror/silver/diamond
```

### Pattern 1: Idle Animation Hook (existing, extend)
**What:** `BlastTile.startTypeSpecificTween()` — switch on `this.blastType`, add tweens
**When to use:** Called from `startIdleAnimations()` (skipped for reduceMotion and isLowEnd)
**Example:**
```typescript
// Source: fe-next/phaser/objects/BlastTile.ts, lines 177-268
case 'bomb':
  this.scene.tweens.add({
    targets: this,
    angle: { from: -2, to: 2 },
    duration: 400,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
    _idleType: 'wobble',
  } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
  break;
```
Add `_idleType` tag so tests can locate the specific tween by type without ordering assumptions.

### Pattern 2: Death Animation Hook (existing, branch by type)
**What:** `BlastTile.playClearAnimation()` — currently generic (squash → rotate+fade + particles)
**When to use:** Called by BlastScene when a tile is cleared from the word path
**Returns:** `Promise<void>` — resolves when animation completes; caller awaits before recycling tile
**Example pattern to extend:**
```typescript
// Source: fe-next/phaser/objects/BlastTile.ts, lines 271-337
playClearAnimation(options: ClearAnimationOptions = {}): Promise<void> {
  if (reduceMotion) { /* simple fade */ }
  // EXTEND: dispatch to per-type animation method
  return this.playClearByType(options);
}

private playClearByType(options: ClearAnimationOptions): Promise<void> {
  switch (this.blastType) {
    case 'bomb':      return this.playBombDeath(options);
    case 'ice':       return this.playIceDeath(options);
    // ... each type
    default:          return this.playGenericDeath(options);  // existing behavior
  }
}
```

### Pattern 3: Particle Texture Creation (reuse)
**What:** `ensureClearTexture(scene, key, color)` — idempotent circle texture creation
**When to use:** All particle-based death effects; key must be unique per type
**Note:** Already present in BlastTile.ts (private). Extract to a shared helper or keep inline per method — either approach acceptable.

### Pattern 4: Test Harness (existing, follow exactly)
```typescript
// Source: fe-next/phaser/objects/__tests__/BlastTile.clearAnimation.test.ts
function makeScene(): Phaser.Scene {
  const scene = new Phaser.Scene();
  (scene.tweens.add as jest.Mock).mockImplementation((config) => {
    if (typeof config.onComplete === 'function') config.onComplete();
    return { destroy: jest.fn() };
  });
  return scene;
}
```
The `onComplete` synchronous-firing pattern is critical — it collapses chained tween sequences into synchronous test assertions. All death animation tests must use this harness.

### Anti-Patterns to Avoid
- **Shared tween objects across tile instances:** Each tile's idle tween must target `this` only. Shared references cause kill-all-on-deselect bugs.
- **Starting idle in constructor:** `startIdleAnimations()` is called externally after grid layout (not in constructor). Do not move it.
- **Forgetting `_idleType` tags on new tweens:** Tests find idle tweens by `_idleType` field, not by call order. All new type-specific tweens need this tag.
- **Not cleaning up timer handles in death methods:** Any `scene.time.delayedCall` or extra tweens started in death methods need cleanup if tile is destroyed before animation ends. Follow existing `startClearing()` pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Particle burst textures | Custom texture pipeline | `ensureClearTexture(scene, key, color)` already in BlastTile.ts | Handles idempotency, avoids duplicate texture keys |
| Color interpolation for rainbow idle | Manual HSL→hex | `scene.tweens.addCounter({from:0,to:360})` + `Phaser.Display.Color.HSLToColor()` | Pattern already in codebase for prism/rainbow |
| Promise-based animation sequencing | Custom state machine | `new Promise((resolve) => { tween: { onComplete: resolve } })` | Already used by playClearAnimation; consistent |
| Tween cleanup on select/deselect | Manual tween tracking | `scene.tweens.killTweensOf(this)` | Already used; kills all tweens on the target |

**Key insight:** The entire animation infrastructure is in place. This phase is exclusively additive switch-case branches — no new architectural concepts needed.

---

## Common Pitfalls

### Pitfall 1: Missing New Tile Types in BlastTileRules.ts
**What goes wrong:** `BlastTile` calls `getBlastTileTint(type)` and `getBlastTileBorderColor(type)` — if `mirror`, `silver`, `diamond` are absent from `TILE_TINTS` / `TILE_BORDERS` / `GLOW_BASES` / `BLAST_TILE_CONFIGS`, TypeScript throws at compile time AND tests fail.
**Why it happens:** `BlastTileRules.ts` was written before Phase 47 added these types. Current file only has `frozen`, `gem`, `prism`, `ice`, `lightning`, `magnet`, `gold`, `bomb`, `rainbow`, `standard`, `wildcard` (11 entries, missing 3 from new union of 13).
**How to avoid:** Plan 51-01 must include a Wave 0 task to add `mirror`, `silver`, `diamond` entries to all four lookup tables in `BlastTileRules.ts`. Treat this as a prerequisite before idle animation work.
**Warning signs:** TypeScript error "Property 'mirror' does not exist on type Record<..." at build time.

### Pitfall 2: `wildcard` Still in BlastTileRules.ts After Removal
**What goes wrong:** `BLAST_TILE_CONFIGS` and `TILE_TINTS` still have `wildcard` entries. Since `wildcard` was removed from `BlastTileType` in Phase 47, the lookup maps have orphan keys. While not a compile error (Records with extra keys are valid), it creates dead code and may confuse idle/death switch exhaustiveness checks.
**How to avoid:** Remove `wildcard` entries from `BlastTileRules.ts` in the same Wave 0 task.

### Pitfall 3: Death Animations That Block Too Long
**What goes wrong:** Complex death animations (e.g., shatter into 6 pieces) keep the tile visible for 800ms+ while the game board refills. If the tile is destroyed/recycled before the animation Promise resolves, Phaser throws on tween targets.
**Why it happens:** Tile lifecycle management in BlastScene destroys tiles after playClearAnimation resolves. Animations running past expected duration cause null-ref on `this.scene`.
**How to avoid:** Keep death animation total duration under 400ms (matching existing `CLEAR_DURATION = 200`). For dramatic effects, use particles that outlive the tile (emitters are scene-level, not Container children).

### Pitfall 4: Type-Specific Idle Tweens Not Killed on Select
**What goes wrong:** `select()` calls `scene.tweens.killTweensOf(this)` — which kills tweens targeting the Container. But type-specific tweens targeting `this.overlay` or `this.badge` (not `this`) survive.
**Why it happens:** `killTweensOf` only removes tweens whose `targets` match the passed object exactly. Overlay and badge are separate objects.
**How to avoid:** For any idle tween targeting `this.overlay` or `this.badge`, also call `scene.tweens.killTweensOf(this.overlay)` / `scene.tweens.killTweensOf(this.badge)` in `stopIdleAnimations()`. Or store idle tween references and call `.destroy()` explicitly.

### Pitfall 5: isLowEnd Guard Not Applied to New Idle Types
**What goes wrong:** New idle tweens for mirror/silver/diamond added to `startTypeSpecificTween()` but the `isLowEnd` guard at the top of `startIdleAnimations()` only applies before calling `startTypeSpecificTween()` — so new tweens DO get created on low-end devices.
**Why it happens:** The guard is already at call site: `if (options.isLowEnd) return;` before `this.startTypeSpecificTween()`. As long as new tweens go inside `startTypeSpecificTween()`, this is handled. Pitfall is adding them outside that method.
**How to avoid:** All type-specific idle tweens go in `startTypeSpecificTween()`, never in `startIdleAnimations()` directly.

### Pitfall 6: Synchronous onComplete Not Firing in Nested Tween Chains
**What goes wrong:** Some death animations chain: squash tween → on-complete → clear tween → on-complete → resolve. If the test mock only fires `onComplete` for the outer tween but not the inner (chain), the Promise never resolves.
**Why it happens:** Mock `tweens.add` fires `onComplete` synchronously. But the inner tween is created inside the outer `onComplete` callback, so it's a new call to `tweens.add`. With the existing mock pattern this works correctly — each call to `tweens.add` fires its own `onComplete` synchronously.
**How to avoid:** Use the `makeScene()` harness from `BlastTile.clearAnimation.test.ts` exactly. The mock applies globally to all `scene.tweens.add` calls, so chained tweens resolve correctly.

---

## Code Examples

### Idle Animation: Mirror (proposed — reflection shimmer)
```typescript
// BlastTile.ts startTypeSpecificTween()
case 'mirror':
  // Alternating scaleX flip — "reflection" shimmer
  this.scene.tweens.add({
    targets: this,
    scaleX: { from: 1, to: -1 },
    duration: 1500,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
    _idleType: 'mirror-flip',
  } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
  break;
```

### Idle Animation: Silver (proposed — subtle gleam)
```typescript
case 'silver':
  // Quick alpha flash on overlay (metallic gleam)
  this.scene.tweens.add({
    targets: this.overlay,
    alpha: { from: 1, to: 0.5 },
    duration: 1200,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
    _idleType: 'gleam',
  } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
  break;
```

### Idle Animation: Diamond (proposed — slow rotation + pulse)
```typescript
case 'diamond':
  // Slow clockwise rotation (gem facet display)
  this.scene.tweens.add({
    targets: this,
    angle: { from: 0, to: 360 },
    duration: 4000,
    repeat: -1,
    _idleType: 'diamond-rotate',
  } as Phaser.Types.Tweens.TweenBuilderConfig & { _idleType: string });
  break;
```

### Death Animation Dispatch (proposed structure)
```typescript
// Source pattern: fe-next/phaser/objects/BlastTile.ts
playClearAnimation(options: ClearAnimationOptions = {}): Promise<void> {
  const { reduceMotion = false, isLowEnd = false } = options;
  if (reduceMotion) {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this, alpha: { from: 1, to: 0 },
        duration: CLEAR_DURATION, ease: 'Quad.easeIn',
        onComplete: () => { this.startClearing(); resolve(); },
      });
    });
  }
  return this.playClearByType(isLowEnd);
}

private playClearByType(isLowEnd: boolean): Promise<void> {
  switch (this.blastType) {
    case 'bomb':      return this.playExplosiveDeath(isLowEnd);
    case 'ice':       return this.playShatterDeath(isLowEnd);
    case 'lightning': return this.playZapDeath(isLowEnd);
    case 'prism':     return this.playRefractDeath(isLowEnd);
    case 'rainbow':   return this.playDissolveDeath(isLowEnd);
    case 'gem':       return this.playSparkDeath(isLowEnd);
    case 'frozen':    return this.playMeltDeath(isLowEnd);
    case 'gold':
    case 'silver':
    case 'diamond':   return this.playGoldBurstDeath(isLowEnd);
    case 'magnet':    return this.playMagneticPulseDeath(isLowEnd);
    case 'mirror':    return this.playMirrorShatterDeath(isLowEnd);
    default:          return this.playGenericDeath(isLowEnd);
  }
}
```

### Test Harness (reuse exactly)
```typescript
// Source: fe-next/phaser/objects/__tests__/BlastTile.clearAnimation.test.ts, lines 22-48
function makeScene(): Phaser.Scene {
  const scene = new Phaser.Scene();
  (scene.tweens.add as jest.Mock).mockImplementation((config) => {
    if (typeof config.onComplete === 'function') config.onComplete();
    return { destroy: jest.fn() };
  });
  return scene;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic squash+rotate for all tile types | Per-type death animation dispatch | Phase 51 (this phase) | Each tile feels distinct on clear |
| Partial idle (7 types covered) | All 13 types have idle personality | Phase 51 (this phase) | Board feels alive with all tile types |
| `wildcard` in BlastTileRules.ts | Removed; mirror/silver/diamond added | Phase 47 (not yet in Rules file) | Wave 0 task needed |

**Deprecated/outdated:**
- `wildcard` entries in `BlastTileRules.ts`: Phase 47 removed wildcard from the type union. The Rules file still has entries — clean up in Wave 0.

---

## Open Questions

1. **Mirror flip direction on RTL boards**
   - What we know: Hebrew is RTL; LetterTile has no RTL-specific idle behavior currently.
   - What's unclear: Does a negative scaleX flip cause visual weirdness for Hebrew tiles?
   - Recommendation: Use `angle` or `alpha` for mirror idle instead of `scaleX: -1` to avoid RTL conflict. Revisit scaleX flip if RTL testing is done.

2. **Gold / Silver / Diamond — shared death or distinct?**
   - What we know: They share the same multiplier mechanic family (1.5x / 3x / 5x). Distinct death animations per tier add complexity.
   - What's unclear: Does the planner want 3 distinct deaths or a shared "gold burst" with intensity scaling?
   - Recommendation: Shared `playGoldBurstDeath()` with `intensity` parameter scaled by type. Simpler to implement, still visually differentiated via particle count and speed.

3. **Frost reveal animation during death**
   - What we know: Frost (frozen) has 2 hits. First hit "cracks" tile revealing inner type. Second hit "frees" inner tile.
   - What's unclear: Does TILE-11 need to animate both the crack (first hit) and the death (second hit), or just the final death?
   - Recommendation: Only the final death needs the TILE-11 death animation per requirements. The crack-on-hit visual is a separate concern (overlay redraw in `updateTileType()`, already handled). Frost's death animation = icy shatter/melt.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (project-wide, via `npx jest`) |
| Config file | `fe-next/jest.config.js` |
| Quick run command | `npx jest BlastTile.idle BlastTile.clearAnimation --no-coverage` |
| Full suite command | `npx jest --testPathPattern="phaser/objects/__tests__" --no-coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TILE-10 | mirror idle tween registered | unit | `npx jest BlastTile.idle --no-coverage` | ✅ (needs new cases) |
| TILE-10 | silver idle tween registered | unit | `npx jest BlastTile.idle --no-coverage` | ✅ (needs new cases) |
| TILE-10 | diamond idle tween registered | unit | `npx jest BlastTile.idle --no-coverage` | ✅ (needs new cases) |
| TILE-11 | bomb death fires explosive tween | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (needs new cases) |
| TILE-11 | ice death fires shatter tween | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (needs new cases) |
| TILE-11 | each type produces distinct tween config | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (needs new cases) |
| TILE-11 | reduceMotion: all types fall through to simple fade | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (existing test, verify coverage) |
| TILE-11 | isLowEnd: halved particles for all types | unit | `npx jest BlastTile.clearAnimation --no-coverage` | ✅ (existing test, verify coverage) |

### Sampling Rate
- **Per task commit:** `npx jest BlastTile.idle BlastTile.clearAnimation --no-coverage`
- **Per wave merge:** `npx jest --testPathPattern="phaser" --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `BlastTileRules.ts` needs `mirror`, `silver`, `diamond` entries in `TILE_TINTS`, `TILE_BORDERS`, `GLOW_BASES`, `BLAST_TILE_CONFIGS` — compiler prerequisite before idle/death code compiles
- [ ] `BlastTileRules.ts` should remove orphan `wildcard` entries (cleanup)

*(Existing test infrastructure covers all phase requirements — only code changes needed, no new test files)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `fe-next/phaser/objects/BlastTile.ts` — idle and death animation architecture
- Direct code inspection: `fe-next/phaser/objects/LetterTile.ts` — base breathing, select/deselect lifecycle
- Direct code inspection: `fe-next/phaser/objects/__tests__/BlastTile.idle.test.ts` — test patterns and coverage
- Direct code inspection: `fe-next/phaser/objects/__tests__/BlastTile.clearAnimation.test.ts` — death animation test harness
- Direct code inspection: `fe-next/lib/phaser/logic/BlastTileRules.ts` — tile visual configs (gap found: missing 3 types)
- Direct code inspection: `fe-next/shared/types/blast.ts` — canonical `BlastTileType` union (13 types)
- Direct code inspection: `fe-next/__mocks__/phaser.ts` — jest mock capabilities
- Direct code inspection: `.planning/REQUIREMENTS.md` — TILE-10 and TILE-11 requirements
- Direct code inspection: `.planning/config.json` — nyquist_validation: true (Validation Architecture required)

### Secondary (MEDIUM confidence)
- Phase 47 plans (47-03, 47-04, 47-05) — confirm mirror/silver/diamond are the 3 new types added
- STATE.md accumulated decisions — confirm wildcard removed, new types active

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new deps
- Architecture: HIGH — patterns directly inspected from working code
- Pitfalls: HIGH — based on direct analysis of existing implementation gaps and test patterns
- New idle personalities (mirror/silver/diamond): MEDIUM — proposed designs are reasonable but planner has discretion to choose differently

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable Phaser 3 API, stable project patterns)
