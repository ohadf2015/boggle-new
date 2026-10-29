/**
 * Pure tile-processing logic shared by the SP engine and the MP server cascade.
 * Processes a word path: clears tiles, applies special effects, calculates score.
 */

import { detectSpecialCombos, type SpecialCombo } from './blastCombos';
import { executeComboEffect } from './blastComboEffects';
import { getWordLengthScaleFactor } from './blastComboScaling';
import {
  GOLD_MULTIPLIER,
  GOLD_BONUS_MOVES,
  DIAMOND_CLEAR_BONUS,
  DIAMOND_WORD_MULTIPLIER,
  DIAMOND_CROSS_POINTS,
  BLAST_MAX_CHAIN_DETONATIONS,
  BLAST_MAX_CHAIN_CLEAR_FRACTION,
  BLAST_MIN_CHAIN_CLEAR_CAP,
  OVERFLOW_SURGE_POINTS_PER_DETONATION,
  type BlastTileState,
  type BlastTileType,
  type BlastExplosion,
  type BlastScorePopup,
} from '../types';
import { type TileEffectContext, processBombBFS, spawnEarnedDiamonds } from './blastTileEffects';
import { calculateBonusMoves } from './blastMoveUtils';
import { diamondsForWord } from './blastWordRarity';
import { getWaveTheme } from './blastWaveTheme';

export interface TileProcessingInput {
  prev: BlastTileState[][];
  path: Array<{ row: number; col: number }>;
  word: string;
  baseScore: number;
  gridSize: number;
  currentWave: number;
  preDetectedCombos?: SpecialCombo[];
  /** Seeded RNG for multiplayer determinism. Defaults to Math.random. */
  rng?: () => number;
}

export interface TileProcessingResult {
  next: BlastTileState[][];
  totalScore: number;
  newlyClearedCount: number;
  clearedTypeCounts: Partial<Record<BlastTileType, number>>;
  explosions: BlastExplosion[];
  pendingPopups: BlastScorePopup[];
  detectedCombos: SpecialCombo[];
  bonusMoveCount: number;
  /** Points from Overflow Surge payout (suppressed chain detonations) — already folded into totalScore */
  overflowSurge: number;
  diamondsCollected: number;
  /** Cells turned into diamonds because the word was rare */
  diamondsSpawned: Array<{ row: number; col: number }>;
  /** Tiles cleared by played diamonds' row + column cross blasts */
  gemCrossCount: number;
}

