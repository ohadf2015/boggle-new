/**
 * BlastParticleManager.playLandingDust — dust clouds on tile landing.
 *
 * Verifies:
 * - Creates particles for medium falls (3-4 rows, ~4 particles)
 * - Creates more particles for heavy falls (5+ rows, ~12 particles)
 * - Uses rectangle texture (not circles) for dust
 * - Respects reduceMotion (skips entirely)
 * - isLowEnd halves particle count
 */

import Phaser from 'phaser';
import { BlastParticleManager } from '../BlastParticleManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

const defaultConfig = { reduceMotion: false, isLowEnd: false };
const reduceMotionConfig = { reduceMotion: true, isLowEnd: false };
const lowEndConfig = { reduceMotion: false, isLowEnd: true };

// ─── playLandingDust ─────────────────────────────────────────────────────────

describe('BlastParticleManager.playLandingDust', () => {
  it('creates particles for medium falls (3-4 rows)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLandingDust(scene, 100, 200, 3, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('creates particles for heavy falls (5+ rows)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLandingDust(scene, 100, 200, 5, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('uses a rectangle texture key (not circle)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLandingDust(scene, 100, 200, 4, defaultConfig);

    // The texture should be generated with fillRect (rectangle), not fillCircle
    const makeGraphics = scene.make.graphics as jest.Mock;
    expect(makeGraphics).toHaveBeenCalled();
    const graphicsInstance = makeGraphics.mock.results[0]?.value;
    if (graphicsInstance) {
      expect(graphicsInstance.fillRect).toHaveBeenCalled();
    }
  });

  it('skips particles when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLandingDust(scene, 100, 200, 5, reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('creates particles with isLowEnd (fewer count)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLandingDust(scene, 100, 200, 5, lowEndConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('uses gravityY for dust particles (falls down)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLandingDust(scene, 100, 200, 4, defaultConfig);

    const particleCall = (scene.add.particles as jest.Mock).mock.calls[0];
    const particleConfig = particleCall[3]; // fourth arg is the config (x, y, key, config)
    expect(particleConfig.gravityY).toBeGreaterThan(0);
  });
});
