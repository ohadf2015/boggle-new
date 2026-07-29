# Boss Battle Mechanics & Drama — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two remaining boss mechanic wiring gaps (scramble tile shuffle + ability-system tile locking) so boss attacks have real, visible consequences.

**Architecture:** Two surgical changes to `useAdventureBossOrchestration`: (1) pass `shuffleTiles` down so scramble attacks actually shuffle, (2) add local state for ability-system locked tiles that merges with state-machine locked tiles before reaching the grid. No new files needed.

**Tech Stack:** React hooks, TypeScript, Vitest

---

## File Map

| File | Change |
|------|--------|
| `fe-next/components/adventure/hooks/useAdventureBossOrchestration.ts` | Add `scrambleTiles?` prop; fix `onScramble` + `handleAttack('scramble')`; add `abilityLockedTiles` state + `onLockTiles` callback; merge lock sources in return |
| `fe-next/components/adventure/AdventureGame.tsx` | Pass `shuffleTiles` as `scrambleTiles` prop |
| `fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts` | Add tests for scramble calls `shuffleTiles`, `onLockTiles` callback, merged `lockedTiles` |

---

## Task 1: Fix scramble wiring

**Files:**
- Modify: `fe-next/components/adventure/hooks/useAdventureBossOrchestration.ts`
- Modify: `fe-next/components/adventure/AdventureGame.tsx:165-173`
- Modify: `fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts` inside `describe('bossEffectCallbacks')`:

```typescript
it('should call scrambleTiles when onScramble fires', () => {
  const mockScrambleTiles = vi.fn();
  const { result } = renderHook(() =>
    useAdventureBossOrchestration({ ...defaultProps, scrambleTiles: mockScrambleTiles })
  );

  act(() => {
    result.current.bossEffectCallbacks.onScramble?.();
  });

  expect(mockScrambleTiles).toHaveBeenCalledTimes(1);
  expect(mockShake).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx vitest run components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts
```

