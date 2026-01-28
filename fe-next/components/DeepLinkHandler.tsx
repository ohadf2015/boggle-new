'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import logger from '@/utils/logger';
import { defaultLocale, locales } from '@/lib/i18n';
import { isNative } from '@/utils/platform';

/**
 * DeepLinkHandler Component
 *
 * Handles deep link navigation for OAuth callbacks and other app links on Capacitor (mobile).
 * This ensures that when OAuth redirects, the app catches the deep link and navigates
 * to the correct page instead of staying in the browser.
 *
 * Supported URL formats:
 * - Custom scheme: lexiclash://auth/callback?code=abc123&locale=en (iOS)
 * - HTTPS App Links: https://www.lexiclash.live/auth/callback?code=abc123 (Android)
 *
 * IMPORTANT: Android uses HTTPS App Links because Chrome Custom Tabs don't reliably
 * intercept custom URL schemes. The AndroidManifest.xml has an intent-filter with
 * android:autoVerify="true" for the HTTPS domain.
 *
 * @example
 * // Add to root layout:
 * <DeepLinkHandler />
 */
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // Only run on Capacitor platforms (native mobile apps)
    if (typeof window === 'undefined') return;

    const handleAppUrlOpen = async (event: { url: string }) => {
      try {
        logger.log('Deep link received:', event.url);

        // Parse the deep link URL
        const url = new URL(event.url);

        // Determine if this is a custom scheme (lexiclash://) or HTTPS App Link
        const isHttpsAppLink = url.protocol === 'https:';

        // Extract the path based on URL type
        let path: string;
        if (isHttpsAppLink) {
          // HTTPS App Link: https://www.lexiclash.live/auth/callback
          // pathname is '/auth/callback'
          path = url.pathname.replace(/^\//, ''); // Remove leading slash
        } else {
          // Custom scheme: lexiclash://auth/callback
          // hostname is 'auth', pathname is '/callback'
          path = url.hostname + url.pathname;
        }

        // Check if this is an OAuth callback (close browser on native)
        const isAuthCallback = path.includes('auth/callback');
        if (isAuthCallback && isNative()) {
          try {
            logger.log('Closing OAuth browser after callback');
            await Browser.close();
          } catch {
            // Browser may already be closed - this is fine
            logger.log('Browser close (may already be closed)');
          }
        }

        // Extract query parameters
        const searchParams = new URLSearchParams(url.search);

        // Extract locale from query params (if provided) and remove it from query
        const locale = searchParams.get('locale') || defaultLocale;
        searchParams.delete('locale');

        // Remove internal tracking params (not needed for routing)
        searchParams.delete('from_app');

        // Validate locale
        const validLocale = locales.includes(locale) ? locale : defaultLocale;

        // Build the final route
        const queryString = searchParams.toString();
        const finalRoute = `/${validLocale}/${path}${queryString ? `?${queryString}` : ''}`;

        logger.log('Deep link routing to:', finalRoute);

        // Navigate to the route
        router.replace(finalRoute);
      } catch (error) {
        logger.error('Error handling deep link:', error);
      }
    };

    // Register the deep link listener
    let cleanup: (() => void) | null = null;

    App.addListener('appUrlOpen', handleAppUrlOpen)
      .then((listener) => {
        cleanup = () => listener.remove();
      })
      .catch((error) => {
        logger.error('Failed to register deep link listener:', error);
      });

    // Cleanup on unmount
    return () => {
      cleanup?.();
    };
  }, [router]);

  // This component doesn't render anything
  return null;
}
