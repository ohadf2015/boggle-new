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
import { useComboStreakMilestone } from './hooks/useComboStreakMilestone';
import { getComboAmbientTier } from './comboAmbientThreshold';
import { useBlastGsapTimelines } from './hooks/useBlastGsapTimelines';
import { isReducedMotionPreferred } from '@/utils/accessibility';
import {
  TILE_EXPLOSION_VARIANTS,
  BOMB_EXPLOSION_VARIANTS,
  COMBO_FLASH_VARIANTS,
  CASCADE_SPARKLE,
  BOARD_CLEAR,
  AMBIENT_BOKEH,
  DIAMOND_SHARDS,
  GOLD_STARS,
  CONFETTI_BURST,
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
}

interface BlastEffectsCanvasProps {
  width: number;
  height: number;
  gridSize: number;
  clearedTiles: ClearedTileEvent[];
  chainLevel: number;
  comboTier: number;
  /** Combo streak level (0–10). Crossing 5 / 10 fires a milestone flourish. */
  comboStreakLevel?: number;
  waveCleared: boolean;
}

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
  comboStreakLevel = 0,
  waveCleared,
}: BlastEffectsCanvasProps) {
  const { app, particles, shake, physics, camera, timeDilation } = useGameEngine();
  const enhancedRef = useRef<EnhancedEffectsManager | null>(null);
  const juiceRef = useRef<BlastJuiceKit | null>(null);

  const prevClearedKeyRef = useRef('');
  const comboStreakLevelRef = useRef(comboStreakLevel);
  const prevChainRef = useRef(0);
  const prevComboRef = useRef(0);
  const prevWaveRef = useRef(false);
  const bloomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep comboStreakLevel ref in sync so the tile-clear effect can read it
  // without needing it as a dep (prevents re-firing on every streak change).
  useEffect(() => {
    comboStreakLevelRef.current = comboStreakLevel;
  }, [comboStreakLevel]);

  // Pixi overlay cleanup (cross flash, pulse rings, bloom/shockwave filters)
  // lives inside useBlastPixiOverlays.
  useEffect(() => {
    const bloomTimerRefCurrent = bloomTimerRef;
    return () => {
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
    spawnWaveClearBurst,
  } = useBlastDebris(cellSize, gridSize, camera, physics);

  // ─── Pixi overlay pipeline ────────────────────────────────────────
  // Owns bloom+shockwave camera filters, cross flash, and combo pulse rings.
  // All teardown + camera.destroyed guards live inside the hook.
  const { fireShockwave, spawnPulseRing, spawnStarBurst, spawnAfterglow, spawnLightSweep } = useBlastPixiOverlays({
    camera, width, height, gridSize, cellSize, chainLevel,
  });

  // ─── GSAP timeline runners — cascade depth 1-4, wave shower, long word ─
  const { runCascadePunch, runLongWordPunch, runWaveClearShower, trackTimeline } = useBlastGsapTimelines({
    camera, shake, timeDilation, particles, width, height,
    fireShockwave, spawnStarBurst, confettiPreset: CONFETTI_BURST,
  });

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
    const key = clearedTiles.map(t => `${t.row},${t.col},${t.type}`).join(';');
    if (key === prevClearedKeyRef.current) return;
    prevClearedKeyRef.current = key;

    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;

      if (tile.type === 'bomb') {
        fireShockwave(x, y, 12);
        particles.burst(pickRandom(BOMB_EXPLOSION_VARIANTS), x, y);
        enhancedRef.current?.shatterTile(x, y, 'bomb');
      }

      if (tile.type === 'diamond') {
        particles.burst(DIAMOND_SHARDS, x, y);
        fireShockwave(x, y, 7);
        enhancedRef.current?.shatterTile(x, y, 'diamond');
        enhancedRef.current?.crystallizeTile(x, y, 'diamond');
      } else if (tile.type === 'gold') {
        particles.burst(GOLD_STARS, x, y);
        spawnStarBurst(x, y, 0xffd700, 10);
        enhancedRef.current?.meltTile(x, y, 'gold');
      } else if (tile.type === 'standard') {
        particles.burst(pickRandom(TILE_EXPLOSION_VARIANTS), x, y);
      }
    }

    // Lingering sparkle dust at each clear position — floats upward for ambient magic
    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      particles.burst(LINGER_SPARKLE, x, y, 3);
      // Afterglow residue — warm halo that lingers where tiles were cleared
      spawnAfterglow(x, y, tile.type === 'bomb' ? 0xff3366 : 0xbfff00);
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

    // Spawn physics debris fragments
    spawnDebris(clearedTiles);

    const count = clearedTiles.length;
    if (count >= 6) shake.heavy();
    else if (count >= 3) shake.medium();
    else shake.light();

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

    // D — combo-streak ambient afterglow. One Pixi Graphics per word at the
    // centroid when the streak is hot (≥4). spawnAfterglow already self-cleans,
    // so this stays bounded — never accrues more than the cleared-tiles cadence.
    const ambientTier = getComboAmbientTier(comboStreakLevelRef.current);
    if (ambientTier !== null && clearedTiles.length > 0) {
      let cx = 0, cy = 0;
      for (const t of clearedTiles) {
        cx += t.col * cellSize + cellSize / 2;
        cy += t.row * cellSize + cellSize / 2;
      }
      const ambientColor = ambientTier === 3 ? 0xff1493 : ambientTier === 2 ? 0xbfff00 : 0x00ffff;
      spawnAfterglow(cx / clearedTiles.length, cy / clearedTiles.length, ambientColor);
    }
  }, [clearedTiles, particles, shake, cellSize, spawnDebris, fireShockwave, spawnStarBurst, spawnAfterglow, moveGhostTo, runLongWordPunch]);

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

      // J2 — Pixi tier-badge: "x{N}" pops in, scales, drifts up while fading.
      // Skipped under reduced motion (handled inside the timeline runner check).
      if (!isReducedMotionPreferred() && comboTier >= 2 && !camera.destroyed) {
        const badge = new Text({
          text: `x${comboTier}`,
          style: {
            fontFamily: ['Fredoka', 'Rubik', 'sans-serif'],
            fontSize: 56,
            fontWeight: '900',
            fill: 0xbfff00,
            stroke: { color: 0x1a1a2e, width: 6 },
            dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.7, angle: Math.PI / 2 },
          },
        });
        badge.anchor.set(0.5);
        badge.position.set(width / 2, height * 0.42);
        badge.alpha = 1;
        badge.scale.set(0);
        camera.addChild(badge);

        const cleanupBadge = () => {
          try { camera.removeChild(badge); } catch { /* */ }
          if (!badge.destroyed) badge.destroy();
        };
        const tl = buildComboLevelUpTimeline(gsap, {
          target: badge,
          tier: comboTier,
          riseDistance: 70,
          onComplete: cleanupBadge,
        });
        // Tracker chains onComplete + runs cleanupBadge on unmount-kill.
        trackTimeline(tl, cleanupBadge);
      }
    }
    prevComboRef.current = comboTier;
  }, [comboTier, particles, width, height, spawnPulseRing, camera, trackTimeline]);

  // Combo streak milestone — fires once when level crosses 5 (tier 1) or 10 (tier 2).
  // Distinct from per-word comboTier above; this is a streak-life event, much rarer.
  const streakMilestone = useComboStreakMilestone(comboStreakLevel);
  const lastMilestoneIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!streakMilestone || streakMilestone.id === lastMilestoneIdRef.current) return;
    lastMilestoneIdRef.current = streakMilestone.id;
    const tier = streakMilestone.tier;
    spawnStarBurst(width / 2, height / 2, tier === 2 ? 0xbfff00 : 0x00ffff, tier === 2 ? 16 : 10);
    spawnPulseRing(width / 2, height / 2, tier === 2 ? 3 : 2);
    if (tier === 2) {
      fireShockwave(width / 2, height / 2, 22);
    }
  }, [streakMilestone, width, height, spawnStarBurst, spawnPulseRing, fireShockwave]);

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
