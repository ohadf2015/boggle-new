'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { generateTileStates } from '../utils/blastTileGeneration';
import { guaranteeObjectiveTiles } from '../utils/blastObjectiveGuarantee';
import { processTilesForWord } from '../utils/clearTilesProcessor';
import { applyVortexLetterSwaps } from '../utils/blastLetterSwaps';
import { applyBetweenTurnEffects } from '../utils/blastTileEffects';
import { computeThawedCells } from './blastCellFilterLogic';
import { computeGravityResult, type GravityResult } from '../utils/blastGravity';
import type { SpecialCombo } from '../utils/blastCombos';
import { hasValidWords } from '../utils/blastDeadEndDetector';
import { buildDeadEndGrid } from '../utils/blastDeadEndGrid';
import { calculateEarnedStars } from '../utils/blastStarCalculator';
import { blastBoardsEqual } from '../utils/blastBoardEquality';
import { calculateLeftoverMoveBonus, applyRevive } from '../utils/blastMoveUtils';
import { createDDAState, updateDDA, getDDASpawnModifier, isDDABoostActive } from '../utils/blastDDA';
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
  /**
   * Multiplayer ONLY: the server-authoritative letter grid (from the `startGame`
   * payload, already in the client store as `letterGrid`). When present the engine
   * uses THIS grid instead of generating its own via useGridInit — so the board the
   * player sees/validates matches the per-player board the server scores against.
   * Without it, client letters were locally random → every word mis-scored server-side.
   */
  mpInitialGrid?: LetterGrid | null;
  /** Minimum word length for dead-end detection (defaults to 2) */
  minWordLength?: number;
}

export interface WordSubmitResult {
  score: number;
  combos: SpecialCombo[];
  clearedTiles: Array<{ row: number; col: number; type: BlastTileType }>;
  explosions: Array<{ row: number; col: number; type: string }>;
  bonusMoves: number;
  /** Countdown tiles that exploded this turn (penalty applied) */
  countdownExplosions: Array<{ row: number; col: number }>;
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
  /** Rewarded-ad continue: clear dead-end and add bonus moves without resetting progress */
  revive: (bonusMoves: number) => void;
  getResults: (maxCombo: number, wavesCompleted?: number, waveResults?: WaveResult[], allObjectivesComplete?: boolean) => BlastResultsData;
  isCascading: boolean;
  startCascade: () => CascadeResult;
  stopCascade: () => void;
  setTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  /** Seed tile states from outside the engine (e.g. rewarded-ad bomb buff). Updates
   *  both React state AND the internal tileStatesRef so subsequent cascade/gravity
   *  reads (which canonicalize on the ref) see the seeded tiles. Plain setTileStates
   *  only writes React state, so the next move's gravity result, derived from the
   *  stale ref, would silently wipe the seed. */
  seedTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  trackWordFail: () => void;
  /** Consume a move without clearing tiles (e.g. invalid word submission) */
  consumeMove: () => void;
  /** Add bonus score points (e.g. hidden objective completion) */
  addBonusScore: (points: number) => void;
  noWordsRemaining: boolean;
  /** Read current grid/tileStates from refs — use in async loops where React state is stale */
  getLatestState: () => { grid: LetterGrid | null; tileStates: BlastTileState[][] };
  /** Apply server-authoritative board state (MP sync) */
  applyServerBoard: (newGrid: LetterGrid, newTileStates: BlastTileState[][]) => void;
  /** Sprint 1: visible "Lucky Boost" chip flips on after 2+ consecutive failed
   *  words. Singleplayer only — hidden state surfaced so players see when the
   *  game is helping them. Mirrors the boost gate in the spawn-modifier path. */
  ddaBoostActive: boolean;
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

  // MP determinism: mirror the server's seeded RNG in optimistic submits so
  // predicted rng-driven conversions (prism → specials) match the authoritative
  // board → applyServerBoard's equality guard no-ops → no tile flicker. Read the
  // seed via a ref so submitWord (deps [gridSize, currentWave]) never closes over
  // a stale seed after a board regen swaps it (regen sends a new seed).
  const blastSeedRef = useRef(effectiveBlastSeed);
  blastSeedRef.current = effectiveBlastSeed;
  // Counts valid words only (submitWord fires once per accepted word), mirroring
  // the server's monotonic board.totalMoves used as createSeededRandom(seed + N).
  const validMovesRef = useRef(0);

