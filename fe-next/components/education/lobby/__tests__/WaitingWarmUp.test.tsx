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
});
