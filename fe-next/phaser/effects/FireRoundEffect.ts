/**
 * FireRoundEffect — ambient visual effects during fire round.
 *
 * Handle-based lifecycle:
 *   startFireRoundAmbient → FireRoundHandle (emitter + vignette)
 *   stopFireRoundAmbient  → destroys both
 *
 * Respects reduceMotion (no embers) and disableFireRoundLights (no vignette).
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

/** Start ambient fire round visuals: embers + red vignette overlay. */
export function startFireRoundAmbient(
  scene: Phaser.Scene,
  a11y: FireRoundA11y
): FireRoundHandle {
  // Embers (continuous particle emitter)
  const emitter = playEmberParticles(scene, {
    reduceMotion: a11y.reduceMotion,
    isLowEnd: a11y.isLowEnd,
  });

  // Vignette overlay
  let vignette: FireRoundHandle['vignette'] = null;
  if (!a11y.disableFireRoundLights) {
    const g = scene.add.graphics();
    g.fillStyle(0xff2d20, 0.1);
    g.fillRect(0, 0, scene.scale.width, scene.scale.height);
    g.setDepth(50);

    if (!a11y.reduceMotion) {
      // Pulsing alpha
      scene.tweens.add({
        targets: g,
        alpha: { from: 0.1, to: 0.2 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      g.setAlpha(0.15);
    }

    vignette = g;
  }

  return { emitter, vignette };
}

/** Stop ambient fire round visuals, cleaning up emitter and vignette. */
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
