/**
 * WordPathTrail — draws a glowing bezier path through selected tiles.
 *
 * Layers:
 * 1. 3-layer glow (wide+faint, medium, narrow+bright) — original bezier path
 * 2. Trail head bubble — pulsing glow circle at the last tile
 * 3. Flowing dash animation — animated dashOffset on the core line
 * 4. Spark particles — combo-colored sparks drifting off the trail
 * 5. Connection flash — white zap between tiles on new tile addition
 *
 * Bezier curves are approximated using manual quadratic sampling (lineTo steps)
 * because Phaser.GameObjects.Graphics does NOT expose quadraticCurveTo — that
 * method lives on the raw CanvasRenderingContext2D, not on the Phaser wrapper.
 */

import Phaser from 'phaser';
import type { GridLayout, TilePosition } from '@/lib/phaser/logic/GridGeometry';

interface TrailPoint {
  x: number;
  y: number;
}

export interface TrailOptions {
  reduceMotion?: boolean;
  isLowEnd?: boolean;
}

// Number of line segments used to approximate each quadratic bezier curve.
const BEZIER_STEPS = 8;

// Head bubble dimensions
const HEAD_INNER_RADIUS = 8;
const HEAD_OUTER_RADIUS = 14;
const HEAD_INNER_ALPHA = 0.8;
const HEAD_OUTER_ALPHA = 0.3;

// Spark emission thresholds (path tile count → emit interval ms)
const SPARK_THRESHOLDS: Array<{ minTiles: number; interval: number }> = [
  { minTiles: 7, interval: 60 },
  { minTiles: 5, interval: 100 },
  { minTiles: 3, interval: 200 },
];

const SPARK_MIN_TILES = 3;

export class WordPathTrail extends Phaser.GameObjects.Graphics {
  private currentPath: TrailPoint[] = [];
  private trailColor = 0xffffff;
  private previousPathLength = 0;
  private readonly opts: Required<TrailOptions>;

  // Flow animation timer
   
  private flowTimer: any = null;

  // Spark particle emitter
  private sparkEmitter: { destroy: () => void; explode?: (count: number, x: number, y: number) => void } | null = null;

