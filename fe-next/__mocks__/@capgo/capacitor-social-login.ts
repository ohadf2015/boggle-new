/**
 * Mock for @capgo/capacitor-social-login
 *
 * Used in tests to mock the native social login plugin
 */

export const SocialLogin = {
  initialize: vi.fn().mockResolvedValue(undefined),
  login: vi.fn().mockResolvedValue({
    result: {
      idToken: 'mock-id-token-123',
      accessToken: 'mock-access-token-456'
    }
  }),
  logout: vi.fn().mockResolvedValue(undefined),
  isLoggedIn: vi.fn().mockResolvedValue({ isLoggedIn: false }),
  getAuthorizationCode: vi.fn().mockResolvedValue({ jwt: 'mock-jwt' }),
  refresh: vi.fn().mockResolvedValue({
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token'
  })
};
