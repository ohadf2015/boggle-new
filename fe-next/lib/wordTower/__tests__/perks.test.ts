import { describe, it, expect } from 'vitest';
import {
  PERKS,
  ALL_PERK_IDS,
  NO_MODIFIERS,
  drawPerkChoices,
  perkModifiers,
  reducedTopple,
  perkMilestoneAt,
  PERK_MILESTONE_STEP_M,
  type PerkId,
} from '../perks';

/** Deterministic rng for draft tests: cycles through a fixed list in [0,1). */
function seqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('PERKS catalogue', () => {
  it('lists every perk id with name + desc + icon', () => {
    for (const id of ALL_PERK_IDS) {
      const p = PERKS[id];
      expect(p.id).toBe(id);
      expect(p.nameKey).toContain(id);
      expect(p.descKey).toContain(id);
      expect(p.icon.length).toBeGreaterThan(0);
    }
  });

  it('has at least 5 perks so a 3-pick draft stays varied', () => {
    expect(ALL_PERK_IDS.length).toBeGreaterThanOrEqual(5);
  });
});

describe('drawPerkChoices — the pick-1-of-3 surprise', () => {
  it('returns the requested number of distinct perks', () => {
    const choices = drawPerkChoices(seqRng([0.1, 0.5, 0.9, 0.3]), [], 3);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
  });

  it('never offers a perk the player already owns', () => {
    const owned: PerkId[] = ['featherfall', 'masterCrane'];
    const choices = drawPerkChoices(seqRng([0.2, 0.7, 0.4, 0.9, 0.1]), owned, 3);
    for (const c of choices) expect(owned).not.toContain(c);
  });

  it('caps the draft at however many perks remain', () => {
    const owned = ALL_PERK_IDS.slice(0, ALL_PERK_IDS.length - 2);
    const choices = drawPerkChoices(seqRng([0.5, 0.5, 0.5]), owned, 3);
    expect(choices).toHaveLength(2);
  });

  it('returns nothing once everything is owned', () => {
    expect(drawPerkChoices(seqRng([0.5]), [...ALL_PERK_IDS], 3)).toEqual([]);
  });

  it('is deterministic for the same rng + owned set', () => {
    const a = drawPerkChoices(seqRng([0.11, 0.42, 0.73, 0.27]), [], 3);
    const b = drawPerkChoices(seqRng([0.11, 0.42, 0.73, 0.27]), [], 3);
    expect(a).toEqual(b);
  });
});

describe('perkModifiers — folding owned perks into one effect object', () => {
  it('with no perks equals the neutral modifiers', () => {
    expect(perkModifiers([])).toEqual(NO_MODIFIERS);
  });

  it('masterCrane boosts the perfect-drop bonus', () => {
    expect(perkModifiers(['masterCrane']).perfectBonus).toBeGreaterThan(NO_MODIFIERS.perfectBonus);
  });

  it('tallTimber raises the global height multiplier above 1', () => {
    expect(perkModifiers(['tallTimber']).heightMult).toBeGreaterThan(1);
  });

  it('featherfall adds topple reduction', () => {
    expect(perkModifiers(['featherfall']).toppleReduction).toBeGreaterThanOrEqual(1);
  });

  it('reinforced widens the brink (more forgiving)', () => {
    expect(perkModifiers(['reinforced']).brinkExtra).toBeGreaterThanOrEqual(1);
  });

  it('cushion makes the crane wobble harmless', () => {
    expect(perkModifiers(['cushion']).wobbleImmune).toBe(true);
  });

  it('stacks multiple perks additively', () => {
    const m = perkModifiers(['masterCrane', 'featherfall', 'tallTimber']);
    expect(m.perfectBonus).toBeGreaterThan(0);
    expect(m.toppleReduction).toBeGreaterThanOrEqual(1);
    expect(m.heightMult).toBeGreaterThan(1);
  });
});

describe('reducedTopple — featherfall softens collapses', () => {
  it('subtracts the reduction but never goes below zero', () => {
    expect(reducedTopple(3, perkModifiers(['featherfall']))).toBe(2);
    expect(reducedTopple(1, { ...NO_MODIFIERS, toppleReduction: 3 })).toBe(0);
  });

  it('is a no-op with no perks', () => {
    expect(reducedTopple(4, NO_MODIFIERS)).toBe(4);
  });
});

describe('perkMilestoneAt — when a draft is offered (daily run)', () => {
  it('fires when crossing each milestone step upward', () => {
    expect(perkMilestoneAt(PERK_MILESTONE_STEP_M - 1, PERK_MILESTONE_STEP_M + 1)).toBe(1);
    expect(perkMilestoneAt(PERK_MILESTONE_STEP_M + 1, PERK_MILESTONE_STEP_M * 2 + 1)).toBe(2);
  });

  it('returns null when no new milestone was crossed', () => {
    expect(perkMilestoneAt(10, 20)).toBeNull();
    expect(perkMilestoneAt(PERK_MILESTONE_STEP_M + 1, PERK_MILESTONE_STEP_M + 5)).toBeNull();
  });
});
