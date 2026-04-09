'use client';
'use no memo'; // Disable React Compiler memoization — PixiJS camera mutations incompatible with compiler immutability rules

// BlastEffectsCanvas — Hybrid PixiJS effects layer behind DOM tiles.
// GameCanvas renders particles, shake, ambient effects BEHIND DOM BlastBoard.
// Dynamically imported (ssr: false) to keep PixiJS out of SSR bundle.

import { useEffect, useRef, useCallback } from 'react';
import { Graphics } from 'pixi.js';
import { BloomFilter, ShockwaveFilter } from 'pixi-filters';
import { useBlastDebris } from './useBlastDebris';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import { createEnhancedEffects, type EnhancedEffectsManager } from './utils/blastEnhancedEffects';
import { useBlastAmbientEffects } from './useBlastAmbientEffects';
import {
  TILE_EXPLOSION_VARIANTS,
  BOMB_EXPLOSION_VARIANTS,
  LIGHTNING_SPARK,
  PRISM_CROSS,
  PRISM_BEAM_UP,
  PRISM_BEAM_DOWN,
  PRISM_BEAM_LEFT,
  PRISM_BEAM_RIGHT,
  GEM_SHATTER,
  GEM_SHARD_BURST,
  GEM_GOLDEN_EXPLOSION,
  FROST_MIST,
  ICE_SHATTER,
  FROST_CRACK,
  VORTEX_PULL,
  VORTEX_EXPLOSION,
  COMBO_FLASH_VARIANTS,
  CASCADE_SPARKLE,
  BOARD_CLEAR,
  AMBIENT_BOKEH,
  DIAMOND_SHARDS,
  GOLD_STARS,
  CONFETTI_BURST,
  FIRE_EMBERS,
  ELECTRIC_RINGS,
} from '@/lib/gameEngine/presets/particles';
import { pickRandom } from './blastEffectVariations';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { BlastTileType } from './types';

// ─── Lingering sparkle dust — slow-rising ambient particles after clears ─
const LINGER_SPARKLE: ParticleConfig = {
  maxParticles: 18,
  frequency: 0.04,
  emitterLifetime: 0.8,
  particlesPerWave: 3,
  lifetime: { min: 0.8, max: 1.6 },
  speed: { min: 20, max: 55 },
  gravity: { x: 0, y: -40 },
  scale: { start: 0.7, end: 0 },
  alpha: { start: 0.85, end: 0 },
  rotationSpeed: { min: -60, max: 60 },
  colors: ['ffffff', 'ffffcc', 'ccffff', 'ffccff', 'ccffcc'],
  spawnShape: 'rect',
  spawnConfig: { width: 28, height: 28 },
  blendMode: 'add',
};

// ─── Types ──────────────────────────────────────────────────────────────

export interface ClearedTileEvent {
  row: number;
  col: number;
  type: BlastTileType;
  /** Hits remaining before this clear (0 = final hit, >0 = intermediate hit) */
  hitsRemaining?: number;
}

interface BlastEffectsCanvasProps {
  width: number;
  height: number;
  gridSize: number;
  clearedTiles: ClearedTileEvent[];
  chainLevel: number;
  comboTier: number;
  waveCleared: boolean;
}

// ─── Tile-type → particle preset map ────────────────────────────────────

const CLEAR_PRESET_MAP: Partial<Record<BlastTileType, ParticleConfig>> = {
  lightning: LIGHTNING_SPARK,
  prism: PRISM_CROSS,
  gem: GEM_SHATTER,
  magnet: VORTEX_PULL,
};

// ─── Main Component ─────────────────────────────────────────────────────

export function BlastEffectsCanvas(props: BlastEffectsCanvasProps) {
  if (props.width <= 0 || props.height <= 0) return null;

  return (
    <GameCanvas
      config={{
        width: Math.round(props.width),
        height: Math.round(props.height),
        background: 0x1a1a2e,
        backgroundAlpha: 0,
        antialias: true,
      }}
    >
      <EffectsWorker {...props} />
    </GameCanvas>
  );
}

// ─── Effects Worker (runs inside GameCanvas context) ─────────────────

