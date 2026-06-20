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

  it('coins fold in the value of the (removed) phantom boost/part rewards', () => {
    const contents = rollChest('user-1', 5, 'en');
    // gold tier: coinBase 800, variance 0..200, + 2 boosts × 100 folded in,
    // + 0 or 150 for the would-have-been avatar part.
    expect(contents.coins).toBeGreaterThanOrEqual(800 + 2 * 100);
    expect(contents.coins).toBeLessThanOrEqual(800 + 200 + 2 * 100 + 150);
  });

  it('awards NO phantom boosts — there is no power-up system to use them', () => {
    const contents = rollChest('user-1', 5, 'en'); // gold tier
    expect(contents.boosts).toEqual([]);
  });

  it('awards NO phantom avatar part — chest parts were never redeemable', () => {
    // Sweep many chests/tiers so a chance-roll can't sneak one through.
    for (let n = 1; n <= 40; n++) {
      expect(rollChest('user-1', n, 'en').avatarPart).toBeNull();
    }
  });

  it('higher tiers fold in more coins than a no-boost wood chest', () => {
    const wood = rollChest('user-1', 1, 'en'); // wood: 0 boosts → nothing folded
    const legendary = rollChest('user-1', 10, 'en'); // legendary: 3 boosts → +300
    expect(legendary.coins).toBeGreaterThan(wood.coins);
  });

  it('frameSkin matches tier frame', () => {
    const contents = rollChest('user-1', 5, 'en');
    expect(contents.frameSkin).toBe('gold');
  });
});
