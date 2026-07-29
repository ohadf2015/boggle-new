'use client';

import { useCallback, useRef } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { isNative } from '@/utils/platform';
import { supabase } from '@/lib/supabase';
import {
  ensureGoogleIdInitialized,
  shouldEnableGoogleOneTap,
  type GoogleIdServices,
} from '@/lib/auth/googleOneTap';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Headless initializer for Google One Tap / Sign In With Google on the WEB.
 *
 * Why this exists: `signInWithOAuth` redirects through `<ref>.supabase.co`, so
 * Google's consent screen shows the Supabase domain. One Tap mints the ID token
 * in-page against our JS origin and we exchange it via `signInWithIdToken`, so
 * Google shows OUR domain — free, no custom domain, no redirect. The native app
 * already uses the same `signInWithIdToken` path (utils/nativeOAuth.ts).
 *
 * Mounted once globally; the existing redirect buttons remain as a fallback.
 */
export default function GoogleOneTapInitializer() {
  const { isAuthenticated } = useAuth();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const promptedRef = useRef(false);

  const enabled = shouldEnableGoogleOneTap({
    isNativePlatform: isNative(),
    clientId,
    supabaseConfigured: !!supabase,
    isAuthenticated,
  });

  const initOneTap = useCallback(async () => {
    if (promptedRef.current || !clientId) return;
    const google = (window as unknown as { google?: GoogleIdServices }).google;
    if (!google?.accounts?.id) return;
    promptedRef.current = true;

    await ensureGoogleIdInitialized(google, clientId);
    google.accounts.id.prompt();
  }, [clientId]);

  if (!enabled) return null;

  return (
    <Script
      src={GSI_SRC}
      // lazyOnload: the gsi client + its iframe + Google Sans font (~200KB,
      // plus main-thread init) were competing with LCP on the landing page.
      // One Tap appearing a few seconds later is an acceptable tradeoff.
      strategy="lazyOnload"
      onReady={() => {
        // Defer the actual prompt into an idle window so Google's iframe/font
        // injection never lands inside the critical rendering path.
        const ric: (cb: () => void) => void = window.requestIdleCallback
          ? (cb) => window.requestIdleCallback(cb, { timeout: 4000 })
          : (cb) => { setTimeout(cb, 2000); };
        ric(() => { void initOneTap(); });
      }}
    />
  );
}
