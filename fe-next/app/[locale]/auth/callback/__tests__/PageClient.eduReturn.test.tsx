import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

const replace = vi.fn();
let query = '';

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
    getSession.mockResolvedValue({ data: { session: null } });
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

  it('a successful sign-in with a foreign-locale next does not double the locale', async () => {
    query = 'next=%2Fru%2Fteacher';
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    render(<AuthCallbackPageClient />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/en/teacher'));
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
});
