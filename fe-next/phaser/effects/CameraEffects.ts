/**
 * CameraEffects — shake, flash, zoom for the main Phaser camera.
 *
 * All effects are no-ops when reduceMotion is true.
 * Intensity enum maps to concrete Phaser parameters.
 */

import Phaser from 'phaser';

type EarthquakeIntensity = 'warning' | 'shaking' | 'fire-round';

interface ShakeConfig {
  duration: number;
  intensity: number;
}

const SHAKE_CONFIGS: Record<EarthquakeIntensity, ShakeConfig> = {
  warning:     { duration: 200, intensity: 0.005 },
  shaking:     { duration: 500, intensity: 0.015 },
  'fire-round': { duration: 800, intensity: 0.025 },
};

/** Shake the camera. No-op when reduceMotion is true. */
export function cameraShake(
  camera: Phaser.Cameras.Scene2D.Camera,
  intensity: EarthquakeIntensity,
  reduceMotion: boolean
): void {
  if (reduceMotion) return;
  const cfg = SHAKE_CONFIGS[intensity];
  camera.shake(cfg.duration, cfg.intensity);
}

/** Flash the camera with a colour. No-op when reduceMotion is true. */
export function cameraFlash(
  camera: Phaser.Cameras.Scene2D.Camera,
  color: number,
  duration: number,
  reduceMotion: boolean
): void {
  if (reduceMotion) return;
  camera.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
}

/** Zoom camera in and back. No-op when reduceMotion is true. */
export function cameraZoom(
  camera: Phaser.Cameras.Scene2D.Camera,
  targetZoom: number,
  duration: number,
  reduceMotion: boolean
): void {
  if (reduceMotion) return;
  camera.zoomTo(targetZoom, duration / 2, 'Linear', false, (_cam: unknown, progress: number) => {
    if (progress === 1) {
      camera.zoomTo(1, duration / 2);
    }
  });
}
