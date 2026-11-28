import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { PlayHero } from '../PlayHero';

const t = (key: string) => key;
type Call = { el: Element; frames: Keyframe[]; opts: KeyframeAnimationOptions };
let calls: Call[];

function stubPointer(coarse: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: coarse && query.includes('pointer: coarse'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  calls = [];
  Element.prototype.animate = vi.fn(function (this: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    calls.push({ el: this, frames, opts });
    return { cancel: vi.fn() } as unknown as Animation;
  }) as unknown as Element['animate'];
});
afterEach(() => {
  delete (Element.prototype as Partial<Element>).animate;
});

function renderHero(props: Partial<React.ComponentProps<typeof PlayHero>> = {}) {
  return render(<PlayHero lang="en" t={t} animate avatar={null} bubble={null} streak={0} streakLoading={false} onAvatarSaved={vi.fn()} {...props} />);
}

const entrances = () => calls.filter((c) => c.el.hasAttribute('data-hero-row'));
const breaths = () => calls.filter((c) => c.el.hasAttribute('data-hero-breathe'));
const transformOnly = (c: Call) => c.frames.every((f) => Object.keys(f).filter((k) => k !== 'offset' && k !== 'easing').join() === 'transform');

describe('PlayHero motion', () => {
  it('given motion is on, then the four tiers pop in on a stagger using transform only', () => {
    stubPointer(false);
    renderHero();
    const e = entrances();
    expect(e.map((c) => c.opts.delay)).toEqual([0, 70, 140, 210]);
    expect(e.every(transformOnly)).toBe(true);
  });

  it('given a mouse, then PLAY breathes on a loop, transform only, never wrapping the pressable itself', () => {
    stubPointer(false);
    renderHero();
    const [b] = breaths();
    expect(b.opts.iterations).toBe(Infinity);
    expect(transformOnly(b)).toBe(true);
    expect(b.el.getAttribute('data-testid')).not.toBe('hp-play-now');
  });

  it('given a touch phone, then PLAY keeps breathing too (the phone home must not go still), transform only', () => {
    stubPointer(true);
    renderHero();
    const [b] = breaths();
    expect(b.opts.iterations).toBe(Infinity);
    expect(transformOnly(b)).toBe(true);
  });

  it('given reduced motion (animate off), then nothing animates', () => {
    renderHero({ animate: false });
    expect(calls).toHaveLength(0);
  });
});
