/**
 * Tactical combo effects: magnet, gem, frozen cross-type pairs.
 * Split from blastComboEffects.ts to stay under 500-line limit.
 */
import {
  VORTEX_PULL_RADIUS,
  TREASURE_GEM_COMPLETION_BONUS,
  FROST_REVEAL_BONUS,
} from '../types';

import { fireAreaBlast, fireCrossClear, fireVortex, pushExplosion, type ComboEffectContext, type ComboEffectResult } from './blastComboEffects';
import { scaledRadius } from './blastComboScaling';

/**
 * Handle tactical combo types (magnet/gem/frozen crosses).
 * Returns true if this function handled the combo, false if unrecognized.
 */
export function executeTacticalCombo(
  ctx: ComboEffectContext,
  result: ComboEffectResult,
): boolean {
  const { combo, next, gridSize, now } = ctx;

  switch (combo.type) {
    case 'magnet_gem': {
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
      fireVortex(mgMagnetT.row, mgMagnetT.col, scaledRadius(VORTEX_PULL_RADIUS, ctx.wordLengthScale), result, ctx);
      pushExplosion(`combo-mgg-${now}`, mgMagnetT.row, mgMagnetT.col, result, now);
      return true;
    }

    case 'magnet_frozen': {
      const mfMagnetT = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[0];
      if (!mfMagnetT) break;
      fireVortex(mfMagnetT.row, mfMagnetT.col, scaledRadius(VORTEX_PULL_RADIUS, ctx.wordLengthScale), result, ctx);
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
      return true;
    }

    case 'gem_frozen': {
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
      return true;
    }

    case 'gold_special': {
      // Gold + effect tile: area blast around the effect tile (gold amplifies)
      const gsEffect = combo.tiles.find(t => t.tileType !== 'gold') ?? combo.tiles[1];
      if (!gsEffect) break;
      fireAreaBlast(gsEffect.row, gsEffect.col, scaledRadius(2, ctx.wordLengthScale), ctx);
      pushExplosion(`combo-gs-${now}`, gsEffect.row, gsEffect.col, result, now);
      return true;
    }

    case 'rainbow_special': {
      // Rainbow + effect tile: re-fire the paired tile's native ability (cross-clear)
      const rsEffect = combo.tiles.find(t => t.tileType !== 'rainbow') ?? combo.tiles[1];
      if (!rsEffect) break;
      fireCrossClear(rsEffect.row, rsEffect.col, ctx);
      pushExplosion(`combo-rs-${now}`, rsEffect.row, rsEffect.col, result, now);
      return true;
    }

    case 'triple_special': {
      // 3+ specials: area blast at the middle tile of the trio
      const triCenter = combo.tiles[1] ?? combo.tiles[0];
      if (!triCenter) break;
      fireAreaBlast(triCenter.row, triCenter.col, scaledRadius(2, ctx.wordLengthScale), ctx);
      pushExplosion(`combo-ts-${now}`, triCenter.row, triCenter.col, result, now);
      return true;
    }

    default:
      return false;
  }

  return false;
}
