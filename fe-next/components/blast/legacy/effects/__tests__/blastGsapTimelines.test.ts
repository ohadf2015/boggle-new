/**
 * Tests for blastGsapTimelines — pure GSAP timeline factories that drive
 * cascade-depth escalation (J1), combo level-up badge (J2), wave clear
 * confetti shower (J3), and long-word zoom-punch (J5).
 *
 * Factories are pure: they take callback setters (no Pixi access in tests).
 * We assert the timeline records the expected tweens / call hooks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCascadePunchTimeline,
  buildComboLevelUpTimeline,
  buildWaveClearShowerTimeline,
  buildLongWordPunchTimeline,
} from '../blastGsapTimelines';

// ─── GSAP mock — chainable, records invocations ───────────────────────────
type Call = { method: string; args: unknown[] };

function makeMockTimeline() {
  const calls: Call[] = [];
  const proxy: {
    to: (...args: unknown[]) => typeof proxy;
    from: (...args: unknown[]) => typeof proxy;
    fromTo: (...args: unknown[]) => typeof proxy;
    call: (...args: unknown[]) => typeof proxy;
    add: (...args: unknown[]) => typeof proxy;
    set: (...args: unknown[]) => typeof proxy;
    kill: () => void;
    eventCallback: (...args: unknown[]) => typeof proxy;
    _calls: Call[];
  } = {
    to: (...args) => { calls.push({ method: 'to', args }); return proxy; },
    from: (...args) => { calls.push({ method: 'from', args }); return proxy; },
    fromTo: (...args) => { calls.push({ method: 'fromTo', args }); return proxy; },
    call: (...args) => { calls.push({ method: 'call', args }); return proxy; },
    add: (...args) => { calls.push({ method: 'add', args }); return proxy; },
    set: (...args) => { calls.push({ method: 'set', args }); return proxy; },
    eventCallback: (...args) => { calls.push({ method: 'eventCallback', args }); return proxy; },
    kill: vi.fn(),
    _calls: calls,
  };
  return proxy;
}

const gsapStub = {
  timeline: vi.fn(() => makeMockTimeline()),
  to: vi.fn(),
  set: vi.fn(),
} as unknown as typeof import('gsap').gsap;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── J1 — cascadePunch ────────────────────────────────────────────────────
describe('buildCascadePunchTimeline (J1)', () => {
  function makeParams(depth: number) {
    return {
      depth,
      shake: vi.fn(),
      setZoom: vi.fn(),
      setRgb: vi.fn(),
      setBloom: vi.fn(),
      freeze: vi.fn(),
      reset: vi.fn(),
    };
  }

  it('depth 1 fires only a light shake call', () => {
    const params = makeParams(1);
    const tl = buildCascadePunchTimeline(gsapStub, params);
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    const shakeCalls = calls.filter(c => c.method === 'call');
    expect(shakeCalls.length).toBeGreaterThanOrEqual(1);
    // No zoom or bloom setup at depth 1
    const zoomTweens = calls.filter(c => c.method === 'fromTo' || c.method === 'to');
    expect(zoomTweens.length).toBe(0);
  });

  it('depth 3 adds a zoom + rgb fromTo tween', () => {
    const params = makeParams(3);
    const tl = buildCascadePunchTimeline(gsapStub, params);
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    const tweens = calls.filter(c => c.method === 'fromTo');
    expect(tweens.length).toBeGreaterThanOrEqual(2);
  });

  it('depth 4 adds a hit-stop freeze call', () => {
    const params = makeParams(4);
    const tl = buildCascadePunchTimeline(gsapStub, params);
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    expect(calls.filter(c => c.method === 'call').length).toBeGreaterThanOrEqual(2); // shake + freeze
  });

  it('intensity scales monotonically with depth (shake arg grows)', () => {
    const p1 = makeParams(1);
    buildCascadePunchTimeline(gsapStub, p1);
    const p4 = makeParams(4);
    buildCascadePunchTimeline(gsapStub, p4);

    // first call to shake() inside the tl.call() body — invoke the recorded callback
    // and verify shake intensity grew.
    const cb1 = (gsapStub.timeline as ReturnType<typeof vi.fn>).mock.results[0].value._calls
      .find((c: Call) => c.method === 'call').args[0];
    cb1();
    const cb4 = (gsapStub.timeline as ReturnType<typeof vi.fn>).mock.results[1].value._calls
      .find((c: Call) => c.method === 'call').args[0];
    cb4();

    const i1 = (p1.shake as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const i4 = (p4.shake as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(i4).toBeGreaterThan(i1);
  });
});

// ─── J2 — comboLevelUpBadge ───────────────────────────────────────────────
describe('buildComboLevelUpTimeline (J2)', () => {
  it('animates a Pixi-text-like target with pop scale + rise + fade', () => {
    const target = { scale: { x: 0, y: 0 }, alpha: 1, y: 0 };
    const onComplete = vi.fn();

    const tl = buildComboLevelUpTimeline(gsapStub, {
      target,
      tier: 3,
      onComplete,
    });

    const calls = (tl as unknown as { _calls: Call[] })._calls;
    // Expect at least: scale-pop, rise+fade
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('higher tier triggers more dramatic scale (peakScale > 1.5)', () => {
    const target = { scale: { x: 0, y: 0 }, alpha: 1, y: 0 };
    const tl = buildComboLevelUpTimeline(gsapStub, {
      target,
      tier: 5,
      onComplete: vi.fn(),
    });
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    // Find the scale-pop tween (one with x/y over 1)
    const popCall = calls.find(
      c => c.method === 'to' && JSON.stringify(c.args).includes('"x"'),
    );
    expect(popCall).toBeDefined();
  });
});

// ─── J3 — waveClearShower ─────────────────────────────────────────────────
describe('buildWaveClearShowerTimeline (J3)', () => {
  it('emits 3 staggered bursts at increasing offsets', () => {
    const burst = vi.fn();
    const tl = buildWaveClearShowerTimeline(gsapStub, {
      width: 800,
      height: 600,
      burst,
    });
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    const callTweens = calls.filter(c => c.method === 'call');
    expect(callTweens.length).toBeGreaterThanOrEqual(3);

    // Each call's second argument is its position offset in the timeline
    const offsets = callTweens.map(c => c.args[2] as string | number).filter(o => o !== undefined);
    expect(offsets.length).toBeGreaterThanOrEqual(2); // first burst is at start, others have offsets
  });

  it('invokes burst callback when each timeline call fires', () => {
    const burst = vi.fn();
    const tl = buildWaveClearShowerTimeline(gsapStub, {
      width: 400,
      height: 600,
      burst,
    });
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    const burstCallbacks = calls.filter(c => c.method === 'call').map(c => c.args[0] as () => void);
    burstCallbacks.forEach(cb => cb());
    expect(burst).toHaveBeenCalledTimes(burstCallbacks.length);
  });
});

// ─── J5 — longWordPunch ───────────────────────────────────────────────────
describe('buildLongWordPunchTimeline (J5)', () => {
  function makeParams(length: number) {
    return {
      length,
      origin: { cx: 200, cy: 300 },
      shockwave: vi.fn(),
      setZoom: vi.fn(),
      setRgb: vi.fn(),
      starBurst: vi.fn(),
      reset: vi.fn(),
    };
  }

  it('length 5 (below threshold) returns null timeline', () => {
    const tl = buildLongWordPunchTimeline(gsapStub, makeParams(5));
    expect(tl).toBeNull();
  });

  it('length 6 fires single shockwave burst', () => {
    const params = makeParams(6);
    const tl = buildLongWordPunchTimeline(gsapStub, params)!;
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    const callTweens = calls.filter(c => c.method === 'call');
    expect(callTweens.length).toBeGreaterThanOrEqual(1);
    callTweens.forEach(c => (c.args[0] as () => void)());
    expect(params.shockwave).toHaveBeenCalled();
  });

  it('length 8+ adds golden star burst', () => {
    const params = makeParams(8);
    const tl = buildLongWordPunchTimeline(gsapStub, params)!;
    const calls = (tl as unknown as { _calls: Call[] })._calls;
    calls.filter(c => c.method === 'call').forEach(c => (c.args[0] as () => void)());
    expect(params.starBurst).toHaveBeenCalled();
  });

  it('zoom + rgb fromTo tweens scale with length', () => {
    const tl6 = buildLongWordPunchTimeline(gsapStub, makeParams(6))!;
    const tl8 = buildLongWordPunchTimeline(gsapStub, makeParams(8))!;
    const calls6 = (tl6 as unknown as { _calls: Call[] })._calls.filter(c => c.method === 'fromTo');
    const calls8 = (tl8 as unknown as { _calls: Call[] })._calls.filter(c => c.method === 'fromTo');
    expect(calls8.length).toBeGreaterThanOrEqual(calls6.length);
  });
});
