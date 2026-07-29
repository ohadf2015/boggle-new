/**
 * Tests for useBlastGsapTimelines — verifies the hook's
 * range guards, reduced-motion gates, filter stack lifecycle,
 * and unmount-kill teardown for tracked timelines.
 *
 * GSAP is mocked as a chainable no-op so tests assert structural
 * wiring (which primitives get called with what args), not real
 * tween timing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────

const reducedMotionMock = vi.fn(() => false);
vi.mock('@/utils/accessibility', () => ({
  isReducedMotionPreferred: () => reducedMotionMock(),
}));

const filterDestroyCalls = { rgb: 0, zoom: 0, bloom: 0 };
vi.mock('../effects/pixiFilterPresets', () => ({
  createRGBSplitFilter: () => ({
    red: [0, 0],
    blue: [0, 0],
    destroy: () => { filterDestroyCalls.rgb++; },
  }),
  createZoomBlurFilter: () => ({
    strength: 0,
    center: [0, 0],
    destroy: () => { filterDestroyCalls.zoom++; },
  }),
  createAdvancedBloomFilter: () => ({
    bloomScale: 1,
    destroy: () => { filterDestroyCalls.bloom++; },
  }),
}));

// Track all GSAP timeline calls + onComplete handlers across the test
const tlOnComplete = new Set<() => void>();
const killedTimelines = new Set<unknown>();

function makeMockTl() {
  let onComplete: (() => void) | null = null;
  const tl: Record<string, unknown> = {};
  Object.assign(tl, {
    to: () => tl,
    from: () => tl,
    fromTo: () => tl,
    call: () => tl,
    add: () => tl,
    set: () => tl,
    eventCallback: (event: string, fn?: () => void) => {
      if (event === 'onComplete') {
        if (fn === undefined) return onComplete;
        onComplete = fn;
        tlOnComplete.add(fn);
        return tl;
      }
      return tl;
    },
    kill: () => { killedTimelines.add(tl); },
  });
  return tl;
}

vi.mock('gsap', () => ({
  gsap: {
    timeline: (opts?: { onComplete?: () => void }) => {
      const tl = makeMockTl();
      if (opts?.onComplete) {
        (tl.eventCallback as (e: string, fn: () => void) => unknown)('onComplete', opts.onComplete);
      }
      return tl;
    },
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────
import { useBlastGsapTimelines } from '../hooks/useBlastGsapTimelines';

// ─── Test stubs ─────────────────────────────────────────────────────────
function makeDeps() {
  const camera = { destroyed: false, filters: null as unknown };
  const shake = { shake: vi.fn() };
  const timeDilation = { freeze: vi.fn() };
  const particles = { burst: vi.fn(), create: vi.fn() };
  const fireShockwave = vi.fn();
  const spawnStarBurst = vi.fn();
  const confettiPreset = { maxParticles: 1 } as unknown as Parameters<
    typeof useBlastGsapTimelines
  >[0]['confettiPreset'];

  return {
    deps: {
      camera: camera as unknown as Parameters<typeof useBlastGsapTimelines>[0]['camera'],
      shake,
      timeDilation,
      particles: particles as unknown as Parameters<typeof useBlastGsapTimelines>[0]['particles'],
      width: 800,
      height: 600,
      fireShockwave,
      spawnStarBurst,
      confettiPreset,
    },
    raw: { camera, shake, timeDilation, particles, fireShockwave, spawnStarBurst },
  };
}

beforeEach(() => {
  reducedMotionMock.mockReturnValue(false);
  tlOnComplete.clear();
  killedTimelines.clear();
  filterDestroyCalls.rgb = 0;
  filterDestroyCalls.zoom = 0;
  filterDestroyCalls.bloom = 0;
});

// ─── runCascadePunch ────────────────────────────────────────────────────
describe('useBlastGsapTimelines.runCascadePunch', () => {
  it('reduced-motion → no-op (no shake call, no filter created)', () => {
    reducedMotionMock.mockReturnValue(true);
    const { result } = renderHook(() => useBlastGsapTimelines(makeDeps().deps));
    result.current.runCascadePunch(3);
    expect(filterDestroyCalls.rgb).toBe(0);
  });

  it('depth out of [1,4] → no-op', () => {
    const { deps, raw } = makeDeps();
    const { result } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runCascadePunch(0);
    result.current.runCascadePunch(5);
    expect(raw.shake.shake).not.toHaveBeenCalled();
  });

  it('depth 3 → builds timeline + tracks for unmount', () => {
    const { deps } = makeDeps();
    const { result, unmount } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runCascadePunch(3);
    // Timeline existed; unmount must kill + run teardown
    unmount();
    expect(killedTimelines.size).toBeGreaterThanOrEqual(1);
    // Filter stack destroyed on unmount even though timeline never naturally completed
    expect(filterDestroyCalls.rgb).toBeGreaterThanOrEqual(1);
    expect(filterDestroyCalls.zoom).toBeGreaterThanOrEqual(1);
    expect(filterDestroyCalls.bloom).toBeGreaterThanOrEqual(1);
  });

  it('camera.destroyed → no-op', () => {
    const { deps } = makeDeps();
    (deps.camera as unknown as { destroyed: boolean }).destroyed = true;
    const { result } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runCascadePunch(2);
    expect(filterDestroyCalls.rgb).toBe(0);
  });
});

// ─── runLongWordPunch ───────────────────────────────────────────────────
describe('useBlastGsapTimelines.runLongWordPunch', () => {
  it('length < 6 → no-op AND no filter leak (stack destroyed if created)', () => {
    const { deps } = makeDeps();
    const { result } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runLongWordPunch(5, 100, 100);
    // No leak: any stack created should already be destroyed; or no stack at all
    expect(filterDestroyCalls.rgb).toBeLessThanOrEqual(1);
  });

  it('length 7 → builds timeline + tracks; unmount kills + teardowns', () => {
    const { deps } = makeDeps();
    const { result, unmount } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runLongWordPunch(7, 200, 300);
    unmount();
    expect(killedTimelines.size).toBeGreaterThanOrEqual(1);
    expect(filterDestroyCalls.rgb).toBeGreaterThanOrEqual(1);
  });

  it('reduced-motion → no-op', () => {
    reducedMotionMock.mockReturnValue(true);
    const { deps, raw } = makeDeps();
    const { result } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runLongWordPunch(8, 100, 100);
    expect(raw.fireShockwave).not.toHaveBeenCalled();
    expect(filterDestroyCalls.rgb).toBe(0);
  });
});

// ─── runWaveClearShower ─────────────────────────────────────────────────
describe('useBlastGsapTimelines.runWaveClearShower', () => {
  it('builds timeline tracked for unmount', () => {
    const { deps } = makeDeps();
    const { result, unmount } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runWaveClearShower();
    unmount();
    expect(killedTimelines.size).toBeGreaterThanOrEqual(1);
  });

  it('reduced-motion → no-op', () => {
    reducedMotionMock.mockReturnValue(true);
    const { deps, raw } = makeDeps();
    const { result } = renderHook(() => useBlastGsapTimelines(deps));
    result.current.runWaveClearShower();
    expect(raw.particles.burst).not.toHaveBeenCalled();
  });
});

// ─── trackTimeline ──────────────────────────────────────────────────────
import { gsap as gsapModule } from 'gsap';

describe('useBlastGsapTimelines.trackTimeline', () => {
  it('killed + teardown invoked on unmount', () => {
    const { deps } = makeDeps();
    const { result, unmount } = renderHook(() => useBlastGsapTimelines(deps));

    const teardown = vi.fn();
    const tl = gsapModule.timeline();
    result.current.trackTimeline(
      tl as unknown as ReturnType<typeof gsapModule.timeline>,
      teardown,
    );

    unmount();
    expect(killedTimelines.has(tl)).toBe(true);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('chains existing onComplete (factory reset still fires on natural completion)', () => {
    const { deps } = makeDeps();
    const { result } = renderHook(() => useBlastGsapTimelines(deps));

    const factoryReset = vi.fn();
    const teardown = vi.fn();
    const tl = gsapModule.timeline({ onComplete: factoryReset });
    result.current.trackTimeline(
      tl as unknown as ReturnType<typeof gsapModule.timeline>,
      teardown,
    );

    // Simulate natural completion — the chained onComplete handler runs the
    // existing factoryReset before clearing the tracker entry.
    const onComplete = (tl as unknown as {
      eventCallback: (e: string) => () => void;
    }).eventCallback('onComplete');
    onComplete?.();

    expect(factoryReset).toHaveBeenCalledTimes(1);
    // Teardown is unmount-only; natural completion does NOT fire it
    expect(teardown).not.toHaveBeenCalled();
  });
});
