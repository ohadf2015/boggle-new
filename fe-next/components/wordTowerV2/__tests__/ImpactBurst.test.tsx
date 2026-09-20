import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImpactBurst } from '../rewards/ImpactBurst';
import type { Impact, LandingFx } from '../rewards/useLandingFx';

const t = (key: string) => key;

const fxWith = (impact: Partial<Impact>): LandingFx => ({
  impacts: [{ key: 1, x: 40, y: 120, quality: 'perfect', amount: 0, crate: false, combo: 0, ...impact }],
  arm: vi.fn(),
  report: vi.fn(),
  clear: vi.fn(),
});

/**
 * Tower Bloxx pays a landing with a number ON the block. These pin that every
 * landing carries one — the score it just earned — and that the coins and the
 * streak ride along with it instead of waiting for the end-of-run chest.
 */
describe('ImpactBurst payout chip', () => {
  it('given a landing that scored, when it bursts, then the points show at the impact', () => {
    render(<ImpactBurst t={t} fx={fxWith({ amount: 0 })} counterRef={createRef<HTMLElement>()} canvasClass="" points={176} />);
    expect(screen.getByText('+176')).toBeTruthy();
  });

  it('given coins and a streak, when it bursts, then both ride the same chip', () => {
    render(
      <ImpactBurst t={t} fx={fxWith({ amount: 8, combo: 3 })} counterRef={createRef<HTMLElement>()} canvasClass="" points={50} />,
    );
    expect(screen.getByText('+50')).toBeTruthy();
    expect(screen.getByText('+8')).toBeTruthy();
    expect(screen.getByText('×3')).toBeTruthy();
  });

  it('given coins but no score, when it bursts, then the coins are the headline number', () => {
    render(<ImpactBurst t={t} fx={fxWith({ amount: 12 })} counterRef={createRef<HTMLElement>()} canvasClass="" points={0} />);
    expect(screen.getByText('+12')).toBeTruthy();
  });

  it('given a landing that paid nothing at all, when it bursts, then no number is invented', () => {
    render(<ImpactBurst t={t} fx={fxWith({ amount: 0, quality: 'miss' })} counterRef={createRef<HTMLElement>()} canvasClass="" points={0} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});
