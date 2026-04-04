// ─── Blast Clear Effects Hook ─────────────────────────────────────────────
// Handles per-tile visual effects (particles, debris, shake, flash) when
// tiles are cleared from the board.

import { useEffect, useRef, type RefObject } from 'react';
import {
  TILE_EXPLOSION, COMBO_FLASH, CASCADE_SPARKLE,
  BOMB_EXPLOSION, LIGHTNING_SPARK, PRISM_CROSS, GEM_SHATTER,
  VORTEX_PULL, CONFETTI_BURST, FIRE_EMBERS, FROST_CRYSTALS, ELECTRIC_RINGS,
  GOLD_STARS, DIAMOND_SHARDS,
} from '@/lib/gameEngine/presets/particles';
import type { BlastTileState, BlastTileType } from '@/components/blast/types';
import {
  type TileRenderer,
  type PhysicsDebris,
  type ParticlePool,
  type ScreenShake,
  type PhysicsWorld,
  type ScreenFlash,
  type TimeDilation,
} from '@/lib/gameEngine';

/** Map tile types to theme colors for debris */
export const DEBRIS_COLORS: Record<string, number> = {
  standard: 0xfff5e6, bomb: 0xff2222, lightning: 0xffee00,
  prism: 0xbb66ff, gem: 0x22dd88, gold: 0xffcc00,
  diamond: 0x55ddff, ice: 0x99ddff, frozen: 0x5588bb,
  rainbow: 0xff6699, mirror: 0xddddee, magnet: 0x9933ee,
};

interface UseBlastClearEffectsOpts {
  clearedTiles: Array<{ row: number; col: number; type: BlastTileType }> | undefined;
  tileStatesRef: RefObject<BlastTileState[][]>;
  tileRendererRef: RefObject<TileRenderer | null>;
  debrisRef: RefObject<PhysicsDebris | null>;
  particles: ParticlePool;
  shake: ScreenShake;
  physics: PhysicsWorld;
  flash: ScreenFlash;
  timeDilation: TimeDilation;
  tileSize: number;
  gridSize: number;
}

