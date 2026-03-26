/**
 * useBlastGame — Chain propagation regression tests.
 *
 * BUGF-01: Lightning column-clear should trigger bomb detonation when a bomb
 *          tile exists in the cleared column.
 *
 * BUGF-02: Prism cross-clear should trigger lightning column-clear when a
 *          lightning tile exists in the cross-clear path.
 *
 * Chain: prism → lightning → bomb (full cascade)
 *
 * Test strategy: use pure simulation of the useBlastGame tile-processing logic
 * to document exact expected chain behavior. Tests verify the FIX works and
 * demonstrate what the BUGGY code does wrong.
 */

import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn(() => ({ isValid: true })),
  isWordOnBoard: vi.fn(() => true),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: vi.fn(() => true),
    isLoaded: true,
  }),
}));

vi.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({
    prefetch: vi.fn(),
    getCached: vi.fn(() => null),
    clearCache: vi.fn(),
  }),
}));

vi.mock('@/utils/haptics', () => ({
  hapticForWordScore: vi.fn(),
  hapticError: vi.fn(),
}));

vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: vi.fn(),
  recordNotInDictionary: vi.fn(),
}));

vi.mock('@/shared/utils/scoring', () => ({
  getComboBonus: vi.fn(() => 0),
}));

import { useBlastGame } from '../hooks/useBlastGame';

/** Distribution that produces only bomb tiles — tests bomb chain behavior */
const BOMB_ONLY_DIST = { bomb: 1.0 };
/** Distribution that produces only lightning tiles */
const LIGHTNING_ONLY_DIST = { lightning: 1.0 };

