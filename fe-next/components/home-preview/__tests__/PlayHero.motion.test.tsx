import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/components/quick-play/QuickResultsFx', () => ({ QuickResultsRays: () => null, SparkleLoop: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { PlayHero } from '../PlayHero';

const t = (key: string) => key;
type Call = { el: Element; frames: Keyframe[]; opts: KeyframeAnimationOptions };
let calls: Call[];

beforeEach(() => {
  calls = [];
  Element.prototype.animate = vi.fn(function (this: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    calls.push({ el: this, frames, opts });
    return {} as Animation;
  }) as unknown as Element['animate'];
});
afterEach(() => {
  delete (Element.prototype as Partial<Element>).animate;
});

function renderHero(props: Partial<React.ComponentProps<typeof PlayHero>> = {}) {
  return render(
    <PlayHero lang="en" t={t} animate avatar={null} greeting="Hi" streak={0} streakLoading={false} onAvatarSaved={vi.fn()} {...props} />,
  );
}

const pulses = () => calls.filter((c) => c.el.getAttribute('data-testid') === 'hp-chip-daily');
const entrances = () => calls.filter((c) => c.el.hasAttribute('data-hero-row'));

describe('PlayHero motion', () => {
  it('given motion is on, then the action rows rise in a 70ms stagger using transform only', () => {
    renderHero();
    const e = entrances();
    expect(e.map((c) => c.opts.delay)).toEqual([0, 70]);
    for (const c of e) for (const f of c.frames) expect(Object.keys(f).filter((k) => k !== 'offset')).toEqual(['transform']);
  });

  it('given today\'s daily is not played, then the daily card pulses exactly once', () => {
    renderHero({ playedToday: false });
    expect(pulses()).toHaveLength(1);
    expect(pulses()[0].opts.iterations ?? 1).toBe(1);
  });

  it('given the daily status resolves late as not played, then the pulse runs once it is known, not before', () => {
    const { rerender } = renderHero({ streakLoading: true });
    expect(pulses()).toHaveLength(0);
    rerender(<PlayHero lang="en" t={t} animate avatar={null} greeting="Hi" streak={0} streakLoading={false} onAvatarSaved={vi.fn()} />);
    rerender(<PlayHero lang="en" t={t} animate avatar={null} greeting="Hi" streak={1} streakLoading={false} onAvatarSaved={vi.fn()} />);
    expect(pulses()).toHaveLength(1);
  });

  it('given today\'s daily is done, then the daily card does not pulse', () => {
    renderHero({ playedToday: true });
    expect(pulses()).toHaveLength(0);
  });

  it('given reduced motion (animate off), then nothing animates', () => {
    renderHero({ animate: false });
    expect(calls).toHaveLength(0);
  });
});
