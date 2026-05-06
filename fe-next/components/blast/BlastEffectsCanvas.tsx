'use client';
'use no memo'; // Disable React Compiler memoization — PixiJS camera mutations incompatible with compiler immutability rules

// BlastEffectsCanvas — PixiJS effects layer rendered ABOVE the DOM BlastBoard.
// The parent BlastStage wraps this canvas in an absolutely-positioned z-20 div
// with pointer-events-none so particles/shockwaves/shatters overlay tile art
// without blocking touch/drag word selection on the DOM grid beneath (z-10).
// Dynamically imported (ssr: false) to keep PixiJS out of the SSR bundle.

import { useEffect, useRef, useCallback } from 'react';
import { Text } from 'pixi.js';
import { gsap } from 'gsap';
import { useBlastDebris } from './useBlastDebris';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import { createEnhancedEffects, type EnhancedEffectsManager } from './utils/blastEnhancedEffects';
import { createBlastJuiceKit, type BlastJuiceKit } from './effects/blastJuiceKit';
import { buildComboLevelUpTimeline } from './effects/blastGsapTimelines';
import { useBlastAmbientEffects } from './useBlastAmbientEffects';
import { useBlastPixiOverlays } from './hooks/useBlastPixiOverlays';

import { useBlastGsapTimelines } from './hooks/useBlastGsapTimelines';
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
// Brand-colored to match the candy-shell reference: lime/pink/gold/cyan starlight,
// not generic pastel. Adds visible juice on every clear.
const LINGER_SPARKLE: ParticleConfig = {
  maxParticles: 22,
  frequency: 0.035,
  emitterLifetime: 0.9,
  particlesPerWave: 4,
  lifetime: { min: 0.9, max: 1.8 },
  speed: { min: 25, max: 70 },
  gravity: { x: 0, y: -45 },
  scale: { start: 0.85, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -90, max: 90 },
  // Neo-brutalist brand palette: lime, pink, gold, cyan + white sparkle
  colors: ['ffffff', 'bfff00', 'ff1493', 'ffd700', '00ffff'],
  spawnShape: 'rect',
  spawnConfig: { width: 32, height: 32 },
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

/**
 * Goal Gallery hit pulse — BlastGame sets this when route/sniper transitions
 * from incomplete → complete; effects layer fires a shockwave + starburst at
 * the target cell. Nonce changes to retrigger even if same cell hits twice.
 */
export interface BlastGoalHitEvent {
  row: number;
  col: number;
  kind: 'route' | 'sniper';
  nonce: number;
}

interface BlastEffectsCanvasProps {
  width: number;
  height: number;
  gridSize: number;
  clearedTiles: ClearedTileEvent[];
  chainLevel: number;
  comboTier: number;
  waveCleared: boolean;
  /** Pulse fired when a Goal Gallery objective is satisfied. */
  goalHit?: BlastGoalHitEvent | null;
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
  goalHit,
}: BlastEffectsCanvasProps) {
  const { app, particles, shake, physics, camera, timeDilation } = useGameEngine();
  const enhancedRef = useRef<EnhancedEffectsManager | null>(null);
  const juiceRef = useRef<BlastJuiceKit | null>(null);
  // Pooled combo-tier "xN" Text — created once per mount, reused on every combo
  // pulse to avoid `new Text()` allocation per word (Pixi atlas churn).
  const comboBadgeRef = useRef<Text | null>(null);

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
    const bloomTimerRefCurrent = bloomTimerRef;
    return () => {
      for (const tid of timers) clearTimeout(tid);
      timers.clear();
      if (bloomTimerRefCurrent.current) clearTimeout(bloomTimerRefCurrent.current);
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
  const { fireShockwave, flashCross, spawnPulseRing, spawnStarBurst, spawnAfterglow, spawnLightSweep } = useBlastPixiOverlays({
    camera, width, height, gridSize, cellSize, chainLevel,
  });

// ─── GSAP timeline runners — cascade depth 1-4, wave shower, long word ─
  const { runCascadePunch, runLongWordPunch, runWaveClearShower, trackTimeline } = useBlastGsapTimelines({
    camera, shake, timeDilation, particles, width, height,
    fireShockwave, spawnStarBurst, confettiPreset: CONFETTI_BURST,
  });

  // ─── Prism cross beam effect ──────────────────────────────────────
  const firePrismBeams = useCallback((cx: number, cy: number) => {
    const beamOffsets = Math.floor(gridSize / 2) * cellSize;
    particles.burst(PRISM_BEAM_UP, cx, cy - beamOffsets / 2);
    particles.burst(PRISM_BEAM_DOWN, cx, cy + beamOffsets / 2);
    particles.burst(PRISM_BEAM_LEFT, cx - beamOffsets / 2, cy);
    particles.burst(PRISM_BEAM_RIGHT, cx + beamOffsets / 2, cy);
  }, [particles, gridSize, cellSize]);

  // Start ambient bokeh on mount — gated for low-end devices.
  // 4-or-fewer-core CPUs and ≤4GB RAM see a meaningful FPS hit from a
  // continuously-emitting bokeh layer (~18 max particles, low frequency).
  useEffect(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const cores = nav?.hardwareConcurrency ?? 8;
    const memGb = (nav as (Navigator & { deviceMemory?: number }) | null)?.deviceMemory ?? 8;
    if (cores <= 4 || memGb <= 4) return;
    const emitter = particles.create(AMBIENT_BOKEH);
    emitter.emit(width / 2, height / 2);
    return () => { emitter.destroy(); };
  }, [particles, width, height]);

  // Mount-time combo badge pool. Single Pixi Text reused for all comboTier pulses.
  useEffect(() => {
    if (camera.destroyed) return;
    const badge = new Text({
      text: 'x',
      style: {
        fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
        fontSize: 64,
        fontWeight: '900',
        fill: 0xbfff00,
        stroke: { color: 0x1a1a2e, width: 7 },
        dropShadow: { color: 0x000000, blur: 4, distance: 3, alpha: 0.8, angle: Math.PI / 2 },
      },
    });
    badge.anchor.set(0.5);
    badge.alpha = 0;
    badge.scale.set(0);
    badge.visible = false;
    camera.addChild(badge);
    comboBadgeRef.current = badge;
    return () => {
      if (!badge.destroyed) {
        try { if (!camera.destroyed) camera.removeChild(badge); } catch { /* */ }
        badge.destroy();
      }
      comboBadgeRef.current = null;
    };
  }, [camera]);

  // ─── Goal Gallery hit pulse ─────────────────────────────────────────
  // Fires a Pixi shockwave + starburst when route/sniper transitions to
  // satisfied. Re-keyed by `goalHit.nonce` so consecutive hits at the same
  // cell still pulse. Drops silently if goalHit is null or coords are off-board.
  const lastGoalNonceRef = useRef<number>(-1);
  useEffect(() => {
    if (!goalHit) return;
    if (goalHit.nonce === lastGoalNonceRef.current) return;
    lastGoalNonceRef.current = goalHit.nonce;
    if (goalHit.row < 0 || goalHit.col < 0) return;
    const cx = goalHit.col * cellSize + cellSize / 2;
    const cy = goalHit.row * cellSize + cellSize / 2;
    fireShockwave(cx, cy);
    spawnStarBurst(cx, cy);
    // Sniper hit gets an extra screen punch for the kill-shot feel; route
    // completion already cinematic enough via the wire-flash + shockwave.
    if (goalHit.kind === 'sniper') {
      shake.shake({ intensity: 7, duration: 0.25, decay: 'exponential' });
    }
  }, [goalHit, cellSize, fireShockwave, spawnStarBurst, shake]);

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

      // PERF: shader calls split into "redundant" (shatter/dissolve) — dropped
      // because particle bursts already painted the same xy with similar imagery
      // — vs "signature" (mercury / slitScan / melt / erode / assemble /
      // crystallize / refract / pixelSort) — KEPT because they're unique distortions
      // no particle can replicate (these ARE the juice).
      if (tile.type === 'bomb') {
        fireShockwave(x, y, 12);
        particles.burst(pickRandom(BOMB_EXPLOSION_VARIANTS), x, y);
        // Shatter shader dropped — explosion preset covers it.
      }

      if (tile.type === 'gem') {
        if (isFinalHit) {
          particles.burst(GEM_GOLDEN_EXPLOSION, x, y);
          particles.burst(GEM_SHATTER, x, y);
          fireShockwave(x, y, 8);
          spawnStarBurst(x, y, 0x34d399, 6);
          // Shatter shader dropped — GEM_SHATTER particle covers it.
        } else {
          particles.burst(GEM_SHARD_BURST, x, y);
        }
      } else if (tile.type === 'frozen') {
        if (isFinalHit) {
          particles.burst(ICE_SHATTER, x, y);
          // Dissolve shader dropped — ICE_SHATTER particle covers it.
        } else {
          particles.burst(FROST_CRACK, x, y);
        }
      } else if (tile.type === 'ice') {
        if (isFinalHit) {
          particles.burst(ICE_SHATTER, x, y);
          // Dissolve shader dropped — ICE_SHATTER particle covers it.
        }
        particles.burst(FROST_MIST, x, y);
      } else if (tile.type === 'prism') {
        particles.burst(PRISM_CROSS, x, y);
        firePrismBeams(x, y);
        spawnPrismDebris(x, y);
        flashCross(x, y);
        spawnPulseRing(x, y, 2);
        spawnStarBurst(x, y, 0xff1493, 12);
        enhancedRef.current?.prismRefractTile(x, y, 'prism'); // SIGNATURE: chromatic distortion
      } else if (tile.type === 'magnet') {
        particles.burst(VORTEX_PULL, x, y);
        const tid = setTimeout(() => {
          magnetTimersRef.current.delete(tid);
          particles.burst(VORTEX_EXPLOSION, x, y);
          fireShockwave(x, y, 13);
          physics.applyExplosion({ x, y }, 0.005, cellSize * 3.5);
          // Shatter shader dropped — explosion preset covers it.
        }, 280);
        magnetTimersRef.current.add(tid);
      } else if (tile.type === 'diamond') {
        particles.burst(DIAMOND_SHARDS, x, y);
        fireShockwave(x, y, 7);
        enhancedRef.current?.crystallizeTile(x, y, 'diamond'); // SIGNATURE: frosty crystal facet
      } else if (tile.type === 'gold') {
        particles.burst(GOLD_STARS, x, y);
        spawnStarBurst(x, y, 0xffd700, 10);
        enhancedRef.current?.meltTile(x, y, 'gold'); // SIGNATURE: liquid metal drip
      } else if (tile.type === 'rainbow') {
        particles.burst(CONFETTI_BURST, x, y);
        spawnPulseRing(x, y, 3);
        spawnStarBurst(x, y, 0x00ffff, 14);
        enhancedRef.current?.assembleTile(x, y, 'rainbow'); // SIGNATURE: vortex materialize
      } else if (tile.type === 'countdown') {
        particles.burst(FIRE_EMBERS, x, y);
        if (isFinalHit) {
          fireShockwave(x, y, 9);
          enhancedRef.current?.erodeTile(x, y, 'countdown'); // SIGNATURE: granular erosion
        }
      } else if (tile.type === 'shuffle') {
        particles.burst(VORTEX_PULL, x, y);
        // Shatter shader dropped — vortex preset covers it.
      } else if (tile.type === 'magma') {
        particles.burst(FIRE_EMBERS, x, y);
        fireShockwave(x, y, 11);
        // Shatter shader dropped — embers + shockwave cover it.
      } else if (tile.type === 'portal') {
        particles.burst(VORTEX_PULL, x, y);
        particles.burst(ELECTRIC_RINGS, x, y);
        fireShockwave(x, y, 6);
        spawnPulseRing(x, y, 1);
        enhancedRef.current?.slitScanTile(x, y, 'portal'); // SIGNATURE: warp distortion
      } else if (tile.type === 'catalyst') {
        particles.burst(GOLD_STARS, x, y);
        particles.burst(FIRE_EMBERS, x, y);
        fireShockwave(x, y, 7);
        spawnStarBurst(x, y, 0xffd700, 8);
        enhancedRef.current?.mercuryTile(x, y, 'catalyst'); // SIGNATURE: liquid mercury
      } else {
        const preset = CLEAR_PRESET_MAP[tile.type] ?? pickRandom(TILE_EXPLOSION_VARIANTS);
        particles.burst(preset, x, y);
        // Brand-color sparkle on every standard clear: alternates lime/pink by
        // tile parity so combos visually mix the two anchor brand hues.
        const brandColor = (tile.row + tile.col) % 2 === 0 ? 0xbfff00 : 0xff1493;
        spawnStarBurst(x, y, brandColor, 5);
      }

      if (tile.type === 'lightning') {
        lightningTiles.push(tile);
        lightningCols.add(tile.col);
        enhancedRef.current?.pixelSortTile(x, y, 'lightning'); // SIGNATURE: glitch slice
      }
    }

    // Lingering sparkle dust at each clear position — floats upward for ambient magic
    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      particles.burst(LINGER_SPARKLE, x, y, 3);
      // Afterglow residue — warm halo that lingers where tiles were cleared
      spawnAfterglow(x, y, tile.type === 'bomb' ? 0xff3366 : tile.type === 'lightning' ? 0x00ffff : 0xbfff00);
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
        const colX = col * cellSize + cellSize / 2;
        fireShockwave(colX, height / 2, 7);
        spawnStarBurst(colX, height / 2, 0x00ffff, 6);
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

    // J5 — long-word punch (≥6 tiles cleared). Centroid of cleared positions.
    // Runs after standard per-tile bursts so the layered shockwave/zoom reads
    // as "this word was special" rather than competing with tile-specific FX.
    if (clearedTiles.length >= 6) {
      let cx = 0, cy = 0;
      for (const t of clearedTiles) {
        cx += t.col * cellSize + cellSize / 2;
        cy += t.row * cellSize + cellSize / 2;
      }
      runLongWordPunch(clearedTiles.length, cx / clearedTiles.length, cy / clearedTiles.length);
    }
  }, [clearedTiles, particles, shake, cellSize, gridSize, height, spawnDebris, spawnLightningBolt, spawnLightningDebris, firePrismBeams, spawnPrismDebris, flashCross, physics, fireShockwave, spawnPulseRing, spawnStarBurst, spawnAfterglow, moveGhostTo, runLongWordPunch, camera]);

  // Chain cascade sparkle + mega celebration at chain 5
  useEffect(() => {
    if (chainLevel > prevChainRef.current && chainLevel >= 1) {
      particles.burst(CASCADE_SPARKLE, width / 2, height * 0.7, chainLevel * 5);

      if (chainLevel >= 5) {
        // MEGA CASCADE — triple particle burst + shockwave + full juice punch
        particles.burst(BOARD_CLEAR, width / 2, height / 2);
        particles.burst(pickRandom(COMBO_FLASH_VARIANTS), width / 2, height / 2, 40);
        fireShockwave(width / 2, height / 2, 30);
        spawnStarBurst(width / 2, height / 2, 0xbfff00, 16);
        spawnPulseRing(width / 2, height / 2, 3);
        juiceRef.current?.megaPunch({ cx: width / 2, cy: height / 2 });
        spawnLightSweep();
      } else {
        // J1 — GSAP-driven escalation timeline for depths 1-4 (≥5 handled above).
        // Layers shake + zoom + RGB + bloom + freeze with intensity scaling per depth.
        runCascadePunch(chainLevel);
        if (chainLevel >= 3) spawnPulseRing(width / 2, height / 2, chainLevel);
      }
    }
    prevChainRef.current = chainLevel;
  }, [chainLevel, particles, shake, width, height, fireShockwave, spawnStarBurst, spawnPulseRing, spawnLightSweep, runCascadePunch]);

  // Combo flash particles + juice pulse (chromatic aberration + saturation bump)
  useEffect(() => {
    if (comboTier > prevComboRef.current && comboTier >= 1) {
      particles.burst(pickRandom(COMBO_FLASH_VARIANTS), width / 2, height / 2, comboTier * 15);
      juiceRef.current?.comboPulse(comboTier);
      spawnPulseRing(width / 2, height / 2, comboTier);

      // J2 — Pixi tier-badge: pooled "x{N}" reused per combo. Allocation-free
      // path — text/position/scale reset rather than `new Text()` per word.
      if (!isReducedMotionPreferred() && comboTier >= 2 && !camera.destroyed) {
        const badge = comboBadgeRef.current;
        if (badge && !badge.destroyed) {
          badge.text = `x${comboTier}`;
          badge.position.set(width / 2, height * 0.42);
          badge.scale.set(0);
          badge.alpha = 1;
          badge.visible = true;

          const hideBadge = () => {
            if (!badge.destroyed) badge.visible = false;
          };
          const tl = buildComboLevelUpTimeline(gsap, {
            target: badge,
            tier: comboTier,
            riseDistance: 70,
            onComplete: hideBadge,
          });
          trackTimeline(tl, hideBadge);
        }
      }
    }
    prevComboRef.current = comboTier;
  }, [comboTier, particles, width, height, spawnPulseRing, camera, trackTimeline]);

  // Wave clear celebration — particles + shockwave + juice burst (zoom blur + bloom + hit-stop)
  useEffect(() => {
    if (waveCleared && !prevWaveRef.current) {
      particles.burst(BOARD_CLEAR, width / 2, height / 2);
      fireShockwave(width / 2, height / 2, 35);
      spawnStarBurst(width / 2, height / 2, 0xffffff, 18);
      spawnPulseRing(width / 2, height / 2, 3);
      juiceRef.current?.waveClearBurst({ cx: width / 2, cy: height / 2 });
      spawnLightSweep();
      spawnWaveClearBurst(width / 2, height / 2, Math.min(width, height) * 0.45);
      // J3 — staggered confetti shower over ~700ms (3 bursts + crescendo tail).
      runWaveClearShower();
    }
    prevWaveRef.current = waveCleared;
  }, [waveCleared, particles, width, height, fireShockwave, spawnStarBurst, spawnPulseRing, spawnLightSweep, spawnWaveClearBurst, runWaveClearShower]);

  return null;
}

export default BlastEffectsCanvas;
