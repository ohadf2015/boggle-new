/**
 * useBlastGame - Core blast mode hook tests
 *
 * Tests tile state management, special tile effects, word clearing,
 * win detection, and dead-end detection.
 */

import { renderHook, act } from '@testing-library/react';

// Mock dependencies before importing the hook
jest.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: jest.fn(() => ({ isValid: true })),
  isWordOnBoard: jest.fn(() => true),
}));

jest.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: jest.fn(() => true),
    isLoaded: true,
  }),
}));

jest.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({
    prefetch: jest.fn(),
    getCached: jest.fn(() => null),
    clearCache: jest.fn(),
  }),
}));

jest.mock('@/utils/haptics', () => ({
  hapticForWordScore: jest.fn(),
  hapticError: jest.fn(),
}));

jest.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: jest.fn(),
  recordNotInDictionary: jest.fn(),
}));

jest.mock('@/shared/utils/scoring', () => ({
  getComboBonus: jest.fn(() => 0),
}));

import { useBlastGame } from '../hooks/useBlastGame';
import {
  GOLD_MULTIPLIER,
  BOMB_RADIUS,
  RAINBOW_BONUS,
  type BlastGameConfig,
} from '../types';

const defaultConfig: BlastGameConfig = {
  gridSize: 4,
  specialTileChance: 0,
  language: 'en',
};

