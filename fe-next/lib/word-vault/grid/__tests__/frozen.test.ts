import { describe, it, expect } from 'vitest';
import { applyFrozen, isSelectable, thawOnTargetHit } from '../modifiers/frozen';
import type { TileState } from '../types';

const tile = (i: number, letter: string, frozen = false): TileState => ({
  index: i, letter, frozen, selected: false,
});

describe('frozen modifier', () => {
  it('applyFrozen ices exactly n random tiles', () => {
    const tiles = Array.from({ length: 9 }, (_, i) => tile(i, 'א'));
    const out = applyFrozen(tiles, { kind: 'frozen', n: 3 }, () => 0); // deterministic rng
    expect(out.filter((t) => t.frozen)).toHaveLength(3);
  });

  it('applyFrozen with n > tile count caps at tile count', () => {
    const tiles = Array.from({ length: 4 }, (_, i) => tile(i, 'א'));
    const out = applyFrozen(tiles, { kind: 'frozen', n: 99 }, () => 0);
    expect(out.filter((t) => t.frozen)).toHaveLength(4);
  });

  it('isSelectable returns false for a frozen tile', () => {
    expect(isSelectable(tile(0, 'א', true))).toBe(false);
    expect(isSelectable(tile(0, 'א', false))).toBe(true);
  });

  it('thawOnTargetHit thaws every tile after a target-hit', () => {
    const tiles = Array.from({ length: 4 }, (_, i) => tile(i, 'א', true));
    const thawed = thawOnTargetHit(tiles);
    expect(thawed.every((t) => !t.frozen)).toBe(true);
  });
});
