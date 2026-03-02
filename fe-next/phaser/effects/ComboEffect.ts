/**
 * ComboEffect — multi-layered combo celebration system.
 *
 * Orchestrates several visual effects at the word path center when the
 * combo level increases:
 *
 * 1. Shockwave rings   — 1-3 concentric expanding rings (scales with level)
 * 2. Combo text         — "COMBO ×N!" popup that pops + floats upward
 * 3. Star burst         — directional particle explosion
 * 4. Light rays         — radial beams at level 3+ (sunburst effect)
 * 5. Camera punch       — zoom + micro-shake scaling with level
 *
 * All effects are no-ops when reduceMotion is true.
 * Particle counts halved when isLowEnd is true.
 */

import Phaser from 'phaser';
import { getComboHexColors } from '@/lib/phaser/logic/ComboTracker';
import { cameraZoom } from './CameraEffects';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComboEffectConfig {
  reduceMotion: boolean;
  isLowEnd: boolean;
}

interface Point {
  x: number;
  y: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Combo level at which light rays appear. */
const LIGHT_RAY_THRESHOLD = 3;

/** Number of shockwave rings per combo tier. */
function getRingCount(level: number): number {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

/** Number of light ray beams per combo tier. */
function getRayCount(level: number): number {
  if (level >= 7) return 12;
  if (level >= 5) return 10;
  return 8;
}

/** Camera zoom intensity per combo tier. */
function getZoomTarget(level: number): number {
  if (level >= 7) return 1.08;
  if (level >= 5) return 1.06;
  if (level >= 3) return 1.05;
  return 1.03;
}

/** Star burst particle count per combo tier. */
function getParticleCount(level: number, isLowEnd: boolean): number {
  const base = level >= 5 ? 24 : level >= 3 ? 20 : 14;
  return isLowEnd ? Math.ceil(base / 2) : base;
}

/** Lighten a hex colour by blending toward white. */
function lightenColor(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
  const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
  const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
  return (r << 16) | (g << 8) | b;
}

// ─── Shockwave Rings ────────────────────────────────────────────────────────

/**
 * Expanding concentric shockwave rings at the word center.
 * Ring count, radius, and thickness scale with combo level.
 */
export function playComboShockwave(
  scene: Phaser.Scene,
  center: Point,
  color: number,
  level: number,
  config: ComboEffectConfig
): void {
  if (config.reduceMotion) return;

  const count = getRingCount(level);

  for (let i = 0; i < count; i++) {
    const ringG = scene.make.graphics({ x: 0, y: 0 });
    scene.add.existing(ringG);
    ringG.setPosition(center.x, center.y);
    ringG.setDepth(25);

    // Each successive ring: thinner, lighter, slightly larger
    const thickness = Math.max(2, 6 - i * 2);
    const ringColor = i === 0 ? color : lightenColor(color, 0.2 * i);
    const baseRadius = 30 + i * 10;

    ringG.lineStyle(thickness, ringColor, 1);
    ringG.strokeCircle(0, 0, baseRadius);

    ringG.setAlpha(1);
    ringG.setScale(0.2);

    const delay = i * 80;
    const targetScale = 3 + i * 0.8;
    const duration = 500 + i * 100;

    scene.tweens.add({
      targets: ringG,
      scale: targetScale,
      alpha: 0,
      duration,
      delay,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        ringG.destroy();
      },
    });
  }
}

// ─── Combo Text ─────────────────────────────────────────────────────────────

/**
 * "COMBO ×N!" text that pops up at the word center, scales with a bounce,
 * then floats upward while fading out.
 */
export function playComboText(
  scene: Phaser.Scene,
  center: Point,
  color: number,
  level: number,
  config: ComboEffectConfig
): void {
  if (config.reduceMotion) return;

  const hexStr = `#${color.toString(16).padStart(6, '0')}`;
  const fontSize = level >= 5 ? 36 : level >= 3 ? 32 : 28;

  const text = scene.add.text(center.x, center.y, `COMBO \u00D7${level}!`, {
    fontSize: `${fontSize}px`,
    fontFamily: "'Fredoka', 'Rubik', Arial, sans-serif",
    fontStyle: 'bold',
    color: hexStr,
    stroke: '#0d0d0d',
    strokeThickness: 5,
  });
  text.setOrigin(0.5, 0.5);
  text.setDepth(30);
  text.setAlpha(0);
  text.setScale(0.3);

  // Phase 1: Pop in with bounce
  scene.tweens.add({
    targets: text,
    alpha: 1,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 250,
    ease: 'Back.easeOut',
    onComplete: () => {
      // Phase 2: Float upward + fade out
      scene.tweens.add({
        targets: text,
        y: center.y - 80,
        alpha: 0,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 800,
        ease: 'Quad.easeIn',
        onComplete: () => {
          text.destroy();
        },
      });
    },
  });
}

// ─── Star Burst Particles ───────────────────────────────────────────────────

/**
 * Directional particle explosion at the word center.
 * Particle count and speed scale with combo level.
 * Uses fixed angular intervals for a geometric star pattern.
 */
export function playComboStarBurst(
  scene: Phaser.Scene,
  center: Point,
  color: number,
  level: number,
  config: ComboEffectConfig
): void {
  if (config.reduceMotion) return;

  const count = getParticleCount(level, config.isLowEnd);
  const speedMax = 200 + level * 40;
  const lifespan = 700 + level * 50;

  const particles = scene.add.particles(center.x, center.y, 'tile-base', {
    speed: { min: 80, max: speedMax },
    angle: { min: 0, max: 360 },
    scale: { start: 0.35, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan,
    tint: [color, lightenColor(color, 0.3)],
    quantity: count,
    emitting: false,
    gravityY: -80,
    rotate: { min: 0, max: 360 },
  });

  particles.setDepth(22);
  particles.explode(count, center.x, center.y);

  scene.time.delayedCall(lifespan + 200, () => particles.destroy());
}

// ─── Light Rays ─────────────────────────────────────────────────────────────

/**
 * Radial light beams shooting outward from the word center.
 * Creates a dramatic sunburst effect at combo level 3+.
 * Each ray is a thin wedge that expands and fades.
 */
export function playComboLightRays(
  scene: Phaser.Scene,
  center: Point,
  color: number,
  level: number,
  config: ComboEffectConfig
): void {
  if (config.reduceMotion || level < LIGHT_RAY_THRESHOLD) return;

  const rayCount = getRayCount(level);
  const angleStep = 360 / rayCount;
  const rayLength = 120 + level * 15;

  const raysG = scene.make.graphics({ x: 0, y: 0 });
  scene.add.existing(raysG);
  raysG.setPosition(center.x, center.y);
  raysG.setDepth(21);
  raysG.setAlpha(0.8);

  // Draw rays as thin triangles radiating from center
  for (let i = 0; i < rayCount; i++) {
    const angleDeg = i * angleStep;
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    const halfWidth = Phaser.Math.DegToRad(2); // 2° width each side

    const tipX = Math.cos(angleRad) * rayLength;
    const tipY = Math.sin(angleRad) * rayLength;
    const leftX = Math.cos(angleRad - halfWidth) * 8;
    const leftY = Math.sin(angleRad - halfWidth) * 8;
    const rightX = Math.cos(angleRad + halfWidth) * 8;
    const rightY = Math.sin(angleRad + halfWidth) * 8;

    raysG.fillStyle(color, 0.6);
    raysG.fillTriangle(leftX, leftY, rightX, rightY, tipX, tipY);
  }

  raysG.setScale(0.1);

  // Expand + rotate + fade
  scene.tweens.add({
    targets: raysG,
    scale: 1.5,
    alpha: 0,
    angle: 15,
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      raysG.destroy();
    },
  });
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

/**
 * Play the full combo level-up celebration at the given word center.
 * Calls all sub-effects in parallel for maximum impact.
 */
export function playComboLevelUp(
  scene: Phaser.Scene,
  center: Point,
  level: number,
  config: ComboEffectConfig
): void {
  if (config.reduceMotion) return;

  const colors = getComboHexColors(level);
  const color = colors.glowColor;

  // 1. Shockwave rings
  playComboShockwave(scene, center, color, level, config);

  // 2. Floating combo text
  playComboText(scene, center, color, level, config);

  // 3. Star burst particles
  playComboStarBurst(scene, center, color, level, config);

  // 4. Light rays (level 3+)
  playComboLightRays(scene, center, color, level, config);

  // 5. Camera punch — zoom intensity scales with level
  const zoomTarget = getZoomTarget(level);
  cameraZoom(scene.cameras.main, zoomTarget, 350, config.reduceMotion);
}
