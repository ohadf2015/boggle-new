import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ImpactBurst } from '../rewards/ImpactBurst';
import type { Impact, LandingFx } from '../rewards/useLandingFx';

const t = (key: string) => key;

const fxWith = (impact: Partial<Impact>): LandingFx => ({
  impacts: [{ key: 1, x: 40, y: 120, quality: 'perfect', amount: 4, crate: false, combo: 0, ...impact }],
  arm: vi.fn(),
  report: vi.fn(),
  clear: vi.fn(),
});

const CHIP_W = 240;
const CHIP_H = 60;

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(CHIP_W);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(CHIP_H);
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const chipBox = () => document.querySelector('[data-wt2-payout-box]') as HTMLElement | null;

describe('ImpactBurst never clips', () => {
  it('given a burst, then it draws in a fixed viewport layer with no clipping ancestor inside the component', () => {
    const { container } = render(
      <ImpactBurst t={t} fx={fxWith({})} counterRef={createRef<HTMLElement>()} canvasClass="absolute inset-0" points={90} />,
    );
    const layer = document.querySelector('[data-wt2-burst-layer]');
    expect(layer?.className).toMatch(/\bfixed\b/);
    let el: Element | null = chipBox();
    expect(el).toBeTruthy();
    while (el && el !== container.parentElement) {
      expect(el.className?.toString() ?? '').not.toMatch(/overflow-hidden/);
      el = el.parentElement;
    }
  });

  it('given the run\'s very first landing at the left edge, then the whole chip is kept on screen', () => {
    render(
      <ImpactBurst t={t} fx={fxWith({ x: 2, y: 400 })} counterRef={createRef<HTMLElement>()} canvasClass="" points={1234} />,
    );
    const box = chipBox();
    expect(box).toBeTruthy();
    const left = Number.parseFloat(box!.style.left);
    expect(left).toBeGreaterThanOrEqual(0);
  });

  it('given a landing at the right edge, then the chip does not run past the viewport', () => {
    render(
      <ImpactBurst
        t={t}
        fx={fxWith({ x: window.innerWidth - 3, y: 400 })}
        counterRef={createRef<HTMLElement>()}
        canvasClass=""
        points={1234}
      />,
    );
    const centre = Number.parseFloat(chipBox()!.style.left) + CHIP_W / 2;
    expect(centre + (CHIP_W * 1.35) / 2).toBeLessThanOrEqual(window.innerWidth);
  });

  it('given a landing at the very top, then the chip drops below the top edge', () => {
    render(<ImpactBurst t={t} fx={fxWith({ x: 300, y: 0 })} counterRef={createRef<HTMLElement>()} canvasClass="" points={10} />);
    expect(Number.parseFloat(chipBox()!.style.top)).toBeGreaterThanOrEqual(0);
  });
});
