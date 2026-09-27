import { describe, it, expect } from 'vitest';
import { comboMilestone, COMBO_MILESTONES } from '../comboMilestone';

describe('comboMilestone — fanfare only on the crossing tick', () => {
  it('fires exactly when the combo reaches a milestone value', () => {
    for (const c of COMBO_MILESTONES) {
      expect(comboMilestone(c)).not.toBeNull();
      expect(comboMilestone(c)!.combo).toBe(c);
    }
  });

  it('returns null between milestones (no spam)', () => {
    expect(comboMilestone(1)).toBeNull();
    expect(comboMilestone(2)).toBeNull();
    expect(comboMilestone(4)).toBeNull();
    expect(comboMilestone(6)).toBeNull();
  });

  it('escalates the label/tier as the combo climbs', () => {
    const tiers = COMBO_MILESTONES.map((c) => comboMilestone(c)!.tier);
    expect(new Set(tiers).size).toBe(tiers.length); // each milestone has a distinct tier
    expect(comboMilestone(COMBO_MILESTONES[0])!.labelKey).toMatch(/^wordTower\.combo\./);
  });
});
