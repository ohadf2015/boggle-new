/**
 * Tests for shared overlayToTileStates — extracted from useBlastMultiplayerBridge
 * and backend/modules/blastModeManager so client + server produce byte-identical
 * tile state grids from the same server-issued overlay + seed.
 */

import { overlayToTileStates } from '../blastOverlayToTileStates';
import type { BlastTileOverlay } from '@/shared/types/game';

describe('overlayToTileStates', () => {
  it('returns gridSize x gridSize grid of standard tiles when overlay is empty', () => {
    const states = overlayToTileStates([], 4, 42);

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
      { row: 0, col: 0, type: 'rainbow' },
    ];

    const states = overlayToTileStates(overlay, 4, 1);

    expect(states[1][2].type).toBe('bomb');
    expect(states[0][0].type).toBe('rainbow');
    expect(states[3][3].type).toBe('standard');
  });

  it('assigns stable mp-{row}-{col} uids', () => {
    const states = overlayToTileStates([], 3, 7);

    expect(states[0][0].uid).toBe('mp-0-0');
    expect(states[2][1].uid).toBe('mp-2-1');
  });

  it('assigns frozen tiles a deterministic innerType from the seeded RNG', () => {
    const overlay: BlastTileOverlay[] = [{ row: 0, col: 0, type: 'frozen' }];

    const a = overlayToTileStates(overlay, 2, 99);
    const b = overlayToTileStates(overlay, 2, 99);

    expect(a[0][0].innerType).toBeDefined();
    expect(a[0][0].innerType).toBe(b[0][0].innerType);
  });

  it('treats seed=null the same as seed=0', () => {
    const overlay: BlastTileOverlay[] = [{ row: 0, col: 0, type: 'frozen' }];

    const a = overlayToTileStates(overlay, 2, null);
    const b = overlayToTileStates(overlay, 2, 0);

    expect(a[0][0].innerType).toBe(b[0][0].innerType);
  });

  it('does not assign innerType to non-frozen tiles', () => {
    const overlay: BlastTileOverlay[] = [
      { row: 0, col: 0, type: 'bomb' },
      { row: 1, col: 1, type: 'rainbow' },
    ];

    const states = overlayToTileStates(overlay, 2, 42);

    expect(states[0][0].innerType).toBeUndefined();
    expect(states[1][1].innerType).toBeUndefined();
  });
});