Expected: FAIL — `mockScrambleTiles` not called (property doesn't exist yet).

- [ ] **Step 3: Add `scrambleTiles?` to props interface**

In `useAdventureBossOrchestration.ts`, add to `UseAdventureBossOrchestrationProps`:

```typescript
scrambleTiles?: () => void;
```

Destructure it at the top of the function (after `scrambleImmunity`):

```typescript
scrambleImmunity = false,
scrambleTiles,
```

- [ ] **Step 4: Fix `onScramble` in `bossEffectCallbacks`**

Change:
```typescript
onScramble: () => {
  shake(3);
},
```
To:
```typescript
onScramble: () => {
  shake(3);
  scrambleTiles?.();
},
```

Also add `scrambleTiles` to the `useMemo` dependency array:
```typescript
}), [playerHealth, addTime, shake, scrambleTiles]);
```

- [ ] **Step 5: Fix `handleAttack('scramble')` branch**

Change:
```typescript
if (attack.type === 'scramble') {
  if (scrambleImmunity) return; // Blast Shield T3
  shake(3);
}
```
To:
```typescript
if (attack.type === 'scramble') {
  if (scrambleImmunity) return; // Blast Shield T3
  shake(3);
  scrambleTiles?.();
}
```

- [ ] **Step 6: Wire `shuffleTiles` in `AdventureGame.tsx`**

`shuffleTiles` is already destructured at line ~116 as `useShuffle: shuffleTiles`. Add it to the `useAdventureBossOrchestration` call at line ~165:

```typescript
const bossOrch = useAdventureBossOrchestration({
  isBossLevel, worldId: levelConfig.world, levelNumber: levelConfig.level,
  showBossIntroConfig: levelConfig.showBossIntro === true,
  timeRemaining, isPlaying, startGame, startAIDirector: init.startAIDirector,
  addTime, shake: (intensity: number) => effects.shake(intensity),
  bossDamageMultiplier: init.upgradeEffects.bossDamageMultiplier,
  blockFirstAttack: init.upgradeEffects.blockFirstAttack,
  scrambleImmunity: init.upgradeEffects.scrambleImmunity,
  scrambleTiles,
});
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx vitest run components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts
```

Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add fe-next/components/adventure/hooks/useAdventureBossOrchestration.ts fe-next/components/adventure/AdventureGame.tsx fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts
git commit -m "feat(boss): wire scramble attack to shuffle tiles"
```

---

## Task 2: Add ability-system lock tiles via `onLockTiles`

**Files:**
- Modify: `fe-next/components/adventure/hooks/useAdventureBossOrchestration.ts`
- Modify: `fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts`:

```typescript
describe('onLockTiles (ability-system)', () => {
  it('bossEffectCallbacks includes onLockTiles', () => {
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));
    expect(result.current.bossEffectCallbacks.onLockTiles).toBeInstanceOf(Function);
  });

  it('onLockTiles merges indices into lockedTiles', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    act(() => {
      result.current.bossEffectCallbacks.onLockTiles?.([3, 7], 2000);
    });

    expect(result.current.lockedTiles).toContain(3);
    expect(result.current.lockedTiles).toContain(7);

    act(() => {
      vi.advanceTimersByTime(2001);
    });

    expect(result.current.lockedTiles).not.toContain(3);
    expect(result.current.lockedTiles).not.toContain(7);
    vi.useRealTimers();
  });

  it('state-machine lockedTiles and ability lockedTiles merge without duplicates', () => {
    mockUseAdventureBossNew.mockReturnValue({
      ...mockBossReturn,
      lockedTiles: [0, 3],
    });
    vi.useFakeTimers();
    const { result } = renderHook(() => useAdventureBossOrchestration(defaultProps));

    act(() => {
      result.current.bossEffectCallbacks.onLockTiles?.([3, 9], 2000);
    });

    // 0, 3 from boss state + 9 from ability (3 deduplicated)
    expect(result.current.lockedTiles).toContain(0);
    expect(result.current.lockedTiles).toContain(3);
    expect(result.current.lockedTiles).toContain(9);
    // No duplicates
    expect(result.current.lockedTiles.filter(i => i === 3).length).toBe(1);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx vitest run components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts
```

Expected: FAIL — `onLockTiles` is undefined, `lockedTiles` doesn't contain ability-locked indices.

- [ ] **Step 3: Add `abilityLockedTiles` state to the hook**

In `useAdventureBossOrchestration.ts`, after the `playerHealth` line (~line 57), add:

```typescript
// Ability-system locked tiles (from BossOverlay lock_tiles effects)
const [abilityLockedTiles, setAbilityLockedTiles] = useState<number[]>([]);
const abilityLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Add cleanup in the existing `useEffect` cleanup block:
```typescript
useEffect(() => {
  return () => {
    if (vignetteTimeoutRef.current) clearTimeout(vignetteTimeoutRef.current);
    if (fireworksTimeoutRef.current) clearTimeout(fireworksTimeoutRef.current);
    if (abilityLockTimerRef.current) clearTimeout(abilityLockTimerRef.current);
  };
}, []);
```

- [ ] **Step 4: Add `onLockTiles` to `bossEffectCallbacks`**

In the `bossEffectCallbacks` useMemo, add:

```typescript
onLockTiles: (indices: number[], durationMs: number) => {
  setAbilityLockedTiles(indices);
  if (abilityLockTimerRef.current) clearTimeout(abilityLockTimerRef.current);
  abilityLockTimerRef.current = setTimeout(() => setAbilityLockedTiles([]), durationMs);
},
```

Update the dependency array to include `setAbilityLockedTiles` (stable, but explicit):
```typescript
}), [playerHealth, addTime, shake, scrambleTiles]);
```
(No change needed — `setAbilityLockedTiles` is a stable setter.)

- [ ] **Step 5: Merge lock sources in return value**

In the return object, change:
```typescript
lockedTiles: bossLockedTiles,
```
To:
```typescript
lockedTiles: useMemo(
  () => [...new Set([...bossLockedTiles, ...abilityLockedTiles])],
  [bossLockedTiles, abilityLockedTiles]
),
```

Wait — `useMemo` can't be called inside a return statement. Instead, add it just before the return:

```typescript
const mergedLockedTiles = useMemo(
  () => [...new Set([...bossLockedTiles, ...abilityLockedTiles])],
  [bossLockedTiles, abilityLockedTiles]
);
```

Then in the return object:
```typescript
lockedTiles: mergedLockedTiles,
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npx vitest run components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts
```

Expected: ALL PASS

- [ ] **Step 7: Run full lint + frontend tests**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next && npm run lint && npx vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: no errors, no new failures

- [ ] **Step 8: Commit**

```bash
git add fe-next/components/adventure/hooks/useAdventureBossOrchestration.ts fe-next/components/adventure/hooks/__tests__/useAdventureBossOrchestration.test.ts
git commit -m "feat(boss): wire ability-system lock_tiles to grid via onLockTiles callback"
```

---

## Self-Review

**Spec coverage:**
- Scramble calls shuffleTiles ✅ Task 1
- `onLockTiles` in bossEffectCallbacks ✅ Task 2
- Two-source lock merge ✅ Task 2 Step 5
- `handleAttack('scramble')` fix ✅ Task 1 Step 5
- Tile lock visual already exists in `AdventureTile.tsx` — no task needed ✅

**Placeholder scan:** None found. All code blocks show exact implementations.

**Type consistency:** `onLockTiles: (indices: number[], durationMs: number) => void` matches `EffectCallbacks` interface signature in `useBossEffectExecutor.ts` line 34.

**Drama note:** Phase-transition `shake(4)` already fires. Enraged glow and phase banners already render. Tile lock visual (🔒 + opacity-50 + red ring) already renders when tiles reach the grid. No drama tasks needed beyond the mechanics wiring.
