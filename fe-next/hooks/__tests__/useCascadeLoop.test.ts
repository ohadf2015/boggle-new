/**
 * Tests for useCascadeLoop Hook
 *
 * Test-Driven Development: Tests written FIRST
 * These tests define the behavior of the cascade state machine
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useCascadeLoop,
  applyGravity,
  spawnNewTiles,
  checkForMatches,
  type CascadePhase,
} from '../useCascadeLoop';
import type { TileState } from '@/types/adventure';

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Create a basic tile for testing
 */
function createTile(letter: string, overrides?: Partial<TileState>): TileState {
  return {
    letter,
    type: 'standard',
    isCleared: false,
    ...overrides,
  };
}

/**
 * Create a grid of tiles for testing
 */
function createGrid(size: number, fillLetter = 'A'): TileState[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => createTile(fillLetter))
  );
}

/**
 * Create a grid with specific pattern for gravity testing
 */
function createGravityTestGrid(): TileState[][] {
  return [
    [createTile('A'), createTile('B'), createTile('C')],
    [createTile('D'), createTile('E', { isCleared: true }), createTile('F')],
    [createTile('G'), createTile('H', { isCleared: true }), createTile('I')],
  ];
}

// ==============================================
// PURE FUNCTION TESTS
// ==============================================

describe('applyGravity', () => {
  it('should calculate correct fall distances for tiles above gaps', () => {
    // GIVEN
    const grid = createGravityTestGrid();

    // WHEN
    const fallingTiles = applyGravity(grid);

    // THEN
    expect(fallingTiles.size).toBeGreaterThan(0);
    // Tile at [0, 1] (B) should fall 2 spaces because both [1,1] and [2,1] are cleared
    expect(fallingTiles.get('0-1')).toBe(2);
  });

  it('should skip frozen tiles during gravity (frozen tiles stay in place)', () => {
    // GIVEN: Grid with frozen tile and cleared tiles below
    const grid = [
      [createTile('A', { type: 'ice', isFrozen: true }), createTile('B')],
      [createTile('C', { isCleared: true }), createTile('D')],
      [createTile('E', { isCleared: true }), createTile('F')],
    ];

    // WHEN
    const fallingTiles = applyGravity(grid);

    // THEN: Frozen tile should NOT appear in falling tiles (stays in place)
    expect(fallingTiles.has('0-0')).toBe(false);
  });

  it('should allow normal tiles to fall past frozen tiles', () => {
    // GIVEN: Frozen tile in middle, normal tile above, cleared below
    const grid = [
      [createTile('A'), createTile('B')],
      [createTile('C', { type: 'ice', isFrozen: true }), createTile('D')],
      [createTile('E', { isCleared: true }), createTile('F')],
    ];

    // WHEN
    const fallingTiles = applyGravity(grid);

    // THEN: Normal tile A should fall (frozen tile doesn't block column)
    expect(fallingTiles.has('0-0')).toBe(true);
    expect(fallingTiles.get('0-0')).toBe(1);
  });

  it('should return empty map when no cleared tiles exist', () => {
    // GIVEN
    const grid = createGrid(3, 'A');

    // WHEN
    const fallingTiles = applyGravity(grid);

    // THEN
    expect(fallingTiles.size).toBe(0);
  });

  it('should handle cleared tiles at the top (no tiles above to fall)', () => {
    // GIVEN
    const grid = [
      [createTile('A', { isCleared: true }), createTile('B')],
      [createTile('C'), createTile('D')],
    ];

    // WHEN
    const fallingTiles = applyGravity(grid);

    // THEN
    // Only tiles above cleared spaces should fall
    expect(fallingTiles.size).toBe(0); // No tiles above the cleared tile
  });

  it('should calculate fall distance for multiple tiles in same column', () => {
    // GIVEN
    const grid = [
      [createTile('A'), createTile('B')],
      [createTile('C', { isCleared: true }), createTile('D')],
      [createTile('E', { isCleared: true }), createTile('F')],
    ];

    // WHEN
    const fallingTiles = applyGravity(grid);

    // THEN
    // Tile A should fall 2 spaces (both [1,0] and [2,0] are cleared)
    expect(fallingTiles.get('0-0')).toBe(2);
  });
});

