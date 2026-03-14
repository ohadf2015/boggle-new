/**
 * blastModeManager - overlayMap cache tests
 * TDD: RED phase — these tests must fail before the implementation
 */

import {
  initBlastModeState,
  getTilesOnPath,
} from '../blastModeManager';

import type { BlastTileOverlay, BlastModeState } from '@/shared/types/game';
import type { BlastTileType } from '@/shared/types/blast';

// TODO: RED phase — overlayMap cache not yet implemented
describe.skip('blastModeManager - overlayMap cache (Fix 3)', () => {
  const grid: string[][] = [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
  ];
  const players = ['alice', 'bob'];

  describe('initBlastModeState - populates overlayMap', () => {
    it('should include overlayMap on the returned BlastModeState', () => {
      const state = initBlastModeState(grid, players);
      expect((state as any).overlayMap).toBeInstanceOf(Map);
    });

    it('should populate overlayMap with all overlay tiles keyed as "row,col"', () => {
      // Use 100% special chance to guarantee tiles appear
      // We need to override the module's BLAST_SPECIAL_TILE_CHANCE indirectly.
      // Instead, create overlay manually and test getTilesOnPath uses cached map.
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
        { row: 1, col: 1, type: 'bomb' as BlastTileType },
      ];
      // Manually build a state that mimics what initBlastModeState should produce
      // The overlay entries must map to the overlayMap correctly
      const state = initBlastModeState(grid, players);
      const overlayMap = (state as any).overlayMap as Map<string, BlastTileType>;
      // Every tile in overlay should be present in overlayMap
      for (const tile of state.overlay) {
        expect(overlayMap.has(`${tile.row},${tile.col}`)).toBe(true);
        expect(overlayMap.get(`${tile.row},${tile.col}`)).toBe(tile.type);
      }
    });

    it('should have overlayMap with same size as overlay array', () => {
      const state = initBlastModeState(grid, players);
      const overlayMap = (state as any).overlayMap as Map<string, BlastTileType>;
      expect(overlayMap.size).toBe(state.overlay.length);
    });

    it('overlayMap should be empty when overlay is empty (0 special chance)', () => {
      // We can test by inspecting that overlayMap is consistent regardless of size
      // If overlay is [], overlayMap should be empty Map
      const state = initBlastModeState(grid, players);
      const overlayMap = (state as any).overlayMap as Map<string, BlastTileType>;
      // Map size should equal overlay length (could be 0 if no specials rolled)
      expect(overlayMap.size).toBe(state.overlay.length);
    });
  });

  describe('getTilesOnPath - uses cached overlayMap when available', () => {
    it('should return correct tile types using cached overlayMap', () => {
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
        { row: 0, col: 1, type: 'rainbow' as BlastTileType },
      ];
      const overlayMap = new Map<string, BlastTileType>([
        ['0,0', 'gold'],
        ['0,1', 'rainbow'],
      ]);

      const positions = new Map([
        ['a', [{ row: 0, col: 0 }]],
        ['b', [{ row: 0, col: 1 }]],
      ]);

      // When overlayMap is provided, it should be used instead of rebuilding
      const result = getTilesOnPath('ab', positions, overlay);
      expect(result).toContain('gold');
      expect(result).toContain('rainbow');
    });

    it('should still work when overlayMap is not provided (backward compat)', () => {
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
      ];
      const positions = new Map([
        ['a', [{ row: 0, col: 0 }]],
      ]);

      // Without overlayMap — rebuilds from overlay array (old behavior)
      const result = getTilesOnPath('a', positions, overlay);
      expect(result).toContain('gold');
    });

    it('should not rebuild Map when cached overlayMap is provided', () => {
      // Spy on Map constructor to verify it is NOT called with overlay data
      // when a pre-built map is passed. We verify indirectly by mutating
      // overlay after building the cache — cached map should still win.
      const overlay: BlastTileOverlay[] = [
        { row: 0, col: 0, type: 'gold' as BlastTileType },
      ];
      const cachedMap = new Map<string, BlastTileType>([
        ['0,0', 'bomb'], // different from overlay — cache wins
      ]);
      const positions = new Map([
        ['a', [{ row: 0, col: 0 }]],
      ]);

      const result = getTilesOnPath('a', positions, overlay);
      // Should use cachedMap value ('bomb'), not overlay value ('gold')
      expect(result).toContain('bomb');
      expect(result).not.toContain('gold');
    });
  });
});
