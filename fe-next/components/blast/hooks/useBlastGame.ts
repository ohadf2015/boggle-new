'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGridInit } from '@/components/singleplayer/game/hooks/useGridInit';
import { useDictionaryCache } from '@/hooks/useDictionaryCache';
import { hasValidWords } from '../utils/blastDeadEndDetector';
import { generateBlastLetter } from '../utils/blastLetterGenerator';
import { detectVerticalWords } from '../utils/blastVerticalScanner';
import { detectSpecialCombos } from '../utils/blastCombos';
import type { LetterGrid } from '@/shared/types/game';
import {
  DEFAULT_BLAST_CONFIG,
  GOLD_MULTIPLIER,
  BOMB_RADIUS,
  BOMB_AREA_CLEAR_BONUS,
  RAINBOW_BONUS,
  CHAIN_BOMB_STAGGER,
  LIGHTNING_COLUMN_CLEAR_BONUS,
  ICE_CLEAR_BONUS,
  FROZEN_CLEAR_BONUS,
  MAGNET_RADIUS,
  MAGNET_ATTRACT_BONUS,
  PRISM_USE_BONUS,
  PRISM_CROSS_BONUS,
  GEM_USE_BONUS,
  GEM_COLLECT_BONUS,
  SPECIAL_TILE_DISTRIBUTION,
  MAX_CASCADE_CHAIN,
  MAX_CASCADE_WORDS_PER_LEVEL,
  CASCADE_MIN_WORD_LENGTH,
  CASCADE_DETECTION_DELAY,
  CASCADE_CHAIN_BONUS_MULTIPLIER,
  CASCADE_HIGHLIGHT_DURATION,
  CASCADE_HIGHLIGHT_LINGER,
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
  return 'wildcard'; // Fallback (catches rounding errors)
}

