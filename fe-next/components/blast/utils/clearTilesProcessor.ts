/**
 * Pure tile-processing logic extracted from useBlastGame's clearTilesForWord.
 * Processes a word path: clears tiles, applies special effects, calculates score.
 */

import { detectSpecialCombos, type SpecialCombo } from './blastCombos';
import { executeComboEffect } from './blastComboEffects';
import { getWordLengthScaleFactor } from './blastComboScaling';
import {
  GOLD_MULTIPLIER,
  GOLD_BONUS_MOVES,
  RAINBOW_BOOST_MULTIPLIER,
  ICE_CLEAR_BONUS,
  PRISM_USE_BONUS,
  PRISM_CROSS_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
  TREASURE_GEM_BONUS_MOVES,
  MIRROR_MULTIPLIER,
  SILVER_MULTIPLIER,
  SILVER_COUNTDOWN_EXTEND,
  DIAMOND_MULTIPLIER,
  DIAMOND_REVEAL_TURNS,
  SCRABBLE_VALUES,
  COUNTDOWN_DEFUSE_BONUS,
  COUNTDOWN_DEFUSE_MOVES,
  VIRUS_CLEAR_SCORE,
  VIRUS_MASS_CURE_THRESHOLD,
  PORTAL_USE_BONUS,
  PORTAL_WORD_MULTIPLIER,
  type BlastTileState,
  type BlastTileType,
  type BlastExplosion,
  type BlastScorePopup,
} from '../types';
import { rollSpecialFromDistribution } from './blastTileGeneration';
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
  fireCatalystUpgrade,
} from './blastTileEffects';
import { calculateBonusMoves } from './blastMoveUtils';
import { earnTileUpgrade } from './blastEarnedTiles';

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
  vortexLetterSwaps: Array<{ fromR: number; fromC: number; toR: number; toC: number }>;
  detectedCombos: SpecialCombo[];
  bonusMoveCount: number;
  /** Turns of diamond reveal to add to game state */
  diamondRevealTurns: number;
  /** Silver extended countdown timers (already applied to tiles) */
  silverCountdownExtended: boolean;
  /** Virus mass cure triggered (3+ virus cleared in one word) */
  virusMassCure: boolean;
  /** Portal word multiplier (applied if word passes through portal) */
  portalMultiplier: number;
}

/**
 * Process tile effects for a word path. Pure function — no React state mutations.
 * Returns the new tile state grid and all computed side-effect data.
 */
