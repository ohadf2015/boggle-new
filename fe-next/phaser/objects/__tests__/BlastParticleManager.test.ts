/**
 * BlastParticleManager — unique particles per blast special tile type.
 *
 * Verifies:
 * - Each effect method creates particles via scene.add.particles
 * - reduceMotion skips all particles
 * - isLowEnd still creates particles (just fewer)
 *
 * RED phase: tests fail until implementation exists.
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

// ─── Bomb explosion ───────────────────────────────────────────────────────────

describe('BlastParticleManager.playBombExplosion', () => {
  it('creates particles via scene.add.particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombExplosion(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips particles when reduceMotion is true', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombExplosion(scene, 100, 100, reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('creates particles when isLowEnd (just fewer)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playBombExplosion(scene, 100, 100, lowEndConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Lightning strike ─────────────────────────────────────────────────────────

describe('BlastParticleManager.playLightningStrike', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningStrike(scene, 100, 100, 360, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips when reduceMotion', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playLightningStrike(scene, 100, 100, 360, reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
  });
});

// ─── Ice shatter ──────────────────────────────────────────────────────────────

describe('BlastParticleManager.playIceShatter', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShatter(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips when reduceMotion', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playIceShatter(scene, 100, 100, reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
  });
});

// ─── Prism detonation ─────────────────────────────────────────────────────────

describe('BlastParticleManager.playPrismDetonation', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playPrismDetonation(scene, 100, 100, 360, 360, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips when reduceMotion', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playPrismDetonation(scene, 100, 100, 360, 360, reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
  });
});

// ─── Gem collect ──────────────────────────────────────────────────────────────

describe('BlastParticleManager.playGemCollect', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGemCollect(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Word clear burst ─────────────────────────────────────────────────────────

describe('BlastParticleManager.playWordClearBurst', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playWordClearBurst(scene, 100, 100, 0xffe135, 2, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });

  it('skips when reduceMotion', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playWordClearBurst(scene, 100, 100, 0xffe135, 2, reduceMotionConfig);
    expect(scene.add.particles).not.toHaveBeenCalled();
  });
});

// ─── Magnet pull ──────────────────────────────────────────────────────────────

describe('BlastParticleManager.playMagnetPull', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    const targets = [{ x: 50, y: 50 }, { x: 150, y: 150 }];
    manager.playMagnetPull(scene, 100, 100, targets, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Gold sparkle ─────────────────────────────────────────────────────────────

describe('BlastParticleManager.playGoldSparkle', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playGoldSparkle(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });
});

// ─── Cascade explosion ────────────────────────────────────────────────────────

describe('BlastParticleManager.playCascadeExplosion', () => {
  it('creates particles', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();
    manager.playCascadeExplosion(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });
});
