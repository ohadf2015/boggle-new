import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const sfx = { playTileSelectSound: vi.fn(), playStreakMilestoneSound: vi.fn() };
const pulseLive = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [false, vi.fn()] }));
vi.mock('@/lib/education/liveHaptics', () => ({ pulseLive: (...a: unknown[]) => pulseLive(...a) }));

import { WaitingWarmUp } from '../WaitingWarmUp';

const t = (k: string) => k;

function tapHot() {
  const hot = screen.getAllByRole('button').find((b) => b.getAttribute('data-hot') === 'true')!;
  fireEvent.click(hot);
}
function tapCold() {
  const cold = screen.getAllByRole('button').find((b) => b.getAttribute('data-hot') === 'false')!;
  fireEvent.click(cold);
}

describe('WaitingWarmUp', () => {
  beforeEach(() => {
    sfx.playTileSelectSound.mockClear();
    sfx.playStreakMilestoneSound.mockClear();
    pulseLive.mockClear();
  });

  it('given a Hebrew name, then the tiles run right to left so the name reads in order, and a Latin name stays left to right', () => {
    const { unmount } = render(<WaitingWarmUp username="נועה" t={t} />);
    expect(screen.getAllByRole('button')[0].parentElement).toHaveAttribute('dir', 'rtl');
    unmount();
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getAllByRole('button')[0].parentElement).toHaveAttribute('dir', 'ltr');
  });

  it('given the lit letter is tapped, then it clicks and buzzes lightly', () => {
    render(<WaitingWarmUp username="Maya" t={t} />);
    tapHot();
    expect(sfx.playTileSelectSound).toHaveBeenCalledTimes(1);
    expect(pulseLive).toHaveBeenCalledWith('valid', false);
    expect(screen.getByTestId('warmup-score')).toHaveTextContent('1');
  });

  it('given a dark letter is tapped, then nothing sounds', () => {
    render(<WaitingWarmUp username="Maya" t={t} />);
    tapCold();
    expect(sfx.playTileSelectSound).not.toHaveBeenCalled();
    expect(pulseLive).not.toHaveBeenCalled();
  });

  it('given five hits in a row, then the streak milestone lands with the big buzz', () => {
    render(<WaitingWarmUp username="Maya" t={t} />);
    for (let i = 0; i < 5; i++) tapHot();
    expect(sfx.playStreakMilestoneSound).toHaveBeenCalledTimes(1);
    expect(pulseLive).toHaveBeenLastCalledWith('big', false);
  });

  it('given a short phone, then the game never hides itself on a viewport query (its parent decides by container)', () => {
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getByTestId('waiting-warmup').className).not.toMatch(/@media/);
  });

  it('given the default card (results page, marketing), then it stays the compact card with no hero counter', () => {
    render(<WaitingWarmUp username="Maya" t={t} />);
    expect(screen.getByTestId('waiting-warmup')).not.toHaveAttribute('data-variant', 'hero');
    expect(screen.queryByTestId('warmup-combo-hero')).toBeNull();
  });

  it('given the lobby hero, then the combo counter is on screen from the first frame and big tiles fill the width', () => {
    render(<WaitingWarmUp username="Maya" t={t} hero />);
    const card = screen.getByTestId('waiting-warmup');
    expect(card).toHaveAttribute('data-variant', 'hero');
    expect(card.className).toMatch(/\bw-full\b/);
    expect(screen.getByTestId('warmup-combo-hero')).toHaveTextContent('0');
    for (const tile of screen.getAllByRole('button')) expect(tile.className).toMatch(/\bh-16\b/);
  });

  it('given the hero, when the lit letter is hit, then that tile bursts and the combo counter climbs', () => {
    render(<WaitingWarmUp username="Maya" t={t} hero />);
    const hot = screen.getAllByRole('button').find((b) => b.getAttribute('data-hot') === 'true')!;
    fireEvent.click(hot);
    expect(hot).toHaveAttribute('data-fx', 'hit');
    expect(screen.getByTestId('warmup-burst')).toBeInTheDocument();
    tapHot();
    expect(screen.getByTestId('warmup-combo-hero')).toHaveTextContent('2');
  });

  it('given the hero, when a dark letter is tapped, then that tile shakes and the combo drops to zero', () => {
    render(<WaitingWarmUp username="Maya" t={t} hero />);
    tapHot();
    const cold = screen.getAllByRole('button').find((b) => b.getAttribute('data-hot') === 'false')!;
    fireEvent.click(cold);
    expect(cold).toHaveAttribute('data-fx', 'miss');
    expect(cold.className).toMatch(/motion-safe:animate-\[lc-tile-shake/);
    expect(screen.getByTestId('warmup-combo-hero')).toHaveTextContent('0');
  });
});
