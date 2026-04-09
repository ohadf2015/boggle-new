'use client';
'use no memo'; // Disable React Compiler memoization — PixiJS camera mutations incompatible with compiler immutability rules

// BlastEffectsCanvas — PixiJS effects layer rendered ABOVE the DOM BlastBoard.
// The parent BlastStage wraps this canvas in an absolutely-positioned z-20 div
// with pointer-events-none so particles/shockwaves/shatters overlay tile art
// without blocking touch/drag word selection on the DOM grid beneath (z-10).
// Dynamically imported (ssr: false) to keep PixiJS out of the SSR bundle.

import { useEffect, useRef, useCallback } from 'react';
import { useBlastDebris } from './useBlastDebris';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import { createEnhancedEffects, type EnhancedEffectsManager } from './utils/blastEnhancedEffects';
import { createBlastJuiceKit, type BlastJuiceKit } from './effects/blastJuiceKit';
import { useBlastAmbientEffects } from './useBlastAmbientEffects';
import { useBlastPixiOverlays } from './hooks/useBlastPixiOverlays';
import { isReducedMotionPreferred } from '@/utils/accessibility';
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
  const { app, particles, shake, physics, camera, timeDilation } = useGameEngine();
  const enhancedRef = useRef<EnhancedEffectsManager | null>(null);
  const juiceRef = useRef<BlastJuiceKit | null>(null);

  const prevClearedKeyRef = useRef('');
  const clearedSeqRef = useRef(0);
  const prevChainRef = useRef(0);
  const prevComboRef = useRef(0);
  const prevWaveRef = useRef(false);
  const magnetTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const bloomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up magnet timers on unmount. Pixi overlay cleanup (cross flash,
  // pulse rings, bloom/shockwave filters) lives inside useBlastPixiOverlays.
  useEffect(() => {
    const timers = magnetTimersRef.current;
    return () => {
      for (const tid of timers) clearTimeout(tid);
      timers.clear();
      if (bloomTimerRef.current) clearTimeout(bloomTimerRef.current);
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

  // Initialize juice kit (chromatic aberration + zoom blur + bloom ramps + hit-stop)
  useEffect(() => {
    juiceRef.current = createBlastJuiceKit({
      app,
      camera,
      shake,
      timeDilation,
      // Gate every burst through prefers-reduced-motion. Checked at call time
      // so a user toggling their OS preference mid-run gets immediate relief.
      motionOk: () => !isReducedMotionPreferred(),
    });
    return () => {
      juiceRef.current?.destroy();
      juiceRef.current = null;
    };
  }, [app, camera, shake, timeDilation]);

  const cellSize = width / gridSize;

  const {
    spawnDebris,
    spawnLightningDebris,
    spawnLightningBolt,
    spawnPrismDebris,
    spawnWaveClearBurst,
  } = useBlastDebris(cellSize, gridSize, camera, physics);

  // ─── Pixi overlay pipeline ────────────────────────────────────────
  // Owns bloom+shockwave camera filters, cross flash, and combo pulse rings.
  // All teardown + camera.destroyed guards live inside the hook.
  const { fireShockwave, flashCross, spawnPulseRing } = useBlastPixiOverlays({
    camera, width, height, gridSize, cellSize, chainLevel,
  });

  // ─── Prism cross beam effect ──────────────────────────────────────
  const firePrismBeams = useCallback((cx: number, cy: number) => {
    const beamOffsets = Math.floor(gridSize / 2) * cellSize;
    particles.burst(PRISM_BEAM_UP, cx, cy - beamOffsets / 2);
    particles.burst(PRISM_BEAM_DOWN, cx, cy + beamOffsets / 2);
    particles.burst(PRISM_BEAM_LEFT, cx - beamOffsets / 2, cy);
    particles.burst(PRISM_BEAM_RIGHT, cx + beamOffsets / 2, cy);
  }, [particles, gridSize, cellSize]);

  // Start ambient bokeh on mount
  useEffect(() => {
    const emitter = particles.create(AMBIENT_BOKEH);
    emitter.emit(width / 2, height / 2);
    return () => { emitter.destroy(); };
  }, [particles, width, height]);

  // Ambient effects: ghost trails (chain >= 2) + metaball goo (chain >= 3)
  const { moveGhostTo } = useBlastAmbientEffects({
    app, camera, width, height, cellSize, chainLevel,
  });

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
      // Rainbow: confetti + magnetic assembly (vortex materialization)
      } else if (tile.type === 'rainbow') {
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
        // MEGA CASCADE — triple particle burst + shockwave + full juice punch
        particles.burst(BOARD_CLEAR, width / 2, height / 2);
        particles.burst(pickRandom(COMBO_FLASH_VARIANTS), width / 2, height / 2, 40);
        fireShockwave(width / 2, height / 2, 30);
        juiceRef.current?.megaPunch({ cx: width / 2, cy: height / 2 });
      } else if (chainLevel >= 3) {
        shake.medium();
      } else {
        shake.light();
      }
    }
    prevChainRef.current = chainLevel;
  }, [chainLevel, particles, shake, width, height, fireShockwave]);

  // Combo flash particles + juice pulse (chromatic aberration + saturation bump)
  useEffect(() => {
    if (comboTier > prevComboRef.current && comboTier >= 1) {
      particles.burst(pickRandom(COMBO_FLASH_VARIANTS), width / 2, height / 2, comboTier * 15);
      juiceRef.current?.comboPulse(comboTier);
      spawnPulseRing(width / 2, height / 2, comboTier);
    }
    prevComboRef.current = comboTier;
  }, [comboTier, particles, width, height, spawnPulseRing]);

  // Wave clear celebration — particles + shockwave + juice burst (zoom blur + bloom + hit-stop)
  useEffect(() => {
    if (waveCleared && !prevWaveRef.current) {
      particles.burst(BOARD_CLEAR, width / 2, height / 2);
      fireShockwave(width / 2, height / 2, 35);
      juiceRef.current?.waveClearBurst({ cx: width / 2, cy: height / 2 });
      spawnWaveClearBurst(width / 2, height / 2, Math.min(width, height) * 0.45);
    }
    prevWaveRef.current = waveCleared;
  }, [waveCleared, particles, width, height, fireShockwave, spawnWaveClearBurst]);

  return null;
}

export default BlastEffectsCanvas;
