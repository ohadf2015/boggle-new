/**
 * AuthModal — teacher variant (opened from education)
 *
 * Covers:
 * - Open/close rendering
 * - Sign-in vs sign-up mode
 * - OAuth provider buttons (Google, Discord)
 * - Magic link form (default email flow)
 * - Password form toggle
 * - Guest stats display
 * - Success/error messages
 * - CrazyGames platform branch
 * - Accessibility (dialog role, focus trap, Escape key)
 * - Form validation inline errors
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthModal from '../AuthModal';

// --- Mocks ---

const {
  mockSignInWithGoogle,
  mockSignInWithDiscord,
  mockSignUpWithEmail,
  mockSignInWithEmail,
  mockSignInWithMagicLink,
} = vi.hoisted(() => ({
  mockSignInWithGoogle: vi.fn(),
  mockSignInWithDiscord: vi.fn(),
  mockSignUpWithEmail: vi.fn(),
  mockSignInWithEmail: vi.fn(),
  mockSignInWithMagicLink: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  signInWithGoogle: (...args: any[]) => mockSignInWithGoogle(...args),
  signInWithDiscord: (...args: any[]) => mockSignInWithDiscord(...args),
  signUpWithEmail: (...args: any[]) => mockSignUpWithEmail(...args),
  signInWithEmail: (...args: any[]) => mockSignInWithEmail(...args),
  signInWithMagicLink: (...args: any[]) => mockSignInWithMagicLink(...args),
  resendEmailVerification: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../GoogleSignInButton', () => ({
  default: () => <div data-testid="gsi-button" />,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'auth.signIn': 'Sign In',
        'auth.signUp': 'Sign Up',
        'auth.upgradePrompt': 'Sign in to save progress!',
        'common.close': 'Close',
        'auth.continueAsGuest': 'Continue as guest',
        'auth.trustBadge': 'Secure & private',
        'auth.termsPrefix': 'By signing in you agree to our',
        'auth.termsLink': 'Terms',
        'auth.andText': 'and',
        'auth.privacyLink': 'Privacy',
        'auth.magicLink.divider': 'or continue with email',
        'auth.magicLink.sendLink': 'Send me a sign-in link',
        'auth.magicLink.noPassword': 'No password needed',
        'auth.magicLink.usePassword': 'Use password instead',
        'auth.magicLink.useMagicLink': 'Use magic link',
        'auth.magicLink.checkEmail': 'Check your email for a sign-in link!',
        'auth.inlineSignup.emailPlaceholder': 'Email address',
        'auth.inlineSignup.passwordPlaceholder': 'Password (8+ characters)',
        'auth.inlineSignup.signUpButton': 'Create Account',
        'auth.inlineSignup.checkEmail': 'Check your email to verify your account!',
        'auth.inlineSignup.emailInUse': 'Email already registered.',
        'auth.invalidCredentials': 'Invalid email or password',
        'auth.alreadyHaveAccount': 'Already have an account? Sign in',
        'auth.noAccount': "Don't have an account? Sign up",
        'auth.guestStatsTitle': 'Your guest stats',
        'profile.totalGames': 'Games',
        'profile.totalScore': 'Score',
        'auth.loginCrazyGames': 'Log in with CrazyGames',
        'auth.inlineSignup.invalidEmail': 'Invalid email',
        'auth.inlineSignup.passwordTooShort': 'Password too short',
        'auth.inlineSignup.emailRequired': 'Email required',
        'auth.inlineSignup.passwordRequired': 'Password required',
        'auth.showPassword': 'Show password',
        'auth.hidePassword': 'Hide password',
      };
      if (key === 'auth.signInWith' && params?.provider) {
        return `Sign in with ${params.provider}`;
      }
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

const mockShowAuthPrompt = vi.fn();
let mockIsOnCrazyGamesPlatform = false;

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isOnCrazyGamesPlatform: mockIsOnCrazyGamesPlatform,
    showAuthPrompt: mockShowAuthPrompt,
  }),
}));

vi.mock('../../../utils/guestManager', () => ({
  getGuestStatsSummary: () => ({ gamesPlayed: 5, totalScore: 1200 }),
}));

// Mock framer-motion to render immediately
vi.mock('framer-motion', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const motionEl = (tag: string) =>
    // Strip motion-only props so they don't leak onto the DOM node as attributes.
    React.forwardRef(function MotionEl(
      { children, initial, animate, exit, transition, ...props }: any,
      ref: any,
    ) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  function AnimatePresence({ children }: any) { return children; }
  return {
    m: { div: motionEl('div'), p: motionEl('p'), span: motionEl('span') },
    AnimatePresence,
    useAnimationControls: () => ({ start: () => Promise.resolve() }),
  };
});

// Mock next/link
vi.mock('next/link', () => {
  function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  }
  return { default: MockLink };
});

// Mock Loader
vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <span data-testid="loader">Loading...</span>,
}));


describe('AuthModal — teacher audience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnCrazyGamesPlatform = false;
  });

  it('Given audience=teacher, Then the copy is teacher-worded and there is no gamer prompt or guest exit', () => {
    render(<AuthModal isOpen onClose={vi.fn()} audience="teacher" initialMode="signup" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('eduHq.auth.titleSignup');
    expect(dialog).toHaveTextContent('eduHq.auth.subtitle');
    expect(screen.queryByText('Sign in to save progress!')).toBeNull();
    expect(screen.queryByText('Continue as guest')).toBeNull();
    expect(screen.queryByText('Sign in with Discord')).toBeNull();
  });

  it('Given audience=teacher, When "I have an account" is tapped, Then the password sign-in form is right there (1 tap)', () => {
    render(<AuthModal isOpen onClose={vi.fn()} audience="teacher" initialMode="signup" />);
    fireEvent.click(screen.getByTestId('auth-teacher-tab-signin'));
    expect(screen.getByTestId('auth-teacher-tab-signin')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('dialog')).toHaveTextContent('eduHq.auth.titleSignin');
    expect(document.querySelector('#pwd-email-input')).not.toBeNull();
    expect(document.querySelector('#pwd-password-input')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('Given audience=teacher opened in signin mode, Then the open-time reset keeps the password form', () => {
    render(<AuthModal isOpen onClose={vi.fn()} audience="teacher" initialMode="signin" />);
    expect(document.querySelector('#pwd-password-input')).not.toBeNull();
  });

  it('Given the default audience, Then the player copy and guest exit are unchanged', () => {
    render(<AuthModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('Sign in to save progress!')).toBeInTheDocument();
    expect(screen.getByText('Continue as guest')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-teacher-tab-signin')).toBeNull();
  });

  it('Given a teacher password signup that needs email confirmation, Then the modal names the address and offers resend + change, not a bare "check your email"', async () => {
    mockSignUpWithEmail.mockResolvedValue({ data: { session: null, user: { identities: [{}] } }, error: null });
    render(<AuthModal isOpen onClose={vi.fn()} audience="teacher" initialMode="signup" />);
    fireEvent.click(screen.getByText('Use password instead'));
    fireEvent.change(document.querySelector('#pwd-email-input')!, { target: { value: 'ms.k@school.org' } });
    fireEvent.change(document.querySelector('#pwd-password-input')!, { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ms.k@school.org'));
    expect(screen.getByTestId('teacher-check-email-resend')).toBeInTheDocument();
    expect(screen.queryByText('Check your email to verify your account!')).toBeNull();
    fireEvent.click(screen.getByTestId('teacher-check-email-change'));
    expect(document.querySelector('#pwd-email-input')).not.toBeNull();
  });

  it('Given a teacher magic-link signup, Then the same check-email panel names the address', async () => {
    mockSignInWithMagicLink.mockResolvedValue({ error: null });
    render(<AuthModal isOpen onClose={vi.fn()} audience="teacher" initialMode="signup" />);
    const input = screen.getByPlaceholderText('Email address');
    fireEvent.change(input, { target: { value: 'mr.l@school.org' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('mr.l@school.org'));
  });
});
