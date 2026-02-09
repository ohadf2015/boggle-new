'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import type { LetterGrid } from '@/shared/types/game';
import {
  DEFAULT_BLAST_CONFIG,
  GOLD_MULTIPLIER,
  BOMB_RADIUS,
  RAINBOW_BONUS,
  SPECIAL_TILE_DISTRIBUTION,
  type BlastGameConfig,
  type BlastGameState,
  type BlastTileState,
  type BlastTileType,
  type BlastResultsData,
  type BlastExplosion,
} from '../types';

// ==================== Helpers ====================

/** Seeded random for consistent tile placement per grid */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Generate initial tile states with special tile placement */
function generateTileStates(
  gridSize: number,
  specialTileChance: number,
  seed: number = Date.now()
): BlastTileState[][] {
  const random = seededRandom(seed);
  const tiles: BlastTileState[][] = [];

  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      let type: BlastTileType = 'standard';

      if (random() < specialTileChance) {
        // Distribute among special types
        const roll = random();
        const { gold, bomb } = SPECIAL_TILE_DISTRIBUTION;
        if (roll < gold) {
          type = 'gold';
        } else if (roll < gold + bomb) {
          type = 'bomb';
        } else {
          type = 'rainbow';
        }
      }

      tiles[row][col] = {
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
      };
    }
  }

  return tiles;
}

/** Calculate star rating from clear percentage */
function calculateStars(clearPercentage: number): 1 | 2 | 3 {
  if (clearPercentage >= 100) return 3;
  if (clearPercentage >= 75) return 2;
  return 1;
}

// ==================== Return Type ====================

export interface UseBlastGameReturn {
  /** The underlying letter grid (from useGridInit) */
  grid: LetterGrid | null;
  /** Modified grid with cleared cells as empty strings */
  modifiedGrid: LetterGrid | null;
  /** Per-cell tile state (type, cleared status) */
  tileStates: BlastTileState[][];
  /** Aggregate game state */
  gameState: BlastGameState;
  /** Active explosions for animation layer */
  explosions: BlastExplosion[];
  /** All words available on the board */
  availableWords: { easy: string[]; medium: string[]; hard: string[] } | null;
  /** Clear tiles along a word path and apply special effects */
  clearTilesForWord: (
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number
  ) => void;
  /** End the game manually (give up) */
  endGame: () => void;
  /** Generate results data for the results screen */
  getResultsData: (maxCombo: number) => BlastResultsData;
  /** Remove an explosion from the active list */
  dismissExplosion: (id: string) => void;
}

// ==================== Hook ====================

