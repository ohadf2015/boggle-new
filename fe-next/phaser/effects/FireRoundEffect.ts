/**
 * FireRoundEffect — ambient visual effects during fire round.
 *
 * Handle-based lifecycle:
 *   startFireRoundAmbient → FireRoundHandle (emitter only, vignette removed)
 *   stopFireRoundAmbient  → destroys emitter
 *
 * Respects reduceMotion (no embers).
 * The main fire visual is now a React canvas component (FireBottomEffect).
 */

import Phaser from 'phaser';
import { playEmberParticles } from '../objects/ParticleManager';

export interface FireRoundA11y {
  reduceMotion: boolean;
  disableFireRoundLights: boolean;
  isLowEnd: boolean;
}

export interface FireRoundHandle {
  emitter: { destroy: () => void } | null;
  vignette: { destroy: () => void } | null;
}

/** Start ambient fire round visuals: embers only (vignette removed). */
export function startFireRoundAmbient(
  scene: Phaser.Scene,
  a11y: FireRoundA11y
): FireRoundHandle {
  // Embers (continuous particle emitter)
  const emitter = playEmberParticles(scene, {
    reduceMotion: a11y.reduceMotion,
    isLowEnd: a11y.isLowEnd,
  });

  return { emitter, vignette: null };
}

/** Stop ambient fire round visuals, cleaning up emitter. */
export function stopFireRoundAmbient(
  scene: Phaser.Scene,
  handle: FireRoundHandle
): void {
  if (handle.emitter) {
    handle.emitter.destroy();
  }
  if (handle.vignette) {
    scene.tweens.killTweensOf(handle.vignette);
    handle.vignette.destroy();
  }
}
