/**
 * Every MP "+N" is the SERVER's `wordAccepted.score` (via mpFeedback): the
 * round frame's floater pool (blast included — the shared blast word handler
 * stays untouched and its client fly is switched off by `serverPointsOnly`).
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { recordWordAccepted, resetMpFeedback } from '@/lib/multiplayer/mpFeedback';
import { useServerFloaters, useFreshLastWord, MAX_FLOATERS, FLOATER_MS } from '../useServerFloaters';

function Probe() {
  const floaters = useServerFloaters(useFreshLastWord());
  return <output data-testid="probe">{floaters.map((f) => f.points).join(',')}</output>;
}

describe('useServerFloaters', () => {
  beforeEach(() => { vi.useFakeTimers(); resetMpFeedback(); });
  afterEach(() => vi.useRealTimers());

  it('pools the server points of accepted words, newest last, at most MAX_FLOATERS', () => {
    render(<Probe />);
    act(() => { vi.advanceTimersByTime(1); });
    for (const score of [3, 5, 8, 13]) act(() => recordWordAccepted({ word: `w${score}`, score }));
    expect(screen.getByTestId('probe').textContent).toBe([3, 5, 8, 13].slice(-MAX_FLOATERS).join(','));
  });

  it('drops each floater after FLOATER_MS', () => {
    render(<Probe />);
    act(() => { vi.advanceTimersByTime(1); });
    act(() => recordWordAccepted({ word: 'cat', score: 7 }));
    expect(screen.getByTestId('probe').textContent).toBe('7');
    act(() => { vi.advanceTimersByTime(FLOATER_MS + 1); });
    expect(screen.getByTestId('probe').textContent).toBe('');
  });

  it('ignores zero-point accepts and events from before it mounted', () => {
    act(() => recordWordAccepted({ word: 'old', score: 9 }));
    act(() => { vi.advanceTimersByTime(5); });
    render(<Probe />);
    act(() => recordWordAccepted({ word: 'zero', score: 0 }));
    expect(screen.getByTestId('probe').textContent).toBe('');
  });
});
