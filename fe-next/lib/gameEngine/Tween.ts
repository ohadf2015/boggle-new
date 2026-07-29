// ─── Tween System ─────────────────────────────────────────────────────
// Lightweight tween manager for animating values over time.
// Supports easing, chaining, and completion callbacks.

export type EasingFn = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: (t: number) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  },
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} as const;

interface ActiveTween {
  id: number;
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  easing: EasingFn;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
  delay: number;
}

export class TweenManager {
  private tweens: ActiveTween[] = [];
  private nextId = 0;

  /** Create a tween. Returns an ID for cancellation. */
  add(opts: {
    from: number;
    to: number;
    duration: number;
    easing?: EasingFn;
    delay?: number;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  }): number {
    const id = this.nextId++;
    this.tweens.push({
      id,
      from: opts.from,
      to: opts.to,
      duration: opts.duration,
      elapsed: 0,
      easing: opts.easing ?? Easing.easeOutCubic,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
      delay: opts.delay ?? 0,
    });
    return id;
  }

  cancel(id: number): void {
    const idx = this.tweens.findIndex((t) => t.id === id);
    if (idx >= 0) this.tweens.splice(idx, 1);
  }

  cancelAll(): void {
    this.tweens = [];
  }

  /** Call each frame with delta in seconds */
  update(deltaSec: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];

      // Handle delay
      if (tw.delay > 0) {
        tw.delay -= deltaSec;
        continue;
      }

      tw.elapsed += deltaSec;
      const rawT = Math.min(tw.elapsed / tw.duration, 1);
      const easedT = tw.easing(rawT);
      const value = tw.from + (tw.to - tw.from) * easedT;

      tw.onUpdate(value);

      if (rawT >= 1) {
        tw.onComplete?.();
        this.tweens.splice(i, 1);
      }
    }
  }

  get activeCount(): number {
    return this.tweens.length;
  }

  destroy(): void {
    this.tweens = [];
  }
}
