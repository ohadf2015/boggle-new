/**
 * InlineSignupCard save-streak variant — RED phase (t_89663cfc)
 *
 * The solo results screen asked for an account louder than it asked for a
 * return. Signup is demoted + reframed as streak insurance: custom title/body
 * keys, and a `growth:save_streak_clicked` signal when the player acts on it.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InlineSignupCard from '../InlineSignupCard';

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
    t: (key: string) => {
      const translations: Record<string, string> = {
        'results.saveStreak.title': 'Save my streak',
        'results.saveStreak.body':
          'Streaks live on this device. Create a free account to keep them anywhere.',
        'auth.multiGames.title': "You're On a Roll!",
        'auth.multiGames.subtitle': 'Save your progress and track achievements!',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: false,
    showAuthPrompt: vi.fn(),
  }),
}));

vi.mock('../../../utils/guestManager', () => ({
  getGuestStatsSummary: () => ({ gamesPlayed: 1, totalScore: 120 }),
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
  const strip = ({ children, ...props }: any) => {
    const { initial, animate, transition, exit, whileHover, whileTap, ...rest } = props;
    return rest;
  };
  return {
    m: {
      div: React.forwardRef(function D(p: any, ref: any) {
        return React.createElement('div', { ref, ...strip(p) }, p.children);
      }),
      li: React.forwardRef(function L(p: any, ref: any) {
        return React.createElement('li', { ref, ...strip(p) }, p.children);
      }),
      section: React.forwardRef(function S(p: any, ref: any) {
        return React.createElement('section', { ref, ...strip(p) }, p.children);
      }),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe('InlineSignupCard save-streak variant', () => {
  it('renders the streak-insurance copy when title/body keys are provided', () => {
    render(
      <InlineSignupCard
        isAuthenticated={false}
        titleKey="results.saveStreak.title"
        bodyKey="results.saveStreak.body"
      />,
    );

    expect(screen.getByText('Save my streak')).toBeInTheDocument();
    expect(
      screen.getByText('Streaks live on this device. Create a free account to keep them anywhere.'),
    ).toBeInTheDocument();
    expect(screen.queryByText("You're On a Roll!")).not.toBeInTheDocument();
  });

  it('keeps the default copy when no keys are provided (other call sites unchanged)', () => {
    render(<InlineSignupCard isAuthenticated={false} />);

    expect(screen.getByText("You're On a Roll!")).toBeInTheDocument();
  });

  it('invokes onCTAClick when the player starts sign-in from the card', () => {
    const onCTAClick = vi.fn();
    render(<InlineSignupCard isAuthenticated={false} onCTAClick={onCTAClick} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(onCTAClick).toHaveBeenCalledTimes(1);
  });
});
