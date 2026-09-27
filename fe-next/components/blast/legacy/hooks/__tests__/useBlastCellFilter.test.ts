/**
 * Tests for blast cell filter logic — determines which tiles are selectable.
 *
 * Board effects:
 * - ice: ALWAYS selectable (meltable — 2-hit crack→melt; no longer locked)
 * - frozen: NOT selectable until thawed (adjacent word clears nearby)
 * - gem: only selectable when path already has 2+ tiles
 * - all others: always selectable
 */
import type { BlastTileState, BlastTileType } from '../../types';
import {
  computeCellFilter,
  computeThawedCells,
  createPortalAdjacency,
} from '../blastCellFilterLogic';

function makeTile(
  row: number, col: number, type: BlastTileType = 'standard',
  overrides: Partial<BlastTileState> = {},
): BlastTileState {
  return {
    row, col, type,
    isCleared: false,
    activationEffect: null,
    hitsRemaining: type === 'ice' || type === 'frozen' ? 2 : type === 'gem' ? 3 : 0,
    uid: `t-${row}-${col}`,
    isThawed: false,
    ...overrides,
  };
}

function makeGrid(size: number, overrides: Record<string, Partial<BlastTileState> & { type: BlastTileType }> = {}): BlastTileState[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => {
      const key = `${r}-${c}`;
      const o = overrides[key];
      if (o) return makeTile(r, c, o.type, o);
      return makeTile(r, c);
    })
  );
}

describe('computeCellFilter', () => {
  describe('ice tiles', () => {
    it('ice is directly selectable (meltable, not locked)', () => {
      const grid = makeGrid(4, {
        '1-1': { type: 'ice' },
      });
      const filter = computeCellFilter(grid, []);
      expect(filter(1, 1)).toBe(true);
    });

    it('ice stays selectable regardless of thaw state', () => {
      const grid = makeGrid(4, {
        '1-1': { type: 'ice', isThawed: true },
      });
      const filter = computeCellFilter(grid, []);
      expect(filter(1, 1)).toBe(true);
    });

    it('allows standard tiles always', () => {
      const grid = makeGrid(4);
      const filter = computeCellFilter(grid, []);
      expect(filter(0, 0)).toBe(true);
      expect(filter(3, 3)).toBe(true);
    });
  });

  describe('frozen tiles', () => {
    it('blocks unthawed frozen tiles', () => {
      const grid = makeGrid(4, {
        '2-2': { type: 'frozen', innerType: 'bomb' },
      });
      const filter = computeCellFilter(grid, []);
      expect(filter(2, 2)).toBe(false);
    });

    it('allows thawed frozen tiles', () => {
      const grid = makeGrid(4, {
        '2-2': { type: 'frozen', isThawed: true, innerType: 'bomb' },
      });
      const filter = computeCellFilter(grid, []);
      expect(filter(2, 2)).toBe(true);
    });
  });

  describe('gem tiles', () => {
    it('blocks gem when current path has fewer than 2 tiles', () => {
      const grid = makeGrid(4, {
        '1-1': { type: 'gem' },
      });
      const filter0 = computeCellFilter(grid, []);
      expect(filter0(1, 1)).toBe(false);

      const filter1 = computeCellFilter(grid, [{ row: 0, col: 0 }]);
      expect(filter1(1, 1)).toBe(false);
    });

    it('allows gem when current path has 2+ tiles', () => {
      const grid = makeGrid(4, {
        '1-1': { type: 'gem' },
      });
      const filter = computeCellFilter(grid, [{ row: 0, col: 0 }, { row: 0, col: 1 }]);
      expect(filter(1, 1)).toBe(true);
    });
  });

  describe('other special tiles', () => {
    const alwaysSelectableTypes: BlastTileType[] = [
      'standard', 'gold', 'diamond', 'bomb',
      'lightning', 'prism', 'rainbow', 'magnet',
    ];

    it.each(alwaysSelectableTypes)('%s tiles are always selectable', (type) => {
      const grid = makeGrid(4, { '1-1': { type } });
      const filter = computeCellFilter(grid, []);
      expect(filter(1, 1)).toBe(true);
    });
  });

  it('allows cleared tiles (invisible, handled elsewhere)', () => {
    const grid = makeGrid(4, {
      '1-1': { type: 'ice', isCleared: true },
    });
    const filter = computeCellFilter(grid, []);
    // Cleared tiles aren't on the board — selection won't reach them
    // but the filter itself shouldn't crash
    expect(filter(1, 1)).toBe(true);
  });
});

