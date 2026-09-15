'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConsentDecided } from '@/hooks/useConsentDecided';
import { isNative } from '@/utils/platform';
import { supabase } from '@/lib/supabase';
import {
  ensureGoogleIdInitialized,
  shouldEnableGoogleOneTap,
  type GoogleIdServices,
} from '@/lib/auth/googleOneTap';
import {
  SIGNUP_PROMPT_ACTIVE_EVENT,
  shouldSuppressOneTapForSignupFunnel,
  type SignupPromptActiveDetail,
} from '@/lib/auth/signupPromptCoordination';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function cancelOneTapPrompt(): void {
  const google = (window as unknown as { google?: GoogleIdServices }).google;
  try {
    google?.accounts?.id?.cancel?.();
  } catch {
    // GIS may throw if never initialized — safe to ignore.
  }
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
 *
 * UX: never stack One Tap over the cookie bar. GIS is not loaded (and prompt
 * never fires) until `useConsentDecided()` is true — measured 2026-09-14 on
 * mobile where One Tap + cookie sheet formed a double blocker.
 *
 * t_da22db9a: also never stack One Tap on the post-game soft-sheet. After
 * consent, both used to fire in the same idle/1.5s window; cancel + suppress
 * when the growth signup funnel owns the session.
 */
export default function GoogleOneTapInitializer() {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const consentDecided = useConsentDecided();
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
    // Post-game funnel owns auth — do not prompt One Tap over soft-sheet.
    if (shouldSuppressOneTapForSignupFunnel()) return;
    const google = (window as unknown as { google?: GoogleIdServices }).google;
    if (!google?.accounts?.id) return;
    promptedRef.current = true;

    await ensureGoogleIdInitialized(google, clientId);
    // Re-check after idle/init — soft-sheet may have opened meanwhile.
    if (shouldSuppressOneTapForSignupFunnel()) {
      cancelOneTapPrompt();
      return;
    }
    google.accounts.id.prompt();
  }, [clientId]);

  // Cancel a live One Tap when the growth signup sheet opens.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPromptActive = (event: Event) => {
      const detail = (event as CustomEvent<SignupPromptActiveDetail>).detail;
      if (detail?.active) {
        cancelOneTapPrompt();
      }
    };
    window.addEventListener(SIGNUP_PROMPT_ACTIVE_EVENT, onPromptActive);
    return () => window.removeEventListener(SIGNUP_PROMPT_ACTIVE_EVENT, onPromptActive);
  }, []);

  // Consent first: do not mount GSI (or prompt) while the cookie bar is up.
  // Do NOT gate Script mount on signup-funnel suppress (that reads localStorage
  // and would hydrate-mismatch). Suppress is enforced inside initOneTap + cancel.
  if (!enabled || !consentDecided) return null;

  // hl on the script URL controls GSI's rendered language (see GoogleSignInButton) —
  // without it, One Tap falls back to the browser/OS locale instead of the site's.
  return (
    <Script
      src={`${GSI_SRC}?hl=${language}`}
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
