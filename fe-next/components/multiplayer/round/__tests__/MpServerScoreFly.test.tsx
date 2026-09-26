/**
 * Blast's MP "+N": the number is the SERVER's `wordAccepted.score` (via
 * mpFeedback), drawn by a ROUND-owned overlay beside the board — the shared
 * blast word handler stays untouched and its client fly is switched off.
 */
import React, { Profiler } from 'react';
import { render, screen, act } from '@testing-library/react';
import { recordWordAccepted, resetMpFeedback } from '@/lib/multiplayer/mpFeedback';
import { MpServerScoreFly } from '../MpServerScoreFly';
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

describe('MpServerScoreFly', () => {
  beforeEach(() => { vi.useFakeTimers(); resetMpFeedback(); });
  afterEach(() => vi.useRealTimers());

  it('renders nothing while idle', () => {
    const { container } = render(<MpServerScoreFly />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "+N" with the server score (combo already included), never a client total', () => {
    render(<MpServerScoreFly />);
    act(() => { vi.advanceTimersByTime(1); });
    act(() => recordWordAccepted({ word: 'stare', score: 21, comboLevel: 3 }));
    expect(screen.getByTestId('mp-floater').textContent).toBe('+21');
  });

  it('owns the lastWord subscription: an accept never re-renders the board beside it', () => {
    let boardCommits = 0;
    const Board = React.memo(function Board() { return <div data-testid="board" />; });
    function Round() {
      return (
        <>
          <Profiler id="board" onRender={() => { boardCommits += 1; }}>
            <Board />
          </Profiler>
          <MpServerScoreFly />
        </>
      );
    }
    render(<Round />);
    const before = boardCommits;
    act(() => { vi.advanceTimersByTime(1); });
    act(() => recordWordAccepted({ word: 'moon', score: 6 }));
    act(() => recordWordAccepted({ word: 'bird', score: 4 }));
    expect(screen.getAllByTestId('mp-floater')).toHaveLength(2);
    expect(boardCommits).toBe(before);
  });
});
