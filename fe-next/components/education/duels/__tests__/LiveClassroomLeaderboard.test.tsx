/**
 * LiveClassroomLeaderboard — the live standings a classroom sees mid-round.
 *
 *  - projector: the room's top N, biggest first, re-sorted as scores move
 *  - phone:     me and the classmate on either side — never an absolute place
 *
 * The data is the server's leaderboard payload; this component only sorts and
 * celebrates it. A score going UP is a correct answer somewhere in the room:
 * that row bursts, pops "+N" and plays the mode sting. A score that was
 * already there on first paint (a refresh restoring the board) is not news.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LiveClassroomLeaderboard, { type LiveBoardEntry } from '../LiveClassroomLeaderboard';

const playModeSound = vi.fn();
vi.mock('@/hooks/useModeSting', () => ({ useModeSting: () => ({ playModeSound }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));
vi.mock('@/components/motion/BoundedConfettiBurst', () => ({
  BoundedConfettiBurst: ({ trigger, children }: { trigger: boolean; children: React.ReactNode }) => (
    <div data-testid="burst" data-trigger={String(trigger)}>{children}</div>
  ),
}));

const board = (...rows: Array<[string, number, boolean?]>): LiveBoardEntry[] =>
  rows.map(([username, score, isHost]) => ({ username, score, isHost: !!isHost }));

const rowNames = () => screen.getAllByTestId('live-board-row').map((r) => r.getAttribute('data-player'));

describe('LiveClassroomLeaderboard — projector', () => {
  beforeEach(() => {
    playModeSound.mockClear();
    vi.useRealTimers();
  });

  it('shows the top N biggest first, with places 1..N', () => {
    render(
      <LiveClassroomLeaderboard
        variant="projector"
        topN={3}
        leaderboard={board(['Bo', 20], ['Ada', 90], ['Cy', 50], ['Di', 10])}
      />
    );
    expect(rowNames()).toEqual(['Ada', 'Cy', 'Bo']);
    expect(screen.getAllByTestId('live-board-rank').map((r) => r.textContent)).toEqual(['1', '2', '3']);
  });

  it('never lists the host — the teacher is projecting, not playing', () => {
    render(<LiveClassroomLeaderboard variant="projector" leaderboard={board(['Teacher', 0, true], ['Ada', 5])} />);
    expect(rowNames()).toEqual(['Ada']);
  });

  it('re-sorts on an overtake', () => {
    const { rerender } = render(
      <LiveClassroomLeaderboard variant="projector" leaderboard={board(['Ada', 30], ['Bo', 20])} />
    );
    expect(rowNames()).toEqual(['Ada', 'Bo']);
    rerender(<LiveClassroomLeaderboard variant="projector" leaderboard={board(['Ada', 30], ['Bo', 45])} />);
    expect(rowNames()).toEqual(['Bo', 'Ada']);
  });

  it('bursts, pops "+N" and stings on the row whose score went up', () => {
    const { rerender } = render(
      <LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 30], ['Bo', 20])} />
    );
    rerender(
      <LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 30], ['Bo', 28])} />
    );
    const bo = screen.getAllByTestId('live-board-row').find((r) => r.getAttribute('data-player') === 'Bo')!;
    expect(bo.closest('[data-testid="burst"]')!.getAttribute('data-trigger')).toBe('true');
    expect(screen.getByTestId('live-board-pop').textContent).toBe('+8');
    expect(playModeSound).toHaveBeenCalledWith('classic', 'start');
  });

  it('does not celebrate scores that were already there on first paint (refresh restore)', () => {
    render(<LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 30])} />);
    expect(screen.queryByTestId('live-board-pop')).toBeNull();
    expect(playModeSound).not.toHaveBeenCalled();
  });

  it('stings at most once per burst window when a whole class scores at once', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 1], ['Bo', 1])} />
    );
    rerender(<LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 2], ['Bo', 1])} />);
    rerender(<LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 2], ['Bo', 3])} />);
    expect(playModeSound).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(2000); });
    rerender(<LiveClassroomLeaderboard variant="projector" gameMode="classic" leaderboard={board(['Ada', 9], ['Bo', 3])} />);
    expect(playModeSound).toHaveBeenCalledTimes(2);
  });
});

describe('LiveClassroomLeaderboard — pops expire', () => {
  it('clears an earlier "+N" even when another score lands before it expires', () => {
    // Measured live: Bo scoring 300ms after Ada cancelled Ada's clear-timer, and
    // her "+220" stayed on the projector for the rest of the round.
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <LiveClassroomLeaderboard variant="projector" leaderboard={board(['Ada', 0], ['Bo', 0])} />
      );
      rerender(<LiveClassroomLeaderboard variant="projector" leaderboard={board(['Ada', 220], ['Bo', 0])} />);
      act(() => { vi.advanceTimersByTime(300); });
      rerender(<LiveClassroomLeaderboard variant="projector" leaderboard={board(['Ada', 220], ['Bo', 389])} />);
      act(() => { vi.advanceTimersByTime(700); });
      const pops = screen.queryAllByTestId('live-board-pop').map((p) => p.textContent);
      expect(pops).toEqual(['+389']);
      act(() => { vi.advanceTimersByTime(400); });
      expect(screen.queryAllByTestId('live-board-pop')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('LiveClassroomLeaderboard — phone', () => {
  beforeEach(() => playModeSound.mockClear());

  it('shows me with the classmate just above and just below, and no absolute place', () => {
    render(
      <LiveClassroomLeaderboard
        variant="phone"
        currentPlayer="Cy"
        leaderboard={board(['Ada', 90], ['Bo', 70], ['Cy', 50], ['Di', 30], ['Ed', 10])}
      />
    );
    expect(rowNames()).toEqual(['Bo', 'Cy', 'Di']);
    expect(screen.queryByTestId('live-board-rank')).toBeNull();
    expect(document.body.textContent).not.toMatch(/#\d/);
    const me = screen.getAllByTestId('live-board-row').find((r) => r.getAttribute('data-player') === 'Cy')!;
    expect(me.getAttribute('data-me')).toBe('true');
  });

  it('stings only for MY correct answer, not a classmate’s', () => {
    const { rerender } = render(
      <LiveClassroomLeaderboard variant="phone" currentPlayer="Cy" gameMode="classic" leaderboard={board(['Bo', 70], ['Cy', 50])} />
    );
    rerender(<LiveClassroomLeaderboard variant="phone" currentPlayer="Cy" gameMode="classic" leaderboard={board(['Bo', 75], ['Cy', 50])} />);
    expect(playModeSound).not.toHaveBeenCalled();
    rerender(<LiveClassroomLeaderboard variant="phone" currentPlayer="Cy" gameMode="classic" leaderboard={board(['Bo', 75], ['Cy', 60])} />);
    expect(playModeSound).toHaveBeenCalledWith('classic', 'start');
  });

  it('renders nothing when I am not on the board yet', () => {
    const { container } = render(
      <LiveClassroomLeaderboard variant="phone" currentPlayer="Zed" leaderboard={board(['Ada', 1])} />
    );
    expect(container.textContent).toBe('');
  });
});
