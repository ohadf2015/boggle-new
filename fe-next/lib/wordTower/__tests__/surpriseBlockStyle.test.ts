import { describe, it, expect } from 'vitest';
import { SURPRISE_BLOCK_COLOR, surpriseBlockColor, isSurpriseBlock } from '../surpriseBlockStyle';
import { TOWER_SURPRISE_META, type TowerSurpriseEvent } from '../towerSurprise';

describe('surpriseBlockStyle', () => {
  it('has a signature colour for every surprise event (stays in sync with the meta table)', () => {
    const events = Object.keys(TOWER_SURPRISE_META) as TowerSurpriseEvent[];
    for (const ev of events) {
      expect(SURPRISE_BLOCK_COLOR[ev]).toBeTypeOf('number');
    }
    // No stray keys either — the maps must match 1:1.
    expect(Object.keys(SURPRISE_BLOCK_COLOR).sort()).toEqual(events.sort());
  });

  it('every colour is a valid 24-bit RGB int', () => {
    for (const hex of Object.values(SURPRISE_BLOCK_COLOR)) {
      expect(hex).toBeGreaterThanOrEqual(0);
      expect(hex).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('surpriseBlockColor returns the signature for a tagged floor, null otherwise', () => {
    expect(surpriseBlockColor('golden_floor')).toBe(SURPRISE_BLOCK_COLOR.golden_floor);
    expect(surpriseBlockColor(undefined)).toBeNull();
  });

  it('isSurpriseBlock narrows correctly', () => {
    expect(isSurpriseBlock('crystal')).toBe(true);
    expect(isSurpriseBlock(undefined)).toBe(false);
  });
});
