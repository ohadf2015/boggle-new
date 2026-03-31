/**
 * Tests for blast tile tooltip descriptions.
 */
import { getTileTooltip, TILE_TOOLTIPS } from '../utils/blastTileTooltips';
import type { BlastTileType } from '@/shared/types/blast';

describe('TILE_TOOLTIPS', () => {
  it('defines tooltips for all 12 special tile types', () => {
    const specialTypes: BlastTileType[] = [
      'gold', 'bomb', 'rainbow', 'ice', 'lightning', 'magnet',
      'prism', 'gem', 'frozen', 'mirror', 'silver', 'diamond',
    ];
    for (const type of specialTypes) {
      expect(TILE_TOOLTIPS[type]).toBeDefined();
      expect(TILE_TOOLTIPS[type]!.name).toBeTruthy();
      expect(TILE_TOOLTIPS[type]!.desc).toBeTruthy();
    }
  });

  it('does NOT define a tooltip for standard tiles', () => {
    expect(TILE_TOOLTIPS['standard']).toBeUndefined();
  });
});

describe('getTileTooltip', () => {
  it('returns tooltip for bomb tile', () => {
    const tip = getTileTooltip('bomb');
    expect(tip?.name).toBe('Bomb');
    expect(tip?.desc).toContain('3×3');
  });

  it('returns null for standard tile', () => {
    expect(getTileTooltip('standard')).toBeNull();
  });

  it('returns tooltip with multiplier info for gold', () => {
    const tip = getTileTooltip('gold');
    expect(tip?.desc).toContain('3×');
  });

  it('returns tooltip with hits info for gem', () => {
    const tip = getTileTooltip('gem');
    expect(tip?.desc).toContain('3 hits');
  });
});
