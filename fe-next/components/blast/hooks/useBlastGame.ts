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
  RAINBOW_BOOST_MULTIPLIER,
  ICE_CLEAR_BONUS,
  PRISM_USE_BONUS,
  PRISM_CROSS_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
  SPECIAL_TILE_DISTRIBUTION,
  MAX_CASCADE_CHAIN,
  MAX_CASCADE_WORDS_PER_LEVEL,
  CASCADE_MIN_WORD_LENGTH,
  CASCADE_DETECTION_DELAY,
  CASCADE_CHAIN_BONUS_MULTIPLIER,
  CASCADE_HIGHLIGHT_DURATION,
  CASCADE_HIGHLIGHT_LINGER,
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
import {
  type TileEffectContext,
  scanOffensiveSpecial,
  reFireOffensiveSpecial,
  fireLightningColumn,
  firePrismCross,
  fireVortexPull,
  fireMagnetExplode,
  processBombBFS,
  handleFrostFinalHit,
  spawnGemSpecials,
} from './blastTileEffects';
import { calculateEarnedStars } from '../utils/blastStarCalculator';
import { calculateBonusMoves, calculateLeftoverMoveBonus } from '../utils/blastMoveUtils';
import { getWaveConfig, getWaveDistribution } from '../utils/blastWaveConfig';
import { useBlastSeed } from '@/hooks/gameState';

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
   * Externally trigger a combo flash (e.g. from multiplayer blastComboSync event).
   * Accepts any string comboType; only valid BlastComboType values will display properly.
   */
  triggerComboFlash: (comboType: string) => void;
  /**
   * Track a word rejection for DDA (invisible assist).
   * Call when useWordSubmission fires onWordRejected.
   * After 3+ consecutive calls the next gravity refill will spawn more special tiles.
   */
  trackWordFail: () => void;
  /**
   * Direct tile state setter — used by Sugar Crush to convert tile types in place.
   * Accepts an updater function that receives previous state and returns new state.
   */
  setTileStates: (updater: (prev: BlastTileState[][]) => BlastTileState[][]) => void;
  /**
   * Add a visual explosion at a grid position (used by Sugar Crush sequence).
   * Explosion type maps to the converted tile type for visual consistency.
   */
  addExplosion: (row: number, col: number, tileType: string) => void;
  /**
   * Add bonus score to game state (used by Sugar Crush to accumulate total bonus).
   */
  addBonusScore: (bonus: number) => void;
  /**
   * Switch to unlimited moves (soft pressure mode).
   * Called after Sugar Crush in multiplayer so the player keeps playing until server timer ends.
   */
  unlockMoves: () => void;
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
  /**
   * Called when moves are exhausted instead of auto-marking isDeadEnd.
   * If provided, the caller is responsible for eventually calling endGame().
   * Used by BlastGame to trigger the Sugar Crush sequence before ending.
   */
  onMovesExhausted?: () => void;
  /**
   * Seed for deterministic multiplayer refills.
   * From BlastModeState.seed broadcast by server with startGame.
   * Passed to useBlastCascade so each cascade uses createSeededRandom(blastSeed).
   * Omit for singleplayer — falls back to Math.random.
   */
  blastSeed?: number | null;
  /**
   * Pre-built tile states from server overlay (multiplayer).
   * When provided, skips generateTileStates and uses these directly.
   */
  initialTileStates?: BlastTileState[][] | null;
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

  // Cascade highlight state — visible glow before tiles clear
  const [cascadeHighlightPhase, setCascadeHighlightPhase] = useState<CascadeHighlightPhase>('idle');
  const [cascadeHighlightData, setCascadeHighlightData] = useState<CascadeHighlightData | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
                  // BUGF-05 fix: multi-hit tiles crack instead of clear
                  // when they have hitsRemaining > 1 — only the final hit clears them.
                  if ((t.type === 'frozen' || t.type === 'ice' || t.type === 'prism' || t.type === 'gem') && t.hitsRemaining > 1) {
                    t.hitsRemaining--;
                    t.activationEffect = t.type === 'gem'
                      ? (t.hitsRemaining === 2 ? 'gem-shard-1' : 'gem-shard-2')
                      : `${t.type}-crack`;
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
      if (options?.onMovesExhausted) {
        // Delegate to caller (e.g. BlastGame Sugar Crush sequence)
        options.onMovesExhausted();
      } else {
        setGameState(prev => ({ ...prev, isDeadEnd: true }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
   *
   * Tile effect logic delegated to blastTileEffects.ts for maintainability.
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
    if (autoDetectTimerRef.current) { clearTimeout(autoDetectTimerRef.current); autoDetectTimerRef.current = null; }
    if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    setIsAutoDetecting(false);
    setCascadeHighlightPhase('idle');
    setCascadeHighlightData(null);

    const pendingPopups: BlastScorePopup[] = [];

    setTileStates(prev => {
      const next = prev.map(row => row.map(tile => ({ ...tile })));
      let bonusScore = 0;
      const newExplosions: BlastExplosion[] = [];
      const now = Date.now();

      let newlyClearedCount = 0;
      const clearedTypeCounts: Partial<Record<BlastTileType, number>> = {};
      let goldMultiplier = 1;
      let gemsCompletedThisWord = 0;

      // Pre-scan for Rainbow (best offensive) and Mirror (first offensive)
      const hasRainbow = path.some(cell => prev[cell.row]?.[cell.col]?.type === 'rainbow');
      const bestOffensiveSpecial = hasRainbow ? scanOffensiveSpecial(path, prev, 'best') : null;
      const hasMirror = path.some(cell => prev[cell.row]?.[cell.col]?.type === 'mirror');
      const mirrorFirstSpecial = hasMirror ? scanOffensiveSpecial(path, prev, 'first') : null;
      let rainbowSoloMultiplier = 1;
      let mirrorSoloMultiplier = 1;

      // Shared helpers (closures over mutable state)
      const markCleared = (t: BlastTileState) => {
        if (t.isCleared) return;
        if (t.type === 'gem') { t.activationEffect = 'gem-complete'; bonusScore += TREASURE_GEM_COMPLETION_BONUS; gemsCompletedThisWord++; }
        t.isCleared = true;
        newlyClearedCount++;
        clearedTypeCounts[t.type] = (clearedTypeCounts[t.type] || 0) + 1;
      };
      const isMultiHitAlive = (t: BlastTileState) =>
        t.hitsRemaining > 1 && (t.type === 'ice' || t.type === 'prism' || t.type === 'frozen' || t.type === 'gem');
      const hitMultiHitTile = (t: BlastTileState) => {
        t.hitsRemaining--;
        if (t.type === 'gem') t.activationEffect = t.hitsRemaining === 2 ? 'gem-shard-1' : 'gem-shard-2';
        else if (t.type === 'frozen') t.activationEffect = 'frost-crack';
        else t.activationEffect = `${t.type}-crack`;
      };

      const vortexLetterSwaps: Array<{ fromR: number; fromC: number; toR: number; toC: number }> = [];
      const bombQueue: Array<{ row: number; col: number; depth: number }> = [];
      const processedBombs = new Set<string>();
      const processedLightning = new Set<string>();

      // Build shared effect context
      const ctx: TileEffectContext = {
        next, gridSize, now, prev, path,
        bombQueue, processedBombs, processedLightning,
        markCleared, isMultiHitAlive, hitMultiHitTile,
      };

      // ── Combo detection ──
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
          for (const tile of combo.tiles) {
            if (tile.tileType === 'bomb') processedBombs.add(`${tile.row},${tile.col}`);
          }
        }
        bonusScore += baseScore * (comboMultiplier - 1);
        setActiveComboFlash({ id: `combo-flash-${now}`, comboType: detectedCombos[0].type });
        onSynergyDetectedRef.current?.(detectedCombos[0].type);
        onComboDetectedRef.current?.(detectedCombos);
      }

      // ── Main path loop ──
      for (const cell of path) {
        const tile = next[cell.row]?.[cell.col];
        if (!tile || tile.isCleared) continue;

        // Multi-hit tiles: decrement on non-final hits
        if (isMultiHitAlive(tile)) {
          hitMultiHitTile(tile);
          if (tile.type === 'prism') bonusScore += PRISM_USE_BONUS;
          continue;
        }

        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
        markCleared(tile);

        switch (tile.type) {
          case 'gold':
            goldMultiplier *= GOLD_MULTIPLIER;
            newExplosions.push({ id: `gold-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
            break;
          case 'silver':
            goldMultiplier *= SILVER_MULTIPLIER;
            newExplosions.push({ id: `silver-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
            break;
          case 'diamond':
            goldMultiplier *= DIAMOND_MULTIPLIER;
            newExplosions.push({ id: `diamond-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 3, timestamp: now });
            break;

          case 'mirror': {
            newExplosions.push({ id: `mirror-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
            if (mirrorFirstSpecial !== null) {
              bonusScore += reFireOffensiveSpecial(mirrorFirstSpecial, ctx);
            } else {
              mirrorSoloMultiplier = MIRROR_MULTIPLIER;
            }
            break;
          }

          case 'bomb':
            processedBombs.add(`${cell.row},${cell.col}`);
            bombQueue.push({ row: cell.row, col: cell.col, depth: 0 });
            break;

          case 'rainbow': {
            newExplosions.push({ id: `rainbow-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
            if (bestOffensiveSpecial !== null) {
              bonusScore += reFireOffensiveSpecial(bestOffensiveSpecial, ctx);
            } else {
              rainbowSoloMultiplier = RAINBOW_BOOST_MULTIPLIER;
            }
            break;
          }

          case 'ice':
            bonusScore += ICE_CLEAR_BONUS;
            break;

          case 'prism': {
            bonusScore += PRISM_USE_BONUS + PRISM_CROSS_BONUS;
            newExplosions.push({ id: `prism-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'prism', intensity: 4, timestamp: now });
            bonusScore += firePrismCross(cell.row, cell.col, ctx);
            break;
          }

          case 'gem':
            newExplosions.push({ id: `gem-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'gem', intensity: 2, timestamp: now });
            break;

          case 'frozen': {
            const frostResult = handleFrostFinalHit(cell, tile, ctx);
            if (frostResult.bonusScore === -1) {
              // Inner gem: tile was un-cleared and converted
              newlyClearedCount--;
              if (clearedTypeCounts['frozen']) {
                clearedTypeCounts['frozen']--;
                if (clearedTypeCounts['frozen'] === 0) delete clearedTypeCounts['frozen'];
              }
            } else {
              bonusScore += frostResult.bonusScore;
            }
            rainbowSoloMultiplier = Math.max(rainbowSoloMultiplier, frostResult.rainbowBoost);
            newExplosions.push({ id: `frost-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'clear', intensity: 3, timestamp: now });
            break;
          }

          case 'lightning': {
            newExplosions.push({ id: `lightning-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'lightning', intensity: 3, timestamp: now });
            bonusScore += fireLightningColumn(cell.row, cell.col, ctx);
            break;
          }

          case 'magnet': {
            newExplosions.push({ id: `magnet-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'magnet', intensity: 3, timestamp: now });
            const pullResult = fireVortexPull(cell.row, cell.col, ctx);
            bonusScore += pullResult.bonusScore;
            vortexLetterSwaps.push(...pullResult.letterSwaps);
            bonusScore += fireMagnetExplode(cell.row, cell.col, ctx);
            break;
          }
        }
      }

      // Treasure Gem spawns
      spawnGemSpecials(gemsCompletedThisWord, currentWave, next, gridSize, path, rollSpecialFromDistribution);

      // Process bomb BFS chain
      const bombResult = processBombBFS(ctx);
      bonusScore += bombResult.bonusScore;
      newExplosions.push(...bombResult.explosions);

      // Word explosion (skip when ≥2 special explosions)
      if (path.length > 0 && newExplosions.length < 2) {
        const midIdx = Math.floor(path.length / 2);
        const intensity = path.length <= 3 ? 1 : path.length <= 5 ? 2 : path.length <= 7 ? 3 : 4;
        newExplosions.push({ id: `word-${now}`, row: path[midIdx].row, col: path[midIdx].col, type: 'word', intensity: intensity as 1 | 2 | 3 | 4, timestamp: now });
      }

      totalWordsClearedRef.current += path.length;

      // Score calculation: solo multipliers → gold multiplier → bonus
      const effectiveBase = baseScore * rainbowSoloMultiplier * mirrorSoloMultiplier;
      const goldBonusScore = effectiveBase * goldMultiplier - effectiveBase;
      if (goldMultiplier > 1) {
        for (const cell of path) {
          const t = next[cell.row]?.[cell.col];
          if (t?.type === 'gold') {
            pendingPopups.push({ id: `gold-bonus-${now}-${cell.row}-${cell.col}`, score: goldBonusScore, row: cell.row, col: cell.col, isSpecial: true, timestamp: now, tileType: 'gold' as const });
          }
        }
      }
      const totalScore = effectiveBase * goldMultiplier + bonusScore;

      if (path.length > 0) {
        const midIdx = Math.floor(path.length / 2);
        pendingPopups.push({ id: `score-${now}-${path[midIdx].row}-${path[midIdx].col}`, score: totalScore, row: path[midIdx].row, col: path[midIdx].col, isSpecial: bonusScore > 0, timestamp: now });
      }

      if (word.length > bestWordRef.current.length) bestWordRef.current = word;

      const bonusMoveCount = calculateBonusMoves(word.length);
      setGameState(prev => {
        const newMovesRemaining = Math.max(0, prev.movesRemaining - 1) + bonusMoveCount;
        const mergedTypeClears = { ...prev.tileTypeClears };
        for (const [tType, count] of Object.entries(clearedTypeCounts)) {
          mergedTypeClears[tType as BlastTileType] = (mergedTypeClears[tType as BlastTileType] || 0) + (count as number);
        }
        return { ...prev, score: prev.score + totalScore, wordsFound: [...prev.wordsFound, word], tilesCleared: prev.tilesCleared + newlyClearedCount, movesRemaining: newMovesRemaining, movesUsed: prev.movesUsed + 1, tileTypeClears: mergedTypeClears };
      });

      if (newExplosions.length > 0) setExplosions(prev => [...prev, ...newExplosions]);

      // Trigger cascade — apply vortex letter swaps to grid
      let gridForCascade = effectiveGrid;
      if (gridForCascade && vortexLetterSwaps.length > 0) {
        const swappedGrid = gridForCascade.map(row => [...row]);
        for (const swap of vortexLetterSwaps) {
          const tmp = swappedGrid[swap.fromR][swap.fromC];
          swappedGrid[swap.fromR][swap.fromC] = swappedGrid[swap.toR][swap.toC];
          swappedGrid[swap.toR][swap.toC] = tmp;
        }
        gridForCascade = swappedGrid;
        setCurrentGrid(swappedGrid);
      }
      if (gridForCascade) {
        const ddaModifier = getDDASpawnModifier(ddaStateRef.current);
        setTimeout(() => { cascade.startCascade(gridForCascade, next, handleCascadeComplete, ddaModifier); }, 80);
      }

      return next;
    });

    if (pendingPopups.length > 0) setScorePopups(prev => [...prev, ...pendingPopups]);
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