function EffectsWorker({
  width,
  height,
  gridSize,
  clearedTiles,
  chainLevel,
  comboTier,
  waveCleared,
}: BlastEffectsCanvasProps) {
  const { app, particles, shake, physics, camera } = useGameEngine();
  const enhancedRef = useRef<EnhancedEffectsManager | null>(null);

  const prevClearedKeyRef = useRef('');
  const clearedSeqRef = useRef(0);
  const prevChainRef = useRef(0);
  const prevComboRef = useRef(0);
  const prevWaveRef = useRef(false);
  const crossFlashRef = useRef<Graphics | null>(null);
  const crossFlashRafRef = useRef<number>(0);
  const magnetTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const bloomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloomRef = useRef<InstanceType<typeof BloomFilter> | null>(null);
  const shockwaveRef = useRef<InstanceType<typeof ShockwaveFilter> | null>(null);
  const shockwaveRafRef = useRef<number>(0);

  // Clean up magnet timers and cross flash on unmount
  useEffect(() => {
    const timers = magnetTimersRef.current;
    return () => {
      for (const tid of timers) clearTimeout(tid);
      timers.clear();
      if (bloomTimerRef.current) clearTimeout(bloomTimerRef.current);
      cancelAnimationFrame(crossFlashRafRef.current);
      cancelAnimationFrame(shockwaveRafRef.current);
      if (crossFlashRef.current) { crossFlashRef.current.destroy(); crossFlashRef.current = null; }
    };
  }, []);

  // Initialize enhanced effects (ShatterEffect / DissolveEffect from custom-pixi-particles)
  useEffect(() => {
    const cellSz = width / gridSize;
    enhancedRef.current = createEnhancedEffects(app, camera, cellSz);
    return () => {
      enhancedRef.current?.destroy();
      enhancedRef.current = null;
    };
  }, [app, camera, width, gridSize]);

  const cellSize = width / gridSize;

  const { spawnDebris, spawnLightningDebris, spawnLightningBolt, spawnPrismDebris } =
    useBlastDebris(cellSize, gridSize, camera, physics);

  // ─── Prism cross beam effect ──────────────────────────────────────
  const firePrismBeams = useCallback((cx: number, cy: number) => {
    const beamOffsets = Math.floor(gridSize / 2) * cellSize;
    particles.burst(PRISM_BEAM_UP, cx, cy - beamOffsets / 2);
    particles.burst(PRISM_BEAM_DOWN, cx, cy + beamOffsets / 2);
    particles.burst(PRISM_BEAM_LEFT, cx - beamOffsets / 2, cy);
    particles.burst(PRISM_BEAM_RIGHT, cx + beamOffsets / 2, cy);
  }, [particles, gridSize, cellSize]);

  // ─── Cross flash (white lines fading to transparent over 300ms) ──
  const flashCross = useCallback((cx: number, cy: number) => {
    // Destroy previous cross flash if still animating
    if (crossFlashRef.current) {
      cancelAnimationFrame(crossFlashRafRef.current);
      camera.removeChild(crossFlashRef.current);
      crossFlashRef.current.destroy();
      crossFlashRef.current = null;
    }
    const g = new Graphics();
    const lineLen = gridSize * cellSize;
    g.rect(0, cy - 2, lineLen, 4).fill({ color: 0xffffff });
    g.rect(cx - 2, 0, 4, lineLen).fill({ color: 0xffffff });
    g.alpha = 0.9;
    camera.addChild(g);
    crossFlashRef.current = g;

    const start = performance.now();
    const duration = 300;
    const fade = () => {
      // Guard: camera or graphics may be destroyed on unmount
      if (camera.destroyed || g.destroyed) {
        crossFlashRef.current = null;
        return;
      }
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      g.alpha = 0.9 * (1 - t);
      if (t < 1) {
        crossFlashRafRef.current = requestAnimationFrame(fade);
      } else {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        crossFlashRef.current = null;
      }
    };
    crossFlashRafRef.current = requestAnimationFrame(fade);
  }, [camera, gridSize, cellSize]);

  // Start ambient bokeh on mount
  useEffect(() => {
    const emitter = particles.create(AMBIENT_BOKEH);
    emitter.emit(width / 2, height / 2);
    return () => { emitter.destroy(); };
  }, [particles, width, height]);

  // Bloom filter — intensifies with chain/combo level for that AAA glow
  useEffect(() => {
    const bloom = new BloomFilter({ strength: 2, quality: 4 });
    bloom.enabled = false;
    bloomRef.current = bloom;
    /* eslint-disable react-hooks/immutability */
    camera.filters = [...(Array.isArray(camera.filters) ? camera.filters : []), bloom];
    return () => {
      const filters = Array.isArray(camera.filters) ? camera.filters : [];
      camera.filters = filters.filter(f => f !== bloom);
      /* eslint-enable react-hooks/immutability */
      bloom.destroy();
      bloomRef.current = null;
    };
  }, [camera]);

  // Shockwave filter — triggered on bomb/wave clear
  useEffect(() => {
    const sw = new ShockwaveFilter({ center: { x: width / 2, y: height / 2 }, radius: -1, speed: 300, amplitude: 20, wavelength: 120 });
    sw.enabled = false;
    shockwaveRef.current = sw;
    /* eslint-disable react-hooks/immutability */
    camera.filters = [...(Array.isArray(camera.filters) ? camera.filters : []), sw];
    return () => {
      cancelAnimationFrame(shockwaveRafRef.current);
      shockwaveRef.current = null;
      const filters = Array.isArray(camera.filters) ? camera.filters : [];
      camera.filters = filters.filter(f => f !== sw);
      /* eslint-enable react-hooks/immutability */
      sw.destroy();
    };
  }, [camera, width, height]);

  // Fire a shockwave from a point
  const fireShockwave = useCallback((cx: number, cy: number, amplitude = 20) => {
    const sw = shockwaveRef.current;
    if (!sw) return;
    sw.center = { x: cx, y: cy };
    sw.time = 0;
    sw.amplitude = amplitude;
    sw.enabled = true;
    const start = performance.now();
    const duration = 600;
    const tick = () => {
      if (!shockwaveRef.current) return;
      const t = Math.min((performance.now() - start) / duration, 1);
      sw.time = t;
      if (t < 1) {
        shockwaveRafRef.current = requestAnimationFrame(tick);
      } else {
        sw.enabled = false;
      }
    };
    shockwaveRafRef.current = requestAnimationFrame(tick);
  }, []);

  // Ambient effects: ghost trails (chain >= 2) + metaball goo (chain >= 3)
  const { moveGhostTo } = useBlastAmbientEffects({
    app, camera, width, height, cellSize, chainLevel,
  });

  // Update bloom intensity based on chain level
  useEffect(() => {
    const bloom = bloomRef.current;
    if (!bloom) return;
    if (chainLevel >= 1) {
      bloom.enabled = true;
      bloom.strength = 2 + chainLevel * 1.5;
    } else {
      bloom.enabled = false;
    }
  }, [chainLevel]);

  // Tile clear → per-type particle bursts + screen shake
  useEffect(() => {
    if (clearedTiles.length === 0) return;
    clearedSeqRef.current++;
    const key = `${clearedSeqRef.current}:${clearedTiles.map(t => `${t.row},${t.col},${t.type}`).join(';')}`;
    if (key === prevClearedKeyRef.current) return;
    prevClearedKeyRef.current = key;

    const lightningTiles: ClearedTileEvent[] = [];
    const lightningCols = new Set<number>();

    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      const isFinalHit = !tile.hitsRemaining || tile.hitsRemaining <= 0;

      if (tile.type === 'bomb') {
        fireShockwave(x, y, 25);
        particles.burst(pickRandom(BOMB_EXPLOSION_VARIANTS), x, y);
        enhancedRef.current?.shatterTile(x, y, 'bomb');
      }

      if (tile.type === 'gem') {
        if (isFinalHit) {
          particles.burst(GEM_GOLDEN_EXPLOSION, x, y);
          particles.burst(GEM_SHATTER, x, y);
          enhancedRef.current?.shatterTile(x, y, 'gem');
        } else {
          particles.burst(GEM_SHARD_BURST, x, y);
        }
      } else if (tile.type === 'frozen') {
        if (isFinalHit) {
          particles.burst(ICE_SHATTER, x, y);
          enhancedRef.current?.dissolveTile(x, y, 'frozen');
        } else {
          particles.burst(FROST_CRACK, x, y);
        }
      } else if (tile.type === 'ice') {
        if (isFinalHit) {
          particles.burst(ICE_SHATTER, x, y);
          enhancedRef.current?.dissolveTile(x, y, 'ice');
        }
        particles.burst(FROST_MIST, x, y);
      } else if (tile.type === 'prism') {
        particles.burst(PRISM_CROSS, x, y);
        firePrismBeams(x, y);
        spawnPrismDebris(x, y);
        flashCross(x, y);
        enhancedRef.current?.prismRefractTile(x, y, 'prism');
      } else if (tile.type === 'magnet') {
        particles.burst(VORTEX_PULL, x, y);
        const tid = setTimeout(() => {
          magnetTimersRef.current.delete(tid);
          particles.burst(VORTEX_EXPLOSION, x, y);
          physics.applyExplosion({ x, y }, 0.005, cellSize * 3.5);
          enhancedRef.current?.shatterTile(x, y, 'magnet');
        }, 280);
        magnetTimersRef.current.add(tid);
      // Diamond: crystalline shards + shockwave + shatter + crystallize
      } else if (tile.type === 'diamond') {
        particles.burst(DIAMOND_SHARDS, x, y);
        fireShockwave(x, y, 12);
        enhancedRef.current?.shatterTile(x, y, 'diamond');
        enhancedRef.current?.crystallizeTile(x, y, 'diamond');
      // Gold: golden star burst + liquid melt
      } else if (tile.type === 'gold') {
        particles.burst(GOLD_STARS, x, y);
        enhancedRef.current?.meltTile(x, y, 'gold');
      // Rainbow/Wildcard: confetti + magnetic assembly (vortex materialization)
      } else if (tile.type === 'rainbow' || tile.type === 'wildcard') {
        particles.burst(CONFETTI_BURST, x, y);
        enhancedRef.current?.assembleTile(x, y, 'rainbow');
      // Countdown: fire embers explosion + granular erosion on final
      } else if (tile.type === 'countdown') {
        particles.burst(FIRE_EMBERS, x, y);
        if (isFinalHit) {
          fireShockwave(x, y, 15);
          enhancedRef.current?.erodeTile(x, y, 'countdown');
        }
      // Shuffle: swirling rearrangement burst
      } else if (tile.type === 'shuffle') {
        particles.burst(VORTEX_PULL, x, y);
        enhancedRef.current?.shatterTile(x, y, 'shuffle');
      // Magma: volcanic eruption — explosive radial burst
      } else if (tile.type === 'magma') {
        particles.burst(FIRE_EMBERS, x, y);
        fireShockwave(x, y, 18);
        enhancedRef.current?.shatterTile(x, y, 'magma');
      // Portal: vortex pull + electric rings + slit-scan warp
      } else if (tile.type === 'portal') {
        particles.burst(VORTEX_PULL, x, y);
        particles.burst(ELECTRIC_RINGS, x, y);
        enhancedRef.current?.slitScanTile(x, y, 'portal');
      // Catalyst: liquid mercury transformation
      } else if (tile.type === 'catalyst') {
        particles.burst(GOLD_STARS, x, y);
        particles.burst(FIRE_EMBERS, x, y);
        enhancedRef.current?.mercuryTile(x, y, 'catalyst');
      // Mirror: reflective crystallize fracture
      } else if (tile.type === 'mirror') {
        particles.burst(DIAMOND_SHARDS, x, y);
        enhancedRef.current?.mirrorCrystallizeTile(x, y, 'mirror');
      // Silver: metallic cold shatter
      } else if (tile.type === 'silver') {
        particles.burst(GEM_SHARD_BURST, x, y);
        enhancedRef.current?.silverShatterTile(x, y, 'silver');
      } else {
        const preset = CLEAR_PRESET_MAP[tile.type] ?? pickRandom(TILE_EXPLOSION_VARIANTS);
        particles.burst(preset, x, y);
      }

      if (tile.type === 'lightning') {
        lightningTiles.push(tile);
        lightningCols.add(tile.col);
        enhancedRef.current?.pixelSortTile(x, y, 'lightning');
      }
    }

    // Lingering sparkle dust at each clear position — floats upward for ambient magic
    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      particles.burst(LINGER_SPARKLE, x, y, 3);
    }

    // Move ghost sprite to centroid of cleared tiles (for chain ghost trail)
    if (clearedTiles.length > 0) {
      let cx = 0, cy = 0;
      for (const t of clearedTiles) {
        cx += t.col * cellSize + cellSize / 2;
        cy += t.row * cellSize + cellSize / 2;
      }
      moveGhostTo(cx / clearedTiles.length, cy / clearedTiles.length);
    }

    // Lightning-specific effects: bolt trail, column flash, elongated debris
    if (lightningCols.size > 0) {
      for (const col of lightningCols) {
        spawnLightningBolt(col, gridSize);
      }
      spawnLightningDebris(lightningTiles);
      shake.shake({ intensity: 6, duration: 0.3, decay: 'exponential' });
    }

    // Spawn physics debris fragments
    spawnDebris(clearedTiles);

    // Screen shake scaled to clear count (lightning already shook above)
    if (lightningCols.size === 0) {
      const count = clearedTiles.length;
      if (count >= 6) shake.heavy();
      else if (count >= 3) shake.medium();
      else shake.light();
    }
  }, [clearedTiles, particles, shake, cellSize, gridSize, spawnDebris, spawnLightningBolt, spawnLightningDebris, firePrismBeams, spawnPrismDebris, flashCross, physics, fireShockwave, moveGhostTo]);

  // Chain cascade sparkle + mega celebration at chain 5
  useEffect(() => {
    if (chainLevel > prevChainRef.current && chainLevel >= 1) {
      particles.burst(CASCADE_SPARKLE, width / 2, height * 0.7, chainLevel * 5);

      if (chainLevel >= 5) {
        // MEGA CASCADE — triple particle burst + shockwave + heavy shake
        particles.burst(BOARD_CLEAR, width / 2, height / 2);
        particles.burst(pickRandom(COMBO_FLASH_VARIANTS), width / 2, height / 2, 40);
        fireShockwave(width / 2, height / 2, 30);
        shake.heavy();
        // Bloom spike for epic feel
        const bloom = bloomRef.current;
        if (bloom) {
          bloom.enabled = true;
          bloom.strength = 12;
          if (bloomTimerRef.current) clearTimeout(bloomTimerRef.current);
          bloomTimerRef.current = setTimeout(() => { if (bloomRef.current) bloomRef.current.strength = 2 + chainLevel * 1.5; }, 400);
        }
      } else if (chainLevel >= 3) {
        shake.medium();
      } else {
        shake.light();
      }
    }
    prevChainRef.current = chainLevel;
  }, [chainLevel, particles, shake, width, height, fireShockwave]);

  // Combo flash particles + bloom spike
  useEffect(() => {
    if (comboTier > prevComboRef.current && comboTier >= 1) {
      particles.burst(pickRandom(COMBO_FLASH_VARIANTS), width / 2, height / 2, comboTier * 15);
      shake.shake({
        intensity: comboTier * 4,
        duration: 0.2 + comboTier * 0.1,
        decay: 'exponential',
      });
      // Brief bloom spike on combo activation
      const bloom = bloomRef.current;
      if (bloom) {
        const prev = bloom.strength;
        bloom.enabled = true;
        bloom.strength = 6 + comboTier * 3;
        if (bloomTimerRef.current) clearTimeout(bloomTimerRef.current);
        bloomTimerRef.current = setTimeout(() => { if (bloomRef.current) bloomRef.current.strength = prev; }, 300);
      }
    }
    prevComboRef.current = comboTier;
  }, [comboTier, particles, shake, width, height]);

  // Wave clear celebration
  useEffect(() => {
    if (waveCleared && !prevWaveRef.current) {
      particles.burst(BOARD_CLEAR, width / 2, height / 2);
      fireShockwave(width / 2, height / 2, 35);
      shake.heavy();
    }
    prevWaveRef.current = waveCleared;
  }, [waveCleared, particles, shake, width, height, fireShockwave]);

  return null;
}

export default BlastEffectsCanvas;
