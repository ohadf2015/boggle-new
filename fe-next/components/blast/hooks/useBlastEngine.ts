'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { generateTileStates } from '../utils/blastTileGeneration';
import { guaranteeObjectiveTiles } from '../utils/blastObjectiveGuarantee';
import { processTilesForWord } from '../utils/clearTilesProcessor';
import { applyBetweenTurnEffects } from '../utils/blastTileEffects';
import { computeThawedCells } from './blastCellFilterLogic';
import { computeGravityResult, type GravityResult } from '../utils/blastGravity';
import type { SpecialCombo } from '../utils/blastCombos';
import { hasValidWords } from '../utils/blastDeadEndDetector';
import { calculateEarnedStars } from '../utils/blastStarCalculator';
import { calculateLeftoverMoveBonus } from '../utils/blastMoveUtils';
import { createDDAState, updateDDA, getDDASpawnModifier } from '../utils/blastDDA';
import { createSeededRandom, generateBlastLetter } from '../utils/blastLetterGenerator';
import type { LetterGrid } from '@/shared/types/game';
import {
  DEFAULT_BLAST_CONFIG,
  type BlastGameConfig,
  type BlastGameState,
  type BlastTileState,
  type BlastTileType,
  type BlastResultsData,
  type BlastObjective,
  type WaveResult,
} from '../types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UseBlastEngineOptions {
  movesAllowed?: number;
  waveObjectives?: BlastObjective[];
  currentWave?: number;
  isMultiplayer?: boolean;
  blastSeed?: number | null;
  initialTileStates?: BlastTileState[][] | null;
}

export interface WordSubmitResult {
  score: number;
  combos: SpecialCombo[];
  clearedTiles: Array<{ row: number; col: number; type: BlastTileType }>;
  explosions: Array<{ row: number; col: number; type: string }>;
  bonusMoves: number;
  /** Countdown tiles that exploded this turn (penalty applied) */
  countdownExplosions: Array<{ row: number; col: number }>;
  /** Tiles newly infected by virus spread */
  virusInfections: Array<{ row: number; col: number }>;
}

export interface CascadeResult {
  gravity: GravityResult;
  /** Whether new words were auto-detected in cascaded grid */
  hasNewWords: boolean;
  /** Commit grid + tile state to React after animation completes */
  commit?: () => void;
}

