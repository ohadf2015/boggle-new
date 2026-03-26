/**
 * Tests for Mobile OAuth Utility
 *
 * Verifies the in-app browser OAuth flow for Capacitor native apps
 */

import { performMobileOAuth, closeMobileOAuthBrowser } from '../mobileOAuth';

// Mock dependencies
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

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

import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase';
import { isNative } from '@/utils/platform';

describe('Mobile OAuth Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to native platform
    (isNative as jest.Mock).mockReturnValue(true);
  });

  describe('performMobileOAuth', () => {
    it('should return error when not in native environment', async () => {
      // GIVEN: Not running in native environment
      (isNative as jest.Mock).mockReturnValue(false);

      // WHEN: Attempting mobile OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not running in native environment');
      expect(Browser.open).not.toHaveBeenCalled();
    });

    // Note: Testing supabase === null case is complex due to module loading
    // The null check is covered by other integration tests

    it('should get OAuth URL with skipBrowserRedirect and open in-app browser', async () => {
      // GIVEN: Native platform with Supabase configured
      const mockOAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
      (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
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
      expect(Browser.open).toHaveBeenCalledWith({
        url: mockOAuthUrl,
        presentationStyle: 'popover',
        windowName: '_self',
      });

      // AND: Should return success
      expect(result.success).toBe(true);
    });

    it('should return error when OAuth URL fetch fails', async () => {
      // GIVEN: Supabase returns an error
      (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      });

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('discord');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth provider error');
      expect(Browser.open).not.toHaveBeenCalled();
    });

    it('should return error when no OAuth URL is returned', async () => {
      // GIVEN: Supabase returns no URL
      (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: null },
        error: null,
      });

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('No OAuth URL returned');
      expect(Browser.open).not.toHaveBeenCalled();
    });

    it('should handle browser open error gracefully', async () => {
      // GIVEN: Browser.open throws an error
      const mockOAuthUrl = 'https://accounts.google.com/oauth/authorize?...';
      (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
        data: { url: mockOAuthUrl },
        error: null,
      });
      (Browser.open as jest.Mock).mockRejectedValue(new Error('Browser unavailable'));

      // WHEN: Performing OAuth
      const result = await performMobileOAuth('google');

      // THEN: Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBe('Browser unavailable');
    });

    it('should work with Discord provider', async () => {
      // GIVEN: Discord OAuth setup
      const mockOAuthUrl = 'https://discord.com/oauth2/authorize?...';
      // Reset mocks to ensure clean state (clearAllMocks clears calls but not implementations)
      jest.clearAllMocks();
      (isNative as jest.Mock).mockReturnValue(true);
      // Reset Browser.open to resolve successfully (previous test made it reject)
      (Browser.open as jest.Mock).mockResolvedValue(undefined);
      (supabase!.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
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
      (isNative as jest.Mock).mockReturnValue(true);

      // WHEN: Closing browser
      await closeMobileOAuthBrowser();

      // THEN: Should call Browser.close
      expect(Browser.close).toHaveBeenCalled();
    });

    it('should not attempt to close browser on web', async () => {
      // GIVEN: Web platform
      (isNative as jest.Mock).mockReturnValue(false);

      // WHEN: Closing browser
      await closeMobileOAuthBrowser();

      // THEN: Should not call Browser.close
      expect(Browser.close).not.toHaveBeenCalled();
    });

    it('should handle browser close error gracefully', async () => {
      // GIVEN: Browser.close throws (already closed)
      (isNative as jest.Mock).mockReturnValue(true);
      (Browser.close as jest.Mock).mockRejectedValue(new Error('Already closed'));

      // WHEN: Closing browser
      // THEN: Should not throw
      await expect(closeMobileOAuthBrowser()).resolves.not.toThrow();
    });
  });
});
