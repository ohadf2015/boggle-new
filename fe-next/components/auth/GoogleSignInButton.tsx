'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import { isNative } from '@/utils/platform';
import { supabase } from '@/lib/supabase';
import { ensureGoogleIdInitialized, type GoogleIdServices } from '@/lib/auth/googleOneTap';
import { cn } from '@/lib/utils';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleSignInButtonProps {
  className?: string;
  /** Pixel width for the GIS button (GIS requires a number, max 400). */
  width?: number;
}

/**
 * Google's official rendered "Sign in with Google" button (web).
 *
 * It triggers the in-page ID-token flow (signInWithIdToken), so Google's account
 * picker shows OUR domain (lexiclash.live), never `<ref>.supabase.co`.
 *
 * The button MUST stay visible: Google's GSI has anti-clickjacking protection and
 * silently ignores clicks when the button is rendered transparent/obscured — so a
 * fully-custom overlay is impossible. We use Google's own button, themed (dark
 * pill) to sit naturally in the dark auth modal. Shares the single global GIS init
 * with the One Tap initializer; success propagates via Supabase `SIGNED_IN`.
 *
 * Web-only: native (Capacitor) uses the SDK path in utils/nativeOAuth.ts.
 */
export default function GoogleSignInButton({ className, width = 320 }: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  const enabled = !isNative() && !!clientId && !!supabase;

  const renderButton = useCallback(async () => {
    if (renderedRef.current || !clientId || !containerRef.current) return;
    const google = (window as unknown as { google?: GoogleIdServices }).google;
    if (!google?.accounts?.id) return;

    await ensureGoogleIdInitialized(google, clientId);
    renderedRef.current = true;
    google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'left',
      width,
    });
  }, [clientId, width]);

  // GIS may already be loaded (the global One Tap initializer pulls it in) — render
  // immediately rather than waiting for a fresh onReady.
  useEffect(() => {
    if (enabled) void renderButton();
  }, [enabled, renderButton]);

  if (!enabled) return null;

  return (
    <div className={cn('flex justify-center', className)}>
      <Script id="google-gsi-client" src={GSI_SRC} strategy="afterInteractive" onReady={() => void renderButton()} />
      <div ref={containerRef} data-testid="gsi-button-container" />
    </div>
  );
}
