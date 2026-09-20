/**
 * "+50% gold" has to mean all gold. gold-tooth only multiplied level-clear
 * rewards, so a run that took its gold from chests, events and draft cards got
 * nothing from the relic it paid a draft slot for.
 */
import { describe, it, expect } from 'vitest';
import { freshRun, applyPick, advanceRun, grantGold, goldForScore } from '../runToken';

const run = (relics: string[] = [], gold = 0) => ({
  ...freshRun(1, 'u1', 'seed'),
  relics: relics as never,
  gold,
});

describe('grantGold', () => {
  it('given gold-tooth, when gold is granted, then it is multiplied', () => {
    expect(grantGold(run(['gold-tooth']), 20).gold).toBe(30);
  });

  it('given no gold-tooth, when gold is granted, then it is unchanged', () => {
    expect(grantGold(run(), 20).gold).toBe(20);
  });

  it('given gold-tooth, when gold is SPENT, then the loss is not multiplied', () => {
    expect(grantGold(run(['gold-tooth'], 50), -20).gold).toBe(30);
  });

  it('never goes negative', () => {
    expect(grantGold(run([], 5), -20).gold).toBe(0);
  });
});

describe('gold-tooth covers every source', () => {
  it('multiplies a draft gold card', () => {
    const offered = { ...run(['gold-tooth']), offer: [{ type: 'gold' as const, amount: 20 }] };
    expect(applyPick(offered, 0)?.gold).toBe(30);
  });

  it('still multiplies level-clear gold', () => {
    const next = advanceRun(run(['gold-tooth']), { hpLeft: 5, potionsUsed: {}, score: 100 });
    expect(next.gold).toBe(Math.floor(goldForScore(100) * 1.5));
  });
});
