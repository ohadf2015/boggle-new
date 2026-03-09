/**
 * Supabase OTP Auth Functions Tests
 * Tests for email OTP sign-in (mobile-friendly magic link alternative)
 */

// Must mock before importing the module
const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      signInWithOAuth: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  })),
}));

jest.mock('@/utils/logger', () => ({ warn: jest.fn(), log: jest.fn(), error: jest.fn() }));
jest.mock('@/utils/crossTabAuthSync', () => ({ broadcastSignedOut: jest.fn() }));
jest.mock('@/utils/platform', () => ({ isNative: jest.fn(() => true) }));

import { sendOtpCode, verifyOtpCode } from '../supabase';

describe('OTP auth functions', () => {
  beforeEach(() => jest.clearAllMocks());

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
