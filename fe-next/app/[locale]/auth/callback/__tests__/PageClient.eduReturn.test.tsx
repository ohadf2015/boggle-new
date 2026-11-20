import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const replace = vi.fn();
let query = '';
const trackGrowthEvent = vi.hoisted(() => vi.fn());

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowthEvent(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(query),
  useParams: () => ({ locale: 'en' }),
}));
const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a), exchangeCodeForSession: vi.fn() } },
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => null }));
vi.mock('@/utils/crossTabAuthSync', () => ({
  tryAcquireCodeLock: () => true,
  isCodeLockedByOther: () => false,
  releaseCodeLock: vi.fn(),
  broadcastAuthSuccess: vi.fn(),
  broadcastAuthFailed: vi.fn(),
  subscribeToAuthSync: () => () => {},
  initCrossTabAuthSync: vi.fn(),
}));

import AuthCallbackPageClient from '../PageClient';

describe('auth callback keeps a classroom sign-in in the classroom', () => {
  beforeEach(() => {
    replace.mockClear();
    trackGrowthEvent.mockClear();
    getSession.mockResolvedValue({ data: { session: null } });
    document.cookie = 'lexi_edu_auth_origin=; Path=/; Max-Age=0';
    sessionStorage.clear();
  });

  it('a sign-in that lost its next lands back on the edu page it started from', async () => {
    document.cookie = `lexi_edu_auth_origin=${encodeURIComponent('/he/teacher')}; Path=/`;
    query = '';
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/he/teacher'));
    expect(replace).not.toHaveBeenCalledWith('/en');
    expect(document.cookie).not.toContain('lexi_edu_auth_origin');
  });

  it('a teacher who signs in from the arcade with no next still lands on the homepage', async () => {
    query = '';
    getSession.mockResolvedValue({ data: { session: { user: { id: 'teacher-1' } } } });
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en'));
  });

  it('a failed sign-in that lost its next returns to the remembered edu entry', async () => {
    document.cookie = `lexi_edu_auth_origin=${encodeURIComponent('/en/join/ABC123')}; Path=/`;
    query = 'error=access_denied';
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/join/ABC123?auth_error=true&reason=access_denied'));
  });

  it('a provider error from an edu sign-in returns to the edu entry', async () => {
    query = 'error=access_denied&next=%2Fen%2Feducation%2Faccess%3Ffrom%3Dteacher';
    render(<AuthCallbackPageClient />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/en/education/access?from=teacher&auth_error=true&reason=access_denied'),
    );
  });

  it('a provider error from an arcade sign-in still goes home', async () => {
    query = 'error=access_denied&next=%2Fen%2Fdaily';
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en?auth_error=true&reason=access_denied'));
  });

  it('a provider error logs a distinct callback loss, not signup_failed', async () => {
    window.history.replaceState(null, '', '/en/auth/callback?error=access_denied&next=%2Fen%2Feducation%2Faccess');
    sessionStorage.setItem('lexiclash_oauth_provider_pending', 'google');
    query = 'error=access_denied&next=%2Fen%2Feducation%2Faccess';
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(trackGrowthEvent).toHaveBeenCalledWith(
      'auth_callback_no_session',
      expect.objectContaining({ reason: 'access_denied', provider: 'google' }),
    ));
    expect(trackGrowthEvent.mock.calls.map((call) => call[0])).not.toContain('signup_failed');
  });

  it('a successful sign-in with a foreign-locale next does not double the locale', async () => {
    query = 'next=%2Fru%2Fteacher';
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ru/teacher'));
    expect(replace).not.toHaveBeenCalledWith('/en/ru/teacher');
  });

  it('Try again on a stuck edu sign-in returns to the edu entry', async () => {
    vi.useFakeTimers();
    query = 'code=abc&next=%2Fen%2Fstudent%2Fjoin';
    getSession.mockReturnValue(new Promise(() => {}));
    render(<AuthCallbackPageClient />);
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    fireEvent.click(screen.getByText('auth.callback.tryAgain'));
    expect(replace).toHaveBeenCalledWith('/en/student/join?auth_error=true&reason=timeout');
    vi.useRealTimers();
  });

  it('Try again on a stuck sign-in that lost its next returns to the remembered edu page', async () => {
    vi.useFakeTimers();
    document.cookie = `lexi_edu_auth_origin=${encodeURIComponent('/en/teacher')}; Path=/`;
    query = 'code=abc';
    getSession.mockReturnValue(new Promise(() => {}));
    render(<AuthCallbackPageClient />);
    await act(async () => {
      vi.advanceTimersByTime(7000);
    });
    fireEvent.click(screen.getByText('auth.callback.tryAgain'));
    expect(replace).toHaveBeenCalledWith('/en/teacher?auth_error=true&reason=timeout');
    vi.useRealTimers();
  });
});
