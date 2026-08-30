/**
 * AuthModal render tests
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

// --- Helpers ---

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
};

const renderModal = (props = {}) => render(<AuthModal {...defaultProps} {...props} />);

// --- Tests ---

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnCrazyGamesPlatform = false;
    mockSignInWithGoogle.mockResolvedValue({ error: null });
    mockSignInWithDiscord.mockResolvedValue({ error: null });
    mockSignUpWithEmail.mockResolvedValue({ error: null });
    mockSignInWithEmail.mockResolvedValue({ error: null });
    mockSignInWithMagicLink.mockResolvedValue({ error: null });
  });

  describe('open/close rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<AuthModal isOpen={false} onClose={vi.fn()} />);
      expect(container.innerHTML).toBe('');
    });

    // AuthModal is a hand-rolled portal rather than the shared <Dialog>, so it
    // never joined the ref-counted html.modal-open flag that the native banner
    // coordinator watches. On native the AdMob banner is a SurfaceView composited
    // ABOVE the WebView, so it cannot be covered by the modal's z-100 backdrop —
    // it sits on top of the sign-in form until the flag is raised.
    describe('native modal-open flag', () => {
      it('flags html.modal-open while open', () => {
        render(<AuthModal isOpen onClose={vi.fn()} />);
        expect(document.documentElement.classList.contains('modal-open')).toBe(true);
      });

      it('does not flag html.modal-open when closed', () => {
        render(<AuthModal isOpen={false} onClose={vi.fn()} />);
        expect(document.documentElement.classList.contains('modal-open')).toBe(false);
      });

      it('clears the flag on unmount', () => {
        const { unmount } = render(<AuthModal isOpen onClose={vi.fn()} />);
        expect(document.documentElement.classList.contains('modal-open')).toBe(true);
        unmount();
        expect(document.documentElement.classList.contains('modal-open')).toBe(false);
      });

      it('clears the flag when the modal closes without unmounting', () => {
        const { rerender } = render(<AuthModal isOpen onClose={vi.fn()} />);
        expect(document.documentElement.classList.contains('modal-open')).toBe(true);
        rerender(<AuthModal isOpen={false} onClose={vi.fn()} />);
        expect(document.documentElement.classList.contains('modal-open')).toBe(false);
      });
    });

    it('renders dialog when isOpen is true', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders with aria-modal and aria-labelledby', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'auth-modal-title');
    });
  });

  describe('sign-in mode (default)', () => {
    it('shows Sign In title by default', () => {
      renderModal();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('shows upgrade prompt subtitle', () => {
      renderModal();
      expect(screen.getByText('Sign in to save progress!')).toBeInTheDocument();
    });

    it('renders Google and Discord OAuth buttons', () => {
      renderModal();
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
      expect(screen.getByText('Sign in with Discord')).toBeInTheDocument();
    });

    it('renders email divider', () => {
      renderModal();
      expect(screen.getByText('or continue with email')).toBeInTheDocument();
    });

    it('renders magic link form by default (not password form)', () => {
      renderModal();
      expect(screen.getByText('Send me a sign-in link')).toBeInTheDocument();
      expect(screen.getByText('No password needed')).toBeInTheDocument();
      expect(screen.getByText('Use password instead')).toBeInTheDocument();
    });

    it('renders continue as guest button', () => {
      renderModal();
      expect(screen.getByText('Continue as guest')).toBeInTheDocument();
    });

    it('renders trust badge and legal links', () => {
      renderModal();
      expect(screen.getByText('Secure & private')).toBeInTheDocument();
      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
    });
  });

  describe('sign-up mode', () => {
    it('shows Sign Up title when initialMode is signup', () => {
      renderModal({ initialMode: 'signup' });
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('renders close button with aria-label', () => {
      renderModal();
      const closeBtn = screen.getByLabelText('Close');
      expect(closeBtn).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByLabelText('Close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when continue as guest clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByText('Continue as guest'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      // The backdrop is the outer div with onClick={onClose}
      // The dialog has stopPropagation, so clicking outside should trigger onClose
      const backdrop = screen.getByRole('dialog').parentElement!;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape key', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('guest stats', () => {
    it('shows guest stats when showGuestStats is true', () => {
      renderModal({ showGuestStats: true });
      expect(screen.getByText('Your guest stats')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument();
    });

    it('hides guest stats when showGuestStats is false (default)', () => {
      renderModal();
      expect(screen.queryByText('Your guest stats')).not.toBeInTheDocument();
    });
  });

  describe('OAuth sign-in', () => {
    it('calls signInWithGoogle when Google button clicked', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Sign in with Google'));
      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      });
    });

    it('calls signInWithDiscord when Discord button clicked', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Sign in with Discord'));
      await waitFor(() => {
        expect(mockSignInWithDiscord).toHaveBeenCalledTimes(1);
      });
    });

    it('shows loader while OAuth is loading', async () => {
      mockSignInWithGoogle.mockReturnValue(new Promise(() => {})); // never resolves
      renderModal();
      fireEvent.click(screen.getByText('Sign in with Google'));
      await waitFor(() => {
        expect(screen.getByTestId('loader')).toBeInTheDocument();
      });
    });

    it('shows error when OAuth fails', async () => {
      mockSignInWithGoogle.mockResolvedValue({ error: { message: 'OAuth error' } });
      renderModal();
      fireEvent.click(screen.getByText('Sign in with Google'));
      await waitFor(() => {
        expect(screen.getByText('OAuth error')).toBeInTheDocument();
      });
    });
  });

  describe('magic link form', () => {
    it('has an email input', () => {
      renderModal();
      expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    });

    it('submit button is disabled when email is empty', () => {
      renderModal();
      const submitBtn = screen.getByText('Send me a sign-in link').closest('button')!;
      expect(submitBtn).toBeDisabled();
    });

    it('calls signInWithMagicLink on valid email submit', async () => {
      renderModal();
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const form = emailInput.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSignInWithMagicLink).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('shows success message after magic link sent', async () => {
      mockSignInWithMagicLink.mockResolvedValue({ error: null });
      renderModal();
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Check your email for a sign-in link!')).toBeInTheDocument();
      });
    });

    it('shows error when magic link fails', async () => {
      mockSignInWithMagicLink.mockResolvedValue({ error: { message: 'Rate limited' } });
      renderModal();
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Rate limited')).toBeInTheDocument();
      });
    });

    it('shows inline email error for invalid email', async () => {
      renderModal();
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'notanemail' } });

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
      });
    });
  });

  describe('password form toggle', () => {
    it('switches to password form when "Use password instead" clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Use password instead'));
      expect(screen.getByPlaceholderText('Password (8+ characters)')).toBeInTheDocument();
    });

    it('switches back to magic link when "Use magic link" clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Use password instead'));
      fireEvent.click(screen.getByText('Use magic link'));
      expect(screen.getByText('Send me a sign-in link')).toBeInTheDocument();
    });

    it('shows sign-up/sign-in toggle in password mode', () => {
      renderModal();
      fireEvent.click(screen.getByText('Use password instead'));
      expect(screen.getByText("Don't have an account? Sign up")).toBeInTheDocument();
    });

    it('toggles to sign-up mode when toggle link clicked', () => {
      renderModal();
      fireEvent.click(screen.getByText('Use password instead'));
      fireEvent.click(screen.getByText("Don't have an account? Sign up"));
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
      expect(screen.getByText('Already have an account? Sign in')).toBeInTheDocument();
    });
  });

  describe('password form submission', () => {
    const fillPasswordForm = () => {
      fireEvent.click(screen.getByText('Use password instead'));
      const emailInput = screen.getByPlaceholderText('Email address');
      const passwordInput = screen.getByPlaceholderText('Password (8+ characters)');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      return { emailInput, passwordInput };
    };

    it('calls signInWithEmail for sign-in mode', async () => {
      renderModal();
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('calls signUpWithEmail for sign-up mode', async () => {
      renderModal({ initialMode: 'signup' });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('shows success message after signup', async () => {
      mockSignUpWithEmail.mockResolvedValue({ error: null });
      renderModal({ initialMode: 'signup' });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Check your email to verify your account!')).toBeInTheDocument();
      });
    });

    it('shows error for invalid credentials on sign-in', async () => {
      mockSignInWithEmail.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
      renderModal();
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('shows email-in-use error when signup email already exists', async () => {
      mockSignUpWithEmail.mockResolvedValue({ error: { message: 'User already registered' } });
      renderModal({ initialMode: 'signup' });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignUpWithEmail).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.getByText('Email already registered.')).toBeInTheDocument();
      });
    });

    // A successful password sign-in returns a session and no error. Nothing else
    // in the app closes this modal (OAuth closes via its own onSuccess, OTP calls
    // onClose directly), so the modal itself has to.
    it('closes the modal after a successful password sign-in', async () => {
      const onClose = vi.fn();
      mockSignInWithEmail.mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1' } },
        error: null,
      });
      renderModal({ onClose });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    // Regression: the submit handler had no success branch for sign-in, so
    // isLoading stayed 'email' forever and the button spun with no outcome.
    it('clears the loading state after a successful password sign-in', async () => {
      mockSignInWithEmail.mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1' } },
        error: null,
      });
      renderModal();
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignInWithEmail).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
      });
    });

    // When the Supabase project has email confirmation OFF, signUp returns a live
    // session immediately — the user is already signed in, so "check your email"
    // is a lie and the modal must close instead.
    it('closes the modal when signup returns a session (email confirmation off)', async () => {
      const onClose = vi.fn();
      mockSignUpWithEmail.mockResolvedValue({
        data: { session: { access_token: 'tok' }, user: { id: 'u1', identities: [{ id: 'i1' }] } },
        error: null,
      });
      renderModal({ initialMode: 'signup', onClose });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
      expect(screen.queryByText('Check your email to verify your account!')).not.toBeInTheDocument();
    });

    // supabase-js does not error on a duplicate signup when confirmations are on —
    // it returns a success-shaped response with an obfuscated user and an EMPTY
    // identities array. Without this check the user is told to check an inbox that
    // will never receive anything.
    it('treats an empty identities array as email-already-registered', async () => {
      mockSignUpWithEmail.mockResolvedValue({
        data: { session: null, user: { id: 'obfuscated', identities: [] } },
        error: null,
      });
      renderModal({ initialMode: 'signup' });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Email already registered.')).toBeInTheDocument();
      });
      expect(screen.queryByText('Check your email to verify your account!')).not.toBeInTheDocument();
    });

    // Confirmation-required signup: no session, real identity → the "check your
    // email" message is correct and the modal stays open to show it.
    it('keeps the modal open and shows check-email when signup needs confirmation', async () => {
      const onClose = vi.fn();
      mockSignUpWithEmail.mockResolvedValue({
        data: { session: null, user: { id: 'u1', identities: [{ id: 'i1' }] } },
        error: null,
      });
      renderModal({ initialMode: 'signup', onClose });
      const { emailInput } = fillPasswordForm();
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Check your email to verify your account!')).toBeInTheDocument();
      });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('password visibility toggle', () => {
    it('toggles password visibility', () => {
      renderModal();
      fireEvent.click(screen.getByText('Use password instead'));
      const passwordInput = screen.getByPlaceholderText('Password (8+ characters)') as HTMLInputElement;

      expect(passwordInput.type).toBe('password');

      const toggleBtn = screen.getByLabelText('Show password');
      fireEvent.click(toggleBtn);
      expect(passwordInput.type).toBe('text');

      const hideBtn = screen.getByLabelText('Hide password');
      fireEvent.click(hideBtn);
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('CrazyGames platform', () => {
    beforeEach(() => {
      mockIsOnCrazyGamesPlatform = true;
    });

    it('shows CrazyGames login button instead of OAuth', () => {
      renderModal();
      expect(screen.getByText('Log in with CrazyGames')).toBeInTheDocument();
      expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign in with Discord')).not.toBeInTheDocument();
    });

    it('calls showAuthPrompt when CrazyGames button clicked', () => {
      renderModal();
      mockShowAuthPrompt.mockClear(); // clear the auto-call from useEffect
      fireEvent.click(screen.getByText('Log in with CrazyGames'));
      expect(mockShowAuthPrompt).toHaveBeenCalledTimes(1);
    });

    it('hides email section on CrazyGames platform', () => {
      renderModal();
      expect(screen.queryByText('or continue with email')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Email address')).not.toBeInTheDocument();
    });
  });

  describe('success state hides form', () => {
    it('hides OAuth buttons and email form when success message shown', async () => {
      mockSignInWithMagicLink.mockResolvedValue({ error: null });
      renderModal();
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Check your email for a sign-in link!')).toBeInTheDocument();
      });

      // OAuth buttons should be hidden
      expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
      // Continue as guest should still be visible
      expect(screen.getByText('Continue as guest')).toBeInTheDocument();
    });
  });

  describe('form validation prevents submission', () => {
    it('does not call signInWithMagicLink for invalid email', async () => {
      renderModal();
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'bad' } });
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignInWithMagicLink).not.toHaveBeenCalled();
      });
    });

    it('does not call signInWithEmail for empty password', async () => {
      renderModal();
      fireEvent.click(screen.getByText('Use password instead'));
      const emailInput = screen.getByPlaceholderText('Email address');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      // Password left empty
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(mockSignInWithEmail).not.toHaveBeenCalled();
      });
    });
  });

  describe('Google sign-in button (web)', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('uses the GSI token button (not the redirect button) when a Google web client id is set', () => {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
      renderModal();
      expect(screen.getByTestId('gsi-button')).toBeTruthy();
      expect(screen.queryByText('Sign in with Google')).toBeNull();
    });

    it('falls back to the redirect Google button when no client id is configured', () => {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');
      renderModal();
      expect(screen.queryByTestId('gsi-button')).toBeNull();
      expect(screen.getByText('Sign in with Google')).toBeTruthy();
    });
  });
});
