import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock('pixi.js', () => {
  class MockGraphics {
    x = 0;
    y = 0;
    rotation = 0;
    alpha = 1;
    destroyed = false;
    visible = true;
    rect() { return this; }
    fill() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    stroke() { return this; }
    setStrokeStyle() { return this; }
    destroy() { this.destroyed = true; }
  }
  class MockContainer {
    children: unknown[] = [];
    destroyed = false;
    addChild(c: unknown) { this.children.push(c); return c; }
    removeChild(c: unknown) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
    }
    destroy() { this.destroyed = true; }
  }
  return { Graphics: MockGraphics, Container: MockContainer };
});

// Stable RAF shim — avoid infinite loops in jsdom
let rafCb: FrameRequestCallback | null = null;
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  rafCb = cb;
  return 1;
});
vi.stubGlobal('cancelAnimationFrame', () => { rafCb = null; });

import { Container, Graphics } from 'pixi.js';
import { PhysicsWorld } from '@/lib/gameEngine/PhysicsWorld';
import { useBlastDebris, safeHexToNum } from '../useBlastDebris';

describe('safeHexToNum', () => {
  it('parses valid #RRGGBB to number', () => {
    expect(safeHexToNum('#FF1493')).toBe(0xff1493);
    expect(safeHexToNum('#000000')).toBe(0x000000);
    expect(safeHexToNum('#ffffff')).toBe(0xffffff);
  });
  it('parses without leading hash', () => {
    expect(safeHexToNum('bfff00')).toBe(0xbfff00);
  });
  it('returns fallback for undefined/null/empty', () => {
    expect(safeHexToNum(undefined)).toBe(0xffffff);
    expect(safeHexToNum('')).toBe(0xffffff);
  });
  it('returns fallback for invalid hex (avoids NaN -> PIXI throw)', () => {
    expect(safeHexToNum('#zzzzzz')).toBe(0xffffff);
    expect(safeHexToNum('not-a-color')).toBe(0xffffff);
  });
  it('clamps negative values to fallback', () => {
    expect(safeHexToNum('#-1')).toBe(0xffffff);
  });
  it('respects custom fallback', () => {
    expect(safeHexToNum(undefined, 0x123456)).toBe(0x123456);
  });
});