/** Generate initial tile states with special tile placement */
function generateTileStates(
  gridSize: number,
  specialTileChance: number,
  seed: number = Date.now(),
  customDistribution?: Record<string, number>,
): BlastTileState[][] {
  const random = seededRandom(seed);
  const tiles: BlastTileState[][] = [];
  const dist = customDistribution ?? SPECIAL_TILE_DISTRIBUTION;

  for (let row = 0; row < gridSize; row++) {
    tiles[row] = [];
    for (let col = 0; col < gridSize; col++) {
      let type: BlastTileType = 'standard';

      if (random() < specialTileChance) {
        type = rollSpecialFromDistribution(random(), dist);
      }

      tiles[row][col] = {
        row,
        col,
        type,
        isCleared: false,
        activationEffect: null,
        hitsRemaining: getInitialHitsRemaining(type),
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
}

export interface UseBlastGameOptions {
  /** Called when an auto-cascade detects and clears a vertical word */
  onAutoCascadeWord?: (word: string, score: number, chainLevel: number) => void;
  /** Number of moves allowed for this wave (from WaveConfig.movesAllowed) */
  movesAllowed?: number;
  /** Wave objectives — when provided, board generation guarantees enough tiles for collect_type/clear_all_type objectives */
  waveObjectives?: import('../types').BlastObjective[];
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

  // Tile state management — guarantee objective tiles are present on the board
  const [tileStates, setTileStates] = useState<BlastTileState[][]>(() => {
    const tiles = generateTileStates(gridSize, specialTileChance, Date.now(), customDistribution);
    return options?.waveObjectives
      ? guaranteeObjectiveTiles(tiles, options.waveObjectives)
      : tiles;
  });

  // Move limit from options (default: unlimited via high number)
  const movesAllowed = options?.movesAllowed ?? Infinity;

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
        const foundSet = new Set(gameStateRef.current.wordsFound);
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

            const nextTileStates = newTileStates.map(row => row.map(tile => ({ ...tile })));

            for (const vw of verticalWords) {
              const baseScore = vw.word.length - 1;
              const chainBonus = Math.floor(baseScore * chainLevel * CASCADE_CHAIN_BONUS_MULTIPLIER);
              const wordScore = baseScore + chainBonus;
              totalCascadeScore += wordScore;
              cascadeWords.push(vw.word);

              for (const cell of vw.path) {
                const t = nextTileStates[cell.row][cell.col];
                if (!t.isCleared) {
                  t.isCleared = true;
                  newlyClearedCount++;
                  cascadeClearedTypes[t.type] = (cascadeClearedTypes[t.type] || 0) + 1;
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
          switch (combo.type) {
            case 'bomb_bomb': {
              const midRow = Math.round((combo.tiles[0].row + combo.tiles[1].row) / 2);
              const midCol = Math.round((combo.tiles[0].col + combo.tiles[1].col) / 2);
              for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
                const r = midRow + dr, c = midCol + dc;
                if (r >= 0 && r < gridSize && c >= 0 && c < gridSize && !next[r][c].isCleared) {
                  if (isMultiHitAlive(next[r][c])) hitMultiHitTile(next[r][c]); else markCleared(next[r][c]);
                }
              }
              newExplosions.push({ id: `combo-bb-${now}`, row: midRow, col: midCol, type: 'mega_blast', intensity: 4, timestamp: now });
              break;
            }
            case 'bomb_lightning': {
              const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
              for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
                const col = bt.col + dc;
                if (col < 0 || col >= gridSize) continue;
                for (let r = 0; r < gridSize; r++) if (!next[r][col].isCleared) {
                  if (isMultiHitAlive(next[r][col])) hitMultiHitTile(next[r][col]); else markCleared(next[r][col]);
                }
              }
              newExplosions.push({ id: `combo-bl-${now}`, row: bt.row, col: bt.col, type: 'combo', intensity: 4, timestamp: now });
              break;
            }
            case 'bomb_prism': {
              const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
              for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                const cR = bt.row + dr, cC = bt.col + dc;
                if (cR < 0 || cR >= gridSize || cC < 0 || cC >= gridSize) continue;
                for (let r = 0; r < gridSize; r++) if (!next[r][cC].isCleared) { if (isMultiHitAlive(next[r][cC])) hitMultiHitTile(next[r][cC]); else markCleared(next[r][cC]); }
                for (let c = 0; c < gridSize; c++) if (!next[cR][c].isCleared) { if (isMultiHitAlive(next[cR][c])) hitMultiHitTile(next[cR][c]); else markCleared(next[cR][c]); }
              }
              newExplosions.push({ id: `combo-bp-${now}`, row: bt.row, col: bt.col, type: 'combo', intensity: 4, timestamp: now });
              break;
            }
            case 'lightning_lightning': {
              const cols = new Set(path.map(p => p.col));
              for (const col of cols) for (let r = 0; r < gridSize; r++) if (!next[r][col].isCleared) { if (isMultiHitAlive(next[r][col])) hitMultiHitTile(next[r][col]); else markCleared(next[r][col]); }
              newExplosions.push({ id: `combo-ll-${now}`, row: combo.tiles[0].row, col: combo.tiles[0].col, type: 'combo', intensity: 4, timestamp: now });
              break;
            }
            case 'lightning_prism': {
              for (const tile of combo.tiles) for (let d = -1; d <= 1; d++) {
                const row = tile.row + d, col = tile.col + d;
                if (row >= 0 && row < gridSize) for (let c = 0; c < gridSize; c++) if (!next[row][c].isCleared) { if (isMultiHitAlive(next[row][c])) hitMultiHitTile(next[row][c]); else markCleared(next[row][c]); }
                if (col >= 0 && col < gridSize) for (let r = 0; r < gridSize; r++) if (!next[r][col].isCleared) { if (isMultiHitAlive(next[r][col])) hitMultiHitTile(next[r][col]); else markCleared(next[r][col]); }
              }
              newExplosions.push({ id: `combo-lp-${now}`, row: combo.tiles[0].row, col: combo.tiles[0].col, type: 'combo', intensity: 4, timestamp: now });
              break;
            }
            case 'prism_prism': {
              for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) if (!next[r][c].isCleared) markCleared(next[r][c]);
              newExplosions.push({ id: `combo-pp-${now}`, row: 3, col: 3, type: 'total_destruction', intensity: 4, timestamp: now });
              break;
            }
            default: break;
          }
        }
        bonusScore += baseScore * (comboMultiplier - 1);
      }

      for (const cell of path) {
        const tile = next[cell.row]?.[cell.col];
        if (!tile || tile.isCleared) continue;

        // Multi-hit tiles: decrement on non-final hits
        if (isMultiHitAlive(tile)) {
          tile.hitsRemaining--;
          tile.activationEffect = `${tile.type}-crack`;

          // Prism and gem get use bonuses even on non-final hits
          if (tile.type === 'prism') bonusScore += PRISM_USE_BONUS;
          if (tile.type === 'gem') bonusScore += GEM_USE_BONUS;

          continue; // Don't clear yet
        }

        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
        markCleared(tile);

        switch (tile.type) {
          case 'gold':
            bonusScore += baseScore * (GOLD_MULTIPLIER - 1);
            newExplosions.push({
              id: `gold-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now,
            });
            // Separate gold multiplier popup at the gold tile position
            const goldPopup = {
              id: `gold-bonus-${now}-${cell.row}-${cell.col}`,
              score: baseScore * (GOLD_MULTIPLIER - 1),
              row: cell.row,
              col: cell.col,
              isSpecial: true,
              timestamp: now,
              tileType: 'gold' as const,
            };
            setScorePopups(prev => [...prev, goldPopup]);
            break;

          case 'bomb': {
            processedBombs.add(`${cell.row},${cell.col}`);
            bombQueue.push({ row: cell.row, col: cell.col, depth: 0 });
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

          case 'gem':
            // Final hit — COLLECT
            bonusScore += GEM_USE_BONUS + GEM_COLLECT_BONUS;
            newExplosions.push({
              id: `gem-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'gem', intensity: 2, timestamp: now,
            });
            break;

          case 'frozen':
            // Final hit — bonus for clearing toughest obstacle
            bonusScore += FROZEN_CLEAR_BONUS;
            break;

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
            // Magnet attracts (clears) adjacent wildcard tiles
            newExplosions.push({
              id: `magnet-${now}-${cell.row}-${cell.col}`,
              row: cell.row, col: cell.col, type: 'magnet', intensity: 2, timestamp: now,
            });
            for (let dr = -MAGNET_RADIUS; dr <= MAGNET_RADIUS; dr++) {
              for (let dc = -MAGNET_RADIUS; dc <= MAGNET_RADIUS; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = cell.row + dr;
                const c = cell.col + dc;
                if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
                  const target = next[r][c];
                  if (!target.isCleared && (target.type === 'wildcard' || target.type === 'rainbow')) {
                    markCleared(target);
                    bonusScore += MAGNET_ATTRACT_BONUS;
                  }
                }
              }
            }
            break;
          }
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
      const totalScore = baseScore + bonusScore;

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
  };
}
