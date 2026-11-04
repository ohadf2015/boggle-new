import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { motionPref } from '@/components/education/motion/__tests__/reducedMotion.mock';
import { loopEffect, useCompositorLoop, type LoopSpec } from '../compositorLoop';

type Call = { el: Element; frames: Keyframe[]; opts: KeyframeAnimationOptions };
let calls: Call[];
const cancel = vi.fn();

beforeEach(() => {
  calls = [];
  cancel.mockClear();
  motionPref.reduced = false;
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = function (this: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) {
    calls.push({ el: this, frames, opts });
    return { cancel } as unknown as Animation;
  };
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});

const bob: LoopSpec = { keyframes: [{ transform: 'translateY(0px)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(0px)' }], duration: 900, easing: 'ease-in-out' };

function Probe({ spec }: { spec: LoopSpec | LoopSpec[] | null }) {
  const ref = useCompositorLoop<HTMLSpanElement>(spec);
  return <span ref={ref} data-testid="probe" />;
}

describe('loopEffect', () => {
  it('spaces keyframes evenly, eases each segment and repeats forever', () => {
    const { frames, opts } = loopEffect(bob);
    expect(frames.map((f) => f.offset)).toEqual([0, 0.5, 1]);
    expect(frames.every((f) => f.easing === 'ease-in-out')).toBe(true);
    expect(opts).toMatchObject({ duration: 900, iterations: Infinity, easing: 'linear', fill: 'backwards' });
  });

  it('holds the last frame for repeatDelay inside every cycle, not only after the last one', () => {
    const { frames, opts } = loopEffect({ ...bob, repeatDelay: 2700 });
    expect(opts.duration).toBe(3600);
    expect(frames.map((f) => f.offset)).toEqual([0, 0.125, 0.25, 1]);
    expect(frames[3].transform).toBe(frames[2].transform);
  });

  it('delays only the first cycle', () => {
    expect(loopEffect({ ...bob, delay: 1400 }).opts).toMatchObject({ delay: 1400, iterations: Infinity });
  });

  it('rejects properties that would repaint or reflow every frame', () => {
    expect(() => loopEffect({ keyframes: [{ width: '1px' }, { width: '2px' }], duration: 100 })).toThrow(/width/);
    expect(() => loopEffect({ keyframes: [{ left: '0' }, { left: '9px' }], duration: 100 })).toThrow(/left/);
  });
});

describe('useCompositorLoop', () => {
  it('runs every spec on the element as a Web Animation and cancels them on unmount', () => {
    const { unmount, getByTestId } = render(<Probe spec={[bob, { ...bob, duration: 1800 }]} />);
    expect(calls).toHaveLength(2);
    expect(calls[0].el).toBe(getByTestId('probe'));
    unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it('starts nothing under reduced motion (OS or the in-app switch, via useEduReducedMotion)', () => {
    motionPref.reduced = true;
    render(<Probe spec={bob} />);
    expect(calls).toHaveLength(0);
  });

  it('stops when the caller turns the loop off', () => {
    const { rerender } = render(<Probe spec={bob} />);
    expect(calls).toHaveLength(1);
    rerender(<Probe spec={null} />);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);
  });

  it('does not restart when the parent re-renders with an equal spec', () => {
    const { rerender } = render(<Probe spec={{ ...bob }} />);
    rerender(<Probe spec={{ ...bob }} />);
    expect(calls).toHaveLength(1);
    expect(cancel).not.toHaveBeenCalled();
  });
});
