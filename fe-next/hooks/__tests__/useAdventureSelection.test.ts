/**
 * useAdventureSelection Hook Tests
 *
 * Tests for tile selection with adjacency validation in Adventure Mode.
 * Following TDD: Write tests FIRST, then implement.
 */

import { renderHook, act } from '@testing-library/react';
import { useAdventureSelection } from '../useAdventureSelection';
import type { GridTileState } from '@/types/adventure';

// ==============================================
// TEST FIXTURES
// ==============================================

/**
 * Create a test grid of tiles
 * Grid layout (4x4):
 *   0  1  2  3
 *   4  5  6  7
 *   8  9  10 11
 *   12 13 14 15
 *
 * Letters:
 *   C  A  T  S
 *   D  O  G  E
 *   B  I  R  D
 *   F  I  S  H
 */
const createTestGrid = (): GridTileState[] => {
  const letters = [
    ['C', 'A', 'T', 'S'],
    ['D', 'O', 'G', 'E'],
    ['B', 'I', 'R', 'D'],
    ['F', 'I', 'S', 'H'],
  ];

  const tiles: GridTileState[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      tiles.push({
        id: `tile-${row}-${col}`,
        letter: letters[row][col],
        type: 'standard',
        isCleared: false,
        row,
        col,
      });
    }
  }
  return tiles;
};

// ==============================================
// TESTS
// ==============================================

