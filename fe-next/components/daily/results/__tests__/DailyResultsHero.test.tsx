import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyResultsHero } from '../DailyResultsHero';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/daily/word-hunt',
  useSearchParams: () => new URLSearchParams(),
}));

const playedStatus = {
  today: { wordHunt: true, wordWheel: true, wordTower: false, connections: false },
  streak: { current: 4, longest: 9 },
  allCompletedDates: [],
  freezeCount: 0,
  loading: false,
  fromServer: true,
  freezeApplied: undefined,
  refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => playedStatus }));

function renderHero(props: Partial<React.ComponentProps<typeof DailyResultsHero>> = {}) {
  return render(
    <LanguageProvider initialLanguage="en">
      <DailyResultsHero mode="word-hunt" outcome="win" headline="Solved!" score={420} {...props} />
    </LanguageProvider>,
  );
}

describe('DailyResultsHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('Given a finished mode, When the hero renders, Then it names the mode from the shared registry and shows the outcome', () => {
    renderHero();
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero).toHaveAttribute('data-mode', 'word-hunt');
    expect(hero).toHaveAttribute('data-outcome', 'win');
    expect(within(hero).getByText('Word Hunt')).toBeInTheDocument();
    expect(within(hero).getByRole('heading', { name: 'Solved!' })).toBeInTheDocument();
    expect(within(hero).getByTestId('daily-results-score')).toHaveTextContent('420');
  });

  it('Given today has two modes played, When the hero renders, Then the quest trail marks them done in hub order', () => {
    renderHero();
    const steps = screen.getAllByTestId(/^daily-trail-(word|connections)/);
    expect(steps.map(s => s.getAttribute('data-testid'))).toEqual([
      'daily-trail-word-wheel', 'daily-trail-word-hunt', 'daily-trail-connections', 'daily-trail-word-tower',
    ]);
    expect(steps.map(s => s.getAttribute('data-state'))).toEqual(['done', 'done', 'todo', 'todo']);
    expect(screen.getByTestId('daily-trail-count')).toHaveTextContent('2/4');
  });

  it('Given a live streak, When the hero renders, Then the streak comes from the same played-status source the hub uses', () => {
    renderHero();
    expect(screen.getByTestId('daily-results-streak')).toHaveTextContent('4');
  });

  it('Given mode stats, When the hero renders, Then every stat cell shows value and label', () => {
    renderHero({ stats: [{ value: 3, label: 'Tries' }, { value: 'CRANE', label: 'Target' }] });
    const cells = screen.getAllByTestId('daily-results-stat');
    expect(cells).toHaveLength(2);
    expect(cells[1]).toHaveTextContent('CRANE');
    expect(cells[1]).toHaveTextContent('Target');
  });

  it('Given a fresh win, When the hero mounts, Then it celebrates exactly once', () => {
    vi.useFakeTimers();
    const { rerender } = renderHero({ celebrate: true });
    rerender(
      <LanguageProvider initialLanguage="en">
        <DailyResultsHero mode="word-hunt" outcome="win" headline="Solved!" score={420} celebrate />
      </LanguageProvider>,
    );
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    expect(fireConfetti).toHaveBeenCalledTimes(1);
  });

  it('Given a loss or a revisit, When the hero mounts, Then there is no confetti', () => {
    vi.useFakeTimers();
    renderHero({ outcome: 'loss', celebrate: true });
    renderHero({ outcome: 'win', celebrate: false });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    expect(fireConfetti).not.toHaveBeenCalled();
  });
});
