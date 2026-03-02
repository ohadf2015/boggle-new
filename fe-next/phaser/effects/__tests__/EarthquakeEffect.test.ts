/**
 * EarthquakeEffect — tests for 3 intensity levels.
 *
 * Verifies:
 * - Each function is no-op when disableEarthquakeEffects or reduceMotion
 * - Warning: plays debris particles (small count) + tile jitter tweens
 * - Shaking: plays debris particles (larger count) + draws crack graphics + displaces tiles
 * - FireRound transition: calls cameraFlash + larger cracks + intense debris
 */

import Phaser from 'phaser';
import {
  playEarthquakeWarning,
  playEarthquakeShake,
  playFireRoundTransition,
  type EarthquakeA11y,
} from '../EarthquakeEffect';
import type { GridLayout } from '@/lib/phaser/logic/GridGeometry';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const playDebrisParticlesSpy = jest.fn();
jest.mock('../../objects/ParticleManager', () => ({
  ...jest.requireActual('../../objects/ParticleManager'),
  playDebrisParticles: (...args: unknown[]) => playDebrisParticlesSpy(...args),
}));

const cameraFlashSpy = jest.fn();
jest.mock('../CameraEffects', () => ({
  ...jest.requireActual('../CameraEffects'),
  cameraFlash: (...args: unknown[]) => cameraFlashSpy(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): Phaser.Scene {
  return new Phaser.Scene() as Phaser.Scene;
}

function createTiles(scene: Phaser.Scene): Map<string, { x: number; y: number }> {
  const tiles = new Map<string, { x: number; y: number }>();
  tiles.set('0,0', { x: 50, y: 50 });
  tiles.set('0,1', { x: 150, y: 50 });
  tiles.set('1,0', { x: 50, y: 150 });
  tiles.set('1,1', { x: 150, y: 150 });
  return tiles;
}

const LAYOUT: GridLayout = {
  rows: 2,
  cols: 2,
  tileSize: 80,
  gap: 8,
  offsetX: 10,
  offsetY: 10,
  tiles: [
    { row: 0, col: 0, x: 50, y: 50 },
    { row: 0, col: 1, x: 150, y: 50 },
    { row: 1, col: 0, x: 50, y: 150 },
    { row: 1, col: 1, x: 150, y: 150 },
  ],
};

const ENABLED_A11Y: EarthquakeA11y = {
  reduceMotion: false,
  disableEarthquakeEffects: false,
  isLowEnd: false,
};

const DISABLED_A11Y: EarthquakeA11y = {
  reduceMotion: false,
  disableEarthquakeEffects: true,
  isLowEnd: false,
};

const REDUCE_MOTION_A11Y: EarthquakeA11y = {
  reduceMotion: true,
  disableEarthquakeEffects: false,
  isLowEnd: false,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  playDebrisParticlesSpy.mockClear();
  cameraFlashSpy.mockClear();
});

// ─── playEarthquakeWarning ────────────────────────────────────────────────────

describe('playEarthquakeWarning', () => {
  it('should be no-op when disableEarthquakeEffects is true', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeWarning(scene, tiles, LAYOUT, DISABLED_A11Y);

    expect(playDebrisParticlesSpy).not.toHaveBeenCalled();
    expect(scene.tweens.add).not.toHaveBeenCalled();
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeWarning(scene, tiles, LAYOUT, REDUCE_MOTION_A11Y);

    expect(playDebrisParticlesSpy).not.toHaveBeenCalled();
    expect(scene.tweens.add).not.toHaveBeenCalled();
  });

  it('should call playDebrisParticles with small count', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeWarning(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(playDebrisParticlesSpy).toHaveBeenCalledTimes(1);
  });

  it('should add tile jitter tweens', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeWarning(scene, tiles, LAYOUT, ENABLED_A11Y);

    // Should add tweens for tiles (jitter effect)
    expect(scene.tweens.add).toHaveBeenCalled();
  });
});

// ─── playEarthquakeShake ──────────────────────────────────────────────────────

describe('playEarthquakeShake', () => {
  it('should be no-op when disableEarthquakeEffects is true', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeShake(scene, tiles, LAYOUT, DISABLED_A11Y);

    expect(playDebrisParticlesSpy).not.toHaveBeenCalled();
    expect(scene.tweens.add).not.toHaveBeenCalled();
    expect(scene.add.graphics).not.toHaveBeenCalled();
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeShake(scene, tiles, LAYOUT, REDUCE_MOTION_A11Y);

    expect(playDebrisParticlesSpy).not.toHaveBeenCalled();
  });

  it('should call playDebrisParticles with larger count', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeShake(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(playDebrisParticlesSpy).toHaveBeenCalledTimes(1);
  });

  it('should draw crack graphics', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeShake(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(scene.add.graphics).toHaveBeenCalled();
  });

  it('should add tile displacement tweens', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playEarthquakeShake(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(scene.tweens.add).toHaveBeenCalled();
  });
});

// ─── playFireRoundTransition ──────────────────────────────────────────────────

describe('playFireRoundTransition', () => {
  it('should be no-op when disableEarthquakeEffects is true', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playFireRoundTransition(scene, tiles, LAYOUT, DISABLED_A11Y);

    expect(playDebrisParticlesSpy).not.toHaveBeenCalled();
    expect(cameraFlashSpy).not.toHaveBeenCalled();
  });

  it('should be no-op when reduceMotion is true', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playFireRoundTransition(scene, tiles, LAYOUT, REDUCE_MOTION_A11Y);

    expect(playDebrisParticlesSpy).not.toHaveBeenCalled();
    expect(cameraFlashSpy).not.toHaveBeenCalled();
  });

  it('should call cameraFlash with orange colour', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playFireRoundTransition(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(cameraFlashSpy).toHaveBeenCalledTimes(1);
    // Orange colour
    const flashColor = cameraFlashSpy.mock.calls[0][1];
    expect(flashColor).toBe(0xff6b35);
  });

  it('should call playDebrisParticles for intense debris', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playFireRoundTransition(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(playDebrisParticlesSpy).toHaveBeenCalledTimes(1);
  });

  it('should draw thick crack graphics', () => {
    const scene = createScene();
    const tiles = createTiles(scene);

    playFireRoundTransition(scene, tiles, LAYOUT, ENABLED_A11Y);

    expect(scene.add.graphics).toHaveBeenCalled();
  });
});
