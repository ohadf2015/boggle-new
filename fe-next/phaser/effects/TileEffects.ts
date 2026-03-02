/**
 * TileEffects — per-tile visual animations (fire glow, hint blink, freeze).
 *
 * All tweens check reduceMotion and either skip or use duration:0.
 */

import Phaser from 'phaser';

interface AccessibilityFlags {
  reduceMotion: boolean;
  disableFireRoundLights: boolean;
}

/**
 * Repeating alpha glow on a tile during fire round.
 * No-op when disableFireRoundLights is set.
 */
export function startFireGlow(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { alpha: number },
  flags: AccessibilityFlags
): Phaser.Tweens.Tween | null {
  if (flags.disableFireRoundLights || flags.reduceMotion) return null;

  return scene.tweens.add({
    targets: target,
    alpha: { from: 0.7, to: 1 },
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/** Stop any active fire glow on a tile. */
export function stopFireGlow(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject
): void {
  scene.tweens.killTweensOf(target);
}

/**
 * Blink a tile to indicate a hint.
 * Plays 3 cycles regardless of duration (immediate when reduceMotion).
 */
export function playHintBlink(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { alpha: number },
  flags: AccessibilityFlags
): void {
  const duration = flags.reduceMotion ? 0 : 200;

  scene.tweens.add({
    targets: target,
    alpha: { from: 1, to: 0.3 },
    duration,
    yoyo: true,
    repeat: 2,
    ease: 'Linear',
    onComplete: () => {
      (target as { alpha: number }).alpha = 1;
    },
  });
}

/**
 * Ice freeze visual — tint the tile blue-ish.
 * Instant when reduceMotion.
 */
export function playFreezeEffect(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  flags: AccessibilityFlags
): void {
  const duration = flags.reduceMotion ? 0 : 300;

  scene.tweens.add({
    targets: target,
    alpha: 0.65,
    duration,
    ease: 'Linear',
  });

  target.setTint(0x88ccff);
}

/**
 * Ice melt visual — restore tile to normal.
 */
export function playMeltEffect(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  flags: AccessibilityFlags
): void {
  const duration = flags.reduceMotion ? 0 : 300;
  target.clearTint();

  scene.tweens.add({
    targets: target,
    alpha: 1,
    duration,
    ease: 'Linear',
  });
}
