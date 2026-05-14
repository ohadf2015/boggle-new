/**
 * InlineSignupCard — RED phase
 *
 * Replaces FirstWinSignupModal for post-game signup prompt.
 * Renders inline in results page instead of a popup.
 */

import { render, screen } from '@testing-library/react';
import InlineSignupCard from '../InlineSignupCard';

// --- Mocks ---

const { mockSignInWithGoogle, mockSignInWithDiscord } = vi.hoisted(() => ({
  mockSignInWithGoogle: vi.fn(),
  mockSignInWithDiscord: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  signInWithGoogle: (...args: any[]) => mockSignInWithGoogle(...args),
  signInWithDiscord: (...args: any[]) => mockSignInWithDiscord(...args),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (key === 'auth.firstWin.statsTeaser' && params) {
        return `Played ${params.games} games, scored ${params.score}`;
      }
      if (key === 'auth.signInWith' && params?.provider) {
        return `Sign in with ${params.provider}`;
      }
      return key;
    },
    language: 'en',
  }),
}));

let mockIsOnCrazyGamesPlatform = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
    showAuthPrompt: vi.fn(),
  }),
}));

let mockGuestStats = { gamesPlayed: 3, totalScore: 450 };
vi.mock('../../../utils/guestManager', () => ({
  getGuestStatsSummary: () => mockGuestStats,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/utils/platform', () => ({
  isNative: () => false,
}));

vi.mock('@/utils/nativeOAuth', () => ({
  performNativeOAuth: vi.fn(),
  initializeNativeOAuth: vi.fn().mockResolvedValue(false),
  isNativeOAuthAvailable: () => false,
}));

vi.mock('@/utils/mobileOAuth', () => ({
  performMobileOAuth: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    const { initial, animate, transition, exit, whileHover, whileTap, ...rest } = props;
    return React.createElement('div', { ref, ...rest }, children);
  });
  const MotionLi = React.forwardRef(function MotionLi({ children, ...props }: any, ref: any) {
    const { initial, animate, transition, exit, ...rest } = props;
    return React.createElement('li', { ref, ...rest }, children);
  });
  const MotionSection = React.forwardRef(function MotionSection({ children, ...props }: any, ref: any) {
    const { initial, animate, transition, exit, whileHover, whileTap, ...rest } = props;
    return React.createElement('section', { ref, ...rest }, children);
  });
  function AnimatePresence({ children }: any) { return children; }
  return {
    m: { div: MotionDiv, li: MotionLi, section: MotionSection },
    AnimatePresence,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('InlineSignupCard', () => {
  beforeEach(() => {
    mockIsOnCrazyGamesPlatform = false;
    mockGuestStats = { gamesPlayed: 3, totalScore: 450 };
  });

  it('renders null when user is authenticated', () => {
    const { container } = render(<InlineSignupCard isAuthenticated={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when on CrazyGames platform', () => {
    mockIsOnCrazyGamesPlatform = true;
    const { container } = render(<InlineSignupCard isAuthenticated={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and OAuth buttons for guest users', () => {
    render(<InlineSignupCard isAuthenticated={false} />);
    // Title uses multiGames variant — key resolves to itself via mock
    expect(screen.getByText('auth.multiGames.title')).toBeInTheDocument();
    // OAuthButtonGroup renders at least one recognizable sign-in button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows guest stats teaser when games played > 0', () => {
    render(<InlineSignupCard isAuthenticated={false} />);
    expect(screen.getByText(/Played 3 games, scored 450/)).toBeInTheDocument();
  });

  it('hides stats teaser when no games played', () => {
    mockGuestStats = { gamesPlayed: 0, totalScore: 0 };
    render(<InlineSignupCard isAuthenticated={false} />);
    expect(screen.queryByText(/Played/)).not.toBeInTheDocument();
  });
});
