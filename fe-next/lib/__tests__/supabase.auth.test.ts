import { vi } from 'vitest';

/**
 * Supabase Auth Functions Tests
 *
 * Tests for signInWithMagicLink, signInWithEmail, signUpWithEmail, OAuth.
 */

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    signInWithOtp: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock('@supabase/ssr', () => {
  return {
    createBrowserClient: () => ({
      auth: mockAuth,
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          remove: vi.fn(),
          getPublicUrl: vi.fn(),
        })),
      },
    }),
  };
});

vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/utils/crossTabAuthSync', () => ({ broadcastSignedOut: vi.fn() }));
const platform = vi.hoisted(() => ({ native: false }));
vi.mock('@/utils/platform', () => ({ isNative: () => platform.native }));

const mockLocation = { pathname: '/en/multiplayer', search: '', origin: 'https://www.lexiclash.live' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

import { signInWithMagicLink, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithDiscord } from '../supabase';
import { eduAuthOriginFromCookies, resolveAuthNext, withRememberedEduOrigin } from '@/lib/navigation/authReturnPath';

describe('signInWithMagicLink', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLocation.pathname = '/en/multiplayer'; mockLocation.search = ''; });

  it('calls signInWithOtp with email and locale-aware redirect with next param', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    const result = await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { emailRedirectTo: 'https://www.lexiclash.live/en/auth/callback?next=%2Fen%2Fmultiplayer' },
    });
    expect(result.error).toBeNull();
  });

  it('includes Hebrew locale from URL path and next param', async () => {
    mockLocation.pathname = '/he/game';
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'https://www.lexiclash.live/he/auth/callback?next=%2Fhe%2Fgame' } })
    );
  });

  it('omits next param and falls back to en when path is callback itself', async () => {
    mockLocation.pathname = '/auth/callback';
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'https://www.lexiclash.live/en/auth/callback' } })
    );
  });

  it('preserves query string in next param', async () => {
    mockLocation.pathname = '/en/game';
    mockLocation.search = '?mode=ranked';
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'https://www.lexiclash.live/en/auth/callback?next=%2Fen%2Fgame%3Fmode%3Dranked' } })
    );
  });

  it('returns error when OTP call fails', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ data: null, error: { message: 'Rate limit exceeded' } });
    const result = await signInWithMagicLink('user@example.com');
    expect(result.error).toEqual({ message: 'Rate limit exceeded' });
  });
});

describe('signInWithEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls signInWithPassword with credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
    const result = await signInWithEmail('user@example.com', 'mypassword');
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'user@example.com', password: 'mypassword' });
    expect(result.error).toBeNull();
  });

  it('returns error on invalid credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid login credentials' } });
    const result = await signInWithEmail('user@example.com', 'wrong');
    expect(result.error).toEqual({ message: 'Invalid login credentials' });
  });
});

describe('signUpWithEmail', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLocation.pathname = '/en/multiplayer'; mockLocation.search = ''; });

  it('calls signUp with locale-aware redirect and stashed signup metadata', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: {} }, error: null });
    await signUpWithEmail('new@example.com', 'password123', { intendedRole: 'teacher' });
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com', password: 'password123',
      options: {
        emailRedirectTo: 'https://www.lexiclash.live/en/auth/callback?next=%2Fen%2Fmultiplayer',
        data: expect.objectContaining({
          signup_surface: 'header_or_menu',
          language: 'en',
          intended_role: 'teacher',
        }),
      },
    });
  });
});

describe('signInWithGoogle', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLocation.pathname = '/en/multiplayer'; mockLocation.search = ''; });

  it('calls signInWithOAuth with google provider and next param', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    await signInWithGoogle();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: 'https://www.lexiclash.live/en/auth/callback?next=%2Fen%2Fmultiplayer' },
    });
  });
});

describe('signInWithDiscord', () => {
  beforeEach(() => { vi.clearAllMocks(); mockLocation.pathname = '/sv/game'; mockLocation.search = ''; });

  it('calls signInWithOAuth with discord, locale, and next param', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    await signInWithDiscord();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'discord', options: { redirectTo: 'https://www.lexiclash.live/sv/auth/callback?next=%2Fsv%2Fgame' },
    });
  });
});

describe('sign-in from the classroom product carries its edu page back', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.native = false;
    mockLocation.search = '';
    document.cookie = 'lexi_edu_auth_origin=; Path=/; Max-Age=0';
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  });

  it.each([
    ['/en/teacher', '', 'en', '%2Fen%2Fteacher'],
    ['/he/student/join', '?code=AB12', 'he', '%2Fhe%2Fstudent%2Fjoin%3Fcode%3DAB12'],
    ['/en/join/ABC123', '', 'en', '%2Fen%2Fjoin%2FABC123'],
    ['/en/education/access', '?from=teacher', 'en', '%2Fen%2Feducation%2Faccess%3Ffrom%3Dteacher'],
  ])('Google from %s%s returns there and remembers it', async (pathname, search, locale, encoded) => {
    mockLocation.pathname = pathname;
    mockLocation.search = search;
    await signInWithGoogle();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: `https://www.lexiclash.live/${locale}/auth/callback?next=${encoded}` },
    });
    expect(document.cookie).toContain(`lexi_edu_auth_origin=${encodeURIComponent(pathname + search)}`);
  });

  it('a magic link from the teacher page carries next and remembers it', async () => {
    mockLocation.pathname = '/en/teacher';
    await signInWithMagicLink('t@lexiclash.test');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({
      options: { emailRedirectTo: 'https://www.lexiclash.live/en/auth/callback?next=%2Fen%2Fteacher' },
    }));
    expect(document.cookie).toContain('lexi_edu_auth_origin=');
  });

  it('a later sign-in from the arcade forgets the edu page', async () => {
    mockLocation.pathname = '/en/teacher';
    await signInWithGoogle();
    mockLocation.pathname = '/en/multiplayer';
    await signInWithDiscord();
    expect(document.cookie).not.toContain('lexi_edu_auth_origin=');
  });

  it('the native deep link from an edu page carries next', async () => {
    platform.native = true;
    mockLocation.pathname = '/ru/student/join';
    await signInWithGoogle();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: 'lexiclash://auth/callback?locale=ru&next=%2Fru%2Fstudent%2Fjoin' },
    });
  });

  it('the native deep link from the arcade is unchanged', async () => {
    platform.native = true;
    mockLocation.pathname = '/en/multiplayer';
    await signInWithGoogle();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: 'lexiclash://auth/callback?locale=en' },
    });
  });

  it('a password sign-in from the arcade forgets an abandoned edu sign-in', async () => {
    mockLocation.pathname = '/en/teacher';
    await signInWithGoogle();
    mockLocation.pathname = '/en';
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: {} }, error: null });
    await signInWithEmail('p@lexiclash.test', 'pw');
    expect(document.cookie).not.toContain('lexi_edu_auth_origin=');
  });

  it('a magic link from the homepage after an abandoned edu sign-in lands home', async () => {
    mockLocation.pathname = '/en/teacher';
    await signInWithGoogle();
    mockLocation.pathname = '/en';
    await signInWithMagicLink('p@lexiclash.test');
    const sent = new URL(mockAuth.signInWithOtp.mock.calls[0][0].options.emailRedirectTo);
    const next = withRememberedEduOrigin(sent.searchParams.get('next'), eduAuthOriginFromCookies(document.cookie));
    expect(resolveAuthNext(next, 'en').url).toBe('/en');
  });
});
