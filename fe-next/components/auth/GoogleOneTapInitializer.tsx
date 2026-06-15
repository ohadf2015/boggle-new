'use client';

import { useCallback, useRef } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { isNative } from '@/utils/platform';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import {
  generateOneTapNonce,
  createOneTapCallback,
  shouldEnableGoogleOneTap,
  type GoogleCredentialResponse,
} from '@/lib/auth/googleOneTap';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdServices {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void;
      prompt: () => void;
    };
  };
}

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

    const { rawNonce, hashedNonce } = await generateOneTapNonce();

    const callback = createOneTapCallback({
      rawNonce,
      onSuccess: () => logger.log('[OneTap] Google sign-in successful'),
      onError: (message) => logger.debug('[OneTap] sign-in failed:', message),
    });

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => void callback(response),
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    google.accounts.id.prompt();
  }, [clientId]);

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
