/**
 * BlastEnhancedEffects — spectacular visual effects for special tile clears.
 *
 * Each effect combines Graphics-based visuals (shockwaves, bolts, beams)
 * with particle emitters for maximum impact. All effects respect:
 * - reduceMotion: skip entirely
 * - isLowEnd: particles only (no Graphics draw calls)
 */

import Phaser from 'phaser';
import type { ParticleConfig } from './BlastParticleManager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function particleCount(base: number, config: ParticleConfig): number {
  return config.isLowEnd ? Math.ceil(base / 2) : base;
}

function ensureParticleTexture(scene: Phaser.Scene, key: string, color: number, size = 4): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(color, 1);
  g.fillCircle(size, size, size);
  g.generateTexture(key, size * 2, size * 2);
  g.destroy();
}

function ensureRectTexture(scene: Phaser.Scene, key: string, color: number, w = 6, h = 3): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(color, 1);
  g.fillRect(0, 0, w, h);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ─── Hit-stop durations per tile type (ms) ───────────────────────────────────

const HIT_STOP_DURATIONS: Record<string, number> = {
  bomb: 100,
  prism: 120,
  lightning: 80,
  gem: 60,
  ice: 60,
  frozen: 80,
  magnet: 60,
  gold: 80,
};

/**
 * Get the hit-stop freeze duration for a tile type.
 * Returns 0 for standard/cascade (no freeze).
 */
export function getHitStopDuration(type: string): number {
  return HIT_STOP_DURATIONS[type] ?? 0;
}

// ─── Combo effect scaling ───────────────────────────────────────────────────

/**
 * Get a multiplier for effect intensity based on combo level.
 * - Levels 0-2: 1.0 (no scaling)
 * - Levels 3-4: 1.2
 * - Levels 5-7: 1.4
 * - Levels 8-9: 1.6
 * - Levels 10+: 1.8 (capped at 2.0)
 */
export function getComboEffectScale(comboLevel: number): number {
  if (comboLevel < 3) return 1.0;
  if (comboLevel < 5) return 1.2;
  if (comboLevel < 8) return 1.4;
  if (comboLevel < 10) return 1.6;
  return Math.min(1.8, 2.0);
}

/** Scale a particle count by combo level. */
function comboScaledCount(base: number, config: ParticleConfig, comboLevel: number): number {
  const scaled = Math.ceil(base * getComboEffectScale(comboLevel));
  return config.isLowEnd ? Math.ceil(scaled / 2) : scaled;
}

// ─── Enhanced Effects ───────────────────────────────────────────────────────

/**
 * Bomb shockwave: expanding white ring + debris squares.
 * isLowEnd: particles only (no Graphics ring). reduceMotion: skip entirely.
 */
export function playBombShockwave(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const debrisKey = 'particle-bomb-debris';
  ensureRectTexture(scene, debrisKey, 0xff6440, 5, 5);
  scene.add.particles(x, y, debrisKey, {
    speed: { min: 80, max: 250 },
    scale: { start: 0.8, end: 0 },
    lifespan: 500,
    gravityY: 300,
    quantity: comboScaledCount(10, config, comboLevel),
    rotate: { min: 0, max: 360 },
    emitting: false,
  });

  if (config.isLowEnd) return;

  const ring = scene.make.graphics({ x: 0, y: 0 });
  ring.lineStyle(3, 0xffffff, 1);
  ring.strokeCircle(0, 0, 30);
  ring.setPosition(x, y);
  ring.setAlpha(1);
  scene.add.existing(ring);

  scene.tweens.add({
    targets: ring,
    scaleX: 3,
    scaleY: 3,
    alpha: 0,
    duration: 400,
    ease: 'Quad.easeOut',
    onComplete: () => ring.destroy(),
  });
}

/**
 * Lightning bolt: jagged bolt line from tile up/down + crackle particles.
 * isLowEnd: particles only. reduceMotion: skip entirely.
 */
