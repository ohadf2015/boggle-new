/**
 * Mobile OAuth Utility
 * Handles OAuth authentication flow for Capacitor native apps using in-app browser
 *
 * The key difference from web OAuth:
 * - Web: Supabase redirects browser to OAuth provider, then back to app
 * - Mobile: We use skipBrowserRedirect and manually open in-app browser,
 *          which returns to the app when deep link is triggered
 *
 * IMPORTANT for Android:
 * Chrome Custom Tabs don't reliably handle custom URL schemes (lexiclash://).
 * We use HTTPS App Links (https://www.lexiclash.live/auth/callback) which are
 * properly verified via assetlinks.json and reliably trigger the app's intent filter.
 */

import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { isNative } from '@/utils/platform';
import { defaultLocale, locales } from '@/lib/i18n';
import logger from '@/utils/logger';

export interface MobileOAuthResult {
  success: boolean;
  error?: string;
}

/**
 * Get the current locale from URL path
 */
function getCurrentLocale(): string {
  if (typeof window === 'undefined') return defaultLocale;
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  if (firstSegment && locales.includes(firstSegment)) {
    return firstSegment;
  }
  return defaultLocale;
}

/**
 * Get the appropriate redirect URL for OAuth based on platform
 *
 * - iOS: Uses custom URL scheme (lexiclash://auth/callback) which works reliably
 *        with SFSafariViewController
 * - Android: Uses HTTPS App Links (https://www.lexiclash.live/auth/callback)
 *           because Chrome Custom Tabs don't reliably intercept custom URL schemes.
 *           The AndroidManifest.xml has an intent-filter with android:autoVerify="true"
 *           that intercepts this HTTPS URL and brings the user back to the app.
 */
function getOAuthRedirectUrl(locale: string): string {
  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    // Android: Use HTTPS App Links which are verified and reliably open the app
    // The locale is passed as a query param so the app knows where to redirect after auth
    return `https://www.lexiclash.live/auth/callback?locale=${locale}&from_app=true`;
  } else {
    // iOS: Custom URL scheme works reliably with SFSafariViewController
    return `lexiclash://auth/callback${locale ? `?locale=${locale}` : ''}`;
  }
}

/**
 * Perform OAuth sign-in on mobile using in-app browser
 * This uses Capacitor's Browser plugin to open OAuth in an in-app browser session,
 * which automatically returns to the app when the deep link callback is triggered.
 *
 * @param provider - OAuth provider ('google' or 'discord')
 * @returns Promise with success/error result
 */
export async function performMobileOAuth(
  provider: 'google' | 'discord'
): Promise<MobileOAuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  if (!isNative()) {
    return { success: false, error: 'Not running in native environment' };
  }

  const currentLocale = getCurrentLocale();
  const redirectTo = getOAuthRedirectUrl(currentLocale);

  try {
    logger.log(`[MobileOAuth] Starting ${provider} OAuth with redirect: ${redirectTo}`);

    // Get OAuth URL with skipBrowserRedirect to prevent automatic navigation
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Critical: Don't let Supabase open external browser
      },
    });

    if (error) {
      logger.error('[MobileOAuth] Failed to get OAuth URL:', error);
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      logger.error('[MobileOAuth] No OAuth URL returned');
      return { success: false, error: 'No OAuth URL returned' };
    }

    logger.log('[MobileOAuth] Opening in-app browser for OAuth');

    // Open OAuth URL in in-app browser (SFSafariViewController on iOS, Custom Tabs on Android)
    // This browser session will close automatically when the deep link is triggered
    await Browser.open({
      url: data.url,
      presentationStyle: 'popover', // iOS: Use popover style for auth
      windowName: '_self', // Android: Stay in app
    });

    // The Browser plugin doesn't return when auth completes - the deep link handler
    // (DeepLinkHandler component) catches the callback URL and
    // navigates to /auth/callback page where the code is exchanged for session

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during OAuth';
    logger.error('[MobileOAuth] OAuth error:', err);
    return { success: false, error: errorMessage };
  }
}

/**
 * Close the in-app browser (call after OAuth completes or on cancel)
 */
export async function closeMobileOAuthBrowser(): Promise<void> {
  if (!isNative()) return;

  try {
    await Browser.close();
  } catch (err) {
    // Browser may already be closed
    logger.log('[MobileOAuth] Browser close (may already be closed):', err);
  }
}

/**
 * Listen for OAuth callback deep link and extract session data
 * This is a one-time listener for the OAuth callback
 *
 * @param onCallback - Callback function with the URL
 * @returns Cleanup function to remove listener
 */
export async function listenForOAuthCallback(
  onCallback: (url: string) => void
): Promise<() => void> {
  if (!isNative()) {
    return () => {};
  }

  const listener = await App.addListener('appUrlOpen', (event) => {
    if (event.url.includes('auth/callback')) {
      logger.log('[MobileOAuth] Received OAuth callback:', event.url);
      onCallback(event.url);
    }
  });

  return () => {
    listener.remove();
  };
}
