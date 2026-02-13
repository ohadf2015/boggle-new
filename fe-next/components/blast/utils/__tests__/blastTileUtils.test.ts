import { getInitialHitsRemaining } from '../blastTileUtils';
import type { BlastTileType } from '../../types';

describe('getInitialHitsRemaining', () => {
  it('returns 2 for ice tiles', () => {
    expect(getInitialHitsRemaining('ice')).toBe(2);
  });

  it('returns 2 for prism tiles', () => {
    expect(getInitialHitsRemaining('prism')).toBe(2);
  });

  it('returns 3 for gem tiles', () => {
    expect(getInitialHitsRemaining('gem')).toBe(3);
  });

  it('returns 3 for frozen tiles', () => {
    expect(getInitialHitsRemaining('frozen')).toBe(3);
  });

  it('returns 0 for standard tiles', () => {
    expect(getInitialHitsRemaining('standard')).toBe(0);
  });

  it('returns 0 for all other special tiles', () => {
    const zeroHitTypes: BlastTileType[] = ['gold', 'bomb', 'rainbow', 'wildcard', 'lightning', 'magnet'];
    for (const type of zeroHitTypes) {
      expect(getInitialHitsRemaining(type)).toBe(0);
    }
  });
});