describe('useBlastGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for grid init (themed words + solve grid)
    global.fetch = jest.fn()
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
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize tile state grid with correct dimensions', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      expect(result.current.tileStates).toHaveLength(4);
      expect(result.current.tileStates[0]).toHaveLength(4);
    });

    it('should start with all tiles uncleared', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      const clearedCount = result.current.tileStates
        .flat()
        .filter(t => t.isCleared).length;
      expect(clearedCount).toBe(0);
    });

    it('should set totalTiles to gridSize^2', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      expect(result.current.gameState.totalTiles).toBe(16);
    });

    it('should start with score 0 and no words found', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.wordsFound).toHaveLength(0);
    });
  });

  describe('special tile placement', () => {
    it('should place no special tiles when specialTileChance is 0', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 0,
      }));

      const specialCount = result.current.tileStates
        .flat()
        .filter(t => t.type !== 'standard').length;
      expect(specialCount).toBe(0);
    });

    it('should place special tiles when specialTileChance is 1', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      const specialCount = result.current.tileStates
        .flat()
        .filter(t => t.type !== 'standard').length;
      expect(specialCount).toBe(16);
    });
  });

  describe('tile clearing', () => {
    it('should clear tiles along a word path', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      const path = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ];

      act(() => {
        result.current.clearTilesForWord(path, 'test', 5);
      });

      expect(result.current.tileStates[0][0].isCleared).toBe(true);
      expect(result.current.tileStates[0][1].isCleared).toBe(true);
      expect(result.current.tileStates[0][2].isCleared).toBe(true);
      // Other tiles remain uncleared
      expect(result.current.tileStates[1][0].isCleared).toBe(false);
    });

    it('should update tilesCleared count', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          2
        );
      });

      expect(result.current.gameState.tilesCleared).toBe(2);
    });

    it('should add word to wordsFound', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          2
        );
      });

      expect(result.current.gameState.wordsFound).toContain('at');
    });

    it('should add score', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          5
        );
      });

      expect(result.current.gameState.score).toBe(5);
    });
  });

  describe('special tile effects', () => {
    it('should apply gold multiplier when clearing gold tiles', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1, // All tiles are special
      }));

      // Find a gold tile
      const goldTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'gold');

      if (goldTile) {
        const path = [{ row: goldTile.row, col: goldTile.col }];
        act(() => {
          result.current.clearTilesForWord(path, 'a', 5);
        });

        // Score should be multiplied by GOLD_MULTIPLIER
        expect(result.current.gameState.score).toBe(5 * GOLD_MULTIPLIER);
      }
    });

    it('should clear adjacent tiles when clearing bomb tile', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      // Find a bomb tile not on the edge (so all 8 neighbors exist)
      const bombTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'bomb' && t.row > 0 && t.row < 3 && t.col > 0 && t.col < 3);

      if (bombTile) {
        const path = [{ row: bombTile.row, col: bombTile.col }];
        act(() => {
          result.current.clearTilesForWord(path, 'b', 5);
        });

        // Check the bomb tile itself is cleared
        expect(result.current.tileStates[bombTile.row][bombTile.col].isCleared).toBe(true);

        // Check adjacent tiles are cleared or hit (ice tiles only crack on first hit)
        for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
          for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
            const r = bombTile.row + dr;
            const c = bombTile.col + dc;
            if (r >= 0 && r < 4 && c >= 0 && c < 4) {
              const adj = result.current.tileStates[r][c];
              // Ice tiles may only be cracked (hitsRemaining decreased) instead of cleared
              if (adj.type === 'ice' && !adj.isCleared) {
                expect(adj.hitsRemaining).toBeLessThan(2);
              } else {
                expect(adj.isCleared).toBe(true);
              }
            }
          }
        }
      }
    });

    it('should add rainbow bonus when clearing rainbow tile', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      const rainbowTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'rainbow');

      if (rainbowTile) {
        const path = [{ row: rainbowTile.row, col: rainbowTile.col }];
        act(() => {
          result.current.clearTilesForWord(path, 'r', 5);
        });

        expect(result.current.gameState.score).toBe(5 + RAINBOW_BONUS);
      }
    });
  });

  describe('game completion', () => {
    it('should auto-complete when tilesCleared reaches totalTiles', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 2,
        specialTileChance: 0,
        language: 'en',
      }));

      // Clear all 4 tiles — tilesCleared (cumulative) reaches totalTiles (4)
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
          'test',
          10
        );
      });

      // Auto-completes when cumulative tilesCleared >= totalTiles
      expect(result.current.gameState.isComplete).toBe(true);
    });

    it('should not auto-complete when tilesCleared is below totalTiles', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 2,
        specialTileChance: 0,
        language: 'en',
      }));

      // Clear only 2 of 4 tiles
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          5
        );
      });

      expect(result.current.gameState.isComplete).toBe(false);
    });

    it('should not be complete when tiles remain', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }],
          'a',
          1
        );
      });

      expect(result.current.gameState.isComplete).toBe(false);
    });
  });

  describe('modified grid for GridComponent', () => {
    it('should return grid with cleared cells as empty strings', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      // Wait for grid to be generated
      if (result.current.modifiedGrid) {

        act(() => {
          result.current.clearTilesForWord(
            [{ row: 0, col: 0 }],
            'a',
            1
          );
        });

        expect(result.current.modifiedGrid![0][0]).toBe('');
        // Other cells remain
        expect(result.current.modifiedGrid![1][1]).not.toBe('');
      }
    });
  });

  describe('results generation', () => {
    it('should generate correct results data', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          5
        );
      });

      const resultsData = result.current.getResultsData(3);

      expect(resultsData.finalScore).toBe(5);
      expect(resultsData.tilesCleared).toBe(2);
      expect(resultsData.totalTiles).toBe(16);
      expect(resultsData.wordsFound).toContain('at');
    });

    it('should calculate star rating based on clear percentage', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 2,
        specialTileChance: 0,
        language: 'en',
      }));

      // Clear all tiles for 3 stars
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
          'test',
          10
        );
      });

      const results = result.current.getResultsData(5);
      expect(results.stars).toBe(3);
      expect(results.clearPercentage).toBe(100);
    });
  });

  describe('cascade tilesCleared persistence', () => {
    it('should NOT reset tilesCleared to 0 after cascade completes', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      // Clear 3 tiles
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
          'cat',
          5
        );
      });

      // tilesCleared should be 3 after clearing
      expect(result.current.gameState.tilesCleared).toBe(3);

      // Advance past cascade delay (200ms) + clearing (300ms) + falling (400ms) + appearing (300ms)
      act(() => {
        jest.advanceTimersByTime(1200);
      });

      // After cascade completes, tilesCleared should still be 3 (cumulative metric)
      expect(result.current.gameState.tilesCleared).toBe(3);

      jest.useRealTimers();
    });

    it('should count only newly-cleared tiles per word, not all cleared tiles', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      // Clear first word (2 tiles)
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          2
        );
      });

      // Only 2 tiles were cleared by this path
      expect(result.current.gameState.tilesCleared).toBe(2);

      // Clear second word (2 tiles) WITHOUT cascade completing
      act(() => {
        result.current.clearTilesForWord(
          [{ row: 1, col: 0 }, { row: 1, col: 1 }],
          'be',
          2
        );
      });

      // Should be 2 + 2 = 4, NOT 2 + 4 (counting all 4 cleared tiles again)
      expect(result.current.gameState.tilesCleared).toBe(4);
    });
  });

  describe('score popups', () => {
    it('should create a score popup when tiles are cleared', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
          'cat',
          5
        );
      });

      expect(result.current.scorePopups.length).toBeGreaterThan(0);
      const popup = result.current.scorePopups[0];
      expect(popup.score).toBe(5); // baseScore with no bonuses
      expect(popup.row).toBeDefined();
      expect(popup.col).toBeDefined();
    });

    it('should show bonus score for gold tile popup', () => {
      const { result } = renderHook(() => useBlastGame({
        ...defaultConfig,
        specialTileChance: 1,
      }));

      const goldTile = result.current.tileStates
        .flat()
        .find(t => t.type === 'gold');

      if (goldTile) {
        act(() => {
          result.current.clearTilesForWord(
            [{ row: goldTile.row, col: goldTile.col }],
            'a',
            5
          );
        });

        const popup = result.current.scorePopups.find(p => p.isSpecial);
        expect(popup).toBeDefined();
        // Gold tiles give 3x score (base 5 + bonus 10 = 15)
        expect(popup!.score).toBe(15);
      }
    });

    it('should dismiss score popup by id', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.clearTilesForWord(
          [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          'at',
          2
        );
      });

      const popupId = result.current.scorePopups[0]?.id;
      expect(popupId).toBeDefined();

      act(() => {
        result.current.dismissScorePopup(popupId);
      });

      expect(result.current.scorePopups.find(p => p.id === popupId)).toBeUndefined();
    });
  });

  describe('chain reactions (bomb triggers bomb)', () => {
    it('should clear secondary bomb blast area via chain reaction', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
      }));

      const bombs = result.current.tileStates.flat().filter(t => t.type === 'bomb');
      // Find two bombs that are adjacent (within BOMB_RADIUS)
      let primaryBomb = null;
      let secondaryBomb = null;
      for (const b1 of bombs) {
        for (const b2 of bombs) {
          if (b1 === b2) continue;
          const dr = Math.abs(b1.row - b2.row);
          const dc = Math.abs(b1.col - b2.col);
          if (dr <= BOMB_RADIUS && dc <= BOMB_RADIUS) {
            primaryBomb = b1;
            secondaryBomb = b2;
            break;
          }
        }
        if (primaryBomb) break;
      }

      if (primaryBomb && secondaryBomb) {
        act(() => {
          result.current.clearTilesForWord(
            [{ row: primaryBomb!.row, col: primaryBomb!.col }],
            'b',
            5
          );
        });

        // Secondary bomb should be cleared (hit by primary blast)
        expect(result.current.tileStates[secondaryBomb.row][secondaryBomb.col].isCleared).toBe(true);

        // Verify chain: find a cell in secondary's blast radius that is NOT in primary's
        // This proves the secondary bomb's explosion propagated
        let chainVerified = false;
        for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
          for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
            const r = secondaryBomb.row + dr;
            const c = secondaryBomb.col + dc;
            if (r < 0 || r >= 4 || c < 0 || c >= 4) continue;
            // Skip cells that overlap with primary bomb's blast
            const inPrimaryBlast =
              Math.abs(r - primaryBomb!.row) <= BOMB_RADIUS &&
              Math.abs(c - primaryBomb!.col) <= BOMB_RADIUS;
            if (!inPrimaryBlast && result.current.tileStates[r][c].isCleared) {
              chainVerified = true;
            }
          }
        }
        // If secondary has cells outside primary's blast, they must be cleared via chain
        // (If no such cells exist due to grid bounds, skip the assertion)
        const hasExclusiveCells = (() => {
          for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
            for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
              const r = secondaryBomb!.row + dr;
              const c = secondaryBomb!.col + dc;
              if (r < 0 || r >= 4 || c < 0 || c >= 4) continue;
              const inPrimaryBlast =
                Math.abs(r - primaryBomb!.row) <= BOMB_RADIUS &&
                Math.abs(c - primaryBomb!.col) <= BOMB_RADIUS;
              if (!inPrimaryBlast) return true;
            }
          }
          return false;
        })();

        if (hasExclusiveCells) {
          expect(chainVerified).toBe(true);
        }
      }
    });

    it('should create explosion events for each bomb in the chain', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
      }));

      const bombs = result.current.tileStates.flat().filter(t => t.type === 'bomb');
      let primaryBomb = null;
      let secondaryBomb = null;
      for (const b1 of bombs) {
        for (const b2 of bombs) {
          if (b1 === b2) continue;
          const dr = Math.abs(b1.row - b2.row);
          const dc = Math.abs(b1.col - b2.col);
          if (dr <= BOMB_RADIUS && dc <= BOMB_RADIUS) {
            primaryBomb = b1;
            secondaryBomb = b2;
            break;
          }
        }
        if (primaryBomb) break;
      }

      if (primaryBomb && secondaryBomb) {
        act(() => {
          result.current.clearTilesForWord(
            [{ row: primaryBomb!.row, col: primaryBomb!.col }],
            'b',
            5
          );
        });

        // Should have bomb explosions for both primary and secondary
        const bombExplosions = result.current.explosions.filter(e => e.type === 'bomb');
        expect(bombExplosions.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should stagger chain explosion timestamps for visual ripple', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
      }));

      const bombs = result.current.tileStates.flat().filter(t => t.type === 'bomb');
      let primaryBomb = null;
      let secondaryBomb = null;
      for (const b1 of bombs) {
        for (const b2 of bombs) {
          if (b1 === b2) continue;
          const dr = Math.abs(b1.row - b2.row);
          const dc = Math.abs(b1.col - b2.col);
          if (dr <= BOMB_RADIUS && dc <= BOMB_RADIUS) {
            primaryBomb = b1;
            secondaryBomb = b2;
            break;
          }
        }
        if (primaryBomb) break;
      }

      if (primaryBomb && secondaryBomb) {
        act(() => {
          result.current.clearTilesForWord(
            [{ row: primaryBomb!.row, col: primaryBomb!.col }],
            'b',
            5
          );
        });

        const bombExplosions = result.current.explosions
          .filter(e => e.type === 'bomb')
          .sort((a, b) => a.timestamp - b.timestamp);

        if (bombExplosions.length >= 2) {
          // Secondary bomb should have a later timestamp than primary
          expect(bombExplosions[1].timestamp).toBeGreaterThan(bombExplosions[0].timestamp);
        }
      }
    });

    it('should count all chain-cleared tiles in tilesCleared', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
      }));

      const bombs = result.current.tileStates.flat().filter(t => t.type === 'bomb');
      let primaryBomb = null;
      for (const b of bombs) {
        // Find a bomb not on edge for maximum blast
        if (b.row > 0 && b.row < 3 && b.col > 0 && b.col < 3) {
          primaryBomb = b;
          break;
        }
      }

      if (primaryBomb) {
        act(() => {
          result.current.clearTilesForWord(
            [{ row: primaryBomb!.row, col: primaryBomb!.col }],
            'b',
            5
          );
        });

        // tilesCleared should be >= 2 (the bomb itself + at least some adjacent cleared)
        // Ice tiles in the blast radius only crack, not clear, so exact count varies
        expect(result.current.gameState.tilesCleared).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('ice tile behavior', () => {
    it('should not clear ice tile on first hit (only crack it)', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
      }));

      const iceTile = result.current.tileStates.flat().find(t => t.type === 'ice');
      if (iceTile) {
        act(() => {
          result.current.clearTilesForWord(
            [{ row: iceTile.row, col: iceTile.col }],
            'a',
            2
          );
        });

        // Ice tile should NOT be cleared after first hit
        expect(result.current.tileStates[iceTile.row][iceTile.col].isCleared).toBe(false);
        // But hitsRemaining should decrease
        expect(result.current.tileStates[iceTile.row][iceTile.col].hitsRemaining).toBe(1);
      }
    });

    it('should clear ice tile on second hit', () => {
      const { result } = renderHook(() => useBlastGame({
        gridSize: 4,
        specialTileChance: 1,
        language: 'en',
      }));

      const iceTile = result.current.tileStates.flat().find(t => t.type === 'ice');
      if (iceTile) {
        // First hit
        act(() => {
          result.current.clearTilesForWord(
            [{ row: iceTile.row, col: iceTile.col }],
            'a',
            2
          );
        });

        // Second hit
        act(() => {
          result.current.clearTilesForWord(
            [{ row: iceTile.row, col: iceTile.col }],
            'b',
            2
          );
        });

        // Now it should be cleared
        expect(result.current.tileStates[iceTile.row][iceTile.col].isCleared).toBe(true);
      }
    });
  });

  describe('give up / end game', () => {
    it('should mark game as dead end when endGame is called', () => {
      const { result } = renderHook(() => useBlastGame(defaultConfig));

      act(() => {
        result.current.endGame();
      });

      expect(result.current.gameState.isDeadEnd).toBe(true);
    });
  });
});
