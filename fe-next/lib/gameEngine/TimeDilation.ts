// ─── Time Dilation ────────────────────────────────────────────────────
// Temporarily slows or freezes game time for dramatic "bullet time" moments.
// Applied to the delta passed to all game systems (particles, physics, tweens).
// Eases back to normal speed over the second half of the duration.

export class TimeDilation {
  private _scale = 1.0;
  private targetScale = 1.0;
  private duration = 0;
  private elapsed = 0;
  private _active = false;

  get scale(): number {
    return this._scale;
  }

  get isActive(): boolean {
    return this._active;
  }

  /** Apply time dilation to a delta (returns scaled delta) */
  apply(deltaSec: number): number {
    return deltaSec * this._scale;
  }

  /** Slow time to the given scale (0–1) for the given duration */
  slowDown(scale: number, duration: number): void {
    this.targetScale = Math.max(0, Math.min(1, scale));
    this._scale = this.targetScale;
    this.duration = duration;
    this.elapsed = 0;
    this._active = true;
  }

  /** Freeze time completely for the given duration */
  freeze(duration: number): void {
    this.slowDown(0, duration);
  }

  /** Call each frame with real (undilated) delta */
  update(deltaSec: number): void {
    if (!this._active) return;

    this.elapsed += deltaSec;
    if (this.elapsed >= this.duration) {
      this._scale = 1.0;
      this._active = false;
      return;
    }

    const t = this.elapsed / this.duration;
    // First half: hold at target scale. Second half: ease back to 1.0
    if (t < 0.5) {
      this._scale = this.targetScale;
    } else {
      const easeT = (t - 0.5) / 0.5; // 0→1 over second half
      // Smooth ease-out cubic
      const ease = 1 - Math.pow(1 - easeT, 3);
      this._scale = this.targetScale + (1 - this.targetScale) * ease;
    }
  }

  reset(): void {
    this._scale = 1.0;
    this._active = false;
    this.elapsed = 0;
  }
}
