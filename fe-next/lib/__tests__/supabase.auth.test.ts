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
vi.mock('@/utils/platform', () => ({ isNative: () => false }));

const mockLocation = { pathname: '/en/multiplayer', search: '', origin: 'https://www.lexiclash.live' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

import { signInWithMagicLink, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithDiscord } from '../supabase';

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

  it('calls signUp with locale-aware redirect including next param', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: {} }, error: null });
    await signUpWithEmail('new@example.com', 'password123');
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com', password: 'password123',
      options: { emailRedirectTo: 'https://www.lexiclash.live/en/auth/callback?next=%2Fen%2Fmultiplayer' },
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
