/**
 * Mock for @capgo/capacitor-social-login
 *
 * Used in Jest tests to mock the native social login plugin
 */

export const SocialLogin = {
  initialize: jest.fn().mockResolvedValue(undefined),
  login: jest.fn().mockResolvedValue({
    result: {
      idToken: 'mock-id-token-123',
      accessToken: 'mock-access-token-456'
    }
  }),
  logout: jest.fn().mockResolvedValue(undefined),
  isLoggedIn: jest.fn().mockResolvedValue({ isLoggedIn: false }),
  getAuthorizationCode: jest.fn().mockResolvedValue({ jwt: 'mock-jwt' }),
  refresh: jest.fn().mockResolvedValue({
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token'
  })
};
