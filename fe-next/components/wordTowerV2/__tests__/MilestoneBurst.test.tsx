import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MilestoneBurst } from '../rewards/MilestoneBurst';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('MilestoneBurst', () => {
  it('given no milestone, when rendered, then nothing shouts at the player', () => {
    render(<MilestoneBurst t={t} milestone={null} onDone={() => {}} />);
    expect(screen.queryByText('wordTowerV2.milestone.floors')).toBeNull();
  });

  it('given a milestone, when rendered, then the floor count is on screen and read out', () => {
    render(<MilestoneBurst t={t} milestone={{ key: 1, floors: 10 }} onDone={() => {}} reducedMotion />);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('wordTowerV2.milestone.floors')).toBeTruthy();
    expect(screen.getByLabelText('wordTowerV2.milestone.a11y:10')).toBeTruthy();
  });

  it('given a milestone, when its beat is over, then it asks to be cleared (never sticks)', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<MilestoneBurst t={t} milestone={{ key: 2, floors: 5 }} onDone={onDone} reducedMotion />);
    act(() => vi.advanceTimersByTime(1500));
    expect(onDone).toHaveBeenCalledOnce();
  });
});