  constructor(scene: Phaser.Scene, options?: TrailOptions) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(10); // Above tiles
    this.opts = {
      reduceMotion: options?.reduceMotion ?? false,
      isLowEnd: options?.isLowEnd ?? false,
    };
  }

  /** Update the path and redraw. Call on every pointer-move selection. */
  updatePath(
    cells: Array<{ row: number; col: number }>,
    layout: GridLayout,
    color: number
  ): void {
    const prevLength = this.previousPathLength;
    this.currentPath = cells.map((cell) => {
      const tile = layout.tiles.find((t: TilePosition) => t.row === cell.row && t.col === cell.col);
      return { x: tile?.x ?? 0, y: tile?.y ?? 0 };
    });
    this.trailColor = color;
    this.previousPathLength = cells.length;

    const newTileAdded = cells.length > prevLength && prevLength > 0;

    this.redraw(newTileAdded);

    // Animated effects (skip for reduceMotion)
    if (!this.opts.reduceMotion) {
      this.updateFlowTimer();
      this.updateHeadTween(newTileAdded);

      if (!this.opts.isLowEnd) {
        this.updateSparkEmitter();
      }
    }
  }

  /** Clear the trail (call after word submit). */
  clear(): this {
    // Farewell burst before cleanup
    if (this.sparkEmitter && this.currentPath.length >= SPARK_MIN_TILES) {
      const mid = this.currentPath[Math.floor(this.currentPath.length / 2)];
      if (mid && this.sparkEmitter.explode) {
        this.sparkEmitter.explode(10, mid.x, mid.y);
      }
    }

    this.currentPath = [];
    this.previousPathLength = 0;
    this.cleanupFlowTimer();
    this.cleanupSparkEmitter();
    return super.clear();
  }

  // ─── Head bubble ──────────────────────────────────────────────────────────

  private drawHeadBubble(pts: TrailPoint[]): void {
    const last = pts[pts.length - 1];
    if (!last) return;

    // Outer glow (larger, more transparent)
    this.fillStyle(this.trailColor, HEAD_OUTER_ALPHA);
    this.fillCircle(last.x, last.y, HEAD_OUTER_RADIUS);

    // Inner bubble (smaller, brighter)
    this.fillStyle(this.trailColor, HEAD_INNER_ALPHA);
    this.fillCircle(last.x, last.y, HEAD_INNER_RADIUS);
  }

  private updateHeadTween(newTileAdded: boolean): void {
    if (this.currentPath.length < 2) return;

    // Pulse or pop tween on the head bubble
    if (newTileAdded) {
      // Pop animation: brief scale 1→1.4→1
      this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1.0, to: 1.05 },
        scaleY: { from: 1.0, to: 1.05 },
        duration: 120,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    } else {
      // Initial pulse tween
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 0.95, to: 1.0 },
        duration: 400,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── Flowing dash animation ───────────────────────────────────────────────

  private updateFlowTimer(): void {
    if (this.currentPath.length < 2) {
      this.cleanupFlowTimer();
      return;
    }

    // Remove existing timer before creating new one
    if (this.flowTimer) {
      this.scene.time.removeEvent(this.flowTimer);
      this.flowTimer = null;
    }

    this.flowTimer = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => this.redraw(false),
    });
  }

  private cleanupFlowTimer(): void {
    if (this.flowTimer) {
      this.scene.time.removeEvent(this.flowTimer);
      this.flowTimer = null;
    }
  }

  // ─── Spark particles ──────────────────────────────────────────────────────

  private updateSparkEmitter(): void {
    if (this.currentPath.length < SPARK_MIN_TILES) {
      this.cleanupSparkEmitter();
      return;
    }

    // Clean up old emitter and create a new one
    this.cleanupSparkEmitter();

    const mid = this.currentPath[Math.floor(this.currentPath.length / 2)];
    if (!mid) return;

    this.sparkEmitter = this.scene.add.particles(mid.x, mid.y, 'tile-base', {
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 400,
      tint: this.trailColor,
      quantity: 1,
      frequency: this.getSparkInterval(),
      blendMode: 1, // ADD
      emitting: true,
    }) as unknown as typeof this.sparkEmitter;
  }

  private getSparkInterval(): number {
    for (const threshold of SPARK_THRESHOLDS) {
      if (this.currentPath.length >= threshold.minTiles) return threshold.interval;
    }
    return 200;
  }

  private cleanupSparkEmitter(): void {
    if (this.sparkEmitter) {
      this.sparkEmitter.destroy();
      this.sparkEmitter = null;
    }
  }

  // ─── Connection flash ─────────────────────────────────────────────────────

  private drawConnectionFlash(pts: TrailPoint[]): void {
    if (pts.length < 2) return;
    // Flash line from second-to-last to last tile (only the newest connection)
    const prev = pts[pts.length - 2];
    const last = pts[pts.length - 1];
    if (!prev || !last) return;

    this.lineStyle(3, 0xffffff, 0.8);
    this.beginPath();
    this.moveTo(prev.x, prev.y);
    this.lineTo(last.x, last.y);
    this.strokePath();
  }

  // ─── Core redraw ──────────────────────────────────────────────────────────

  private redraw(newTileAdded = false): void {
    super.clear();

    if (this.currentPath.length < 2) return;

    const pts = this.currentPath;

    // Layer 1 — wide, very transparent (glow halo)
    this.drawLayer(pts, 12, this.trailColor, 0.15);
    // Layer 2 — medium (glow body)
    this.drawLayer(pts, 6, this.trailColor, 0.35);
    // Layer 3 — narrow, opaque (core line)
    this.drawLayer(pts, 2, this.trailColor, 0.9);

    // Dot at first tile
    this.fillStyle(this.trailColor, 0.8);
    this.fillCircle(pts[0].x, pts[0].y, 6);

    // Head bubble at last tile
    this.drawHeadBubble(pts);

    // Connection flash (only when new tile just added)
    if (newTileAdded) {
      this.drawConnectionFlash(pts);
    }
  }

  private drawLayer(
    pts: TrailPoint[],
    lineWidth: number,
    color: number,
    alpha: number
  ): void {
    this.lineStyle(lineWidth, color, alpha);
    this.beginPath();
    this.moveTo(pts[0].x, pts[0].y);

    if (pts.length === 2) {
      // Simple straight line for exactly 2 tiles
      this.lineTo(pts[1].x, pts[1].y);
    } else {
      // Smooth catmull-rom style path: draw quadratic bezier segments whose
      // start/end points are midpoints between consecutive tiles. This ensures
      // C1 continuity — no sharp corners at each selected tile.
      let prevMidX = (pts[0].x + pts[1].x) / 2;
      let prevMidY = (pts[0].y + pts[1].y) / 2;
      this.lineTo(prevMidX, prevMidY);

      for (let i = 1; i < pts.length - 1; i++) {
        const nextMidX = (pts[i].x + pts[i + 1].x) / 2;
        const nextMidY = (pts[i].y + pts[i + 1].y) / 2;

        // Sample a quadratic bezier: start=prevMid, control=pts[i], end=nextMid
        const samples = sampleQuadraticBezier(
          { x: prevMidX, y: prevMidY },
          pts[i],
          { x: nextMidX, y: nextMidY },
          BEZIER_STEPS
        );
        for (const pt of samples) {
          this.lineTo(pt.x, pt.y);
        }

        prevMidX = nextMidX;
        prevMidY = nextMidY;
      }

      // Final straight segment to the last tile
      this.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    }

    this.strokePath();
  }
}

/**
 * Sample `steps` points along a quadratic bezier curve.
 *
 * Uses the standard formula: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
 * Does not include the start point (P0) to avoid duplicate points when
 * chaining segments end-to-end.
 */
function sampleQuadraticBezier(
  p0: TrailPoint,
  p1: TrailPoint,
  p2: TrailPoint,
  steps: number
): TrailPoint[] {
  const result: TrailPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    result.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  return result;
}
