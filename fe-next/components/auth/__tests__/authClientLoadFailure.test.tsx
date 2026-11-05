import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

const { client, loadBehaviour, mockToast } = vi.hoisted(() => ({
  client: {
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithMagicLink: vi.fn(),
    sendOtpCode: vi.fn(),
    verifyOtpCode: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithDiscord: vi.fn(),
    signInWithMicrosoft: vi.fn(),
    resendEmailVerification: vi.fn(),
    supabase: { auth: { signInWithIdToken: vi.fn() } },
  },
  loadBehaviour: { fail: false },
  mockToast: vi.fn(),
}));

vi.mock('@/lib/auth/loadAuthClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/loadAuthClient')>('@/lib/auth/loadAuthClient');
  return {
    ...actual,
    isAuthClientConfigured: () => true,
    loadAuthClient: async () => {
      if (loadBehaviour.fail) throw new actual.AuthClientLoadError(new Error('Loading chunk 69263 failed'));
      return client;
    },
  };
});
vi.mock('@/components/NeoToast', () => ({ neoErrorToast: mockToast }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, showAuthPrompt: vi.fn() }),
}));
vi.mock('next/script', () => ({ default: () => null }));

import AuthModal from '../AuthModal';
import GoogleSignInButton from '../GoogleSignInButton';
import { useOAuthSignIn } from '../hooks/useOAuthSignIn';
import { TeacherCheckEmail } from '@/components/education/landing/TeacherCheckEmail';
import { exchangeGoogleOneTapCredential } from '@/lib/auth/googleOneTap';
import { AUTH_CLIENT_LOAD_FAILED_EVENT } from '@/lib/auth/loadAuthClient';

function submitMagicLink() {
  const email = screen.getByRole('textbox', { name: /email/i }) as HTMLInputElement;
  fireEvent.change(email, { target: { value: 'player@example.com' } });
  fireEvent.submit(email.closest('form') as HTMLFormElement);
}

describe('when the sign-in client cannot load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadBehaviour.fail = true;
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid');
  });

  afterEach(() => {
    loadBehaviour.fail = false;
    vi.unstubAllEnvs();
  });

  it('the email form shows a retry message and works on the next try', async () => {
    client.signInWithMagicLink.mockResolvedValue({ error: null });
    render(<AuthModal isOpen onClose={vi.fn()} />);

    submitMagicLink();
    expect(await screen.findByText('errors.signInFailedRetry')).toBeTruthy();
    expect(screen.queryByText('auth.invalidCredentials')).toBeNull();
    expect(screen.queryByText(/chunk/i)).toBeNull();
    expect(client.signInWithMagicLink).not.toHaveBeenCalled();

    loadBehaviour.fail = false;
    submitMagicLink();
    await waitFor(() => expect(client.signInWithMagicLink).toHaveBeenCalledWith('player@example.com'));
    expect(screen.queryByText('errors.signInFailedRetry')).toBeNull();
  });

  it('the OAuth hook reports a retry message and works on the next try', async () => {
    client.signInWithGoogle.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useOAuthSignIn());

    await act(async () => {
      await result.current.signIn('google');
    });
    expect(result.current.error).toBe('errors.signInFailedRetry');
    expect(result.current.loadingProvider).toBeNull();

    loadBehaviour.fail = false;
    await act(async () => {
      await result.current.signIn('google');
    });
    expect(client.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('a Google credential exchange fails with a signal the button turns into a toast', async () => {
    render(<GoogleSignInButton />);

    const outcome = await act(async () => exchangeGoogleOneTapCredential('credential', 'nonce'));

    expect(outcome.success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith('errors.signInFailedRetry');
  });

  it('an ordinary exchange error stays silent, as it was', async () => {
    loadBehaviour.fail = false;
    client.supabase.auth.signInWithIdToken.mockResolvedValue({ data: null, error: { message: 'bad token' } });
    const heard = vi.fn();
    window.addEventListener(AUTH_CLIENT_LOAD_FAILED_EVENT, heard);

    const outcome = await exchangeGoogleOneTapCredential('credential', 'nonce');

    window.removeEventListener(AUTH_CLIENT_LOAD_FAILED_EVENT, heard);
    expect(outcome).toEqual({ success: false, error: 'bad token' });
    expect(heard).not.toHaveBeenCalled();
  });

  it('resending the confirmation email shows its error state, not a stuck button', async () => {
    render(<TeacherCheckEmail email="t@example.com" onChangeEmail={vi.fn()} />);
    const resend = screen.getByTestId('teacher-check-email-resend') as HTMLButtonElement;

    fireEvent.click(resend);

    expect(await screen.findByText('eg2Land.checkEmail.resendError')).toBeTruthy();
    expect(resend.disabled).toBe(false);
  });
});
