/**
 * AuthButton loading-state tests
 *
 * The header render-sites (HeaderDesktopControls / HeaderMobileMenu) already
 * gate AuthButton on `!loading && !cgLoading`, so an internal loading skeleton
 * is redundant — and it visibly flashes a stray gray pulse pill next to the
 * already-styled controls because `isReady` (hasCheckedUser) lags slightly
 * behind the SDK loading flag. While auth is still resolving, AuthButton must
 * render nothing rather than a redundant skeleton placeholder.
 */

import React from 'react';
import { render } from '@testing-library/react';

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
    dir: 'ltr',
  }),
}));

vi.mock('../../../contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ style: { accentHex: null } }),
}));

vi.mock('../../../lib/supabase', () => ({ signOut: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('../../Avatar', () => ({ __esModule: true, default: () => <div>Avatar</div> }));
vi.mock('../../LevelBadge', () => ({ __esModule: true, default: () => <div>Level</div> }));
vi.mock('../../XpProgressBar', () => ({ getLevelFromXp: () => 10 }));
vi.mock('../../engagement/CalendarRewardsModal', () => ({ CalendarRewardsModal: () => null }));

const authState = {
  isAuthenticated: false,
  profile: null,
  isSupabaseEnabled: true,
  loading: true, // auth still resolving
  isAdmin: false,
  user: null,
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const crazyGamesState = {
  isCrazyGames: false,
  isReady: false, // SDK not finished resolving either
  user: null,
  isLoggedIn: false,
  isLoggingIn: false,
  login: vi.fn(),
  isAccountAvailable: false,
};

vi.mock('@/hooks/useCrazyGamesAuth', () => ({
  useCrazyGamesAuth: () => crazyGamesState,
}));

describe('AuthButton — loading state', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing (no redundant skeleton pill) while auth is still resolving', async () => {
    const { default: AuthButton } = await import('../AuthButton');
    const { container } = render(<AuthButton />);

    // No animate-pulse skeleton placeholder should be rendered.
    expect(container.querySelector('.animate-pulse')).toBeNull();
    // Component should render nothing at all during the loading window.
    expect(container).toBeEmptyDOMElement();
  });
});
