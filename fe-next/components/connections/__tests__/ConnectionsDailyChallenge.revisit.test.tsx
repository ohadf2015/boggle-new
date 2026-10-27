/**
 * A finished Word Bridge daily must stay finished: revisiting the page the same
 * UTC day lands on the results screen instead of restarting the chain. Also
 * covers the results-screen hand-off (the pyramid promo is a small secondary
 * link, not a card competing with the next quest) and the onTerminal signal the
 * host uses to drop its in-game chrome.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectionsDailyChallenge from '../ConnectionsDailyChallenge';
import { DAILY_ATTEMPTS_PER_PUZZLE, DAILY_PUZZLE_COUNT } from '@/lib/connections/daily';
import { dailyResultKey } from '@/lib/connections/dailyResultStore';

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({ today: { wordHunt: false, wordWheel: false, wordTower: false, connections: true }, streak: { current: 2, longest: 2 } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAdmin: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ haptic: vi.fn(), customHaptic: vi.fn() }),
  GAME_HAPTICS: { validWord: 10, invalidWord: [1], comboLevelUp: [1] },
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playMatchFoundSound: vi.fn(), playErrorSound: vi.fn(), playVictorySound: vi.fn() }),
}));
const confetti = vi.hoisted(() => ({ fireVictoryConfetti: vi.fn(), fireConfetti: vi.fn() }));
vi.mock('@/utils/confettiUtils', () => confetti);
vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: false, status: 'idle', offer: vi.fn() }),
}));
vi.mock('@/components/ads/ResultsBannerSlot', () => ({ default: () => null }));
vi.mock('@/components/daily/results/NextQuestCta', () => ({
  NextQuestCta: () => <div data-testid="next-quest-cta" />,
}));
const submitDailyScore = vi.fn(async () => null);
const fetchDailyLeaderboard = vi.fn(async () => null);
vi.mock('@/lib/connections/dailyClient', async (orig) => {
  const actual = (await orig()) as object;
  return {
    ...actual,
    todayUTC: () => '2026-05-30',
    getGuestFingerprint: () => 'test-guest',
    advanceClientStreak: () => ({ streak: 1, lastDate: '2026-05-30' }),
    submitDailyScore: (...a: unknown[]) => submitDailyScore(...(a as [])),
    fetchDailyLeaderboard: (...a: unknown[]) => fetchDailyLeaderboard(...(a as [])),
  };
});

function guessWrong() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Z' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'connections.submit' }));
}

function burnWholeRun() {
  for (let p = 0; p < DAILY_PUZZLE_COUNT; p++) {
    for (let i = 0; i < DAILY_ATTEMPTS_PER_PUZZLE; i++) guessWrong();
    fireEvent.click(screen.getByRole('button', { name: /connections\.next/ }));
  }
}

describe('ConnectionsDailyChallenge — finished day stays finished', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('given a finished run, when the page is revisited the same day, then it opens on the results without restarting or re-submitting', async () => {
    const first = render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    await waitFor(() => expect(screen.getByText('connections.daily.completeTough')).toBeTruthy());
    expect(window.localStorage.getItem(dailyResultKey('2026-05-30', 'en'))).not.toBeNull();
    first.unmount();
    submitDailyScore.mockClear();

    render(<ConnectionsDailyChallenge />);

    expect(screen.getByText('connections.daily.completeTough')).toBeTruthy();
    expect(screen.queryByTestId('daily-progress')).toBeNull();
    expect(submitDailyScore).not.toHaveBeenCalled();
    // The board still loads for the restored results.
    await waitFor(() => expect(fetchDailyLeaderboard).toHaveBeenCalled());
  });

  it('given a result stored for a different day, then a fresh run starts', () => {
    window.localStorage.setItem(
      dailyResultKey('2026-05-29', 'en'),
      JSON.stringify({ kind: 'regular', score: 5, solvedCount: 1, outcomes: [], streak: 1, rank: null }),
    );
    render(<ConnectionsDailyChallenge />);
    expect(screen.getByTestId('daily-progress')).toBeTruthy();
  });

  it('given the run ends, then the host is told it is terminal (also on a restored revisit)', async () => {
    const onTerminal = vi.fn();
    const first = render(<ConnectionsDailyChallenge onTerminal={onTerminal} />);
    expect(onTerminal).not.toHaveBeenCalled();
    burnWholeRun();
    await waitFor(() => expect(onTerminal).toHaveBeenCalled());
    first.unmount();

    const again = vi.fn();
    render(<ConnectionsDailyChallenge onTerminal={again} />);
    expect(again).toHaveBeenCalled();
  });

  it('given the results screen, the pyramid promo is a small secondary text link below the next quest, not a card', async () => {
    render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    const link = await screen.findByTestId('pyramid-cta');
    expect(link.className).not.toMatch(/shadow-hard|border-neo-thick|p-4/);
    expect(link.className).toMatch(/text-(xs|sm)/);
    // Next quest stays first in document order.
    const cta = screen.getByTestId('next-quest-cta');
    expect(cta.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given a finished run, then the shared daily hero leads the results (live and restored) and the game fires no confetti of its own', async () => {
    const first = render(<ConnectionsDailyChallenge />);
    burnWholeRun();
    const hero = await screen.findByTestId('daily-results-hero');
    expect(hero.getAttribute('data-mode')).toBe('connections');
    expect(hero.getAttribute('data-outcome')).toBe('loss');
    expect(screen.queryByTestId('back-button')).toBeNull();
    expect(confetti.fireVictoryConfetti).not.toHaveBeenCalled();
    first.unmount();

    render(<ConnectionsDailyChallenge />);
    expect(screen.getByTestId('daily-results-hero').getAttribute('data-outcome')).toBe('loss');
  });
});
