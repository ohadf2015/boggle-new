import { vi } from 'vitest';
import { generateLootChest } from '../lootConfig';

describe('generateLootChest', () => {
  // Mock Math.random to 0.5 for deterministic tests (variance = 0.85 + 0.15 = 1.0, lucky = no)
  let randomSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5); });
  afterEach(() => { randomSpy.mockRestore(); });

  it('always includes a gold drop with world-scaled formula', () => {
    const chest = generateLootChest(1, 1, 2, 300, 1);
    const gold = chest.drops.find(d => d.type === 'gold');
    expect(gold).toBeDefined();
    // F4: baseGold = (10 + 1*3) * 2 = 26 × 1.5 (W1-W2 early-world boost) = 39
    expect(gold!.amount).toBe(39);
  });

  it('applies goldMultiplier', () => {
    const chest = generateLootChest(1, 1, 2, 300, 2);
    const gold = chest.drops.find(d => d.type === 'gold');
    // F4: 26 × 1.5 = 39 boosted base, × 2 multiplier = 78
    expect(gold!.amount).toBe(78);
  });

  it('gives perfect bonus for 3-star gold', () => {
    const chest = generateLootChest(1, 1, 3, 100, 1);
    const gold = chest.drops.find(d => d.type === 'gold');
    // F4: baseGold = 39 × 1.5 = 58.5 boosted, +50 perfect = 108.5, floor = 108
    expect(gold!.amount).toBe(108);
  });

  it('boosts W1-W2 baseGold by 50% (F4 audit 2026-05-01) — early-world plenty', () => {
    // W2 2-star: baseGold = (10 + 6) * 2 = 32 × 1.5 = 48
    const w2 = generateLootChest(2, 1, 2, 300, 1).drops.find(d => d.type === 'gold')!.amount;
    expect(w2).toBe(48);
    // W3 2-star is NOT boosted: (10 + 9) * 2 = 38
    const w3 = generateLootChest(3, 1, 2, 300, 1).drops.find(d => d.type === 'gold')!.amount;
    expect(w3).toBe(38);
    // Boost should not invert the curve — W3 should be higher than pre-boost W3 baseline
    // and W1 should still be smaller than W10 even with boost.
    const w1 = generateLootChest(1, 1, 2, 300, 1).drops.find(d => d.type === 'gold')!.amount;
    const w10 = generateLootChest(10, 1, 2, 300, 1).drops.find(d => d.type === 'gold')!.amount;
    expect(w10).toBeGreaterThan(w1);
  });

  it('gold scales significantly with world number', () => {
    const w1Gold = generateLootChest(1, 1, 3, 100, 1).drops.find(d => d.type === 'gold')!.amount;
    const w10Gold = generateLootChest(10, 1, 3, 100, 1).drops.find(d => d.type === 'gold')!.amount;
    // W1: (10+3)*3+50 = 89, W10: (10+30)*3+50 = 170
    expect(w10Gold).toBeGreaterThan(w1Gold * 1.5);
  });

  it('always includes XP', () => {
    const chest = generateLootChest(1, 1, 1, 100, 1);
    const xp = chest.drops.find(d => d.type === 'xp');
    expect(xp).toBeDefined();
    // 25 + 1*15 + 1*10 = 50 (world scaling)
    expect(xp!.amount).toBe(50);
  });

  it('guarantees bonus gold on 3-star', () => {
    const chest = generateLootChest(1, 1, 3, 100, 1);
    const bonus = chest.drops.find(d => d.type === 'bonusGold');
    expect(bonus).toBeDefined();
    expect(bonus!.rarity).toBe('rare');
    // World 1 * 15 * 1 multiplier = 15
    expect(bonus!.amount).toBe(15);
  });

  it('does not award bonus gold on 1-star', () => {
    const chest = generateLootChest(1, 1, 1, 100, 1);
    const bonus = chest.drops.find(d => d.type === 'bonusGold');
    expect(bonus).toBeUndefined();
  });

  it('awards boss trophy gold on boss levels with 3 stars', () => {
    const chest = generateLootChest(3, 7, 3, 500, 1);
    const trophy = chest.drops.filter(d => d.type === 'bonusGold');
    // Should have both bonus gold (rare) and trophy gold (epic)
    expect(trophy.length).toBe(2);
    expect(trophy.some(d => d.rarity === 'epic')).toBe(true);
  });

  it('does not award boss trophy on non-boss levels', () => {
    const chest = generateLootChest(3, 3, 3, 500, 1);
    const epic = chest.drops.find(d => d.rarity === 'epic');
    expect(epic).toBeUndefined();
  });

  it('does not award boss trophy on level 5 (only level 7 is boss)', () => {
    const chest = generateLootChest(3, 5, 3, 500, 1);
    const epic = chest.drops.find(d => d.rarity === 'epic');
    expect(epic).toBeUndefined();
  });

  it('awards boss trophy only on level 7 (the actual boss level)', () => {
    for (let lvl = 1; lvl <= 7; lvl++) {
      const chest = generateLootChest(3, lvl, 3, 500, 1);
      const hasEpic = chest.drops.some(d => d.rarity === 'epic');
      if (lvl === 7) {
        expect(hasEpic).toBe(true);
      } else {
        expect(hasEpic).toBe(false);
      }
    }
  });

  it('bonus gold scales with world number', () => {
    const w1 = generateLootChest(1, 1, 3, 100, 1);
    const w5 = generateLootChest(5, 1, 3, 100, 1);
    const w1Bonus = w1.drops.find(d => d.type === 'bonusGold')!.amount;
    const w5Bonus = w5.drops.find(d => d.type === 'bonusGold')!.amount;
    expect(w5Bonus).toBeGreaterThan(w1Bonus);
  });

  it('maps chest tier to 3-star → golden', () => {
    expect(generateLootChest(1, 1, 3, 100, 1).chestTier).toBe('golden');
  });

  it('maps chest tier to 2-star → silver', () => {
    expect(generateLootChest(1, 1, 2, 100, 1).chestTier).toBe('silver');
  });

  it('maps chest tier to 1-star → wooden', () => {
    expect(generateLootChest(1, 1, 1, 100, 1).chestTier).toBe('wooden');
  });

  it('all drops have a nameKey', () => {
    const chest = generateLootChest(3, 2, 3, 500, 1);
    for (const drop of chest.drops) {
      expect(drop.nameKey).toBeTruthy();
    }
  });

  describe('variable loot drops', () => {
    beforeEach(() => { randomSpy.mockRestore(); });

    it('gold amount varies between runs for same inputs', () => {
      const results = new Set<number>();
      for (let i = 0; i < 20; i++) {
        const chest = generateLootChest(3, 3, 2, 300, 1);
        const gold = chest.drops.find(d => d.type === 'gold')!.amount;
        results.add(gold);
      }
      // With ±15% variance, we should see at least 2 different values in 20 runs
      expect(results.size).toBeGreaterThanOrEqual(2);
    });

    it('gold variance stays within ±20% of base', () => {
      // World 3, level 3, 2 stars, multiplier 1
      // baseGold = (10 + 9) * 2 = 38, perfectBonus = 0 → base = 38
      const base = 38;
      for (let i = 0; i < 50; i++) {
        const chest = generateLootChest(3, 3, 2, 300, 1);
        const gold = chest.drops.find(d => d.type === 'gold')!.amount;
        expect(gold).toBeGreaterThanOrEqual(Math.floor(base * 0.8));
        expect(gold).toBeLessThanOrEqual(Math.ceil(base * 1.2));
      }
    });

    it('can produce a lucky bonus drop', () => {
      // Run many times, at least once we should see a lucky drop
      let sawLucky = false;
      for (let i = 0; i < 200; i++) {
        const chest = generateLootChest(2, 3, 2, 300, 1);
        if (chest.drops.some(d => d.nameKey === 'adventure.loot.luckyBonus')) {
          sawLucky = true;
          break;
        }
      }
      expect(sawLucky).toBe(true);
    });

    it('lucky bonus has rare rarity', () => {
      // Keep generating until we get a lucky drop
      for (let i = 0; i < 500; i++) {
        const chest = generateLootChest(2, 3, 2, 300, 1);
        const lucky = chest.drops.find(d => d.nameKey === 'adventure.loot.luckyBonus');
        if (lucky) {
          expect(lucky.rarity).toBe('rare');
          expect(lucky.type).toBe('bonusGold');
          return;
        }
      }
      // If we never got one in 500 tries, that's a problem (10% chance per run)
      throw new Error('Never generated a lucky bonus in 500 attempts');
    });
  });
});
