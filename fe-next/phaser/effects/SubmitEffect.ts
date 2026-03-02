/**
 * SubmitEffect — orchestrates particles + camera effects on word submission.
 *
 * Reads from ParticleManager and CameraEffects; no visual logic of its own.
 */

import Phaser from 'phaser';
import { playAcceptParticles, playRejectParticles } from '../objects/ParticleManager';
import { cameraFlash } from './CameraEffects';

export interface SubmitEffectConfig {
  reduceMotion: boolean;
  isLowEnd: boolean;
}

/**
 * Play the accepted-word effect: particle burst + green camera flash.
 * @param center - canvas centre of the submitted word's tiles
 * @param color - combo-level hex colour
 */
export function playAccepted(
  scene: Phaser.Scene,
  center: { x: number; y: number },
  color: number,
  config: SubmitEffectConfig
): void {
  playAcceptParticles(scene, center.x, center.y, color, config);
  cameraFlash(scene.cameras.main, color, 150, config.reduceMotion);
}

/**
 * Play the rejected-word effect: small red burst + red camera flash.
 */
export function playRejected(
  scene: Phaser.Scene,
  center: { x: number; y: number },
  config: SubmitEffectConfig
): void {
  playRejectParticles(scene, center.x, center.y, config);
  cameraFlash(scene.cameras.main, 0xff2d20, 100, config.reduceMotion);
}

/**
 * Play the duplicate-word effect: brief yellow flash, no particles.
 */
export function playDuplicate(
  scene: Phaser.Scene,
  config: SubmitEffectConfig
): void {
  cameraFlash(scene.cameras.main, 0xffe135, 100, config.reduceMotion);
}