describe('useBlastDebris — static walls', () => {
  it('creates floor + left/right wall static bodies on mount', () => {
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 1 } });
    const camera = new Container();

    const { unmount } = renderHook(() =>
      useBlastDebris(40, 8, camera, physics),
    );

    const walls = physics
      .getAllBodyStates()
      .filter(b => b.label === 'wall');

    expect(walls.length).toBeGreaterThanOrEqual(3);

    unmount();
  });

  it('spawnWaveClearBurst spawns debris and pushes it radially', () => {
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 0 } });
    const camera = new Container();

    const { result, unmount } = renderHook(() =>
      useBlastDebris(40, 8, camera, physics),
    );

    expect(typeof result.current.spawnWaveClearBurst).toBe('function');

    const wallCount = physics
      .getAllBodyStates()
      .filter(b => b.label === 'wall').length;
    const before = physics.getAllBodyStates().length - wallCount;

    result.current.spawnWaveClearBurst(160, 160, 120);

    const after = physics.getAllBodyStates().length - wallCount;
    expect(after).toBeGreaterThan(before);

    // Step physics — fragments should have gained non-zero velocity from explosion
    physics.update(16.67);
    const dynamic = physics
      .getAllBodyStates()
      .filter(b => b.label !== 'wall');
    const moving = dynamic.some(
      b => Math.abs(b.velocity.x) + Math.abs(b.velocity.y) > 0.01,
    );
    expect(moving).toBe(true);

    unmount();
  });

  it('does not schedule per-fragment setTimeout backups when spawning debris', () => {
    // Given — RAF tick already sweeps fragments by age. Per-fragment setTimeout
    // backups are redundant and were removed for perf. This test pins that
    // invariant so regressions are caught.
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 0 } });
    const camera = new Container();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const { result, unmount } = renderHook(() =>
      useBlastDebris(40, 8, camera, physics),
    );

    const baseline = setTimeoutSpy.mock.calls.length;

    // When — spawning debris via every path
    result.current.spawnWaveClearBurst(160, 160, 120);
    result.current.spawnPrismDebris(160, 160);
    result.current.spawnDebris([{ row: 2, col: 2, type: 'standard' }]);
    result.current.spawnLightningDebris([{ row: 3, col: 3, type: 'lightning' }]);

    // Then — no new setTimeout calls beyond baseline
    expect(setTimeoutSpy.mock.calls.length).toBe(baseline);

    setTimeoutSpy.mockRestore();
    unmount();
  });

  it('RAF tick keeps ageing out debris after a deps-change re-mount (regression: mountedRef latch)', () => {
    // Given — first useEffect deps include cellSize. Without re-arming
    // `mountedRef.current = true` in the effect body, prior cleanup left
    // it false, so the RAF tick short-circuits forever and debris freezes
    // on the overlay. Symptom: shards stuck on board hiding tiles.
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 0 } });
    const camera = new Container();
    let nowMs = 1000;
    const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

    const { result, rerender, unmount } = renderHook(
      ({ cs }: { cs: number }) => useBlastDebris(cs, 8, camera, physics),
      { initialProps: { cs: 40 } },
    );

    rerender({ cs: 50 }); // forces first effect cleanup + re-run

    result.current.spawnDebris([{ row: 0, col: 0, type: 'standard' }]);

    const wallCount = physics.getAllBodyStates().filter(b => b.label === 'wall').length;
    expect(physics.getAllBodyStates().length - wallCount).toBeGreaterThan(0);

    nowMs += 2000; // past DEBRIS_LIFETIME (1.0s after tightening)
    if (rafCb) rafCb(nowMs);

    expect(physics.getAllBodyStates().length - wallCount).toBe(0);

    perfSpy.mockRestore();
    unmount();
  });

  it('RAF tick keeps sweeping the rest + reschedules even if one fragment graphic.destroy() throws (Pixi v8 teardown race)', () => {
    // Given — Pixi v8 can throw when an op runs against a torn-down graphic.
    // If that throw escapes the per-frame tick, the `requestAnimationFrame(tick)`
    // reschedule never runs and ALL remaining debris freezes mid-board (the
    // "explosion remnants stuck on tiles" symptom). The sweep must be resilient:
    // one bad fragment removes itself, the rest still age out, and the loop
    // continues on the next frame.
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 0 } });
    const camera = new Container();
    let nowMs = 1000;
    const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

    const { result, unmount } = renderHook(() => useBlastDebris(40, 8, camera, physics));

    // Spawn several fragments across two tiles (≥2 so siblings survive the throw)
    result.current.spawnDebris([
      { row: 0, col: 0, type: 'standard' },
      { row: 1, col: 1, type: 'standard' },
    ]);

    const wallCount = physics.getAllBodyStates().filter(b => b.label === 'wall').length;
    expect(physics.getAllBodyStates().length - wallCount).toBeGreaterThan(1);

    // Make the FIRST destroy() call throw — simulates a torn-down graphic.
    let firstDestroy = true;
    const destroySpy = vi
      .spyOn(Graphics.prototype, 'destroy')
      .mockImplementation(function (this: { destroyed: boolean }) {
        if (firstDestroy) {
          firstDestroy = false;
          throw new Error('pixi v8 teardown race');
        }
        this.destroyed = true;
      });

    // When — age every fragment past lifetime and run one tick.
    nowMs += 2000;
    expect(() => { if (rafCb) rafCb(nowMs); }).not.toThrow();

    // Then — every fragment body is cleaned despite the throw (loop didn't abort).
    expect(physics.getAllBodyStates().length - wallCount).toBe(0);

    destroySpy.mockRestore();
    perfSpy.mockRestore();
    unmount();
  });

  it('debris ages out within ≤1.1s of spawn (was 2s — letters were obscured for too long)', () => {
    // Given — a freshly spawned debris fragment
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 0 } });
    const camera = new Container();
    let nowMs = 1000;
    const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);

    const { result, unmount } = renderHook(() => useBlastDebris(40, 8, camera, physics));
    result.current.spawnDebris([{ row: 0, col: 0, type: 'standard' }]);

    const wallCount = physics.getAllBodyStates().filter(b => b.label === 'wall').length;
    const beforeFrames = physics.getAllBodyStates().length - wallCount;
    expect(beforeFrames).toBeGreaterThan(0);

    // When — 1.1s elapses
    nowMs += 1100;
    if (rafCb) rafCb(nowMs);

    // Then — debris cleared
    expect(physics.getAllBodyStates().length - wallCount).toBe(0);

    perfSpy.mockRestore();
    unmount();
  });

  it('spawnDebris emits at most 2 fragments per cleared tile (density tightened from 3)', () => {
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 0 } });
    const camera = new Container();
    const { result, unmount } = renderHook(() => useBlastDebris(40, 8, camera, physics));

    const wallCount = physics.getAllBodyStates().filter(b => b.label === 'wall').length;
    result.current.spawnDebris([{ row: 0, col: 0, type: 'standard' }]);
    const dynamic = physics.getAllBodyStates().length - wallCount;
    expect(dynamic).toBeLessThanOrEqual(2);

    unmount();
  });

  it('removes wall bodies on unmount', () => {
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 1 } });
    const camera = new Container();

    const { unmount } = renderHook(() =>
      useBlastDebris(40, 8, camera, physics),
    );
    unmount();

    const walls = physics
      .getAllBodyStates()
      .filter(b => b.label === 'wall');
    expect(walls).toHaveLength(0);

    physics.destroy();
  });

  it('debris settles below the visible canvas so fragments do not rest on bottom-row tiles', () => {
    // Pin Math.random so fork-process seeds don't produce upward forces strong
    // enough to keep fragments above the floor after 600 physics steps.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    // Given — 8x8 grid, 40px cells. Canvas spans y=0..boardPx (320). Floor was
    // positioned with its top edge at boardPx, so settled fragments rested at
    // y ≈ boardPx (just inside the bottom of the bottom-row tiles), creating
    // a "leftover red shards stuck on a tile after explosion" visual in blast
    // mode after bomb clears.
    const physics = new PhysicsWorld({ gravity: { x: 0, y: 1 } });
    const camera = new Container();
    const cellSize = 40;
    const gridSize = 8;
    const boardPx = cellSize * gridSize;

    const { result, unmount } = renderHook(() =>
      useBlastDebris(cellSize, gridSize, camera, physics),
    );

    result.current.spawnDebris([{ row: 4, col: 4, type: 'bomb' }]);

    // Run physics long enough for fragments to settle on the floor.
    for (let i = 0; i < 600; i++) physics.update(16.67);

    const dynamic = physics
      .getAllBodyStates()
      .filter(b => b.label !== 'wall');
    expect(dynamic.length).toBeGreaterThan(0);
    for (const body of dynamic) {
      expect(body.position.y).toBeGreaterThan(boardPx);
    }

    unmount();
  });
});
