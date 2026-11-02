import React from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyResultsHero } from '../DailyResultsHero';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { DailyRevealProvider } from '../reveal/DailyRevealContext';

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

  it('Given the score post may still be landing, When the hero has been up a moment, Then it re-asks the server once so streak and trail catch up', () => {
    vi.useFakeTimers();
    renderHero();
    expect(playedStatus.refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(playedStatus.refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    expect(playedStatus.refresh).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('Given the score post has not landed yet, When the hero renders, Then the mode just finished already reads done', () => {
    renderHero({ mode: 'connections' });
    expect(screen.getByTestId('daily-trail-connections')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('daily-trail-count')).toHaveTextContent('3/4');
  });

  describe('with motion allowed', () => {
    beforeEach(() => {
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    });

    it('Given a fresh finish, When the player taps the hero mid-reveal, Then the sequence settles at once', () => {
      vi.useFakeTimers();
      renderHero({ celebrate: true });
      const hero = screen.getByTestId('daily-results-hero');
      expect(hero).toHaveAttribute('data-reveal', 'playing');
      fireEvent.click(hero);
      expect(hero).toHaveAttribute('data-reveal', 'done');
      expect(screen.getByTestId('daily-results-score')).toHaveTextContent('420');
      vi.useRealTimers();
    });

    it('Given a revisit, Then the hero renders settled with no skip affordance', () => {
      renderHero({ celebrate: false });
      expect(screen.getByTestId('daily-results-hero')).toHaveAttribute('data-reveal', 'done');
      expect(screen.getByTestId('daily-results-score')).toHaveTextContent('420');
    });

    it('Given a screen that mounts the hero twice (mobile + desktop), Then a fresh win fires confetti once', () => {
      vi.useFakeTimers();
      render(
        <LanguageProvider initialLanguage="en">
          <DailyRevealProvider celebrate>
            <DailyResultsHero mode="word-hunt" outcome="win" headline="Solved!" score={420} celebrate />
            <DailyResultsHero mode="word-hunt" outcome="win" headline="Solved!" score={420} celebrate />
          </DailyRevealProvider>
        </LanguageProvider>,
      );
      act(() => { vi.advanceTimersByTime(3000); });
      vi.useRealTimers();
      expect(fireConfetti).toHaveBeenCalledTimes(1);
    });

    it('Given StrictMode, Then a fresh win still fires confetti', () => {
      vi.useFakeTimers();
      render(
        <React.StrictMode>
          <LanguageProvider initialLanguage="en">
            <DailyResultsHero mode="word-hunt" outcome="win" headline="Solved!" score={420} celebrate />
          </LanguageProvider>
        </React.StrictMode>,
      );
      act(() => { vi.advanceTimersByTime(1000); });
      vi.useRealTimers();
      expect(fireConfetti).toHaveBeenCalledTimes(1);
    });
  });
});

describe('DailyResultsHero remounted after the reveal (tab switch)', () => {
  it('Given the shared reveal already finished, When the hero remounts, Then it renders settled with no confetti', () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    function Screen({ tab }: { tab: number }) {
      return (
        <LanguageProvider initialLanguage="en">
          <DailyRevealProvider celebrate>
            {tab === 0 ? <DailyResultsHero key="a" mode="word-hunt" outcome="win" headline="Solved!" score={420} celebrate /> : <div />}
          </DailyRevealProvider>
        </LanguageProvider>
      );
    }
    const { rerender } = render(<Screen tab={0} />);
    act(() => { vi.advanceTimersByTime(3000); });
    vi.mocked(fireConfetti).mockClear();
    rerender(<Screen tab={1} />);
    rerender(<Screen tab={0} />);
    const hero = screen.getByTestId('daily-results-hero');
    expect(hero).toHaveAttribute('data-reveal', 'done');
    expect(screen.getByTestId('daily-results-score')).toHaveTextContent('420');
    act(() => { vi.advanceTimersByTime(3000); });
    vi.useRealTimers();
    expect(fireConfetti).not.toHaveBeenCalled();
  });
});
