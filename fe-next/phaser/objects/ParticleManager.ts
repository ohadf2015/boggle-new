/**
 * ParticleManager — word-feedback and ambient particle emitters.
 *
 * Particle budgets scale with device performance:
 *   isLowEnd → half count  |  reduceMotion → 0 (no particles)
 */

import Phaser from 'phaser';

export interface ParticleConfig {
  reduceMotion: boolean;
  isLowEnd: boolean;
}

/** Burst particles at a point when a word is accepted. */
export function playAcceptParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  config: ParticleConfig
): void {
  if (config.reduceMotion) return;

  const count = config.isLowEnd ? 8 : 16;

  const particles = scene.add.particles(x, y, 'tile-base', {
    speed: { min: 60, max: 200 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.25, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: 600,
    tint: color,
    quantity: count,
    emitting: false,
  });

  particles.explode(count, x, y);

  // Destroy emitter after particles expire
  scene.time.delayedCall(800, () => particles.destroy());
}

/** Short burst when a word is rejected (red, fewer particles). */
export function playRejectParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ParticleConfig
): void {
  if (config.reduceMotion) return;

  const count = config.isLowEnd ? 3 : 6;

  const particles = scene.add.particles(x, y, 'tile-base', {
    speed: { min: 30, max: 80 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.15, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 300,
    tint: 0xff2d20,
    quantity: count,
    emitting: false,
  });

  particles.explode(count, x, y);
  scene.time.delayedCall(500, () => particles.destroy());
}

/** One-shot debris burst — brown/gray chips falling down. Self-cleaning. */
export function playDebrisParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  config: ParticleConfig
): void {
  if (config.reduceMotion) return;

  const count = config.isLowEnd ? 6 : 12;

  const particles = scene.add.particles(x, y, 'tile-base', {
    speed: { min: 40, max: 150 },
    angle: { min: 200, max: 340 },
    scale: { start: 0.2, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 700,
    tint: [0x8b7355, 0x6b6b6b, 0xa0936b],
    quantity: count,
    gravityY: 100,
    emitting: false,
  });

  particles.explode(count, x, y);
  scene.time.delayedCall(900, () => particles.destroy());
}

/** Continuous ember emitter — orange/red particles rising from bottom edge. Returns emitter for caller cleanup. */
export function playEmberParticles(
  scene: Phaser.Scene,
  config: ParticleConfig
): ReturnType<typeof scene.add.particles> | null {
  if (config.reduceMotion) return null;

  const frequency = config.isLowEnd ? 200 : 100;

  const particles = scene.add.particles(0, scene.scale.height, 'tile-base', {
    speed: { min: 20, max: 60 },
    angle: { min: 250, max: 290 },
    scale: { start: 0.15, end: 0 },
    alpha: { start: 0.8, end: 0 },
    lifespan: 2000,
    tint: [0xff6b35, 0xff2d20, 0xffe135],
    quantity: 1,
    frequency,
    gravityY: -60,
    emitZone: {
      type: 'random',
      source: { getRandomPoint: (p: { x: number; y: number }) => { p.x = Math.random() * scene.scale.width; p.y = 0; return p; } },
    },
  });

  return particles;
}

/** Combo burst — star-shaped explosion from tile at combo level-up. */
export function playComboParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  config: ParticleConfig
): void {
  if (config.reduceMotion) return;

  const count = config.isLowEnd ? 6 : 12;

  const particles = scene.add.particles(x, y, 'tile-base', {
    speed: { min: 100, max: 300 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.3, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: 800,
    tint: color,
    quantity: count,
    emitting: false,
    gravityY: -50,
  });

  particles.explode(count, x, y);
  scene.time.delayedCall(1000, () => particles.destroy());
}
