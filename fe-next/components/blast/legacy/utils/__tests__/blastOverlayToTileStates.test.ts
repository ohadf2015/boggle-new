/**
 * Tests for shared overlayToTileStates — extracted from useBlastMultiplayerBridge
 * and backend/modules/blastModeManager so client + server produce byte-identical
 * tile state grids from the same server-issued overlay.
 */

import { overlayToTileStates } from '../blastOverlayToTileStates';
import type { BlastTileOverlay } from '@/shared/types/game';

describe('overlayToTileStates', () => {
  it('returns gridSize x gridSize grid of standard tiles when overlay is empty', () => {
    const states = overlayToTileStates([], 4);

    expect(states).toHaveLength(4);
    expect(states[0]).toHaveLength(4);
    for (const row of states) {
      for (const tile of row) {
        expect(tile.type).toBe('standard');
        expect(tile.isCleared).toBe(false);
        expect(tile.activationEffect).toBeNull();
      }
    }
  });

  it('places overlay-declared tile types at the correct row/col', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 1, col: 2, type: 'bomb' },
      { row: 0, col: 0, type: 'gold' },
    ];

    const states = overlayToTileStates(overlay, 4);

    expect(states[1][2].type).toBe('bomb');
    expect(states[0][0].type).toBe('gold');
    expect(states[3][3].type).toBe('standard');
  });

  it('assigns stable mp-{row}-{col} uids', () => {
    const states = overlayToTileStates([], 3);

    expect(states[0][0].uid).toBe('mp-0-0');
    expect(states[2][1].uid).toBe('mp-2-1');
  });

});
