import { describe, it, expect } from 'vitest';
import { createTowerWorld } from '@/lib/wordTowerV2/engine';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import { seedDemoTower, seededPeakM } from '../runHelpers';

describe('seededPeakM', () => {
  it('Given a restored daily tower still settling, Then its peak already counts every restored floor (no perk draft on reopen)', () => {
    const world = createTowerWorld({ seed: 1 });
    const words = ['sun', 'moon', 'star', 'tree', 'rock', 'wave', 'fire', 'wind', 'rain', 'snow', 'leaf', 'bird'];
    const n = seedDemoTower(world, new Map(), words, 250);
    expect(Math.floor(floorsAt(seededPeakM(world, n)))).toBeGreaterThanOrEqual(words.length);
  });

  it('Given nothing seeded, Then the peak is the ground', () => {
    expect(seededPeakM(createTowerWorld({ seed: 1 }), 0)).toBe(0);
  });
});
