import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import WordWheelChallenge from '../WordWheelChallenge';

const practice = { on: false };
vi.mock('@/hooks/usePracticeFlag', () => ({ usePracticeFlag: () => practice.on }));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ setGameActive: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'player-123', display_name: 'P', avatar_emoji: '🎯', avatar_color: '#fff' },
    isAuthenticated: true,
  }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useRegisterHeaderAudioControl: () => undefined,
  useHideNavigation: () => vi.fn(),
}));

const saveWordWheelResultMock = vi.fn();
vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-25',
  getPuzzleNumber: () => 117,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: (...args: unknown[]) => saveWordWheelResultMock(...args),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0, totalDailiesCompleted: 1 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({
    centerLetter: 'A',
    outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'],
    validWords: [],
  }),
}));
vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: () => null,
}));
vi.mock('@/hooks/fastValidateWord', () => ({ fastValidateWord: () => true }));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ canShowAd: false, isDailyLimitReached: false, showAd: vi.fn(), isLoading: false }),
}));

type GameProps = { onComplete: (r: { wordsFound: string[]; score: number; timeSeconds: number }) => void };
let capturedOnComplete: GameProps['onComplete'] | null = null;
vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: (props: GameProps) => {
    capturedOnComplete = props.onComplete;
    return <div data-testid="word-wheel-game" />;
  },
}));

vi.mock('../WordWheelResults', () => ({
  __esModule: true,
  default: () => <div data-testid="word-wheel-results" />,
}));
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="tabbed-daily-leaderboard" />,
}));

beforeEach(() => {
  practice.on = false;
  saveWordWheelResultMock.mockReset();
  capturedOnComplete = null;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (
    url.includes('/check-played/')
      ? new Response(JSON.stringify({ hasPlayed: false }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response('{}', { status: 200 })
  )));
});

afterEach(() => { vi.unstubAllGlobals(); });

async function playToTheBuzzer(timeSeconds: number) {
  render(<WordWheelChallenge />);
  // The practice board re-renders its ready card once while loading settles, so re-query until the tap lands.
  await waitFor(() => {
    fireEvent.click(screen.getByText('daily.play'));
    expect(capturedOnComplete).not.toBeNull();
  });
  await act(async () => {
    capturedOnComplete!({ wordsFound: ['ABC'], score: 12, timeSeconds });
  });
}

describe('WordWheelChallenge — daily flow chrome', () => {
  it('Given the ready card, When it shows, Then the back-to-daily pill is there with no second intro over the card', async () => {
    render(<WordWheelChallenge />);
    await screen.findByText('daily.play');
    expect(screen.getByTestId('back-to-daily')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-intro')).toBeNull();
  });

  it('Given a run in progress, When playing, Then the pill steps aside for the in-game exit', async () => {
    render(<WordWheelChallenge />);
    fireEvent.click(await screen.findByText('daily.play'));
    await screen.findByTestId('word-wheel-game');
    expect(screen.queryByTestId('back-to-daily')).toBeNull();
  });
});

describe('WordWheelChallenge — finish beat', () => {
  it('Given the clock hits zero, When the run ends, Then TIME stamps over the board, the run is already saved, and a tap opens results', async () => {
    await playToTheBuzzer(120);
    expect(screen.getByTestId('wheel-time-up')).toBeInTheDocument();
    expect(screen.queryByTestId('word-wheel-results')).toBeNull();
    expect(saveWordWheelResultMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('wheel-time-up'));
    expect(await screen.findByTestId('word-wheel-results')).toBeInTheDocument();
    expect(screen.queryByTestId('wheel-time-up')).toBeNull();
    expect(screen.getByTestId('back-to-daily')).toBeInTheDocument();
  });

  it('Given a practice run the player ended by hand, When it ends, Then results open straight away', async () => {
    practice.on = true;
    await playToTheBuzzer(0);
    expect(screen.queryByTestId('wheel-time-up')).toBeNull();
    expect(await screen.findByTestId('word-wheel-results')).toBeInTheDocument();
  });
});
