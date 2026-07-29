import { describe, it, expect } from 'vitest';
import { planGemDrama, clampGemDramaForCosy } from '../gemDrama';

describe('planGemDrama', () => {
  it('chip rarity → minimal plan (no freeze, no fullscreen burst)', () => {
    const plan = planGemDrama({ rarity: 1 });
    expect(plan.tier).toBe('chip');
    expect(plan.freezeFrameMs).toBe(0);
    expect(plan.sharedFxPreset).toBeUndefined();
    expect(plan.inventoryPulse).toBe(false);
  });

  it('shard rarity → sparkle preset + chip pulse', () => {
    const plan = planGemDrama({ rarity: 2 });
    expect(plan.tier).toBe('shard');
    expect(plan.freezeFrameMs).toBe(0);
    expect(plan.sharedFxPreset).toBe('sparkle');
    expect(plan.inventoryPulse).toBe(true);
  });

  it('crown rarity → freeze-frame + celebration burst + sound chain', () => {
    const plan = planGemDrama({ rarity: 3 });
    expect(plan.tier).toBe('crown');
    expect(plan.freezeFrameMs).toBeGreaterThanOrEqual(200);
    expect(plan.sharedFxPreset).toBe('celebration');
    expect(plan.soundKey).toBeDefined();
    expect(plan.inventoryPulse).toBe(true);
  });
});

describe('clampGemDramaForCosy', () => {
  it('crown clamps down to shard equivalent (no freeze, sparkle only)', () => {
    const plan = clampGemDramaForCosy(planGemDrama({ rarity: 3 }));
    expect(plan.freezeFrameMs).toBe(0);
    expect(plan.sharedFxPreset).toBe('sparkle');
  });

  it('shard and chip unchanged', () => {
    const shard = planGemDrama({ rarity: 2 });
    expect(clampGemDramaForCosy(shard)).toEqual(shard);
    const chip = planGemDrama({ rarity: 1 });
    expect(clampGemDramaForCosy(chip)).toEqual(chip);
  });
});
