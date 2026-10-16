import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const created = vi.hoisted(() => ({ apps: 0, failInit: false }));

vi.mock('pixi.js', () => {
  class MockGraphics {
    circle = vi.fn().mockReturnThis();
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }
  class MockContainer {
    children: unknown[] = [];
    destroyed = false;
    addChild = vi.fn((c: unknown) => {
      this.children.push(c);
    });
    removeChild = vi.fn((c: unknown) => {
      this.children = this.children.filter((x) => x !== c);
    });
    destroy = vi.fn(() => {
      this.destroyed = true;
    });
  }
  class MockTicker {
    listeners: Array<(t: { deltaMS: number }) => void> = [];
    started = true;
    add = vi.fn((fn: (t: { deltaMS: number }) => void) => {
      this.listeners.push(fn);
    });
    remove = vi.fn((fn: (t: { deltaMS: number }) => void) => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    });
    start = vi.fn(() => {
      this.started = true;
    });
    stop = vi.fn(() => {
      this.started = false;
    });
    tick(deltaMS = 16) {
      this.listeners.forEach((l) => l({ deltaMS }));
    }
  }
  class MockApplication {
    stage = new MockContainer();
    ticker = new MockTicker();
    canvas: HTMLCanvasElement = document.createElement('canvas');
    init = vi.fn(() => (created.failInit ? Promise.reject(new Error('no GPU')) : Promise.resolve(undefined)));
    destroy = vi.fn();
    constructor() {
      created.apps++;
    }
  }
  class MockParticleContainer {
    addParticle = vi.fn();
    removeParticle = vi.fn();
    update = vi.fn();
    destroy = vi.fn();
  }
  return {
    Application: MockApplication,
    Container: MockContainer,
    Graphics: MockGraphics,
    ParticleContainer: MockParticleContainer,
    Particle: class {},
    Texture: { WHITE: {}, from: vi.fn(() => ({})) },
  };
});

import { SharedFxApp } from '../SharedFxApp';
import { attachFxLayer as attachRaw, type FxLayer } from '../fxLayers';
import { holdFxUntilFirstUse, resetFxGateForTests } from '../SharedFxGate';

interface MockApp {
  stage: { children: Array<{ destroyed: boolean }> };
  ticker: { started: boolean; tick: (d?: number) => void };
  destroy: ReturnType<typeof vi.fn>;
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};

const detaches: Array<() => void> = [];
const attachFxLayer: typeof attachRaw = (build, onUnavailable) => {
  const detach = attachRaw(build, onUnavailable);
  detaches.push(detach);
  return detach;
};

const appNow = () => SharedFxApp.getApplication() as unknown as MockApp;

function layerFor(frames: number) {
  let left = frames;
  const layer: FxLayer & { updates: number; destroyed: boolean } = {
    updates: 0,
    destroyed: false,
    update() {
      layer.updates++;
      left--;
      return left > 0;
    },
    destroy() {
      layer.destroyed = true;
    },
  };
  return layer;
}

