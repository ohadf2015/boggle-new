// ─── Screen Flash ─────────────────────────────────────────────────────
// Full-screen color overlay with fast fade for impact moments.
// Supports multiple concurrent flashes that layer additively.

import { Container, Graphics } from 'pixi.js';

export interface FlashConfig {
  /** Flash color (hex number) */
  color: number;
  /** Duration in seconds */
  duration: number;
  /** Peak alpha (0–1) */
  intensity: number;
}

interface ActiveFlash {
  color: number;
  duration: number;
  elapsed: number;
  intensity: number;
}

export class ScreenFlash {
  private graphics: Graphics;
  private flashes: ActiveFlash[] = [];
  private width: number;
  private height: number;
  private _destroyed = false;

  constructor(parent: Container, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.graphics = new Graphics();
    this.graphics.visible = false;
    parent.addChild(this.graphics);
  }

  /** Trigger a flash */
  flash(config: FlashConfig): void {
    this.flashes.push({
      color: config.color,
      duration: config.duration,
      elapsed: 0,
      intensity: config.intensity,
    });
  }

  /** Convenience: bright white flash */
  white(): void {
    this.flash({ color: 0xffffff, duration: 0.15, intensity: 0.6 });
  }

  /** Convenience: cyan combo flash */
  combo(): void {
    this.flash({ color: 0x00ffff, duration: 0.2, intensity: 0.4 });
  }

  /** Convenience: red danger flash */
  danger(): void {
    this.flash({ color: 0xff2200, duration: 0.25, intensity: 0.35 });
  }

  /** Convenience: gold reward flash */
  gold(): void {
    this.flash({ color: 0xffcc00, duration: 0.2, intensity: 0.3 });
  }

  get isActive(): boolean {
    return this.flashes.length > 0;
  }

  /** Call each frame with delta in seconds */
  update(deltaSec: number): void {
    // Bail if either this wrapper has been destroyed, or its underlying
    // Pixi Graphics was destroyed by a parent.destroy({children:true}) call
    // before our own destroy() ran (race we've seen during fast unmount on
    // /:locale/blast and /:locale/word-craft).
    if (this._destroyed || this.graphics?.destroyed) return;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].elapsed += deltaSec;
      if (this.flashes[i].elapsed >= this.flashes[i].duration) {
        this.flashes.splice(i, 1);
      }
    }

    if (this.flashes.length === 0) {
      this.graphics.visible = false;
      return;
    }

    // Draw the strongest active flash (highest current alpha)
    this.graphics.visible = true;
    // ?.destroyed guard above is not enough: PixiJS nulls the render context
    // BEFORE setting destroyed=true (WebGL context-loss path), so this per-frame
    // .clear() can still throw on a queued tick (Sentry JAVASCRIPT-NEXTJS-1PV).
    try { this.graphics.clear(); } catch { return; }

    let maxAlpha = 0;
    let maxColor = 0xffffff;
    for (const f of this.flashes) {
      const t = f.elapsed / f.duration;
      // Fast attack (first 10%), then smooth decay
      const envelope = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9;
      const alpha = f.intensity * Math.max(0, envelope);
      if (alpha > maxAlpha) {
        maxAlpha = alpha;
        maxColor = f.color;
      }
    }

    this.graphics
      .rect(0, 0, this.width, this.height)
      .fill({ color: maxColor, alpha: maxAlpha });
  }

  /** Update dimensions (e.g. on resize) */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  destroy(): void {
    this._destroyed = true;
    this.flashes = [];
    this.graphics.destroy();
  }
}
