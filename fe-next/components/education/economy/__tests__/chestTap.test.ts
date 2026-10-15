import { describe, it, expect } from 'vitest';
import { CHEST_RARITIES } from '@/shared/constants/classroomEconomy';
import { chestCoinCount, chestHeadlineKey, chestRays, tapChestPhase } from '../chestPhase';

describe('tapChestPhase (tap anywhere)', () => {
  it('Given a sealed chest, When tapped, Then it starts opening (or reveals at once under reduced motion)', () => {
    expect(tapChestPhase('sealed', false)).toBe('shaking');
    expect(tapChestPhase('sealed', true)).toBe('revealed');
  });

  it('Given the chest mid-shake or mid-burst, When tapped, Then it skips straight to the reveal', () => {
    expect(tapChestPhase('shaking', false)).toBe('revealed');
    expect(tapChestPhase('bursting', false)).toBe('revealed');
  });

  it('Given the reveal, When tapped, Then it stays revealed', () => {
    expect(tapChestPhase('revealed', false)).toBe('revealed');
  });
});

describe('chestRays', () => {
  it('Given each rarity, Then rarer chests throw more and brighter rays in their own colour', () => {
    const [common, rare, epic] = CHEST_RARITIES.map(chestRays);
    expect(rare.rays).toBeGreaterThan(common.rays);
    expect(epic.rays).toBeGreaterThan(rare.rays);
    expect(epic.strength).toBeGreaterThan(common.strength);
    expect(new Set([common.hex, rare.hex, epic.hex]).size).toBe(3);
  });
});

describe('chestHeadlineKey', () => {
  it('Given a rarity, Then the headline names that chest', () => {
    expect(chestHeadlineKey('epic')).toBe('economy.chest.headline.epic');
  });
});

describe('chestCoinCount', () => {
  it('Given no cash this round, Then no coins fly (nothing earned is never shown as earned)', () => {
    expect(chestCoinCount(0)).toBe(0);
    expect(chestCoinCount(-3)).toBe(0);
  });

  it('Given a little cash, Then one coin flies per cash, and a big round is capped', () => {
    expect(chestCoinCount(3)).toBe(3);
    expect(chestCoinCount(500)).toBe(10);
  });
});
