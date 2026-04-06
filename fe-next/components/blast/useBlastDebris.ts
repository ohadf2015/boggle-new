'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Graphics, Container } from 'pixi.js';
import { PhysicsWorld } from '@/lib/gameEngine/PhysicsWorld';
import { SHATTER_COLORS, RAINBOW_DEBRIS_COLORS } from './blastColorTokens';
import type { ClearedTileEvent } from './BlastEffectsCanvas';

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

/** Cross axis directions for prism debris */
const CROSS_DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
  { x: 1, y: 0 },  // right
] as const;

export function useBlastDebris(
  cellSize: number,
  _gridSize: number,
  camera: Container,
  physics: PhysicsWorld,
) {
  const debrisRef = useRef<DebrisFragment[]>([]);
  const debrisContainerRef = useRef<Container | null>(null);
  const lightningIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const lightningRafsRef = useRef<Set<number>>(new Set());

  // Create debris container on mount
  useEffect(() => {
    const container = new Container();
    camera.addChild(container);
    debrisContainerRef.current = container;
    const intervals = lightningIntervalsRef.current;
    const rafs = lightningRafsRef.current;
    return () => {
      for (const d of debrisRef.current) {
        physics.removeBody(d.bodyId);
        d.graphic.destroy();
      }
      debrisRef.current = [];
      for (const iid of intervals) clearInterval(iid);
      intervals.clear();
      for (const rid of rafs) cancelAnimationFrame(rid);
      rafs.clear();
      camera.removeChild(container);
      container.destroy();
    };
  }, [camera, physics]);

  // Debris sync: update PixiJS Graphics positions from Matter.js bodies each frame
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const now = performance.now() / 1000;
      const debris = debrisRef.current;
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        const age = now - d.createdAt;

        if (age > DEBRIS_LIFETIME) {
          physics.removeBody(d.bodyId);
          d.graphic.destroy();
          debris.splice(i, 1);
          continue;
        }

        const state = physics.getBodyState(d.bodyId);
        if (state) {
          d.graphic.x = state.position.x;
          d.graphic.y = state.position.y;
          d.graphic.rotation = state.angle;
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

  // Draw jagged lightning bolt down a column with rapid flash
  const spawnLightningBolt = useCallback((col: number, gridRows: number) => {
    const container = debrisContainerRef.current;
    if (!container) return;

    const x = col * cellSize + cellSize / 2;
    const colHeight = gridRows * cellSize;

    const flash = new Graphics();
    flash.rect(col * cellSize, 0, cellSize, colHeight).fill({ color: 0xffffff });
    flash.alpha = 0.8;
    container.addChild(flash);

    const flashStart = performance.now();
    let flashRafId = 0;
    const rafs = lightningRafsRef.current;
    const fadeFlash = () => {
      const elapsed = performance.now() - flashStart;
      if (elapsed >= LIGHTNING_FLASH_DURATION) {
        flash.destroy();
        rafs.delete(flashRafId);
        return;
      }
      flash.alpha = 0.8 * (1 - elapsed / LIGHTNING_FLASH_DURATION);
      rafs.delete(flashRafId);
      flashRafId = requestAnimationFrame(fadeFlash);
      rafs.add(flashRafId);
    };
    flashRafId = requestAnimationFrame(fadeFlash);
    rafs.add(flashRafId);

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

    let flashCount = 0;
    const boltA = drawBolt(0);
    const boltB = drawBolt(3);
    const boltFlashInterval = setInterval(() => {
      flashCount++;
      if (flashCount >= 6) {
        clearInterval(boltFlashInterval);
        lightningIntervalsRef.current.delete(boltFlashInterval);
        boltA.destroy();
        boltB.destroy();
        return;
      }
      boltA.visible = flashCount % 2 === 0;
      boltB.visible = flashCount % 2 === 1;
    }, 50);
    lightningIntervalsRef.current.add(boltFlashInterval);
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

        const g = new Graphics();
        g.rect(-size / 2, -size / 2, size, size).fill({ color: colorNum });
        g.x = cx;
        g.y = cy;
        container.addChild(g);

        const bodyId = physics.createRect(cx, cy, size, size, {
          restitution: 0.5,
          frictionAir: 0.01,
          density: 0.002,
        });

        const angle = Math.random() * Math.PI * 2;
        const force = 0.0005 + Math.random() * 0.001;
        physics.applyForce(bodyId, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force - 0.0008,
        });

        debrisRef.current.push({ bodyId, graphic: g, color: colorNum, size, createdAt: now });
      }
    }

    if (hasBomb) {
      physics.applyExplosion(bombPos, 0.003, cellSize * 3);
    }
  }, [cellSize, physics]);

  return { spawnDebris, spawnLightningDebris, spawnLightningBolt, spawnPrismDebris };
}
