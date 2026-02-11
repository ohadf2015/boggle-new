'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { hasValidWords } from '../utils/blastDeadEndDetector';
import { generateBlastLetter } from '../utils/blastLetterGenerator';
import { detectVerticalWords } from '../utils/blastVerticalScanner';
import type { LetterGrid } from '@/shared/types/game';
import {
  DEFAULT_BLAST_CONFIG,
  GOLD_MULTIPLIER,
  BOMB_RADIUS,
  RAINBOW_BONUS,
  CHAIN_BOMB_STAGGER,
  SPECIAL_TILE_DISTRIBUTION,
  MAX_CASCADE_CHAIN,
  CASCADE_DETECTION_DELAY,
  CASCADE_CHAIN_BONUS_MULTIPLIER,
  type BlastGameConfig,
  type BlastGameState,
  type BlastTileState,
  type BlastTileType,
  type BlastResultsData,
  type BlastExplosion,
  type BlastScorePopup,
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
        const { gold, bomb, rainbow, ice } = SPECIAL_TILE_DISTRIBUTION;
        if (roll < gold) {
          type = 'gold';
        } else if (roll < gold + bomb) {
          type = 'bomb';
        } else if (roll < gold + bomb + rainbow) {
          type = 'rainbow';
        } else if (roll < gold + bomb + rainbow + ice) {
          type = 'ice';
        } else {
          type = 'wildcard';
        }
      }

      tiles[row][col] = {
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: type === 'ice' ? 2 : 0,
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
  /** Active score popups for floating score display */
  scorePopups: BlastScorePopup[];
  /** All words available on the board */
  availableWords: { easy: string[]; medium: string[]; hard: string[] } | null;
  /** Clear tiles along a word path and apply special effects */
  clearTilesForWord: (
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number
  ) => void;
  /** True when auto-detection finds no valid words remaining */
  noWordsRemaining: boolean;
  /** End the game manually (give up) */
  endGame: () => void;
  /** Shuffle remaining (uncleared) tiles to create new word possibilities */
  shuffleRemainingTiles: () => void;
  /** Generate results data for the results screen */
  getResultsData: (maxCombo: number) => BlastResultsData;
  /** Remove an explosion from the active list */
  dismissExplosion: (id: string) => void;
  /** Remove a score popup from the active list */
  dismissScorePopup: (id: string) => void;
  /** Cascade animation state */
  cascadePhase: BlastCascadePhase;
  /** Whether cascade is in progress (blocks grid input) */
  isCascading: boolean;
  /** Cascade animation data for overlay rendering */
  cascadeAnimationData: CascadeAnimationData | null;
  /** Current cascade chain level (0 = no active chain) */
  cascadeChainLevel: number;
  // Legacy alias
  modifiedGrid: LetterGrid | null;
}

export interface UseBlastGameOptions {
  /** Called when an auto-cascade detects and clears a vertical word */
  onAutoCascadeWord?: (word: string, score: number, chainLevel: number) => void;
}

// ==================== Hook ====================

/** Map blast difficulty to useGridInit word difficulty */
const WORD_DIFFICULTY_MAP = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
} as const;

