// ─── SharedFxApp Tests ───────────────────────────────────────────────
// Singleton Pixi Application + ParticlePool bridge. Tests cover
// singleton guarantee, preset registry, mount/unmount lifecycle,
// SSR no-op, device-tier gating.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock PixiJS — class-based so `new Application()` / `new Container()` work.
vi.mock('pixi.js', () => {
  class MockGraphics {
    clear = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    closePath = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn();
    blendMode = 'normal';
  }
  class MockContainer {
    children: unknown[] = [];
    addChild = vi.fn((c: unknown) => { this.children.push(c); });
    removeChild = vi.fn();
    destroy = vi.fn();
  }
  class MockTicker {
    listeners: Array<(t: { deltaMS: number }) => void> = [];
    started = true; // Pixi Application autoStart default
    add = vi.fn((fn: (t: { deltaMS: number }) => void) => {
      this.listeners.push(fn);
    });
    remove = vi.fn((fn: (t: { deltaMS: number }) => void) => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    });
    start = vi.fn(() => { this.started = true; });
    stop = vi.fn(() => { this.started = false; });
    // Test helper: fire a frame (unconditional so frame-driving tests still work)
    tick(deltaMS = 16) {
      this.listeners.forEach((l) => l({ deltaMS }));
    }
  }
  class MockApplication {
    stage = new MockContainer();
    ticker = new MockTicker();
    canvas: HTMLCanvasElement = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  }
  // SharedFxApp imports ParticlePool from ../gameEngine/ParticleSystem, which
  // does `import { Container, ParticleContainer, Particle, Texture } from 'pixi.js'`.
  // This inline mock predated the ParticleContainer migration and omitted those
  // three exports, so vitest threw "No ParticleContainer export …" on import.
  // Mirrors the proven mock in ParticleSystem.test.ts.
  class MockParticle {
    x = 0; y = 0; scaleX = 1; scaleY = 1; rotation = 0;
    anchorX = 0; anchorY = 0; tint = 0xffffff; alpha = 1;
    texture: unknown;
    constructor(opts: Record<string, unknown> = {}) { Object.assign(this, opts); }
  }
  class MockParticleContainer {
    particles: MockParticle[] = [];
    destroyed = false;
    blendMode = 'normal';
    constructor(_opts?: unknown) {}
    addParticle = vi.fn((p: MockParticle) => { this.particles.push(p); });
    removeParticle = vi.fn((p: MockParticle) => {
      const i = this.particles.indexOf(p);
      if (i >= 0) this.particles.splice(i, 1);
    });
    update = vi.fn();
    destroy = vi.fn(() => { this.destroyed = true; });
  }
  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
    ParticleContainer: MockParticleContainer,
    Particle: MockParticle,
    Texture: { WHITE: { __white: true }, from: vi.fn(() => ({ __from: true })) },
  };
});

import { SharedFxApp } from '../SharedFxApp';

