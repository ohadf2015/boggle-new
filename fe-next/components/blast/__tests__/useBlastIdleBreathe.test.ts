// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gsap } from 'gsap';
import { createIdleBreatheTween } from '../effects/blastGsapTimelines';
import { mountIdleBreatheForTiles } from '../hooks/useBlastGsapTimelines';

describe('createIdleBreatheTween', () => {
  let el: HTMLDivElement;
  beforeEach(() => { el = document.createElement('div'); document.body.appendChild(el); });
  afterEach(() => { el.remove(); });

  it('creates a yoyo tween with random delay and infinite repeat', () => {
    const tween = createIdleBreatheTween(el, { random: () => 0.5 });
    expect(tween).not.toBeNull();
    expect(tween!.repeat()).toBe(-1);
    expect(tween!.yoyo()).toBe(true);
    expect(tween!.delay()).toBeCloseTo(2, 1);
    tween!.kill();
  });

  it('returns null under prefers-reduced-motion', () => {
    const orig = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, addEventListener: () => {}, removeEventListener: () => {},
    } as unknown as MediaQueryList);
    const tween = createIdleBreatheTween(el, { random: () => 0.5 });
    expect(tween).toBeNull();
    window.matchMedia = orig;
  });
});

describe('mountIdleBreatheForTiles', () => {
  let tiles: HTMLDivElement[];
  let origObserver: typeof IntersectionObserver;

  beforeEach(() => {
    tiles = [document.createElement('div'), document.createElement('div')];
    tiles.forEach((t) => document.body.appendChild(t));
    origObserver = window.IntersectionObserver;
  });

  afterEach(() => {
    tiles.forEach((t) => t.remove());
    window.IntersectionObserver = origObserver;
  });

  it('pauses tweens when tiles go off-screen, resumes when on', () => {
    const callbacks: IntersectionObserverCallback[] = [];
    (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) { callbacks.push(cb); }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = () => [];
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
    } as unknown as typeof IntersectionObserver;

    const cleanup = mountIdleBreatheForTiles(tiles);
    const observer = {} as IntersectionObserver;

    callbacks[0](
      tiles.map((t) => ({ target: t, isIntersecting: false } as IntersectionObserverEntry)),
      observer,
    );
    tiles.forEach((el) => {
      gsap.getTweensOf(el).forEach((t) => expect(t.paused()).toBe(true));
    });

    callbacks[0](
      tiles.map((t) => ({ target: t, isIntersecting: true } as IntersectionObserverEntry)),
      observer,
    );
    tiles.forEach((el) => {
      const tweens = gsap.getTweensOf(el);
      if (tweens.length > 0) {
        tweens.forEach((t) => expect(t.paused()).toBe(false));
      }
    });

    cleanup();
  });

  it('cleanup kills all tweens', () => {
    (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver = class {
      constructor() {}
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = () => [];
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [];
    } as unknown as typeof IntersectionObserver;

    const cleanup = mountIdleBreatheForTiles(tiles);
    cleanup();
    tiles.forEach((el) => {
      expect(gsap.getTweensOf(el).length).toBe(0);
    });
  });
});
