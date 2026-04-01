'use client';

/**
 * BlastEffectsCanvas — Hybrid PixiJS effects layer behind DOM tiles.
 *
 * Architecture: GameCanvas (transparent PixiJS) renders particles, screen shake,
 * and ambient effects BEHIND the existing DOM BlastBoard (passed as children).
 * All touch interaction stays on the DOM layer — zero changes to GridComponent.
 *
 * Dynamically imported (ssr: false) to keep PixiJS out of SSR bundle.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Graphics, Container } from 'pixi.js';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import { SHATTER_COLORS } from './blastColorTokens';
import {
  TILE_EXPLOSION,
  BOMB_EXPLOSION,
  LIGHTNING_SPARK,
  PRISM_CROSS,
  GEM_SHATTER,
  VORTEX_PULL,
  VORTEX_EXPLOSION,
  COMBO_FLASH,
  CASCADE_SPARKLE,
  BOARD_CLEAR,
  AMBIENT_BOKEH,
} from '@/lib/gameEngine/presets/particles';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { BlastTileType } from './types';

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
  waveCleared: boolean;
}

// ─── Tile-type → particle preset map ────────────────────────────────────

const CLEAR_PRESET_MAP: Partial<Record<BlastTileType, ParticleConfig>> = {
  bomb: BOMB_EXPLOSION,
  lightning: LIGHTNING_SPARK,
  prism: PRISM_CROSS,
  gem: GEM_SHATTER,
  magnet: VORTEX_PULL,
};

// ─── Main Component ─────────────────────────────────────────────────────

export function BlastEffectsCanvas({
  width,
  height,
  gridSize,
  clearedTiles,
  chainLevel,
  comboTier,
  waveCleared,
}: BlastEffectsCanvasProps) {
  if (width <= 0 || height <= 0) return null;

  return (
    <GameCanvas
      config={{
        width: Math.round(width),
        height: Math.round(height),
        background: 0x1a1a2e, // match bg-neo-navy
        antialias: true,
      }}
    >
      <EffectsWorker
        width={width}
        height={height}
        gridSize={gridSize}
        clearedTiles={clearedTiles}
        chainLevel={chainLevel}
        comboTier={comboTier}
        waveCleared={waveCleared}
      />
    </GameCanvas>
  );
}

// ─── Effects Worker (runs inside GameCanvas context) ─────────────────

interface EffectsWorkerProps {
  width: number;
  height: number;
  gridSize: number;
  clearedTiles: ClearedTileEvent[];
  chainLevel: number;
  comboTier: number;
  waveCleared: boolean;
}

// ─── Debris fragment tracked per-body ────────────────────────────────

interface DebrisFragment {
  bodyId: number;
  graphic: Graphics;
  color: number;
  size: number;
  createdAt: number;
}

const DEBRIS_LIFETIME = 2; // seconds
const DEBRIS_PER_TILE = 3;
const MAX_DEBRIS = 60;

function EffectsWorker({
  width,
  height,
  gridSize,
  clearedTiles,
  chainLevel,
  comboTier,
  waveCleared,
}: EffectsWorkerProps) {
  const { particles, shake, physics, camera } = useGameEngine();

  const prevClearedKeyRef = useRef('');
  const prevChainRef = useRef(0);
  const prevComboRef = useRef(0);
  const prevWaveRef = useRef(false);
  const debrisRef = useRef<DebrisFragment[]>([]);
  const debrisContainerRef = useRef<Container | null>(null);
  const magnetTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const cellSize = width / gridSize;

  // Create debris container on mount
  useEffect(() => {
    const container = new Container();
    camera.addChild(container);
    debrisContainerRef.current = container;
    return () => {
      // Clean up all debris
      for (const d of debrisRef.current) {
        physics.removeBody(d.bodyId);
        d.graphic.destroy();
      }
      debrisRef.current = [];
      for (const tid of magnetTimersRef.current) clearTimeout(tid);
      magnetTimersRef.current = [];
      camera.removeChild(container);
      container.destroy();
    };
  }, [camera, physics]);

  // Spawn debris fragments for cleared tiles
  const spawnDebris = useCallback((tiles: ClearedTileEvent[]) => {
    const container = debrisContainerRef.current;
    if (!container) return;

    // Limit total debris
    const budget = MAX_DEBRIS - debrisRef.current.length;
    const perTile = Math.min(DEBRIS_PER_TILE, Math.floor(budget / Math.max(tiles.length, 1)));
    if (perTile <= 0) return;

    const now = performance.now() / 1000;
    let hasBomb = false;
    let bombPos = { x: 0, y: 0 };

    for (const tile of tiles) {
      const cx = tile.col * cellSize + cellSize / 2;
      const cy = tile.row * cellSize + cellSize / 2;
      const colors = SHATTER_COLORS[tile.type] ?? SHATTER_COLORS.standard;

      if (tile.type === 'bomb') {
        hasBomb = true;
        bombPos = { x: cx, y: cy };
      }

      for (let i = 0; i < perTile; i++) {
        const size = 3 + Math.random() * 5;
        const colorHex = colors[Math.floor(Math.random() * colors.length)];
        const colorNum = parseInt(colorHex.replace('#', ''), 16);

        // Create PixiJS graphic
        const g = new Graphics();
        g.rect(-size / 2, -size / 2, size, size).fill({ color: colorNum });
        g.x = cx;
        g.y = cy;
        container.addChild(g);

        // Create Matter.js body
        const bodyId = physics.createRect(cx, cy, size, size, {
          restitution: 0.5,
          frictionAir: 0.01,
          density: 0.002,
        });

        // Random initial impulse
        const angle = Math.random() * Math.PI * 2;
        const force = 0.0005 + Math.random() * 0.001;
        physics.applyForce(bodyId, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force - 0.0008,
        });

        debrisRef.current.push({ bodyId, graphic: g, color: colorNum, size, createdAt: now });
      }
    }

    // Bomb explosion: push all debris outward from bomb position
    if (hasBomb) {
      physics.applyExplosion(bombPos, 0.003, cellSize * 3);
    }
  }, [cellSize, physics]);

  // Debris sync: update PixiJS Graphics positions from Matter.js bodies each frame
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const now = performance.now() / 1000;
      const debris = debrisRef.current;
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        const age = now - d.createdAt;

        // Remove expired or off-screen debris
        if (age > DEBRIS_LIFETIME) {
          physics.removeBody(d.bodyId);
          d.graphic.destroy();
          debris.splice(i, 1);
          continue;
        }

        // Sync position from physics
        const state = physics.getBodyState(d.bodyId);
        if (state) {
          d.graphic.x = state.position.x;
          d.graphic.y = state.position.y;
          d.graphic.rotation = state.angle;
          // Fade out in last 30% of lifetime
          const fadeStart = DEBRIS_LIFETIME * 0.7;
          d.graphic.alpha = age > fadeStart
            ? 1 - (age - fadeStart) / (DEBRIS_LIFETIME - fadeStart)
            : 1;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [physics]);

  // Start ambient bokeh on mount
  useEffect(() => {
    const emitter = particles.create(AMBIENT_BOKEH);
    emitter.emit(width / 2, height / 2);
    return () => { emitter.destroy(); };
  }, [particles, width, height]);

  // Tile clear → per-type particle bursts + screen shake
  useEffect(() => {
    if (clearedTiles.length === 0) return;
    const key = clearedTiles.map(t => `${t.row},${t.col},${t.type}`).join(';');
    if (key === prevClearedKeyRef.current) return;
    prevClearedKeyRef.current = key;

    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      const preset = CLEAR_PRESET_MAP[tile.type] ?? TILE_EXPLOSION;
      particles.burst(preset, x, y);

      // Magnet: delayed explosion burst after pull phase completes
      if (tile.type === 'magnet') {
        const tid = setTimeout(() => {
          particles.burst(VORTEX_EXPLOSION, x, y);
          physics.applyExplosion({ x, y }, 0.005, cellSize * 3.5);
        }, 280);
        magnetTimersRef.current.push(tid);
      }
    }

    // Spawn physics debris fragments
    spawnDebris(clearedTiles);

    // Screen shake scaled to clear count
    const count = clearedTiles.length;
    if (count >= 6) shake.heavy();
    else if (count >= 3) shake.medium();
    else shake.light();
  }, [clearedTiles, particles, shake, cellSize, spawnDebris, physics]);

  // Chain cascade sparkle
  useEffect(() => {
    if (chainLevel > prevChainRef.current && chainLevel >= 1) {
      particles.burst(CASCADE_SPARKLE, width / 2, height * 0.7, chainLevel * 5);
      if (chainLevel >= 3) shake.medium();
      else shake.light();
    }
    prevChainRef.current = chainLevel;
  }, [chainLevel, particles, shake, width, height]);

  // Combo flash particles
  useEffect(() => {
    if (comboTier > prevComboRef.current && comboTier >= 1) {
      particles.burst(COMBO_FLASH, width / 2, height / 2, comboTier * 15);
      shake.shake({
        intensity: comboTier * 4,
        duration: 0.2 + comboTier * 0.1,
        decay: 'exponential',
      });
    }
    prevComboRef.current = comboTier;
  }, [comboTier, particles, shake, width, height]);

  // Wave clear celebration
  useEffect(() => {
    if (waveCleared && !prevWaveRef.current) {
      particles.burst(BOARD_CLEAR, width / 2, height / 2);
      shake.heavy();
    }
    prevWaveRef.current = waveCleared;
  }, [waveCleared, particles, shake, width, height]);

  return null;
}

export default BlastEffectsCanvas;
