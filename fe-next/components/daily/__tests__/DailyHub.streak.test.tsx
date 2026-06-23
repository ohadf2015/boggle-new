/**
 * DailyHub header streak:
 *   The "🔥 N" header reads the chest-authoritative streak (useDailyStreak →
 *   all daily modes + freezes, server-computed) — NOT the Word-Hunt-only
 *   localStorage counter — so it can never disagree with the WeeklyChestCard
 *   rendered directly beneath it on the same screen.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/shared/utils/timeFormatting', () => ({ formatTimeHHMMSS: () => '00:00:00' }));

vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-05-18',
  getPuzzleNumber: () => 42,
  getSecondsUntilNextDaily: () => 3600,
  hasPlayedWordHuntToday: () => false,
  hasPlayedWordWheelToday: () => false,
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({ getLastSevenDaysCompletion: () => [] }));
vi.mock('../LastSevenDaysIndicator', () => ({ __esModule: true, default: () => <div /> }));
vi.mock('../WeeklyChestCard', () => ({ __esModule: true, default: () => <div data-testid="weekly-chest" /> }));
vi.mock('../WeeklyChestModal', () => ({ __esModule: true, default: () => null }));

const mockStreak = vi.fn();
vi.mock('@/hooks/useDailyStreak', () => ({ useDailyStreak: () => mockStreak() }));

import DailyHub from '../DailyHub';

describe('DailyHub — header fire icon', () => {
  it('renders the chest-authoritative streak from useDailyStreak', () => {
    mockStreak.mockReturnValue({ streak: 23, loading: false });
    render(<DailyHub />);
    expect(screen.getByText(/🔥\s*23/)).toBeInTheDocument();
  });

  it('hides the fire icon when there is no streak', () => {
    mockStreak.mockReturnValue({ streak: 0, loading: false });
    render(<DailyHub />);
    expect(screen.queryByText(/🔥/)).toBeNull();
  });
});
