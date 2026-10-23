import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen, within } from '@testing-library/react';
import type { VocabQuizReveal, VocabQuizStanding } from '@/shared/types/vocabQuiz';

const pref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => pref.reduced }));

import { RANK_SWAP_DELAY_MS, VocabQuizRankRail, usePreviousRevealStandings } from '../VocabQuizRankRail';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const row = (username: string, score: number): VocabQuizStanding => ({ username, score, streak: 0, bestStreak: 0, correctCount: 0 });
const order = () => screen.getAllByTestId('vq-rail-row').map((r) => r.getAttribute('data-username'));

const before = [row('Maya', 300), row('Leo', 200), row('Noa', 100)];
const after = [row('Noa', 400), row('Maya', 350), row('Leo', 200)];

describe('VocabQuizRankRail', () => {
  beforeEach(() => {
    pref.reduced = false;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('opens on last question\'s order, then swaps into the new one with the climber marked', () => {
    render(<VocabQuizRankRail previous={before} standings={after} t={t} />);
    expect(order()).toEqual(['Maya', 'Leo', 'Noa']);
    act(() => {
      vi.advanceTimersByTime(RANK_SWAP_DELAY_MS);
    });
    expect(order()).toEqual(['Noa', 'Maya', 'Leo']);
    expect(within(screen.getAllByTestId('vq-rail-row')[0]).getByTestId('vq-rail-up')).toHaveTextContent('2');
  });

  it('shows the final order at once under reduced motion or on the first reveal', () => {
    pref.reduced = true;
    const { unmount } = render(<VocabQuizRankRail previous={before} standings={after} t={t} />);
    expect(order()).toEqual(['Noa', 'Maya', 'Leo']);
    unmount();
    pref.reduced = false;
    render(<VocabQuizRankRail previous={null} standings={after} t={t} />);
    expect(order()).toEqual(['Noa', 'Maya', 'Leo']);
    expect(screen.queryByTestId('vq-rail-up')).toBeNull();
  });

  it('calls a close race at the top', () => {
    render(<VocabQuizRankRail previous={null} standings={[row('Maya', 820), row('Leo', 800)]} t={t} />);
    expect(screen.getByTestId('vq-rail-close')).toHaveTextContent('vocabQuiz.rail.closeRace');
  });

  it('shows at most five rows', () => {
    render(<VocabQuizRankRail previous={null} standings={['a', 'b', 'c', 'd', 'e', 'f'].map((n, i) => row(n, 100 - i))} t={t} />);
    expect(screen.getAllByTestId('vq-rail-row')).toHaveLength(5);
  });
});

describe('usePreviousRevealStandings', () => {
  const reveal = (index: number, standings: VocabQuizStanding[]) => ({ index, standings }) as unknown as VocabQuizReveal;

  it('remembers the last reveal across the question phase in between', () => {
    const { result, rerender } = renderHook((r: VocabQuizReveal | null) => usePreviousRevealStandings(r), { initialProps: reveal(0, before) });
    expect(result.current).toBeNull();
    rerender(null);
    rerender(reveal(1, after));
    expect(result.current).toEqual(before);
    rerender(reveal(1, after));
    expect(result.current).toEqual(before);
  });
});
