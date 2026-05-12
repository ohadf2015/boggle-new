import { describe, it, expect } from 'vitest';
import { rollChest } from '../chest-roll';

describe('chest-roll', () => {
  it('returns deterministic ChestContents for same userId and chestNumber', () => {
    const roll1 = rollChest('user-1', 5, 'en');
    const roll2 = rollChest('user-1', 5, 'en');
    expect(roll1).toEqual(roll2);
  });

  it('returns different contents for different userId', () => {
    const roll1 = rollChest('user-1', 5, 'en');
    const roll2 = rollChest('user-2', 5, 'en');
    expect(roll1).not.toEqual(roll2);
  });

  it('returns gold tier for chest 5', () => {
    const contents = rollChest('user-1', 5, 'en');
    expect(contents.tier).toBe('gold');
  });

  it('coins are within tier range', () => {
    const contents = rollChest('user-1', 5, 'en');
    // gold tier: coinBase 800, variance 200
    expect(contents.coins).toBeGreaterThanOrEqual(800);
    expect(contents.coins).toBeLessThanOrEqual(800 + 200);
  });

  it('boosts array matches tier boostCount', () => {
    const contents = rollChest('user-1', 5, 'en'); // gold = 2 boosts
    expect(contents.boosts.length).toBe(2);
    contents.boosts.forEach((b) => {
      expect(b.type).toBeDefined();
      expect(b.count).toBe(1);
    });
  });

  it('avatarPart is nullable string', () => {
    const contents = rollChest('user-1', 5, 'en');
    if (contents.avatarPart) {
      expect(typeof contents.avatarPart).toBe('string');
    }
  });

  it('frameSkin matches tier frame', () => {
    const contents = rollChest('user-1', 5, 'en');
    expect(contents.frameSkin).toBe('gold');
  });
});