export function processTilesForWord(input: TileProcessingInput): TileProcessingResult {
  const { prev, path, word, baseScore, gridSize, currentWave, preDetectedCombos, rng = Math.random } = input;

  // Pre-build path lookup set for O(1) membership checks
  const pathSet = new Set(path.map(p => `${p.row},${p.col}`));

  const next = prev.map(row => row.map(tile => ({ ...tile })));
  let bonusScore = 0;
  const newExplosions: BlastExplosion[] = [];
  const now = Date.now();
  const pendingPopups: BlastScorePopup[] = [];

  let newlyClearedCount = 0;
  const clearedTypeCounts: Partial<Record<BlastTileType, number>> = {};
  let goldMultiplier = 1;
  let gemsCompletedThisWord = 0;
  let tileBonusMoves = 0;
  let diamondRevealTurns = 0;
  let silverCountdownExtended = false;
  let virusClearedCount = 0;
  let hasPortal = false;

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

  // ── Combo detection (skip if caller already detected) ──
  const detectedCombos = preDetectedCombos ?? detectSpecialCombos(path, next);
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
    // comboMultiplier applied after effectiveBase is computed (see score calculation below)
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
        tileBonusMoves += GOLD_BONUS_MOVES;
        newExplosions.push({ id: `gold-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        break;
      case 'silver':
        goldMultiplier *= SILVER_MULTIPLIER;
        // Extend all active countdown timers on the board
        if (!silverCountdownExtended) {
          silverCountdownExtended = true;
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              const t = next[r][c];
              if (t.type === 'countdown' && !t.isCleared && t.countdown != null) {
                t.countdown += SILVER_COUNTDOWN_EXTEND;
              }
            }
          }
        }
        newExplosions.push({ id: `silver-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        break;
      case 'diamond':
        goldMultiplier *= DIAMOND_MULTIPLIER;
        diamondRevealTurns = Math.max(diamondRevealTurns, DIAMOND_REVEAL_TURNS);
        newExplosions.push({ id: `diamond-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 3, timestamp: now });
        break;

      case 'mirror': {
        newExplosions.push({ id: `mirror-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        if (mirrorFirstSpecial !== null) {
          const mirrorRefire = reFireOffensiveSpecial(mirrorFirstSpecial, ctx);
          bonusScore += mirrorRefire.bonusScore;
          vortexLetterSwaps.push(...mirrorRefire.letterSwaps);
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
          const rainbowRefire = reFireOffensiveSpecial(bestOffensiveSpecial, ctx);
          bonusScore += rainbowRefire.bonusScore;
          vortexLetterSwaps.push(...rainbowRefire.letterSwaps);
        } else {
          rainbowSoloMultiplier = RAINBOW_BOOST_MULTIPLIER;
        }
        break;
      }

      case 'ice':
        bonusScore += ICE_CLEAR_BONUS;
        // Ice shatter: freeze adjacent virus tiles (prevent spread for 2 turns)
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const r = cell.row + dr;
          const c = cell.col + dc;
          if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
            const adj = next[r][c];
            if (!adj.isCleared && adj.type === 'virus') {
              adj.activationEffect = 'virus-frozen';
              // Convert virus to ice (2 hits to break, stops spread)
              adj.type = 'ice';
              adj.hitsRemaining = 2;
            }
          }
        }
        break;

      case 'prism': {
        bonusScore += PRISM_USE_BONUS + PRISM_CROSS_BONUS;
        newExplosions.push({ id: `prism-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'prism', intensity: 4, timestamp: now });
        bonusScore += firePrismCross(cell.row, cell.col, ctx);
        // Prism converts 2 random standard tiles to specials
        {
          const standardTiles: BlastTileState[] = [];
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              const t = next[r][c];
              if (!t.isCleared && t.type === 'standard' && !pathSet.has(`${r},${c}`)) {
                standardTiles.push(t);
              }
            }
          }
          // Pick 2 random standard tiles and convert them
          for (let i = standardTiles.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [standardTiles[i], standardTiles[j]] = [standardTiles[j], standardTiles[i]];
          }
          const prismConvertCount = Math.min(2, standardTiles.length);
          for (let i = 0; i < prismConvertCount; i++) {
            const t = standardTiles[i];
            const specials: BlastTileType[] = ['bomb', 'lightning', 'gold', 'rainbow'];
            t.type = specials[Math.floor(rng() * specials.length)];
            t.activationEffect = 'prism-convert';
          }
        }
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

      case 'wildcard': {
        // Wildcard scores based on highest Scrabble-value letter it could represent
        const letterIdx = path.indexOf(cell);
        const wildcardLetter = letterIdx >= 0 ? word[letterIdx]?.toUpperCase() : null;
        const wildcardValue = wildcardLetter ? (SCRABBLE_VALUES[wildcardLetter] ?? 1) : 1;
        bonusScore += wildcardValue;
        if (wildcardValue >= 4) {
          newExplosions.push({ id: `wildcard-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        }
        break;
      }

      case 'countdown':
        // Defused! Player included it in a word before it exploded — bonus moves reward
        bonusScore += COUNTDOWN_DEFUSE_BONUS;
        tileBonusMoves += COUNTDOWN_DEFUSE_MOVES;
        newExplosions.push({ id: `countdown-defuse-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        break;

      case 'virus':
        // Virus cleared — track count for mass cure
        bonusScore += VIRUS_CLEAR_SCORE;
        virusClearedCount++;
        break;

      case 'portal': {
        bonusScore += PORTAL_USE_BONUS;
        hasPortal = true;
        newExplosions.push({ id: `portal-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 2, timestamp: now });
        // Clear the paired portal too
        const pairId = prev[cell.row]?.[cell.col]?.portalPairId;
        if (pairId) {
          for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
              const t = next[r][c];
              if (!t.isCleared && t.type === 'portal' && t.portalPairId === pairId && !(r === cell.row && c === cell.col)) {
                markCleared(t);
                newExplosions.push({ id: `portal-pair-${now}-${r}-${c}`, row: r, col: c, type: 'word', intensity: 2, timestamp: now });
              }
            }
          }
        }
        break;
      }

      case 'catalyst': {
        newExplosions.push({ id: `catalyst-${now}-${cell.row}-${cell.col}`, row: cell.row, col: cell.col, type: 'word', intensity: 3, timestamp: now });
        bonusScore += fireCatalystUpgrade(cell.row, cell.col, ctx, currentWave, rollSpecialFromDistribution);
        break;
      }
    }
  }

  // Virus mass cure: clearing 3+ virus tiles in one word cures ALL virus on board
  const virusMassCure = virusClearedCount >= VIRUS_MASS_CURE_THRESHOLD;
  if (virusMassCure) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const t = next[r][c];
        if (t.type === 'virus' && !t.isCleared) {
          markCleared(t);
          t.activationEffect = 'virus-cured';
          newExplosions.push({ id: `virus-cure-${now}-${r}-${c}`, row: r, col: c, type: 'clear', intensity: 2, timestamp: now });
        }
      }
    }
  }

  // Gem completion bonus moves
  if (gemsCompletedThisWord > 0) {
    tileBonusMoves += gemsCompletedThisWord * TREASURE_GEM_BONUS_MOVES;
  }

  // Treasure Gem spawns
  spawnGemSpecials(gemsCompletedThisWord, currentWave, next, gridSize, path, rollSpecialFromDistribution);

  // Earned tile creation — 5+ letter words upgrade a standard tile to a special
  const earnedTile = earnTileUpgrade(next, path, word.length, currentWave);
  if (earnedTile) {
    const upgradedType = next[earnedTile.row][earnedTile.col].type;
    newExplosions.push({
      id: `earned-${now}-${earnedTile.row}-${earnedTile.col}`,
      row: earnedTile.row, col: earnedTile.col,
      type: upgradedType === 'bomb' ? 'bomb' : upgradedType === 'lightning' ? 'lightning' : 'word',
      intensity: 2, timestamp: now,
    });
  }

  // Process bomb BFS chain
  const bombResult = processBombBFS(ctx);
  bonusScore += bombResult.bonusScore;
  newExplosions.push(...bombResult.explosions);

  // Word explosion (skip when >=2 special explosions)
  if (path.length > 0 && newExplosions.length < 2) {
    const midIdx = Math.floor(path.length / 2);
    const intensity = path.length <= 3 ? 1 : path.length <= 5 ? 2 : path.length <= 7 ? 3 : 4;
    newExplosions.push({ id: `word-${now}`, row: path[midIdx].row, col: path[midIdx].col, type: 'word', intensity: intensity as 1 | 2 | 3 | 4, timestamp: now });
  }

  // Score calculation: solo multipliers -> gold multiplier -> portal -> bonus
  const portalMultiplier = hasPortal ? PORTAL_WORD_MULTIPLIER : 1;
  const effectiveBase = baseScore * rainbowSoloMultiplier * mirrorSoloMultiplier * portalMultiplier;
  const goldBonusScore = effectiveBase * goldMultiplier - effectiveBase;
  if (goldMultiplier > 1) {
    const multiplierTiles = path.filter(cell => {
      const t = next[cell.row]?.[cell.col];
      return t?.type === 'gold' || t?.type === 'silver' || t?.type === 'diamond';
    });
    const perTileBonus = multiplierTiles.length > 0 ? Math.round(goldBonusScore / multiplierTiles.length) : goldBonusScore;
    for (const cell of multiplierTiles) {
      const t = next[cell.row]?.[cell.col];
      pendingPopups.push({ id: `gold-bonus-${now}-${cell.row}-${cell.col}`, score: perTileBonus, row: cell.row, col: cell.col, isSpecial: true, timestamp: now, tileType: (t?.type ?? 'gold') as 'gold' });
    }
  }
  // Combo multiplier stacks with gold/rainbow/mirror multipliers
  const totalScore = effectiveBase * goldMultiplier * comboMultiplier + bonusScore;

  if (path.length > 0) {
    const midIdx = Math.floor(path.length / 2);
    pendingPopups.push({ id: `score-${now}-${path[midIdx].row}-${path[midIdx].col}`, score: totalScore, row: path[midIdx].row, col: path[midIdx].col, isSpecial: bonusScore > 0, timestamp: now });
  }

  // Row-clear reward for 7+ letter words — clears all tile types in the row
  // Trigger special tile effects (bomb, lightning, prism) instead of silently clearing
  if (word.length >= 7 && path.length > 0) {
    const midCell = path[Math.floor(path.length / 2)];
    const targetRow = midCell.row;
    for (let c = 0; c < gridSize; c++) {
      const tile = next[targetRow]?.[c];
      if (!tile || tile.isCleared) continue;
      // Skip tiles already in the word path (already processed above)
      if (pathSet.has(`${targetRow},${c}`)) continue;

      if (isMultiHitAlive(tile)) {
        hitMultiHitTile(tile);
      } else {
        tile.activationEffect = tile.type !== 'standard' ? tile.type : null;
        markCleared(tile);
        // Trigger offensive specials so bombs explode, lightning fires, etc.
        switch (tile.type) {
          case 'bomb': {
            const bk = `${targetRow},${c}`;
            if (!processedBombs.has(bk)) {
              processedBombs.add(bk);
              bombQueue.push({ row: targetRow, col: c, depth: 0 });
            }
            break;
          }
          case 'lightning': {
            const lk = `${targetRow},${c}`;
            if (!processedLightning.has(lk)) {
              processedLightning.add(lk);
              bonusScore += fireLightningColumn(targetRow, c, ctx);
            }
            break;
          }
          case 'prism':
            bonusScore += firePrismCross(targetRow, c, ctx);
            break;
          default:
            break;
        }
      }
      newExplosions.push({ id: `row-clear-${now}-${targetRow}-${c}`, type: 'clear', row: targetRow, col: c, intensity: 2, timestamp: now });
    }
    // Process any bombs queued by row-clear (main BFS already ran earlier)
    if (bombQueue.length > 0) {
      const rowClearBombResult = processBombBFS(ctx);
      bonusScore += rowClearBombResult.bonusScore;
      newExplosions.push(...rowClearBombResult.explosions);
    }
  }

  const bonusMoveCount = calculateBonusMoves(word.length) + tileBonusMoves;

  return {
    next,
    totalScore,
    newlyClearedCount,
    clearedTypeCounts,
    explosions: newExplosions,
    pendingPopups,
    vortexLetterSwaps,
    detectedCombos,
    bonusMoveCount,
    diamondRevealTurns,
    silverCountdownExtended,
    virusMassCure,
    portalMultiplier,
  };
}
