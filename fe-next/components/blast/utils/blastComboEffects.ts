import {
  type BlastTileState,
  type BlastExplosion,
  BOMB_RADIUS,
  VORTEX_PULL_RADIUS,
  VORTEX_EXPLODE_RADIUS,
  VORTEX_PULL_BONUS,
  VORTEX_EXPLODE_BONUS,
  TREASURE_GEM_COMPLETION_BONUS,
  RAINBOW_BOOST_MULTIPLIER,
  FROST_REVEAL_BONUS,
} from '../types';
import type { SpecialCombo } from './blastCombos';

// ==================== Types ====================

export interface ComboEffectContext {
  /** The combo to execute */
  combo: SpecialCombo;
  /** Current tile state grid (mutated in place) */
  next: BlastTileState[][];
  /** Grid dimension (rows and cols) */
  gridSize: number;
  /** Full word path */
  path: Array<{ row: number; col: number }>;
  /** Current timestamp for explosion IDs */
  now: number;
  /** Mark a tile as cleared (mutates grid) */
  markCleared: (tile: BlastTileState) => void;
  /** Returns true if tile is multi-hit and NOT on its final hit */
  isMultiHitAlive: (tile: BlastTileState) => boolean;
  /** Decrement multi-hit tile's hit counter (mutates grid) */
  hitMultiHitTile: (tile: BlastTileState) => void;
}

export interface ComboEffectResult {
  /** Explosion events to emit */
  explosions: BlastExplosion[];
  /** Bomb tile keys (`row,col`) consumed by this combo (prevents double-BFS) */
  processedBombKeys: string[];
  /** Lightning tile keys consumed by this combo */
  processedLightningKeys: string[];
  /** Additional bonus score from this combo effect */
  bonusScore: number;
  /** Optional: number of specials to spawn after this combo (e.g. mirror_gem doubles output) */
  spawnCount?: number;
}

// ==================== Helpers ====================

function emptyResult(): ComboEffectResult {
  return {
    explosions: [],
    processedBombKeys: [],
    processedLightningKeys: [],
    bonusScore: 0,
  };
}

function applyToTile(
  tile: BlastTileState,
  ctx: ComboEffectContext,
): void {
  if (tile.isCleared) return;
  if (ctx.isMultiHitAlive(tile)) {
    ctx.hitMultiHitTile(tile);
  } else {
    ctx.markCleared(tile);
  }
}

/** Fire row+column cross-clear centered at (row, col) */
function fireCrossClear(row: number, col: number, ctx: ComboEffectContext): void {
  const { next, gridSize } = ctx;
  for (let c = 0; c < gridSize; c++) applyToTile(next[row][c], ctx);
  for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
}

/** Clear tiles in a square radius area centered at (row, col) */
function fireAreaBlast(row: number, col: number, radius: number, ctx: ComboEffectContext): void {
  const { next, gridSize } = ctx;
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) applyToTile(next[r][c], ctx);
    }
  }
}

/** Execute vortex pull+explode centered at (centerRow, centerCol) with given pull radius */
function fireVortex(
  centerRow: number,
  centerCol: number,
  pullRadius: number,
  result: ComboEffectResult,
  ctx: ComboEffectContext,
): void {
  const { next, gridSize } = ctx;
  // Phase 1: Pull — outermost ring inward (axis-preference movement)
  for (let pr = pullRadius; pr >= 1; pr--) {
    for (let dr = -pr; dr <= pr; dr++) {
      for (let dc = -pr; dc <= pr; dc++) {
        if (Math.abs(dr) + Math.abs(dc) !== pr) continue;
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        const sourceTile = next[r][c];
        if (sourceTile.isCleared) continue;
        const stepR = dr === 0 ? 0 : (dr > 0 ? -1 : 1);
        const stepC = dc === 0 ? 0 : (dc > 0 ? -1 : 1);
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
        if (targetTile.isCleared) {
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
          result.bonusScore += VORTEX_PULL_BONUS;
        }
      }
    }
  }
  // Phase 2: Explode — clear tiles within radius 1 of vortex position
  for (let dr = -VORTEX_EXPLODE_RADIUS; dr <= VORTEX_EXPLODE_RADIUS; dr++) {
    for (let dc = -VORTEX_EXPLODE_RADIUS; dc <= VORTEX_EXPLODE_RADIUS; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = centerRow + dr;
      const c = centerCol + dc;
      if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
      const etarget = next[r][c];
      if (etarget.isCleared) continue;
      applyToTile(etarget, ctx);
      result.bonusScore += VORTEX_EXPLODE_BONUS;
    }
  }
}