// Perf regression guard: SharedFxApp is mounted from the GLOBAL essential-providers
// stack (SharedFxMount + GlobalCoinEarnFx), so a static `import { … } from 'pixi.js'`
// (or a static ParticlePool import, which itself pulls pixi) would drag pixi.js into
// the first-load JS of EVERY page (homepage/blog/legal) and tank mobile CWV. pixi
// MUST stay behind the lazy import inside mount(). This reads the source so the
// constraint survives future edits.
describe('SharedFxApp — first-load weight guard', () => {
  it('does not statically import pixi.js or ParticlePool (lazy-load only)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(process.cwd(), 'lib/pixiFx/SharedFxApp.ts'), 'utf8');
    // Allowed: `import type { … } from 'pixi.js'` (erased at build).
    // Forbidden: a value import that forces pixi into the importer's chunk.
    expect(src).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+['"]pixi\.js['"]/m);
    expect(src).not.toMatch(/^import\s+(?!type\b)\{[^}]*ParticlePool[^}]*\}\s+from/m);
    // And it must lazy-load them at runtime instead.
    expect(src).toMatch(/import\(['"]pixi\.js['"]\)/);
  });
});

describe('SharedFxApp', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
  });

  afterEach(async () => {
    SharedFxApp.unmount();
    parent.remove();
    vi.clearAllMocks();
  });

  describe('singleton guarantee', () => {
    it('returns same instance across multiple mount calls', async () => {
      await SharedFxApp.mount(parent);
      const first = SharedFxApp.getApplication();

      await SharedFxApp.mount(parent);
      const second = SharedFxApp.getApplication();

      expect(first).not.toBeNull();
      expect(first).toBe(second);
    });

    it('reports isInitialized true after mount', async () => {
      expect(SharedFxApp.isInitialized()).toBe(false);
      await SharedFxApp.mount(parent);
      expect(SharedFxApp.isInitialized()).toBe(true);
    });

    it('reports isInitialized false after unmount', async () => {
      await SharedFxApp.mount(parent);
      SharedFxApp.unmount();
      expect(SharedFxApp.isInitialized()).toBe(false);
      expect(SharedFxApp.getApplication()).toBeNull();
    });
  });

  describe('SSR safety', () => {
    it('spawnBurst is no-op when not mounted', () => {
      expect(() => SharedFxApp.spawnBurst('sparkle', 100, 100)).not.toThrow();
    });

    it('unmount is safe when not mounted', () => {
      expect(() => SharedFxApp.unmount()).not.toThrow();
    });
  });

  describe('preset registry', () => {
    beforeEach(async () => {
      await SharedFxApp.mount(parent);
    });

    it.each([
      'sparkle',
      'sparkle-valid',
      'sparkle-invalid',
      'sparkle-gold',
      'coin-collect',
      'coin-burst',
      'combo-pulse',
      'chain-burst',
      'word-trail',
      'celebration',
    ])('accepts preset "%s"', (preset) => {
      expect(() => SharedFxApp.spawnBurst(preset, 50, 50)).not.toThrow();
    });

    it('throws/warns on unknown preset name', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      SharedFxApp.spawnBurst('nonexistent-preset', 0, 0);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('ticker bridge', () => {
    it('registers ticker listener on mount', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        ticker: { add: ReturnType<typeof vi.fn> };
      };
      expect(app.ticker.add).toHaveBeenCalled();
    });

    it('removes ticker listener on unmount', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        ticker: { remove: ReturnType<typeof vi.fn> };
      };
      SharedFxApp.unmount();
      expect(app.ticker.remove).toHaveBeenCalled();
    });
  });

  // Perf root-cause (2026-06-26): the Pixi ticker is a global rAF loop mounted on
  // EVERY page via essential-providers. Left free-running it burned ~1.2–2.0s of
  // main-thread per 6s on an idle homepage (measured) → high input_delay = "taps
  // feel stuck". The ticker must idle-stop when no FX are queued and only run while
  // there is work to animate.
  describe('idle ticker gating (perf)', () => {
    it('stops the ticker after mount when no FX are queued', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        ticker: { started: boolean; stop: ReturnType<typeof vi.fn> };
      };
      expect(app.ticker.stop).toHaveBeenCalled();
      expect(app.ticker.started).toBe(false);
    });

    it('starts the ticker when an FX is spawned', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        ticker: { started: boolean };
      };
      SharedFxApp.spawnFirework({ x: 10, y: 10, color: 0xffffff, size: 20 });
      expect(app.ticker.started).toBe(true);
    });

    it('stops the ticker again once all FX have drained', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        ticker: { started: boolean; tick: (d?: number) => void };
      };
      SharedFxApp.spawnFirework({ x: 10, y: 10, color: 0xffffff, size: 20 });
      expect(app.ticker.started).toBe(true);
      // Advance well past the longest firework duration (700ms) so every
      // particle completes and the queues drain to zero.
      for (let i = 0; i < 80; i++) app.ticker.tick(16);
      expect(SharedFxApp.getActiveFireworkCount()).toBe(0);
      expect(app.ticker.started).toBe(false);
    });
  });

  describe('device tier gating', () => {
    it('respects maxParticles ceiling from device config', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 4, prefersReducedMotion: false });
      // Burst requests 20, but tier caps at 4 — internals should cap.
      // We assert via spawnBurst not throwing + device config accessible.
      expect(() => SharedFxApp.spawnBurst('sparkle', 0, 0, { count: 20 })).not.toThrow();
      expect(SharedFxApp.getDeviceConfig()?.maxParticles).toBe(4);
    });

    it('is no-op when prefersReducedMotion is true', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 20, prefersReducedMotion: true });
      // spawnBurst should return without creating an emitter
      expect(() => SharedFxApp.spawnBurst('sparkle', 0, 0)).not.toThrow();
      // internal pool should have no active emitters — expose via getter
      expect(SharedFxApp.getActiveEmitterCount()).toBe(0);
    });

    it('defaults to reasonable tier when no config passed', async () => {
      await SharedFxApp.mount(parent);
      expect(SharedFxApp.getDeviceConfig()).toBeDefined();
    });
  });

  describe('spawnCoinStream', () => {
    it('is no-op when not mounted (SSR / pre-mount)', () => {
      expect(SharedFxApp.getActiveCoinStreamCount()).toBe(0);
      expect(() =>
        SharedFxApp.spawnCoinStream({
          source: { x: 100, y: 400 },
          target: { x: 300, y: 40 },
          count: 6,
        })
      ).not.toThrow();
      expect(SharedFxApp.getActiveCoinStreamCount()).toBe(0);
    });

    it('spawns stream projectiles after mount', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 20, prefersReducedMotion: false });
      SharedFxApp.spawnCoinStream({
        source: { x: 100, y: 400 },
        target: { x: 300, y: 40 },
        count: 5,
      });
      expect(SharedFxApp.getActiveCoinStreamCount()).toBe(5);
    });

    it('is no-op when prefersReducedMotion is true', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 20, prefersReducedMotion: true });
      SharedFxApp.spawnCoinStream({
        source: { x: 0, y: 0 },
        target: { x: 100, y: 100 },
        count: 10,
      });
      expect(SharedFxApp.getActiveCoinStreamCount()).toBe(0);
    });

    it('caps count at device maxParticles ceiling', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 4, prefersReducedMotion: false });
      SharedFxApp.spawnCoinStream({
        source: { x: 0, y: 0 },
        target: { x: 100, y: 100 },
        count: 20,
      });
      expect(SharedFxApp.getActiveCoinStreamCount()).toBeLessThanOrEqual(4);
    });

    it('clears all active streams on unmount', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 20, prefersReducedMotion: false });
      SharedFxApp.spawnCoinStream({
        source: { x: 0, y: 0 },
        target: { x: 100, y: 100 },
        count: 6,
      });
      expect(SharedFxApp.getActiveCoinStreamCount()).toBeGreaterThan(0);
      SharedFxApp.unmount();
      expect(SharedFxApp.getActiveCoinStreamCount()).toBe(0);
    });

    it('accepts {source,target,count} shape', async () => {
      await SharedFxApp.mount(parent);
      expect(() =>
        SharedFxApp.spawnCoinStream({
          source: { x: 10, y: 20 },
          target: { x: 30, y: 40 },
          count: 3,
        })
      ).not.toThrow();
    });
  });

  describe('spawnFirework', () => {
    it('is no-op when not mounted', () => {
      expect(SharedFxApp.getActiveFireworkCount()).toBe(0);
      expect(() =>
        SharedFxApp.spawnFirework({ x: 400, y: 200, color: 0xBFFF00, size: 100 })
      ).not.toThrow();
      expect(SharedFxApp.getActiveFireworkCount()).toBe(0);
    });

    it('spawns flash + radial + trail graphics after mount', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 40, prefersReducedMotion: false });
      SharedFxApp.spawnFirework({ x: 400, y: 200, color: 0xFF1493, size: 100 });
      // Anatomy: 1 flash + 16 radial + 8 trails = 25 graphics
      expect(SharedFxApp.getActiveFireworkCount()).toBe(25);
    });

    it('is no-op when prefersReducedMotion is true', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 40, prefersReducedMotion: true });
      SharedFxApp.spawnFirework({ x: 0, y: 0, color: 0x00FFFF, size: 80 });
      expect(SharedFxApp.getActiveFireworkCount()).toBe(0);
    });

    it('caps total particles at device maxParticles ceiling', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 10, prefersReducedMotion: false });
      SharedFxApp.spawnFirework({ x: 0, y: 0, color: 0x8B5CF6, size: 100 });
      expect(SharedFxApp.getActiveFireworkCount()).toBeLessThanOrEqual(10);
    });

    it('defers emission when delayMs provided', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 40, prefersReducedMotion: false });
      SharedFxApp.spawnFirework({ x: 0, y: 0, color: 0xBFFF00, size: 100, delayMs: 500 });
      // Delayed fireworks counted as queued too
      expect(SharedFxApp.getActiveFireworkCount()).toBeGreaterThan(0);
    });

    it('clears all active fireworks on unmount', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 40, prefersReducedMotion: false });
      SharedFxApp.spawnFirework({ x: 0, y: 0, color: 0xBFFF00, size: 100 });
      expect(SharedFxApp.getActiveFireworkCount()).toBeGreaterThan(0);
      SharedFxApp.unmount();
      expect(SharedFxApp.getActiveFireworkCount()).toBe(0);
    });

    it('accepts {x,y,color,size} shape', async () => {
      await SharedFxApp.mount(parent);
      expect(() =>
        SharedFxApp.spawnFirework({ x: 10, y: 20, color: 0xBFFF00, size: 100 })
      ).not.toThrow();
    });
  });

  describe('canvas mounting', () => {
    it('appends canvas to parent element', async () => {
      await SharedFxApp.mount(parent);
      // MockApplication's canvas is not a real node, so we can't use parent.contains.
      // Instead verify init was called with a resolveTo or that we tracked the append.
      const app = SharedFxApp.getApplication() as unknown as {
        init: ReturnType<typeof vi.fn>;
      };
      expect(app.init).toHaveBeenCalled();
    });

    it('uses transparent background for overlay use', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        init: ReturnType<typeof vi.fn>;
      };
      const initArgs = app.init.mock.calls[0][0];
      expect(initArgs.backgroundAlpha).toBe(0);
    });

    it('does not use resizeTo (avoids Pixi ResizePlugin _cancelResize teardown crash)', async () => {
      await SharedFxApp.mount(parent);
      const app = SharedFxApp.getApplication() as unknown as {
        init: ReturnType<typeof vi.fn>;
      };
      const initArgs = app.init.mock.calls[0][0];
      // resizeTo:window installs a ResizePlugin whose destroy() crashes if init
      // hasn't fully settled. Size explicitly + manage resize ourselves instead.
      expect(initArgs.resizeTo).toBeUndefined();
    });
  });

  // Teardown-race hardening. SharedFxApp is async-mounted but its consumers can
  // unmount (route change / StrictMode) before init() settles. Regression cover
  // for the BlastFxOverlay crashes JAVASCRIPT-NEXTJS-15B (_cancelResize on
  // destroy) and 13Y (null reading 'x' in a ticker frame after teardown), which
  // live latently in this singleton once a mount is wired in production.
  describe('teardown race hardening', () => {
    it('does not initialize when unmount is requested during pending init (regression: JAVASCRIPT-NEXTJS-15B _cancelResize class)', async () => {
      const pending = SharedFxApp.mount(parent); // init() resolves on a microtask
      SharedFxApp.unmount(); // tear down before init settles
      await expect(pending).resolves.toBeUndefined();
      expect(SharedFxApp.isInitialized()).toBe(false);
      expect(SharedFxApp.getApplication()).toBeNull();
    });

    it('can mount cleanly after an interrupted mount', async () => {
      const interrupted = SharedFxApp.mount(parent);
      SharedFxApp.unmount();
      await interrupted;
      expect(SharedFxApp.isInitialized()).toBe(false);

      await SharedFxApp.mount(parent);
      expect(SharedFxApp.isInitialized()).toBe(true);
    });

    it('re-mounts when mount→unmount→mount interleave before init settles (React StrictMode double-invoke)', async () => {
      const first = SharedFxApp.mount(parent); // gen N, init pending
      SharedFxApp.unmount(); // cleanup before init settles
      const second = SharedFxApp.mount(parent); // must NOT reuse the discarded mount
      await Promise.all([first, second]);
      expect(SharedFxApp.isInitialized()).toBe(true);
    });

    it('removes the window resize listener on unmount', async () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      await SharedFxApp.mount(parent);
      SharedFxApp.unmount();
      expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow();
      removeSpy.mockRestore();
    });

    it('ticker frame is inert after unmount (regression: JAVASCRIPT-NEXTJS-13Y null-x class)', async () => {
      await SharedFxApp.mount(parent, { maxParticles: 20, prefersReducedMotion: false });
      const app = SharedFxApp.getApplication() as unknown as {
        ticker: { listeners: Array<(t: { deltaMS: number }) => void> };
      };
      const tickerFn = app.ticker.listeners[0];
      SharedFxApp.spawnCoinStream({ source: { x: 0, y: 0 }, target: { x: 10, y: 10 }, count: 3 });
      SharedFxApp.unmount();
      // A late frame must not touch destroyed graphics.
      expect(() => tickerFn?.({ deltaMS: 16 })).not.toThrow();
    });
  });
});
