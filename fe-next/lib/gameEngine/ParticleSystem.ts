// ─── Particle System ──────────────────────────────────────────────────
// GPU-batched particle system using PixiJS v8 ParticleContainer + Particle.
// Each shape is a module-cached white texture, tinted per-particle. This
// replaced a per-frame Graphics.clear()+redraw path whose CPU cost (re-
// tessellating every particle's geometry each frame, ~680 shapes across ~26
// emitters at a Blast mega-cascade peak) was the dominant render expense.
// Now per-frame work is just transform/tint buffer writes.
// See docs/2026-05-31-pixi-particlecontainer-migration.md.

import { Container, ParticleContainer, Particle, type Texture } from 'pixi.js';
import type { ParticleConfig, ActiveParticle, Vector2, ParticleShape } from './types';
import {
  getParticleTexture,
  particleScaleForSize,
  shouldRotateParticle,
} from './particleTextures';

/** Active particle physics state plus its renderable sprite handle. */
interface EmitterParticle extends ActiveParticle {
  sprite: Particle;
}

// Pixi v8 Color.set() throws "Unable to convert color -N" on any negative input.
// Every helper that produces a numeric color MUST stay in 0..0xFFFFFF.

export function hexToNum(hex: string): number {
  const stripped = hex.startsWith('#') ? hex.slice(1) : hex;
  const n = parseInt(stripped, 16);
  return Number.isFinite(n) && n >= 0 ? n & 0xffffff : 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clampByte(x: number): number {
  return Math.max(0, Math.min(255, x | 0));
}

function packRGB(color: number): number {
  return (clampByte((color >> 16) & 0xff) << 16)
    | (clampByte((color >> 8) & 0xff) << 8)
    | clampByte(color & 0xff);
}

export function lerpColor(colors: number[], t: number): number {
  if (colors.length === 0) return 0;
  if (colors.length === 1) return packRGB(colors[0] ?? 0);

  const ct = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const idx = ct * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  const frac = idx - lo;

  const cLo = colors[lo] ?? 0;
  const cHi = colors[hi] ?? 0;

  const rA = (cLo >> 16) & 0xff;
  const gA = (cLo >> 8) & 0xff;
  const bA = cLo & 0xff;
  const rB = (cHi >> 16) & 0xff;
  const gB = (cHi >> 8) & 0xff;
  const bB = cHi & 0xff;

  const r = clampByte(Math.round(lerp(rA, rB, frac)));
  const g = clampByte(Math.round(lerp(gA, gB, frac)));
  const b = clampByte(Math.round(lerp(bA, bB, frac)));
  return (r << 16) | (g << 8) | b;
}

export class ParticleEmitter {
  readonly container: ParticleContainer;
  private particles: EmitterParticle[] = [];
  private texture: Texture;
  private shape: ParticleShape;
  private rotates: boolean;
  private config: ParticleConfig;
  private colorNums: number[];
  private emitTimer = 0;
  private lifeTimer = 0;
  private _active = false;
  private _destroyed = false;
  /** Set whenever the particle LIST changes (add/remove). Per-frame property
   *  edits auto-upload, but list-membership changes require container.update()
   *  to resync the GPU buffer (Pixi v8) — otherwise new particles never render. */
  private _listDirty = false;
  private position: Vector2 = { x: 0, y: 0 };

  constructor(parent: Container, config: ParticleConfig) {
    this.config = config;
    this.shape = config.shape ?? 'circle';
    // All four dynamic groups change every frame (move, scale-fade, rotate, tint+alpha).
    this.container = new ParticleContainer({
      dynamicProperties: { position: true, vertex: true, rotation: true, color: true },
    });
    // blendMode is a per-container property — keeping one container per emitter
    // preserves each preset's blend (24 presets are additive).
    if (config.blendMode === 'add' || config.blendMode === 'screen') {
      this.container.blendMode = config.blendMode;
    }
    this.texture = getParticleTexture(this.shape);
    this.rotates = shouldRotateParticle(this.shape);
    parent.addChild(this.container);

    this.colorNums = config.colors.map(hexToNum);
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
    // Burst can be fired between ticks — flush so the new particles render even
    // if a frame draws before the next update().
    this.flushList();
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
    // Also bail when our ParticleContainer was destroyed by a parent
    // (children:true) destroy that ran before our own destroy() — touching a
    // destroyed container throws in Pixi v8.
    if (this._destroyed || this.container?.destroyed) return;

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
        this.container.removeParticle(p.sprite);
        this.particles.splice(i, 1);
        this._listDirty = true;
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

      this.syncSprite(p);
    }

    this.flushList();
  }

  /** Resync the GPU particle buffer after the list changed. Cheap relative to
   *  the old per-frame geometry re-tessellation; no-op when nothing changed. */
  private flushList(): void {
    if (this._listDirty && !this.container.destroyed) {
      this.container.update();
      this._listDirty = false;
    }
  }

  /** Push physics state onto the renderable sprite (cheap GPU buffer write). */
  private syncSprite(p: EmitterParticle): void {
    const size = 4 * p.scale;
    const s = particleScaleForSize(size);
    p.sprite.x = p.x;
    p.sprite.y = p.y;
    p.sprite.scaleX = s;
    p.sprite.scaleY = s;
    p.sprite.rotation = this.rotates ? p.rotation : 0;
    p.sprite.tint = p.color;
    // Old draw skipped near-invisible particles; replicate by hiding via alpha.
    p.sprite.alpha = size < 0.5 || p.alpha < 0.01 ? 0 : p.alpha;
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  destroy(): void {
    this._destroyed = true;
    this._active = false;
    this.particles = [];
    // Do NOT destroy the texture — it's module-cached and shared across emitters.
    this.container.destroy();
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

    const startScale = scale.start;
    const initialScale = particleScaleForSize(4 * startScale);
    const sprite = new Particle({
      texture: this.texture,
      x: spawnX,
      y: spawnY,
      scaleX: initialScale,
      scaleY: initialScale,
      tint: this.colorNums[0] ?? 0xffffff,
      alpha: alpha.start,
    });
    // Center the sprite so position/scale/rotation pivot on the particle's
    // center — matching the old circle(p.x, p.y, …) center-draw.
    sprite.anchorX = 0.5;
    sprite.anchorY = 0.5;
    this.container.addParticle(sprite);
    this._listDirty = true;

    this.particles.push({
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      age: 0,
      maxAge: rand(lifetime.min, lifetime.max),
      scale: startScale,
      alpha: alpha.start,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: rot,
      color: this.colorNums[0],
      startScale,
      endScale: scale.end,
      startAlpha: alpha.start,
      endAlpha: alpha.end,
      sprite,
    });
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