describe('attachFxLayer', () => {
  beforeAll(async () => {
    await import('pixi.js');
    await import('../../gameEngine/ParticleSystem');
  });

  beforeEach(() => {
    created.apps = 0;
    created.failInit = false;
  });

  afterEach(async () => {
    await flush();
    detaches.splice(0).forEach((d) => d());
    SharedFxApp.unmount();
    await flush();
    resetFxGateForTests();
  });

  it('mounts the shared app on demand and runs the layer on its ticker', async () => {
    const layer = layerFor(3);
    attachFxLayer(() => layer);
    await flush();

    const app = appNow();
    expect(app).not.toBeNull();
    expect(app.stage.children).toHaveLength(1);
    expect(app.ticker.started).toBe(true);

    app.ticker.tick(16);
    expect(layer.updates).toBe(1);
  });

  it('opens a held first-use gate instead of waiting for a click', async () => {
    holdFxUntilFirstUse();
    attachFxLayer(() => layerFor(5));
    await flush();
    expect(SharedFxApp.isInitialized()).toBe(true);
  });

  it('stops the ticker and releases the GPU context once the layer drains', async () => {
    const layer = layerFor(2);
    attachFxLayer(() => layer);
    await flush();
    const app = appNow();
    const container = app.stage.children[0];

    app.ticker.tick(16);
    app.ticker.tick(16);

    expect(layer.destroyed).toBe(true);
    expect(container.destroyed).toBe(true);
    expect(app.ticker.started).toBe(false);
    expect(app.destroy).not.toHaveBeenCalled();

    await flush();
    expect(app.destroy).toHaveBeenCalled();
    expect(SharedFxApp.isInitialized()).toBe(false);
  });

  it('detaching before the mount settles leaves no app and builds nothing', async () => {
    const build = vi.fn(() => layerFor(5));
    const detach = attachFxLayer(build);
    detach();
    await flush();

    expect(build).not.toHaveBeenCalled();
    expect(SharedFxApp.isInitialized()).toBe(false);
  });

  it('shares one Application between layers and the root mount', async () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    await SharedFxApp.mount(parent);
    attachFxLayer(() => layerFor(5));
    attachFxLayer(() => layerFor(5));
    await flush();

    expect(created.apps).toBe(1);
    expect(appNow().stage.children).toHaveLength(2);
    parent.remove();
  });

  it('keeps the root mount alive after its layers drain', async () => {
    await SharedFxApp.mount(document.body);
    attachFxLayer(() => layerFor(1));
    await flush();
    appNow().ticker.tick(16);

    expect(SharedFxApp.isInitialized()).toBe(true);
  });

  it('keeps a running layer alive when the root unmounts, then releases', async () => {
    await SharedFxApp.mount(document.body);
    const layer = layerFor(2);
    attachFxLayer(() => layer);
    await flush();
    const app = appNow();

    SharedFxApp.unmount();
    expect(SharedFxApp.isInitialized()).toBe(true);

    app.ticker.tick(16);
    app.ticker.tick(16);
    expect(layer.updates).toBe(2);
    await flush();
    expect(SharedFxApp.isInitialized()).toBe(false);
  });

  it('does not enable root spawns on an app only a layer is holding', async () => {
    attachFxLayer(() => layerFor(50));
    await flush();

    SharedFxApp.spawnFirework({ x: 1, y: 1, color: 0xffffff, size: 10 });
    expect(SharedFxApp.getActiveFireworkCount()).toBe(0);
  });

  it('applies the root device config even when a layer mounted first', async () => {
    attachFxLayer(() => layerFor(50));
    await flush();
    await SharedFxApp.mount(document.body, { maxParticles: 7 });

    expect(SharedFxApp.getDeviceConfig()?.maxParticles).toBe(7);
  });

  it('survives a StrictMode attach → detach → attach with one app and one layer', async () => {
    const first = layerFor(5);
    const second = layerFor(5);
    const detach = attachFxLayer(() => first);
    detach();
    attachFxLayer(() => second);
    await flush();

    expect(created.apps).toBe(1);
    expect(appNow().stage.children).toHaveLength(1);
    appNow().ticker.tick(16);
    expect(first.updates).toBe(0);
    expect(second.updates).toBe(1);
  });

  it('a manual detach destroys the layer and is idempotent', async () => {
    const layer = layerFor(50);
    const detach = attachFxLayer(() => layer);
    await flush();
    detach();
    detach();

    expect(layer.destroyed).toBe(true);
    expect(SharedFxApp.isInitialized()).toBe(false);
  });

  it('given the GPU init fails, then the caller is told the layer is unavailable', async () => {
    created.failInit = true;
    const onUnavailable = vi.fn();
    const build = vi.fn(() => layerFor(3));
    attachFxLayer(build, onUnavailable);
    await flush();

    expect(build).not.toHaveBeenCalled();
    expect(onUnavailable).toHaveBeenCalledOnce();
  });

  it('given the shared app mounts, then the unavailable callback never fires', async () => {
    const onUnavailable = vi.fn();
    attachFxLayer(() => layerFor(3), onUnavailable);
    await flush();

    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it('a layer whose build throws is dropped without breaking the app', async () => {
    await SharedFxApp.mount(document.body);
    const onUnavailable = vi.fn();
    attachFxLayer(() => {
      throw new Error('boom');
    }, onUnavailable);
    await flush();

    expect(onUnavailable).toHaveBeenCalledOnce();

    expect(appNow().stage.children.every((c) => c.destroyed)).toBe(true);
    expect(SharedFxApp.isInitialized()).toBe(true);
  });
});

describe('fxLayers — first-load weight guard', () => {
  it('loads SharedFxApp and pixi.js lazily, so importing a layer site adds neither to its route', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(process.cwd(), 'lib/pixiFx/fxLayers.ts'), 'utf8');
    expect(src).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+['"](\.\/SharedFxApp|pixi\.js)['"]/m);
    expect(src).toMatch(/import\(['"]\.\/SharedFxApp['"]\)/);
  });
});
