'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * Registers the PWA service worker for offline support and caching.
 * Only registers in production and when the browser supports service workers.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker after page load
      window.addEventListener('load', registerServiceWorker);
      return () => {
        window.removeEventListener('load', registerServiceWorker);
      };
    }
    return undefined;
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available - could notify user to refresh
            console.log('[PWA] New version available');
          }
        });
      }
    });
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
  }
}

export default ServiceWorkerRegistration;
