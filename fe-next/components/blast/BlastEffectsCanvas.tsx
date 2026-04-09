'use client';
'use no memo'; // Disable React Compiler memoization — PixiJS camera mutations incompatible with compiler immutability rules

// BlastEffectsCanvas — PixiJS effects layer rendered ABOVE the DOM BlastBoard.
// The parent BlastStage wraps this canvas in an absolutely-positioned z-20 div
// with pointer-events-none so particles/shockwaves/shatters overlay tile art
// without blocking touch/drag word selection on the DOM grid beneath (z-10).
// Dynamically imported (ssr: false) to keep PixiJS out of the SSR bundle.

import { useEffect, useRef, useCallback } from 'react';
import { Graphics } from 'pixi.js';
import { BloomFilter, ShockwaveFilter } from 'pixi-filters';
import { useBlastDebris } from './useBlastDebris';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import { createEnhancedEffects, type EnhancedEffectsManager } from './utils/blastEnhancedEffects';
import { createBlastJuiceKit, type BlastJuiceKit } from './effects/blastJuiceKit';
import { createGlowFilter } from './effects/pixiFilterPresets';
import { computePulseRingFrame, pulseRingTierColor } from './effects/pulseRingCurve';
import { isReducedMotionPreferred } from '@/utils/accessibility';
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
  const { app, particles, shake, physics, camera, timeDilation } = useGameEngine();
  const enhancedRef = useRef<EnhancedEffectsManager | null>(null);
  const juiceRef = useRef<BlastJuiceKit | null>(null);

  const prevClearedKeyRef = useRef('');
  const clearedSeqRef = useRef(0);
  const prevChainRef = useRef(0);
  const prevComboRef = useRef(0);
  const prevWaveRef = useRef(false);
  const crossFlashRef = useRef<Graphics | null>(null);
  const crossFlashRafRef = useRef<number>(0);
  const pulseRingsRef = useRef<Set<Graphics>>(new Set());
  const pulseRingRafsRef = useRef<Set<number>>(new Set());
  const magnetTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const bloomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bloomRef = useRef<InstanceType<typeof BloomFilter> | null>(null);
  const shockwaveRef = useRef<InstanceType<typeof ShockwaveFilter> | null>(null);
  const shockwaveRafRef = useRef<number>(0);

  // Clean up magnet timers and cross flash on unmount.
  // IMPORTANT: removeChild BEFORE destroy — `camera` is owned by GameCanvas and
  // typically outlives this component, so destroyed Graphics left in
  // `camera.children` would be iterated next render and crash Pixi.
  useEffect(() => {
    const timers = magnetTimersRef.current;
    const pulseRafs = pulseRingRafsRef.current;
    const pulseRings = pulseRingsRef.current;
    const cameraRef = camera;
    return () => {
      for (const tid of timers) clearTimeout(tid);
      timers.clear();
      if (bloomTimerRef.current) clearTimeout(bloomTimerRef.current);
      cancelAnimationFrame(crossFlashRafRef.current);
      cancelAnimationFrame(shockwaveRafRef.current);
      const cameraAlive = !cameraRef.destroyed;
      if (crossFlashRef.current) {
        if (cameraAlive && !crossFlashRef.current.destroyed) {
          try { cameraRef.removeChild(crossFlashRef.current); } catch { /* */ }
        }
        if (!crossFlashRef.current.destroyed) crossFlashRef.current.destroy();
        crossFlashRef.current = null;
      }
      for (const raf of pulseRafs) cancelAnimationFrame(raf);
      pulseRafs.clear();
      for (const ring of pulseRings) {
        if (ring.destroyed) continue;
        if (cameraAlive) {
          try { cameraRef.removeChild(ring); } catch { /* */ }
        }
        ring.destroy();
      }
      pulseRings.clear();
    };
  }, [camera]);

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
    juiceRef.current = createBlastJuiceKit({ app, camera, shake, timeDilation });
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

  // ─── Combo pulse ring — expanding GlowFilter ring, lime→pink→cyan by tier ──
  // Drawn as a 1-unit-radius stroked circle with uniform scale driven by
  // `computePulseRingFrame`; GlowFilter supplies the neon halo. Multiple rings
  // can coexist when combos stack — each tracked in pulseRingsRef for cleanup.
  const spawnPulseRing = useCallback((cx: number, cy: number, tier: number) => {
    // Accessibility: honor prefers-reduced-motion. Skipping the ring entirely
    // (rather than shortening it) is safer than trying to "tone down" an
    // additive glow burst — users who opt out want zero flashing motion.
    if (isReducedMotionPreferred()) return;
    const g = new Graphics();
    // Base radius 1 — actual visual radius comes from scale tween × baseRadius.
    const baseRadius = Math.min(width, height) * 0.18;
    g.circle(0, 0, baseRadius).stroke({ color: 0xffffff, width: 6, alpha: 1 });
    g.x = cx;
    g.y = cy;
    g.filters = [createGlowFilter(pulseRingTierColor(tier), 3)];
    camera.addChild(g);
    pulseRingsRef.current.add(g);

    const start = performance.now();
    const duration = 450;
    const step = () => {
      if (camera.destroyed || g.destroyed) {
        pulseRingsRef.current.delete(g);
        return;
      }
      const frame = computePulseRingFrame((performance.now() - start) / duration);
      g.scale.set(frame.scale);
      g.alpha = frame.alpha;
      if (frame.done) {
        try { camera.removeChild(g); } catch { /* */ }
        g.destroy();
        pulseRingsRef.current.delete(g);
        pulseRingRafsRef.current.delete(rafId);
        return;
      }
      const next = requestAnimationFrame(step);
      pulseRingRafsRef.current.delete(rafId);
      pulseRingRafsRef.current.add(next);
      rafId = next;
    };
    let rafId = requestAnimationFrame(step);
    pulseRingRafsRef.current.add(rafId);
  }, [camera, width, height]);

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
    // Destroy previous cross flash if still animating.
    // Guard removeChild — `g` may already be detached (camera teardown race).
    if (crossFlashRef.current) {
      cancelAnimationFrame(crossFlashRafRef.current);
      const prev = crossFlashRef.current;
      if (!camera.destroyed && !prev.destroyed) {
        try { camera.removeChild(prev); } catch { /* */ }
      }
      if (!prev.destroyed) prev.destroy();
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

  // Bloom + Shockwave filters — allocated once per camera mount.
  // Single `camera.filters = [...]` assignment avoids the two-effect spread dance
  // and keeps filter pipeline stable across re-renders (no rebuild on resize).
  useEffect(() => {
    const bloom = new BloomFilter({ strength: 2, quality: 4 });
    bloom.enabled = false;
    bloomRef.current = bloom;

    const sw = new ShockwaveFilter({
      center: { x: 0, y: 0 }, // lazily updated in fireShockwave
      radius: -1,
      speed: 300,
      amplitude: 20,
      wavelength: 120,
    });
    sw.enabled = false;
    shockwaveRef.current = sw;

    const prev = Array.isArray(camera.filters) ? camera.filters : [];
    /* eslint-disable react-hooks/immutability */
    camera.filters = [...prev, bloom, sw];
    return () => {
      cancelAnimationFrame(shockwaveRafRef.current);
      // Skip filter unmount if camera was already destroyed — accessing
      // `.filters` on a destroyed Container throws in Pixi v8.
      if (!camera.destroyed) {
        const filters = Array.isArray(camera.filters) ? camera.filters : [];
        camera.filters = filters.filter(f => f !== bloom && f !== sw);
      }
      /* eslint-enable react-hooks/immutability */
      bloom.destroy();
      sw.destroy();
      bloomRef.current = null;
      shockwaveRef.current = null;
    };
  }, [camera]);

  // Fire a shockwave from a point — mutate center fields in place (no object alloc).
  const fireShockwave = useCallback((cx: number, cy: number, amplitude = 20) => {
    const sw = shockwaveRef.current;
    if (!sw) return;
    sw.center.x = cx;
    sw.center.y = cy;
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
