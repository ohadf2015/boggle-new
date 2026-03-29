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
 * Uses globalThis.Capacitor.Plugins to avoid any @capacitor/* imports that break Turbopack.
 */
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !isNative()) return;

    const plugins = (globalThis as any).Capacitor?.Plugins;
    const AppPlugin = plugins?.App;
    const BrowserPlugin = plugins?.Browser;
    if (!AppPlugin) return;

    let cleanup: (() => void) | null = null;
    let pushCleanup: (() => void) | null = null;

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
        if (isAuthCallback && BrowserPlugin) {
          try {
            logger.log('Closing OAuth browser after callback');
            await BrowserPlugin.close();
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

    Promise.resolve(AppPlugin.addListener('appUrlOpen', handleAppUrlOpen))
      .then((listener: { remove: () => void }) => {
        cleanup = () => listener.remove();
      })
      .catch((error: unknown) => {
        logger.error('Failed to register deep link listener:', error);
      });

    setupPushListeners(
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
    ).then((fn) => {
      pushCleanup = fn;
    }).catch((error) => {
      logger.error('Failed to set up push listeners:', error);
    });

    return () => {
      cleanup?.();
      pushCleanup?.();
    };
  }, [router]);

  return null;
}