export function playLightningBolt(scene: Phaser.Scene, x: number, y: number, screenHeight: number, config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const crackleKey = 'particle-lightning-crackle';
  ensureParticleTexture(scene, crackleKey, 0xddeeff, 3);
  scene.add.particles(x, y, crackleKey, {
    speedX: { min: -40, max: 40 },
    speedY: { min: -100, max: 100 },
    scale: { start: 0.6, end: 0 },
    lifespan: 300,
    quantity: comboScaledCount(12, config, comboLevel),
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  if (config.isLowEnd) return;

  const bolt = scene.make.graphics({ x: 0, y: 0 });
  bolt.lineStyle(2, 0xffe100, 1);
  bolt.beginPath();
  bolt.moveTo(x, 0);
  const segments = 8;
  const segH = y / segments;
  for (let i = 1; i <= segments; i++) {
    const jitter = (i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 15);
    bolt.lineTo(x + jitter, segH * i);
  }
  const bottomSegH = (screenHeight - y) / segments;
  for (let i = 1; i <= segments; i++) {
    const jitter = (i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 15);
    bolt.lineTo(x + jitter, y + bottomSegH * i);
  }
  bolt.strokePath();
  bolt.setAlpha(1);
  scene.add.existing(bolt);

  scene.tweens.add({
    targets: bolt,
    alpha: 0,
    duration: 250,
    ease: 'Quad.easeIn',
    onComplete: () => bolt.destroy(),
  });
}

/**
 * Prism beams: rainbow cross lines expanding outward + prismatic ripple ring.
 * isLowEnd: particles only. reduceMotion: skip entirely.
 */
export function playPrismBeams(scene: Phaser.Scene, x: number, y: number, w: number, h: number, config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const rainbowColors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff];
  const colorChoice = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
  const prismKey = `particle-prism-beam-${colorChoice.toString(16)}`;
  ensureParticleTexture(scene, prismKey, colorChoice);

  scene.add.particles(x, y, prismKey, {
    speed: { min: 100, max: 300 },
    scale: { start: 0.7, end: 0 },
    lifespan: 500,
    quantity: comboScaledCount(20, config, comboLevel),
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  if (config.isLowEnd) return;

  const beams = scene.make.graphics({ x: 0, y: 0 });
  beams.lineStyle(4, 0xff69b4, 0.8);
  beams.beginPath();
  beams.moveTo(0, y);
  beams.lineTo(w, y);
  beams.strokePath();
  beams.beginPath();
  beams.moveTo(x, 0);
  beams.lineTo(x, h);
  beams.strokePath();
  beams.setAlpha(1);
  scene.add.existing(beams);

  const ripple = scene.make.graphics({ x: 0, y: 0 });
  ripple.lineStyle(2, 0xffffff, 0.7);
  ripple.strokeCircle(0, 0, 20);
  ripple.setPosition(x, y);
  scene.add.existing(ripple);

  scene.tweens.add({
    targets: beams,
    alpha: 0,
    duration: 400,
    ease: 'Quad.easeOut',
    onComplete: () => beams.destroy(),
  });

  scene.tweens.add({
    targets: ripple,
    scaleX: 4,
    scaleY: 4,
    alpha: 0,
    duration: 500,
    ease: 'Quad.easeOut',
    onComplete: () => ripple.destroy(),
  });
}

/**
 * Gem pop: sparkle shower particles + gem icon flying to score area.
 * isLowEnd: particles only. reduceMotion: skip entirely.
 */
export function playGemPop(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const sparkleKey = 'particle-gem-sparkle';
  ensureParticleTexture(scene, sparkleKey, 0x50c878, 3);
  scene.add.particles(x, y, sparkleKey, {
    speedX: { min: -50, max: 50 },
    speedY: { min: 20, max: 120 },
    scale: { start: 0.5, end: 0 },
    lifespan: 700,
    gravityY: 100,
    quantity: comboScaledCount(25, config, comboLevel),
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  if (config.isLowEnd) return;

  const gem = scene.make.graphics({ x: 0, y: 0 });
  gem.fillStyle(0x50c878, 1);
  gem.fillCircle(0, 0, 8);
  gem.setPosition(x, y);
  scene.add.existing(gem);

  scene.tweens.add({
    targets: gem,
    x: scene.scale.width / 2,
    y: 30,
    scaleX: 0.5,
    scaleY: 0.5,
    alpha: 0,
    duration: 600,
    ease: 'Cubic.easeIn',
    onComplete: () => gem.destroy(),
  });
}

/**
 * Ice shards: angular shard particles + frost drift upward + crack overlay.
 * variant: 'ice' (light blue) or 'frozen' (deep blue, thicker shards).
 * isLowEnd: particles only (no crack graphic). reduceMotion: skip entirely.
 */
export function playIceShards(scene: Phaser.Scene, x: number, y: number, variant: 'ice' | 'frozen', config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const shardColor = variant === 'frozen' ? 0x6699cc : 0x96dcff;
  const frostColor = variant === 'frozen' ? 0x8899bb : 0xddeeff;

  const shardKey = `particle-ice-shard-${variant}`;
  ensureRectTexture(scene, shardKey, shardColor, 6, 3);
  scene.add.particles(x, y, shardKey, {
    speed: { min: 60, max: 180 },
    scale: { start: 0.8, end: 0 },
    lifespan: 500,
    gravityY: 200,
    quantity: comboScaledCount(8, config, comboLevel),
    rotate: { min: 0, max: 360 },
    emitting: false,
  });

  const frostKey = `particle-frost-${variant}`;
  ensureParticleTexture(scene, frostKey, frostColor, 2);
  scene.add.particles(x, y, frostKey, {
    speedX: { min: -20, max: 20 },
    speedY: { min: -50, max: -15 },
    scale: { start: 0.4, end: 0 },
    lifespan: 800,
    quantity: comboScaledCount(10, config, comboLevel),
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  if (config.isLowEnd) return;

  const crack = scene.make.graphics({ x: 0, y: 0 });
  crack.lineStyle(1, 0xffffff, 0.8);
  crack.beginPath();
  crack.moveTo(x, y);
  crack.lineTo(x - 12, y - 8);
  crack.moveTo(x, y);
  crack.lineTo(x + 10, y + 6);
  crack.moveTo(x, y);
  crack.lineTo(x - 5, y + 12);
  crack.strokePath();
  crack.setAlpha(1);
  scene.add.existing(crack);

  scene.tweens.add({
    targets: crack,
    alpha: 0,
    duration: 300,
    ease: 'Quad.easeIn',
    onComplete: () => crack.destroy(),
  });
}

/**
 * Magnet field pull: concentric pulse rings + trail particles.
 * isLowEnd: particles only. reduceMotion: skip entirely.
 */
export function playMagnetFieldPull(scene: Phaser.Scene, x: number, y: number, targets: Array<{ x: number; y: number }>, config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const trailKey = 'particle-magnet-trail';
  ensureParticleTexture(scene, trailKey, 0x8b00ff, 3);
  scene.add.particles(x, y, trailKey, {
    speed: { min: 30, max: 80 },
    scale: { start: 0.5, end: 0 },
    lifespan: 400,
    quantity: comboScaledCount(6 * targets.length, config, comboLevel),
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  if (config.isLowEnd) return;

  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ring = scene.make.graphics({ x: 0, y: 0 });
    ring.lineStyle(1.5, 0x8b00ff, 0.6);
    ring.strokeCircle(0, 0, 15 + i * 10);
    ring.setPosition(x, y);
    ring.setAlpha(0.7);
    scene.add.existing(ring);

    scene.tweens.add({
      targets: ring,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400 + i * 100,
      delay: i * 80,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
}

/**
 * Gold Midas wave: golden expanding ring + gold sparkle upward.
 * isLowEnd: particles only. reduceMotion: skip entirely.
 */
export function playGoldMidasWave(scene: Phaser.Scene, x: number, y: number, config: ParticleConfig, comboLevel = 0): void {
  if (config.reduceMotion) return;

  const goldKey = 'particle-gold-midas';
  ensureParticleTexture(scene, goldKey, 0xffd700, 3);
  scene.add.particles(x, y, goldKey, {
    speedX: { min: -50, max: 50 },
    speedY: { min: -80, max: -20 },
    scale: { start: 0.6, end: 0 },
    lifespan: 700,
    quantity: comboScaledCount(16, config, comboLevel),
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });

  if (config.isLowEnd) return;

  const wave = scene.make.graphics({ x: 0, y: 0 });
  wave.lineStyle(3, 0xffd700, 0.8);
  wave.strokeCircle(0, 0, 25);
  wave.setPosition(x, y);
  wave.setAlpha(1);
  scene.add.existing(wave);

  scene.tweens.add({
    targets: wave,
    scaleX: 3.5,
    scaleY: 3.5,
    alpha: 0,
    duration: 500,
    ease: 'Quad.easeOut',
    onComplete: () => wave.destroy(),
  });
}