/** Push a combo explosion at the given position */
function pushExplosion(id: string, row: number, col: number, result: ComboEffectResult, now: number, type: BlastExplosion['type'] = 'combo'): void {
  result.explosions.push({ id, row, col, type, intensity: 4, timestamp: now });
}

// ==================== executeComboEffect ====================

/**
 * Execute a single detected combo, mutating grid state and returning
 * explosion events + metadata for the caller to accumulate.
 *
 * Unknown combo types (new pairs not yet implemented) return an empty result
 * so useBlastGame.ts doesn't crash when new pairs are detected.
 */
export function executeComboEffect(ctx: ComboEffectContext): ComboEffectResult {
  const { combo, next, gridSize, path, now } = ctx;
  const result = emptyResult();

  switch (combo.type) {
    case 'bomb_bomb': {
      const midRow = Math.round((combo.tiles[0].row + combo.tiles[1].row) / 2);
      const midCol = Math.round((combo.tiles[0].col + combo.tiles[1].col) / 2);
      fireAreaBlast(midRow, midCol, 2, ctx);
      pushExplosion(`combo-bb-${now}`, midRow, midCol, result, now, 'mega_blast');
      result.processedBombKeys.push(
        `${combo.tiles[0].row},${combo.tiles[0].col}`,
        `${combo.tiles[1].row},${combo.tiles[1].col}`,
      );
      break;
    }

    case 'bomb_lightning': {
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
        const col = bt.col + dc;
        if (col < 0 || col >= gridSize) continue;
        for (let r = 0; r < gridSize; r++) {
          applyToTile(next[r][col], ctx);
        }
      }
      pushExplosion(`combo-bl-${now}`, bt.row, bt.col, result, now);
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'bomb_prism': {
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const cR = bt.row + dr;
          const cC = bt.col + dc;
          if (cR < 0 || cR >= gridSize || cC < 0 || cC >= gridSize) continue;
          for (let r = 0; r < gridSize; r++) applyToTile(next[r][cC], ctx);
          for (let c = 0; c < gridSize; c++) applyToTile(next[cR][c], ctx);
        }
      }
      pushExplosion(`combo-bp-${now}`, bt.row, bt.col, result, now);
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'lightning_lightning': {
      const cols = new Set(path.map(p => p.col));
      for (const col of cols) {
        for (let r = 0; r < gridSize; r++) {
          applyToTile(next[r][col], ctx);
        }
      }
      pushExplosion(`combo-ll-${now}`, combo.tiles[0].row, combo.tiles[0].col, result, now);
      break;
    }

    case 'lightning_prism': {
      for (const tile of combo.tiles) {
        for (let d = -1; d <= 1; d++) {
          const row = tile.row + d;
          const col = tile.col + d;
          if (row >= 0 && row < gridSize) {
            for (let c = 0; c < gridSize; c++) applyToTile(next[row][c], ctx);
          }
          if (col >= 0 && col < gridSize) {
            for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
          }
        }
      }
      pushExplosion(`combo-lp-${now}`, combo.tiles[0].row, combo.tiles[0].col, result, now);
      break;
    }

    case 'prism_prism': {
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!next[r][c].isCleared) ctx.markCleared(next[r][c]);
        }
      }
      pushExplosion(`combo-pp-${now}`, 3, 3, result, now, 'total_destruction');
      break;
    }


    // ── 48-02: Bomb cross-type combos ───────────────────────────────────────

    case 'bomb_rainbow': {
      // Prism Bomb: cross-clear (row+col) from bomb + standard 3x3 around bomb
      const bt = combo.tiles.find(t => t.tileType === 'bomb')!;
      // Cross-clear + 3x3 around bomb
      fireCrossClear(bt.row, bt.col, ctx);
      fireAreaBlast(bt.row, bt.col, BOMB_RADIUS, ctx);
      pushExplosion(`combo-br-${now}`, bt.row, bt.col, result, now);
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'bomb_mirror': {
      // Twin Explosion: 3x3 at bomb position + 3x3 at mirror position
      const bt = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[0];
      const mt = combo.tiles.find(t => t.tileType === 'mirror') ?? combo.tiles[1];
      if (!bt || !mt) break;
      for (const center of [bt, mt]) {
        fireAreaBlast(center.row, center.col, BOMB_RADIUS, ctx);
        pushExplosion(`combo-bm-${now}-${center.row}-${center.col}`, center.row, center.col, result, now);
      }
      result.processedBombKeys.push(`${bt.row},${bt.col}`);
      break;
    }

    case 'bomb_magnet': {
      // Gravity Bomb: vortex pull toward magnet then 5x5 blast around magnet
      const mg = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      if (!mg) break;
      fireVortex(mg.row, mg.col, VORTEX_PULL_RADIUS, result, ctx);
      // 5x5 blast (radius 2) around magnet
      fireAreaBlast(mg.row, mg.col, 2, ctx);
      pushExplosion(`combo-bmg-${now}`, mg.row, mg.col, result, now);
      const bt2 = combo.tiles.find(t => t.tileType === 'bomb')!;
      result.processedBombKeys.push(`${bt2.row},${bt2.col}`);
      break;
    }

    case 'bomb_gem': {
      // Gem Burst: instantly complete gem + bomb 3x3 blast
      const bt3 = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[0];
      if (!bt3) break;
      const gt = combo.tiles.find(t => t.tileType === 'gem');
      if (gt) {
        const gemTile = next[gt.row]?.[gt.col];
        if (gemTile) {
          gemTile.hitsRemaining = 0;
          ctx.markCleared(gemTile);
          result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
        }
      }
      fireAreaBlast(bt3.row, bt3.col, BOMB_RADIUS, ctx);
      pushExplosion(`combo-bg-${now}`, bt3.row, bt3.col, result, now);
      result.processedBombKeys.push(`${bt3.row},${bt3.col}`);
      break;
    }

    case 'bomb_frozen': {
      // Cryo Blast: crack all frost tiles on board + bomb 3x3 blast
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = next[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            applyToTile(tile, ctx);
          }
        }
      }
      const bt4 = combo.tiles.find(t => t.tileType === 'bomb') ?? combo.tiles[0];
      if (!bt4) break;
      fireAreaBlast(bt4.row, bt4.col, BOMB_RADIUS, ctx);
      pushExplosion(`combo-bfz-${now}`, bt4.row, bt4.col, result, now);
      result.processedBombKeys.push(`${bt4.row},${bt4.col}`);
      break;
    }

    // ── 48-02: Lightning cross-type combos ───────────────────────────────────

    case 'lightning_rainbow': {
      // Rainbow Strike: clear column for each rainbow tile on board + lightning column
      const lt = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      if (!lt) break;
      const clearedCols = new Set<number>();
      clearedCols.add(lt.col);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (next[r][c].type === 'rainbow' && !next[r][c].isCleared) {
            clearedCols.add(c);
          }
        }
      }
      for (const col of clearedCols) {
        for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
      }
      pushExplosion(`combo-lr-${now}`, lt.row, lt.col, result, now);
      result.processedLightningKeys.push(`${lt.row},${lt.col}`);
      break;
    }

    case 'lightning_mirror': {
      // Double Strike: clear column at lightning AND column at mirror
      const lt2 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      const mt2 = combo.tiles.find(t => t.tileType === 'mirror') ?? combo.tiles[1];
      if (!lt2 || !mt2) break;
      for (const tile of [lt2, mt2]) {
        for (let r = 0; r < gridSize; r++) applyToTile(next[r][tile.col], ctx);
        pushExplosion(`combo-lm-${now}-${tile.col}`, tile.row, tile.col, result, now);
      }
      result.processedLightningKeys.push(`${lt2.row},${lt2.col}`);
      break;
    }

    case 'lightning_magnet': {
      // Magnetic Storm: vortex pull toward magnet, then clear columns of pulled tiles
      const lt3 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      const mg2 = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      if (!lt3 || !mg2) break;
      fireVortex(mg2.row, mg2.col, VORTEX_PULL_RADIUS, result, ctx);
      // Clear the magnet column (and nearby columns from pull area)
      const colsToBlast = new Set<number>();
      for (let dr = -VORTEX_PULL_RADIUS; dr <= VORTEX_PULL_RADIUS; dr++) {
        const r = mg2.row + dr;
        if (r >= 0 && r < gridSize) {
          for (let dc = -VORTEX_PULL_RADIUS; dc <= VORTEX_PULL_RADIUS; dc++) {
            const c = mg2.col + dc;
            if (c >= 0 && c < gridSize && !next[r][c].isCleared) {
              colsToBlast.add(c);
            }
          }
        }
      }
      colsToBlast.add(mg2.col);
      for (const col of colsToBlast) {
        for (let r = 0; r < gridSize; r++) applyToTile(next[r][col], ctx);
      }
      pushExplosion(`combo-lmg-${now}`, mg2.row, mg2.col, result, now);
      result.processedLightningKeys.push(`${lt3.row},${lt3.col}`);
      break;
    }

    case 'lightning_gem': {
      // Shatter Strike: complete gem + column clear
      const lt4 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      if (!lt4) break;
      const gt2 = combo.tiles.find(t => t.tileType === 'gem');
      if (gt2) {
        const gemTile2 = next[gt2.row]?.[gt2.col];
        if (gemTile2) {
          gemTile2.hitsRemaining = 0;
          ctx.markCleared(gemTile2);
          result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
        }
      }
      for (let r = 0; r < gridSize; r++) applyToTile(next[r][lt4.col], ctx);
      pushExplosion(`combo-lg-${now}`, lt4.row, lt4.col, result, now);
      result.processedLightningKeys.push(`${lt4.row},${lt4.col}`);
      break;
    }

    case 'lightning_frozen': {
      // Permafrost: column clear + advance all frost tiles by 1 hit
      const lt5 = combo.tiles.find(t => t.tileType === 'lightning') ?? combo.tiles[0];
      if (!lt5) break;
      for (let r = 0; r < gridSize; r++) applyToTile(next[r][lt5.col], ctx);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = next[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            applyToTile(tile, ctx);
          }
        }
      }
      pushExplosion(`combo-lfz-${now}`, lt5.row, lt5.col, result, now);
      result.processedLightningKeys.push(`${lt5.row},${lt5.col}`);
      break;
    }

    // ── 48-02: Prism + Rainbow combos ────────────────────────────────────────

    case 'prism_rainbow': {
      // Aurora: cross-clear from EVERY cell in the word path
      const pathCells = path.length > 0 ? path : combo.tiles.map(t => ({ row: t.row, col: t.col }));
      for (const cell of pathCells) {
        fireCrossClear(cell.row, cell.col, ctx);
      }
      pushExplosion(`combo-pr-${now}`, combo.tiles[0].row, combo.tiles[0].col, result, now);
      break;
    }

    case 'prism_mirror': {
      // Twin Cross: cross-clear from prism twice (double-damage)
      const pt2 = combo.tiles.find(t => t.tileType === 'prism') ?? combo.tiles[0];
      if (!pt2) break;
      fireCrossClear(pt2.row, pt2.col, ctx);
      fireCrossClear(pt2.row, pt2.col, ctx);
      pushExplosion(`combo-pmr-${now}`, pt2.row, pt2.col, result, now);
      break;
    }

    // ── 48-03: Mirror, Magnet, Gem, Frozen cross-type combos ─────────────────

    case 'mirror_magnet': {
      // Dual Vortex: vortex pull+explode at BOTH magnet and mirror positions
      const mmMagnet = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      const mmMirror = combo.tiles.find(t => t.tileType === 'mirror') ?? combo.tiles[0];
      if (!mmMagnet || !mmMirror) break;
      fireVortex(mmMagnet.row, mmMagnet.col, VORTEX_PULL_RADIUS, result, ctx);
      pushExplosion(`combo-mma-${now}`, mmMagnet.row, mmMagnet.col, result, now);
      fireVortex(mmMirror.row, mmMirror.col, VORTEX_PULL_RADIUS, result, ctx);
      pushExplosion(`combo-mmb-${now}`, mmMirror.row, mmMirror.col, result, now);
      break;
    }

    case 'mirror_gem': {
      // Twin Gems: complete gem + 2x bonus + spawnCount 4 (mirror doubles)
      const mgMirrorT = combo.tiles.find(t => t.tileType === 'mirror') ?? combo.tiles[0];
      const mgGemT = combo.tiles.find(t => t.tileType === 'gem') ?? combo.tiles[1];
      if (!mgMirrorT) break;
      if (mgGemT) {
        const gemTile3 = next[mgGemT.row]?.[mgGemT.col];
        if (gemTile3) { gemTile3.hitsRemaining = 0; ctx.markCleared(gemTile3); }
      }
      result.bonusScore += 2 * TREASURE_GEM_COMPLETION_BONUS;
      result.spawnCount = 4;
      pushExplosion(`combo-mg-${now}`, mgMirrorT.row, mgMirrorT.col, result, now);
      break;
    }

    case 'mirror_frozen': {
      // Mirror Frost: remove 2 hits from frost tile (mirror doubles the hit)
      const mfMirrorT = combo.tiles.find(t => t.tileType === 'mirror') ?? combo.tiles[0];
      const mfFrostT = combo.tiles.find(t => t.tileType === 'frozen') ?? combo.tiles[1];
      if (!mfMirrorT) break;
      if (mfFrostT) {
        const frostTile = next[mfFrostT.row]?.[mfFrostT.col];
        if (frostTile && !frostTile.isCleared) {
          frostTile.hitsRemaining = Math.max(0, frostTile.hitsRemaining - 2);
          if (frostTile.hitsRemaining === 0) ctx.markCleared(frostTile);
        }
      }
      result.bonusScore += 2 * FROST_REVEAL_BONUS;
      pushExplosion(`combo-mf-${now}`, mfMirrorT.row, mfMirrorT.col, result, now);
      break;
    }

    case 'magnet_gem': {
      // Gem Suction: complete ALL gem tiles on board + vortex pull
      const mgMagnetT = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[0];
      if (!mgMagnetT) break;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = next[r][c];
          if (tile.type === 'gem' && !tile.isCleared) {
            tile.hitsRemaining = 0;
            ctx.markCleared(tile);
            result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
          }
        }
      }
      fireVortex(mgMagnetT.row, mgMagnetT.col, VORTEX_PULL_RADIUS, result, ctx);
      pushExplosion(`combo-mgg-${now}`, mgMagnetT.row, mgMagnetT.col, result, now);
      break;
    }

    case 'magnet_frozen': {
      // Frost Vortex: vortex pull toward magnet + advance all frost tiles by 1 hit
      const mfMagnetT = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[0];
      if (!mfMagnetT) break;
      fireVortex(mfMagnetT.row, mfMagnetT.col, VORTEX_PULL_RADIUS, result, ctx);
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const tile = next[r][c];
          if (tile.type === 'frozen' && !tile.isCleared) {
            ctx.hitMultiHitTile(tile);
            if (tile.hitsRemaining <= 0) ctx.markCleared(tile);
          }
        }
      }
      pushExplosion(`combo-mfz-${now}`, mfMagnetT.row, mfMagnetT.col, result, now);
      break;
    }

    case 'gem_frozen': {
      // Crystal Prison: complete gem + free frost simultaneously with combined bonus
      const gfGemT = combo.tiles.find(t => t.tileType === 'gem') ?? combo.tiles[0];
      const gfFrostT = combo.tiles.find(t => t.tileType === 'frozen') ?? combo.tiles[1];
      if (gfGemT) {
        const gemTile4 = next[gfGemT.row]?.[gfGemT.col];
        if (gemTile4 && !gemTile4.isCleared) {
          gemTile4.hitsRemaining = 0;
          ctx.markCleared(gemTile4);
          result.bonusScore += TREASURE_GEM_COMPLETION_BONUS;
        }
      }
      if (gfFrostT) {
        const frostTile2 = next[gfFrostT.row]?.[gfFrostT.col];
        if (frostTile2 && !frostTile2.isCleared) {
          frostTile2.hitsRemaining = 0;
          ctx.markCleared(frostTile2);
          result.bonusScore += FROST_REVEAL_BONUS;
        }
      }
      const gfRef = gfGemT ?? gfFrostT ?? combo.tiles[0];
      if (gfRef) pushExplosion(`combo-gf-${now}`, gfRef.row, gfRef.col, result, now);
      break;
    }

    default:
      // Unknown combo types — no-op skeleton, returns empty result
      break;
  }

  return result;
}
