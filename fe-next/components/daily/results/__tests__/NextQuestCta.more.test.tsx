import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextQuestCta } from '../NextQuestCta';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { markDailyHandoff } from '@/components/daily/flow/dailyHandoff';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/components/daily/flow/dailyHandoff', async (orig) => ({
  ...(await orig<typeof import('@/components/daily/flow/dailyHandoff')>()),
  markDailyHandoff: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/daily/word-wheel',
  useSearchParams: () => new URLSearchParams(),
}));

const playedStatus = {
  today: { wordHunt: false, wordWheel: true, wordTower: false, connections: false },
  streak: { current: 1, longest: 1 },
  allCompletedDates: [],
  freezeCount: 0,
  loading: false,
  fromServer: true,
  freezeApplied: undefined,
  refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => playedStatus }));

function renderCta(props: Partial<React.ComponentProps<typeof NextQuestCta>> = {}) {
  return render(
    <LanguageProvider initialLanguage="en">
      <NextQuestCta justFinished="word-wheel" currentLanguage="en" source="word_wheel_results" {...props} />
    </LanguageProvider>,
  );
}

describe('NextQuestCta: every other unfinished challenge + the way back', () => {
  beforeEach(() => {
    vi.mocked(trackGrowthEvent).mockClear();
    vi.mocked(markDailyHandoff).mockClear();
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: false, connections: false };
    playedStatus.loading = false;
  });

  it('lists the unfinished challenges besides the headline one', () => {
    renderCta();
    expect(screen.getByTestId('next-quest-cta')).toHaveAttribute('data-next-mode', 'word-hunt');
    const more = screen.getByTestId('next-quest-more');
    const modes = within(more).getAllByTestId('next-quest-more-mode').map((a) => a.getAttribute('data-mode'));
    expect(modes).toEqual(['connections', 'word-tower']);
    expect(within(more).getByRole('link', { name: /bridge/i })).toHaveAttribute('href', '/en/connections/daily');
  });

  it('always offers the way back to the daily page', () => {
    renderCta();
    expect(screen.getByTestId('next-quest-back')).toHaveAttribute('href', '/en/daily');
    expect(screen.getByTestId('next-quest-back')).toHaveTextContent('Back to daily');
  });

  it('shows only the back link when the headline is the last one left', () => {
    playedStatus.today = { wordHunt: false, wordWheel: true, wordTower: true, connections: true };
    renderCta();
    expect(screen.queryAllByTestId('next-quest-more-mode')).toHaveLength(0);
    expect(screen.getByTestId('next-quest-back')).toBeInTheDocument();
  });

  it('adds nothing when the day is clear: the all-clear row already leads back', () => {
    playedStatus.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    renderCta();
    expect(screen.getByTestId('next-quest-all-clear')).toHaveAttribute('href', '/en/daily');
    expect(screen.queryByTestId('next-quest-more')).not.toBeInTheDocument();
  });

  it('a pick from the list hands off like the headline does', async () => {
    renderCta();
    const tower = screen.getAllByTestId('next-quest-more-mode').find((a) => a.dataset.mode === 'word-tower')!;
    await userEvent.click(tower);
    expect(markDailyHandoff).toHaveBeenCalledWith('word-tower');
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'cross_promo_click',
      expect.objectContaining({ target: 'word-tower', source: 'word_wheel_results', placement: 'next_quest_more' }),
    );
  });

  it('reserves the list row while the play state loads', () => {
    playedStatus.loading = true;
    renderCta();
    expect(screen.getByTestId('next-quest-more-loading')).toBeInTheDocument();
    expect(screen.getByTestId('next-quest-back')).toHaveAttribute('href', '/en/daily');
  });

  it('compact placements skip the list', () => {
    renderCta({ compact: true });
    expect(screen.getByTestId('next-quest-cta')).toBeInTheDocument();
    expect(screen.queryByTestId('next-quest-more')).not.toBeInTheDocument();
  });
});
