/**
 * Wiring tests: DailyRewardPreview and StreakFreezeIndicator in DailyChallengeLanding
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: React.forwardRef(function MockMotionDiv(props: any, ref: any) { return <div ref={ref} {...props} />; }),
      button: React.forwardRef(function MockMotionButton(props: any, ref: any) { return <button ref={ref} {...props} />; }),
    },
  };
});

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/daily',
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  getWordHuntStatusToday: () => null,
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => 'fp123',
}));

// Mock sub-components that are heavy
vi.mock('./landing/DailyMissionsHeader', () => ({
  DailyMissionsHeader: () => <div data-testid="missions-header" />,
}));
vi.mock('./ScoreGauntletBanner', () => ({
  ScoreGauntletBanner: () => null,
}));
vi.mock('./landing/QuestCard', () => ({
  QuestCard: () => <div data-testid="quest-card" />,
}));
vi.mock('./landing/StreakCounter', () => ({
  StreakCounter: () => <div data-testid="streak-counter" />,
}));
vi.mock('./landing/LeaderboardTeaser', () => ({
  LeaderboardTeaser: () => null,
}));
vi.mock('./landing/ConfettiBackground', () => ({
  ConfettiBackground: () => null,
}));
vi.mock('./landing/FloatingDecorations', () => ({
  FloatingDecorations: () => null,
}));

// Do NOT mock these — we test their presence
// DailyRewardPreview and StreakFreezeIndicator

// Mock dailyRewards lib used by DailyRewardPreview
vi.mock('@/lib/dailyRewards', () => ({
  getRewardForDay: (d: number) => ({ coins: 10, day: d }),
  getRewardCoins: (d: number) => 10 + d,
  getNextMilestone: () => null,
  DAILY_REWARD_SCHEDULE: [],
}));

import { DailyChallengeLanding } from '../DailyChallengeLanding';

describe('DailyChallengeLanding wiring', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ streak: 5, freezeCount: 2 }),
    });
  });

  it('renders DailyRewardPreview', async () => {
    render(<DailyChallengeLanding onSelectWordHunt={vi.fn()} currentLanguage="en" />);
    // DailyRewardPreview has a reward-timeline testid
    expect(screen.getByTestId('reward-timeline')).toBeInTheDocument();
  });

  it('renders StreakFreezeIndicator', async () => {
    render(<DailyChallengeLanding onSelectWordHunt={vi.fn()} currentLanguage="en" />);
    // StreakFreezeIndicator renders freeze-slot-filled or freeze-slot-empty
    const slots = screen.getAllByTestId(/freeze-slot/);
    expect(slots.length).toBeGreaterThan(0);
  });
});
