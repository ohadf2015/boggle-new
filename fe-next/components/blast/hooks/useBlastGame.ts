'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { hasValidWords } from '../utils/blastDeadEndDetector';
import { generateBlastLetter } from '../utils/blastLetterGenerator';
import { createDDAState, updateDDA, getDDASpawnModifier } from '../utils/blastDDA';

import type { BlastComboType } from '../utils/blastCombos';
import { processTilesForWord } from './clearTilesProcessor';
import type { LetterGrid } from '@/shared/types/game';
import {
  DEFAULT_BLAST_CONFIG,
  type BlastGameConfig,
  type BlastGameState,
  type BlastTileState,
  type BlastTileType,
  type BlastResultsData,
  type BlastExplosion,
  type BlastScorePopup,
} from '../types';
import { useBlastCascade } from './useBlastCascade';
import { useBlastCascadeHandler } from './useBlastCascadeHandler';
import { generateTileStates } from '../utils/blastTileGeneration';
import { getWaveConfig } from '../utils/blastWaveConfig';
import { guaranteeObjectiveTiles } from '../utils/blastObjectiveGuarantee';
import { calculateEarnedStars } from '../utils/blastStarCalculator';
import { calculateLeftoverMoveBonus } from '../utils/blastMoveUtils';

import { useBlastSeed } from '@/hooks/gameState';
import type { UseBlastGameReturn, UseBlastGameOptions } from './useBlastGame.types';