export function useBlastClearEffects({
  clearedTiles,
  tileStatesRef,
  tileRendererRef,
  debrisRef,
  particles,
  shake,
  physics,
  flash,
  timeDilation,
  tileSize,
  gridSize,
}: UseBlastClearEffectsOpts) {
  const prevClearedRef = useRef<typeof clearedTiles>(undefined);

  useEffect(() => {
    if (!clearedTiles || clearedTiles === prevClearedRef.current) return;
    prevClearedRef.current = clearedTiles;

    const renderer = tileRendererRef.current;
    const debris = debrisRef.current;
    if (!renderer || clearedTiles.length === 0) return;

    // Map cleared tiles to their uids for the renderer
    const currentStates = tileStatesRef.current;
    const ids: string[] = [];
    for (const tile of clearedTiles) {
      const ts = currentStates[tile.row]?.[tile.col];
      if (ts) ids.push(ts.uid);
    }
    renderer.clearTiles(ids);
    const ox = renderer.container.x;
    const oy = renderer.container.y;

    const wp = (row: number, col: number) => {
      const p = renderer.tileToPixel(row, col);
      return { x: p.x + ox, y: p.y + oy };
    };

    let hasExplosive = false;

    for (const tile of clearedTiles) {
      const { x: wx, y: wy } = wp(tile.row, tile.col);
      const debrisColor = DEBRIS_COLORS[tile.type] ?? 0xfff5e6;

      // Spawn physics debris for every cleared tile
      if (debris) {
        debris.spawn(wx, wy, debrisColor, tile.type === 'standard' ? 2 : 4);
      }

      switch (tile.type) {
        case 'bomb': {
          particles.burst(BOMB_EXPLOSION, wx, wy, 50);
          particles.burst(FIRE_EMBERS, wx, wy, 15);
          if (physics) try { physics.applyExplosion({ x: wx, y: wy }, 0.01, tileSize * 3); } catch { /* */ }
          flash.flash({ color: 0xff2200, duration: 0.15, intensity: 0.35 });
          hasExplosive = true;
          break;
        }
        case 'lightning': {
          for (let r = 0; r < gridSize; r++) {
            const cp = wp(r, tile.col);
            particles.burst(LIGHTNING_SPARK, cp.x, cp.y, 8);
          }
          particles.burst(ELECTRIC_RINGS, wx, wy, 10);
          const topP = wp(0, tile.col);
          const botP = wp(gridSize - 1, tile.col);
          for (let y = topP.y; y <= botP.y; y += tileSize * 0.3) {
            particles.burst(LIGHTNING_SPARK, topP.x + (Math.random() - 0.5) * 10, y, 3);
          }
          if (physics) try { physics.applyExplosion({ x: wx, y: wy }, 0.006, tileSize * 4); } catch { /* */ }
          flash.flash({ color: 0xffff88, duration: 0.1, intensity: 0.3 });
          hasExplosive = true;
          break;
        }
        case 'prism': {
          for (let r = 0; r < gridSize; r++) {
            const cp = wp(r, tile.col);
            particles.burst(PRISM_CROSS, cp.x, cp.y, 6);
          }
          for (let c = 0; c < gridSize; c++) {
            const cp = wp(tile.row, c);
            particles.burst(PRISM_CROSS, cp.x, cp.y, 6);
          }
          if (physics) try { physics.applyExplosion({ x: wx, y: wy }, 0.008, tileSize * 5); } catch { /* */ }
          flash.flash({ color: 0xbb66ff, duration: 0.2, intensity: 0.25 });
          hasExplosive = true;
          break;
        }
        case 'magnet': {
          particles.burst(VORTEX_PULL, wx, wy, 30);
          setTimeout(() => {
            try {
              particles.burst(BOMB_EXPLOSION, wx, wy, 25);
              flash.flash({ color: 0x9944ff, duration: 0.12, intensity: 0.3 });
            } catch { /* */ }
          }, 150);
          if (physics) try { physics.applyExplosion({ x: wx, y: wy }, 0.007, tileSize * 3); } catch { /* */ }
          hasExplosive = true;
          break;
        }
        case 'gem': {
          particles.burst(GEM_SHATTER, wx, wy, 30);
          setTimeout(() => {
            try { particles.burst(CASCADE_SPARKLE, wx, wy, 15); } catch { /* */ }
          }, 100);
          break;
        }
        case 'gold': {
          particles.burst(GOLD_STARS, wx, wy, 20);
          particles.burst(TILE_EXPLOSION, wx, wy, 10);
          flash.gold();
          break;
        }
        case 'diamond': {
          particles.burst(DIAMOND_SHARDS, wx, wy, 25);
          flash.flash({ color: 0xaaeeff, duration: 0.12, intensity: 0.25 });
          break;
        }
        case 'ice': {
          particles.burst(FROST_CRYSTALS, wx, wy, 20);
          break;
        }
        case 'frozen': {
          particles.burst(FROST_CRYSTALS, wx, wy, 15);
          particles.burst({ ...TILE_EXPLOSION, colors: ['6699bb', '88ccee', 'ffffff'], speed: { min: 100, max: 250 } }, wx, wy, 10);
          break;
        }
        case 'rainbow': {
          particles.burst(CONFETTI_BURST, wx, wy, 30);
          flash.flash({ color: 0xff6699, duration: 0.15, intensity: 0.2 });
          break;
        }
        case 'mirror': {
          particles.burst({ ...COMBO_FLASH, colors: ['ffffff', 'eeeeff', 'ddddff'] }, wx, wy, 15);
          flash.white();
          break;
        }
        default: {
          particles.burst(TILE_EXPLOSION, wx, wy);
          break;
        }
      }
    }

    // Screen shake based on impact
    if (hasExplosive) {
      shake.heavy();
      timeDilation.slowDown(0.3, 0.4);
    } else if (clearedTiles.length >= 5) {
      shake.medium();
      timeDilation.slowDown(0.5, 0.25);
    } else {
      shake.light();
    }
  }, [clearedTiles, particles, shake, physics, flash, timeDilation, tileSize, gridSize, tileRendererRef, debrisRef, tileStatesRef]);
}
