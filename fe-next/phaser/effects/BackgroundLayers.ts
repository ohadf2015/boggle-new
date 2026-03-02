/**
 * BackgroundLayers — living background atmosphere for Phaser scenes.
 *
 * Creates three visual layers behind the game grid:
 * 1. Radial gradient (dark navy center → darker edges) at depth -2
 * 2. Ambient floating particles (tiny white dots drifting upward) at depth -1
 * 3. Vignette overlay (darkened corners) at depth 100
 *
 * All layers respect reduceMotion and isLowEnd accessibility flags.
 * Call destroy() to clean up all layers.
 */

import Phaser from 'phaser';

// ─── Config ──────────────────────────────────────────────────────────────────

const BG_CENTER_COLOR = 0x1a1a2e;
const BG_EDGE_COLOR = 0x0d0d1a;
const BG_GRADIENT_STEPS = 8;
const VIGNETTE_DEFAULT_ALPHA = 0.15;

interface BackgroundA11y {
  reduceMotion: boolean;
  isLowEnd: boolean;
}

// ─── BackgroundLayers ────────────────────────────────────────────────────────

export class BackgroundLayers {
  private backgroundGradient: Phaser.GameObjects.Graphics | null = null;
  private ambientEmitter: { destroy: () => void } | null = null;
  private vignetteOverlay: Phaser.GameObjects.Graphics | null = null;
  private readonly scene: Phaser.Scene;
  private readonly a11y: BackgroundA11y;

  constructor(scene: Phaser.Scene, a11y: BackgroundA11y) {
    this.scene = scene;
    this.a11y = a11y;
  }

  /** Create all background layers. Call in scene.create(). */
  create(): void {
    this.createBackgroundGradient();

    if (!this.a11y.reduceMotion && !this.a11y.isLowEnd) {
      this.createAmbientParticles();
    }

    if (!this.a11y.reduceMotion) {
      this.createVignette();
    }
  }

  /** Update background state based on gameplay events. */
  updateState(comboLevel: number, isFireRound: boolean): void {
    if (this.vignetteOverlay && !this.a11y.reduceMotion) {
      let targetAlpha = VIGNETTE_DEFAULT_ALPHA;
      if (isFireRound) targetAlpha = 0.3;
      else if (comboLevel >= 7) targetAlpha = 0.05;

      this.scene.tweens.add({
        targets: this.vignetteOverlay,
        alpha: targetAlpha,
        duration: 300,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Clean up all background layers. Call in scene.destroy(). */
  destroy(): void {
    if (this.backgroundGradient) {
      this.backgroundGradient.destroy();
      this.backgroundGradient = null;
    }
    if (this.ambientEmitter) {
      this.ambientEmitter.destroy();
      this.ambientEmitter = null;
    }
    if (this.vignetteOverlay) {
      this.vignetteOverlay.destroy();
      this.vignetteOverlay = null;
    }
  }

  // ─── Accessors (for testing) ──────────────────────────────────────────────

  getGradient(): Phaser.GameObjects.Graphics | null { return this.backgroundGradient; }
  getAmbientEmitter(): { destroy: () => void } | null { return this.ambientEmitter; }
  getVignette(): Phaser.GameObjects.Graphics | null { return this.vignetteOverlay; }

  // ─── Gradient ─────────────────────────────────────────────────────────────

  private createBackgroundGradient(): void {
    this.backgroundGradient = this.scene.make.graphics({ x: 0, y: 0 });
    this.scene.add.existing(this.backgroundGradient);
    this.backgroundGradient.setDepth(-2);
    this.drawGradient();
  }

  private drawGradient(): void {
    if (!this.backgroundGradient) return;

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const maxRadius = Math.max(this.scene.scale.width, this.scene.scale.height) * 0.8;

    this.backgroundGradient.clear();

    for (let i = BG_GRADIENT_STEPS; i >= 0; i--) {
      const t = i / BG_GRADIENT_STEPS;
      const radius = maxRadius * t;

      const r = lerp((BG_EDGE_COLOR >> 16) & 0xff, (BG_CENTER_COLOR >> 16) & 0xff, 1 - t);
      const g = lerp((BG_EDGE_COLOR >> 8) & 0xff, (BG_CENTER_COLOR >> 8) & 0xff, 1 - t);
      const b = lerp(BG_EDGE_COLOR & 0xff, BG_CENTER_COLOR & 0xff, 1 - t);
      const color = (r << 16) | (g << 8) | b;

      this.backgroundGradient.fillStyle(color, 0.2);
      this.backgroundGradient.fillCircle(cx, cy, radius);
    }
  }

  // ─── Ambient particles ────────────────────────────────────────────────────

  private createAmbientParticles(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    this.ambientEmitter = this.scene.add.particles(0, 0, 'tile-base', {
      speed: { min: 10, max: 25 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.08, end: 0 },
      alpha: { start: 0.2, end: 0 },
      lifespan: 5000,
      tint: 0xffffff,
      quantity: 1,
      frequency: 400,
      blendMode: 1, // ADD
      emitZone: {
        type: 'random',
        source: {
          getRandomPoint: (p: { x: number; y: number }) => {
            p.x = Math.random() * w;
            p.y = h * 0.2 + Math.random() * h * 0.8;
            return p;
          },
        },
      },
    }) as unknown as typeof this.ambientEmitter;

    if (this.ambientEmitter && 'setDepth' in this.ambientEmitter) {
      (this.ambientEmitter as unknown as { setDepth: (d: number) => void }).setDepth(-1);
    }
  }

  // ─── Vignette ─────────────────────────────────────────────────────────────

  private createVignette(): void {
    this.vignetteOverlay = this.scene.make.graphics({ x: 0, y: 0 });
    this.scene.add.existing(this.vignetteOverlay);
    this.vignetteOverlay.setDepth(100);
    this.vignetteOverlay.setAlpha(VIGNETTE_DEFAULT_ALPHA);
    this.drawVignette();
  }

  private drawVignette(): void {
    if (!this.vignetteOverlay) return;

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const cornerSize = Math.max(w, h) * 0.4;

    this.vignetteOverlay.clear();
    this.vignetteOverlay.fillStyle(0x000000, 0.4);
    this.vignetteOverlay.fillRect(0, 0, cornerSize, cornerSize);
    this.vignetteOverlay.fillRect(w - cornerSize, 0, cornerSize, cornerSize);
    this.vignetteOverlay.fillRect(0, h - cornerSize, cornerSize, cornerSize);
    this.vignetteOverlay.fillRect(w - cornerSize, h - cornerSize, cornerSize, cornerSize);
  }
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
