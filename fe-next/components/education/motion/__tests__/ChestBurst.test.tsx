import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { motionPref } from './reducedMotion.mock';

const overlay = { static: false };
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => overlay.static }));
import { ChestBurst } from '../ChestBurst';

type Frames = Keyframe[];
let calls: Array<{ el: Element; frames: Frames; opts: KeyframeAnimationOptions }>;
const cancel = vi.fn();

beforeEach(() => {
  calls = [];
  cancel.mockClear();
  motionPref.reduced = false;
  overlay.static = false;
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = function (this: Element, frames: Frames, opts: KeyframeAnimationOptions) {
    calls.push({ el: this, frames, opts });
    return { cancel } as unknown as Animation;
  };
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});

describe('<ChestBurst>', () => {
  it('lays every piece out before it plays, so opening the chest only starts animations', () => {
    const { rerender } = render(<ChestBurst playing={false} coinSrc="/coin.webp" />);
    const pieces = screen.getAllByTestId(/chest-burst-/).length;
    expect(pieces).toBeGreaterThan(10);
    expect(calls).toHaveLength(0);
    rerender(<ChestBurst playing coinSrc="/coin.webp" />);
    expect(screen.getAllByTestId(/chest-burst-/)).toHaveLength(pieces);
    expect(calls.length).toBeGreaterThan(10);
  });

  it('animates transform only: no opacity, size or position keyframes that would repaint or reflow', () => {
    render(<ChestBurst playing coinSrc="/coin.webp" />);
    for (const { frames } of calls) {
      for (const f of frames) {
        expect(Object.keys(f).filter((k) => k !== 'transform' && k !== 'offset' && k !== 'easing')).toEqual([]);
      }
    }
  });

  it('stays within a short celebration: every one-shot piece is done by 1.6s', () => {
    render(<ChestBurst playing coinSrc="/coin.webp" />);
    for (const { opts } of calls) {
      if (opts.iterations === Infinity) continue;
      expect(Number(opts.delay ?? 0) + Number(opts.duration)).toBeLessThanOrEqual(1600);
    }
  });

  it('stops every animation when it stops playing', () => {
    const { rerender } = render(<ChestBurst playing coinSrc="/coin.webp" />);
    const started = calls.length;
    rerender(<ChestBurst playing={false} coinSrc="/coin.webp" />);
    expect(cancel).toHaveBeenCalledTimes(started);
  });

  it('under reduced motion (OS or the in-app switch, via useEduReducedMotion) shows a still glow and plays nothing', () => {
    motionPref.reduced = true;
    render(<ChestBurst playing coinSrc="/coin.webp" />);
    expect(calls).toHaveLength(0);
    expect(screen.queryAllByTestId(/chest-burst-(coin|bit)/)).toHaveLength(0);
    expect(screen.getByTestId('chest-burst-rays')).toBeInTheDocument();
  });

  it('on a phone or in the app keeps the coins and rays but drops the confetti bits (mobile-web layer flash)', () => {
    overlay.static = true;
    render(<ChestBurst playing coinSrc="/coin.webp" />);
    expect(screen.queryAllByTestId(/chest-burst-bit/)).toHaveLength(0);
    expect(screen.getAllByTestId(/chest-burst-coin/).length).toBeGreaterThan(0);
  });
});
