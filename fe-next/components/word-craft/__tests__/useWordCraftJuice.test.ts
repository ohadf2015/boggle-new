/**
 * Tests for useWordCraftJuice — the gsap-driven feel layer for WordCraft.
 *
 * Each trigger is gated by prefers-reduced-motion (no-op when set) and
 * builds a gsap timeline that animates the supplied DOM target. We assert
 * structural wiring: which primitives are called with which targets,
 * not real tween timing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const reducedMotionMock = vi.fn(() => false);
vi.mock('@/utils/accessibility', () => ({
  isReducedMotionPreferred: () => reducedMotionMock(),
}));

interface TimelineSpy {
  fromToCalls: Array<{ target: unknown; from: unknown; to: unknown }>;
  toCalls: Array<{ target: unknown; vars: unknown }>;
  killed: boolean;
}

const timelines: TimelineSpy[] = [];

function makeMockTl(): TimelineSpy & Record<string, unknown> {
  const spy: TimelineSpy = { fromToCalls: [], toCalls: [], killed: false };
  const tl: Record<string, unknown> = {};
  Object.assign(tl, spy);
  Object.assign(tl, {
    to(target: unknown, vars: unknown) {
      spy.toCalls.push({ target, vars });
      return tl;
    },
    fromTo(target: unknown, from: unknown, to: unknown) {
      spy.fromToCalls.push({ target, from, to });
      return tl;
    },
    from: () => tl,
    set: () => tl,
    call: () => tl,
    add: () => tl,
    eventCallback: () => tl,
    kill() { spy.killed = true; },
  });
  timelines.push(spy);
  return tl as TimelineSpy & Record<string, unknown>;
}

vi.mock('gsap', () => ({
  gsap: {
    timeline: () => makeMockTl(),
  },
}));

import { useWordCraftJuice } from '../useWordCraftJuice';

beforeEach(() => {
  reducedMotionMock.mockReturnValue(false);
  timelines.length = 0;
});

describe('useWordCraftJuice', () => {
  it('returns the expected trigger surface', () => {
    const { result } = renderHook(() => useWordCraftJuice());
    expect(typeof result.current.tilePlace).toBe('function');
    expect(typeof result.current.invalidShake).toBe('function');
    expect(typeof result.current.scorePop).toBe('function');
    expect(typeof result.current.botReveal).toBe('function');
    expect(typeof result.current.rackSelect).toBe('function');
    expect(typeof result.current.drawFromSack).toBe('function');
    expect(typeof result.current.jokerSparkle).toBe('function');
    expect(typeof result.current.captureBurst).toBe('function');
  });

  describe('captureBurst', () => {
    it('pops each captured cell', () => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.captureBurst([a, b], '#00FFFF');
      expect(timelines.length).toBeGreaterThanOrEqual(1);
      const targets = timelines.flatMap((t) => t.fromToCalls.map((c) => c.target));
      expect(targets).toContain(a);
      expect(targets).toContain(b);
    });

    it('no-ops on an empty cell list', () => {
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.captureBurst([], '#FF1493');
      expect(timelines).toHaveLength(0);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const a = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.captureBurst([a], '#00FFFF');
      expect(timelines).toHaveLength(0);
    });
  });

  describe('drawFromSack', () => {
    it('flies each newly-drawn rack tile in from the sack', () => {
      const sack = document.createElement('div');
      const a = document.createElement('div');
      const b = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.drawFromSack(sack, [a, b]);
      expect(timelines).toHaveLength(1);
      const targets = timelines[0].fromToCalls.map((c) => c.target);
      expect(targets).toContain(a);
      expect(targets).toContain(b);
    });

    it('no-ops when the sack element is missing', () => {
      const a = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.drawFromSack(null, [a]);
      expect(timelines).toHaveLength(0);
    });

    it('no-ops on an empty tile list', () => {
      const sack = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.drawFromSack(sack, []);
      expect(timelines).toHaveLength(0);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const sack = document.createElement('div');
      const a = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.drawFromSack(sack, [a]);
      expect(timelines).toHaveLength(0);
    });
  });

  describe('jokerSparkle', () => {
    it('pops the assigned joker tile', () => {
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.jokerSparkle(el);
      expect(timelines.length).toBeGreaterThanOrEqual(1);
      const targets = [
        ...timelines[0].fromToCalls.map((c) => c.target),
        ...timelines[0].toCalls.map((c) => c.target),
      ];
      expect(targets).toContain(el);
    });

    it('no-ops on a null target', () => {
      const { result } = renderHook(() => useWordCraftJuice());
      expect(() => result.current.jokerSparkle(null)).not.toThrow();
      expect(timelines).toHaveLength(0);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.jokerSparkle(el);
      expect(timelines).toHaveLength(0);
    });
  });

  describe('tilePlace', () => {
    it('animates the target with a snap-down fromTo when motion is allowed', () => {
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.tilePlace(el);
      expect(timelines).toHaveLength(1);
      expect(timelines[0].fromToCalls).toHaveLength(1);
      expect(timelines[0].fromToCalls[0].target).toBe(el);
    });

    it('is a no-op when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.tilePlace(el);
      expect(timelines).toHaveLength(0);
    });

    it('handles a null target without throwing or animating', () => {
      const { result } = renderHook(() => useWordCraftJuice());
      expect(() => result.current.tilePlace(null)).not.toThrow();
      expect(timelines).toHaveLength(0);
    });
  });

  describe('invalidShake', () => {
    it('shakes a list of targets along the x axis', () => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.invalidShake([a, b]);
      expect(timelines).toHaveLength(1);
      expect(timelines[0].fromToCalls.length).toBeGreaterThan(0);
      const targets = timelines[0].fromToCalls.map((c) => c.target);
      expect(targets).toContain(a);
      expect(targets).toContain(b);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.invalidShake([el]);
      expect(timelines).toHaveLength(0);
    });

    it('no-ops on empty target list', () => {
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.invalidShake([]);
      expect(timelines).toHaveLength(0);
    });
  });

  describe('scorePop', () => {
    it('pops a score badge upward and back', () => {
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.scorePop(el, 42);
      expect(timelines).toHaveLength(1);
      expect(timelines[0].fromToCalls.length + timelines[0].toCalls.length).toBeGreaterThan(0);
      const targets = [
        ...timelines[0].fromToCalls.map((c) => c.target),
        ...timelines[0].toCalls.map((c) => c.target),
      ];
      expect(targets).toContain(el);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.scorePop(el, 10);
      expect(timelines).toHaveLength(0);
    });
  });

  describe('botReveal', () => {
    it('staggers a flip-in across each target', () => {
      const els = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.botReveal(els);
      expect(timelines).toHaveLength(1);
      expect(timelines[0].fromToCalls.length).toBe(3);
      const targets = timelines[0].fromToCalls.map((c) => c.target);
      for (const el of els) expect(targets).toContain(el);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const els = [document.createElement('div')];
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.botReveal(els);
      expect(timelines).toHaveLength(0);
    });
  });

  describe('rackSelect', () => {
    it('bounces the selected rack tile', () => {
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.rackSelect(el);
      expect(timelines).toHaveLength(1);
      const targets = [
        ...timelines[0].fromToCalls.map((c) => c.target),
        ...timelines[0].toCalls.map((c) => c.target),
      ];
      expect(targets).toContain(el);
    });

    it('no-ops when prefers-reduced-motion is set', () => {
      reducedMotionMock.mockReturnValue(true);
      const el = document.createElement('div');
      const { result } = renderHook(() => useWordCraftJuice());
      result.current.rackSelect(el);
      expect(timelines).toHaveLength(0);
    });

    it('handles a null target without throwing or animating', () => {
      const { result } = renderHook(() => useWordCraftJuice());
      expect(() => result.current.rackSelect(null)).not.toThrow();
      expect(timelines).toHaveLength(0);
    });
  });
});
