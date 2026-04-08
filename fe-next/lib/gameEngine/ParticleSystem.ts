// ─── Particle System ──────────────────────────────────────────────────
// Custom GPU-accelerated particle system using PixiJS v8 Graphics.
// No external particle library dependency — full control over effects.

import { Container, Graphics } from 'pixi.js';
import type { ParticleConfig, ActiveParticle, Vector2 } from './types';

/** Parse hex color string (without #) to number */
function hexToNum(hex: string): number {
  return parseInt(hex, 16);
}

/** Lerp between two values */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Random float in range */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Lerp between two hex colors */
function lerpColor(colors: number[], t: number): number {
  if (colors.length === 1) return colors[0];
  const idx = t * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  const frac = idx - lo;

  const rA = (colors[lo] >> 16) & 0xff;
  const gA = (colors[lo] >> 8) & 0xff;
  const bA = colors[lo] & 0xff;
  const rB = (colors[hi] >> 16) & 0xff;
  const gB = (colors[hi] >> 8) & 0xff;
  const bB = colors[hi] & 0xff;

  const r = Math.round(lerp(rA, rB, frac));
  const g = Math.round(lerp(gA, gB, frac));
  const b = Math.round(lerp(bA, bB, frac));
  return (r << 16) | (g << 8) | b;
}

export class ParticleEmitter {
  readonly container: Container;
  private particles: ActiveParticle[] = [];
  private graphics: Graphics;
  private config: ParticleConfig;
  private colorNums: number[];
  private emitTimer = 0;
  private lifeTimer = 0;
  private _active = false;
  private _destroyed = false;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(parent: Container, config: ParticleConfig) {
    this.config = config;
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    parent.addChild(this.container);

    this.colorNums = config.colors.map(hexToNum);
    if (config.blendMode === 'add') {
      this.graphics.blendMode = 'add';
    }
  }

  // ─── Controls ───────────────────────────────────────────────────

  emit(x: number, y: number): void {
    this.position = { x, y };
    this._active = true;
    this.emitTimer = 0;
    this.lifeTimer = 0;
  }

  /** One-shot burst, then auto-stop */
  burst(x: number, y: number, count?: number): void {
    this.position = { x, y };
    const n = count ?? this.config.particlesPerWave;
    for (let i = 0; i < n; i++) {
      this.spawnParticle();
    }
  }

  stop(): void {
    this._active = false;
  }

  get active(): boolean {
    return this._active || this.particles.length > 0;
  }

  get particleCount(): number {
    return this.particles.length;
  }

  // ─── Update Loop ────────────────────────────────────────────────

  update(deltaSec: number): void {
    if (this._destroyed) return;

    // Emission
    if (this._active) {
      this.emitTimer += deltaSec;
      this.lifeTimer += deltaSec;

      // Check emitter lifetime
      if (
        this.config.emitterLifetime > 0 &&
        this.lifeTimer >= this.config.emitterLifetime
      ) {
        this._active = false;
      } else {
        while (this.emitTimer >= this.config.frequency) {
          this.emitTimer -= this.config.frequency;
          const toSpawn = Math.min(
            this.config.particlesPerWave,
            this.config.maxParticles - this.particles.length,
          );
          for (let i = 0; i < toSpawn; i++) {
            this.spawnParticle();
          }
        }
      }
    }

    // Update existing particles
    const gravity = this.config.gravity ?? { x: 0, y: 0 };
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaSec;

      if (p.age >= p.maxAge) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply gravity
      p.vx += gravity.x * deltaSec;
      p.vy += gravity.y * deltaSec;

      // Move
      p.x += p.vx * deltaSec;
      p.y += p.vy * deltaSec;

      // Rotate
      p.rotation += p.rotationSpeed * deltaSec;

      // Interpolate scale and alpha over lifetime
      const t = p.age / p.maxAge;
      p.scale = lerp(p.startScale, p.endScale, t);
      p.alpha = lerp(p.startAlpha, p.endAlpha, t);
      p.color = lerpColor(this.colorNums, t);
    }

