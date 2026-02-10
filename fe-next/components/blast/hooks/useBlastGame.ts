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
import { useBlastCascade, type BlastCascadePhase, type CascadeAnimationData } from './useBlastCascade';

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
  /** Display grid: the current playable grid (updated after cascades) */
  displayGrid: LetterGrid | null;
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
  /** Cascade animation state */
  cascadePhase: BlastCascadePhase;
  /** Whether cascade is in progress (blocks grid input) */
  isCascading: boolean;
  /** Cascade animation data for overlay rendering */
  cascadeAnimationData: CascadeAnimationData | null;
  // Legacy alias
  modifiedGrid: LetterGrid | null;
}

// ==================== Hook ====================

export function useBlastGame(config: BlastGameConfig = DEFAULT_BLAST_CONFIG): UseBlastGameReturn {
  const { gridSize, specialTileChance, language } = config;

  // Reuse grid generation from singleplayer
  const {
    grid: initialGrid,
    availableWords,
  } = useGridInit({
    difficulty: 'MEDIUM',
    language,
    mode: 'blast',
  });

  // Mutable grid state — updated after each cascade completes
  const [currentGrid, setCurrentGrid] = useState<LetterGrid | null>(null);

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

  // Track best word and total words cleared for results
  const bestWordRef = useRef<string>('');
  const totalWordsClearedRef = useRef(0);

  // Cascade hook
  const cascade = useBlastCascade({
    gridSize,
    language,
    specialTileChance,
  });

  // The effective grid = currentGrid (post-cascade) or initialGrid (pre-first-cascade)
  const effectiveGrid = currentGrid || initialGrid;

  // Display grid: show letters for non-cleared tiles, empty for cleared
  const displayGrid = useMemo<LetterGrid | null>(() => {
    if (!effectiveGrid) return null;
    return effectiveGrid.map((row, ri) =>
      row.map((cell, ci) =>
        tileStates[ri]?.[ci]?.isCleared ? '' : cell
      )
    );
  }, [effectiveGrid, tileStates]);

  /**
   * Handle cascade completion: update grid and tile states with gravity results.
   */
  const handleCascadeComplete = useCallback((newGrid: LetterGrid, newTileStates: BlastTileState[][]) => {
    setCurrentGrid(newGrid);
    setTileStates(newTileStates);
    // tilesCleared is a cumulative metric for the results screen — do NOT reset it
  }, []);

  /**
   * Clear tiles along a word path and apply special tile effects.
   * After clearing, triggers cascade (gravity + refill).
   */
  const clearTilesForWord = useCallback((
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number
  ) => {
    setTileStates(prev => {
      const next = prev.map(row => row.map(tile => ({ ...tile })));
      let bonusScore = 0;
      const newExplosions: BlastExplosion[] = [];
      const now = Date.now();

      // Clear path tiles and collect effects
      let newlyClearedCount = 0;
      for (const cell of path) {
        const tile = next[cell.row]?.[cell.col];
        if (!tile || tile.isCleared) continue;

        tile.isCleared = true;
        newlyClearedCount++;
        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;

        switch (tile.type) {
          case 'gold':
            bonusScore += baseScore * (GOLD_MULTIPLIER - 1);
            newExplosions.push({
              id: `gold-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 3, timestamp: now,
            });
            break;

          case 'bomb': {
            for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
              for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = cell.row + dr;
                const c = cell.col + dc;
                if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                  if (!next[r][c].isCleared) {
                    next[r][c].isCleared = true;
                    newlyClearedCount++;
                  }
                }
              }
            }
            newExplosions.push({
              id: `bomb-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'bomb', intensity: 4, timestamp: now,
            });
            break;
          }

          case 'rainbow':
            bonusScore += RAINBOW_BONUS;
            newExplosions.push({
              id: `rainbow-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
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
          row: path[midIdx].row, col: path[midIdx].col,
          type: 'word', intensity: intensity as 1 | 2 | 3 | 4, timestamp: now,
        });
      }

      totalWordsClearedRef.current += path.length;
      const totalScore = baseScore + bonusScore;

      if (word.length > bestWordRef.current.length) {
        bestWordRef.current = word;
      }

      // Update game state with score (tilesCleared tracks running total for results)
      setGameState(prev => ({
        ...prev,
        score: prev.score + totalScore,
        wordsFound: [...prev.wordsFound, word],
        tilesCleared: prev.tilesCleared + newlyClearedCount,
      }));

      if (newExplosions.length > 0) {
        setExplosions(prev => [...prev, ...newExplosions]);
      }

      // Trigger cascade after a short delay for explosions to play
      const gridForCascade = effectiveGrid;
      if (gridForCascade) {
        setTimeout(() => {
          cascade.startCascade(gridForCascade, next, handleCascadeComplete);
        }, 200);
      }

      return next;
    });
  }, [gridSize, effectiveGrid, cascade, handleCascadeComplete]);

  /** End the game manually */
  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isDeadEnd: true }));
  }, []);

  /** Generate results data for the results screen */
  const getResultsData = useCallback((maxCombo: number): BlastResultsData => {
    const { score, wordsFound, tilesCleared, totalTiles } = gameState;
    // In gravity mode, tilesCleared accumulates total cleared across all cascades
    const clearPercentage = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;

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

  /** Remove explosion from active list */
  const dismissExplosion = useCallback((id: string) => {
    setExplosions(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    grid: initialGrid,
    displayGrid,
    modifiedGrid: displayGrid, // Legacy alias
    tileStates,
    gameState,
    explosions,
    availableWords,
    clearTilesForWord,
    endGame,
    getResultsData,
    dismissExplosion,
    cascadePhase: cascade.cascadePhase,
    isCascading: cascade.isAnimating,
    cascadeAnimationData: cascade.animationData,
  };
}
