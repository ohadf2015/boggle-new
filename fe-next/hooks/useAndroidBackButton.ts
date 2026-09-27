'use client';

/**
 * Hardware back button handler for Capacitor Android.
 *
 * Default Capacitor behavior: pressing the back gesture / button calls
 * App.exitApp() — closing the app outright. That's the native-feel killer.
 *
 * This hook wires the back button into Next.js router history:
 *  - If browser history exists, pop one entry (router.back()).
 *  - If on a "root" route (locale root, /multiplayer, /singleplayer, /daily,
 *    /connections, /brain), require a second tap within 2s to actually exit
 *    the app — standard Android pattern (WhatsApp, Instagram).
 *
 * Plugin discovery uses globalThis.Capacitor to avoid static @capacitor/app
 * imports that break Turbopack and cause UNIMPLEMENTED races on cold start.
 */

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isNative } from '../utils/platform';
import { parentRoute } from '../lib/navigation/parentRoute';
import { isNavigationGuardActive } from '../lib/navigation/navigationGuardRegistry';

const ROOT_PATH_PATTERNS: RegExp[] = [
  /^\/[a-z]{2}\/?$/,
  /^\/[a-z]{2}\/multiplayer\/?$/,
  /^\/[a-z]{2}\/singleplayer\/?$/,
  /^\/[a-z]{2}\/daily\/?$/,
  /^\/[a-z]{2}\/connections\/?$/,
  /^\/[a-z]{2}\/brain\/?$/,
  /^\/[a-z]{2}\/adventure\/?$/,
];

const EXIT_DOUBLE_TAP_WINDOW_MS = 2000;

function isRootPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return ROOT_PATH_PATTERNS.some((re) => re.test(pathname));
}

export function useAndroidBackButton(): void {
  const router = useRouter();
  const pathname = usePathname();
  const lastBackPressAtRef = useRef(0);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isNative()) return;

    const cap = (globalThis as unknown as { Capacitor?: {
      isPluginAvailable?: (name: string) => boolean;
      Plugins?: { App?: {
        addListener: (event: string, cb: (data: { canGoBack: boolean }) => void) => Promise<{ remove: () => void }>;
        exitApp?: () => Promise<void>;
      } };
    } }).Capacitor;

    if (typeof cap?.isPluginAvailable === 'function' && !cap.isPluginAvailable('App')) return;
    const AppPlugin = cap?.Plugins?.App;
    if (!AppPlugin) return;

    let listenerHandle: { remove: () => void } | null = null;
    let removed = false;

    const handler = (data: { canGoBack: boolean }) => {
      try {
        // A game guard (useNavigationGuard) is active: route the back press
        // through browser history so its popstate handler fires the "leave
        // game?" confirm — parity with web/iOS. Takes priority over the
        // root-path double-tap-to-exit, which would otherwise skip the prompt.
        if (isNavigationGuardActive()) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            // No history to pop (deep-link/cold start): synthesize popstate so
            // the guard still intercepts instead of the app exiting.
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          return;
        }
        if (isRootPath(pathRef.current)) {
          const now = Date.now();
          if (now - lastBackPressAtRef.current < EXIT_DOUBLE_TAP_WINDOW_MS) {
            AppPlugin.exitApp?.().catch(() => {});
            return;
          }
          lastBackPressAtRef.current = now;
          // Lightweight feedback toast via custom event (consumer can render)
          window.dispatchEvent(new CustomEvent('lexiclash:exit-hint'));
          return;
        }
        if (data.canGoBack || window.history.length > 1) {
          router.back();
          return;
        }
        // Deep-link / refresh on a non-root route: no history to pop. Go one
        // level up the URL hierarchy instead of exiting the app outright.
        router.push(parentRoute(pathRef.current || '/'));
      } catch (err) {
        console.error('[useAndroidBackButton] handler error:', err);
      }
    };

    Promise.resolve(AppPlugin.addListener('backButton', handler))
      .then((handle) => {
        if (removed) {
          handle.remove();
        } else {
          listenerHandle = handle;
        }
      })
      .catch((err) => {
        console.debug('[useAndroidBackButton] listener unavailable:', err);
      });

    return () => {
      removed = true;
      try { listenerHandle?.remove(); } catch {}
    };
  }, [router]);
}
