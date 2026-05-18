/**
 * DailyHub played-quest swap:
 *   - When today's quest is unplayed, render the QuestCard with the "play" pill.
 *   - When today's quest is played, replace the QuestCard with the compact
 *     summary card (data-testid=quest-played-summary) that funnels the player
 *     to the daily hub itself instead of nagging them to replay.
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
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/shared/utils/timeFormatting', () => ({
  formatTimeHHMMSS: () => '00:00:00',
}));

// Drive the played flags from the test — the hook returns whatever we tell it.
const playedFlags = { wh: false, ww: false };
vi.mock('@/utils/dailyChallenge', () => ({
  getDailyChallengeDate: () => '2026-05-18',
  getPuzzleNumber: () => 42,
  getSecondsUntilNextDaily: () => 3600,
  hasPlayedWordHuntToday: () => playedFlags.wh,
  hasPlayedWordWheelToday: () => playedFlags.ww,
  getDailyStreak: () => ({ currentStreak: 3 }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  getLastSevenDaysCompletion: () => [],
}));

vi.mock('../LastSevenDaysIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="seven-days" />,
}));

vi.mock('../WeeklyChestCard', () => ({
  __esModule: true,
  default: () => <div data-testid="weekly-chest" />,
}));

vi.mock('../WeeklyChestModal', () => ({
  __esModule: true,
  default: () => null,
}));

import DailyHub from '../DailyHub';

describe('DailyHub — played-quest summary swap', () => {
  beforeEach(() => {
    playedFlags.wh = false;
    playedFlags.ww = false;
  });

  it('shows the playable QuestCard for both quests when neither is played', () => {
    render(<DailyHub />);
    // No summary card present
    expect(screen.queryByTestId('quest-played-summary')).toBeNull();
    // Both "PLAY" pills visible (wordHunt.play key resolves twice — once per quest)
    const playPills = screen.getAllByText('wordHunt.play');
    expect(playPills).toHaveLength(2);
  });

  it('swaps Word Hunt card to summary when Word Hunt is already played', () => {
    playedFlags.wh = true;
    render(<DailyHub />);
    expect(screen.getAllByTestId('quest-played-summary')).toHaveLength(1);
    // Only one play pill remains (the unplayed Word Wheel)
    expect(screen.getAllByText('wordHunt.play')).toHaveLength(1);
  });

  it('swaps both cards to summary when both quests are played', () => {
    playedFlags.wh = true;
    playedFlags.ww = true;
    render(<DailyHub />);
    expect(screen.getAllByTestId('quest-played-summary')).toHaveLength(2);
    expect(screen.queryByText('wordHunt.play')).toBeNull();
  });

  it('summary card links back to /<locale>/daily, not the play route', () => {
    playedFlags.ww = true;
    render(<DailyHub />);
    const summary = screen.getByTestId('quest-played-summary');
    expect(summary.getAttribute('href')).toBe('/en/daily');
  });
});
