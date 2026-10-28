import { describe, it, expect } from 'vitest';
import { overlayToTileStates } from '../blastOverlayToTileStates';
import type { BlastTileOverlay } from '@/shared/types/game';

describe('overlayToTileStates — overlays saved before the roster cut', () => {
  it('loads retired tile types as plain letters and keeps bomb/coin/diamond', () => {
    const overlay = [
      { row: 0, col: 0, type: 'ice' },
      { row: 0, col: 1, type: 'bomb' },
      { row: 1, col: 0, type: 'frozen' },
      { row: 1, col: 1, type: 'diamond' },
      { row: 0, col: 2, type: 'gold' },
    ] as unknown as BlastTileOverlay[];
    const states = overlayToTileStates(overlay, 3);
    expect(states[0].map(t => t.type)).toEqual(['standard', 'bomb', 'gold']);
    expect(states[1][0]).toMatchObject({ type: 'standard', hitsRemaining: 0 });
    expect(states[1][0]).not.toHaveProperty('innerType');
    expect(states[1][1].type).toBe('diamond');
  });
});
