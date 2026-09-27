'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import logger from '@/utils/logger';
import { defaultLocale, locales } from '@/lib/i18n';
import { isNative } from '@/utils/platform';
import { setupPushListeners } from '@/utils/pushNotifications/tokenRegistration';
import { handlePushData } from '@/utils/pushNotifications/handlePushData';
import { withoutCapacitorThenable } from '@/lib/native/withoutCapacitorThenable';

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
 * Turn an incoming deep-link URL into the in-app route to navigate to.
 *
 * Pure (locale context is passed in) so the path arithmetic is unit-testable
 * without a Capacitor bridge — see components/__tests__/deepLinkRoute.test.ts.
 *
 * The subtlety this exists for: the app is a WebView on https://www.lexiclash.live
 * (capacitor.config.ts `server.url`), so every URL a user actually shares is a
 * full site URL and therefore ALREADY carries a locale segment — `/en/daily`,
 * `/he/join/ABC`. Blindly prefixing the app's current locale produced
 * `/en/en/daily`, which 404s, so every shared link dropped the user on the home
 * page. Custom-scheme links (`lexiclash://daily`) carry the first segment in the
 * hostname and usually have no locale, so both shapes are normalised to a
 * segment list before the locale is decided.
 */
export function buildDeepLinkRoute(
  rawUrl: string,
  ambientLocale: string,
): { route: string; isAuthCallback: boolean } | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const isHttpLike = url.protocol === 'https:' || url.protocol === 'http:';
  // Custom scheme: `lexiclash://join/ABC` parses as hostname 'join', pathname '/ABC'.
  const rawPath = isHttpLike ? url.pathname : `${url.hostname}${url.pathname}`;
  const segments = rawPath.split('/').filter(Boolean);

  // A leading locale segment belongs to the link, not to the path — pull it out
  // so it can win over the locale the app happens to be showing. A player who
  // shares /he/daily should open the Hebrew board on the recipient's device.
  const localeFromLink = isValidLocale(segments[0]) ? segments.shift() : undefined;
  const path = segments.join('/');

  const searchParams = new URLSearchParams(url.search);
  const explicitLocale = searchParams.get('locale');
  searchParams.delete('locale');
  searchParams.delete('from_app');

  const locale = isValidLocale(explicitLocale)
    ? explicitLocale
    : (localeFromLink ?? ambientLocale);

  const queryString = searchParams.toString();
  const route = `/${locale}${path ? `/${path}` : ''}${queryString ? `?${queryString}` : ''}`;

  return { route, isAuthCallback: path.includes('auth/callback') };
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

    async function getAppPlugin(): Promise<CapAppPlugin | null> {
      const legacy = getSyncAppPlugin();
      if (legacy) return withoutCapacitorThenable(legacy);
      try {
        // Must strip `.then` before returning: Capacitor's plugin proxy is a
        // thenable, so `return App` from this async fn calls App.then() and
        // leaks `"App.then()" is not implemented on web` (UNIMPLEMENTED).
        return withoutCapacitorThenable(
          (await import('@capacitor/app')).App as unknown as CapAppPlugin,
        );
      } catch {
        return null;
      }
    }

    async function getBrowserPlugin() {
      const legacy = getSyncBrowserPlugin();
      if (legacy) return withoutCapacitorThenable(legacy);
      try {
        return withoutCapacitorThenable((await import('@capacitor/browser')).Browser);
      } catch {
        return null;
      }
    }

    const handleAppUrlOpen = async (event: { url: string }) => {
      try {
        logger.log('Deep link received:', event.url);

        const target = buildDeepLinkRoute(event.url, resolvePreferredLocale(null));
        if (!target) {
          logger.error('Deep link URL could not be parsed:', event.url);
          return;
        }
        const { route: finalRoute, isAuthCallback } = target;

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