export function useBlastGame(
  config: BlastGameConfig = DEFAULT_BLAST_CONFIG,
  options?: UseBlastGameOptions,
): UseBlastGameReturn {
  const { gridSize, specialTileChance, language, difficulty = 'medium' } = config;

  // Reuse grid generation from singleplayer, with blast gridSize override
  const {
    grid: initialGrid,
    availableWords,
  } = useGridInit({
    difficulty: WORD_DIFFICULTY_MAP[difficulty],
    language,
    mode: 'blast',
    rows: gridSize,
    cols: gridSize,
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
    cascadeChainLevel: 0,
  });

  // Explosions for animation
  const [explosions, setExplosions] = useState<BlastExplosion[]>([]);

  // Score popups for floating score display
  const [scorePopups, setScorePopups] = useState<BlastScorePopup[]>([]);

  // Track best word and total words cleared for results
  const bestWordRef = useRef<string>('');
  const totalWordsClearedRef = useRef(0);

  // Cascade chain refs (avoid re-renders + break circular useCallback dependency)
  const cascadeChainLevelRef = useRef(0);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoCascadeWordRef = useRef(options?.onAutoCascadeWord);
  onAutoCascadeWordRef.current = options?.onAutoCascadeWord;

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

  // Dictionary cache (moved up — used by both cascade detection and dead-end detection)
  const { checkWord: checkWordInDict, isLoaded: isDictLoaded } = useDictionaryCache(language);

  /**
   * Handle cascade completion: update grid, then scan for vertical cascade words.
   * Uses ref indirection to break circular dependency (cascade → handleComplete → cascade).
   */
  const handleCascadeCompleteRef = useRef<(g: LetterGrid, ts: BlastTileState[][], cols: number[]) => void>(() => {});

  const handleCascadeComplete = useCallback((newGrid: LetterGrid, newTileStates: BlastTileState[][], affectedColumns: number[]) => {
    setCurrentGrid(newGrid);
    setTileStates(newTileStates);

    // Auto-detect vertical cascade words
    if (
      cascadeChainLevelRef.current < MAX_CASCADE_CHAIN &&
      isDictLoaded &&
      !gameStateRef.current.isComplete &&
      !gameStateRef.current.isDeadEnd
    ) {
      setIsAutoDetecting(true);

      // Clear previous timer if any
      if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);

      autoDetectTimerRef.current = setTimeout(() => {
        const foundSet = new Set(gameStateRef.current.wordsFound);
        const columnFilter = affectedColumns.length > 0 ? new Set(affectedColumns) : undefined;
        const verticalWords = detectVerticalWords(newGrid, newTileStates, checkWordInDict, foundSet, 3, columnFilter);

        if (verticalWords.length > 0) {
          const chainLevel = cascadeChainLevelRef.current + 1;
          cascadeChainLevelRef.current = chainLevel;

          // Collect all paths and calculate scores
          const allPaths: Array<{ row: number; col: number }> = [];
          const newExplosions: BlastExplosion[] = [];
          const now = Date.now();
          let totalCascadeScore = 0;
          let newlyClearedCount = 0;
          const cascadeWords: string[] = [];

          // Deep-copy tile states for mutation
          const nextTileStates = newTileStates.map(row => row.map(tile => ({ ...tile })));

          for (const vw of verticalWords) {
            const baseScore = vw.word.length - 1;
            const chainBonus = Math.floor(baseScore * chainLevel * CASCADE_CHAIN_BONUS_MULTIPLIER);
            const wordScore = baseScore + chainBonus;
            totalCascadeScore += wordScore;
            cascadeWords.push(vw.word);

            // Clear tiles in the vertical word
            for (const cell of vw.path) {
              if (!nextTileStates[cell.row][cell.col].isCleared) {
                nextTileStates[cell.row][cell.col].isCleared = true;
                newlyClearedCount++;
              }
              allPaths.push(cell);
            }

            // Cascade explosion at word midpoint
            const midIdx = Math.floor(vw.path.length / 2);
            const intensity = vw.word.length <= 3 ? 1 : vw.word.length <= 5 ? 2 : vw.word.length <= 7 ? 3 : 4;
            newExplosions.push({
              id: `cascade-${now}-${vw.column}-${vw.startRow}`,
              row: vw.path[midIdx].row,
              col: vw.path[midIdx].col,
              type: 'cascade',
              intensity: intensity as 1 | 2 | 3 | 4,
              timestamp: now,
            });

            // Score popup
            setScorePopups(prev => [...prev, {
              id: `cascade-score-${now}-${vw.column}-${vw.startRow}`,
              score: wordScore,
              row: vw.path[midIdx].row,
              col: vw.path[midIdx].col,
              isSpecial: true,
              timestamp: now,
            }]);

            // Notify parent
            onAutoCascadeWordRef.current?.(vw.word, wordScore, chainLevel);
          }

          // Update game state
          setGameState(prev => ({
            ...prev,
            score: prev.score + totalCascadeScore,
            wordsFound: [...prev.wordsFound, ...cascadeWords],
            tilesCleared: prev.tilesCleared + newlyClearedCount,
            cascadeChainLevel: chainLevel,
          }));

          setExplosions(prev => [...prev, ...newExplosions]);
          setTileStates(nextTileStates);

          // Trigger next cascade (gravity + refill) for the newly cleared tiles
          setIsAutoDetecting(false);
          setTimeout(() => {
            cascade.startCascade(newGrid, nextTileStates, handleCascadeCompleteRef.current);
          }, 80);
        } else {
          // No cascade words found — reset chain
          cascadeChainLevelRef.current = 0;
          setGameState(prev => ({ ...prev, cascadeChainLevel: 0 }));
          setIsAutoDetecting(false);
        }
      }, CASCADE_DETECTION_DELAY);
    } else {
      // Max chain reached or dictionary not loaded — reset
      cascadeChainLevelRef.current = 0;
      setGameState(prev => ({ ...prev, cascadeChainLevel: 0 }));
    }
  }, [isDictLoaded, checkWordInDict, cascade]);

  // Keep ref in sync with latest callback
  handleCascadeCompleteRef.current = handleCascadeComplete;

  // Dead-end detection state
  const [noWordsRemaining, setNoWordsRemaining] = useState(false);

  // Cleanup auto-detect timer on unmount
  useEffect(() => () => {
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
  }, []);

  // Auto-complete when cumulative tilesCleared reaches the board size
  useEffect(() => {
    const { tilesCleared, totalTiles, isComplete, isDeadEnd } = gameState;
    if (!isComplete && !isDeadEnd && tilesCleared >= totalTiles && totalTiles > 0) {
      setGameState(prev => ({ ...prev, isComplete: true }));
    }
  }, [gameState]);

  // Dead-end detection: check after cascade settles
  useEffect(() => {
    if (!isDictLoaded || !displayGrid) return;
    if (gameState.isComplete || gameState.isDeadEnd) return;
    if (cascade.cascadePhase !== 'idle') return;
    // Only check after at least one word has been found (skip initial load)
    if (gameState.wordsFound.length === 0) return;

    // Debounce to avoid checking during rapid interactions
    const timer = setTimeout(() => {
      const foundSet = new Set(gameState.wordsFound);
      const valid = hasValidWords(displayGrid, language, checkWordInDict, foundSet);
      setNoWordsRemaining(!valid);
    }, 300);

    return () => clearTimeout(timer);
  }, [isDictLoaded, displayGrid, cascade.cascadePhase, gameState.isComplete, gameState.isDeadEnd, gameState.wordsFound, language, checkWordInDict]);

  /**
   * Shuffle remaining (uncleared) tiles to create new word possibilities.
   * Replaces letters on all uncleared cells with new random letters.
   */
  const shuffleRemainingTiles = useCallback(() => {
    if (!effectiveGrid) return;

    const newGrid = effectiveGrid.map((row, ri) =>
      row.map((cell, ci) => {
        // Keep cleared cells as-is; regenerate uncleared cells
        if (tileStates[ri]?.[ci]?.isCleared) return cell;
        return generateBlastLetter(language);
      })
    );

    setCurrentGrid(newGrid);
    setNoWordsRemaining(false);
  }, [effectiveGrid, tileStates, language]);

  /**
   * Clear tiles along a word path and apply special tile effects.
   * After clearing, triggers cascade (gravity + refill).
   */
  const clearTilesForWord = useCallback((
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number
  ) => {
    // New player word = new cascade chain
    cascadeChainLevelRef.current = 0;
    // Cancel any pending auto-detection from a previous cascade
    if (autoDetectTimerRef.current) {
      clearTimeout(autoDetectTimerRef.current);
      autoDetectTimerRef.current = null;
    }
    setIsAutoDetecting(false);

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

        // Ice tiles require multiple hits before clearing
        if (tile.type === 'ice' && tile.hitsRemaining > 1) {
          tile.hitsRemaining--;
          tile.activationEffect = 'ice-crack';
          continue; // Don't clear yet
        }

        tile.isCleared = true;
        newlyClearedCount++;
        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;

        switch (tile.type) {
          case 'gold':
            bonusScore += baseScore * (GOLD_MULTIPLIER - 1);
            newExplosions.push({
              id: `gold-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
            });
            break;

          case 'bomb': {
            // BFS chain reaction: queue bombs whose blast may trigger more bombs
            const bombQueue: Array<{ row: number; col: number; depth: number }> = [{ row: cell.row, col: cell.col, depth: 0 }];
            const processedBombs = new Set<string>();
            processedBombs.add(`${cell.row},${cell.col}`);

            while (bombQueue.length > 0) {
              const bomb = bombQueue.shift()!;
              // Stagger chain explosions for visual ripple effect
              const staggeredTime = now + bomb.depth * CHAIN_BOMB_STAGGER;
              newExplosions.push({
                id: `bomb-${staggeredTime}-${bomb.row}-${bomb.col}`,
                row: bomb.row, col: bomb.col, type: 'bomb', intensity: 3, timestamp: staggeredTime,
              });

              for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
                for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
                  if (dr === 0 && dc === 0) continue;
                  const r = bomb.row + dr;
                  const c = bomb.col + dc;
                  if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                    if (!next[r][c].isCleared) {
                      // Ice tiles in bomb blast get hit but may not clear
                      if (next[r][c].type === 'ice' && next[r][c].hitsRemaining > 1) {
                        next[r][c].hitsRemaining--;
                        next[r][c].activationEffect = 'ice-crack';
                      } else {
                        next[r][c].isCleared = true;
                        newlyClearedCount++;
                        // Chain: if this newly-cleared cell is also a bomb, queue it
                        if (next[r][c].type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
                          processedBombs.add(`${r},${c}`);
                          bombQueue.push({ row: r, col: c, depth: bomb.depth + 1 });
                        }
                      }
                    }
                  }
                }
              }
            }
            break;
          }

          case 'rainbow':
            bonusScore += RAINBOW_BONUS;
            newExplosions.push({
              id: `rainbow-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 1, timestamp: now,
            });
            break;

          case 'wildcard':
            newExplosions.push({
              id: `wildcard-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 1, timestamp: now,
            });
            break;

          case 'ice':
            // Ice tile on final hit — already cleared above
            break;
        }
      }

      // Add word explosion (skip when ≥2 special tile explosions to reduce visual overload)
      const specialExplosionCount = newExplosions.length;
      if (path.length > 0 && specialExplosionCount < 2) {
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

      // Create score popup at the mid-point of the word path
      if (path.length > 0) {
        const midIdx = Math.floor(path.length / 2);
        setScorePopups(prev => [...prev, {
          id: `score-${now}-${path[midIdx].row}-${path[midIdx].col}`,
          score: totalScore,
          row: path[midIdx].row,
          col: path[midIdx].col,
          isSpecial: bonusScore > 0,
          timestamp: now,
        }]);
      }

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

      // Trigger cascade after a brief delay for gap cells to appear
      const gridForCascade = effectiveGrid;
      if (gridForCascade) {
        setTimeout(() => {
          cascade.startCascade(gridForCascade, next, handleCascadeComplete);
        }, 80);
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

  /** Remove score popup from active list */
  const dismissScorePopup = useCallback((id: string) => {
    setScorePopups(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    grid: initialGrid,
    displayGrid,
    modifiedGrid: displayGrid, // Legacy alias
    tileStates,
    gameState,
    explosions,
    scorePopups,
    availableWords,
    noWordsRemaining,
    clearTilesForWord,
    endGame,
    shuffleRemainingTiles,
    getResultsData,
    dismissExplosion,
    dismissScorePopup,
    cascadePhase: cascade.cascadePhase,
    isCascading: cascade.isAnimating || isAutoDetecting,
    cascadeAnimationData: cascade.animationData,
    cascadeChainLevel: gameState.cascadeChainLevel,
  };
}