export function processTilesForWord(input: TileProcessingInput): TileProcessingResult {
  const { prev, path, word, baseScore, gridSize, currentWave, preDetectedCombos, rng = Math.random } = input;

  const pathSet = new Set(path.map(p => `${p.row},${p.col}`));
  const next = prev.map(row => row.map(tile => ({ ...tile })));
  let bonusScore = 0;
  const newExplosions: BlastExplosion[] = [];
  const now = Date.now();
  const pendingPopups: BlastScorePopup[] = [];

  let newlyClearedCount = 0;
  const clearedTypeCounts: Partial<Record<BlastTileType, number>> = {};
  let goldMultiplier = 1;
  let tileBonusMoves = 0;

  const markCleared = (t: BlastTileState) => {
    if (t.isCleared) return;
    t.isCleared = true;
    newlyClearedCount++;
    clearedTypeCounts[t.type] = (clearedTypeCounts[t.type] || 0) + 1;
    if (t.type === 'diamond') {
      bonusScore += DIAMOND_CLEAR_BONUS;
      t.activationEffect = 'diamond';
      newExplosions.push({ id: `diamond-${now}-${t.row}-${t.col}`, row: t.row, col: t.col, type: 'word', intensity: 3, timestamp: now });
    }
  };

  const ctx: TileEffectContext = {
    next, gridSize, now,
    bombQueue: [],
    processedBombs: new Set<string>(),
    markCleared,
    chainBudget: {
      detonations: 0,
      cleared: 0,
      suppressed: 0,
      maxDetonations: BLAST_MAX_CHAIN_DETONATIONS,
      maxCleared: Math.max(BLAST_MIN_CHAIN_CLEAR_CAP, Math.floor(gridSize * gridSize * BLAST_MAX_CHAIN_CLEAR_FRACTION)),
    },
  };

  // Combos share the chain budget so a combo can never wipe the whole board in one frame.
  const comboMarkCleared = (t: BlastTileState) => {
    const b = ctx.chainBudget;
    if (t.isCleared || (b && b.cleared >= b.maxCleared)) return;
    markCleared(t);
    if (b) b.cleared++;
  };

  const detectedCombos = preDetectedCombos ?? detectSpecialCombos(path, next);
  let comboMultiplier = 1;
  for (const combo of detectedCombos) {
    comboMultiplier *= combo.scoreMultiplier;
    const effectResult = executeComboEffect({
      combo, next, gridSize, now,
      wordLengthScale: getWordLengthScaleFactor(path.length),
      markCleared: comboMarkCleared,
    });
    newExplosions.push(...effectResult.explosions);
    for (const key of effectResult.processedBombKeys) ctx.processedBombs.add(key);
  }

  const goldOnPath: Array<{ row: number; col: number }> = [];
  const diamondsOnPath: Array<{ row: number; col: number }> = [];
  const queueBomb = (row: number, col: number) => {
    const key = `${row},${col}`;
    if (ctx.processedBombs.has(key)) return;
    ctx.processedBombs.add(key);
    ctx.bombQueue.push({ row, col, depth: 0 });
  };

  for (const cell of path) {
    const tile = next[cell.row]?.[cell.col];
    if (!tile || tile.isCleared) continue;
    tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
    markCleared(tile);
    if (tile.type === 'bomb') queueBomb(cell.row, cell.col);
    if (tile.type === 'diamond') diamondsOnPath.push(cell);
    if (tile.type === 'gold') {
      goldOnPath.push(cell);
      goldMultiplier *= GOLD_MULTIPLIER;
      tileBonusMoves += GOLD_BONUS_MOVES;
      newExplosions.push({ id: `gold-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
    }
  }

  let gemCrossCount = 0;
  for (const gem of diamondsOnPath) {
    const cross = [
      ...Array.from({ length: gridSize }, (_, c) => ({ row: gem.row, col: c })),
      ...Array.from({ length: gridSize }, (_, r) => ({ row: r, col: gem.col })),
    ];
    for (const cell of cross) {
      const tile = next[cell.row]?.[cell.col];
      if (!tile || tile.isCleared) continue;
      comboMarkCleared(tile);
      if (!tile.isCleared) continue;
      tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
      gemCrossCount++;
      if (tile.type === 'bomb') queueBomb(cell.row, cell.col);
      newExplosions.push({ id: `gem-cross-${now}-${cell.row}-${cell.col}`, type: 'clear', row: cell.row, col: cell.col, intensity: 3, timestamp: now });
    }
  }
  bonusScore += gemCrossCount * DIAMOND_CROSS_POINTS;
  const diamondMultiplier = DIAMOND_WORD_MULTIPLIER ** diamondsOnPath.length;

  const bombResult = processBombBFS(ctx);
  bonusScore += bombResult.bonusScore;
  newExplosions.push(...bombResult.explosions);

  if (path.length > 0 && newExplosions.length < 2) {
    const midIdx = Math.floor(path.length / 2);
    const intensity = path.length <= 3 ? 1 : path.length <= 5 ? 2 : path.length <= 7 ? 3 : 4;
    newExplosions.push({ id: `word-${now}`, row: path[midIdx].row, col: path[midIdx].col, type: 'word', intensity: intensity as 1 | 2 | 3 | 4, timestamp: now });
  }

  // Row-clear reward for 7+ letter words; bombs caught in the row still detonate.
  if (word.length >= 7 && path.length > 0) {
    const targetRow = path[Math.floor(path.length / 2)].row;
    for (let c = 0; c < gridSize; c++) {
      const tile = next[targetRow]?.[c];
      if (!tile || tile.isCleared || pathSet.has(`${targetRow},${c}`)) continue;
      tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
      markCleared(tile);
      if (tile.type === 'bomb') queueBomb(targetRow, c);
      newExplosions.push({ id: `row-clear-${now}-${targetRow}-${c}`, type: 'clear', row: targetRow, col: c, intensity: 2, timestamp: now });
    }
    if (ctx.bombQueue.length > 0) {
      const rowClearBombResult = processBombBFS(ctx);
      bonusScore += rowClearBombResult.bonusScore;
      newExplosions.push(...rowClearBombResult.explosions);
    }
  }

  // Spawned last so no blast from this same word can collect the diamond it just earned.
  const rarityBoost = getWaveTheme(currentWave).params.rarityBoost;
  const diamondsSpawned = spawnEarnedDiamonds(next, pathSet, diamondsForWord(word.toLowerCase(), rarityBoost), rng);

  const goldBonusScore = baseScore * goldMultiplier - baseScore;
  if (goldMultiplier > 1) {
    const perTileBonus = Math.round(goldBonusScore / goldOnPath.length);
    for (const cell of goldOnPath) {
      pendingPopups.push({ id: `gold-bonus-${now}-${cell.row}-${cell.col}`, score: perTileBonus, row: cell.row, col: cell.col, isSpecial: true, timestamp: now, tileType: 'gold' });
    }
  }

  const overflowSurge = (ctx.chainBudget?.suppressed ?? 0) * OVERFLOW_SURGE_POINTS_PER_DETONATION;
  bonusScore += overflowSurge;
  if (overflowSurge > 0 && path.length > 0) {
    pendingPopups.push({
      id: `surge-${now}`, row: path[path.length - 1].row, col: path[path.length - 1].col,
      score: overflowSurge, isSpecial: true, timestamp: now,
    });
  }

  const totalScore = baseScore * goldMultiplier * comboMultiplier * diamondMultiplier + bonusScore;
  if (path.length > 0) {
    const midIdx = Math.floor(path.length / 2);
    pendingPopups.push({ id: `score-${now}-${path[midIdx].row}-${path[midIdx].col}`, score: totalScore, row: path[midIdx].row, col: path[midIdx].col, isSpecial: bonusScore > 0, timestamp: now });
  }

  return {
    next,
    totalScore,
    newlyClearedCount,
    clearedTypeCounts,
    explosions: newExplosions,
    pendingPopups,
    detectedCombos,
    bonusMoveCount: calculateBonusMoves(word.length) + tileBonusMoves,
    overflowSurge,
    diamondsCollected: clearedTypeCounts.diamond ?? 0,
    diamondsSpawned,
    gemCrossCount,
  };
}
