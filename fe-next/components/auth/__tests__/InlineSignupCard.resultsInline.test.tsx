/**
 * InlineSignupCard — results_inline surface (after #1247 soft sheet FAIL).
 * Gate: visible only after growth:game_completed, never mid-round, guests only;
 * shown/clicked carry source=results_inline; tap latches signup attribution.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import InlineSignupCard from '../InlineSignupCard';
import {
  __resetGameCompletedSignalForTests,
  consumeSignupSource,
  markGameCompletedSignal,
  SIGNUP_SOURCE_PENDING_KEY,
} from '@/utils/growthTracking';
import {
  RESULTS_INLINE_DAILY_CAP,
  __resetResultsInlineCapForTests,
  getResultsInlineImpressionCount,
  resultsInlineCapKey,
} from '@/utils/signupImpressionCap';
import { markGameActive, markGameInactive } from '@/utils/abandonOnPagehide';
import { hasResultsInlineShownThisSession } from '@/lib/auth/signupPromptCoordination';

const { mockTrack, mockClicked } = vi.hoisted(() => ({ mockTrack: vi.fn(), mockClicked: vi.fn() }));

vi.mock('@/utils/growthTracking', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/growthTracking')>();
  return { ...actual, trackGrowthEvent: mockTrack, trackSignupPromptClicked: mockClicked };
});

vi.mock('../../../lib/supabase', () => ({ signInWithGoogle: vi.fn(), signInWithDiscord: vi.fn(), supabase: null }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, p?: Record<string, unknown>) => (key === 'auth.signInWith' && p?.provider ? `Sign in with ${p.provider}` : key), language: 'en' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, showAuthPrompt: vi.fn() }) }));
vi.mock('../../../utils/guestManager', () => ({ getGuestStatsSummary: () => ({ gamesPlayed: 2, totalScore: 120 }) }));
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/utils/platform', () => ({ isNative: () => false, isEdgeBrowser: () => false }));
vi.mock('@/utils/nativeOAuth', () => ({ performNativeOAuth: vi.fn(), initializeNativeOAuth: vi.fn().mockResolvedValue(false), isNativeOAuthAvailable: () => false }));
vi.mock('@/utils/mobileOAuth', () => ({ performMobileOAuth: vi.fn() }));
vi.mock('framer-motion', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const strip = (tag: string) => React.forwardRef(function M({ children, ...props }: any, ref: any) {
    const { initial, animate, transition, exit, whileHover, whileTap, ...rest } = props;
    return React.createElement(tag, { ref, ...rest }, children);
  });
  return { m: { div: strip('div'), li: strip('li'), section: strip('section') }, AnimatePresence: ({ children }: any) => children };
});

const shownCalls = () => mockTrack.mock.calls.filter(([e]) => e === 'signup_prompt_shown');

describe('InlineSignupCard results_inline', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    mockClicked.mockClear();
    __resetGameCompletedSignalForTests();
    __resetResultsInlineCapForTests();
    markGameInactive();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders nothing and emits nothing before game_completed', () => {
    const { container } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(0);
  });

  it('shows after game_completed and emits signup_prompt_shown once with source results_inline', () => {
    markGameCompletedSignal();
    const { rerender } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    rerender(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
    expect(shownCalls()).toEqual([
      ['signup_prompt_shown', { source: 'results_inline', surface: 'results_inline', trigger: 'results_inline', cap_rank: 1 }],
    ]);
  });

  it('appears when game_completed fires after the results screen mounted', () => {
    const { container } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    act(() => markGameCompletedSignal());
    expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
    expect(shownCalls()).toHaveLength(1);
  });

  it('never shows mid-round (a round is live again)', () => {
    markGameCompletedSignal();
    markGameActive('multiplayer');
    const { container } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(0);
  });

  it('never shows to logged-in users', () => {
    markGameCompletedSignal();
    const { container } = render(<InlineSignupCard isAuthenticated analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(0);
  });

  it('tap fires signup_prompt_clicked(results_inline) and latches attribution for signup_completed', () => {
    markGameCompletedSignal();
    render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    const discord = screen.getAllByRole('button').find((b) => /discord/i.test(b.textContent || ''));
    expect(discord).toBeTruthy();
    fireEvent.pointerDown(discord!);
    expect(sessionStorage.getItem(SIGNUP_SOURCE_PENDING_KEY)).toBe('results_inline');
    fireEvent.click(discord!);
    expect(mockClicked).toHaveBeenCalledWith('results_inline');
    expect(consumeSignupSource()).toBe('results_inline');
    expect(consumeSignupSource()).toBeNull();
  });

  it('compact hides the benefits list', () => {
    markGameCompletedSignal();
    render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" compact />);
    expect(screen.queryByText('auth.firstWin.benefits.trackProgress')).not.toBeInTheDocument();
  });

  it('legacy (no analyticsSource) callers are unchanged: render without a completion gate', () => {
    render(<InlineSignupCard isAuthenticated={false} />);
    expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
    expect(shownCalls()).toHaveLength(0);
  });

  it('caps at 3 renders per guest per day: cap_rank 1..3 on the events, then nothing renders or emits', () => {
    markGameCompletedSignal();
    for (let i = 0; i < RESULTS_INLINE_DAILY_CAP; i++) {
      const { unmount } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
      expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
      unmount();
    }
    expect(shownCalls().map(([, d]) => (d as { cap_rank?: number }).cap_rank)).toEqual([1, 2, 3]);

    // 4th mount of the day: no card, no event (t_561836a1 — 73% of impressions
    // were a guest's 4th+ that day and produced 1 of 19 clicks).
    const { container } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(RESULTS_INLINE_DAILY_CAP);
  });

  it('the cap counter resets on a new local day: a full YESTERDAY does not cap today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    localStorage.setItem(resultsInlineCapKey(yesterday), String(RESULTS_INLINE_DAILY_CAP));

    markGameCompletedSignal();
    render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
    expect(shownCalls()).toHaveLength(1);
    expect(getResultsInlineImpressionCount()).toBe(1);
  });

  it('a guest already at the cap renders nothing even after a fresh game_completed', () => {
    localStorage.setItem(resultsInlineCapKey(), String(RESULTS_INLINE_DAILY_CAP));
    markGameCompletedSignal();
    const { container } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(0);
  });

  it('the cap does not apply to signed-in users: they still hide via auth, and burn no impression', () => {
    localStorage.setItem(resultsInlineCapKey(), String(RESULTS_INLINE_DAILY_CAP - 1));
    markGameCompletedSignal();
    const { container } = render(<InlineSignupCard isAuthenticated analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(0);
    // Signed-in render must not consume an impression — the cap belongs to guests.
    expect(getResultsInlineImpressionCount()).toBe(RESULTS_INLINE_DAILY_CAP - 1);
  });

  it('other sources are uncapped even when results_inline is capped out', () => {
    localStorage.setItem(resultsInlineCapKey(), String(RESULTS_INLINE_DAILY_CAP));
    markGameCompletedSignal();
    render(<InlineSignupCard isAuthenticated={false} analyticsSource="practice_results" />);
    expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
    expect(shownCalls()).toEqual([
      ['signup_prompt_shown', { source: 'practice_results', surface: 'practice_results', trigger: 'practice_results' }],
    ]);
    expect(getResultsInlineImpressionCount()).toBe(RESULTS_INLINE_DAILY_CAP);
  });

  it('t_ac5ac2f7: showing results_inline latches the session so the mp_sheet tier stays quiet', () => {
    expect(hasResultsInlineShownThisSession()).toBe(false);
    markGameCompletedSignal();
    render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(shownCalls()).toHaveLength(1);
    expect(hasResultsInlineShownThisSession()).toBe(true);
  });

  it('t_ac5ac2f7: a non-results_inline surface does NOT touch the latch', () => {
    markGameCompletedSignal();
    render(<InlineSignupCard isAuthenticated={false} analyticsSource="practice_results" />);
    expect(shownCalls()).toHaveLength(1);
    expect(hasResultsInlineShownThisSession()).toBe(false);
  });

  it('t_ac5ac2f7: a capped-out render (no card, no event) leaves the latch unset — mp_sheet stays the fallback', () => {
    localStorage.setItem(resultsInlineCapKey(), String(RESULTS_INLINE_DAILY_CAP));
    markGameCompletedSignal();
    const { container } = render(<InlineSignupCard isAuthenticated={false} analyticsSource="results_inline" />);
    expect(container.firstChild).toBeNull();
    expect(shownCalls()).toHaveLength(0);
    expect(hasResultsInlineShownThisSession()).toBe(false);
  });
});
