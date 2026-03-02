/**
 * EarthquakeEffect — visual ground effects for earthquake sequence.
 *
 * Three intensity levels with escalating visuals:
 *   warning       → dust + mild tile jitter
 *   shaking       → debris + tile displacement + crack lines
 *   fire-round    → camera flash + thick cracks + intense debris
 *
 * All functions are no-ops when disableEarthquakeEffects or reduceMotion.
 */

import Phaser from 'phaser';
import { playDebrisParticles } from '../objects/ParticleManager';
import { cameraFlash } from './CameraEffects';
import type { GridLayout } from '@/lib/phaser/logic/GridGeometry';

export interface EarthquakeA11y {
  reduceMotion: boolean;
  disableEarthquakeEffects: boolean;
  isLowEnd: boolean;
}

type TileMap = Map<string, { x: number; y: number }>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shouldSkip(a11y: EarthquakeA11y): boolean {
  return a11y.disableEarthquakeEffects || a11y.reduceMotion;
}

function gridCenter(layout: GridLayout): { x: number; y: number } {
  const xs = layout.tiles.map((t) => t.x);
  const ys = layout.tiles.map((t) => t.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

/** Draw crack lines radiating from center, alpha-fade + destroy. */
function drawCracks(
  scene: Phaser.Scene,
  center: { x: number; y: number },
  radius: number,
  thickness: number,
  crackCount: number
): void {
  const g = scene.add.graphics();
  g.lineStyle(thickness, 0x444444, 0.7);

  for (let i = 0; i < crackCount; i++) {
    const angle = (Math.PI * 2 * i) / crackCount + (Math.random() - 0.5) * 0.4;
    const len = radius * (0.5 + Math.random() * 0.5);
    g.moveTo(center.x, center.y);
    g.lineTo(
      center.x + Math.cos(angle) * len,
      center.y + Math.sin(angle) * len
    );
  }
  g.strokePath();

  // Fade out then destroy
  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration: 800,
    delay: 300,
    onComplete: () => g.destroy(),
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Warning: dust particles + mild tile jitter (±2px yoyo). */
export function playEarthquakeWarning(
  scene: Phaser.Scene,
  tiles: TileMap,
  layout: GridLayout,
  a11y: EarthquakeA11y
): void {
  if (shouldSkip(a11y)) return;

  const center = gridCenter(layout);
  playDebrisParticles(scene, center.x, center.y, {
    reduceMotion: false,
    isLowEnd: a11y.isLowEnd,
  });

  // Mild tile jitter
  tiles.forEach((tile) => {
    scene.tweens.add({
      targets: tile,
      x: tile.x + (Math.random() - 0.5) * 4,
      duration: 80,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    });
  });
}

/** Shaking: debris + random tile displacement + crack lines. */
export function playEarthquakeShake(
  scene: Phaser.Scene,
  tiles: TileMap,
  layout: GridLayout,
  a11y: EarthquakeA11y
): void {
  if (shouldSkip(a11y)) return;

  const center = gridCenter(layout);
  playDebrisParticles(scene, center.x, center.y, {
    reduceMotion: false,
    isLowEnd: a11y.isLowEnd,
  });

  // Crack lines from center
  drawCracks(scene, center, layout.tileSize * 1.5, 2, 5);

  // Random tile displacement (±6px, spring-back)
  tiles.forEach((tile) => {
    const dx = (Math.random() - 0.5) * 12;
    const dy = (Math.random() - 0.5) * 12;
    scene.tweens.add({
      targets: tile,
      x: tile.x + dx,
      y: tile.y + dy,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  });
}

/** Fire-round transition: camera flash + thick cracks + intense debris. */
export function playFireRoundTransition(
  scene: Phaser.Scene,
  tiles: TileMap,
  layout: GridLayout,
  a11y: EarthquakeA11y
): void {
  if (shouldSkip(a11y)) return;

  const center = gridCenter(layout);

  // Orange camera flash
  cameraFlash(scene.cameras.main, 0xff6b35, 400, false);

  // Intense debris
  playDebrisParticles(scene, center.x, center.y, {
    reduceMotion: false,
    isLowEnd: a11y.isLowEnd,
  });

  // Thick cracks across full grid
  drawCracks(scene, center, layout.tileSize * 2.5, 3, 8);

  // Dramatic tile displacement
  tiles.forEach((tile) => {
    const dx = (Math.random() - 0.5) * 16;
    const dy = (Math.random() - 0.5) * 16;
    scene.tweens.add({
      targets: tile,
      x: tile.x + dx,
      y: tile.y + dy,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  });
}