export function useBlastGame(config: BlastGameConfig = DEFAULT_BLAST_CONFIG): UseBlastGameReturn {
  const { gridSize, specialTileChance, language } = config;

  // Reuse grid generation from singleplayer
  const {
    grid,
    availableWords,
  } = useGridInit({
    difficulty: 'MEDIUM',
    language,
    mode: 'blast',
  });

  // Tile state management
  const [tileStates, setTileStates] = useState<BlastTileState[][]>(() =>
    generateTileStates(gridSize, specialTileChance)
  );

  // Game state
  const [gameState, setGameState] = useState<BlastGameState>({
    score: 0,
    wordsFound: [],
    tilesCleared: 0,
    totalTiles: gridSize * gridSize,
    comboCount: 0,
    isComplete: false,
    isDeadEnd: false,
  });

  // Explosions for animation
  const [explosions, setExplosions] = useState<BlastExplosion[]>([]);

  // Track best word for results
  const bestWordRef = useRef<string>('');

  // Modified grid: cleared cells become empty strings so GridComponent skips them
  const modifiedGrid = useMemo<LetterGrid | null>(() => {
    if (!grid) return null;
    return grid.map((row, ri) =>
      row.map((cell, ci) =>
        tileStates[ri]?.[ci]?.isCleared ? '' : cell
      )
    );
  }, [grid, tileStates]);

  /**
   * Clear tiles along a word path and apply special tile effects.
   * This is the core game mechanic.
   */
  const clearTilesForWord = useCallback((
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number
  ) => {
    setTileStates(prev => {
      const next = prev.map(row => row.map(tile => ({ ...tile })));
      let bonusScore = 0;
      let extraCleared = 0;
      const newExplosions: BlastExplosion[] = [];
      const now = Date.now();

      // Clear path tiles and collect effects
      for (const cell of path) {
        const tile = next[cell.row]?.[cell.col];
        if (!tile || tile.isCleared) continue;

        tile.isCleared = true;
        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;

        // Apply special effects
        switch (tile.type) {
          case 'gold':
            bonusScore += baseScore * (GOLD_MULTIPLIER - 1); // -1 because base already counted
            newExplosions.push({
              id: `gold-${now}-${cell.row}-${cell.col}`,
              row: cell.row,
              col: cell.col,
              type: 'word',
              intensity: 3,
              timestamp: now,
            });
            break;

          case 'bomb': {
            // Clear all adjacent tiles in bomb radius
            for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
              for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = cell.row + dr;
                const c = cell.col + dc;
                if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                  if (!next[r][c].isCleared) {
                    next[r][c].isCleared = true;
                    extraCleared++;
                  }
                }
              }
            }
            newExplosions.push({
              id: `bomb-${now}-${cell.row}-${cell.col}`,
              row: cell.row,
              col: cell.col,
              type: 'bomb',
              intensity: 4,
              timestamp: now,
            });
            break;
          }

          case 'rainbow':
            bonusScore += RAINBOW_BONUS;
            newExplosions.push({
              id: `rainbow-${now}-${cell.row}-${cell.col}`,
              row: cell.row,
              col: cell.col,
              type: 'word',
              intensity: 2,
              timestamp: now,
            });
            break;
        }
      }

      // Add word explosion
      if (path.length > 0) {
        const midIdx = Math.floor(path.length / 2);
        const intensity = path.length <= 3 ? 1 : path.length <= 5 ? 2 : path.length <= 7 ? 3 : 4;
        newExplosions.push({
          id: `word-${now}`,
          row: path[midIdx].row,
          col: path[midIdx].col,
          type: 'word',
          intensity: intensity as 1 | 2 | 3 | 4,
          timestamp: now,
        });
      }

      // Count cleared tiles
      const totalCleared = next.flat().filter(t => t.isCleared).length;
      const totalTiles = gridSize * gridSize;
      const isComplete = totalCleared === totalTiles;
      const totalScore = baseScore + bonusScore;

      // Track best word
      if (word.length > bestWordRef.current.length) {
        bestWordRef.current = word;
      }

      // Update game state
      setGameState(prev => ({
        ...prev,
        score: prev.score + totalScore,
        wordsFound: [...prev.wordsFound, word],
        tilesCleared: totalCleared,
        isComplete,
      }));

      // Queue explosions
      if (newExplosions.length > 0) {
        setExplosions(prev => [...prev, ...newExplosions]);
      }

      return next;
    });
  }, [gridSize]);

  /** End the game manually */
  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isDeadEnd: true }));
  }, []);

  /** Generate results data for the results screen */
  const getResultsData = useCallback((maxCombo: number): BlastResultsData => {
    const { score, wordsFound, tilesCleared, totalTiles } = gameState;
    const clearPercentage = totalTiles > 0 ? Math.round((tilesCleared / totalTiles) * 100) : 0;

    return {
      finalScore: score,
      tilesCleared,
      totalTiles,
      clearPercentage,
      wordsFound,
      bestWord: bestWordRef.current || (wordsFound[0] ?? ''),
      maxCombo,
      stars: calculateStars(clearPercentage),
    };
  }, [gameState]);

  /** Remove explosion from active list (after animation completes) */
  const dismissExplosion = useCallback((id: string) => {
    setExplosions(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    grid,
    modifiedGrid,
    tileStates,
    gameState,
    explosions,
    availableWords,
    clearTilesForWord,
    endGame,
    getResultsData,
    dismissExplosion,
  };
}
