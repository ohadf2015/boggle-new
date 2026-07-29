'use client';

import { useEffect, useRef, useCallback } from 'react';
// NOTE: Debris cleanup is driven solely by the RAF sweep below (age > DEBRIS_LIFETIME).
// No per-fragment setTimeout backups — they duplicate work the RAF tick already does.
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

// Guard against invalid hex -> NaN -> PIXI "Unable to convert color" throw.
// Accepts '#RRGGBB' or 'RRGGBB'; returns fallback for undefined/malformed/negative.
export function safeHexToNum(hex: string | undefined | null, fallback = 0xffffff): number {
  if (!hex) return fallback;
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{1,8}$/.test(clean)) return fallback;
  const n = parseInt(clean, 16);
  if (!Number.isFinite(n) || n < 0 || n > 0xffffff) return fallback;
  return n;
}

// Tightened 2026-04-29: was 2s/3-per-tile/60 — fragments lingered for too long on
// the board, hiding tile letters and making it hard for the player to see what's
// next. 1.0s lifetime + 2 fragments per tile keeps the visual punch while clearing
// the board ~50% sooner. MAX_DEBRIS reduced in proportion.
const DEBRIS_LIFETIME = 1.0; // seconds
const DEBRIS_PER_TILE = 2;
const MAX_DEBRIS = 40;
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
  gridSize: number,
  camera: Container,
  physics: PhysicsWorld,
) {
  const debrisRef = useRef<DebrisFragment[]>([]);
  const debrisContainerRef = useRef<Container | null>(null);
  const wallBodyIdsRef = useRef<number[]>([]);
  const lightningIntervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const lightningRafsRef = useRef<Set<number>>(new Set());
  const lightningGraphicsRef = useRef<Set<Graphics>>(new Set());
  const mountedRef = useRef(true);

  // Create debris container + static walls on mount
  useEffect(() => {
    // Re-arm on every effect run — deps (cellSize/gridSize) can change on resize,
    // and prior cleanup flipped this to false. Without re-arming, the RAF tick
    // below short-circuits forever, leaving spawned debris frozen on the overlay.
    mountedRef.current = true;
    const container = new Container();
    camera.addChild(container);
    debrisContainerRef.current = container;

    // Static collision walls — floor + left + right so debris bounces
    // and never escapes the play area. Walls extend past the board so
    // high-velocity fragments don't tunnel around corners.
    //
    // Floor sits a full cell below the canvas (top edge at y = boardPx +
    // cellSize) so settled fragments rest off-screen instead of perched on
    // the bottom-row tiles — the floor used to sit flush with boardPx,
    // which left red bomb shards visibly stuck on bottom-row letters after
    // explosions. Side walls extend equally far so a fragment can't bounce
    // out the corner before the floor catches it.
    const boardPx = gridSize * cellSize;
    const thickness = 40;
    const overshoot = 200;
    const floorOffset = cellSize;
    const floorId = physics.createWall(
      boardPx / 2,
      boardPx + thickness / 2 + floorOffset,
      boardPx + overshoot,
      thickness,
    );
    const sideHeight = boardPx + overshoot + floorOffset;
    const sideCenterY = boardPx / 2 + floorOffset / 2;
    const leftId = physics.createWall(
      -thickness / 2,
      sideCenterY,
      thickness,
      sideHeight,
    );
    const rightId = physics.createWall(
      boardPx + thickness / 2,
      sideCenterY,
      thickness,
      sideHeight,
    );
    wallBodyIdsRef.current = [floorId, leftId, rightId];

    const intervals = lightningIntervalsRef.current;
    const rafs = lightningRafsRef.current;
    const bolts = lightningGraphicsRef.current;
    return () => {
      mountedRef.current = false;
      for (const d of debrisRef.current) {
        try { physics.removeBody(d.bodyId); } catch { /* noop */ }
        if (!d.graphic.destroyed) d.graphic.destroy();
      }
      debrisRef.current = [];
      for (const wid of wallBodyIdsRef.current) {
        try { physics.removeBody(wid); } catch { /* noop */ }
      }
      wallBodyIdsRef.current = [];
      for (const iid of intervals) clearInterval(iid);
      intervals.clear();
      for (const rid of rafs) cancelAnimationFrame(rid);
      rafs.clear();
      for (const bolt of bolts) {
        if (!bolt.destroyed) bolt.destroy();
      }
      bolts.clear();
      camera.removeChild(container);
      container.destroy();
    };
  }, [camera, physics, cellSize, gridSize]);

  // Debris sync: update PixiJS Graphics positions from Matter.js bodies each frame
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      // No mountedRef early-return: this effect's deps are stable (`physics`
      // only), but the sibling effect that flips mountedRef re-runs on
      // cellSize/gridSize changes. An early-return here would cancel the loop
      // forever during a transient unmounted window. Per-fragment
      // `d.graphic.destroyed` checks below + the rafId cleanup on real unmount
      // already handle correctness.
      try {
        const now = performance.now() / 1000;
        const debris = debrisRef.current;
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          try {
            if (d.graphic.destroyed) {
              debris.splice(i, 1);
              continue;
            }
            const age = now - d.createdAt;

            if (age > DEBRIS_LIFETIME) {
              try { physics.removeBody(d.bodyId); } catch { /* noop */ }
              if (!d.graphic.destroyed) d.graphic.destroy();
              debris.splice(i, 1);
              continue;
            }

            const state = physics.getBodyState(d.bodyId);
            // Pixi v8's recursive parent destroy can null a child's internal
            // `_position` *before* flipping `destroyed`, so `.x =` would throw
            // "Cannot set properties of null". Guard on `position` too.
            if (state && !d.graphic.destroyed && d.graphic.position) {
              d.graphic.x = state.position.x;
              d.graphic.y = state.position.y;
              d.graphic.rotation = state.angle;
              // Aggressive fade: start at 10% of lifetime so fragments dissolve
              // almost the entire flight, never sitting opaque on a tile.
              const fadeStart = DEBRIS_LIFETIME * 0.1;
              const peakAlpha = 0.85;
              d.graphic.alpha = age > fadeStart
                ? peakAlpha * (1 - (age - fadeStart) / (DEBRIS_LIFETIME - fadeStart))
                : peakAlpha;
            } else if (!state) {
              // Physics body vanished — destroy orphan graphic
              if (!d.graphic.destroyed) d.graphic.destroy();
              debris.splice(i, 1);
            }
          } catch {
            // A torn-down Pixi graphic threw mid-sweep (v8 destroys recursively
            // and can null internals before flipping `destroyed`). Drop this one
            // fragment and keep sweeping — never let it strand the rest on-board.
            try { physics.removeBody(debris[i]?.bodyId); } catch { /* noop */ }
            debris.splice(i, 1);
          }
        }
      } finally {
        // Always reschedule — a throw must never kill the loop, or every
        // remaining fragment freezes mid-board (the explosion-remnant artifact).
        rafId = requestAnimationFrame(tick);
      }
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
      const colorNum = safeHexToNum(colorHex);
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
    lightningGraphicsRef.current.add(flash);

    const flashStart = performance.now();
    let flashRafId = 0;
    const rafs = lightningRafsRef.current;
    const fadeFlash = () => {
      if (!mountedRef.current || flash.destroyed) {
        rafs.delete(flashRafId);
        return;
      }
      const elapsed = performance.now() - flashStart;
      if (elapsed >= LIGHTNING_FLASH_DURATION) {
        lightningGraphicsRef.current.delete(flash);
        if (!flash.destroyed) flash.destroy();
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
    lightningGraphicsRef.current.add(boltA);
    lightningGraphicsRef.current.add(boltB);
    const boltFlashInterval = setInterval(() => {
      flashCount++;
      if (flashCount >= 6) {
        clearInterval(boltFlashInterval);
        lightningIntervalsRef.current.delete(boltFlashInterval);
        lightningGraphicsRef.current.delete(boltA);
        lightningGraphicsRef.current.delete(boltB);
        if (!boltA.destroyed) boltA.destroy();
        if (!boltB.destroyed) boltB.destroy();
        return;
      }
      if (!boltA.destroyed) boltA.visible = flashCount % 2 === 0;
      if (!boltB.destroyed) boltB.visible = flashCount % 2 === 1;
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
        const colorNum = safeHexToNum(colorHex);

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

  // ─── Wave-clear radial burst ─────────────────────────────────────
  // Spawns a ring of fresh debris fragments at the center then fires
  // an explosion force — pushes the new fragments (and any existing
  // debris within radius) radially outward. Called when a wave clears.
  const spawnWaveClearBurst = useCallback(
    (cx: number, cy: number, radius: number) => {
      const container = debrisContainerRef.current;
      if (!container) return;

      const budget = MAX_DEBRIS - debrisRef.current.length;
      const count = Math.min(24, budget);
      if (count <= 0) return;

      const now = performance.now() / 1000;
      const rainbow = RAINBOW_DEBRIS_COLORS;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = radius * 0.35 * (0.6 + Math.random() * 0.4);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        const size = 4 + Math.random() * 4;
        const colorHex = rainbow[i % rainbow.length];
        const colorNum = safeHexToNum(colorHex);

        const g = new Graphics();
        g.rect(-size / 2, -size / 2, size, size).fill({ color: colorNum });
        g.x = x;
        g.y = y;
        container.addChild(g);

        const bodyId = physics.createRect(x, y, size, size, {
          restitution: 0.5,
          frictionAir: 0.012,
          density: 0.0015,
        });

        debrisRef.current.push({
          bodyId,
          graphic: g,
          color: colorNum,
          size,
          createdAt: now,
        });
      }

      // Fire after spawning so new fragments get pushed too.
      physics.applyExplosion({ x: cx, y: cy }, 0.004, radius);
    },
    [physics],
  );

  return {
    spawnDebris,
    spawnLightningDebris,
    spawnLightningBolt,
    spawnPrismDebris,
    spawnWaveClearBurst,
  };
}
