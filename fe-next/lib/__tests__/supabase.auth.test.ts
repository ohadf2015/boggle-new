/**
 * Supabase Auth Functions Tests
 *
 * Tests for signInWithMagicLink, signInWithEmail, signUpWithEmail, OAuth.
 */

import { mockAuth } from './__mocks__/supabaseAuthMocks';

jest.mock('@supabase/ssr', () => {
   
  const { mockAuth: auth } = require('./__mocks__/supabaseAuthMocks');
  return {
    createBrowserClient: () => ({
      auth,
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        maybeSingle: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
      })),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          remove: jest.fn(),
          getPublicUrl: jest.fn(),
        })),
      },
    }),
  };
});

jest.mock('@/utils/logger', () => ({
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('@/utils/crossTabAuthSync', () => ({ broadcastSignedOut: jest.fn() }));
jest.mock('@/utils/platform', () => ({ isNative: () => false }));

const mockLocation = { pathname: '/en/multiplayer', origin: 'https://lexiclash.com' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

import { signInWithMagicLink, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithDiscord } from '../supabase';

describe('signInWithMagicLink', () => {
  beforeEach(() => { jest.clearAllMocks(); mockLocation.pathname = '/en/multiplayer'; });

  it('calls signInWithOtp with email and locale-aware redirect', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    const result = await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { emailRedirectTo: 'https://lexiclash.com/auth/callback?locale=en' },
    });
    expect(result.error).toBeNull();
  });

  it('includes Hebrew locale from URL path', async () => {
    mockLocation.pathname = '/he/game';
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'https://lexiclash.com/auth/callback?locale=he' } })
    );
  });

  it('omits locale when path has no locale segment', async () => {
    mockLocation.pathname = '/auth/callback';
    mockAuth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await signInWithMagicLink('user@example.com');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: 'https://lexiclash.com/auth/callback' } })
    );
  });

  it('returns error when OTP call fails', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ data: null, error: { message: 'Rate limit exceeded' } });
    const result = await signInWithMagicLink('user@example.com');
    expect(result.error).toEqual({ message: 'Rate limit exceeded' });
  });
});

describe('signInWithEmail', () => {
  beforeEach(() => jest.clearAllMocks());

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
  beforeEach(() => { jest.clearAllMocks(); mockLocation.pathname = '/en/multiplayer'; });

  it('calls signUp with locale-aware redirect', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: {} }, error: null });
    await signUpWithEmail('new@example.com', 'password123');
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com', password: 'password123',
      options: { emailRedirectTo: 'https://lexiclash.com/auth/callback?locale=en' },
    });
  });
});

describe('signInWithGoogle', () => {
  beforeEach(() => { jest.clearAllMocks(); mockLocation.pathname = '/en/multiplayer'; });

  it('calls signInWithOAuth with google provider', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    await signInWithGoogle();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: 'https://lexiclash.com/auth/callback?locale=en' },
    });
  });
});

describe('signInWithDiscord', () => {
  beforeEach(() => { jest.clearAllMocks(); mockLocation.pathname = '/sv/game'; });

  it('calls signInWithOAuth with discord and locale', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
    await signInWithDiscord();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'discord', options: { redirectTo: 'https://lexiclash.com/auth/callback?locale=sv' },
    });
  });
});
