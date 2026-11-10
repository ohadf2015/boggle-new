import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StreakCard, type StreakCardView } from '../StreakCard';
import { weekStrip } from '@/lib/daily/streakRewards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  }),
}));

const TODAY = '2026-11-12';
const base: StreakCardView = {
  current: 6,
  playedToday: false,
  atRisk: true,
  freezes: 1,
  isGuest: false,
  week: weekStrip(['2026-11-09', '2026-11-10', '2026-11-11'], [], TODAY),
  milestone: { claimable: null, next: { days: 7, coins: 60, remaining: 1, from: 3 } },
};

describe('StreakCard', () => {
  it('Given the streak is at risk, says to play today to keep it', () => {
    render(<StreakCard view={base} />);
    expect(screen.getByTestId('streak-at-risk')).toHaveTextContent('dailyStreak.flame.atRisk:6');
    expect(screen.getAllByTestId('streak-flame')[0]).toHaveAttribute('data-mood', 'worried');
  });

  it('Given today is played, says the streak is safe', () => {
    render(<StreakCard view={{ ...base, atRisk: false, playedToday: true, current: 7 }} />);
    expect(screen.queryByTestId('streak-at-risk')).toBeNull();
    expect(screen.getByTestId('streak-safe')).toBeInTheDocument();
  });

  it('shows the next reward as a progress bar from the last milestone', () => {
    render(<StreakCard view={base} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '7');
    expect(bar).toHaveAttribute('aria-valuenow', '6');
    expect(screen.getByTestId('streak-next-reward')).toHaveTextContent('dailyStreak.flame.toGo:1');
    expect(screen.getByTestId('streak-next-reward')).toHaveTextContent('+60');
  });

  it('Given a reward is ready, offers a claim button instead of the bar', () => {
    const onClaim = vi.fn();
    render(<StreakCard view={{ ...base, current: 7, milestone: { claimable: { days: 7, coins: 60 }, next: null } }} onClaim={onClaim} />);
    fireEvent.click(screen.getByTestId('streak-claim'));
    expect(onClaim).toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('Given rewards are unavailable, shows no reward row at all', () => {
    render(<StreakCard view={{ ...base, milestone: null }} />);
    expect(screen.queryByTestId('streak-next-reward')).toBeNull();
    expect(screen.queryByTestId('streak-claim')).toBeNull();
  });

  it('lays out the week with today marked', () => {
    render(<StreakCard view={base} />);
    const cells = within(screen.getByTestId('streak-week')).getAllByTestId('streak-week-day');
    expect(cells.map((c) => c.getAttribute('data-state'))).toEqual(['played', 'played', 'played', 'today', 'future', 'future', 'future']);
    expect(cells[3]).toHaveAttribute('aria-current', 'date');
  });

  it('opens the freeze sheet from the freeze count', () => {
    const onOpenFreezes = vi.fn();
    render(<StreakCard view={base} onOpenFreezes={onOpenFreezes} />);
    const button = screen.getByTestId('streak-freezes');
    expect(button).toHaveTextContent('1/2');
    fireEvent.click(button);
    expect(onOpenFreezes).toHaveBeenCalled();
  });
});
