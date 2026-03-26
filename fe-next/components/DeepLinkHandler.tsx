'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import logger from '@/utils/logger';
import { defaultLocale, locales } from '@/lib/i18n';
import { isNative } from '@/utils/platform';
import { setupPushListeners } from '@/utils/pushNotifications/tokenRegistration';

/**
 * DeepLinkHandler Component
 *
 * Handles deep link navigation for OAuth callbacks and other app links on Capacitor (mobile).
 * Capacitor packages are dynamically imported to avoid Turbopack bundling issues on web.
 */
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only run on Capacitor platforms (native mobile apps)
    // Dynamic import avoids Turbopack/SWC helper resolution errors on web
    if (!isNative()) return;

    let cleanup: (() => void) | null = null;
    let pushCleanup: (() => void) | null = null;

    const init = async () => {
      const [{ App }, { Browser }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/browser'),
      ]);

      const handleAppUrlOpen = async (event: { url: string }) => {
        try {
          logger.log('Deep link received:', event.url);

          const url = new URL(event.url);
          const isHttpsAppLink = url.protocol === 'https:';

          let path: string;
          if (isHttpsAppLink) {
            path = url.pathname.replace(/^\//, '');
          } else {
            path = url.hostname + url.pathname;
          }

          const isAuthCallback = path.includes('auth/callback');
          if (isAuthCallback) {
            try {
              logger.log('Closing OAuth browser after callback');
              await Browser.close();
            } catch {
              logger.log('Browser close (may already be closed)');
            }
          }

          const searchParams = new URLSearchParams(url.search);
          const locale = searchParams.get('locale') || defaultLocale;
          searchParams.delete('locale');
          searchParams.delete('from_app');

          const validLocale = locales.includes(locale) ? locale : defaultLocale;
          const queryString = searchParams.toString();
          const finalRoute = `/${validLocale}/${path}${queryString ? `?${queryString}` : ''}`;

          logger.log('Deep link routing to:', finalRoute);
          router.replace(finalRoute);
        } catch (error) {
          logger.error('Error handling deep link:', error);
        }
      };

      try {
        const listener = await App.addListener('appUrlOpen', handleAppUrlOpen);
        cleanup = () => listener.remove();
      } catch (error) {
        logger.error('Failed to register deep link listener:', error);
      }

      try {
        const fn = await setupPushListeners(
          undefined,
          (data) => {
            const deepLink = data.deepLink;
            if (deepLink) {
              const validLocale = (typeof window !== 'undefined' && locales.find((l) => window.location.pathname.startsWith(`/${l}`))) || defaultLocale;
              const route = deepLink.startsWith('/') ? `/${validLocale}${deepLink}` : `/${validLocale}/${deepLink}`;
              logger.log('Push notification tap routing to:', route);
              router.replace(route);
            }
          }
        );
        pushCleanup = fn;
      } catch (error) {
        logger.error('Failed to set up push listeners:', error);
      }
    };

    init();

    return () => {
      cleanup?.();
      pushCleanup?.();
    };
  }, [router]);

  return null;
}