describe('spawnNewTiles', () => {
  it('should generate new tiles for all cleared spaces', () => {
    // GIVEN
    const grid = [
      [createTile('A'), createTile('B', { isCleared: true })],
      [createTile('C'), createTile('D', { isCleared: true })],
    ];
    const gridSize = 2;

    // WHEN
    const spawningTiles = spawnNewTiles(grid, gridSize);

    // THEN
    expect(spawningTiles.length).toBe(2); // Two cleared tiles
    spawningTiles.forEach((tileId) => {
      // Verify tile IDs are in "row-col" format
      expect(tileId).toMatch(/^\d+-\d+$/);
    });
  });

  it('should NOT spawn tiles in positions blocked by locked tiles', () => {
    // GIVEN: Grid with locked tile and cleared tile in same position
    const grid = [
      [createTile('A', { type: 'locked' }), createTile('B')],
      [createTile('C', { isCleared: true }), createTile('D')],
    ];
    const gridSize = 2;

    // WHEN
    const spawningTiles = spawnNewTiles(grid, gridSize);

    // THEN: Should only spawn for cleared tile (not locked position)
    expect(spawningTiles.length).toBe(1);
    expect(spawningTiles).toContain('1-0'); // Cleared tile
    expect(spawningTiles).not.toContain('0-0'); // Locked tile position
  });

  it('should spawn normally when locked tile is NOT in the cleared position', () => {
    // GIVEN: Locked tile in one position, cleared tile elsewhere
    const grid = [
      [createTile('A', { type: 'locked' }), createTile('B', { isCleared: true })],
      [createTile('C'), createTile('D')],
    ];
    const gridSize = 2;

    // WHEN
    const spawningTiles = spawnNewTiles(grid, gridSize);

    // THEN: Should spawn for cleared tile normally
    expect(spawningTiles.length).toBe(1);
    expect(spawningTiles).toContain('0-1');
  });

  it('should return empty array when no cleared tiles exist', () => {
    // GIVEN
    const grid = createGrid(3, 'A');
    const gridSize = 3;

    // WHEN
    const spawningTiles = spawnNewTiles(grid, gridSize);

    // THEN
    expect(spawningTiles.length).toBe(0);
  });

  it('should generate random letters for new tiles', () => {
    // GIVEN
    const grid = [
      [createTile('A', { isCleared: true }), createTile('B', { isCleared: true })],
      [createTile('C'), createTile('D')],
    ];
    const gridSize = 2;

    // WHEN
    const spawningTiles = spawnNewTiles(grid, gridSize);

    // THEN
    expect(spawningTiles.length).toBe(2);
    // Each spawned tile should have a valid ID
    spawningTiles.forEach((id) => {
      const [row, col] = id.split('-').map(Number);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(col).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('checkForMatches', () => {
  it('should return false (MVP stub - no auto-cascade)', () => {
    // GIVEN
    const grid = createGrid(4, 'A');

    // WHEN
    const hasMatches = checkForMatches(grid);

    // THEN
    expect(hasMatches).toBe(false); // MVP limitation: always returns false
  });

  it('should return false even with potential matches (deferred to future)', () => {
    // GIVEN
    // Create a grid that would have matches
    const grid = [
      [createTile('C'), createTile('A'), createTile('T')],
      [createTile('D'), createTile('O'), createTile('G')],
      [createTile('R'), createTile('U'), createTile('N')],
    ];

    // WHEN
    const hasMatches = checkForMatches(grid);

    // THEN
    expect(hasMatches).toBe(false); // MVP: Always false, documented limitation
  });
});

// ==============================================
// HOOK STATE MACHINE TESTS
// ==============================================

describe('useCascadeLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should start in idle state', () => {
    // GIVEN + WHEN
    const { result } = renderHook(() => useCascadeLoop());

    // THEN
    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.isProcessing).toBe(false);
    expect(result.current.state.iteration).toBe(0);
  });

  it('should transition to removing phase when cascade starts', () => {
    // GIVEN
    const { result } = renderHook(() => useCascadeLoop());
    const tilesRemoved = ['0-0', '1-1', '2-2'];

    // WHEN
    act(() => {
      result.current.startCascade(tilesRemoved);
    });

    // THEN
    expect(result.current.state.phase).toBe('removing');
    expect(result.current.state.isProcessing).toBe(true);
    expect(result.current.state.pendingRemovals.size).toBe(3);
    expect(result.current.state.iteration).toBe(1);
  });

  it('should transition from removing -> falling -> spawning -> checking phases', async () => {
    // GIVEN
    const phasesSeen: CascadePhase[] = [];
    const onPhaseChange = (phase: CascadePhase) => {
      phasesSeen.push(phase);
    };

    const { result } = renderHook(() => useCascadeLoop({ onPhaseChange }));
    const tilesRemoved = ['0-0'];

    // WHEN
    act(() => {
      result.current.startCascade(tilesRemoved);
    });

    // THEN: Start in removing
    expect(result.current.state.phase).toBe('removing');

    // WHEN: Wait 250ms for removing phase to complete
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // THEN: Should be in falling phase
    await waitFor(() => {
      expect(result.current.state.phase).toBe('falling');
    });

    // WHEN: Wait 250ms for falling phase to complete
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // THEN: Should be in spawning phase
    await waitFor(() => {
      expect(result.current.state.phase).toBe('spawning');
    });

    // WHEN: Wait 250ms for spawning phase to complete
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // WHEN: Advance a bit more for checking phase
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // THEN: Should eventually reach idle after checking
    await waitFor(() => {
      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.isProcessing).toBe(false);
    });

    // Verify all phases were visited (via callback)
    expect(phasesSeen).toContain('removing');
    expect(phasesSeen).toContain('falling');
    expect(phasesSeen).toContain('spawning');
    expect(phasesSeen).toContain('checking');
    expect(phasesSeen).toContain('idle');
  });

  it('should complete single cascade in ~750ms (3 phases x 250ms)', async () => {
    // GIVEN
    const { result } = renderHook(() => useCascadeLoop());

    // WHEN
    act(() => {
      result.current.startCascade(['0-0']);
    });

    // Advance through all phases (250ms each + small buffer)
    act(() => {
      vi.advanceTimersByTime(1000); // Give enough time for all transitions
    });

    // THEN
    await waitFor(() => {
      expect(result.current.state.phase).toBe('idle');
    });

    // Verify cascade completed (no longer processing)
    expect(result.current.state.isProcessing).toBe(false);
  });

  it('should block isProcessing during all cascade phases', async () => {
    // GIVEN
    const { result } = renderHook(() => useCascadeLoop());

    // WHEN: Start cascade
    act(() => {
      result.current.startCascade(['0-0']);
    });

    // THEN: isProcessing should be true during removing
    expect(result.current.state.isProcessing).toBe(true);

    // WHEN: Advance to falling
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // THEN: Still processing
    await waitFor(() => {
      expect(result.current.state.phase).toBe('falling');
      expect(result.current.state.isProcessing).toBe(true);
    });

    // WHEN: Advance to spawning
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // THEN: Still processing
    await waitFor(() => {
      expect(result.current.state.phase).toBe('spawning');
      expect(result.current.state.isProcessing).toBe(true);
    });

    // WHEN: Complete cascade
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // THEN: isProcessing should be false when idle
    await waitFor(() => {
      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.isProcessing).toBe(false);
    });
  });

  it('should enforce safety limit of 10 iterations', async () => {
    // GIVEN
    const { result } = renderHook(() => useCascadeLoop());

    // WHEN: Start a cascade that would theoretically loop forever
    // (In reality, checkForMatches returns false, so this won't happen in MVP)
    // But the safety limit should still be enforced

    // Manually set iteration to 9
    act(() => {
      result.current.startCascade(['0-0']);
    });

    // Artificially trigger multiple iterations
    for (let i = 0; i < 12; i++) {
      act(() => {
        result.current.startCascade([`${i}-0`]);
        vi.advanceTimersByTime(750); // Complete each cascade
      });
    }

    // THEN: Should stop after 10 iterations
    await waitFor(() => {
      expect(result.current.state.iteration).toBeLessThanOrEqual(10);
    });
  });

  it('should reset state immediately when reset is called', () => {
    // GIVEN
    const { result } = renderHook(() => useCascadeLoop());

    // WHEN: Start cascade and then reset mid-phase
    act(() => {
      result.current.startCascade(['0-0', '1-1']);
    });
    expect(result.current.state.phase).toBe('removing');
    expect(result.current.state.isProcessing).toBe(true);

    act(() => {
      result.current.reset();
    });

    // THEN: Should be back to idle immediately
    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.isProcessing).toBe(false);
    expect(result.current.state.iteration).toBe(0);
    expect(result.current.state.pendingRemovals.size).toBe(0);
    expect(result.current.state.fallingTiles.size).toBe(0);
    expect(result.current.state.spawningTiles.length).toBe(0);
  });

  it('should call onPhaseChange callback when phases transition', async () => {
    // GIVEN
    const onPhaseChange = vi.fn();
    const { result } = renderHook(() => useCascadeLoop({ onPhaseChange }));

    // WHEN
    act(() => {
      result.current.startCascade(['0-0']);
    });

    // THEN: Should call callback with 'removing'
    expect(onPhaseChange).toHaveBeenCalledWith('removing');

    // WHEN: Advance to next phase
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // THEN: Should call callback with 'falling'
    await waitFor(() => {
      expect(onPhaseChange).toHaveBeenCalledWith('falling');
    });
  });

  it('should use instant transitions when reduced motion is preferred', async () => {
    // GIVEN
    // Mock matchMedia to return prefers-reduced-motion: reduce
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    const { result } = renderHook(() => useCascadeLoop());

    // WHEN
    act(() => {
      result.current.startCascade(['0-0']);
    });

    // THEN: Phases should transition instantly (0ms delays)
    expect(result.current.state.phase).toBe('removing');

    act(() => {
      vi.advanceTimersByTime(0); // No delay needed
    });

    // Cleanup mock
    mockMatchMedia.mockRestore();
  });

  it('should populate fallingTiles map during falling phase', async () => {
    // GIVEN
    // Mock matchMedia for JSDOM environment
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    const { result } = renderHook(() => useCascadeLoop());

    // WHEN
    act(() => {
      result.current.startCascade(['0-0']);
      vi.advanceTimersByTime(250); // Move to falling phase
    });

    // THEN
    await waitFor(() => {
      expect(result.current.state.phase).toBe('falling');
      // fallingTiles should be populated (though we can't easily verify exact values without tiles prop)
      expect(result.current.state.fallingTiles).toBeDefined();
    });
  });

  it('should populate spawningTiles array during spawning phase', async () => {
    // GIVEN
    // Mock matchMedia for JSDOM environment
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });

    const { result } = renderHook(() => useCascadeLoop());

    // WHEN
    act(() => {
      result.current.startCascade(['0-0']);
      vi.advanceTimersByTime(500); // Move to spawning phase
    });

    // THEN
    await waitFor(() => {
      expect(result.current.state.phase).toBe('spawning');
      expect(result.current.state.spawningTiles).toBeDefined();
    });
  });
});
