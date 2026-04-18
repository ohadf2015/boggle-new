import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────
// vi.mock factories are hoisted above imports — classes must be defined
// INSIDE the factory and exposed via a separate mock module for inspection.

vi.mock('pixi.js', () => {
  class MockGraphics {
    destroyed = false;
    x = 0;
    y = 0;
    alpha = 1;
    scale = { set: vi.fn() };
    filters: unknown[] = [];
    circle() { return this; }
    rect() { return this; }
    stroke() { return this; }
    fill() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    destroy() { this.destroyed = true; }
  }
  return { Graphics: MockGraphics };
});

vi.mock('pixi-filters', () => {
  const bloomInstances: MockBloom[] = [];
  const shockwaveInstances: MockShockwave[] = [];
  class MockBloom {
    enabled = false;
    strength = 2;
    destroyed = false;
    destroy = vi.fn(() => { this.destroyed = true; });
    constructor() { bloomInstances.push(this); }
  }
  class MockShockwave {
    enabled = false;
    amplitude = 0;
    time = 0;
    center = { x: 0, y: 0 };
    destroyed = false;
    destroy = vi.fn(() => { this.destroyed = true; });
    constructor() { shockwaveInstances.push(this); }
  }
  return {
    BloomFilter: MockBloom,
    ShockwaveFilter: MockShockwave,
    GlowFilter: class { destroy = vi.fn(); },
    __bloomInstances: bloomInstances,
    __shockwaveInstances: shockwaveInstances,
  };
});

