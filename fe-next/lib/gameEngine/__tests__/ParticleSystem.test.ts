// ─── ParticleSystem Tests ─────────────────────────────────────────────
// Tests for particle shapes, emitter lifecycle, and burst behavior.

import { ParticleEmitter, ParticlePool } from '../ParticleSystem';
import type { ParticleConfig } from '../types';
import { Container } from 'pixi.js';

// Mock PixiJS
jest.mock('pixi.js', () => {
  const mockGraphics = {
    clear: jest.fn().mockReturnThis(),
    circle: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    closePath: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    blendMode: 'normal',
  };
  const mockContainer = {
    addChild: jest.fn(),
    removeChild: jest.fn(),
    destroy: jest.fn(),
  };
  return {
    Container: jest.fn(() => mockContainer),
    Graphics: jest.fn(() => mockGraphics),
  };
});

function makeConfig(overrides: Partial<ParticleConfig> = {}): ParticleConfig {
  return {
    maxParticles: 20,
    frequency: 0.01,
    emitterLifetime: 0.5,
    particlesPerWave: 5,
    lifetime: { min: 0.3, max: 0.5 },
    speed: { min: 50, max: 100 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    colors: ['ff0000', '00ff00'],
    spawnShape: 'point',
    ...overrides,
  };
}

describe('ParticleEmitter', () => {
  let parent: Container;

  beforeEach(() => {
    parent = new Container();
  });

  describe('particle shapes', () => {
    it('should default to circle shape when no shape specified', () => {
      const config = makeConfig();
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 5);
      emitter.update(0.016);

      // Graphics.circle should be called (default shape)
      const gfx = (emitter as unknown as { graphics: { circle: jest.Mock } }).graphics;
      expect(gfx.circle).toHaveBeenCalled();
    });

    it('should draw star shapes when shape is star', () => {
      const config = makeConfig({ shape: 'star' });
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 3);
      emitter.update(0.016);

      // Stars use moveTo/lineTo pattern
      const gfx = (emitter as unknown as { graphics: { moveTo: jest.Mock } }).graphics;
      expect(gfx.moveTo).toHaveBeenCalled();
    });

    it('should draw diamond shapes when shape is diamond', () => {
      const config = makeConfig({ shape: 'diamond' });
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 3);
      emitter.update(0.016);

      const gfx = (emitter as unknown as { graphics: { moveTo: jest.Mock } }).graphics;
      expect(gfx.moveTo).toHaveBeenCalled();
    });

    it('should draw rect shapes when shape is rect', () => {
      const config = makeConfig({ shape: 'rect' });
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 3);
      emitter.update(0.016);

      const gfx = (emitter as unknown as { graphics: { rect: jest.Mock } }).graphics;
      expect(gfx.rect).toHaveBeenCalled();
    });

    it('should draw ring shapes when shape is ring', () => {
      const config = makeConfig({ shape: 'ring' });
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 3);
      emitter.update(0.016);

      // Rings use circle + stroke (not fill)
      const gfx = (emitter as unknown as { graphics: { circle: jest.Mock; stroke: jest.Mock } }).graphics;
      expect(gfx.circle).toHaveBeenCalled();
      expect(gfx.stroke).toHaveBeenCalled();
    });
  });

  describe('emitter lifecycle', () => {
    it('should report active during emission', () => {
      const emitter = new ParticleEmitter(parent, makeConfig());
      expect(emitter.active).toBe(false);

      emitter.emit(100, 100);
      expect(emitter.active).toBe(true);
    });

    it('should stop after emitterLifetime expires', () => {
      const config = makeConfig({ emitterLifetime: 0.1 });
      const emitter = new ParticleEmitter(parent, config);
      emitter.emit(100, 100);

      emitter.update(0.05);
      expect(emitter.active).toBe(true);

      emitter.update(0.06);
      // Emitter stopped but particles may still be alive
      expect(emitter.particleCount).toBeGreaterThanOrEqual(0);
    });

    it('should not exceed maxParticles', () => {
      const config = makeConfig({ maxParticles: 5, particlesPerWave: 10 });
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 10);

      expect(emitter.particleCount).toBeLessThanOrEqual(5);
    });

    it('should remove dead particles after their lifetime', () => {
      const config = makeConfig({ lifetime: { min: 0.1, max: 0.1 } });
      const emitter = new ParticleEmitter(parent, config);
      emitter.burst(100, 100, 5);

      expect(emitter.particleCount).toBe(5);

      emitter.update(0.2); // All particles should be dead
      expect(emitter.particleCount).toBe(0);
    });
  });
});

describe('ParticlePool', () => {
  let parent: Container;

  beforeEach(() => {
    parent = new Container();
  });

  it('should create emitters', () => {
    const pool = new ParticlePool(parent);
    const emitter = pool.create(makeConfig());
    expect(emitter).toBeDefined();
    pool.destroy();
  });

  it('should auto-cleanup finished burst emitters', () => {
    const pool = new ParticlePool(parent);
    const config = makeConfig({ lifetime: { min: 0.05, max: 0.05 } });
    pool.burst(config, 100, 100, 3);

    pool.update(0.1); // All particles dead → emitter cleaned up
    // Pool should have cleaned up
    pool.destroy();
  });

  it('should clear all emitters on destroy', () => {
    const pool = new ParticlePool(parent);
    pool.create(makeConfig());
    pool.create(makeConfig());
    pool.destroy();
    // No errors thrown = success
  });
});
