'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { hasValidWords } from '../utils/blastDeadEndDetector';
import { generateBlastLetter } from '../utils/blastLetterGenerator';
import { createDDAState, updateDDA, getDDASpawnModifier } from '../utils/blastDDA';
import { detectVerticalWords } from '../utils/blastVerticalScanner';
import { detectSpecialCombos, type BlastComboType, type SpecialCombo } from '../utils/blastCombos';
import { executeComboEffect } from '../utils/blastComboEffects';
import { getWordLengthScaleFactor } from '../utils/blastComboScaling';
import type { LetterGrid } from '@/shared/types/game';
import {
  DEFAULT_BLAST_CONFIG,
  GOLD_MULTIPLIER,
  BOMB_RADIUS,
  BOMB_AREA_CLEAR_BONUS,
  RAINBOW_BOOST_MULTIPLIER,
  CHAIN_BOMB_STAGGER,
  LIGHTNING_COLUMN_CLEAR_BONUS,
  ICE_CLEAR_BONUS,
  FROZEN_CLEAR_BONUS,
  MAGNET_RADIUS,
  MAGNET_ATTRACT_BONUS,
  PRISM_USE_BONUS,
  PRISM_CROSS_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
  TREASURE_GEM_SPAWN_COUNT,
  SPECIAL_TILE_DISTRIBUTION,
  MAX_CASCADE_CHAIN,
  MAX_CASCADE_WORDS_PER_LEVEL,
  CASCADE_MIN_WORD_LENGTH,
  CASCADE_DETECTION_DELAY,
  CASCADE_CHAIN_BONUS_MULTIPLIER,
  CASCADE_HIGHLIGHT_DURATION,
  CASCADE_HIGHLIGHT_LINGER,
  VORTEX_PULL_RADIUS,
  VORTEX_EXPLODE_RADIUS,
  VORTEX_PULL_BONUS,
  VORTEX_EXPLODE_BONUS,
  FROST_REVEAL_BONUS,
  MIRROR_MULTIPLIER,
  SILVER_MULTIPLIER,
  DIAMOND_MULTIPLIER,
  type BlastGameConfig,
  type BlastGameState,
  type BlastTileState,
  type BlastTileType,
  type BlastResultsData,
  type BlastExplosion,
  type BlastScorePopup,
  type CascadeHighlightPhase,
  type CascadeHighlightData,
} from '../types';
import { useBlastCascade, type BlastCascadePhase, type CascadeAnimationData } from './useBlastCascade';
import { getInitialHitsRemaining } from '../utils/blastTileUtils';
import { guaranteeObjectiveTiles } from '../utils/blastObjectiveGuarantee';
import { calculateEarnedStars } from '../utils/blastStarCalculator';
import { calculateBonusMoves, calculateLeftoverMoveBonus } from '../utils/blastMoveUtils';
import { getWaveConfig, getWaveDistribution } from '../utils/blastWaveConfig';

// ==================== Helpers ====================

/** Seeded random for consistent tile placement per grid */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Roll a special tile type from a distribution map using a given random value */
function rollSpecialFromDistribution(
  roll: number,
  dist: Record<string, number>,
): BlastTileType {
  let cumulative = 0;
  for (const [tileType, weight] of Object.entries(dist)) {
    if (weight <= 0) continue;
    cumulative += weight;
    if (roll < cumulative) return tileType as BlastTileType;
  }
  return 'standard'; // Fallback (catches rounding errors)
}

/**
 * Valid inner types for Frost tiles — only explosion/effect specials, not obstacles or multipliers.
 * Wave-gating is applied at call site using rollSpecialFromDistribution with wave distribution.
 */
const FROST_INNER_CANDIDATES: BlastTileType[] = ['bomb', 'lightning', 'prism', 'gem', 'rainbow'];

/** Generate initial tile states with special tile placement */
function generateTileStates(
  gridSize: number,
  specialTileChance: number,
  seed: number = Date.now(),
  customDistribution?: Record<string, number>,
  currentWave: number = 1,
): BlastTileState[][] {
  const random = seededRandom(seed);
  const tiles: BlastTileState[][] = [];
  const dist = customDistribution ?? SPECIAL_TILE_DISTRIBUTION;

  // Build wave-gated distribution for frost inner type selection
  const waveConfigForFrost = getWaveConfig(currentWave);
  const waveDistForFrost = getWaveDistribution(waveConfigForFrost);
  // Filter to only frost-eligible inner types (explosion/effect specials)
  const frostInnerDist: Record<string, number> = {};
  for (const t of FROST_INNER_CANDIDATES) {
    if ((waveDistForFrost[t] ?? 0) > 0) {
      frostInnerDist[t] = waveDistForFrost[t] ?? 0;
    }
  }
  // Normalize to sum to 1.0 so rollSpecialFromDistribution doesn't fall through to standard
  const frostInnerTotal = Object.values(frostInnerDist).reduce((a, b) => a + b, 0);
  if (frostInnerTotal > 0) {
    for (const k of Object.keys(frostInnerDist)) {
      frostInnerDist[k] /= frostInnerTotal;
    }
  }
  // Fallback: if wave gating excludes all candidates, use bomb+rainbow as safe defaults
  const hasFrostInnerCandidates = Object.values(frostInnerDist).some(v => v > 0);
  const effectiveFrostInnerDist = hasFrostInnerCandidates
    ? frostInnerDist
    : { bomb: 0.5, rainbow: 0.5 };

  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      let type: BlastTileType = 'standard';

      if (random() < specialTileChance) {
        type = rollSpecialFromDistribution(random(), dist);
      }

      // Frost (frozen) tiles get an innerType assigned at generation:
      // the hidden special that activates on the second (freeing) hit.
      const innerType: BlastTileType | undefined =
        type === 'frozen'
          ? rollSpecialFromDistribution(random(), effectiveFrostInnerDist)
          : undefined;

      tiles[row][col] = {
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: getInitialHitsRemaining(type),
        ...(innerType !== undefined ? { innerType } : {}),
      };
    }
  }

  return tiles;
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
  /** Cascade highlight phase (idle or highlighting) */
  cascadeHighlightPhase: CascadeHighlightPhase;
  /** Cascade highlight data (words being showcased before clearing) */
  cascadeHighlightData: CascadeHighlightData | null;
  // Legacy alias
  modifiedGrid: LetterGrid | null;
  /** Active combo flash to show on screen (null when no flash) */
  activeComboFlash: { id: string; comboType: BlastComboType } | null;
  /** Clear the active combo flash (called after animation completes) */
  clearComboFlash: () => void;
  /**
   * Track a word rejection for DDA (invisible assist).
   * Call when useWordSubmission fires onWordRejected.
   * After 3+ consecutive calls the next gravity refill will spawn more special tiles.
   */
  trackWordFail: () => void;
}

