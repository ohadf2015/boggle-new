'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import logger from '@/utils/logger';
import { defaultLocale, locales } from '@/lib/i18n';
import { isNative } from '@/utils/platform';
import { setupPushListeners } from '@/utils/pushNotifications/tokenRegistration';
import { handlePushData } from '@/utils/pushNotifications/handlePushData';

/**
 * DeepLinkHandler Component
 *
 * Handles deep link navigation for OAuth callbacks and other app links on Capacitor (mobile).
 * Dynamically imports Capacitor plugins to support both legacy and Capacitor 8 plugin patterns.
 */
export default function DeepLinkHandler() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined' || !isNative()) return;

    let cleanup: (() => void) | null = null;
    let pushCleanup: (() => void) | null = null;
    let mounted = true;

    function getSyncAppPlugin() {
      return (globalThis as any).Capacitor?.Plugins?.App ?? null;
    }

    function getSyncBrowserPlugin() {
      return (globalThis as any).Capacitor?.Plugins?.Browser ?? null;
    }

    async function getAppPlugin() {
      const legacy = getSyncAppPlugin();
      if (legacy) return legacy;
      try { return (await import('@capacitor/app')).App; } catch { return null; }
    }

    async function getBrowserPlugin() {
      const legacy = getSyncBrowserPlugin();
      if (legacy) return legacy;
      try { return (await import('@capacitor/browser')).Browser; } catch { return null; }
    }

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
          const BrowserPlugin = getSyncBrowserPlugin() ?? await getBrowserPlugin();
          if (BrowserPlugin) {
            try {
              logger.log('Closing OAuth browser after callback');
              await BrowserPlugin.close();
            } catch {
              logger.log('Browser close (may already be closed)');
            }
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

    // Register synchronously if plugin is available (covers test env & native Capacitor bridge)
    const syncApp = getSyncAppPlugin();
    if (syncApp) {
      try {
        const listenerResult = syncApp.addListener('appUrlOpen', handleAppUrlOpen);
        if (listenerResult && typeof listenerResult.then === 'function') {
          listenerResult.then((listener: { remove: () => void }) => {
            if (mounted) cleanup = () => listener.remove();
          }).catch((error: unknown) => {
            logger.debug('Deep link listener unavailable:', error);
          });
        } else if (listenerResult?.remove) {
          cleanup = () => listenerResult.remove();
        }
      } catch (error) {
        logger.debug('Deep link listener unavailable:', error);
      }
    } else {
      // Async fallback for dynamic import path
      getAppPlugin().then((AppPlugin) => {
        if (!AppPlugin || !mounted) return;
        try {
          Promise.resolve(AppPlugin.addListener('appUrlOpen', handleAppUrlOpen))
            .then((listener: { remove: () => void }) => {
              if (mounted) cleanup = () => listener.remove();
            })
            .catch((error: unknown) => {
              logger.debug('Deep link listener unavailable:', error);
            });
        } catch (error) {
          logger.debug('Deep link listener unavailable:', error);
        }
      });
    }

    async function initPush() {
      try {
        pushCleanup = await setupPushListeners(
          (data) => {
            handlePushData(queryClient, data);
          },
          (data) => {
            handlePushData(queryClient, data);
            const deepLink = data.deepLink;
            if (deepLink) {
              const validLocale = (typeof window !== 'undefined' && locales.find((l) => window.location.pathname.startsWith(`/${l}`))) || defaultLocale;
              const route = deepLink.startsWith('/') ? `/${validLocale}${deepLink}` : `/${validLocale}/${deepLink}`;
              logger.log('Push notification tap routing to:', route);
              router.replace(route);
            }
          }
        );
      } catch (error) {
        logger.error('Failed to set up push listeners:', error);
      }
    }

    initPush();

    return () => {
      mounted = false;
      cleanup?.();
      pushCleanup?.();
    };
  }, [router, queryClient]);

  return null;
}