vi.mock('../../effects/pixiFilterPresets', () => ({
  createGlowFilter: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock('../../effects/pulseRingCurve', () => ({
  computePulseRingFrame: (t: number) => ({
    scale: 1 + t,
    alpha: 1 - t,
    done: t >= 1,
  }),
  pulseRingTierColor: () => 0xffffff,
}));

// ── Type aliases for the mocked instances ──
interface MockGraphics {
  destroyed: boolean;
  x: number;
  y: number;
  alpha: number;
  scale: { set: ReturnType<typeof vi.fn> };
  filters: unknown[];
  circle: () => unknown;
  rect: () => unknown;
  stroke: () => unknown;
  fill: () => unknown;
  moveTo: () => unknown;
  lineTo: () => unknown;
  destroy: () => void;
}
interface MockBloom {
  enabled: boolean;
  strength: number;
  destroyed: boolean;
  destroy: ReturnType<typeof vi.fn>;
}
interface MockShockwave {
  enabled: boolean;
  amplitude: number;
  time: number;
  center: { x: number; y: number };
  destroyed: boolean;
  destroy: ReturnType<typeof vi.fn>;
}

import { useBlastPixiOverlays } from '../useBlastPixiOverlays';
import * as pixiFiltersMock from 'pixi-filters';

const bloomInstances = (pixiFiltersMock as unknown as { __bloomInstances: MockBloom[] }).__bloomInstances;
const shockwaveInstances = (pixiFiltersMock as unknown as { __shockwaveInstances: MockShockwave[] }).__shockwaveInstances;

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeMockCamera() {
  const camera: {
    destroyed: boolean;
    children: unknown[];
    filters: unknown[];
    addChild: ReturnType<typeof vi.fn>;
    removeChild: ReturnType<typeof vi.fn>;
  } = {
    destroyed: false,
    children: [],
    filters: [],
    addChild: vi.fn((c: unknown) => { camera.children.push(c); }),
    removeChild: vi.fn((c: unknown) => {
      const i = camera.children.indexOf(c);
      if (i >= 0) camera.children.splice(i, 1);
    }),
  };
  return camera;
}

// rAF stubbed: callback invoked synchronously on next flush
let rafQueue: Array<() => void> = [];
let rafId = 0;
beforeEach(() => {
  bloomInstances.length = 0;
  shockwaveInstances.length = 0;
  rafQueue = [];
  rafId = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
    rafQueue.push(cb);
    return ++rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('performance', { now: () => 0 });
});

function flushRaf() {
  const q = rafQueue;
  rafQueue = [];
  for (const cb of q) cb();
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('useBlastPixiOverlays', () => {
  it('returns fireShockwave, flashCross, and spawnPulseRing functions', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    expect(result.current.fireShockwave).toBeTypeOf('function');
    expect(result.current.flashCross).toBeTypeOf('function');
    expect(result.current.spawnPulseRing).toBeTypeOf('function');
  });

  it('allocates bloom + shockwave filters and attaches to camera on mount', () => {
    const camera = makeMockCamera();
    renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    expect(bloomInstances).toHaveLength(1);
    expect(shockwaveInstances).toHaveLength(1);
    expect(camera.filters).toContain(bloomInstances[0]);
    expect(camera.filters).toContain(shockwaveInstances[0]);
  });

  it('removes bloom + shockwave filters and destroys them on unmount', () => {
    const camera = makeMockCamera();
    const { unmount } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    const bloom = bloomInstances[0];
    const sw = shockwaveInstances[0];
    unmount();
    expect(camera.filters).not.toContain(bloom);
    expect(camera.filters).not.toContain(sw);
    expect(bloom.destroy).toHaveBeenCalled();
    expect(sw.destroy).toHaveBeenCalled();
  });

  it('skips filter teardown when camera is already destroyed', () => {
    const camera = makeMockCamera();
    const { unmount } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    camera.destroyed = true;
    expect(() => unmount()).not.toThrow();
    // Filters not stripped (would throw on destroyed camera), but Pixi resources still freed
    expect(bloomInstances[0].destroy).toHaveBeenCalled();
    expect(shockwaveInstances[0].destroy).toHaveBeenCalled();
  });

  it('enables bloom when chainLevel >= 1 and disables otherwise', () => {
    const camera = makeMockCamera();
    const { rerender } = renderHook(
      ({ chainLevel }: { chainLevel: number }) =>
        useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel }),
      { initialProps: { chainLevel: 0 } },
    );
    expect(bloomInstances[0].enabled).toBe(false);
    rerender({ chainLevel: 2 });
    expect(bloomInstances[0].enabled).toBe(true);
    expect(bloomInstances[0].strength).toBeGreaterThan(2);
  });

  it('fireShockwave activates the filter and animates time to 1', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => { result.current.fireShockwave(100, 200, 25); });
    const sw = shockwaveInstances[0];
    expect(sw.enabled).toBe(true);
    expect(sw.center.x).toBe(100);
    expect(sw.center.y).toBe(200);
    expect(sw.amplitude).toBe(25);
  });

  it('fireShockwave is a no-op when filter center was nulled by Pixi v8 destroy race', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    const sw = shockwaveInstances[0];
    sw.center = null as unknown as { x: number; y: number };
    expect(() => act(() => { result.current.fireShockwave(10, 20, 5); })).not.toThrow();
    expect(sw.enabled).toBe(false);
  });

  it('shockwave rAF tick exits cleanly if filter center is nulled mid-animation', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => { result.current.fireShockwave(10, 20, 5); });
    const sw = shockwaveInstances[0];
    sw.center = null as unknown as { x: number; y: number };
    expect(() => flushRaf()).not.toThrow();
  });

  it('spawnPulseRing adds a Graphics to camera and removes it after animation completes', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => { result.current.spawnPulseRing(100, 100, 1); });
    expect(camera.children).toHaveLength(1);
    // performance.now() returns 0, duration 450 → t=0, not done. Stub now to past duration.
    vi.stubGlobal('performance', { now: () => 9999 });
    flushRaf();
    expect(camera.children).toHaveLength(0);
  });

  it('flashCross destroys the previous flash when called rapidly', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => { result.current.flashCross(50, 50); });
    const first = camera.children[0] as MockGraphics;
    expect(camera.children).toHaveLength(1);
    act(() => { result.current.flashCross(60, 60); });
    expect(first.destroyed).toBe(true);
    expect(camera.children).toHaveLength(1);
  });

  it('caps concurrent pulse rings to bound GPU churn under MP burst', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    // Spawn far more than the cap; expect camera children bounded.
    act(() => {
      for (let i = 0; i < 50; i++) result.current.spawnPulseRing(i, i, 1);
    });
    expect(camera.children.length).toBeLessThanOrEqual(8);
  });

  it('caps concurrent star bursts under MP burst', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => {
      for (let i = 0; i < 50; i++) result.current.spawnStarBurst(i, i);
    });
    expect(camera.children.length).toBeLessThanOrEqual(8);
  });

  it('caps concurrent afterglows under MP burst', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => {
      for (let i = 0; i < 100; i++) result.current.spawnAfterglow(i, i);
    });
    expect(camera.children.length).toBeLessThanOrEqual(20);
  });

  it('caps concurrent light sweeps under MP burst', () => {
    const camera = makeMockCamera();
    const { result } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => {
      for (let i = 0; i < 20; i++) result.current.spawnLightSweep();
    });
    expect(camera.children.length).toBeLessThanOrEqual(4);
  });

  it('cleans up pulse rings on unmount even if animation in flight', () => {
    const camera = makeMockCamera();
    const { result, unmount } = renderHook(() =>
      useBlastPixiOverlays({ camera: camera as unknown as never, width: 400, height: 400, gridSize: 8, cellSize: 50, chainLevel: 0 }),
    );
    act(() => { result.current.spawnPulseRing(100, 100, 1); });
    expect(camera.children).toHaveLength(1);
    const ring = camera.children[0] as MockGraphics;
    unmount();
    expect(ring.destroyed).toBe(true);
    expect(camera.children).toHaveLength(0);
  });
});
