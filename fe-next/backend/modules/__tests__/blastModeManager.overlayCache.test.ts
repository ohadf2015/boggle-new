/**
 * blastModeManager - overlayMap cache tests
 * Verifies that initBlastModeState populates an overlayMap cache.
 */

import { initBlastModeState } from '../blastModeManager';

describe('blastModeManager - overlayMap cache (Fix 3)', () => {
  const grid: string[][] = [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
  ];
  const players = ['alice', 'bob'];

  describe('initBlastModeState - populates overlayMap', () => {
    it('should include overlayMap on the returned BlastModeState', () => {
      const state = initBlastModeState(grid, players);
      expect(state.overlayMap).toBeInstanceOf(Map);
    });

    it('should populate overlayMap with all overlay tiles keyed as "row,col"', () => {
      const state = initBlastModeState(grid, players);
      // Every tile in overlay should be present in overlayMap
      for (const tile of state.overlay) {
        expect(state.overlayMap.has(`${tile.row},${tile.col}`)).toBe(true);
        expect(state.overlayMap.get(`${tile.row},${tile.col}`)).toBe(tile.type);
      }
    });

    it('should have overlayMap with same size as overlay array', () => {
      const state = initBlastModeState(grid, players);
      expect(state.overlayMap.size).toBe(state.overlay.length);
    });

    it('overlayMap size should equal overlay length regardless of count', () => {
      const state = initBlastModeState(grid, players);
      // Map size should equal overlay length (could be 0 if no specials rolled)
      expect(state.overlayMap.size).toBe(state.overlay.length);
    });
  });

});