export interface UseBlastGameOptions {
  /** Called when an auto-cascade detects and clears a vertical word */
  onAutoCascadeWord?: (word: string, score: number, chainLevel: number) => void;
  /** Number of moves allowed for this wave (from WaveConfig.movesAllowed) */
  movesAllowed?: number;
  /** Wave objectives — when provided, board generation guarantees enough tiles for collect_type/clear_all_type objectives */
  waveObjectives?: import('../types').BlastObjective[];
  /** Current wave number — used for Treasure Gem spawn distribution gating (default: 1) */
  currentWave?: number;
  /** Called when a special combination is detected (e.g. for audio sting) */
  onSynergyDetected?: (comboType: BlastComboType) => void;
  /** Called when special combinations are detected — for first-time discovery tracking */
  onComboDetected?: (combos: SpecialCombo[]) => void;
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
  const { gridSize, specialTileChance, language, difficulty = 'medium', customDistribution } = config;

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

  // Tile state management — guarantee objective tiles are present on the board
  const [tileStates, setTileStates] = useState<BlastTileState[][]>(() => {
    const tiles = generateTileStates(gridSize, specialTileChance, Date.now(), customDistribution, currentWave);
    return options?.waveObjectives
      ? guaranteeObjectiveTiles(tiles, options.waveObjectives)
      : tiles;
  });

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

  // Cascade highlight state — visible glow before tiles clear
  const [cascadeHighlightPhase, setCascadeHighlightPhase] = useState<CascadeHighlightPhase>('idle');
  const [cascadeHighlightData, setCascadeHighlightData] = useState<CascadeHighlightData | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active combo flash state — set when a special combination fires, cleared by BlastComboFlash
  const [activeComboFlash, setActiveComboFlash] = useState<{ id: string; comboType: BlastComboType } | null>(null);
  const clearComboFlash = useCallback(() => setActiveComboFlash(null), []);
  // Ref so clearTilesForWord callback can access onSynergyDetected without stale closure
  const onSynergyDetectedRef = useRef(options?.onSynergyDetected);
  onSynergyDetectedRef.current = options?.onSynergyDetected;
  // Ref so clearTilesForWord callback can access onComboDetected without stale closure
  const onComboDetectedRef = useRef(options?.onComboDetected);
  onComboDetectedRef.current = options?.onComboDetected;

  // DDA state — invisible assist for special tile spawn (PSYC-04)
  // Ref-based so cascade callbacks always read the latest value without re-render
  const ddaStateRef = useRef(createDDAState());

  // Cascade chain refs (avoid re-renders + break circular useCallback dependency)
  const cascadeChainLevelRef = useRef(0);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  // BUGF-07 fix: ref for latest tileStates so cascade timer doesn't use stale closure
  const tileStatesRef = useRef(tileStates);
  tileStatesRef.current = tileStates;
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const autoDetectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutoCascadeWordRef = useRef(options?.onAutoCascadeWord);
  onAutoCascadeWordRef.current = options?.onAutoCascadeWord;