    // Redraw
    this.draw();
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    this._active = false;
    this.particles = [];
    this.graphics.destroy();
    this.container.destroy({ children: true });
  }

  // ─── Internal ───────────────────────────────────────────────────

  private spawnParticle(): void {
    if (this.particles.length >= this.config.maxParticles) return;

    const { speed, lifetime, scale, alpha, rotationSpeed, spawnShape, spawnConfig } =
      this.config;

    // Determine spawn offset and direction
    let spawnX = this.position.x;
    let spawnY = this.position.y;
    let angle = Math.random() * Math.PI * 2;

    if (spawnShape === 'burst' && spawnConfig?.directions) {
      const dirs = spawnConfig.directions;
      const idx = this.particles.length % dirs;
      angle = (idx / dirs) * Math.PI * 2;
    } else if (spawnShape === 'circle' && spawnConfig?.radius) {
      const r = Math.random() * spawnConfig.radius;
      const a = Math.random() * Math.PI * 2;
      spawnX += Math.cos(a) * r;
      spawnY += Math.sin(a) * r;
    } else if (spawnShape === 'rect' && spawnConfig?.width && spawnConfig?.height) {
      spawnX += rand(-spawnConfig.width / 2, spawnConfig.width / 2);
      spawnY += rand(-spawnConfig.height / 2, spawnConfig.height / 2);
    }

    const spd = rand(speed.min, speed.max);
    const rot = rotationSpeed
      ? rand(rotationSpeed.min, rotationSpeed.max) * (Math.PI / 180)
      : 0;

    this.particles.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      age: 0,
      maxAge: rand(lifetime.min, lifetime.max),
      scale: scale.start,
      alpha: alpha.start,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: rot,
      color: this.colorNums[0],
      startScale: scale.start,
      endScale: scale.end,
      startAlpha: alpha.start,
      endAlpha: alpha.end,
    });
  }

  private draw(): void {
    this.graphics.clear();
    const shape = this.config.shape ?? 'circle';

    for (const p of this.particles) {
      const size = 4 * p.scale;
      if (size < 0.5 || p.alpha < 0.01) continue;

      switch (shape) {
        case 'star':
          this.drawStar(p.x, p.y, size, 5, p.color, p.alpha, p.rotation);
          break;
        case 'diamond':
          this.drawDiamond(p.x, p.y, size, p.color, p.alpha);
          break;
        case 'rect':
          this.graphics
            .rect(p.x - size, p.y - size * 0.5, size * 2, size)
            .fill({ color: p.color, alpha: p.alpha });
          break;
        case 'ring-3':
          this.graphics
            .circle(p.x, p.y, size)
            .stroke({ color: p.color, alpha: p.alpha, width: Math.max(1, size * 0.3) });
          break;
        default:
          this.graphics
            .circle(p.x, p.y, size)
            .fill({ color: p.color, alpha: p.alpha });
          break;
      }
    }
  }

  /** Draw a star polygon at (cx, cy) with given radius and point count */
  private drawStar(cx: number, cy: number, radius: number, points: number, color: number, alpha: number, rotation: number): void {
    const innerR = radius * 0.45;
    const step = Math.PI / points;
    this.graphics.moveTo(
      cx + Math.cos(rotation) * radius,
      cy + Math.sin(rotation) * radius,
    );
    for (let i = 1; i < points * 2; i++) {
      const angle = rotation + i * step;
      const r = i % 2 === 0 ? radius : innerR;
      this.graphics.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    this.graphics.closePath().fill({ color, alpha });
  }

  /** Draw a diamond (rotated square) at (cx, cy) */
  private drawDiamond(cx: number, cy: number, size: number, color: number, alpha: number): void {
    this.graphics
      .moveTo(cx, cy - size)
      .lineTo(cx + size * 0.7, cy)
      .lineTo(cx, cy + size)
      .lineTo(cx - size * 0.7, cy)
      .closePath()
      .fill({ color, alpha });
  }
}

// ─── Particle Pool (manages multiple emitters) ────────────────────────

export class ParticlePool {
  private emitters: ParticleEmitter[] = [];
  private parent: Container;

  constructor(parent: Container) {
    this.parent = parent;
  }

  create(config: ParticleConfig): ParticleEmitter {
    const emitter = new ParticleEmitter(this.parent, config);
    this.emitters.push(emitter);
    return emitter;
  }

  update(deltaSec: number): void {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.update(deltaSec);
      // Auto-cleanup finished one-shot emitters
      if (!e.active && e.particleCount === 0) {
        e.destroy();
        this.emitters.splice(i, 1);
      }
    }
  }

  /** Fire-and-forget burst at position */
  burst(config: ParticleConfig, x: number, y: number, count?: number): void {
    const emitter = this.create(config);
    emitter.burst(x, y, count);
  }

  clear(): void {
    for (const e of this.emitters) e.destroy();
    this.emitters = [];
  }

  destroy(): void {
    this.clear();
  }
}
