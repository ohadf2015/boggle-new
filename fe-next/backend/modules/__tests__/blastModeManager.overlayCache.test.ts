/**
 * blastModeManager - overlayMap cache tests
 * Verifies that initBlastModeState populates an overlayMap cache
 * and getTilesOnPath uses it when provided.
 */

import {
  initBlastModeState,
  getTilesOnPath,
} from '../blastModeManager';

import type { BlastTileOverlay } from '@/shared/types/game';
import type { BlastTileType } from '@/shared/types/blast';

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

  describe('getTilesOnPath - uses cached overlayMap when available', () => {
    it('should return correct tile types using cached overlayMap', () => {
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
        { row: 0, col: 1, type: 'rainbow' as BlastTileType },
      ];
      const cachedMap = new Map<string, BlastTileType>([
        ['0,0', 'gold'],
        ['0,1', 'rainbow'],
      ]);

      const positions = new Map([
        ['a', [[0, 0] as [number, number]]],
        ['b', [[0, 1] as [number, number]]],
      ]);

      // When overlayMap is provided, it should be used instead of rebuilding
      const result = getTilesOnPath('ab', positions, overlay, cachedMap);
      expect(result).toContain('gold');
      expect(result).toContain('rainbow');
    });

    it('should still work when overlayMap is not provided (backward compat)', () => {
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
      ];
      const positions = new Map([
        ['a', [[0, 0] as [number, number]]],
      ]);

      // Without overlayMap — rebuilds from overlay array (old behavior)
      const result = getTilesOnPath('a', positions, overlay);
      expect(result).toContain('gold');
    });

    it('should use cached map over overlay when both provided', () => {
      // Overlay says 'gold', but cached map says 'bomb' — cache should win
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
      ];
      const cachedMap = new Map<string, BlastTileType>([
        ['0,0', 'bomb'], // different from overlay — cache wins
      ]);
      const positions = new Map([
        ['a', [[0, 0] as [number, number]]],
      ]);

      const result = getTilesOnPath('a', positions, overlay, cachedMap);
      // Should use cachedMap value ('bomb'), not overlay value ('gold')
      expect(result).toContain('bomb');
      expect(result).not.toContain('gold');
    });
  });
});
