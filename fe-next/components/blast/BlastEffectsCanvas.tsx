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
import { SHATTER_COLORS, RAINBOW_DEBRIS_COLORS } from './blastColorTokens';
import {
  TILE_EXPLOSION,
  BOMB_EXPLOSION,
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
  /** Hits remaining before this clear (0 = final hit, >0 = intermediate hit) */
  hitsRemaining?: number;
}

/** Cross axis directions for prism debris */
const CROSS_DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 },  // right
] as const;

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
const LIGHTNING_DEBRIS_PER_CELL = 2;
const LIGHTNING_FLASH_DURATION = 200; // ms

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
  const crossFlashRef = useRef<Graphics | null>(null);
  const crossFlashRafRef = useRef<number>(0);
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
      cancelAnimationFrame(crossFlashRafRef.current);
      if (crossFlashRef.current) { crossFlashRef.current.destroy(); crossFlashRef.current = null; }
      camera.removeChild(container);
      container.destroy();
    };
  }, [camera, physics]);

  // ─── Prism cross beam effect ──────────────────────────────────────
  const firePrismBeams = useCallback((cx: number, cy: number) => {
    const beamOffsets = Math.floor(gridSize / 2) * cellSize;
    particles.burst(PRISM_BEAM_UP, cx, cy - beamOffsets / 2);
    particles.burst(PRISM_BEAM_DOWN, cx, cy + beamOffsets / 2);
    particles.burst(PRISM_BEAM_LEFT, cx - beamOffsets / 2, cy);
    particles.burst(PRISM_BEAM_RIGHT, cx + beamOffsets / 2, cy);
  }, [particles, gridSize, cellSize]);

  // ─── Prism rainbow debris (directional along cross axes) ─────────
  const spawnPrismDebris = useCallback((cx: number, cy: number) => {
    const container = debrisContainerRef.current;
    if (!container) return;
    const budget = MAX_DEBRIS - debrisRef.current.length;
    const count = Math.min(12, budget);
    if (count <= 0) return;
    const now = performance.now() / 1000;

    for (let i = 0; i < count; i++) {
      const dir = CROSS_DIRECTIONS[i % 4];
      const colorHex = RAINBOW_DEBRIS_COLORS[i % RAINBOW_DEBRIS_COLORS.length];
      const colorNum = parseInt(colorHex.replace('#', ''), 16);
      const size = 4 + Math.random() * 4;

      const g = new Graphics();
      g.rect(-size / 2, -size / 2, size, size).fill({ color: colorNum });
      g.x = cx;
      g.y = cy;
      container.addChild(g);

      const bodyId = physics.createRect(cx, cy, size, size, {
        restitution: 0.4,
        frictionAir: 0.015,
        density: 0.002,
      });

      const force = 0.001 + Math.random() * 0.0015;
      physics.applyForce(bodyId, {
        x: dir.x * force + (Math.random() - 0.5) * 0.0003,
        y: dir.y * force + (Math.random() - 0.5) * 0.0003,
      });

      debrisRef.current.push({ bodyId, graphic: g, color: colorNum, size, createdAt: now });
    }
  }, [physics]);

  // ─── Cross flash (white lines fading to transparent over 300ms) ──
  const flashCross = useCallback((cx: number, cy: number) => {
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
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      g.alpha = 0.9 * (1 - t);
      if (t < 1) {
        crossFlashRafRef.current = requestAnimationFrame(fade);
      } else {
        camera.removeChild(g);
        g.destroy();
        crossFlashRef.current = null;
      }
    };
    crossFlashRafRef.current = requestAnimationFrame(fade);
  }, [camera, gridSize, cellSize]);

  // Draw jagged lightning bolt down a column with rapid flash
  const spawnLightningBolt = useCallback((col: number, gridRows: number) => {
    const container = debrisContainerRef.current;
    if (!container) return;

    const x = col * cellSize + cellSize / 2;
    const colHeight = gridRows * cellSize;

    // Column flash overlay — white rectangle fading out
    const flash = new Graphics();
    flash.rect(col * cellSize, 0, cellSize, colHeight).fill({ color: 0xffffff });
    flash.alpha = 0.8;
    container.addChild(flash);

    const flashStart = performance.now();
    const fadeFlash = () => {
      const elapsed = performance.now() - flashStart;
      if (elapsed >= LIGHTNING_FLASH_DURATION) {
        flash.destroy();
        return;
      }
      flash.alpha = 0.8 * (1 - elapsed / LIGHTNING_FLASH_DURATION);
      requestAnimationFrame(fadeFlash);
    };
    requestAnimationFrame(fadeFlash);

    // Jagged bolt — zigzag line segments down the column
    const drawBolt = (offsetX: number) => {
      const bolt = new Graphics();
      bolt.setStrokeStyle({ width: 2 + Math.random() * 2, color: 0x00ffff });
      bolt.moveTo(x + offsetX, 0);
      const segments = gridRows * 3;
      const segHeight = colHeight / segments;
      for (let i = 1; i <= segments; i++) {
        const jitter = (Math.random() - 0.5) * cellSize * 0.6;
        bolt.lineTo(x + offsetX + jitter, i * segHeight);
      }
      bolt.stroke();
      bolt.alpha = 1;
      container.addChild(bolt);
      return bolt;
    };

    // Flash bolt 3 times rapidly
    let flashCount = 0;
    const boltA = drawBolt(0);
    const boltB = drawBolt(3);
    const boltFlashInterval = setInterval(() => {
      flashCount++;
      if (flashCount >= 6) {
        clearInterval(boltFlashInterval);
        boltA.destroy();
        boltB.destroy();
        return;
      }
      boltA.visible = flashCount % 2 === 0;
      boltB.visible = flashCount % 2 === 1;
    }, 50);
  }, [cellSize]);

  // Spawn thin elongated debris flung horizontally from lightning-cleared cells
  const spawnLightningDebris = useCallback((tiles: ClearedTileEvent[]) => {
    const container = debrisContainerRef.current;
    if (!container) return;

    const budget = MAX_DEBRIS - debrisRef.current.length;
    const perTile = Math.min(LIGHTNING_DEBRIS_PER_CELL, Math.floor(budget / Math.max(tiles.length, 1)));
    if (perTile <= 0) return;

    const now = performance.now() / 1000;
    const sparkColors = [0x00ffff, 0xffffff, 0x88eeff, 0xccffff];

    for (const tile of tiles) {
      const cx = tile.col * cellSize + cellSize / 2;
      const cy = tile.row * cellSize + cellSize / 2;

      for (let i = 0; i < perTile; i++) {
        // Thin elongated spark: wider than tall
        const w = 6 + Math.random() * 8;
        const h = 1.5 + Math.random() * 2;
        const color = sparkColors[Math.floor(Math.random() * sparkColors.length)];

        const g = new Graphics();
        g.rect(-w / 2, -h / 2, w, h).fill({ color });
        g.x = cx;
        g.y = cy;
        container.addChild(g);

        const bodyId = physics.createRect(cx, cy, w, h, {
          restitution: 0.3,
          frictionAir: 0.02,
          density: 0.001,
        });

        // Fling horizontally
        const dir = Math.random() > 0.5 ? 1 : -1;
        physics.applyForce(bodyId, {
          x: dir * (0.001 + Math.random() * 0.002),
          y: (Math.random() - 0.5) * 0.0005,
        });

        debrisRef.current.push({ bodyId, graphic: g, color, size: w, createdAt: now });
      }
    }
  }, [cellSize, physics]);

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

    const lightningTiles: ClearedTileEvent[] = [];
    const lightningCols = new Set<number>();

    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      const isFinalHit = !tile.hitsRemaining || tile.hitsRemaining <= 0;

      // Gem: shard burst on intermediate hits, golden explosion on final
      if (tile.type === 'gem') {
        if (isFinalHit) {
          particles.burst(GEM_GOLDEN_EXPLOSION, x, y);
          particles.burst(GEM_SHATTER, x, y);
        } else {
          particles.burst(GEM_SHARD_BURST, x, y);
        }
      // Frozen: crack lines on intermediate hit, ice shatter on final
      } else if (tile.type === 'frozen') {
        if (isFinalHit) {
          particles.burst(ICE_SHATTER, x, y);
        } else {
          particles.burst(FROST_CRACK, x, y);
        }
      // Ice: frost mist on hit, crystalline shatter on final
      } else if (tile.type === 'ice') {
        if (isFinalHit) {
          particles.burst(ICE_SHATTER, x, y);
        }
        particles.burst(FROST_MIST, x, y);
      // Prism: cross beams + rainbow debris + cross flash
      } else if (tile.type === 'prism') {
        particles.burst(PRISM_CROSS, x, y);
        firePrismBeams(x, y);
        spawnPrismDebris(x, y);
        flashCross(x, y);
      // Magnet: delayed explosion burst after pull phase
      } else if (tile.type === 'magnet') {
        particles.burst(VORTEX_PULL, x, y);
        const tid = setTimeout(() => {
          particles.burst(VORTEX_EXPLOSION, x, y);
          physics.applyExplosion({ x, y }, 0.005, cellSize * 3.5);
        }, 280);
        magnetTimersRef.current.push(tid);
      } else {
        const preset = CLEAR_PRESET_MAP[tile.type] ?? TILE_EXPLOSION;
        particles.burst(preset, x, y);
      }

      if (tile.type === 'lightning') {
        lightningTiles.push(tile);
        lightningCols.add(tile.col);
      }
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
  }, [clearedTiles, particles, shake, cellSize, gridSize, spawnDebris, spawnLightningBolt, spawnLightningDebris, firePrismBeams, spawnPrismDebris, flashCross, physics]);

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
