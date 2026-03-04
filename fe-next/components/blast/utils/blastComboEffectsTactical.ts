/**
 * Tactical combo effects: mirror, magnet, gem, frozen cross-type pairs.
 * Split from blastComboEffects.ts to stay under 500-line limit.
 */
import {
  VORTEX_PULL_RADIUS,
  TREASURE_GEM_COMPLETION_BONUS,
  FROST_REVEAL_BONUS,
} from '../types';
// eslint-disable-next-line no-duplicate-imports
import type { ComboEffectContext, ComboEffectResult } from './blastComboEffects';
import { scaledRadius } from './blastComboScaling';
import { applyToTile, fireVortex, pushExplosion } from './blastComboEffects'; // eslint-disable-line no-duplicate-imports

/**
 * Handle tactical combo types (mirror/magnet/gem/frozen crosses).
 * Returns true if this function handled the combo, false if unrecognized.
 */
export function executeTacticalCombo(
  ctx: ComboEffectContext,
  result: ComboEffectResult,
): boolean {
  const { combo, next, gridSize, now } = ctx;

  switch (combo.type) {
    case 'mirror_magnet': {
      const mmMagnet = combo.tiles.find(t => t.tileType === 'magnet') ?? combo.tiles[1];
      const mmMirror = combo.tiles.find(t => t.tileType === 'mirror') ?? combo.tiles[0];
      if (!mmMagnet || !mmMirror) break;
      const mmVortexRadius = scaledRadius(VORTEX_PULL_RADIUS, ctx.wordLengthScale);
      fireVortex(mmMagnet.row, mmMagnet.col, mmVortexRadius, result, ctx);
      pushExplosion(`combo-mma-${now}`, mmMagnet.row, mmMagnet.col, result, now);
      fireVortex(mmMirror.row, mmMirror.col, mmVortexRadius, result, ctx);
      pushExplosion(`combo-mmb-${now}`, mmMirror.row, mmMirror.col, result, now);
      return true;
    }

    case 'mirror_gem': {
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
      return true;
    }

    case 'mirror_frozen': {
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
      return true;
    }

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

    default:
      return false;
  }

  return false;
}
