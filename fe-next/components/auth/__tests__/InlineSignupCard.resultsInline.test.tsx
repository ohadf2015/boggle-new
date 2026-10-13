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
import { markGameActive, markGameInactive } from '@/utils/abandonOnPagehide';

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
    markGameInactive();
    sessionStorage.clear();
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
      ['signup_prompt_shown', { source: 'results_inline', surface: 'results_inline', trigger: 'results_inline' }],
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
});