describe('useAdventureSelection', () => {
  const mockTiles = createTestGrid();

  describe('Initial State', () => {
    it('should start with empty selection', () => {
      // GIVEN / WHEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // THEN
      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.currentWord).toBe('');
      expect(result.current.isSelecting).toBe(false);
    });
  });

  describe('Tile Selection', () => {
    it('should select first tile', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select tile at index 0 (letter 'C')
      act(() => {
        result.current.selectTile(0);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0]);
      expect(result.current.currentWord).toBe('C');
    });

    it('should select adjacent tile', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select 'C' (0) then 'A' (1) - horizontally adjacent
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(1);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0, 1]);
      expect(result.current.currentWord).toBe('CA');
    });

    it('should select diagonally adjacent tile', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select 'C' (0) then 'O' (5) - diagonally adjacent
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(5);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0, 5]);
      expect(result.current.currentWord).toBe('CO');
    });

    it('should reject non-adjacent tile', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select 'C' (0) then 'R' (10) - not adjacent
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(10);
      });

      // THEN - only first tile should be selected
      expect(result.current.selectedIndices).toEqual([0]);
      expect(result.current.currentWord).toBe('C');
    });

    it('should truncate path when dragging back to already-selected tile (backtracking)', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select C, A, T then drag back to A
      act(() => {
        result.current.selectTile(0); // C
        result.current.selectTile(1); // A
        result.current.selectTile(2); // T
        result.current.selectTile(1); // A - already selected (middle), should truncate
      });

      // THEN - path should be truncated to [C, A]
      expect(result.current.selectedIndices).toEqual([0, 1]);
      expect(result.current.currentWord).toBe('CA');
    });

    it('should truncate to first tile when dragging back to start', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select C, A, T then drag back to C
      act(() => {
        result.current.selectTile(0); // C
        result.current.selectTile(1); // A
        result.current.selectTile(2); // T
        result.current.selectTile(0); // C - first tile, should truncate to just [C]
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0]);
      expect(result.current.currentWord).toBe('C');
    });

    it('should truncate longer paths correctly when backtracking', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select C(0), A(1), T(2), G(6), O(5) then drag back to A(1)
      act(() => {
        result.current.selectTile(0);  // C
        result.current.selectTile(1);  // A
        result.current.selectTile(2);  // T
        result.current.selectTile(6);  // G (adjacent to T)
        result.current.selectTile(5);  // O (adjacent to G)
        result.current.selectTile(1);  // A - backtrack to index 1
      });

      // THEN - should truncate to [C, A]
      expect(result.current.selectedIndices).toEqual([0, 1]);
      expect(result.current.currentWord).toBe('CA');
    });

    it('should build word from multiple adjacent tiles', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select 'C' (0), 'A' (1), 'T' (2) for "CAT"
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(1);
        result.current.selectTile(2);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0, 1, 2]);
      expect(result.current.currentWord).toBe('CAT');
    });
  });

  describe('Deselection', () => {
    it('should deselect last tile when clicked again', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      act(() => {
        result.current.selectTile(0); // C
        result.current.selectTile(1); // A
        result.current.selectTile(2); // T
      });
      expect(result.current.currentWord).toBe('CAT');

      // WHEN - click on last tile again (classic grid behavior: submit + clear)
      act(() => {
        result.current.selectTile(2);
      });

      // THEN - should submit and clear selection (classic grid click-to-submit)
      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.currentWord).toBe('');
    });

    it('should deselect all remaining tiles when first tile is clicked again', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      act(() => {
        result.current.selectTile(0);
      });
      expect(result.current.currentWord).toBe('C');

      // WHEN - click first tile again
      act(() => {
        result.current.selectTile(0);
      });

      // THEN - should clear selection
      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.currentWord).toBe('');
    });
  });

  describe('Clear Selection', () => {
    it('should clear all selected tiles', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(1);
        result.current.selectTile(2);
      });

      // WHEN
      act(() => {
        result.current.clearSelection();
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.currentWord).toBe('');
    });
  });

  describe('Path Coordinates', () => {
    it('should provide path with row/col coordinates', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select C (0,0), A (0,1), T (0,2)
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(1);
        result.current.selectTile(2);
      });

      // THEN
      expect(result.current.getPath()).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]);
    });

    it('should return empty path when nothing selected', () => {
      // GIVEN / WHEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // THEN
      expect(result.current.getPath()).toEqual([]);
    });
  });

  describe('Selection State', () => {
    it('should set isSelecting to true when tiles are selected', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN
      act(() => {
        result.current.selectTile(0);
      });

      // THEN
      expect(result.current.isSelecting).toBe(true);
    });

    it('should set isSelecting to false when selection is cleared', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      act(() => {
        result.current.selectTile(0);
      });

      // WHEN
      act(() => {
        result.current.clearSelection();
      });

      // THEN
      expect(result.current.isSelecting).toBe(false);
    });
  });

  describe('Adjacency Validation', () => {
    it('should allow vertical adjacency', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select 'C' (0) then 'D' (4) - vertically adjacent
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(4);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0, 4]);
      expect(result.current.currentWord).toBe('CD');
    });

    it('should allow all 8 directions of adjacency', () => {
      // GIVEN - center tile 'O' at index 5 (row 1, col 1)
      // Adjacent: C(0), A(1), T(2), D(4), G(6), B(8), I(9), R(10)
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // Test all 8 adjacent tiles from center 'O' (5)
      const adjacentIndices = [0, 1, 2, 4, 6, 8, 9, 10];

      adjacentIndices.forEach((adjacentIndex) => {
        act(() => {
          result.current.clearSelection();
          result.current.selectTile(5); // Start at O
          result.current.selectTile(adjacentIndex);
        });

        expect(result.current.selectedIndices).toEqual([5, adjacentIndex]);
      });
    });

    it('should reject non-adjacent tiles (more than 1 step away)', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select 'C' (0) then 'H' (15) - far away
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(15);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle selection at grid corners', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select bottom-right corner 'H' (15) then 'S' (14)
      act(() => {
        result.current.selectTile(15); // H at (3,3)
        result.current.selectTile(14); // S at (3,2)
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([15, 14]);
      expect(result.current.currentWord).toBe('HS');
    });

    it('should handle selection at grid edges', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - select edge tiles along bottom
      act(() => {
        result.current.selectTile(12); // F at (3,0)
        result.current.selectTile(13); // I at (3,1)
        result.current.selectTile(14); // S at (3,2)
        result.current.selectTile(15); // H at (3,3)
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([12, 13, 14, 15]);
      expect(result.current.currentWord).toBe('FISH');
    });

    it('should work with different grid sizes', () => {
      // GIVEN - create 5x5 grid
      const tiles5x5: GridTileState[] = [];
      const letters5 = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const idx = row * 5 + col;
          tiles5x5.push({
            id: `tile-${row}-${col}`,
            letter: letters5[idx],
            type: 'standard',
            isCleared: false,
            row,
            col,
          });
        }
      }

      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: tiles5x5, gridSize: 5 })
      );

      // WHEN - select A (0), B (1), C (2) - first row
      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(1);
        result.current.selectTile(2);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([0, 1, 2]);
      expect(result.current.currentWord).toBe('ABC');
    });

    it('should handle empty tiles array gracefully', () => {
      // GIVEN / WHEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: [], gridSize: 4 })
      );

      // THEN - should not crash
      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.currentWord).toBe('');
    });

    it('should handle invalid tile index gracefully', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4 })
      );

      // WHEN - try to select invalid index
      act(() => {
        result.current.selectTile(999);
      });

      // THEN - should not crash or add invalid tile
      expect(result.current.selectedIndices).toEqual([]);
    });
  });

  describe('Disabled State', () => {
    it('should not allow selection when disabled', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: mockTiles, gridSize: 4, disabled: true })
      );

      // WHEN
      act(() => {
        result.current.selectTile(0);
      });

      // THEN
      expect(result.current.selectedIndices).toEqual([]);
    });

    it('should allow clearing selection when disabled', () => {
      // GIVEN - select while enabled
      const { result, rerender } = renderHook(
        ({ disabled }) =>
          useAdventureSelection({ tiles: mockTiles, gridSize: 4, disabled }),
        { initialProps: { disabled: false } }
      );

      act(() => {
        result.current.selectTile(0);
        result.current.selectTile(1);
      });
      expect(result.current.selectedIndices).toEqual([0, 1]);

      // WHEN - disable and clear
      rerender({ disabled: true });
      act(() => {
        result.current.clearSelection();
      });

      // THEN - should still be able to clear
      expect(result.current.selectedIndices).toEqual([]);
    });
  });

  describe('Frozen Tile Selection', () => {
    const createGridWithFrozenTile = (): GridTileState[] => {
      const tiles = createTestGrid();
      // Make tile at index 1 (position 0,1) frozen
      tiles[1] = {
        ...tiles[1],
        type: 'ice',
        isFrozen: true,
      };
      return tiles;
    };

    it('should NOT allow selecting a frozen tile as first tile', () => {
      // GIVEN - Grid with frozen tile at index 1
      const frozenTiles = createGridWithFrozenTile();
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: frozenTiles, gridSize: 4 })
      );

      // WHEN - Try to select frozen tile
      act(() => {
        result.current.selectTile(1); // Frozen ice tile
      });

      // THEN - Selection should be rejected
      expect(result.current.selectedIndices).toEqual([]);
      expect(result.current.currentWord).toBe('');
    });

    it('should NOT allow selecting a frozen tile as part of a path', () => {
      // GIVEN - Grid with frozen tile at index 1, select tile 0 first
      const frozenTiles = createGridWithFrozenTile();
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: frozenTiles, gridSize: 4 })
      );

      act(() => {
        result.current.selectTile(0); // Select C at (0,0)
      });
      expect(result.current.selectedIndices).toEqual([0]);

      // WHEN - Try to select adjacent frozen tile
      act(() => {
        result.current.selectTile(1); // Frozen A at (0,1)
      });

      // THEN - Frozen tile should NOT be added to selection
      expect(result.current.selectedIndices).toEqual([0]);
      expect(result.current.currentWord).toBe('C');
    });

    it('should allow selecting an unfrozen ice tile', () => {
      // GIVEN - Grid with unfrozen ice tile at index 1
      const tiles = createTestGrid();
      tiles[1] = {
        ...tiles[1],
        type: 'ice',
        isFrozen: false, // Unfrozen
      };

      const { result } = renderHook(() =>
        useAdventureSelection({ tiles, gridSize: 4 })
      );

      // WHEN - Select the unfrozen ice tile
      act(() => {
        result.current.selectTile(1);
      });

      // THEN - Should be allowed
      expect(result.current.selectedIndices).toEqual([1]);
      expect(result.current.currentWord).toBe('A');
    });

    it('should allow selecting standard tiles adjacent to frozen tiles', () => {
      // GIVEN - Grid with frozen tile at index 1
      const frozenTiles = createGridWithFrozenTile();
      const { result } = renderHook(() =>
        useAdventureSelection({ tiles: frozenTiles, gridSize: 4 })
      );

      // WHEN - Select tiles around the frozen tile (0 -> 4 -> 5)
      act(() => {
        result.current.selectTile(0); // C at (0,0)
        result.current.selectTile(4); // D at (1,0) - diagonal from frozen
        result.current.selectTile(5); // O at (1,1) - adjacent to frozen
      });

      // THEN - Standard tiles should be selected
      expect(result.current.selectedIndices).toEqual([0, 4, 5]);
      expect(result.current.currentWord).toBe('CDO');
    });
  });
});
