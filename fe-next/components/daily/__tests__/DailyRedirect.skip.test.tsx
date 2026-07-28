/**
 * DailyRedirect auto-advances a RETURNING player past the /daily selection hub
 * straight into their next unplayed quest ("just start the challenge"), while
 * first-timers still see the hub. The skip is client-side (crawlers keep the
 * SSR SEO) and once-per-session. See utils/dailyChallenge/landingRedirect.ts.
 */
import { render, screen, waitFor } from '@testing-library/react';
import DailyRedirect from '../DailyRedirect';

const replace = vi.fn();
const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace, push })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/components/Header', () => ({ default: () => <div>HEADER</div> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>LOADING</div> }));
vi.mock('../DailyChallengeLanding', () => ({
  DailyChallengeLanding: () => <div data-testid="daily-landing">LANDING</div>,
}));

const status = {
  hasPlayed: false,
  hasSolved: null,
  currentStreak: 0,
  longestStreak: 0,
  puzzleNumber: 0,
  puzzleDate: '',
  loading: false,
  fromServer: false,
  refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => status,
}));

const storage = { wordWheelPlayed: false, allResults: [] as unknown[] };
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: () => storage.wordWheelPlayed,
  getAllDailyResults: () => storage.allResults,
}));

describe('DailyRedirect — returning-player hub skip', () => {
  beforeEach(() => {
    replace.mockClear();
    push.mockClear();
    sessionStorage.clear();
    Object.assign(status, { hasPlayed: false, currentStreak: 0, longestStreak: 0, loading: false });
    Object.assign(storage, { wordWheelPlayed: false, allResults: [] });
  });

  it('keeps the hub for a first-time player (no history)', async () => {
    render(<DailyRedirect />);
    expect(await screen.findByTestId('daily-landing')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends a returning player (past streak) straight into Word Hunt', async () => {
    status.longestStreak = 5;
    render(<DailyRedirect />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/daily/word-hunt'));
    expect(screen.queryByTestId('daily-landing')).not.toBeInTheDocument();
  });

  it('sends a returning player who already did Word Hunt today into Word Wheel', async () => {
    status.longestStreak = 5;
    status.hasPlayed = true; // Word Hunt done today
    render(<DailyRedirect />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/daily/word-wheel'));
  });

  it('does not skip again once the session flag is set (returner can reach the hub)', async () => {
    sessionStorage.setItem('lc_daily_hub_skipped', '1');
    status.longestStreak = 5;
    render(<DailyRedirect />);
    expect(await screen.findByTestId('daily-landing')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
