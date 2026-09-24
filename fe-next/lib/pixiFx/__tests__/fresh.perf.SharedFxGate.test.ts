// Piece D (perf), SPEC section 10 item 1: pixi.js must not load on first paint.
//
// SharedFxMount still calls SharedFxApp.mount() right after hydration (its
// device guards are unchanged), but while the first-use gate is held, mount()
// waits before importing pixi. The gate opens on the visitor's first
// pointerdown/keydown/touchstart, or on the first spawn* call. A spawn that
// arrives while the mount is waiting is HELD and replayed once the canvas is up,
// never silently dropped.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const pixiLoaded = vi.fn();
vi.mock('pixi.js', () => {
  pixiLoaded();
  class MockContainer {
    addChild = vi.fn();
    removeChild = vi.fn();
  }
  class MockApplication {
    stage = new MockContainer();
    ticker = { add: vi.fn(), remove: vi.fn(), start: vi.fn(), stop: vi.fn() };
    canvas: HTMLCanvasElement = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  }
  class MockGraphics {
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }
  return { Application: MockApplication, Graphics: MockGraphics, Container: MockContainer };
});

const burst = vi.fn();
vi.mock('../../gameEngine/ParticleSystem', () => ({
  ParticlePool: class {
    emitters: unknown[] = [];
    burst = burst;
    update = vi.fn();
    destroy = vi.fn();
  },
}));

import { SharedFxApp } from '../SharedFxApp';
import { holdFxUntilFirstUse, isFxGateHeld, resetFxGateForTests } from '../SharedFxGate';

/** Let dynamic imports + init() microtasks settle. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

describe('SharedFxGate — pixi waits for first use', () => {
  let parent: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    burst.mockClear();
  });

  afterEach(() => {
    SharedFxApp.unmount();
    resetFxGateForTests();
    parent.remove();
  });

  it('shouldNotInitialiseTheFxLayerBeforeFirstUse', async () => {
    // GIVEN the first-load gate is held (essential-providers does this)
    holdFxUntilFirstUse();
    // WHEN SharedFxMount asks for the layer right after hydration
    void SharedFxApp.mount(parent);
    await settle();
    // THEN no GPU layer exists yet: nothing was initialised on first paint
    expect(isFxGateHeld()).toBe(true);
    expect(SharedFxApp.isInitialized()).toBe(false);
    expect(parent.querySelector('canvas')).toBeNull();
  });

  it('shouldMountOnTheFirstPointerdown', async () => {
    holdFxUntilFirstUse();
    const pending = SharedFxApp.mount(parent);
    await settle();
    // WHEN the visitor first touches the page
    window.dispatchEvent(new Event('pointerdown'));
    await pending;
    // THEN the layer comes up
    expect(isFxGateHeld()).toBe(false);
    expect(SharedFxApp.isInitialized()).toBe(true);
    expect(parent.querySelector('canvas')).not.toBeNull();
  });

  it('shouldMountOnTheFirstKeydown', async () => {
    holdFxUntilFirstUse();
    const pending = SharedFxApp.mount(parent);
    window.dispatchEvent(new Event('keydown'));
    await pending;
    expect(SharedFxApp.isInitialized()).toBe(true);
  });

  it('shouldReplayASpawnThatArrivesWhileTheMountWaits', async () => {
    holdFxUntilFirstUse();
    const pending = SharedFxApp.mount(parent, { maxParticles: 20, prefersReducedMotion: false });
    await settle();
    // WHEN an effect fires before any interaction
    SharedFxApp.spawnBurst('celebration', 10, 20);
    // THEN the spawn itself opens the gate
    expect(isFxGateHeld()).toBe(false);
    await pending;
    await settle();
    // AND the held burst is replayed on the live layer (not dropped)
    expect(SharedFxApp.isInitialized()).toBe(true);
    expect(burst).toHaveBeenCalledTimes(1);
    expect(burst.mock.calls[0].slice(1, 3)).toEqual([10, 20]);
  });

  it('shouldStillNoOpASpawnWhenNoMountWasRequested', async () => {
    // GIVEN a device whose guards never request the layer (native / low-end /
    // reduced motion / calm): SharedFxMount never calls mount()
    holdFxUntilFirstUse();
    SharedFxApp.spawnBurst('celebration', 1, 1);
    await settle();
    // THEN the spawn stays a no-op and pixi is never initialised
    expect(SharedFxApp.isInitialized()).toBe(false);
    expect(burst).not.toHaveBeenCalled();
  });

  it('shouldDropHeldSpawnsWhenTheMountIsTornDown', async () => {
    holdFxUntilFirstUse();
    void SharedFxApp.mount(parent);
    await settle();
    SharedFxApp.unmount();
    SharedFxApp.spawnBurst('celebration', 1, 1);
    window.dispatchEvent(new Event('pointerdown'));
    await settle();
    expect(SharedFxApp.isInitialized()).toBe(false);
    expect(burst).not.toHaveBeenCalled();
  });

  it('shouldMountImmediatelyWhenTheGateIsNotHeld', async () => {
    // Client navigations after the gate opened (and every existing caller
    // that never holds it) keep today's eager behaviour.
    await SharedFxApp.mount(parent);
    expect(SharedFxApp.isInitialized()).toBe(true);
  });
});

describe('essential-providers holds the FX gate on first load', () => {
  it('shouldHoldTheGateFromTheGlobalProviderStack', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(process.cwd(), 'app/essential-providers.tsx'), 'utf8');
    expect(src).toMatch(/from ['"]@\/lib\/pixiFx\/SharedFxGate['"]/);
    expect(src).toMatch(/holdFxUntilFirstUse\(\)/);
  });
});
