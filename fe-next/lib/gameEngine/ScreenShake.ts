// ─── Screen Shake ─────────────────────────────────────────────────────
// Camera shake effect applied to a PixiJS Container offset.
// Supports multiple concurrent shakes that stack additively.

import type { ShakeConfig, Vector2 } from './types';

interface ActiveShake {
  intensity: number;
  duration: number;
  elapsed: number;
  decay: 'linear' | 'exponential';
  frequency: number;
}

export class ScreenShake {
  private shakes: ActiveShake[] = [];
  private _offset: Vector2 = { x: 0, y: 0 };

  get offset(): Vector2 {
    return this._offset;
  }

  /** Trigger a new shake */
  shake(config: ShakeConfig): void {
    this.shakes.push({
      intensity: config.intensity,
      duration: config.duration,
      elapsed: 0,
      decay: config.decay ?? 'exponential',
      frequency: config.frequency ?? 30,
    });
  }

  /** Convenience presets */
  light(): void {
    this.shake({ intensity: 3, duration: 0.15, decay: 'exponential' });
  }

  medium(): void {
    this.shake({ intensity: 6, duration: 0.25, decay: 'exponential' });
  }

  heavy(): void {
    this.shake({ intensity: 12, duration: 0.4, decay: 'exponential' });
  }

  /** Call every frame with delta in seconds */
  update(deltaSec: number): void {
    let totalX = 0;
    let totalY = 0;

    for (let i = this.shakes.length - 1; i >= 0; i--) {
      const s = this.shakes[i];
      s.elapsed += deltaSec;

      if (s.elapsed >= s.duration) {
        this.shakes.splice(i, 1);
        continue;
      }

      const progress = s.elapsed / s.duration;
      let decay: number;
      if (s.decay === 'exponential') {
        decay = Math.pow(1 - progress, 2);
      } else {
        decay = 1 - progress;
      }

      const currentIntensity = s.intensity * decay;
      const phase = s.elapsed * s.frequency * Math.PI * 2;

      // Perlin-like 2D shake via phase-offset sin waves
      totalX += Math.sin(phase) * currentIntensity;
      totalY += Math.cos(phase * 1.3) * currentIntensity;
    }

    this._offset = { x: Math.round(totalX), y: Math.round(totalY) };
  }

  get isShaking(): boolean {
    return this.shakes.length > 0;
  }

  reset(): void {
    this.shakes = [];
    this._offset = { x: 0, y: 0 };
  }
}
