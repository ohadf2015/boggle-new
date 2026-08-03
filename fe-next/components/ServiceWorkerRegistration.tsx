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

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available - could notify user to refresh
            if (process.env.NODE_ENV === 'development') console.log('[PWA] New version available');
          }
        });
      }
    });
  } catch (error) {
    // SW registration can fail for many legitimate reasons (HTTP context, incognito,
    // iframe restrictions, browser settings). Use warn to avoid Sentry noise.
    console.warn('[PWA] Service worker registration failed:', error);
  }
}

export default ServiceWorkerRegistration;