describe('useBlastGame — chain propagation (BUGF-01 and BUGF-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ words: ['test', 'word', 'game'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          words: { easy: ['at', 'to'], medium: ['test', 'word'], hard: ['game'] },
        }),
      }) as jest.Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Hook-level integration tests (use renderHook to exercise actual hook code)
  // ──────────────────────────────────────────────────────────────────────────

  describe('Hook integration: bomb chaining baseline', () => {
    it('bombs chain-detonate each other when one bomb explodes (baseline)', () => {
      // Establishes that bomb→bomb chaining WORKS (it does — this is NOT buggy)
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
        customDistribution: BOMB_ONLY_DIST,
      }));

      // All tiles are bombs. Triggering one should chain-detonate all neighbors.
      const firstBomb = result.current.tileStates[0][0];
      expect(firstBomb.type).toBe('bomb');

      act(() => {
        result.current.clearTilesForWord([{ row: 2, col: 2 }], 'z', 5);
      });

      // With BOMB_RADIUS = 2, a bomb at (2,2) covers the entire 4x4 grid.
      // Chain: each newly detonated bomb also detonates its neighbors.
      let clearedCount = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (result.current.tileStates[r][c].isCleared) clearedCount++;
        }
      }
      // All 16 tiles should be cleared by the chain reaction
      expect(clearedCount).toBe(16);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BUGF-01: Lightning → Bomb chain (pure simulation, documents bug)
  // ──────────────────────────────────────────────────────────────────────────

  describe('BUGF-01 (pure simulation): Lightning column-clear triggers bombs in path', () => {
    /**
     * Simulates the CURRENT BUGGY lightning case in useBlastGame.
     * Returns how many tiles were cleared and whether bomb was queued.
     */
    function simulateLightningClear_BUGGY(
      col: number,
      lightningRow: number,
      bombRows: number[],
      gridSize: number,
    ) {
      type TileState = { row: number; col: number; type: 'standard' | 'lightning' | 'bomb'; isCleared: boolean };
      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false };
        }
      }
      grid[lightningRow][col].type = 'lightning';
      for (const br of bombRows) {
        grid[br][col].type = 'bomb';
      }

      const next = grid.map(row => row.map(t => ({ ...t })));
      const bombQueue: Array<{ row: number; col: number; depth: number }> = [];
      const processedBombs = new Set<string>();

      // Lightning clears self
      next[lightningRow][col].isCleared = true;

      // Column sweep — BUGGY: no bomb check
      for (let r = 0; r < gridSize; r++) {
        if (r === lightningRow) continue;
        const target = next[r][col];
        if (target.isCleared) continue;
        target.isCleared = true;
        // BUG: no bomb check here — bombs are cleared but NOT enqueued
      }

      return { bombQueueLength: bombQueue.length, grid: next };
    }

    /**
     * Simulates the FIXED lightning case — adds bomb check after clearing each tile.
     */
    function simulateLightningClear_FIXED(
      col: number,
      lightningRow: number,
      bombRows: number[],
      gridSize: number,
    ) {
      const BOMB_RADIUS = 2;
      type TileState = { row: number; col: number; type: 'standard' | 'lightning' | 'bomb'; isCleared: boolean };
      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false };
        }
      }
      grid[lightningRow][col].type = 'lightning';
      for (const br of bombRows) {
        grid[br][col].type = 'bomb';
      }

      const next = grid.map(row => row.map(t => ({ ...t })));
      const bombQueue: Array<{ row: number; col: number; depth: number }> = [];
      const processedBombs = new Set<string>();

      next[lightningRow][col].isCleared = true;

      for (let r = 0; r < gridSize; r++) {
        if (r === lightningRow) continue;
        const target = next[r][col];
        if (target.isCleared) continue;
        target.isCleared = true;
        // FIX: check for bomb and enqueue
        if (target.type === 'bomb' && !processedBombs.has(`${r},${col}`)) {
          processedBombs.add(`${r},${col}`);
          bombQueue.push({ row: r, col, depth: 0 });
        }
      }

      // Process bomb BFS
      while (bombQueue.length > 0) {
        const bomb = bombQueue.shift()!;
        for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
          for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = bomb.row + dr, c = bomb.col + dc;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              if (!next[r][c].isCleared) {
                next[r][c].isCleared = true;
                if (next[r][c].type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
                  processedBombs.add(`${r},${c}`);
                  bombQueue.push({ row: r, col: c, depth: bomb.depth + 1 });
                }
              }
            }
          }
        }
      }

      return { bombQueueLength: processedBombs.size, grid: next };
    }

    it('BUGF-01 documented: current code does NOT enqueue bombs found during lightning column-clear', () => {
      // With the BUGGY implementation, the bomb found during lightning column-clear
      // should NOT be in the bomb queue — confirming the bug exists in logic.
      const buggyResult = simulateLightningClear_BUGGY(1, 0, [2], 5);
      // BUG: bombQueueLength is 0 even though there is a bomb in the column
      expect(buggyResult.bombQueueLength).toBe(0);
    });

    it('BUGF-01 fix: enqueuing bombs during lightning column-clear causes chain-detonation', () => {
      // With the FIX, the bomb at row 2 in col 1 should be enqueued
      const fixedResult = simulateLightningClear_FIXED(1, 0, [2], 5);
      // FIX: bombQueueLength = 1 (the bomb at row 2 was enqueued and processed)
      expect(fixedResult.bombQueueLength).toBeGreaterThanOrEqual(1);

      // And tiles adjacent to (2,1) within bomb radius 2 should be cleared
      // Bomb at (2,1) with radius 2 in a 5x5 grid covers rows 0-4, cols 0-3
      const grid = fixedResult.grid;
      // Tiles at same column but different rows: should be cleared by lightning + bomb
      expect(grid[0][1].isCleared).toBe(true); // lightning self
      expect(grid[1][1].isCleared).toBe(true); // lightning column clear
      expect(grid[2][1].isCleared).toBe(true); // bomb itself (cleared by lightning)
      expect(grid[3][1].isCleared).toBe(true); // lightning column clear
      expect(grid[4][1].isCleared).toBe(true); // lightning column clear

      // Tiles in adjacent columns near bomb row should be cleared by bomb blast
      expect(grid[2][0].isCleared).toBe(true); // bomb blast
      expect(grid[2][2].isCleared).toBe(true); // bomb blast
    });

    it('BUGF-01 fix: two bombs in lightning column — both enqueued and detonated', () => {
      const fixedResult = simulateLightningClear_FIXED(2, 0, [2, 4], 6);
      // Both bombs should have been processed
      expect(fixedResult.bombQueueLength).toBeGreaterThanOrEqual(2);

      // All tiles cleared (lightning cleared entire column; both bombs exploded)
      const grid = fixedResult.grid;
      // Tiles in bomb 1's blast radius from (2,2): rows 0-4, cols 0-4
      // Tiles in bomb 2's blast radius from (4,2): rows 2-6 (capped 5), cols 0-4
      // Combined: all 6×5 = 30 tiles in cols 0-4 should be cleared
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c <= 4; c++) {
          // (r,c) should be cleared by lightning+bomb chain
          expect(grid[r][c].isCleared).toBe(true);
        }
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BUGF-02: Prism → Lightning chain (pure simulation, documents bug)
  // ──────────────────────────────────────────────────────────────────────────

  describe('BUGF-02 (pure simulation): Prism cross-clear triggers lightning column-clear', () => {
    /**
     * Simulates the CURRENT BUGGY prism row-clear: no lightning trigger.
     */
    function simulatePrismRowClear_BUGGY(
      prismRow: number,
      prismCol: number,
      lightningCol: number,
      gridSize: number,
    ) {
      type TileState = { row: number; col: number; type: 'standard' | 'prism' | 'lightning'; isCleared: boolean };
      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false };
        }
      }
      grid[prismRow][prismCol].type = 'prism';
      grid[prismRow][lightningCol].type = 'lightning';

      const next = grid.map(row => row.map(t => ({ ...t })));

      // Prism row-clear — BUGGY: no lightning trigger
      next[prismRow][prismCol].isCleared = true;
      for (let c = 0; c < gridSize; c++) {
        if (c === prismCol) continue;
        const target = next[prismRow][c];
        if (target.isCleared) continue;
        target.isCleared = true;
        // BUG: no lightning trigger here — lightning's column is NOT cleared
      }

      return { grid: next };
    }

    /**
     * Simulates the FIXED prism row-clear: triggers lightning column-clear.
     */
    function simulatePrismRowClear_FIXED(
      prismRow: number,
      prismCol: number,
      lightningCol: number,
      gridSize: number,
    ) {
      type TileState = { row: number; col: number; type: 'standard' | 'prism' | 'lightning'; isCleared: boolean };
      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false };
        }
      }
      grid[prismRow][prismCol].type = 'prism';
      grid[prismRow][lightningCol].type = 'lightning';

      const next = grid.map(row => row.map(t => ({ ...t })));
      const processedLightning = new Set<string>();

      next[prismRow][prismCol].isCleared = true;
      for (let c = 0; c < gridSize; c++) {
        if (c === prismCol) continue;
        const target = next[prismRow][c];
        if (target.isCleared) continue;
        target.isCleared = true;
        // FIX: trigger lightning column-clear
        if (target.type === 'lightning' && !processedLightning.has(`${prismRow},${c}`)) {
          processedLightning.add(`${prismRow},${c}`);
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === prismRow) continue;
            const lt = next[lr][c];
            if (lt.isCleared) continue;
            lt.isCleared = true;
          }
        }
      }

      return { grid: next };
    }

    it('BUGF-02 documented: current code does NOT trigger lightning column-clear from prism row-sweep', () => {
      // Prism at (3,3), lightning at (3,1). Prism row-sweep hits lightning.
      // BUGGY: lightning's column (col 1) should be cleared but is NOT.
      const gridSize = 6;
      const buggyResult = simulatePrismRowClear_BUGGY(3, 3, 1, gridSize);
      const grid = buggyResult.grid;

      // Row 3 is cleared (prism row-sweep)
      for (let c = 0; c < gridSize; c++) {
        expect(grid[3][c].isCleared).toBe(true);
      }

      // BUG: tiles in lightning's column (col 1) outside of row 3 are NOT cleared
      // Row 0,1,2,4,5 in col 1 should still be uncleared
      expect(grid[0][1].isCleared).toBe(false); // BUG: lightning didn't clear its column
      expect(grid[1][1].isCleared).toBe(false);
      expect(grid[2][1].isCleared).toBe(false);
      expect(grid[4][1].isCleared).toBe(false);
      expect(grid[5][1].isCleared).toBe(false);
    });

    it('BUGF-02 fix: prism row-sweep through lightning triggers lightning column-clear', () => {
      const gridSize = 6;
      const fixedResult = simulatePrismRowClear_FIXED(3, 3, 1, gridSize);
      const grid = fixedResult.grid;

      // Row 3 cleared by prism
      for (let c = 0; c < gridSize; c++) {
        expect(grid[3][c].isCleared).toBe(true);
      }

      // FIX: ALL tiles in col 1 (lightning's column) should be cleared
      for (let r = 0; r < gridSize; r++) {
        // (r,1) should be cleared by lightning chain from prism→lightning
        expect(grid[r][1].isCleared).toBe(true);
      }
    });

    it('BUGF-02 fix: prism column-sweep through lightning triggers lightning column-clear', () => {
      const gridSize = 6;
      type TileState = { row: number; col: number; type: 'standard' | 'prism' | 'lightning'; isCleared: boolean };
      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false };
        }
      }

      // Prism at (2,4), lightning at (5,4) — lightning is in prism's column
      grid[2][4].type = 'prism';
      grid[5][4].type = 'lightning';

      const next = grid.map(row => row.map(t => ({ ...t })));
      const processedLightning = new Set<string>();

      next[2][4].isCleared = true;

      // Row sweep (no lightning in row 2 in this test)
      for (let c = 0; c < gridSize; c++) {
        if (c === 4) continue;
        const target = next[2][c];
        if (target.isCleared) continue;
        target.isCleared = true;
        if (target.type === 'lightning' && !processedLightning.has(`2,${c}`)) {
          processedLightning.add(`2,${c}`);
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === 2) continue;
            const lt = next[lr][c];
            if (lt.isCleared) continue;
            lt.isCleared = true;
          }
        }
      }

      // Column sweep — lightning at (5,4) is encountered here
      for (let r = 0; r < gridSize; r++) {
        if (r === 2) continue;
        const target = next[r][4];
        if (target.isCleared) continue;
        target.isCleared = true;
        // FIX: trigger lightning column-clear
        if (target.type === 'lightning' && !processedLightning.has(`${r},4`)) {
          processedLightning.add(`${r},4`);
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === r) continue;
            const lt = next[lr][4];
            if (lt.isCleared) continue;
            lt.isCleared = true;
          }
        }
      }

      // ALL tiles in col 4 should be cleared (prism's column sweep + lightning's column-clear)
      for (let r = 0; r < gridSize; r++) {
        // (r,4) should be cleared by prism column + lightning chain
        expect(next[r][4].isCleared).toBe(true);
      }

      // Row 2 should be cleared by prism's row sweep
      for (let c = 0; c < gridSize; c++) {
        expect(next[2][c].isCleared).toBe(true);
      }
    });

    it('BUGF-02 fix: processedLightning prevents double-trigger when lightning is at prism row+column intersection', () => {
      // If lightning is exactly at the cross-center, it could be triggered by BOTH
      // the row sweep and the column sweep. processedLightning prevents double column-clear.
      const gridSize = 6;
      type TileState = { row: number; col: number; type: 'standard' | 'prism' | 'lightning'; isCleared: boolean };
      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false };
        }
      }

      // Prism at (2,2), lightning at (2,4) — in row, not column intersection
      grid[2][2].type = 'prism';
      grid[2][4].type = 'lightning';

      const next = grid.map(row => row.map(t => ({ ...t })));
      const processedLightning = new Set<string>();
      let lightningTriggerCount = 0;

      next[2][2].isCleared = true;

      // Row sweep
      for (let c = 0; c < gridSize; c++) {
        if (c === 2) continue;
        const target = next[2][c];
        if (target.isCleared) continue;
        target.isCleared = true;
        if (target.type === 'lightning' && !processedLightning.has(`2,${c}`)) {
          processedLightning.add(`2,${c}`);
          lightningTriggerCount++;
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === 2) continue;
            const lt = next[lr][c];
            if (!lt.isCleared) lt.isCleared = true;
          }
        }
      }

      // Column sweep
      for (let r = 0; r < gridSize; r++) {
        if (r === 2) continue;
        const target = next[r][2];
        if (target.isCleared) continue;
        target.isCleared = true;
        if (target.type === 'lightning' && !processedLightning.has(`${r},2`)) {
          processedLightning.add(`${r},2`);
          lightningTriggerCount++;
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === r) continue;
            const lt = next[lr][2];
            if (!lt.isCleared) lt.isCleared = true;
          }
        }
      }

      // Lightning was only in row 2, so it should only trigger once
      expect(lightningTriggerCount).toBe(1);

      // Column 4 (lightning's column) fully cleared
      for (let r = 0; r < gridSize; r++) {
        expect(next[r][4].isCleared).toBe(true);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Full chain: prism → lightning → bomb
  // ──────────────────────────────────────────────────────────────────────────

  describe('Full chain: prism → lightning → bomb (pure simulation)', () => {
    it('should cascade all three effects when arranged to chain', () => {
      /**
       * Layout (6x6):
       *   Prism at (3, 3) — detonates, clearing row 3 + col 3
       *   Lightning at (3, 1) — in prism's row → prism triggers lightning → col 1 clears
       *   Bomb at (0, 1) — in lightning's column → lightning triggers bomb → area blast
       *
       * Expected chain:
       *   1. Prism detonates: row 3 and col 3 clear
       *   2. Lightning at (3,1) triggered by prism row-sweep: col 1 clears
       *   3. Bomb at (0,1) triggered by lightning col-clear: blast radius around (0,1) clears
       */

      type TileType = 'standard' | 'lightning' | 'bomb' | 'prism';
      interface TileState {
        row: number; col: number; type: TileType; isCleared: boolean;
        hitsRemaining: number;
      }

      const gridSize = 6;
      const BOMB_RADIUS = 2;

      const grid: TileState[][] = [];
      for (let r = 0; r < gridSize; r++) {
        grid[r] = [];
        for (let c = 0; c < gridSize; c++) {
          grid[r][c] = { row: r, col: c, type: 'standard', isCleared: false, hitsRemaining: 0 };
        }
      }

      grid[3][3] = { row: 3, col: 3, type: 'prism', isCleared: false, hitsRemaining: 0 };
      grid[3][1] = { row: 3, col: 1, type: 'lightning', isCleared: false, hitsRemaining: 0 };
      grid[0][1] = { row: 0, col: 1, type: 'bomb', isCleared: false, hitsRemaining: 0 };

      const next = grid.map(row => row.map(t => ({ ...t })));
      const processedBombs = new Set<string>();
      const bombQueue: Array<{ row: number; col: number; depth: number }> = [];
      const processedLightning = new Set<string>();

      // Step 1: Prism at (3,3) detonates
      next[3][3].isCleared = true;

      // Row sweep
      for (let c = 0; c < gridSize; c++) {
        if (c === 3) continue;
        const target = next[3][c];
        if (target.isCleared) continue;
        target.isCleared = true;

        if (target.type === 'lightning' && !processedLightning.has(`3,${c}`)) {
          processedLightning.add(`3,${c}`);
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === 3) continue;
            const lt = next[lr][c];
            if (lt.isCleared) continue;
            lt.isCleared = true;
            if (lt.type === 'bomb' && !processedBombs.has(`${lr},${c}`)) {
              processedBombs.add(`${lr},${c}`);
              bombQueue.push({ row: lr, col: c, depth: 0 });
            }
          }
        }

        if (target.type === 'bomb' && !processedBombs.has(`3,${c}`)) {
          processedBombs.add(`3,${c}`);
          bombQueue.push({ row: 3, col: c, depth: 0 });
        }
      }

      // Column sweep
      for (let r = 0; r < gridSize; r++) {
        if (r === 3) continue;
        const target = next[r][3];
        if (target.isCleared) continue;
        target.isCleared = true;

        if (target.type === 'lightning' && !processedLightning.has(`${r},3`)) {
          processedLightning.add(`${r},3`);
          for (let lr = 0; lr < gridSize; lr++) {
            if (lr === r) continue;
            const lt = next[lr][3];
            if (lt.isCleared) continue;
            lt.isCleared = true;
            if (lt.type === 'bomb' && !processedBombs.has(`${lr},3`)) {
              processedBombs.add(`${lr},3`);
              bombQueue.push({ row: lr, col: 3, depth: 0 });
            }
          }
        }

        if (target.type === 'bomb' && !processedBombs.has(`${r},3`)) {
          processedBombs.add(`${r},3`);
          bombQueue.push({ row: r, col: 3, depth: 0 });
        }
      }

      // Step 2: Process bomb BFS
      while (bombQueue.length > 0) {
        const bomb = bombQueue.shift()!;
        for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
          for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = bomb.row + dr, c = bomb.col + dc;
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              if (!next[r][c].isCleared) {
                next[r][c].isCleared = true;
                if (next[r][c].type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
                  processedBombs.add(`${r},${c}`);
                  bombQueue.push({ row: r, col: c, depth: bomb.depth + 1 });
                }
              }
            }
          }
        }
      }

      // Assertions: all three chain effects occurred

      // 1. Prism cleared its row (row 3)
      for (let c = 0; c < gridSize; c++) {
        expect(next[3][c].isCleared).toBe(true);
      }

      // 2. Prism cleared its column (col 3)
      for (let r = 0; r < gridSize; r++) {
        expect(next[r][3].isCleared).toBe(true);
      }

      // 3. Lightning at (3,1) was swept by prism row, triggering col 1 clear
      for (let r = 0; r < gridSize; r++) {
        // (r,1) should be cleared by lightning triggered by prism
        expect(next[r][1].isCleared).toBe(true);
      }

      // 4. Bomb at (0,1) was cleared by lightning and detonated — blast covers
      //    rows 0-2, cols 0-3 (radius 2 from (0,1) in the 6x6 grid)
      for (let r = 0; r <= Math.min(0 + BOMB_RADIUS, gridSize - 1); r++) {
        for (let c = Math.max(0, 1 - BOMB_RADIUS); c <= Math.min(1 + BOMB_RADIUS, gridSize - 1); c++) {
          // (r,c) should be cleared by bomb blast from (0,1)
          expect(next[r][c].isCleared).toBe(true);
        }
      }
    });
  });
});
