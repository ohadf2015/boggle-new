/**
 * BlastEnhancedEffects — combo scaling + per-type hit-stop tests.
 *
 * Tests:
 * 1. Combo scaling: effects produce more particles at higher combo levels
 * 2. Per-type hit-stop durations from getHitStopDuration
 * 3. Hit-stop skips for reduceMotion
 * 4. Combo multiplier scales particle count and ring size
 *
 * RED phase: tests written before implementation.
 */

import Phaser from 'phaser';
import { BlastParticleManager } from '../BlastParticleManager';
import {
  getHitStopDuration,
  getComboEffectScale,
} from '../BlastEnhancedEffects';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeScene(): Phaser.Scene {
  return new Phaser.Scene();
}

const defaultConfig = { reduceMotion: false, isLowEnd: false };

// ─── Hit-stop durations per tile type ────────────────────────────────────────

describe('getHitStopDuration', () => {
  it('returns 100ms for bomb', () => {
    expect(getHitStopDuration('bomb')).toBe(100);
  });

  it('returns 120ms for prism', () => {
    expect(getHitStopDuration('prism')).toBe(120);
  });

  it('returns 80ms for lightning', () => {
    expect(getHitStopDuration('lightning')).toBe(80);
  });

  it('returns 60ms for gem', () => {
    expect(getHitStopDuration('gem')).toBe(60);
  });

  it('returns 60ms for ice', () => {
    expect(getHitStopDuration('ice')).toBe(60);
  });

  it('returns 80ms for frozen', () => {
    expect(getHitStopDuration('frozen')).toBe(80);
  });

  it('returns 60ms for magnet', () => {
    expect(getHitStopDuration('magnet')).toBe(60);
  });

  it('returns 80ms for gold', () => {
    expect(getHitStopDuration('gold')).toBe(80);
  });

  it('returns 0 for standard (no hit-stop)', () => {
    expect(getHitStopDuration('standard')).toBe(0);
  });

  it('returns 0 for cascade (no hit-stop)', () => {
    expect(getHitStopDuration('cascade')).toBe(0);
  });
});

// ─── Combo effect scale ─────────────────────────────────────────────────────

describe('getComboEffectScale', () => {
  it('returns 1.0 for combo level 0', () => {
    expect(getComboEffectScale(0)).toBe(1.0);
  });

  it('returns 1.0 for combo level 1', () => {
    expect(getComboEffectScale(1)).toBe(1.0);
  });

  it('returns greater than 1.0 for combo level 3+', () => {
    expect(getComboEffectScale(3)).toBeGreaterThan(1.0);
  });

  it('returns greater scale for combo level 5 than 3', () => {
    expect(getComboEffectScale(5)).toBeGreaterThan(getComboEffectScale(3));
  });

  it('returns greater scale for combo level 8 than 5', () => {
    expect(getComboEffectScale(8)).toBeGreaterThan(getComboEffectScale(5));
  });

  it('caps at a reasonable maximum (no more than 2.0)', () => {
    expect(getComboEffectScale(20)).toBeLessThanOrEqual(2.0);
  });

  it('returns 1.0 for combo level 2 (below threshold)', () => {
    expect(getComboEffectScale(2)).toBe(1.0);
  });
});

// ─── Combo-scaled enhanced effects ──────────────────────────────────────────

describe('BlastParticleManager combo-scaled effects', () => {
  it('playBombShockwave creates more particles at combo 5 vs combo 0', () => {
    const scene0 = makeScene();
    const scene5 = makeScene();
    const manager = new BlastParticleManager();

    manager.playBombShockwave(scene0, 100, 100, defaultConfig, 0);
    manager.playBombShockwave(scene5, 100, 100, defaultConfig, 5);

    // Both should create particles, combo 5 creates more
    expect(scene0.add.particles).toHaveBeenCalled();
    expect(scene5.add.particles).toHaveBeenCalled();

    // Verify combo 5 received a higher quantity in the particle config
    const call0 = (scene0.add.particles as jest.Mock).mock.calls[0];
    const call5 = (scene5.add.particles as jest.Mock).mock.calls[0];
    // 4th argument is the config object with quantity
    const qty0 = call0[3].quantity;
    const qty5 = call5[3].quantity;
    expect(qty5).toBeGreaterThan(qty0);
  });

  it('playGoldMidasWave creates more particles at combo 5 vs combo 0', () => {
    const scene0 = makeScene();
    const scene5 = makeScene();
    const manager = new BlastParticleManager();

    manager.playGoldMidasWave(scene0, 100, 100, defaultConfig, 0);
    manager.playGoldMidasWave(scene5, 100, 100, defaultConfig, 5);

    const call0 = (scene0.add.particles as jest.Mock).mock.calls[0];
    const call5 = (scene5.add.particles as jest.Mock).mock.calls[0];
    const qty0 = call0[3].quantity;
    const qty5 = call5[3].quantity;
    expect(qty5).toBeGreaterThan(qty0);
  });

  it('enhanced effects still work with no combo argument (defaults to 0)', () => {
    const scene = makeScene();
    const manager = new BlastParticleManager();

    // Should not throw when combo not passed (backward compatible)
    manager.playBombShockwave(scene, 100, 100, defaultConfig);
    expect(scene.add.particles).toHaveBeenCalled();
  });
});
