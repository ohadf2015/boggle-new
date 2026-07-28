'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import logger from '@/utils/logger';
import { defaultLocale, locales } from '@/lib/i18n';
import { isNative } from '@/utils/platform';
import { setupPushListeners } from '@/utils/pushNotifications/tokenRegistration';
import { handlePushData } from '@/utils/pushNotifications/handlePushData';

const isValidLocale = (locale: string | null | undefined): locale is string =>
  !!locale && locales.includes(locale);

/** Locale of the page the app is currently on (the remote app redirects /→/{locale} on boot). */
function detectLocaleFromPath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  return isValidLocale(firstSegment) ? firstSegment : undefined;
}

/** Stored language preference — the same cookie app/route.ts uses to pick the boot redirect. */
function detectLocaleFromCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)boggle_language=([^;]+)/);
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return isValidLocale(value) ? value : undefined;
}

/**
 * Resolve the locale for a deep link. Shortcut/App-Link URLs carry no ?locale=,
 * so prefer an explicit param, then the on-screen path, then the language
 * cookie, and only then defaultLocale ('en' since 066d75006 — defaulting to
 * 'he' had been routing every non-Hebrew player to a Hebrew page).
 */
function resolvePreferredLocale(explicit: string | null): string {
  if (isValidLocale(explicit)) return explicit;
  return detectLocaleFromPath() ?? detectLocaleFromCookie() ?? defaultLocale;
}

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

    type CapListener = { remove: () => void };
    type CapAppPlugin = {
      addListener: (event: string, handler: (e: { url: string }) => void) => CapListener | Promise<CapListener>;
      // Cold-start path: the launch URL is only here, not via appUrlOpen. See below.
      getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
    };
    type CapBrowserPlugin = { close: () => Promise<void> };
    type CapGlobal = { Capacitor?: { Plugins?: { App?: CapAppPlugin; Browser?: CapBrowserPlugin }; isPluginAvailable?: (name: string) => boolean } };

    function getSyncAppPlugin(): CapAppPlugin | null {
      return (globalThis as unknown as CapGlobal).Capacitor?.Plugins?.App ?? null;
    }

    function getSyncBrowserPlugin(): CapBrowserPlugin | null {
      return (globalThis as unknown as CapGlobal).Capacitor?.Plugins?.Browser ?? null;
    }

    // Re-wrap a Capacitor plugin proxy in a plain object. The web proxy traps
    // EVERY property read — including `.then`, which the promise machinery
    // reads on any value returned from an async function — so returning the
    // raw proxy across an async boundary rejects with `"App.then()" is not
    // implemented on web` as an UNHANDLED rejection.
    const unwrapPluginProxy = (plugin: CapAppPlugin): CapAppPlugin => ({
      addListener: (event, handler) => plugin.addListener(event, handler),
      getLaunchUrl: plugin.getLaunchUrl ? () => plugin.getLaunchUrl!() : undefined,
    });

    async function getAppPlugin(): Promise<CapAppPlugin | null> {
      const legacy = getSyncAppPlugin();
      if (legacy) return unwrapPluginProxy(legacy);
      try {
        const mod = await import('@capacitor/app');
        return mod.App ? unwrapPluginProxy(mod.App as unknown as CapAppPlugin) : null;
      } catch { return null; }
    }

    async function getBrowserPlugin() {
      const legacy = getSyncBrowserPlugin();
      // Same `.then` trap as the App proxy — never return the raw object
      // across this async boundary.
      if (legacy) return { close: () => legacy.close() };
      try {
        const mod = await import('@capacitor/browser');
        return mod.Browser ? { close: () => mod.Browser.close() } : null;
      } catch { return null; }
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
        const validLocale = resolvePreferredLocale(searchParams.get('locale'));
        searchParams.delete('locale');
        searchParams.delete('from_app');

        const queryString = searchParams.toString();
        const finalRoute = `/${validLocale}/${path}${queryString ? `?${queryString}` : ''}`;

        logger.log('Deep link routing to:', finalRoute);
        router.replace(finalRoute);
      } catch (error) {
        logger.error('Error handling deep link:', error);
      }
    };

    // Cold-start deep links (Android app shortcuts, App Links opened while the app
    // is NOT running). On cold start Capacitor delivers the VIEW intent during
    // BridgeActivity.onCreate — BEFORE the remote WebView has loaded and this
    // listener is registered — so the retained `appUrlOpen` replay is unreliable
    // across the /→/{locale} redirect. The launch URL is reliably available from
    // App.getLaunchUrl() (native bridge.getIntentUri()), so read it directly.
    // sessionStorage scopes this to once per WebView session (= once per cold
    // start); a true relaunch gets a fresh session and re-reads the new launch URL.
    const LAUNCH_HANDLED_KEY = '__lexi_launch_url_handled';

    const launchUrlHasTarget = (rawUrl: string): boolean => {
      try {
        const u = new URL(rawUrl);
        // Custom scheme (lexiclash://connections): the host carries the target.
        if (u.protocol !== 'https:' && u.protocol !== 'http:') {
          return (u.hostname + u.pathname).replace(/^\/+/, '').length > 0;
        }
        // App Link / web URL: only route when there's a real path or query —
        // a bare origin ("https://host/") IS the homepage, so don't redirect.
        return u.pathname.replace(/^\/+/, '').length > 0 || u.search.length > 0;
      } catch {
        return false;
      }
    };

    // Cold-start retry budget: the native bridge can take a beat to register
    // @capacitor/app after the WebView mounts, so we poll a few times rather
    // than reading the launch URL exactly once and giving up.
    const COLD_START_MAX_ATTEMPTS = 10;
    const COLD_START_RETRY_MS = 150;
    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const handleColdStartLaunchUrl = async () => {
      try {
        if (window.sessionStorage.getItem(LAUNCH_HANDLED_KEY) === '1') return;
      } catch { /* sessionStorage unavailable — fall through, best-effort */ }

      // The native bridge can register @capacitor/app slightly AFTER this
      // component mounts (cold-start WebView race, Sentry JAVASCRIPT-NEXTJS-12A).
      // Reading the launch URL once and bailing would silently drop every
      // cold-start deep link onto the home page, so retry until the bridge
      // answers. A *resolved* value — even `undefined` for a launcher-icon
      // start — is a definitive answer that ends the loop; only a missing
      // plugin or a rejected call (bridge not ready) triggers a retry.
      for (let attempt = 0; attempt < COLD_START_MAX_ATTEMPTS && mounted; attempt++) {
        const AppPlugin = getSyncAppPlugin() ?? (await getAppPlugin());
        if (!AppPlugin || typeof AppPlugin.getLaunchUrl !== 'function') {
          await delay(COLD_START_RETRY_MS);
          continue;
        }

        let launchUrl: string | undefined;
        try {
          const launch = await AppPlugin.getLaunchUrl();
          launchUrl = launch?.url;
        } catch (error) {
          // Bridge not ready yet — back off and retry.
          logger.debug('getLaunchUrl not ready, retrying:', error);
          await delay(COLD_START_RETRY_MS);
          continue;
        }

        // Definitive answer received. Route only when it carries a real target;
        // a bare origin / missing URL means "launched normally" → stay home.
        if (!mounted) return;
        if (!launchUrl || !launchUrlHasTarget(launchUrl)) return;

        // Mark consumed BEFORE awaiting the route so a fast remount mid-await
        // cannot double-fire (appUrlOpen may also replay the same URL).
        try { window.sessionStorage.setItem(LAUNCH_HANDLED_KEY, '1'); } catch { /* ignore */ }
        await handleAppUrlOpen({ url: launchUrl });
        return;
      }
    };

    // Register the warm-start appUrlOpen listener. We deliberately do NOT gate
    // this on Capacitor.isPluginAvailable('App'): during the cold-start WebView
    // race that check can report false before the bridge finishes registering
    // the plugin, which permanently skipped deep-link handling and dropped users
    // on the home page (silent failure). Acquisition already degrades gracefully
    // (sync plugin → dynamic import) and every call is wrapped in try/catch.
    const syncApp = getSyncAppPlugin();
    if (syncApp) {
      try {
        const listenerResult = syncApp.addListener('appUrlOpen', handleAppUrlOpen);
        Promise.resolve(listenerResult)
          .then((listener) => {
            if (mounted) cleanup = () => listener.remove();
          })
          .catch((error: unknown) => {
            logger.debug('Deep link listener unavailable:', error);
          });
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

    // After wiring the warm-start listener, resolve any cold-start launch URL.
    void handleColdStartLaunchUrl();

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