export type { UseBlastGameReturn, UseBlastGameOptions };

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
  const { gridSize, specialTileChance, language, difficulty = 'medium', customDistribution } = config;

  // Read blast seed from store (set by server via startGame event in multiplayer).
  // options.blastSeed takes precedence; falls back to store value; finally null (singleplayer).
  const storedBlastSeed = useBlastSeed();
  const effectiveBlastSeed = options?.blastSeed ?? storedBlastSeed ?? null;

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

  // Move limit from options (default: unlimited via high number)
  const movesAllowed = options?.movesAllowed ?? Infinity;
  // Current wave number for Treasure Gem spawn gating + Frost inner type gating (default: 1)
  const currentWave = options?.currentWave ?? 1;

  // Tile state management — use server overlay in multiplayer, else generate locally
  const [tileStates, setTileStates] = useState<BlastTileState[][]>(() => {
    if (options?.initialTileStates) return options.initialTileStates;
    const tiles = generateTileStates(gridSize, specialTileChance, Date.now(), customDistribution, currentWave);
    return options?.waveObjectives
      ? guaranteeObjectiveTiles(tiles, options.waveObjectives)
      : tiles;
  });

  // Sync tile states when server overlay arrives after mount (multiplayer race condition)
  const initialTileStatesFromOptions = options?.initialTileStates;
  useEffect(() => {
    if (initialTileStatesFromOptions && initialTileStatesFromOptions.length > 0) {
      setTileStates(initialTileStatesFromOptions);
    }
  }, [initialTileStatesFromOptions]);

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
    tileTypeClears: {} as Record<import('../types').BlastTileType, number>,
  });

  // Explosions for animation
  const [explosions, setExplosions] = useState<BlastExplosion[]>([]);

  // Score popups for floating score display
  const [scorePopups, setScorePopups] = useState<BlastScorePopup[]>([]);

  // Track best word and total words cleared for results
  const bestWordRef = useRef<string>('');
  const totalWordsClearedRef = useRef(0);

  // Active combo flash state — set when a special combination fires, cleared by BlastComboFlash
  const [activeComboFlash, setActiveComboFlash] = useState<{ id: string; comboType: BlastComboType } | null>(null);
  const clearComboFlash = useCallback(() => setActiveComboFlash(null), []);
  // External trigger — used by multiplayer blastComboSync to show another player's combo flash.
  // Cast comboType to BlastComboType; unknown types render as a generic flash.
  const triggerComboFlash = useCallback((comboType: string) => {
    setActiveComboFlash({ id: `combo-sync-${Date.now()}`, comboType: comboType as BlastComboType });
  }, []);
  // Ref so clearTilesForWord callback can access onSynergyDetected without stale closure
  const onSynergyDetectedRef = useRef(options?.onSynergyDetected);
  onSynergyDetectedRef.current = options?.onSynergyDetected;
  // Ref so clearTilesForWord callback can access onComboDetected without stale closure
  const onComboDetectedRef = useRef(options?.onComboDetected);
  onComboDetectedRef.current = options?.onComboDetected;

  // DDA state — invisible assist for special tile spawn (PSYC-04)
  // Ref-based so cascade callbacks always read the latest value without re-render
  const ddaStateRef = useRef(createDDAState());
  const cascadeTimerRef = useRef<number | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  // BUGF-07 fix: ref for latest tileStates so cascade timer doesn't use stale closure
  const tileStatesRef = useRef(tileStates);
  tileStatesRef.current = tileStates;
  const onAutoCascadeWordRef = useRef(options?.onAutoCascadeWord);
  // Ref so moves-exhausted effect always calls latest callback (fix: stale closure)
  const onMovesExhaustedRef = useRef(options?.onMovesExhausted);
  onMovesExhaustedRef.current = options?.onMovesExhausted;
  onAutoCascadeWordRef.current = options?.onAutoCascadeWord;

  // Cascade hook — pass blastSeed for deterministic multiplayer refills
  const cascade = useBlastCascade({
    gridSize,
    language,
    specialTileChance,
    customDistribution,
    blastSeed: effectiveBlastSeed,
  });

  // The effective grid = currentGrid (post-cascade) or initialGrid (pre-first-cascade)
  const effectiveGrid = currentGrid || initialGrid;
  // Ref for cascade setTimeout — avoids stale closure over effectiveGrid
  const effectiveGridRef = useRef(effectiveGrid);
  effectiveGridRef.current = effectiveGrid;

  // Derive a bitmask signature of cleared cells so displayGrid only recomputes
  // when actual cleared positions change (not on every tileState mutation like
  // hitsRemaining decrements, activationEffect changes, etc.)
  const clearedSignature = useMemo(() => {
    return tileStates.map(row => row.map(t => t.isCleared ? 1 : 0).join('')).join('|');
  }, [tileStates]);

  // Display grid: show letters for non-cleared tiles, empty for cleared
  const displayGrid = useMemo<LetterGrid | null>(() => {
    if (!effectiveGrid) return null;
    return effectiveGrid.map((row, ri) =>
      row.map((cell, ci) =>
        tileStates[ri]?.[ci]?.isCleared ? '' : cell
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- clearedSignature is the derived dependency
  }, [effectiveGrid, clearedSignature]);

  // Dictionary cache (moved up — used by both cascade detection and dead-end detection)
  const { checkWord: checkWordInDict, isLoaded: isDictLoaded } = useDictionaryCache(language);

  // Cascade handler (extracted for maintainability)
  const {
    handleCascadeComplete,
    cascadeChainLevelRef,
    isAutoDetecting,
    autoDetectTimerRef,
    highlightTimerRef,
    cascadeHighlightPhase,
    cascadeHighlightData,
    setCascadeHighlightPhase,
    setCascadeHighlightData,
    setIsAutoDetecting,
  } = useBlastCascadeHandler({
    isDictLoaded,
    checkWordInDict,
    cascade,
    gameStateRef,
    tileStatesRef,
    onAutoCascadeWordRef,
    setTileStates,
    setCurrentGrid,
    setGameState,
    setExplosions,
    setScorePopups,
    maxCascadeChain: getWaveConfig(currentWave).maxCascadeChain,
  });

  // Dead-end detection state
  const [noWordsRemaining, setNoWordsRemaining] = useState(false);


  // Extract specific fields to avoid re-running effects on unrelated gameState changes (e.g. score)
  const { tilesCleared, totalTiles, isComplete, isDeadEnd, movesRemaining: gsMovesRemaining, movesUsed, totalMoves: gsTotalMoves } = gameState;

  // Auto-complete when cumulative tilesCleared reaches the board size
  // Award leftover move bonus (Sugar Crush equivalent)
  // Skipped in multiplayer — server timer is authoritative; tiles keep cascading/refilling
  useEffect(() => {
    if (options?.isMultiplayer) return;
    if (!isComplete && !isDeadEnd && tilesCleared >= totalTiles && totalTiles > 0) {
      const bonus = calculateLeftoverMoveBonus(gsMovesRemaining);
      setGameState(prev => ({
        ...prev,
        isComplete: true,
        bonusMoveScore: bonus,
        score: prev.score + bonus,
      }));
    }
  }, [tilesCleared, totalTiles, isComplete, isDeadEnd, gsMovesRemaining, options?.isMultiplayer]);

  // Game over when moves exhausted (only if move limit is finite)
  // Skipped in multiplayer — moves are unlimited, timer controls game end
  useEffect(() => {
    if (options?.isMultiplayer) return;
    if (!isComplete && !isDeadEnd && movesUsed > 0 && gsMovesRemaining <= 0 && isFinite(gsTotalMoves)) {
      if (onMovesExhaustedRef.current) {
        onMovesExhaustedRef.current();
      } else {
        setGameState(prev => ({ ...prev, isDeadEnd: true }));
      }
    }
   
  }, [isComplete, isDeadEnd, movesUsed, gsMovesRemaining, gsTotalMoves, options?.isMultiplayer]);

  // Dead-end detection: check after cascade settles AND auto-detection completes.
  // Skip during cascade/auto-detect phases — no interactive dead-end is possible while cascading.
  // Use wordsFound.length (not array ref) to avoid re-running on every push.
  const wordsFoundCount = gameState.wordsFound.length;
  // Ref to track the latest requestIdleCallback handle for cleanup
  const deadEndIdleRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isDictLoaded || !displayGrid) return;
    if (gameState.isComplete || gameState.isDeadEnd) return;
    if (cascade.cascadePhase !== 'idle') return;
    if (isAutoDetecting) return;
    // Only check after at least one word has been found (skip initial load)
    if (wordsFoundCount === 0) return;

    // Debounce 500ms (up from 300ms) + requestIdleCallback to avoid blocking
    // the main thread post-cascade. The DFS can take 15-25ms on a 6x6 grid.
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
  }, [isDictLoaded, displayGrid, cascade.cascadePhase, isAutoDetecting, gameState.isComplete, gameState.isDeadEnd, wordsFoundCount, gameState.wordsFound, language, checkWordInDict]);

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
   *
   * Tile effect logic delegated to blastTileEffects.ts for maintainability.
   */
  const clearTilesForWord = useCallback((
    path: Array<{ row: number; col: number }>,
    word: string,
    baseScore: number,
    preDetectedCombos?: import('../utils/blastCombos').SpecialCombo[],
  ) => {
    // Track word success for DDA (invisible assist)
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'success');

    // New player word = new cascade chain
    cascadeChainLevelRef.current = 0;
    if (autoDetectTimerRef.current) { clearTimeout(autoDetectTimerRef.current); autoDetectTimerRef.current = null; }
    if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    setIsAutoDetecting(false);
    setCascadeHighlightPhase('idle');
    setCascadeHighlightData(null);

    // Compute tile processing result eagerly using ref (avoids stale closure).
    // All state updates happen in the outer scope where React 18 auto-batches them.
    const currentTiles = tileStatesRef.current;
    const result = processTilesForWord({ prev: currentTiles, path, word, baseScore, gridSize, currentWave, preDetectedCombos });
    const { next, totalScore, newlyClearedCount, clearedTypeCounts, explosions: newExplosions, vortexLetterSwaps, detectedCombos, bonusMoveCount, pendingPopups } = result;

    totalWordsClearedRef.current += path.length;
    if (word.length > bestWordRef.current.length) bestWordRef.current = word;

    // All setState calls below are in the same synchronous scope — React 18 auto-batches them
    setTileStates(next);

    if (detectedCombos.length > 0) {
      setActiveComboFlash({ id: `combo-flash-${Date.now()}`, comboType: detectedCombos[0].type });
      onSynergyDetectedRef.current?.(detectedCombos[0].type, detectedCombos[0].scoreMultiplier);
      onComboDetectedRef.current?.(detectedCombos);
    }

    setGameState(prevGS => {
      const newMovesRemaining = Math.max(0, prevGS.movesRemaining - 1) + bonusMoveCount;
      const mergedTypeClears = { ...prevGS.tileTypeClears };
      for (const [tType, count] of Object.entries(clearedTypeCounts)) {
        mergedTypeClears[tType as BlastTileType] = (mergedTypeClears[tType as BlastTileType] || 0) + (count as number);
      }
      return { ...prevGS, score: prevGS.score + totalScore, wordsFound: [...prevGS.wordsFound, word], tilesCleared: prevGS.tilesCleared + newlyClearedCount, movesRemaining: newMovesRemaining, movesUsed: prevGS.movesUsed + 1, tileTypeClears: mergedTypeClears };
    });

    if (newExplosions.length > 0) setExplosions(prevExp => [...prevExp, ...newExplosions]);

    // Trigger cascade — apply vortex letter swaps to grid
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

    // Read grid from ref inside setTimeout to avoid stale closure
    const ddaModifier = getDDASpawnModifier(ddaStateRef.current);
    cascadeTimerRef.current = window.setTimeout(() => {
      cascadeTimerRef.current = null;
      const gridForCascade = effectiveGridRef.current;
      if (gridForCascade) {
        cascade.startCascade(gridForCascade, next, handleCascadeComplete, ddaModifier);
      }
    }, 80);

    if (pendingPopups.length > 0) setScorePopups(prevPop => [...prevPop, ...pendingPopups]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs and state setters are stable
  }, [gridSize, effectiveGrid, cascade, handleCascadeComplete, currentWave]);

  /** End the game manually */
  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isDeadEnd: true }));
  }, []);

  /** Switch to unlimited moves (soft pressure mode for multiplayer) */
  const unlockMoves = useCallback(() => {
    setGameState(prev => ({ ...prev, movesRemaining: Infinity, totalMoves: Infinity }));
  }, []);

  /** Generate results data for the results screen */
  const getResultsData = useCallback((maxCombo: number, wavesCompleted = 0, waveResults: import('../types').WaveResult[] = []): BlastResultsData => {
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
      stars: calculateEarnedStars(tilesCleared, totalTiles),
      wavesCompleted,
      waveResults,
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

  /**
   * Track a word failure for invisible DDA assist (PSYC-04).
   * Call from BlastGame when useWordSubmission fires onWordRejected.
   * After 3+ consecutive calls, the next gravity refill spawns more special tiles.
   */
  const trackWordFail = useCallback(() => {
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'fail');
  }, []);

  /**
   * Add a visual explosion at a grid position.
   * Used by Sugar Crush sequence to show conversion effects.
   * Maps tileType string to the closest valid BlastExplosion type.
   */
  const addExplosionCallback = useCallback((row: number, col: number, tileType: string) => {
    const validTypes = ['word', 'bomb', 'clear', 'cascade', 'lightning', 'magnet', 'prism', 'gem', 'combo', 'mega_blast', 'total_destruction'] as const;
    type ExplosionType = typeof validTypes[number];
    const explosionType: ExplosionType = validTypes.includes(tileType as ExplosionType)
      ? (tileType as ExplosionType)
      : 'bomb'; // Default to bomb for standard type mappings

    setExplosions(prev => [
      ...prev,
      {
        id: `sugar-crush-${row}-${col}-${Date.now()}`,
        row,
        col,
        type: explosionType,
        intensity: 2,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  /**
   * Add bonus score to game state (used by Sugar Crush).
   */
  const addBonusScore = useCallback((bonus: number) => {
    setGameState(prev => ({ ...prev, score: prev.score + bonus }));
  }, []);

  // Cleanup cascade timer on unmount
  useEffect(() => {
    return () => { if (cascadeTimerRef.current !== null) clearTimeout(cascadeTimerRef.current); };
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
    isCascading: cascade.isAnimating || isAutoDetecting || cascadeHighlightPhase === 'highlighting',
    cascadeAnimationData: cascade.animationData,
    cascadeChainLevel: gameState.cascadeChainLevel,
    cascadeHighlightPhase,
    cascadeHighlightData,
    activeComboFlash,
    clearComboFlash,
    triggerComboFlash,
    trackWordFail,
    setTileStates,
    addExplosion: addExplosionCallback,
    addBonusScore,
    unlockMoves,
  };
}
