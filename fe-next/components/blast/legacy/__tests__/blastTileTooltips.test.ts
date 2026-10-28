/**
 * Tests for blast tile tooltip descriptions.
 */
import { getTileTooltip } from '../utils/blastTileTooltips';
import type { BlastTileType } from '@/shared/types/blast';

describe('getTileTooltip', () => {
  const allSpecialTypes: BlastTileType[] = ['gold', 'bomb', 'diamond'];

  it('defines tooltips for every special tile type', () => {
    for (const type of allSpecialTypes) {
      const tip = getTileTooltip(type);
      expect(tip).toBeDefined();
      expect(tip!.name).toBeTruthy();
      expect(tip!.desc).toBeTruthy();
      expect(tip!.icon).toBeTruthy();
    }
  });

  it('returns null for standard tile', () => {
    expect(getTileTooltip('standard')).toBeNull();
  });

  it('returns tooltip for bomb tile', () => {
    const tip = getTileTooltip('bomb');
    expect(tip?.name).toBe('Bomb');
    expect(tip?.desc).toContain('3×3');
  });

  it('returns tooltip with multiplier info for gold', () => {
    const tip = getTileTooltip('gold');
    expect(tip?.desc).toContain('3×');
  });

  it('names the coin tile', () => {
    expect(getTileTooltip('gold')?.name).toBe('Coin');
  });

  it('uses i18n translations when t() provides real values', () => {
    const mockT = (key: string) => {
      if (key === 'blast.tile.bomb.name') return 'Bombe';
      if (key === 'blast.tile.bomb.desc') return 'Räumt 3×3 Bereich';
      return key;
    };
    const tip = getTileTooltip('bomb', mockT);
    expect(tip?.name).toBe('Bombe');
    expect(tip?.desc).toBe('Räumt 3×3 Bereich');
  });

  it('falls back to English when t() returns keys unchanged', () => {
    const passthroughT = (key: string) => key;
    const tip = getTileTooltip('bomb', passthroughT);
    expect(tip?.name).toBe('Bomb');
  });
});
