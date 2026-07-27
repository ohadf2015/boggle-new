'use client';

import { useCallback, useRef } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { language } = useLanguage();
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

    await ensureGoogleIdInitialized(google, clientId, language);
    google.accounts.id.prompt();
  }, [clientId, language]);

  if (!enabled) return null;

  return (
    <Script
      src={GSI_SRC}
      strategy="afterInteractive"
      onReady={() => {
        void initOneTap();
      }}
    />
  );
}