  // Grid generation via shared hook
  const { grid: initialGrid } = useGridInit({
    difficulty: WORD_DIFFICULTY_MAP[difficulty],
    language,
    mode: 'blast',
    rows: gridSize,
    cols: gridSize,
  });

  // Mutable grid — updated after each cascade. In multiplayer, seed from the
  // server-authoritative grid so the board never starts on a divergent local grid.
  const mpInitialGrid = options?.mpInitialGrid;
  const [currentGrid, setCurrentGrid] = useState<LetterGrid | null>(
    () => (mpInitialGrid && mpInitialGrid.length > 0 ? mpInitialGrid : null),
  );
  const effectiveGrid = currentGrid || initialGrid;
  const effectiveGridRef = useRef(effectiveGrid);
  // NOTE: Do NOT sync ref from state on every render (effectiveGridRef.current = effectiveGrid)
  // — during async cascades, React re-renders overwrite refs with stale pre-gravity state.
  // Sync only when initialGrid first loads (currentGrid is still null).
  useEffect(() => {
    if (!currentGrid && initialGrid) {
      effectiveGridRef.current = initialGrid;
    }
  }, [initialGrid, currentGrid]);

  // MP: if the server grid wasn't ready on first render (store populated a tick
  // later), adopt it as soon as it arrives. Guarded on !currentGrid so a later
  // server board-update (applyServerBoard) or cascade result is never clobbered.
  useEffect(() => {
    if (mpInitialGrid && mpInitialGrid.length > 0 && !currentGrid) {
      effectiveGridRef.current = mpInitialGrid;
      setCurrentGrid(mpInitialGrid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on first availability; !currentGrid guard prevents clobbering live board state
  }, [mpInitialGrid]);

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
      tileStatesRef.current = initialTileStatesFromOptions;
    }
  }, [initialTileStatesFromOptions]);

  const tileStatesRef = useRef(tileStates);
  // NOTE: Do NOT sync ref from state on every render — same reason as effectiveGridRef above.

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

  // Cascade tracking — React state so the `isCascading` return value gates
  // interactivity across renders (ref was always false because set+unset in same call).
  const [isCascading, setIsCascading] = useState(false);

  // DDA invisible assist
  const ddaStateRef = useRef(createDDAState());
  // Sprint 1: surface DDA boost as visible state so the HUD can render a
  // "Lucky Boost" chip. Synced via the existing updateDDA() call sites.
  const [ddaBoostActive, setDdaBoostActive] = useState(false);

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
    // Run initial dead-end check after a longer delay to let the board settle
    if (wordsFoundCount === 0) {
      const initialTimer = setTimeout(() => {
        if (!effectiveGrid || !isDictLoaded) return;
        const displayGrid = buildDeadEndGrid(effectiveGrid, tileStates);
        const foundSet = new Set<string>();
        const valid = hasValidWords(displayGrid, language, checkWordInDict, foundSet, options?.minWordLength ?? 2);
        setNoWordsRemaining(!valid);
      }, 1500);
      return () => clearTimeout(initialTimer);
    }

    // Build display grid (hide cleared tiles)
    const displayGrid = buildDeadEndGrid(effectiveGrid, tileStates);

    const timer = setTimeout(() => {
      const run = () => {
        const foundSet = new Set(gameState.wordsFound);
        const valid = hasValidWords(displayGrid, language, checkWordInDict, foundSet, options?.minWordLength ?? 2);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- minWordLength is stable config; including it would re-run dead-end detection on every render
  }, [isDictLoaded, effectiveGrid, gameState.isComplete, gameState.isDeadEnd, wordsFoundCount, gameState.wordsFound, language, checkWordInDict, tileStates, isCascading]);

  // ── Auto-end game when no valid words remain (after grace period for shuffle) ──
  useEffect(() => {
    if (!noWordsRemaining || gameState.isComplete || gameState.isDeadEnd) return;
    // Give player 2 seconds to use the shuffle button before ending
    const timer = setTimeout(() => {
      setGameState(prev => {
        if (prev.isComplete || prev.isDeadEnd) return prev;
        return { ...prev, isDeadEnd: true };
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [noWordsRemaining, gameState.isComplete, gameState.isDeadEnd]);

  // ── submitWord ──
  const submitWord = useCallback((
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number,
  ): WordSubmitResult => {
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'success');
    setDdaBoostActive(isDDABoostActive(ddaStateRef.current));

    const currentTiles = tileStatesRef.current;
    // MP: seed the clear RNG to match the server (createSeededRandom(seed + Nth
    // valid word)) so rng-driven conversions are predicted identically. SP leaves
    // rng undefined → processTilesForWord defaults to Math.random.
    let submitRng: (() => number) | undefined;
    if (options?.isMultiplayer && blastSeedRef.current != null) {
      validMovesRef.current += 1;
      submitRng = createSeededRandom(blastSeedRef.current + validMovesRef.current);
    }
    const result = processTilesForWord({ prev: currentTiles, path, word, baseScore, gridSize, currentWave, rng: submitRng });
    const { next, totalScore, newlyClearedCount, clearedTypeCounts, explosions: newExplosions, vortexLetterSwaps, detectedCombos, bonusMoveCount, diamondRevealTurns: newDiamondReveal, shuffleTriggered } = result;

    if (word.length > bestWordRef.current.length) bestWordRef.current = word;

    // Apply vortex letter swaps to grid (shared with the authoritative server
    // via applyVortexLetterSwaps so both sides swap identically).
    if (vortexLetterSwaps.length > 0) {
      const baseGrid = effectiveGridRef.current;
      if (baseGrid) {
        const swappedGrid = applyVortexLetterSwaps(baseGrid, vortexLetterSwaps);
        setCurrentGrid(swappedGrid);
        effectiveGridRef.current = swappedGrid;
      }
    }

    // Shuffle tile effect: Fisher-Yates rearrange all uncleared letters
    if (shuffleTriggered) {
      const baseGrid = effectiveGridRef.current;
      if (baseGrid) {
        const shuffledGrid = baseGrid.map(row => [...row]);
        const positions: Array<{ r: number; c: number }> = [];
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (!next[r][c].isCleared && !path.some(p => p.row === r && p.col === c)) {
              positions.push({ r, c });
            }
          }
        }
        const letters = positions.map(p => shuffledGrid[p.r][p.c]);
        for (let i = letters.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [letters[i], letters[j]] = [letters[j], letters[i]];
        }
        for (let i = 0; i < positions.length; i++) {
          shuffledGrid[positions[i].r][positions[i].c] = letters[i];
        }
        setCurrentGrid(shuffledGrid);
        effectiveGridRef.current = shuffledGrid;
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

    // Between-turn effects: countdown tick
    const betweenTurn = applyBetweenTurnEffects(tilesAfterThaw, gridSize);

    setTileStates(tilesAfterThaw);

    tileStatesRef.current = tilesAfterThaw;

    // Commit the grid together with the tile states so committed React state can
    // never LAG the refs. If an earlier cascade's grid commit was skipped (e.g. a
    // concurrency-guarded animation), `currentGrid` would otherwise stay a
    // generation behind `tileStates` — mapping live tiles onto a stale grid and
    // stranding letterless/mismatched cells on screen. For a normal word this is
    // the same array reference (React bails the re-render); it only does work when
    // state has actually diverged, healing it every turn.
    if (effectiveGridRef.current) setCurrentGrid(effectiveGridRef.current);

    // Count colored tiles in the path for color_power objective tracking
    const colorCounts = { pink: 0, cyan: 0, lime: 0 };
    for (const cell of path) {
      const tile = currentTiles[cell.row]?.[cell.col];
      if (tile?.colorTag === 'pink') colorCounts.pink++;
      else if (tile?.colorTag === 'cyan') colorCounts.cyan++;
      else if (tile?.colorTag === 'lime') colorCounts.lime++;
    }

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
        lastWordColorCounts: colorCounts,
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
    };
  }, [gridSize, currentWave, options?.isMultiplayer]);

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

    // Update refs immediately so subsequent engine calls see latest state.
    // Caller should call commit() BEFORE animation so tiles render at new
    // positions — the CSS keyframe handles the visual fall transition.
    effectiveGridRef.current = gravityResult.newGrid;
     
    tileStatesRef.current = gravityResult.newTileStates;

    return {
      gravity: gravityResult,
      hasNewWords: false,
      /** Call BEFORE sequencer animation to commit to React state.
       *  Tiles must be at new positions so CSS keyframe fall works correctly.
       *  Reads from refs (not captured closure) for consistency. */
      commit: () => {
        setCurrentGrid(effectiveGridRef.current);
        setTileStates(tileStatesRef.current);
      },
    };
  }, [gridSize, language, specialTileChance, customDistribution, effectiveBlastSeed, options?.isMultiplayer, config.boardClearMode]);

  // ── stopCascade — call after the entire cascade loop completes ──
  const stopCascade = useCallback(() => {
    setIsCascading(false);
  }, []);

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

  // ── revive — rewarded-ad "continue" flow: clear dead-end, add bonus moves
  const revive = useCallback((bonusMoves: number) => {
    setGameState(prev => applyRevive(prev, bonusMoves));
    setNoWordsRemaining(false);
  }, []);

  // ── getResults ──
  const getResults = useCallback((
    maxCombo: number,
    wavesCompleted = 0,
    waveResults: WaveResult[] = [],
    allObjectivesComplete?: boolean,
  ): BlastResultsData => {
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
      // 3 stars require both ≥80% clear AND every objective complete.
      // Without the flag, fall back to clear-pct-only (legacy callers).
      stars: calculateEarnedStars(gs.tilesCleared, gs.totalTiles, allObjectivesComplete),
      wavesCompleted,
      waveResults,
    };
  }, []);

  // ── trackWordFail ──
  const trackWordFail = useCallback(() => {
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'fail');
    setDdaBoostActive(isDDABoostActive(ddaStateRef.current));
  }, []);

  // ── consumeMove — deduct a move without clearing tiles (invalid word penalty) ──
  const consumeMove = useCallback(() => {
    setGameState(prev => {
      if (!isFinite(prev.totalMoves)) return prev; // infinite-move mode — no penalty
      const newMovesRemaining = Math.max(0, prev.movesRemaining - 1);
      return { ...prev, movesRemaining: newMovesRemaining, movesUsed: prev.movesUsed + 1 };
    });
  }, []);

  // ── addBonusScore — add points from hidden objective completion ──
  const addBonusScore = useCallback((points: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + points }));
  }, []);

  /** Read current grid/tileStates from refs (not React state) — use in async loops
   *  where React state may be stale due to batching. */
  const getLatestState = useCallback(() => ({
    grid: effectiveGridRef.current,
    tileStates: tileStatesRef.current,
  }), []);

  /** Seed tile states from outside the engine while keeping the canonical ref
   *  in sync — see UseBlastEngineReturn.seedTileStates docstring. */
  const seedTileStates = useCallback((updater: (prev: BlastTileState[][]) => BlastTileState[][]) => {
    const next = updater(tileStatesRef.current);
    tileStatesRef.current = next;
    setTileStates(next);
  }, []);

  /** Apply server-authoritative board state (MP sync) */
  const applyServerBoard = useCallback((newGrid: LetterGrid, newTileStates: BlastTileState[][]) => {
    // Skip the wholesale replacement when the authoritative board already matches
    // the client's optimistic prediction. Replacing an identical board still
    // re-renders every tile (positional keys + AnimatePresence) → visible
    // flicker. Only apply when the server actually diverges (a real correction).
    const curGrid = effectiveGridRef.current;
    const curTiles = tileStatesRef.current;
    if (curGrid && curTiles.length > 0 && blastBoardsEqual(curGrid, curTiles, newGrid, newTileStates)) {
      return;
    }
    effectiveGridRef.current = newGrid;
    setCurrentGrid(newGrid);
    tileStatesRef.current = newTileStates;
    setTileStates(() => newTileStates);
  }, []);

  // Stable actions object — functions never change identity, so use empty deps
  const actions = useMemo(() => ({
    submitWord,
    shuffleGrid,
    endGame,
    unlockMoves,
    revive,
    getResults,
    startCascade,
    stopCascade,
    setTileStates,
    seedTileStates,
    trackWordFail,
    consumeMove,
    addBonusScore,
    getLatestState,
    applyServerBoard,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Combined return: reactive state + stable actions spread
  return useMemo(() => ({
    grid: effectiveGrid,
    tileStates,
    gameState,
    isCascading,
    noWordsRemaining,
    ddaBoostActive,
    ...actions,
  }), [effectiveGrid, tileStates, gameState, isCascading, noWordsRemaining, ddaBoostActive, actions]);
}
