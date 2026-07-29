import { vi } from 'vitest';
/**
 * Supabase OTP Auth Functions Tests
 * Tests for email OTP sign-in (mobile-friendly magic link alternative)
 */

// Must use vi.hoisted so these are available to vi.mock (which is hoisted above imports)
const { mockSignInWithOtp, mockVerifyOtp } = vi.hoisted(() => {
  // Set env vars before module loads so supabase client is created
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  return {
    mockSignInWithOtp: vi.fn(),
    mockVerifyOtp: vi.fn(),
  };
});

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      signInWithOAuth: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
}));

vi.mock('@/utils/logger', () => ({ default: { warn: vi.fn(), log: vi.fn(), error: vi.fn() }, warn: vi.fn(), log: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/crossTabAuthSync', () => ({ broadcastSignedOut: vi.fn() }));
vi.mock('@/utils/platform', () => ({ isNative: vi.fn(() => true) }));

import { sendOtpCode, verifyOtpCode } from '../supabase';

describe('OTP auth functions', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('sendOtpCode', () => {
    it('should call signInWithOtp without emailRedirectTo', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: {}, error: null });
      const result = await sendOtpCode('test@example.com');
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
      expect(result.error).toBeNull();
    });

    it('should return error when supabase fails', async () => {
      mockSignInWithOtp.mockResolvedValue({ data: null, error: { message: 'Rate limit exceeded' } });
      const result = await sendOtpCode('test@example.com');
      expect(result.error).toEqual({ message: 'Rate limit exceeded' });
    });
  });

  describe('verifyOtpCode', () => {
    it('should call verifyOtp with email type', async () => {
      mockVerifyOtp.mockResolvedValue({ data: { session: { access_token: 'abc' } }, error: null });
      const result = await verifyOtpCode('test@example.com', '123456');
      expect(mockVerifyOtp).toHaveBeenCalledWith({ email: 'test@example.com', token: '123456', type: 'email' });
      expect(result.error).toBeNull();
    });

    it('should return error on invalid code', async () => {
      mockVerifyOtp.mockResolvedValue({ data: null, error: { message: 'Token has expired or is invalid' } });
      const result = await verifyOtpCode('test@example.com', '000000');
      expect(result.error).toEqual({ message: 'Token has expired or is invalid' });
    });
  });
});
