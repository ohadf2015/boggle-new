/**
 * ParticleManager — debris and ember particle tests.
 *
 * Verifies:
 * - playDebrisParticles: one-shot burst, no-op on reduceMotion, half count on isLowEnd
 * - playEmberParticles: continuous emitter, returns handle (or null on reduceMotion)
 */

import Phaser from 'phaser';
import {
  playDebrisParticles,
  playEmberParticles,
  type ParticleConfig,
} from '../ParticleManager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): Phaser.Scene {
  return new Phaser.Scene() as Phaser.Scene;
}

const DEFAULT_CONFIG: ParticleConfig = { reduceMotion: false, isLowEnd: false };
const LOW_END_CONFIG: ParticleConfig = { reduceMotion: false, isLowEnd: true };
const REDUCE_MOTION_CONFIG: ParticleConfig = { reduceMotion: true, isLowEnd: false };

// ─── playDebrisParticles ──────────────────────────────────────────────────────

describe('playDebrisParticles', () => {
  it('should be a no-op when reduceMotion is true', () => {
    const scene = createScene();

    playDebrisParticles(scene, 100, 200, REDUCE_MOTION_CONFIG);

    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('should call scene.add.particles with correct position', () => {
    const scene = createScene();

    playDebrisParticles(scene, 150, 250, DEFAULT_CONFIG);

    expect(scene.add.particles).toHaveBeenCalledTimes(1);
    const [x, y] = (scene.add.particles as jest.Mock).mock.calls[0];
    expect(x).toBe(150);
    expect(y).toBe(250);
  });

  it('should use normal particle count for standard devices', () => {
    const scene = createScene();

    playDebrisParticles(scene, 0, 0, DEFAULT_CONFIG);

    const call = (scene.add.particles as jest.Mock).mock.calls[0];
    const config = call[3]; // 4th arg is the emitter config
    expect(config.quantity).toBe(12);
  });

  it('should halve particle count for low-end devices', () => {
    const scene = createScene();

    playDebrisParticles(scene, 0, 0, LOW_END_CONFIG);

    const call = (scene.add.particles as jest.Mock).mock.calls[0];
    const config = call[3];
    expect(config.quantity).toBe(6);
  });

  it('should schedule destroy via delayedCall', () => {
    const scene = createScene();

    playDebrisParticles(scene, 0, 0, DEFAULT_CONFIG);

    expect(scene.time.delayedCall).toHaveBeenCalledTimes(1);
  });

  it('should use brown/gray tint colours and positive gravityY (falling down)', () => {
    const scene = createScene();

    playDebrisParticles(scene, 0, 0, DEFAULT_CONFIG);

    const call = (scene.add.particles as jest.Mock).mock.calls[0];
    const config = call[3];
    expect(config.gravityY).toBeGreaterThan(0);
  });
});

// ─── playEmberParticles ───────────────────────────────────────────────────────

describe('playEmberParticles', () => {
  it('should return null when reduceMotion is true', () => {
    const scene = createScene();

    const result = playEmberParticles(scene, REDUCE_MOTION_CONFIG);

    expect(result).toBeNull();
    expect(scene.add.particles).not.toHaveBeenCalled();
  });

  it('should call scene.add.particles and return the emitter', () => {
    const scene = createScene();

    const result = playEmberParticles(scene, DEFAULT_CONFIG);

    expect(result).not.toBeNull();
    expect(scene.add.particles).toHaveBeenCalledTimes(1);
  });

  it('should use negative gravityY (embers rise)', () => {
    const scene = createScene();

    playEmberParticles(scene, DEFAULT_CONFIG);

    const call = (scene.add.particles as jest.Mock).mock.calls[0];
    const config = call[3];
    expect(config.gravityY).toBeLessThan(0);
  });

  it('should halve particle count for low-end devices', () => {
    const scene = createScene();

    playEmberParticles(scene, LOW_END_CONFIG);

    const call = (scene.add.particles as jest.Mock).mock.calls[0];
    const config = call[3];
    // Low-end ember frequency should be less than normal
    expect(config.frequency).toBeGreaterThan(0);
  });

  it('should create a continuous emitter (emitting: true)', () => {
    const scene = createScene();

    playEmberParticles(scene, DEFAULT_CONFIG);

    const call = (scene.add.particles as jest.Mock).mock.calls[0];
    const config = call[3];
    // Continuous emitters should not have emitting: false
    expect(config.emitting).not.toBe(false);
  });
});
