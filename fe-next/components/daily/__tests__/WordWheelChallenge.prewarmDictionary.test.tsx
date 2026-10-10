import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const { pushSpy, prewarmSpy } = vi.hoisted(() => ({ pushSpy: vi.fn(), prewarmSpy: vi.fn(() => Promise.resolve()) }));

vi.mock('@/hooks/useDictionaryCache', () => ({ prewarmDictionary: prewarmSpy }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => null;
    Stub.displayName = 'DynamicStub';
    return Stub;
  },
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div> }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Stable router spy (overrides the global next/navigation mock).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/en/daily/word-wheel',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

const DICT: Record<string, string> = {
  'daily.play': 'Play',
  'daily.quitConfirmTitle': 'Leave mid-game?',
  'wordHunt.quitConfirmMessage': 'Your progress will be lost!',
  'daily.imSure': 'Leave anyway',
  'common.cancel': 'Cancel',
  'common.quit': 'Quit',
};
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => DICT[k] ?? k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ setGameActive: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null, isAuthenticated: false }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackModalInteraction: vi.fn() }));

vi.mock('@/utils/dailyChallenge', () => ({
  hasEverPlayedWordWheel: () => false,
  getDailyChallengeDate: () => '2026-04-15',
  getPuzzleNumber: () => 42,
  hasPlayedWordWheelToday: () => false,
  getTodaysWordWheelResult: () => null,
  saveWordWheelResult: vi.fn(),
  hasPlayedWordHuntToday: () => false,
  getDailyStreak: () => ({ currentStreak: 0 }),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1, longestStreak: 1, lastPlayedDate: null, totalDailiesCompleted: 1 })),
}));
vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  generateWordWheelPuzzle: () => ({ centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: [] }),
}));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => 'test-fp' }));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ showAd: vi.fn(), isAdAvailable: false, isPlaceholderCooldown: false }),
}));

// WordWheelGame stub that surfaces the onExit prop the fix threads through.
vi.mock('../WordWheelGame', () => ({
  __esModule: true,
  default: (props: { onExit?: () => void }) => (
    <button data-testid="wheel-exit-trigger" onClick={() => props.onExit?.()}>go</button>
  ),
}));
vi.mock('../WordWheelResults', () => ({ __esModule: true, default: () => <div data-testid="word-wheel-results" /> }));
vi.mock('../TabbedDailyLeaderboard', () => ({ __esModule: true, default: () => <div data-testid="tabbed-daily-leaderboard" /> }));

import WordWheelChallenge from '../WordWheelChallenge';

describe('WordWheelChallenge — dictionary warm-up', () => {
  beforeEach(() => prewarmSpy.mockClear());

  it('given the ready screen, then the dictionary starts warming before the first word', async () => {
    render(<WordWheelChallenge />);
    await waitFor(() => screen.getByText('Play'));
    await waitFor(() => expect(prewarmSpy).toHaveBeenCalledWith('en'), { timeout: 4000 });
  });

  it('given the player starts, then the wheel language dictionary is warmed so words verify without a round trip', async () => {
    render(<WordWheelChallenge />);
    fireEvent.click(await waitFor(() => screen.getByText('Play')));
    await waitFor(() => screen.getByTestId('wheel-exit-trigger'));
    await waitFor(() => expect(prewarmSpy).toHaveBeenCalledWith('en'));
  });
});
