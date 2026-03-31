// ─── Score Fly ────────────────────────────────────────────────────────
// Animated score numbers that fly from tile position to HUD.
// Uses PixiJS Text with arc trajectory and fade-out.

import { Container, Text, TextStyle } from 'pixi.js';
import type { Vector2 } from './types';

interface FlyingScore {
  text: Text;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  elapsed: number;
  duration: number;
}

const TIER_COLORS: Record<number, number> = {
  1: 0xffffff,
  2: 0x44ffff,
  3: 0x88ff44,
  4: 0xffaa00,
  5: 0xff44ff,
};

export class ScoreFlyManager {
  readonly container: Container;
  private flies: FlyingScore[] = [];
  private maxConcurrent = 5;

  constructor(parent: Container) {
    this.container = new Container();
    parent.addChild(this.container);
  }

  /** Launch a score fly from source to target */
  fly(opts: {
    score: number;
    from: Vector2;
    to: Vector2;
    /** Visual tier 1-5 for color intensity */
    tier?: number;
    duration?: number;
  }): void {
    if (this.flies.length >= this.maxConcurrent) return;

    const tier = opts.tier ?? 1;
    const color = TIER_COLORS[Math.min(tier, 5)] ?? 0xffffff;
    const fontSize = 16 + tier * 4;

    const text = new Text({
      text: `+${opts.score}`,
      style: new TextStyle({
        fontFamily: 'Geist Mono, monospace',
        fontSize,
        fontWeight: 'bold',
        fill: color,
        dropShadow: {
          color: 0x000000,
          blur: 4,
          distance: 2,
          angle: Math.PI / 4,
        },
      }),
    });
    text.anchor.set(0.5);
    text.x = opts.from.x;
    text.y = opts.from.y;
    this.container.addChild(text);

    this.flies.push({
      text,
      startX: opts.from.x,
      startY: opts.from.y,
      targetX: opts.to.x,
      targetY: opts.to.y,
      elapsed: 0,
      duration: opts.duration ?? 0.6,
    });
  }

  update(deltaSec: number): void {
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      f.elapsed += deltaSec;
      const t = Math.min(f.elapsed / f.duration, 1);

      // Ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      // Arc trajectory — parabolic curve upward
      const arcHeight = -60 * (1 - Math.pow(2 * t - 1, 2));

      f.text.x = f.startX + (f.targetX - f.startX) * ease;
      f.text.y = f.startY + (f.targetY - f.startY) * ease + arcHeight;
      f.text.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      f.text.scale.set(1 + (1 - t) * 0.3);

      if (t >= 1) {
        this.container.removeChild(f.text);
        f.text.destroy();
        this.flies.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const f of this.flies) {
      f.text.destroy();
    }
    this.flies = [];
    this.container.destroy({ children: true });
  }
}
