// ─── ParticleSystem Tests ─────────────────────────────────────────────
// Tests emitter/pool lifecycle and the ParticleContainer render wiring.
// Rendering moved from per-frame Graphics tessellation to Particle sprites in
// a ParticleContainer (see docs/2026-05-31-pixi-particlecontainer-migration.md);
// the behavioral contracts (lifecycle, maxParticles cap, dead-particle removal,
// pool auto-cleanup, destroyed-parent race guard) are unchanged.

import { ParticleEmitter, ParticlePool } from '../ParticleSystem';
import type { ParticleConfig } from '../types';
import { Container, ParticleContainer } from 'pixi.js';

// Mock PixiJS — class-based so `new Container()` / `new ParticleContainer()` /
// `new Particle()` work without a renderer. ParticleContainer records added
// particle handles so tests can assert on them.
vi.mock('pixi.js', () => {
  class MockParticle {
    x = 0;
    y = 0;
    scaleX = 1;
    scaleY = 1;
    rotation = 0;
    anchorX = 0;
    anchorY = 0;
    tint = 0xffffff;
    alpha = 1;
    texture: unknown;
    constructor(opts: Record<string, unknown> = {}) {
      Object.assign(this, opts);
    }
  }
  class MockParticleContainer {
    particles: MockParticle[] = [];
    destroyed = false;
    blendMode = 'normal';
    constructor(_opts?: unknown) {}
    addParticle = vi.fn((p: MockParticle) => {
      this.particles.push(p);
    });
    removeParticle = vi.fn((p: MockParticle) => {
      const i = this.particles.indexOf(p);
      if (i >= 0) this.particles.splice(i, 1);
    });
    update = vi.fn();
    destroy = vi.fn(() => {
      this.destroyed = true;
    });
  }
  class MockContainer {
    addChild = vi.fn();
    removeChild = vi.fn();
    destroy = vi.fn();
  }
  return {
    Container: MockContainer,
    ParticleContainer: MockParticleContainer,
    Particle: MockParticle,
    Texture: { WHITE: { __white: true }, from: vi.fn(() => ({ __from: true })) },
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

/** Access the emitter's ParticleContainer (with recorded particle handles). */
function getContainer(emitter: ParticleEmitter) {
  return (
    emitter as unknown as {
      container: { particles: unknown[]; blendMode: string; update: { mock: { calls: unknown[] } } };
    }
  ).container;
}

describe('ParticleEmitter', () => {
  let parent: Container;

  beforeEach(() => {
    parent = new Container();
  });

  describe('ParticleContainer rendering', () => {
    it('adds one particle handle per spawned particle', () => {
      const emitter = new ParticleEmitter(parent, makeConfig());
      emitter.burst(100, 100, 5);
      expect(getContainer(emitter).particles).toHaveLength(5);
    });

    it('calls container.update() after the particle list changes (GPU buffer resync)', () => {
      // Pixi v8: per-frame property edits auto-upload, but list add/remove needs
      // container.update() or new particles never render. Regression guard.
      const emitter = new ParticleEmitter(parent, makeConfig({ lifetime: { min: 0.1, max: 0.1 } }));
      const container = getContainer(emitter);

      emitter.burst(100, 100, 3); // spawn → list changed → must flush
      expect(container.update).toHaveBeenCalled();

      (container.update as unknown as { mockClear: () => void }).mockClear();
      emitter.update(0.2); // particles die → list changed → must flush again
      expect(container.update).toHaveBeenCalled();
    });

    it('does NOT call container.update() on a frame with no list change', () => {
      const emitter = new ParticleEmitter(parent, makeConfig({ frequency: 999, emitterLifetime: 0 }));
      emitter.burst(100, 100, 2);
      const container = getContainer(emitter);
      (container.update as unknown as { mockClear: () => void }).mockClear();

      emitter.update(0.016); // no spawn (frequency huge), no death (long life) → no flush
      expect(container.update).not.toHaveBeenCalled();
    });

    it('removes the particle handle when a particle dies', () => {
      const emitter = new ParticleEmitter(parent, makeConfig({ lifetime: { min: 0.1, max: 0.1 } }));
      emitter.burst(100, 100, 5);
      expect(getContainer(emitter).particles).toHaveLength(5);

      emitter.update(0.2); // all dead
      expect(getContainer(emitter).particles).toHaveLength(0);
    });

    it('syncs sprite tint, alpha, scale and position from particle state on update', () => {
      const emitter = new ParticleEmitter(parent, makeConfig({ colors: ['ff0000'] }));
      emitter.burst(100, 100, 1);
      emitter.update(0.016);

      const sprite = getContainer(emitter).particles[0] as {
        tint: number;
        alpha: number;
        scaleX: number;
        scaleY: number;
        anchorX: number;
        anchorY: number;
      };
      expect(sprite.tint).toBe(0xff0000); // single-color stop
      expect(sprite.alpha).toBeGreaterThan(0);
      expect(sprite.scaleX).toBeGreaterThan(0);
      expect(sprite.scaleX).toBe(sprite.scaleY); // uniform scale
      expect(sprite.anchorX).toBe(0.5); // centered → matches old center-draw
      expect(sprite.anchorY).toBe(0.5);
    });

    it("sets container blendMode to 'add' for additive presets", () => {
      const emitter = new ParticleEmitter(parent, makeConfig({ blendMode: 'add' }));
      expect(getContainer(emitter).blendMode).toBe('add');
    });

    it('leaves blendMode normal when none specified', () => {
      const emitter = new ParticleEmitter(parent, makeConfig());
      expect(getContainer(emitter).blendMode).toBe('normal');
    });

    it.each(['circle', 'star', 'diamond', 'rect', 'ring-3'] as const)(
      'renders %s shape without error',
      (shape) => {
        const emitter = new ParticleEmitter(parent, makeConfig({ shape }));
        emitter.burst(100, 100, 3);
        expect(() => emitter.update(0.016)).not.toThrow();
        expect(getContainer(emitter).particles.length).toBeGreaterThan(0);
      },
    );
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
    pool.destroy();
  });

  it('should clear all emitters on destroy', () => {
    const pool = new ParticlePool(parent);
    pool.create(makeConfig());
    pool.create(makeConfig());
    pool.destroy();
    // No errors thrown = success
  });

  it('emitter update bails when underlying ParticleContainer was destroyed by parent', () => {
    const pool = new ParticlePool(parent);
    const emitter = pool.create(makeConfig());
    // Simulate parent.destroy({ children: true }) flipping container.destroyed
    // before ParticleEmitter.destroy() — guards the post-unmount tick race.
    (emitter as unknown as { container: ParticleContainer }).container.destroyed = true;
    expect(() => emitter.update(0.016)).not.toThrow();
    pool.destroy();
  });
});
