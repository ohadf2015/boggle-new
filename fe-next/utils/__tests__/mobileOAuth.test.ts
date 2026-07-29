/**
 * Tests for Mobile OAuth Utility
 *
 * Verifies the in-app browser OAuth flow for Capacitor native apps
 */

import { performMobileOAuth, closeMobileOAuthBrowser } from '../mobileOAuth';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

vi.mock('@/utils/platform', () => ({
  isNative: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  defaultLocale: 'en',
  locales: ['en', 'he', 'sv', 'ja', 'es'],
}));

import { supabase } from '@/lib/supabase';
import { isNative } from '@/utils/platform';

// Browser mock functions accessible from tests
const mockBrowserOpen = vi.fn().mockResolvedValue(undefined);
const mockBrowserClose = vi.fn().mockResolvedValue(undefined);

describe('Mobile OAuth Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to native platform
    (isNative as any).mockReturnValue(true);
    // Reset browser mocks
    mockBrowserOpen.mockResolvedValue(undefined);
    mockBrowserClose.mockResolvedValue(undefined);
    // Set up globalThis.Capacitor
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'ios',
      Plugins: {
        Browser: {
          open: mockBrowserOpen,
          close: mockBrowserClose,
        },
        App: {
          addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
        },
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).Capacitor;
  });

  describe('performMobileOAuth', () => {
    it('should return error when not in native environment', async () => {
      // GIVEN: Not running in native environment
      (isNative as any).mockReturnValue(false);

      // WHEN: Attempting mobile OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not running in native environment');
      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('should get OAuth URL with skipBrowserRedirect and open in-app browser', async () => {
      // GIVEN: Native platform with Supabase configured
      const mockOAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
      (supabase!.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should call signInWithOAuth with skipBrowserRedirect
      expect(supabase!.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('lexiclash://auth/callback'),
          skipBrowserRedirect: true,
        },
      });

      // AND: Should open in-app browser with OAuth URL
      expect(mockBrowserOpen).toHaveBeenCalledWith({
        url: mockOAuthUrl,
        presentationStyle: 'popover',
        windowName: '_self',
      });

      // AND: Should return success
      expect(result.success).toBe(true);
    });

    it('should return error when OAuth URL fetch fails', async () => {
      // GIVEN: Supabase returns an error
      (supabase!.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      });

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('discord');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth provider error');
      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('should return error when no OAuth URL is returned', async () => {
      // GIVEN: Supabase returns no URL
      (supabase!.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: null },
        error: null,
      });

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('No OAuth URL returned');
      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('should handle browser open error gracefully', async () => {
      // GIVEN: Browser.open throws an error
      const mockOAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
      (supabase!.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });
      mockBrowserOpen.mockRejectedValue(new Error('Browser unavailable'));

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Browser unavailable');
    });

    it('should work with Discord provider', async () => {
      // GIVEN: Discord OAuth setup
      const mockOAuthUrl = 'https://discord.com/oauth2/authorize?...';
      (supabase!.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });

      // WHEN: Performing OAuth with Discord
      const result = await performMobileOAuth('discord');

      // THEN: Should call with discord provider
      expect(supabase!.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'discord',
        })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('closeMobileOAuthBrowser', () => {
    it('should close the browser on native platform', async () => {
      // GIVEN: Native platform
      (isNative as any).mockReturnValue(true);

      // WHEN: Closing browser
      await closeMobileOAuthBrowser();

      // THEN: Should call Browser.close
      expect(mockBrowserClose).toHaveBeenCalled();
    });

    it('should not attempt to close browser on web', async () => {
      // GIVEN: Web platform
      (isNative as any).mockReturnValue(false);

      // WHEN: Closing browser
      await closeMobileOAuthBrowser();

      // THEN: Should not call Browser.close
      expect(mockBrowserClose).not.toHaveBeenCalled();
    });

    it('should handle browser close error gracefully', async () => {
      // GIVEN: Browser.close throws (already closed)
      (isNative as any).mockReturnValue(true);
      mockBrowserClose.mockRejectedValue(new Error('Already closed'));

      // WHEN: Closing browser
      // THEN: Should not throw
      await expect(closeMobileOAuthBrowser()).resolves.not.toThrow();
    });
  });
});