describe('computeThawedCells', () => {
  it('does NOT thaw ice — ice is directly selectable, not lockable', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'ice' },  // adjacent to the path but ice no longer thaws
    });
    const path = [{ row: 0, col: 1 }, { row: 0, col: 2 }];
    const thawed = computeThawedCells(grid, path);
    expect(thawed).not.toContainEqual({ row: 0, col: 0 });
  });

  it('thaws frozen tiles adjacent to any cell in the submitted word path', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'frozen' },  // adjacent to (0,1) and (1,0) and (1,1)
      '2-2': { type: 'frozen' },  // NOT adjacent to path
    });

    const path = [{ row: 0, col: 1 }, { row: 0, col: 2 }];
    const thawed = computeThawedCells(grid, path);

    expect(thawed).toContainEqual({ row: 0, col: 0 });
    expect(thawed).not.toContainEqual({ row: 2, col: 2 });
  });

  it('thaws frozen tiles adjacent to path', () => {
    const grid = makeGrid(4, {
      '1-0': { type: 'frozen', innerType: 'lightning' },
    });

    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const thawed = computeThawedCells(grid, path);

    expect(thawed).toContainEqual({ row: 1, col: 0 });
  });

  it('does not thaw tiles that are already thawed', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'frozen', isThawed: true },
    });

    const path = [{ row: 0, col: 1 }];
    const thawed = computeThawedCells(grid, path);

    expect(thawed).not.toContainEqual({ row: 0, col: 0 });
  });

  it('does not thaw already-cleared tiles', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'frozen', isCleared: true },
    });

    const path = [{ row: 0, col: 1 }];
    const thawed = computeThawedCells(grid, path);

    expect(thawed).not.toContainEqual({ row: 0, col: 0 });
  });

  it('returns empty array when no ice/frozen tiles are adjacent', () => {
    const grid = makeGrid(4);
    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const thawed = computeThawedCells(grid, path);

    expect(thawed).toHaveLength(0);
  });

  it('handles edge/corner cells correctly', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'frozen' },  // corner — adjacent to (0,1), (1,0), (1,1)
    });

    // Path at (1,1) — diagonally adjacent to (0,0)
    const path = [{ row: 1, col: 1 }];
    const thawed = computeThawedCells(grid, path);

    expect(thawed).toContainEqual({ row: 0, col: 0 });
  });

  it('does not duplicate thawed cells when multiple path tiles are adjacent', () => {
    const grid = makeGrid(4, {
      '1-1': { type: 'frozen' },  // adjacent to both (0,0) and (0,1)
    });

    const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];
    const thawed = computeThawedCells(grid, path);

    const matches = thawed.filter(c => c.row === 1 && c.col === 1);
    expect(matches).toHaveLength(1);
  });
});

describe('createPortalAdjacency', () => {
  it('returns standard adjacency when no portals exist', () => {
    const grid = makeGrid(4);
    const isAdj = createPortalAdjacency(grid);

    // (0,0) and (0,1) are geometrically adjacent
    expect(isAdj({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    // (0,0) and (2,2) are NOT adjacent
    expect(isAdj({ row: 0, col: 0 }, { row: 2, col: 2 })).toBe(false);
  });

  it('treats cells adjacent to a portal partner as reachable from the portal', () => {
    // Portal A at (0,0), Portal B at (3,3) — paired together
    const grid = makeGrid(4, {
      '0-0': { type: 'portal', portalPairId: 'portal-0' },
      '3-3': { type: 'portal', portalPairId: 'portal-0' },
    });
    const isAdj = createPortalAdjacency(grid);

    // From portal A (0,0), cell (3,2) is adjacent to partner B (3,3) — should teleport
    expect(isAdj({ row: 0, col: 0 }, { row: 3, col: 2 })).toBe(true);
    // From portal A (0,0), cell (2,3) is adjacent to partner B (3,3) — should teleport
    expect(isAdj({ row: 0, col: 0 }, { row: 2, col: 3 })).toBe(true);
    // From portal B (3,3), cell (0,1) is adjacent to partner A (0,0) — should teleport
    expect(isAdj({ row: 3, col: 3 }, { row: 0, col: 1 })).toBe(true);
  });

  it('does not teleport to cells NOT adjacent to portal partner', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'portal', portalPairId: 'portal-0' },
      '3-3': { type: 'portal', portalPairId: 'portal-0' },
    });
    const isAdj = createPortalAdjacency(grid);

    // (0,0) → (1,3) is NOT adjacent to either portal geometrically or via partner
    expect(isAdj({ row: 0, col: 0 }, { row: 1, col: 3 })).toBe(false);
  });

  it('does not allow teleporting to the partner portal cell itself', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'portal', portalPairId: 'portal-0' },
      '3-3': { type: 'portal', portalPairId: 'portal-0' },
    });
    const isAdj = createPortalAdjacency(grid);

    // Moving from portal A directly to portal B — blocked (you teleport THROUGH, not TO)
    expect(isAdj({ row: 0, col: 0 }, { row: 3, col: 3 })).toBe(false);
  });

  it('works with multiple portal pairs independently', () => {
    const grid = makeGrid(5, {
      '0-0': { type: 'portal', portalPairId: 'portal-0' },
      '4-4': { type: 'portal', portalPairId: 'portal-0' },
      '0-4': { type: 'portal', portalPairId: 'portal-1' },
      '4-0': { type: 'portal', portalPairId: 'portal-1' },
    });
    const isAdj = createPortalAdjacency(grid);

    // Pair 0: (0,0) → neighbors of (4,4)
    expect(isAdj({ row: 0, col: 0 }, { row: 3, col: 4 })).toBe(true);
    // Pair 1: (0,4) → neighbors of (4,0)
    expect(isAdj({ row: 0, col: 4 }, { row: 3, col: 0 })).toBe(true);
    // Cross-pair: (0,0) should NOT reach neighbors of (4,0)
    expect(isAdj({ row: 0, col: 0 }, { row: 3, col: 0 })).toBe(false);
  });

  it('ignores cleared portal tiles', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'portal', portalPairId: 'portal-0' },
      '3-3': { type: 'portal', portalPairId: 'portal-0', isCleared: true },
    });
    const isAdj = createPortalAdjacency(grid);

    // Partner is cleared — no teleportation
    expect(isAdj({ row: 0, col: 0 }, { row: 3, col: 2 })).toBe(false);
  });

  it('still allows standard adjacency for portal tiles', () => {
    const grid = makeGrid(4, {
      '0-0': { type: 'portal', portalPairId: 'portal-0' },
      '3-3': { type: 'portal', portalPairId: 'portal-0' },
    });
    const isAdj = createPortalAdjacency(grid);

    // (0,0) → (0,1) is standard adjacent — still works
    expect(isAdj({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    // (0,0) → (1,1) is standard diagonal — still works
    expect(isAdj({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(true);
  });
});
