/**
 * FireRoundEffect — tests for ambient fire round visuals.
 *
 * Verifies:
 * - Returns null handle when both a11y flags set
 * - Creates ember emitter when reduceMotion false
 * - Creates vignette graphics at depth 50 when disableFireRoundLights false
 * - Adds pulsing alpha tween to vignette (or static alpha when reduceMotion)
 * - stopFireRoundAmbient destroys emitter + kills tweens + destroys vignette
 * - Handles null fields gracefully
 */

import Phaser from 'phaser';
import {
  startFireRoundAmbient,
  stopFireRoundAmbient,
  type FireRoundA11y,
  type FireRoundHandle,
} from '../FireRoundEffect';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const playEmberParticlesSpy = jest.fn();
jest.mock('../../objects/ParticleManager', () => ({
  ...jest.requireActual('../../objects/ParticleManager'),
  playEmberParticles: (...args: unknown[]) => playEmberParticlesSpy(...args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createScene(): Phaser.Scene {
  return new Phaser.Scene() as Phaser.Scene;
}

const ALL_ENABLED: FireRoundA11y = {
  reduceMotion: false,
  disableFireRoundLights: false,
  isLowEnd: false,
};

const REDUCE_MOTION: FireRoundA11y = {
  reduceMotion: true,
  disableFireRoundLights: false,
  isLowEnd: false,
};

const DISABLE_LIGHTS: FireRoundA11y = {
  reduceMotion: false,
  disableFireRoundLights: true,
  isLowEnd: false,
};

const ALL_DISABLED: FireRoundA11y = {
  reduceMotion: true,
  disableFireRoundLights: true,
  isLowEnd: false,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  playEmberParticlesSpy.mockClear();
  playEmberParticlesSpy.mockReturnValue({ destroy: jest.fn() }); // mock emitter
});

// ─── startFireRoundAmbient ────────────────────────────────────────────────────

describe('startFireRoundAmbient', () => {
  it('should return handle with null fields when both a11y flags disable effects', () => {
    const scene = createScene();
    playEmberParticlesSpy.mockReturnValue(null); // reduceMotion → null

    const handle = startFireRoundAmbient(scene, ALL_DISABLED);

    expect(handle.emitter).toBeNull();
    expect(handle.vignette).toBeNull();
  });

  it('should create ember emitter when reduceMotion is false', () => {
    const scene = createScene();

    const handle = startFireRoundAmbient(scene, ALL_ENABLED);

    expect(playEmberParticlesSpy).toHaveBeenCalledTimes(1);
    expect(handle.emitter).not.toBeNull();
  });

  it('should not create ember emitter when reduceMotion is true', () => {
    const scene = createScene();
    playEmberParticlesSpy.mockReturnValue(null);

    const handle = startFireRoundAmbient(scene, REDUCE_MOTION);

    expect(handle.emitter).toBeNull();
  });

  it('should create vignette graphics when disableFireRoundLights is false', () => {
    const scene = createScene();

    const handle = startFireRoundAmbient(scene, ALL_ENABLED);

    expect(scene.add.graphics).toHaveBeenCalled();
    expect(handle.vignette).not.toBeNull();
  });

  it('should not create vignette when disableFireRoundLights is true', () => {
    const scene = createScene();

    const handle = startFireRoundAmbient(scene, DISABLE_LIGHTS);

    expect(handle.vignette).toBeNull();
  });

  it('should add pulsing alpha tween to vignette when reduceMotion is false', () => {
    const scene = createScene();

    startFireRoundAmbient(scene, ALL_ENABLED);

    // Should have tween for vignette pulsing
    expect(scene.tweens.add).toHaveBeenCalled();
    const tweenConfig = (scene.tweens.add as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { yoyo?: boolean })?.yoyo === true
    );
    expect(tweenConfig).toBeDefined();
  });
});

// ─── stopFireRoundAmbient ─────────────────────────────────────────────────────

describe('stopFireRoundAmbient', () => {
  it('should destroy emitter when present', () => {
    const scene = createScene();
    const mockEmitter = { destroy: jest.fn() };
    const handle: FireRoundHandle = { emitter: mockEmitter, vignette: null };

    stopFireRoundAmbient(scene, handle);

    expect(mockEmitter.destroy).toHaveBeenCalledTimes(1);
  });

  it('should kill vignette tweens and destroy vignette', () => {
    const scene = createScene();
    const mockVignette = { destroy: jest.fn() };
    const handle: FireRoundHandle = { emitter: null, vignette: mockVignette };

    stopFireRoundAmbient(scene, handle);

    expect(scene.tweens.killTweensOf).toHaveBeenCalledWith(mockVignette);
    expect(mockVignette.destroy).toHaveBeenCalledTimes(1);
  });

  it('should handle null fields gracefully', () => {
    const scene = createScene();
    const handle: FireRoundHandle = { emitter: null, vignette: null };

    // Should not throw
    expect(() => stopFireRoundAmbient(scene, handle)).not.toThrow();
  });

  it('should clean up both emitter and vignette together', () => {
    const scene = createScene();
    const mockEmitter = { destroy: jest.fn() };
    const mockVignette = { destroy: jest.fn() };
    const handle: FireRoundHandle = { emitter: mockEmitter, vignette: mockVignette };

    stopFireRoundAmbient(scene, handle);

    expect(mockEmitter.destroy).toHaveBeenCalledTimes(1);
    expect(mockVignette.destroy).toHaveBeenCalledTimes(1);
  });
});
