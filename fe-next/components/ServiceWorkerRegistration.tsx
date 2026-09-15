'use client';

import { useEffect } from 'react';
import { loadSentry } from '@/utils/sentryLazy';

/**
 * Service Worker Registration Component
 *
 * Registers the PWA service worker for offline support and caching.
 * Only registers in production and when the browser supports service workers.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Skip SW registration on CrazyGames — iframe context conflicts with SW
    if (typeof window !== 'undefined' && window.__crazyGamesEnvironment === 'crazygames') {
      return undefined;
    }
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker after page load
      window.addEventListener('load', registerServiceWorker);
      // Forward unexpected SW cache errors to Sentry (page-side init).
      const onSwMessage = (e: MessageEvent) => {
        const data = e.data as { type?: string; message?: string; url?: string } | undefined;
        if (data?.type === 'sw:cache-error' && data.message) {
          void loadSentry().then((Sentry) =>
            Sentry.captureMessage(`SW cache error: ${data.message}`, {
              level: 'warning',
              extra: { url: data.url },
              tags: { source: 'service-worker' },
            })
          );
        }
      };
      navigator.serviceWorker.addEventListener('message', onSwMessage);
      return () => {
        window.removeEventListener('load', registerServiceWorker);
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      };
    }
    return undefined;
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    // Check if sw.js exists before attempting registration to avoid 404 errors
    const swResponse = await fetch('/sw.js', { method: 'HEAD' });
    if (!swResponse.ok) {
      return; // sw.js not available, skip registration silently
    }
    // Next.js may return 200 with text/html for missing routes (soft 404)
    const contentType = swResponse.headers.get('content-type') || '';
    if (!contentType.includes('javascript')) {
      return; // sw.js returned non-JS content (likely HTML 404 page)
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    if (process.env.NODE_ENV === 'development') console.log('[PWA] Service worker registered:', registration.scope);

    // Handle updates — activate waiting workers immediately so build-stamped
    // cache names purge on activate (t_9cc3561f: stale SW after #979).
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            if (process.env.NODE_ENV === 'development') console.log('[PWA] New version available — activating');
            try {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            } catch {
              /* worker may already be gone */
            }
          }
        });
      }
    });

    // If a worker is already waiting (tab open across a deploy), activate it now.
    if (registration.waiting && navigator.serviceWorker.controller) {
      try {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } catch {
        /* ignore */
      }
    }

    // Periodic update check — long-lived tabs otherwise keep a stale controller
    // that cache-first-serves /_next/static until the next navigation.
    const updateInterval = window.setInterval(() => {
      registration.update().catch(() => undefined);
    }, 5 * 60 * 1000);
    // Cleared when the page unloads; registration lives for the document lifetime.
    window.addEventListener('beforeunload', () => window.clearInterval(updateInterval), { once: true });
  } catch (error) {
    // SW registration can fail for many legitimate reasons (HTTP context, incognito,
    // iframe restrictions, browser settings). Use warn to avoid Sentry noise.
    console.warn('[PWA] Service worker registration failed:', error);
  }
}

export default ServiceWorkerRegistration;
