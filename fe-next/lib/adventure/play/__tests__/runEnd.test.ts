import { describe, expect, it } from 'vitest';
import { PURSE_BANK_CAP, freshRun, goldForScore, purseCoins, settleRunEnd } from '../runToken';

/**
 * A run ends (death, lost node, boss down). Two things leave it:
 *  - the CARRY — relics + potions the next run starts with. It must be the run
 *    AFTER this last fight: potions drunk and a phoenix feather burned in the
 *    fatal fight used to come back, because the pre-fight token was carried.
 *  - the PURSE — leftover gold banks into the app-wide wallet at a rate, so
 *    gold is worth something past the run and spending it is a real choice.
 */
const run = (patch: Partial<ReturnType<typeof freshRun>> = {}) => ({
  ...freshRun(1, 'u1', 'seed'),
  relics: ['phoenix-feather', 'gold-tooth'],
  potions: { heal: 2, time: 1, cleanse: 0, insight: 0 },
  gold: 120,
  ...patch,
});

describe('settleRunEnd', () => {
  it('given a death after drinking a potion and burning the feather, when settled, then the carry keeps neither', () => {
    const end = settleRunEnd(run(), { won: false, boss: false, score: 300, potionsUsed: { heal: 1 }, reviveUsed: true });
    expect(end.carry.potions.heal).toBe(1);
    expect(end.carry.potions.time).toBe(1);
    expect(end.carry.relics).toEqual(['gold-tooth']);
  });

  it('given a lost node, when settled, then no gold is earned for it and half the purse banks', () => {
    const end = settleRunEnd(run(), { won: false, boss: false, score: 900, potionsUsed: {} });
    expect(end.carry.gold).toBe(120);
    expect(end.coins).toBe(60);
  });

  it('given the boss beaten, when settled, then its gold (gold-tooth boosted) is in the purse before banking', () => {
    const end = settleRunEnd(run({ relics: ['gold-tooth'] }), { won: true, boss: true, score: 400, potionsUsed: {} });
    const bossGold = Math.floor(goldForScore(400) * 1.5);
    expect(end.carry.gold).toBe(120 + bossGold);
    expect(end.coins).toBe(purseCoins(120 + bossGold));
  });

  it('given a huge purse, when banked, then it is capped', () => {
    expect(purseCoins(100_000)).toBe(PURSE_BANK_CAP);
    expect(purseCoins(0)).toBe(0);
    expect(purseCoins(-5)).toBe(0);
  });
});
