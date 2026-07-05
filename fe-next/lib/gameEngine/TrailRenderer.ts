// ─── Trail Renderer ───────────────────────────────────────────────────
// Smooth fading ribbon trail for drag paths (e.g. word selection).
// Maintains a point history with per-point age, drawing segments
// with decreasing width and alpha for a polished "swipe" effect.

import { Container, Graphics } from 'pixi.js';

export interface TrailConfig {
  /** Trail color (hex number) */
  color: number;
  /** How long each point lives in seconds */
  maxAge: number;
  /** Maximum stroke width at the newest point */
  maxWidth: number;
  /** Glow color (defaults to same as color) */
  glowColor?: number;
  /** Maximum number of points stored */
  maxPoints?: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export class TrailRenderer {
  private graphics: Graphics;
  private points: TrailPoint[] = [];
  private config: TrailConfig;
  private maxPts: number;
  private _destroyed = false;

  constructor(parent: Container, config: TrailConfig) {
    this.config = config;
    this.maxPts = config.maxPoints ?? 64;
    this.graphics = new Graphics();
    parent.addChild(this.graphics);
  }

  get pointCount(): number {
    return this.points.length;
  }

  /** Add a new trail point at (x, y) */
  addPoint(x: number, y: number): void {
    this.points.push({ x, y, age: 0 });
    // Cap to maxPoints — remove oldest
    while (this.points.length > this.maxPts) {
      this.points.shift();
    }
  }

  /** Clear all points */
  clear(): void {
    this.points = [];
    // Guard the same post-unmount race as update(): a parent.destroy({children:true})
    // can null this Graphics' context before our destroy() runs, turning .clear()
    // into "Cannot read properties of null (reading 'clear')" (Sentry 1CW/1KM).
    if (this._destroyed || this.graphics?.destroyed) return;
    this.graphics.clear();
  }

  /** Call each frame with delta in seconds */
  update(deltaSec: number): void {
    // Bail if our Graphics was destroyed by a parent.destroy({children:true})
    // before our own destroy() — guards the post-unmount tick race.
    if (this._destroyed || this.graphics?.destroyed) return;
    // Age all points and remove expired ones
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].age += deltaSec;
      if (this.points[i].age >= this.config.maxAge) {
        this.points.splice(i, 1);
      }
    }

    this.draw();
  }

  destroy(): void {
    this._destroyed = true;
    this.points = [];
    this.graphics.destroy();
  }

  // ─── Internal ───────────────────────────────────────────────────

  private draw(): void {
    // PixiJS can null the internal render context before setting graphics.destroyed=true
    // (WebGL context-loss path). The guard in update() is not enough — guard here too.
    // Fixes JAVASCRIPT-NEXTJS-1PV.
    if (this._destroyed || this.graphics?.destroyed) return;
    try { this.graphics.clear(); } catch { return; }


    if (this.points.length < 2) {
      // Draw a glow dot at single point
      if (this.points.length === 1) {
        const p = this.points[0];
        const alpha = 1 - p.age / this.config.maxAge;
        this.graphics
          .circle(p.x, p.y, this.config.maxWidth * 0.5)
          .fill({ color: this.config.color, alpha: alpha * 0.6 });
      }
      return;
    }

    const { color, glowColor, maxAge, maxWidth } = this.config;
    const glow = glowColor ?? color;

    // Draw outer glow pass (wider, transparent)
    this.drawSegments(glow, maxWidth * 2.5, 0.12, maxAge);
    // Draw main trail pass
    this.drawSegments(color, maxWidth, 0.8, maxAge);
    // Draw bright core
    this.drawSegments(0xffffff, maxWidth * 0.3, 0.5, maxAge);
  }

  private drawSegments(color: number, width: number, baseAlpha: number, maxAge: number): void {
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      // Alpha based on age of the current point (newer = brighter)
      const t = curr.age / maxAge;
      const alpha = baseAlpha * (1 - t);
      // Width tapers with age
      const w = width * (1 - t * 0.7);

      if (alpha < 0.01 || w < 0.5) continue;

      this.graphics
        .moveTo(prev.x, prev.y)
        .lineTo(curr.x, curr.y)
        .stroke({ color, width: w, alpha, cap: 'round' });
    }
  }
}
