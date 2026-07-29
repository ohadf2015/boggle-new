'use client';
'use no memo'; // Disable React Compiler — PixiJS mutations incompatible with compiler immutability rules

/**
 * AdventureEffectsCanvas
 *
 * PixiJS particle effects layer for adventure mode tile activations.
 * Renders behind the DOM tile grid (pointer-events: none).
 * Dynamically imported (ssr: false) to keep PixiJS out of SSR bundle.
 *
 * Effect mapping:
 * - Gold (collect): golden star burst + bloom
 * - Ice (melt): ice shatter + frost mist
 * - Bomb (explode): shockwave + fire debris + screen shake
 * - Time (timeBonus): emerald burst + clock ring
 */

import { useEffect, useRef, useCallback } from 'react';
import { BloomFilter, ShockwaveFilter } from 'pixi-filters';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import {
  GOLD_STARS,
  GEM_GOLDEN_EXPLOSION,
  ICE_SHATTER,
  FROST_MIST,
  FROST_CRACK,
  BOMB_EXPLOSION,
  FIRE_EMBERS,
  GEM_SHARD_BURST,
} from '@/lib/gameEngine/presets/particles';
import type { TileType, TileActivationEffect } from '@/types/adventure';

// ─── Types ──────────────────────────────────────────────────────────────

export interface TileEffectEvent {
  row: number;
  col: number;
  type: TileType;
  effect: TileActivationEffect;
  timestamp: number;
}

interface AdventureEffectsCanvasProps {
  width: number;
  height: number;
  gridSize: number;
  /** Active tile effect events (from tile activationEffect + activationTimestamp) */
  effectEvents: TileEffectEvent[];
}

// ─── Time tile particles (emerald + clock feel) ─────────────────────────

const TIME_BURST = {
  ...GEM_SHARD_BURST,
  maxParticles: 15,
  particlesPerWave: 15,
  colors: ['10b981', '34d399', '6ee7b7', 'a7f3d0', 'ffffff'],
  speed: { min: 60, max: 180 },
  lifetime: { min: 0.4, max: 0.9 },
  gravity: { x: 0, y: -50 },
  blendMode: 'add' as const,
};

const TIME_RING = {
  maxParticles: 8,
  frequency: 0.001 as const,
  emitterLifetime: 0.08,
  particlesPerWave: 8,
  lifetime: { min: 0.3, max: 0.6 },
  speed: { min: 80, max: 200 },
  gravity: { x: 0, y: 0 },
  scale: { start: 0.4, end: 1.8 },
  alpha: { start: 0.8, end: 0 },
  colors: ['10b981', '34d399', 'ffffff'],
  spawnShape: 'burst' as const,
  spawnConfig: { directions: 8 },
  blendMode: 'add' as const,
  shape: 'ring-3' as const,
};

// ─── Main Component ─────────────────────────────────────────────────────

export function AdventureEffectsCanvas(props: AdventureEffectsCanvasProps) {
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
      usePhysics={false}
    >
      <EffectsWorker {...props} />
    </GameCanvas>
  );
}

// ─── Effects Worker (runs inside GameCanvas context) ─────────────────

function EffectsWorker({
  width,
  gridSize,
  effectEvents,
}: AdventureEffectsCanvasProps) {
  const { app, particles, shake } = useGameEngine();
  const processedRef = useRef(new Set<string>());
  const bloomRef = useRef<InstanceType<typeof BloomFilter> | null>(null);
  const shockwaveRef = useRef<InstanceType<typeof ShockwaveFilter> | null>(null);
  const shockwaveRafRef = useRef<number>(0);

  const cellSize = width / gridSize;

  // Initialize bloom filter
  useEffect(() => {
    const bloom = new BloomFilter({ strength: 3, quality: 2 });
    bloom.enabled = false;
    // eslint-disable-next-line react-hooks/immutability -- PixiJS app.stage is mutable by design (see 'use no memo' directive)
    app.stage.filters = [bloom];
    bloomRef.current = bloom;
    return () => {
      bloomRef.current = null;
      if (app.stage && !app.stage.destroyed) {
        app.stage.filters = [];
      }
    };
  }, [app]);

  // Flash bloom for a duration
  const flashBloom = useCallback((strength: number, durationMs: number) => {
    const bloom = bloomRef.current;
    if (!bloom) return;
    bloom.strength = strength;
    bloom.enabled = true;
    setTimeout(() => {
      if (bloom) {
        bloom.enabled = false;
      }
    }, durationMs);
  }, []);

  // Fire shockwave at position
  const fireShockwave = useCallback((cx: number, cy: number) => {
    const sw = new ShockwaveFilter([cx, cy], {
      amplitude: 12,
      wavelength: 80,
      speed: 400,
      radius: -1,
    });
    // eslint-disable-next-line react-hooks/immutability -- PixiJS app.stage is mutable by design (see 'use no memo' directive)
    app.stage.filters = [bloomRef.current, sw].filter(Boolean) as Array<BloomFilter | ShockwaveFilter>;
    shockwaveRef.current = sw;

    const start = performance.now();
    const duration = 500;
    const animate = () => {
      if (app.stage.destroyed) return;
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      sw.time = t;
      if (t < 1) {
        shockwaveRafRef.current = requestAnimationFrame(animate);
      } else {
        // Remove shockwave filter
        app.stage.filters = [bloomRef.current].filter(Boolean) as BloomFilter[];
        shockwaveRef.current = null;
      }
    };
    shockwaveRafRef.current = requestAnimationFrame(animate);
  }, [app]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(shockwaveRafRef.current);
    };
  }, []);

  // Process effect events
  useEffect(() => {
    for (const event of effectEvents) {
      const key = `${event.row}-${event.col}-${event.timestamp}`;
      if (processedRef.current.has(key)) continue;
      processedRef.current.add(key);

      // Convert grid position to pixel center
      const cx = (event.col + 0.5) * cellSize;
      const cy = (event.row + 0.5) * cellSize;

      switch (event.effect) {
        case 'collect': // Gold tile
          particles.burst(GOLD_STARS, cx, cy);
          particles.burst(GEM_GOLDEN_EXPLOSION, cx, cy);
          flashBloom(4, 200);
          break;

        case 'melt': // Ice tile
          particles.burst(ICE_SHATTER, cx, cy);
          particles.burst(FROST_MIST, cx, cy);
          particles.burst(FROST_CRACK, cx, cy);
          break;

        case 'explode': // Bomb tile
          particles.burst(BOMB_EXPLOSION, cx, cy);
          particles.burst(FIRE_EMBERS, cx, cy);
          fireShockwave(cx, cy);
          flashBloom(6, 300);
          shake.shake({ intensity: 8, duration: 0.3, decay: 'exponential' });
          break;

        case 'timeBonus': // Time tile
          particles.burst(TIME_BURST, cx, cy);
          particles.burst(TIME_RING, cx, cy);
          flashBloom(3, 150);
          break;
      }
    }

    // Prune old processed keys (keep last 100)
    if (processedRef.current.size > 100) {
      const arr = Array.from(processedRef.current);
      processedRef.current = new Set(arr.slice(-50));
    }
  }, [effectEvents, cellSize, particles, shake, flashBloom, fireShockwave]);

  return null;
}