  // Cascade hook
  const cascade = useBlastCascade({
    gridSize,
    language,
    specialTileChance,
    customDistribution,
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
        // BUGF-04 fix: use empty foundSet for cascade detection so re-formed words
        // always score after gravity. Cascade words are new formations — not duplicates.
        const foundSet = new Set<string>();
        const columnFilter = affectedColumns.length > 0 ? new Set(affectedColumns) : undefined;
        const allVerticalWords = detectVerticalWords(newGrid, newTileStates, checkWordInDict, foundSet, CASCADE_MIN_WORD_LENGTH, columnFilter);
        // Cap words per cascade level to limit simultaneous explosions
        const verticalWords = allVerticalWords.slice(0, MAX_CASCADE_WORDS_PER_LEVEL);

        if (verticalWords.length > 0) {
          const chainLevel = cascadeChainLevelRef.current + 1;
          cascadeChainLevelRef.current = chainLevel;

          // Pre-calculate scores for highlight banners
          const highlightWords = verticalWords.map(vw => {
            const baseScore = vw.word.length - 1;
            const chainBonus = Math.floor(baseScore * chainLevel * CASCADE_CHAIN_BONUS_MULTIPLIER);
            return {
              word: vw.word,
              path: vw.path,
              score: baseScore + chainBonus,
              chainLevel,
            };
          });

          // Show cascade highlight overlay (glow + banner)
          setCascadeHighlightData({ words: highlightWords });
          setCascadeHighlightPhase('highlighting');
          setIsAutoDetecting(false);

          // After showcase duration, clear tiles and trigger next cascade
          if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
          highlightTimerRef.current = setTimeout(() => {
            // Now actually clear the tiles
            const newExplosions: BlastExplosion[] = [];
            const now = Date.now();
            let totalCascadeScore = 0;
            let newlyClearedCount = 0;
            const cascadeWords: string[] = [];
            const cascadeClearedTypes: Partial<Record<BlastTileType, number>> = {};

            // BUGF-07 fix: use tileStatesRef.current (always fresh) instead of
            // closure-captured newTileStates (may be stale if state updated during timer wait)
            const nextTileStates = tileStatesRef.current.map(row => row.map(tile => ({ ...tile })));

            for (const vw of verticalWords) {
              const baseScore = vw.word.length - 1;
              const chainBonus = Math.floor(baseScore * chainLevel * CASCADE_CHAIN_BONUS_MULTIPLIER);
              const wordScore = baseScore + chainBonus;
              totalCascadeScore += wordScore;
              cascadeWords.push(vw.word);

              for (const cell of vw.path) {
                const t = nextTileStates[cell.row][cell.col];
                if (!t.isCleared) {
                  // BUGF-05 fix: multi-hit tiles (frozen/ice) crack instead of clear
                  // when they have hitsRemaining > 1 — only the final hit clears them.
                  if ((t.type === 'frozen' || t.type === 'ice') && t.hitsRemaining > 1) {
                    t.hitsRemaining--;
                    t.activationEffect = `${t.type}-crack`;
                  } else {
                    t.isCleared = true;
                    newlyClearedCount++;
                    cascadeClearedTypes[t.type] = (cascadeClearedTypes[t.type] || 0) + 1;
                  }
                }
              }

              const midIdx = Math.floor(vw.path.length / 2);
              newExplosions.push({
                id: `cascade-${now}-${vw.column}-${vw.startRow}`,
                row: vw.path[midIdx].row,
                col: vw.path[midIdx].col,
                type: 'cascade',
                intensity: 1,
                timestamp: now,
              });

              setScorePopups(prev => [...prev, {
                id: `cascade-score-${now}-${vw.column}-${vw.startRow}`,
                score: wordScore,
                row: vw.path[midIdx].row,
                col: vw.path[midIdx].col,
                isSpecial: true,
                timestamp: now,
              }]);

              onAutoCascadeWordRef.current?.(vw.word, wordScore, chainLevel);
            }

            setGameState(prev => {
              const mergedTypeClears = { ...prev.tileTypeClears };
              for (const [tType, count] of Object.entries(cascadeClearedTypes)) {
                mergedTypeClears[tType as BlastTileType] = (mergedTypeClears[tType as BlastTileType] || 0) + (count as number);
              }
              return {
                ...prev,
                score: prev.score + totalCascadeScore,
                wordsFound: [...prev.wordsFound, ...cascadeWords],
                tilesCleared: prev.tilesCleared + newlyClearedCount,
                cascadeChainLevel: chainLevel,
                tileTypeClears: mergedTypeClears,
              };
            });

            setExplosions(prev => [...prev, ...newExplosions]);
            setTileStates(nextTileStates);

            // Clear highlight state
            setCascadeHighlightPhase('idle');
            setCascadeHighlightData(null);

            // Trigger next cascade (gravity + refill)
            setTimeout(() => {
              cascade.startCascade(newGrid, nextTileStates, handleCascadeCompleteRef.current);
            }, 80);
          }, CASCADE_HIGHLIGHT_DURATION + CASCADE_HIGHLIGHT_LINGER);
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

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (autoDetectTimerRef.current) clearTimeout(autoDetectTimerRef.current);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
  }, []);

  // Auto-complete when cumulative tilesCleared reaches the board size
  // Award leftover move bonus (Sugar Crush equivalent)
  useEffect(() => {
    const { tilesCleared, totalTiles, isComplete, isDeadEnd, movesRemaining } = gameState;
    if (!isComplete && !isDeadEnd && tilesCleared >= totalTiles && totalTiles > 0) {
      const bonus = calculateLeftoverMoveBonus(movesRemaining);
      setGameState(prev => ({
        ...prev,
        isComplete: true,
        bonusMoveScore: bonus,
        score: prev.score + bonus,
      }));
    }
  }, [gameState]);

  // Game over when moves exhausted (only if move limit is finite)
  useEffect(() => {
    const { movesRemaining, isComplete, isDeadEnd, movesUsed } = gameState;
    if (!isComplete && !isDeadEnd && movesUsed > 0 && movesRemaining <= 0 && isFinite(gameState.totalMoves)) {
      setGameState(prev => ({ ...prev, isDeadEnd: true }));
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
    // Track word success for DDA (invisible assist)
    ddaStateRef.current = updateDDA(ddaStateRef.current, 'success');

    // New player word = new cascade chain
    cascadeChainLevelRef.current = 0;
    // Cancel any pending auto-detection or highlight from a previous cascade
    if (autoDetectTimerRef.current) {
      clearTimeout(autoDetectTimerRef.current);
      autoDetectTimerRef.current = null;
    }
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setIsAutoDetecting(false);
    setCascadeHighlightPhase('idle');
    setCascadeHighlightData(null);

    setTileStates(prev => {
      const next = prev.map(row => row.map(tile => ({ ...tile })));
      let bonusScore = 0;
      const newExplosions: BlastExplosion[] = [];
      const now = Date.now();

      // Clear path tiles and collect effects
      let newlyClearedCount = 0;
      const clearedTypeCounts: Partial<Record<BlastTileType, number>> = {};
      // BUGF-06 fix: track gold tiles multiplicatively (3^n) not additively (n*(3-1))
      let goldMultiplier = 1;
      // Treasure Gem: count gems completing this word to spawn specials after path loop
      let gemsCompletedThisWord = 0;

      // ── Rainbow Boost pre-scan ──────────────────────────────────────────────
      // Rank offensive specials (explosion/clear effects). Gold/silver/diamond are
      // score multipliers (not explosions) — excluded. Ice/frozen have no explosion effect.
      const OFFENSIVE_RANK: Partial<Record<BlastTileType, number>> = {
        prism: 5,
        lightning: 4,
        bomb: 3,
        gem: 2,
        magnet: 1,
      };
      let bestOffensiveSpecial: BlastTileType | null = null;
      let bestOffensiveRank = -1;
      const hasRainbow = path.some(cell => prev[cell.row]?.[cell.col]?.type === 'rainbow');
      if (hasRainbow) {
        for (const cell of path) {
          const t = prev[cell.row]?.[cell.col];
          if (!t || t.isCleared || t.type === 'rainbow') continue;
          const rank = OFFENSIVE_RANK[t.type] ?? -1;
          if (rank > bestOffensiveRank) {
            bestOffensiveRank = rank;
            bestOffensiveSpecial = t.type;
          }
        }
      }
      // When no offensive special is in the path, rainbow acts solo (2x word score)
      let rainbowSoloMultiplier = 1;

      // ── Mirror pre-scan ─────────────────────────────────────────────────────
      // Mirror copies FIRST offensive special in path (not best — that's Rainbow's job).
      // Gold/silver/diamond are score multipliers — excluded from Mirror amplification.
      let mirrorFirstSpecial: BlastTileType | null = null;
      const hasMirror = path.some(cell => prev[cell.row]?.[cell.col]?.type === 'mirror');
      if (hasMirror) {
        for (const cell of path) {
          const t = prev[cell.row]?.[cell.col];
          if (!t || t.isCleared || t.type === 'mirror') continue;
          const rank = OFFENSIVE_RANK[t.type] ?? -1;
          if (rank >= 0) {
            mirrorFirstSpecial = t.type;
            break; // Take the FIRST offensive special found
          }
        }
      }
      // When no offensive special is in the path, mirror acts solo (2x word score)
      let mirrorSoloMultiplier = 1;

      // Helper: mark a tile as cleared and track its type
      const markCleared = (t: BlastTileState) => {
        t.isCleared = true;
        newlyClearedCount++;
        clearedTypeCounts[t.type] = (clearedTypeCounts[t.type] || 0) + 1;
      };

      // Helper: check if a tile is multi-hit and not on its final hit
      const isMultiHitAlive = (t: BlastTileState) =>
        t.hitsRemaining > 1 && (t.type === 'ice' || t.type === 'prism' || t.type === 'frozen' || t.type === 'gem');

      // Helper: hit a multi-hit tile from area damage (bomb blast, lightning, prism cross)
      const hitMultiHitTile = (t: BlastTileState) => {
        t.hitsRemaining--;
        t.activationEffect = `${t.type}-crack`;
      };

      // BFS bomb queue (shared across path and prism cross-clear)
      const bombQueue: Array<{ row: number; col: number; depth: number }> = [];
      const processedBombs = new Set<string>();
      // Tracks lightning tiles already triggered (prevents double column-clear when
      // a lightning tile is in both the row and column of a prism cross-clear)
      const processedLightning = new Set<string>();

      // ── Combo detection ──────────────────────────────────────────────────
      const detectedCombos = detectSpecialCombos(path, next);
      let comboMultiplier = 1;
      if (detectedCombos.length > 0) {
        for (const combo of detectedCombos) {
          comboMultiplier *= combo.scoreMultiplier;
          const effectResult = executeComboEffect({
            combo, next, gridSize, path, now,
            wordLengthScale: getWordLengthScaleFactor(path.length),
            markCleared, isMultiHitAlive, hitMultiHitTile,
          });
          newExplosions.push(...effectResult.explosions);
          for (const key of effectResult.processedBombKeys) processedBombs.add(key);
          for (const key of effectResult.processedLightningKeys) processedLightning.add(key);
          bonusScore += effectResult.bonusScore;

          // BUGF-03 fix: after each combo pre-clear, mark any bomb tiles in the
          // combo's tile list as processed so the main path loop won't re-queue them
          // into the bomb BFS (which would double-award BOMB_AREA_CLEAR_BONUS).
          for (const tile of combo.tiles) {
            if (tile.tileType === 'bomb') {
              processedBombs.add(`${tile.row},${tile.col}`);
            }
          }
        }
        bonusScore += baseScore * (comboMultiplier - 1);
        // Trigger combo flash overlay + audio sting callback
        setActiveComboFlash({ id: `combo-flash-${now}`, comboType: detectedCombos[0].type });
        onSynergyDetectedRef.current?.(detectedCombos[0].type);
        onComboDetectedRef.current?.(detectedCombos);
      }

      for (const cell of path) {
        const tile = next[cell.row]?.[cell.col];
        if (!tile || tile.isCleared) continue;

        // Multi-hit tiles: decrement on non-final hits
        if (isMultiHitAlive(tile)) {
          tile.hitsRemaining--;

          // Gem: shard-specific activationEffect (gem-shard-1, gem-shard-2)
          // Frost (frozen): 'frost-crack' on first hit
          // Ice/prism: use generic crack effect
          if (tile.type === 'gem') {
            // hitsRemaining after decrement: 2 = shard-1, 1 = shard-2
            tile.activationEffect = tile.hitsRemaining === 2 ? 'gem-shard-1' : 'gem-shard-2';
          } else if (tile.type === 'frozen') {
            // Frost redesign: 'frost-crack' reveals the inner tile on first hit
            tile.activationEffect = 'frost-crack';
          } else {
            tile.activationEffect = `${tile.type}-crack`;
          }

          // Prism gets use bonus on non-final hits; gem no longer does (Treasure Gem redesign)
          if (tile.type === 'prism') bonusScore += PRISM_USE_BONUS;

          continue; // Don't clear yet
        }

        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
        markCleared(tile);

        switch (tile.type) {
          case 'gold':
            // BUGF-06 fix: accumulate gold multiplier (multiplicative: 3^n).
            // Bonus is applied after the path loop once all gold tiles are counted.
            goldMultiplier *= GOLD_MULTIPLIER;
            newExplosions.push({
              id: `gold-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
            });
            break;

          case 'silver':
            goldMultiplier *= SILVER_MULTIPLIER;
            newExplosions.push({
              id: `silver-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
            });
            break;

          case 'diamond':
            goldMultiplier *= DIAMOND_MULTIPLIER;
            newExplosions.push({
              id: `diamond-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 3, timestamp: now,
            });
            break;

          case 'mirror': {
            newExplosions.push({
              id: `mirror-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
            });
            if (mirrorFirstSpecial !== null) {
              // Mirror: re-execute the first offensive special's effect (doubles it).
              // The original special still fires from its own case — this is the COPY.
              switch (mirrorFirstSpecial) {
                case 'bomb': {
                  // Find first bomb in path and re-fire its BFS
                  const bombCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'bomb';
                  });
                  if (bombCell) {
                    bombQueue.push({ row: bombCell.row, col: bombCell.col, depth: 0 });
                  }
                  break;
                }
                case 'lightning': {
                  // Find first lightning in path and re-fire its column clear
                  const lightningCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'lightning';
                  });
                  if (lightningCell) {
                    for (let r = 0; r < gridSize; r++) {
                      if (r === lightningCell.row) continue;
                      const target = next[r][lightningCell.col];
                      if (target.isCleared) continue;
                      if (isMultiHitAlive(target)) {
                        hitMultiHitTile(target);
                      } else {
                        markCleared(target);
                        bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                        if (target.type === 'bomb' && !processedBombs.has(`${r},${lightningCell.col}`)) {
                          processedBombs.add(`${r},${lightningCell.col}`);
                          bombQueue.push({ row: r, col: lightningCell.col, depth: 0 });
                        }
                      }
                    }
                  }
                  break;
                }
                case 'prism': {
                  // Find first prism in path and re-fire its cross-clear
                  const prismCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'prism';
                  });
                  if (prismCell) {
                    // Second cross-clear row
                    for (let c = 0; c < gridSize; c++) {
                      if (c === prismCell.col) continue;
                      const target = next[prismCell.row][c];
                      if (target.isCleared) continue;
                      if (isMultiHitAlive(target)) {
                        hitMultiHitTile(target);
                      } else {
                        markCleared(target);
                        if (target.type === 'bomb' && !processedBombs.has(`${prismCell.row},${c}`)) {
                          processedBombs.add(`${prismCell.row},${c}`);
                          bombQueue.push({ row: prismCell.row, col: c, depth: 0 });
                        }
                      }
                    }
                    // Second cross-clear column
                    for (let r = 0; r < gridSize; r++) {
                      if (r === prismCell.row) continue;
                      const target = next[r][prismCell.col];
                      if (target.isCleared) continue;
                      if (isMultiHitAlive(target)) {
                        hitMultiHitTile(target);
                      } else {
                        markCleared(target);
                        if (target.type === 'bomb' && !processedBombs.has(`${r},${prismCell.col}`)) {
                          processedBombs.add(`${r},${prismCell.col}`);
                          bombQueue.push({ row: r, col: prismCell.col, depth: 0 });
                        }
                      }
                    }
                  }
                  break;
                }
                case 'gem': {
                  // Treasure Gem completion bonus fires twice (Mirror amplifies the gem's reward)
                  bonusScore += TREASURE_GEM_COMPLETION_BONUS;
                  break;
                }
                case 'magnet': {
                  // Find first magnet in path and re-fire its vortex pull+explode
                  const magnetCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'magnet';
                  });
                  if (magnetCell) {
                    for (let dr = -VORTEX_EXPLODE_RADIUS; dr <= VORTEX_EXPLODE_RADIUS; dr++) {
                      for (let dc = -VORTEX_EXPLODE_RADIUS; dc <= VORTEX_EXPLODE_RADIUS; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const r = magnetCell.row + dr;
                        const c = magnetCell.col + dc;
                        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                          const target = next[r][c];
                          if (!target.isCleared) {
                            if (isMultiHitAlive(target)) {
                              hitMultiHitTile(target);
                            } else {
                              markCleared(target);
                              bonusScore += VORTEX_EXPLODE_BONUS;
                            }
                          }
                        }
                      }
                    }
                  }
                  break;
                }
                default: break;
              }
            } else {
              // Solo Mirror: no offensive special in path → 2x word score
              mirrorSoloMultiplier = MIRROR_MULTIPLIER;
            }
            break;
          }

          case 'bomb': {
            processedBombs.add(`${cell.row},${cell.col}`);
            bombQueue.push({ row: cell.row, col: cell.col, depth: 0 });
            break;
          }

          case 'rainbow': {
            newExplosions.push({
              id: `rainbow-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
            });
            if (bestOffensiveSpecial !== null) {
              // Rainbow Boost: re-execute the best offensive special's effect (second firing).
              // The original special still fires from its own case — this is the COPY.
              switch (bestOffensiveSpecial) {
                case 'bomb': {
                  // Find first bomb in path and re-fire its BFS
                  const bombCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'bomb';
                  });
                  if (bombCell) {
                    // Queue a second bomb detonation from same position
                    bombQueue.push({ row: bombCell.row, col: bombCell.col, depth: 0 });
                  }
                  break;
                }
                case 'lightning': {
                  // Find first lightning in path and re-fire its column clear
                  const lightningCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'lightning';
                  });
                  if (lightningCell) {
                    for (let r = 0; r < gridSize; r++) {
                      if (r === lightningCell.row) continue;
                      const target = next[r][lightningCell.col];
                      if (target.isCleared) continue;
                      if (isMultiHitAlive(target)) {
                        hitMultiHitTile(target);
                      } else {
                        markCleared(target);
                        bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                        if (target.type === 'bomb' && !processedBombs.has(`${r},${lightningCell.col}`)) {
                          processedBombs.add(`${r},${lightningCell.col}`);
                          bombQueue.push({ row: r, col: lightningCell.col, depth: 0 });
                        }
                      }
                    }
                  }
                  break;
                }
                case 'prism': {
                  // Find first prism in path and re-fire its cross-clear
                  const prismCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'prism';
                  });
                  if (prismCell) {
                    // Second cross-clear row
                    for (let c = 0; c < gridSize; c++) {
                      if (c === prismCell.col) continue;
                      const target = next[prismCell.row][c];
                      if (target.isCleared) continue;
                      if (isMultiHitAlive(target)) {
                        hitMultiHitTile(target);
                      } else {
                        markCleared(target);
                        if (target.type === 'bomb' && !processedBombs.has(`${prismCell.row},${c}`)) {
                          processedBombs.add(`${prismCell.row},${c}`);
                          bombQueue.push({ row: prismCell.row, col: c, depth: 0 });
                        }
                        if (target.type === 'lightning' && !processedLightning.has(`${prismCell.row},${c}`)) {
                          processedLightning.add(`${prismCell.row},${c}`);
                          for (let lr = 0; lr < gridSize; lr++) {
                            if (lr === prismCell.row) continue;
                            const lt = next[lr][c];
                            if (lt.isCleared) continue;
                            if (isMultiHitAlive(lt)) { hitMultiHitTile(lt); } else {
                              markCleared(lt);
                              bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                            }
                          }
                        }
                      }
                    }
                    // Second cross-clear column
                    for (let r = 0; r < gridSize; r++) {
                      if (r === prismCell.row) continue;
                      const target = next[r][prismCell.col];
                      if (target.isCleared) continue;
                      if (isMultiHitAlive(target)) {
                        hitMultiHitTile(target);
                      } else {
                        markCleared(target);
                        if (target.type === 'bomb' && !processedBombs.has(`${r},${prismCell.col}`)) {
                          processedBombs.add(`${r},${prismCell.col}`);
                          bombQueue.push({ row: r, col: prismCell.col, depth: 0 });
                        }
                        if (target.type === 'lightning' && !processedLightning.has(`${r},${prismCell.col}`)) {
                          processedLightning.add(`${r},${prismCell.col}`);
                          for (let lr = 0; lr < gridSize; lr++) {
                            if (lr === r) continue;
                            const lt = next[lr][prismCell.col];
                            if (lt.isCleared) continue;
                            if (isMultiHitAlive(lt)) { hitMultiHitTile(lt); } else {
                              markCleared(lt);
                              bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                            }
                          }
                        }
                      }
                    }
                  }
                  break;
                }
                case 'gem': {
                  // Treasure Gem completion bonus fires twice (Rainbow amplifies the gem's reward)
                  bonusScore += TREASURE_GEM_COMPLETION_BONUS;
                  break;
                }
                case 'magnet': {
                  // Find first magnet in path and re-fire its attraction
                  const magnetCell = path.find(c => {
                    const t = prev[c.row]?.[c.col];
                    return t?.type === 'magnet';
                  });
                  if (magnetCell) {
                    for (let dr = -MAGNET_RADIUS; dr <= MAGNET_RADIUS; dr++) {
                      for (let dc = -MAGNET_RADIUS; dc <= MAGNET_RADIUS; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const r = magnetCell.row + dr;
                        const c = magnetCell.col + dc;
                        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                          const target = next[r][c];
                          if (!target.isCleared && target.type === 'rainbow') {
                            markCleared(target);
                            bonusScore += MAGNET_ATTRACT_BONUS;
                          }
                        }
                      }
                    }
                  }
                  break;
                }
                default: break;
              }
            } else {
              // Solo Rainbow Boost: no offensive special in path → 2x word score
              rainbowSoloMultiplier = RAINBOW_BOOST_MULTIPLIER;
            }
            break;
          }

          case 'ice':
            // Ice tile on final hit — small bonus for clearing obstacle
            bonusScore += ICE_CLEAR_BONUS;
            break;

          case 'prism': {
            // Final hit — DETONATE: cross-clear entire row + column
            bonusScore += PRISM_USE_BONUS + PRISM_CROSS_BONUS;
            newExplosions.push({
              id: `prism-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'prism', intensity: 4, timestamp: now,
            });

            // Cross-clear row
            for (let c = 0; c < gridSize; c++) {
              if (c === cell.col) continue;
              const target = next[cell.row][c];
              if (target.isCleared) continue;
              if (isMultiHitAlive(target)) {
                hitMultiHitTile(target);
              } else {
                markCleared(target);
                if (target.type === 'bomb' && !processedBombs.has(`${cell.row},${c}`)) {
                  processedBombs.add(`${cell.row},${c}`);
                  bombQueue.push({ row: cell.row, col: c, depth: 0 });
                }
                // BUGF-02 fix: prism cross-clear hitting a lightning tile triggers its column-clear
                if (target.type === 'lightning' && !processedLightning.has(`${cell.row},${c}`)) {
                  processedLightning.add(`${cell.row},${c}`);
                  for (let lr = 0; lr < gridSize; lr++) {
                    if (lr === cell.row) continue;
                    const ltarget = next[lr][c];
                    if (ltarget.isCleared) continue;
                    if (isMultiHitAlive(ltarget)) {
                      hitMultiHitTile(ltarget);
                    } else {
                      markCleared(ltarget);
                      bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                      if (ltarget.type === 'bomb' && !processedBombs.has(`${lr},${c}`)) {
                        processedBombs.add(`${lr},${c}`);
                        bombQueue.push({ row: lr, col: c, depth: 0 });
                      }
                    }
                  }
                }
              }
            }
            // Cross-clear column
            for (let r = 0; r < gridSize; r++) {
              if (r === cell.row) continue;
              const target = next[r][cell.col];
              if (target.isCleared) continue;
              if (isMultiHitAlive(target)) {
                hitMultiHitTile(target);
              } else {
                markCleared(target);
                if (target.type === 'bomb' && !processedBombs.has(`${r},${cell.col}`)) {
                  processedBombs.add(`${r},${cell.col}`);
                  bombQueue.push({ row: r, col: cell.col, depth: 0 });
                }
                // BUGF-02 fix: prism cross-clear hitting a lightning tile triggers its column-clear
                if (target.type === 'lightning' && !processedLightning.has(`${r},${cell.col}`)) {
                  processedLightning.add(`${r},${cell.col}`);
                  for (let lr = 0; lr < gridSize; lr++) {
                    if (lr === r) continue;
                    const ltarget = next[lr][cell.col];
                    if (ltarget.isCleared) continue;
                    if (isMultiHitAlive(ltarget)) {
                      hitMultiHitTile(ltarget);
                    } else {
                      markCleared(ltarget);
                      bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                      if (ltarget.type === 'bomb' && !processedBombs.has(`${lr},${cell.col}`)) {
                        processedBombs.add(`${lr},${cell.col}`);
                        bombQueue.push({ row: lr, col: cell.col, depth: 0 });
                      }
                    }
                  }
                }
              }
            }
            break;
          }

          case 'gem': {
            // Final hit — Treasure Gem COMPLETE: award bonus + schedule special spawns
            tile.activationEffect = 'gem-complete';
            bonusScore += TREASURE_GEM_COMPLETION_BONUS;
            gemsCompletedThisWord++;
            newExplosions.push({
              id: `gem-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'gem', intensity: 2, timestamp: now,
            });
            break;
          }

          case 'frozen': {
            // Frost redesign: second (final) hit — free and activate inner special
            tile.activationEffect = 'frost-free';
            bonusScore += FROST_REVEAL_BONUS;

            // Activate the inner tile's effect if it exists
            if (tile.innerType) {
              switch (tile.innerType) {
                case 'bomb': {
                  // Inner bomb detonates from frost position
                  if (!processedBombs.has(`${cell.row},${cell.col}`)) {
                    processedBombs.add(`${cell.row},${cell.col}`);
                    bombQueue.push({ row: cell.row, col: cell.col, depth: 0 });
                  }
                  break;
                }
                case 'lightning': {
                  // Inner lightning clears entire column from frost position
                  const frozenKey = `${cell.row},${cell.col}`;
                  if (!processedLightning.has(frozenKey)) {
                    processedLightning.add(frozenKey);
                    for (let r = 0; r < gridSize; r++) {
                      if (r === cell.row) continue;
                      const ltarget = next[r][cell.col];
                      if (ltarget.isCleared) continue;
                      if (isMultiHitAlive(ltarget)) {
                        hitMultiHitTile(ltarget);
                      } else {
                        markCleared(ltarget);
                        bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                        if (ltarget.type === 'bomb' && !processedBombs.has(`${r},${cell.col}`)) {
                          processedBombs.add(`${r},${cell.col}`);
                          bombQueue.push({ row: r, col: cell.col, depth: 0 });
                        }
                      }
                    }
                  }
                  break;
                }
                case 'prism': {
                  // Inner prism cross-clears row + column from frost position
                  bonusScore += PRISM_CROSS_BONUS;
                  // Cross-clear row
                  for (let c = 0; c < gridSize; c++) {
                    if (c === cell.col) continue;
                    const ptarget = next[cell.row][c];
                    if (ptarget.isCleared) continue;
                    if (isMultiHitAlive(ptarget)) {
                      hitMultiHitTile(ptarget);
                    } else {
                      markCleared(ptarget);
                      if (ptarget.type === 'bomb' && !processedBombs.has(`${cell.row},${c}`)) {
                        processedBombs.add(`${cell.row},${c}`);
                        bombQueue.push({ row: cell.row, col: c, depth: 0 });
                      }
                    }
                  }
                  // Cross-clear column
                  for (let r = 0; r < gridSize; r++) {
                    if (r === cell.row) continue;
                    const ptarget = next[r][cell.col];
                    if (ptarget.isCleared) continue;
                    if (isMultiHitAlive(ptarget)) {
                      hitMultiHitTile(ptarget);
                    } else {
                      markCleared(ptarget);
                      if (ptarget.type === 'bomb' && !processedBombs.has(`${r},${cell.col}`)) {
                        processedBombs.add(`${r},${cell.col}`);
                        bombQueue.push({ row: r, col: cell.col, depth: 0 });
                      }
                    }
                  }
                  break;
                }
                case 'gem': {
                  // Inner gem: DO NOT clear — convert frost tile into a fresh Treasure Gem.
                  // The frost tile was already markCleared above; un-clear it and convert.
                  tile.isCleared = false;
                  newlyClearedCount--; // Undo the clear count
                  if (clearedTypeCounts['frozen']) {
                    clearedTypeCounts['frozen']--;
                    if (clearedTypeCounts['frozen'] === 0) delete clearedTypeCounts['frozen'];
                  }
                  tile.type = 'gem';
                  tile.hitsRemaining = getInitialHitsRemaining('gem');
                  tile.innerType = undefined;
                  tile.activationEffect = 'frost-gem-reveal'; // Special animation cue
                  break;
                }
                case 'rainbow': {
                  // Inner rainbow: apply solo multiplier to this word's base score
                  // (We can't re-fire rainbow from here without circular logic,
                  //  so we award the solo bonus as a flat multiplier on base.)
                  rainbowSoloMultiplier = Math.max(rainbowSoloMultiplier, 2);
                  break;
                }
                default: break;
              }
            }

            newExplosions.push({
              id: `frost-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'clear', intensity: 3, timestamp: now,
            });
            break;
          }

          case 'lightning': {
            // Lightning clears entire column
            newExplosions.push({
              id: `lightning-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'lightning', intensity: 3, timestamp: now,
            });
            for (let r = 0; r < gridSize; r++) {
              if (r === cell.row) continue;
              const target = next[r][cell.col];
              if (target.isCleared) continue;
              if (isMultiHitAlive(target)) {
                hitMultiHitTile(target);
              } else {
                markCleared(target);
                bonusScore += LIGHTNING_COLUMN_CLEAR_BONUS;
                // BUGF-01 fix: lightning column-clear hitting a bomb triggers its detonation
                if (target.type === 'bomb' && !processedBombs.has(`${r},${cell.col}`)) {
                  processedBombs.add(`${r},${cell.col}`);
                  bombQueue.push({ row: r, col: cell.col, depth: 0 });
                }
              }
            }
            break;
          }

          case 'magnet': {
            // Vortex (rework of Magnet): pull tiles toward center, then explode radius 1.
            // Display name is "Vortex" but tile type key remains 'magnet'.
            newExplosions.push({
              id: `magnet-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'magnet', intensity: 3, timestamp: now,
            });

            // ── Phase 1: Pull — from outermost ring inward (radius 2 first, then 1) ──
            // For each tile within Manhattan distance VORTEX_PULL_RADIUS:
            //   Calculate the step toward center. If the cell 1 step closer is empty
            //   (cleared) or is the magnet itself, swap the tile into that position.
            for (let pullRadius = VORTEX_PULL_RADIUS; pullRadius >= 1; pullRadius--) {
              for (let dr = -pullRadius; dr <= pullRadius; dr++) {
                for (let dc = -pullRadius; dc <= pullRadius; dc++) {
                  // Only process tiles at exactly this Manhattan radius
                  if (Math.abs(dr) + Math.abs(dc) !== pullRadius) continue;
                  const r = cell.row + dr;
                  const c = cell.col + dc;
                  if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
                  const sourceTile = next[r][c];
                  if (sourceTile.isCleared) continue;

                  // Calculate 1-step direction toward vortex center
                  const stepR = dr === 0 ? 0 : (dr > 0 ? -1 : 1);
                  const stepC = dc === 0 ? 0 : (dc > 0 ? -1 : 1);
                  // Prefer moving along the axis with greater distance
                  let moveR = 0, moveC = 0;
                  if (Math.abs(dr) >= Math.abs(dc)) {
                    moveR = stepR;
                  } else {
                    moveC = stepC;
                  }

                  const targetR = r + moveR;
                  const targetC = c + moveC;
                  if (targetR < 0 || targetR >= gridSize || targetC < 0 || targetC >= gridSize) continue;
                  const targetTile = next[targetR][targetC];

                  // Swap if target is the vortex itself (cleared) or is an empty/cleared cell
                  if (targetTile.isCleared) {
                    // Swap all tile properties (letter is in grid, but swap tile state)
                    const tmpType = sourceTile.type;
                    const tmpHits = sourceTile.hitsRemaining;
                    const tmpEffect = sourceTile.activationEffect;
                    const tmpInner = sourceTile.innerType;
                    sourceTile.type = targetTile.type;
                    sourceTile.hitsRemaining = targetTile.hitsRemaining;
                    sourceTile.activationEffect = targetTile.activationEffect;
                    sourceTile.innerType = targetTile.innerType;
                    targetTile.type = tmpType;
                    targetTile.hitsRemaining = tmpHits;
                    targetTile.activationEffect = tmpEffect;
                    targetTile.innerType = tmpInner;
                    targetTile.isCleared = false;
                    sourceTile.isCleared = true;
                    bonusScore += VORTEX_PULL_BONUS;
                  }
                }
              }
            }

            // ── Phase 2: Explode — clear tiles within radius 1 of vortex position ──
            for (let dr = -VORTEX_EXPLODE_RADIUS; dr <= VORTEX_EXPLODE_RADIUS; dr++) {
              for (let dc = -VORTEX_EXPLODE_RADIUS; dc <= VORTEX_EXPLODE_RADIUS; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = cell.row + dr;
                const c = cell.col + dc;
                if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
                const etarget = next[r][c];
                if (etarget.isCleared) continue;
                if (isMultiHitAlive(etarget)) {
                  hitMultiHitTile(etarget);
                } else {
                  markCleared(etarget);
                  bonusScore += VORTEX_EXPLODE_BONUS;
                  // Chain-propagate bombs found in explode zone
                  if (etarget.type === 'bomb' && !processedBombs.has(`${r},${c}`)) {
                    processedBombs.add(`${r},${c}`);
                    bombQueue.push({ row: r, col: c, depth: 0 });
                  }
                }
              }
            }
            break;
          }
        }
      }

      // ── Treasure Gem: spawn random specials on completion ─────────────────────
      // For each gem that completed this word, spawn TREASURE_GEM_SPAWN_COUNT
      // random special tiles on previously-standard non-cleared cells.
      // Respects wave-enabled flags via getWaveDistribution(getWaveConfig(currentWave)).
      if (gemsCompletedThisWord > 0) {
        const waveConfig = getWaveConfig(currentWave);
        const waveDist = getWaveDistribution(waveConfig);
        // Remove 'standard' and 'gem' from spawn pool (fallback is handled by rollSpecialFromDistribution)
        const spawnDist = { ...waveDist };
        delete spawnDist['standard'];
        delete spawnDist['gem'];

        // Normalize spawn distribution
        const spawnTotal = Object.values(spawnDist).reduce((a, b) => a + b, 0);
        if (spawnTotal > 0) {
          for (const key of Object.keys(spawnDist)) {
            spawnDist[key] /= spawnTotal;
          }
        }

        // Collect candidate standard tiles (not cleared, not in path)
        const pathSet = new Set(path.map(p => `${p.row},${p.col}`));
        const standardCandidates: BlastTileState[] = [];
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            const t = next[r][c];
            if (!t.isCleared && t.type === 'standard' && !pathSet.has(`${r},${c}`)) {
              standardCandidates.push(t);
            }
          }
        }

        // Shuffle candidates using a simple random (non-seeded for variety)
        for (let i = standardCandidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [standardCandidates[i], standardCandidates[j]] = [standardCandidates[j], standardCandidates[i]];
        }

        // Convert up to TREASURE_GEM_SPAWN_COUNT tiles per completed gem
        const spawnCount = gemsCompletedThisWord * TREASURE_GEM_SPAWN_COUNT;
        const toConvert = standardCandidates.slice(0, spawnCount);
        for (const candidate of toConvert) {
          const roll = Math.random();
          const newType = rollSpecialFromDistribution(roll, spawnDist);
          candidate.type = newType;
          candidate.hitsRemaining = getInitialHitsRemaining(newType);
          candidate.activationEffect = null;
        }
      }

      // Process bomb BFS chain (from path bombs + prism cross-clear bombs)
      while (bombQueue.length > 0) {
        const bomb = bombQueue.shift()!;
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
                if (isMultiHitAlive(next[r][c])) {
                  hitMultiHitTile(next[r][c]);
                } else {
                  markCleared(next[r][c]);
                  bonusScore += BOMB_AREA_CLEAR_BONUS;
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
      // Rainbow solo: apply 2x multiplier to base score BEFORE gold
      // Mirror solo: also applies 2x multiplier to base score (independent of rainbow)
      // Combined solo multipliers are multiplicative: base * rainbowMult * mirrorMult * goldMult
      const effectiveBase = baseScore * rainbowSoloMultiplier * mirrorSoloMultiplier;

      // BUGF-06 fix: apply gold multiplier to base score, then add other bonuses.
      // goldMultiplier = 1 (no gold), 3 (1 gold), 9 (2 gold), 27 (3 gold), etc.
      const goldBonusScore = effectiveBase * goldMultiplier - effectiveBase; // extra from gold
      if (goldMultiplier > 1) {
        // Add per-gold-tile popups so UI shows each gold contribution
        for (const cell of path) {
          const t = next[cell.row]?.[cell.col];
          if (t?.type === 'gold') {
            setScorePopups(prev => [...prev, {
              id: `gold-bonus-${now}-${cell.row}-${cell.col}`,
              score: goldBonusScore,
              row: cell.row,
              col: cell.col,
              isSpecial: true,
              timestamp: now,
              tileType: 'gold' as const,
            }]);
          }
        }
      }
      const totalScore = effectiveBase * goldMultiplier + bonusScore;

      // Create score popup at the mid-point of the word path
      if (path.length > 0) {
        const midIdx = Math.floor(path.length / 2);
        const mainPopup = {
          id: `score-${now}-${path[midIdx].row}-${path[midIdx].col}`,
          score: totalScore,
          row: path[midIdx].row,
          col: path[midIdx].col,
          isSpecial: bonusScore > 0,
          timestamp: now,
        };
        setScorePopups(prev => [...prev, mainPopup]);
      }

      if (word.length > bestWordRef.current.length) {
        bestWordRef.current = word;
      }

      // Calculate bonus moves for long words
      const bonusMoveCount = calculateBonusMoves(word.length);

      // Update game state with score + move tracking + per-type clears
      setGameState(prev => {
        const newMovesRemaining = Math.max(0, prev.movesRemaining - 1) + bonusMoveCount;
        const mergedTypeClears = { ...prev.tileTypeClears };
        for (const [tType, count] of Object.entries(clearedTypeCounts)) {
          mergedTypeClears[tType as BlastTileType] = (mergedTypeClears[tType as BlastTileType] || 0) + (count as number);
        }
        return {
          ...prev,
          score: prev.score + totalScore,
          wordsFound: [...prev.wordsFound, word],
          tilesCleared: prev.tilesCleared + newlyClearedCount,
          movesRemaining: newMovesRemaining,
          movesUsed: prev.movesUsed + 1,
          tileTypeClears: mergedTypeClears,
        };
      });

      if (newExplosions.length > 0) {
        setExplosions(prev => [...prev, ...newExplosions]);
      }

      // Trigger cascade after a brief delay for gap cells to appear
      const gridForCascade = effectiveGrid;
      if (gridForCascade) {
        // Capture DDA modifier at submission time (ref is always current)
        const ddaModifier = getDDASpawnModifier(ddaStateRef.current);
        setTimeout(() => {
          cascade.startCascade(gridForCascade, next, handleCascadeComplete, ddaModifier);
        }, 80);
      }

      return next;
    });
  }, [gridSize, effectiveGrid, cascade, handleCascadeComplete, currentWave]);

  /** End the game manually */
  const endGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isDeadEnd: true }));
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
    trackWordFail,
  };
}