export interface UseBlastEngineReturn {
  grid: LetterGrid | null;
  tileStates: BlastTileState[][];
  gameState: BlastGameState;
  submitWord: (path: Array<{ row: number; col: number }>, word: string, baseScore: number) => WordSubmitResult;
  shuffleGrid: () => void;
  endGame: () => void;
  unlockMoves: () => void;
  getResults: (maxCombo: number, wavesCompleted?: number, waveResults?: WaveResult[]) => BlastResultsData;
  isCascading: boolean;
  startCascade: () => CascadeResult;
  setTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  trackWordFail: () => void;
  /** Consume a move without clearing tiles (e.g. invalid word submission) */
  consumeMove: () => void;
  noWordsRemaining: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WORD_DIFFICULTY_MAP = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
} as const;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useBlastEngine(
  config: BlastGameConfig = DEFAULT_BLAST_CONFIG,
  options?: UseBlastEngineOptions,
): UseBlastEngineReturn {
  const { gridSize, specialTileChance, language, difficulty = 'medium', customDistribution } = config;

  const movesAllowed = options?.movesAllowed ?? Infinity;
  const currentWave = options?.currentWave ?? 1;
  const effectiveBlastSeed = options?.blastSeed ?? null;

  // Grid generation via shared hook
  const { grid: initialGrid } = useGridInit({
    difficulty: WORD_DIFFICULTY_MAP[difficulty],
    language,
    mode: 'blast',
    rows: gridSize,
    cols: gridSize,
  });

  // Mutable grid — updated after each cascade
  const [currentGrid, setCurrentGrid] = useState<LetterGrid | null>(null);
  const effectiveGrid = currentGrid || initialGrid;
  const effectiveGridRef = useRef(effectiveGrid);
  effectiveGridRef.current = effectiveGrid;

  // Tile states
  const [tileStates, setTileStates] = useState<BlastTileState[][]>(() => {
    if (options?.initialTileStates) return options.initialTileStates;
    const tiles = generateTileStates(gridSize, specialTileChance, Date.now(), customDistribution, currentWave);
    return options?.waveObjectives ? guaranteeObjectiveTiles(tiles, options.waveObjectives) : tiles;
  });

  // Sync server overlay in multiplayer
  const initialTileStatesFromOptions = options?.initialTileStates;
  useEffect(() => {
    if (initialTileStatesFromOptions && initialTileStatesFromOptions.length > 0) {
      setTileStates(initialTileStatesFromOptions);
    }
  }, [initialTileStatesFromOptions]);

  const tileStatesRef = useRef(tileStates);
  tileStatesRef.current = tileStates;

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
    movesRemaining: movesAllowed === Infinity ? Infinity : movesAllowed,
    movesUsed: 0,
    totalMoves: movesAllowed === Infinity ? Infinity : movesAllowed,
    bonusMoveScore: 0,
    tileTypeClears: {} as Record<BlastTileType, number>,
    diamondRevealTurns: 0,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Cascade tracking
  const [isCascading, setIsCascading] = useState(false);

  // DDA invisible assist
  const ddaStateRef = useRef(createDDAState());

  // Best word tracking
  const bestWordRef = useRef('');

  // Dictionary for dead-end detection
  const { checkWord: checkWordInDict, isLoaded: isDictLoaded } = useDictionaryCache(language);

  // Dead-end detection
  const [noWordsRemaining, setNoWordsRemaining] = useState(false);
  const deadEndIdleRef = useRef<number | null>(null);

  // ── Auto-complete when all tiles cleared ──
  const { tilesCleared, totalTiles, isComplete, isDeadEnd, movesRemaining: gsMovesRemaining, movesUsed, totalMoves: gsTotalMoves } = gameState;

  useEffect(() => {
    if (!isComplete && !isDeadEnd && tilesCleared >= totalTiles && totalTiles > 0) {
      const bonus = calculateLeftoverMoveBonus(gsMovesRemaining);
      setGameState(prev => ({ ...prev, isComplete: true, bonusMoveScore: bonus, score: prev.score + bonus }));
    }
  }, [tilesCleared, totalTiles, isComplete, isDeadEnd, gsMovesRemaining]);

  // ── Game over on moves exhausted (singleplayer only) ──
  useEffect(() => {
    if (options?.isMultiplayer) return;
    if (!isComplete && !isDeadEnd && movesUsed > 0 && gsMovesRemaining <= 0 && isFinite(gsTotalMoves)) {
      setGameState(prev => ({ ...prev, isDeadEnd: true }));
    }
  }, [isComplete, isDeadEnd, movesUsed, gsMovesRemaining, gsTotalMoves, options?.isMultiplayer]);

  // ── Dead-end detection ──
  const wordsFoundCount = gameState.wordsFound.length;

  useEffect(() => {
    if (!isDictLoaded || !effectiveGrid) return;
    if (gameState.isComplete || gameState.isDeadEnd) return;
    if (isCascading) return;
    if (wordsFoundCount === 0) return;

    // Build display grid (hide cleared tiles)
    const displayGrid = effectiveGrid.map((row, ri) =>
      row.map((cell, ci) => tileStates[ri]?.[ci]?.isCleared ? '' : cell),
    );

    const timer = setTimeout(() => {
      const run = () => {
        const foundSet = new Set(gameState.wordsFound);
        const valid = hasValidWords(displayGrid, language, checkWordInDict, foundSet);
        setNoWordsRemaining(!valid);
      };
      if (typeof requestIdleCallback === 'function') {
        deadEndIdleRef.current = requestIdleCallback(run, { timeout: 1000 });
      } else {
        run();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (deadEndIdleRef.current !== null && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(deadEndIdleRef.current);
        deadEndIdleRef.current = null;
      }
    };
  }, [isDictLoaded, effectiveGrid, isCascading, gameState.isComplete, gameState.isDeadEnd, wordsFoundCount, gameState.wordsFound, language, checkWordInDict, tileStates]);

  // ── submitWord ──
  const submitWord = useCallback((
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number,
  ): WordSubmitResult => {
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'success');

    const currentTiles = tileStatesRef.current;
    const result = processTilesForWord({ prev: currentTiles, path, word, baseScore, gridSize, currentWave });
    const { next, totalScore, newlyClearedCount, clearedTypeCounts, explosions: newExplosions, vortexLetterSwaps, detectedCombos, bonusMoveCount, diamondRevealTurns: newDiamondReveal } = result;

    if (word.length > bestWordRef.current.length) bestWordRef.current = word;

    // Apply vortex letter swaps to grid
    if (vortexLetterSwaps.length > 0) {
      const baseGrid = effectiveGridRef.current;
      if (baseGrid) {
        const swappedGrid = baseGrid.map(row => [...row]);
        for (const swap of vortexLetterSwaps) {
          const tmp = swappedGrid[swap.fromR][swap.fromC];
          swappedGrid[swap.fromR][swap.fromC] = swappedGrid[swap.toR][swap.toC];
          swappedGrid[swap.toR][swap.toC] = tmp;
        }
        setCurrentGrid(swappedGrid);
        effectiveGridRef.current = swappedGrid;
      }
    }

    // Thaw ice/frozen tiles adjacent to the word path
    const thawedCells = computeThawedCells(next, path);
    const tilesAfterThaw = thawedCells.length > 0
      ? next.map(row => row.map(tile => {
          if (thawedCells.some(c => c.row === tile.row && c.col === tile.col)) {
            return { ...tile, isThawed: true };
          }
          return tile;
        }))
      : next;

    // Between-turn effects: countdown tick + virus spread
    const betweenTurn = applyBetweenTurnEffects(tilesAfterThaw, gridSize);

    setTileStates(tilesAfterThaw);

    setGameState(prev => {
      const newMovesRemaining = Math.max(0, prev.movesRemaining - 1) + bonusMoveCount;
      const mergedTypeClears = { ...prev.tileTypeClears };
      for (const [tType, count] of Object.entries(clearedTypeCounts)) {
        mergedTypeClears[tType as BlastTileType] = (mergedTypeClears[tType as BlastTileType] || 0) + (count as number);
      }
      return {
        ...prev,
        score: prev.score + totalScore - betweenTurn.penalty,
        wordsFound: [...prev.wordsFound, word],
        tilesCleared: prev.tilesCleared + newlyClearedCount,
        movesRemaining: newMovesRemaining,
        movesUsed: prev.movesUsed + 1,
        tileTypeClears: mergedTypeClears,
        diamondRevealTurns: Math.max(
          newDiamondReveal,
          prev.diamondRevealTurns > 0 ? prev.diamondRevealTurns - 1 : 0,
        ),
      };
    });

    // Build clearedTiles list from the path tiles that are now cleared
    const clearedTiles = path
      .filter(cell => next[cell.row]?.[cell.col]?.isCleared)
      .map(cell => ({ row: cell.row, col: cell.col, type: next[cell.row][cell.col].type }));

    return {
      score: totalScore - betweenTurn.penalty,
      combos: detectedCombos,
      clearedTiles,
      explosions: newExplosions.map(e => ({ row: e.row, col: e.col, type: e.type })),
      bonusMoves: bonusMoveCount,
      countdownExplosions: betweenTurn.countdownExplosions,
      virusInfections: betweenTurn.virusInfections,
    };
  }, [gridSize, currentWave]);

  // ── startCascade ──
  const startCascade = useCallback((): CascadeResult => {
    setIsCascading(true);

    const grid = effectiveGridRef.current;
    const tiles = tileStatesRef.current;

    if (!grid) {
      setIsCascading(false);
      return {
        gravity: { newGrid: [], newTileStates: [], clearedTiles: [], fallingTiles: [], newTiles: [] },
        hasNewWords: false,
      };
    }

    // Disable DDA in multiplayer to maintain competitive integrity
    const ddaModifier = options?.isMultiplayer ? 0 : getDDASpawnModifier(ddaStateRef.current);
    const rng = effectiveBlastSeed != null ? createSeededRandom(effectiveBlastSeed + gameStateRef.current.movesUsed) : undefined;

    const shouldRefill = config.boardClearMode !== 'shrink';
    const gravityResult = computeGravityResult(
      grid, tiles, gridSize, language, specialTileChance,
      customDistribution, ddaModifier, rng,
      shouldRefill,
    );

    // Update refs immediately so subsequent engine calls see latest state,
    // but defer React state updates — caller should call commitCascade()
    // after animation completes so tiles don't snap to new positions mid-fall.
    effectiveGridRef.current = gravityResult.newGrid;
    tileStatesRef.current = gravityResult.newTileStates;

    setIsCascading(false);

    return {
      gravity: gravityResult,
      hasNewWords: false,
      /** Call after sequencer animation completes to commit to React state.
       *  Reads from refs (not captured closure) so a submitWord() between
       *  startCascade() and commit() won't be overwritten. */
      commit: () => {
        setCurrentGrid(effectiveGridRef.current);
        setTileStates(tileStatesRef.current);
      },
    };
  }, [gridSize, language, specialTileChance, customDistribution, effectiveBlastSeed, options?.isMultiplayer, config.boardClearMode]);

  // ── shuffleGrid ──
  const shuffleGrid = useCallback(() => {
    const grid = effectiveGridRef.current;
    if (!grid) return;

    const tiles = tileStatesRef.current;
    const newGrid = grid.map((row, ri) =>
      row.map((cell, ci) => {
        if (tiles[ri]?.[ci]?.isCleared) return cell;
        return generateBlastLetter(language);
      }),
    );

    setCurrentGrid(newGrid);
    effectiveGridRef.current = newGrid;
    setNoWordsRemaining(false);
  }, [language]);

  // ── endGame ──
  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isDeadEnd: true }));
  }, []);

  // ── unlockMoves ──
  const unlockMoves = useCallback(() => {
    setGameState(prev => ({ ...prev, movesRemaining: Infinity, totalMoves: Infinity }));
  }, []);

  // ── getResults ──
  const getResults = useCallback((maxCombo: number, wavesCompleted = 0, waveResults: WaveResult[] = []): BlastResultsData => {
    const gs = gameStateRef.current;
    const clearPercentage = gs.totalTiles > 0 ? Math.min(100, Math.round((gs.tilesCleared / gs.totalTiles) * 100)) : 0;

    return {
      finalScore: gs.score,
      tilesCleared: gs.tilesCleared,
      totalTiles: gs.totalTiles,
      clearPercentage,
      wordsFound: gs.wordsFound,
      bestWord: bestWordRef.current || (gs.wordsFound[0] ?? ''),
      maxCombo,
      stars: calculateEarnedStars(gs.tilesCleared, gs.totalTiles),
      wavesCompleted,
      waveResults,
    };
  }, []);

  // ── trackWordFail ──
  const trackWordFail = useCallback(() => {
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'fail');
  }, []);

  // ── consumeMove — deduct a move without clearing tiles (invalid word penalty) ──
  const consumeMove = useCallback(() => {
    setGameState(prev => {
      if (!isFinite(prev.totalMoves)) return prev; // infinite-move mode — no penalty
      const newMovesRemaining = Math.max(0, prev.movesRemaining - 1);
      return { ...prev, movesRemaining: newMovesRemaining, movesUsed: prev.movesUsed + 1 };
    });
  }, []);

  return {
    grid: effectiveGrid,
    tileStates,
    gameState,
    submitWord,
    shuffleGrid,
    endGame,
    unlockMoves,
    getResults,
    isCascading,
    startCascade,
    setTileStates,
    trackWordFail,
    consumeMove,
    noWordsRemaining,
  };
}
