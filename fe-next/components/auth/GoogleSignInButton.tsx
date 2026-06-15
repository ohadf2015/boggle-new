'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import { isNative } from '@/utils/platform';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { ensureGoogleIdInitialized, type GoogleIdServices } from '@/lib/auth/googleOneTap';
import { GoogleIcon } from './shared/icons/BrandIcons';
import { cn } from '@/lib/utils';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
// GIS large button ≈ 40px tall; pin the control so the invisible click target
// and the visual layer line up exactly.
const BTN_HEIGHT = 44;

interface GoogleSignInButtonProps {
  className?: string;
  /** Pixel width for the GIS button + visual layer (GIS requires a number, max 400). */
  width?: number;
}

/**
 * Google sign-in (web) — brand-styled.
 *
 * Google's `renderButton` can't be CSS-styled (it's an iframe), so we render our
 * own neo-brutalist button as the VISUAL layer and overlay the REAL GSI button
 * on top at opacity 0 to capture the click. That keeps the brand look while still
 * using the in-page ID-token flow (signInWithIdToken) — so Google's account
 * picker shows OUR domain (lexiclash.live), never `<ref>.supabase.co`.
 *
 * Shares the single global GIS init with the One Tap initializer; success
 * propagates via Supabase `SIGNED_IN` → AuthContext. Web-only (native uses the SDK).
 */
export default function GoogleSignInButton({ className, width = 320 }: GoogleSignInButtonProps) {
  const { t } = useLanguage();
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
    // Rendered invisible (overlay) — theme/shape don't matter visually, but a real
    // button must exist for the click + a11y. Match width so the hit-area aligns.
    google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      logo_alignment: 'center',
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
    <div className={cn('relative mx-auto', className)} style={{ width, height: BTN_HEIGHT }}>
      <Script id="google-gsi-client" src={GSI_SRC} strategy="afterInteractive" onReady={() => void renderButton()} />

      {/* Visual layer — neo-brutalist, what the user sees. Non-interactive so the
          click falls through to the real GSI button overlaid on top. */}
      <div
        aria-hidden
        data-testid="gsi-branded-visual"
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-full border-2 border-neo-black bg-white text-neo-black font-neo-display font-bold shadow-hard-sm"
      >
        <GoogleIcon className="w-5 h-5" />
        <span>{t('auth.continueWithGoogle')}</span>
      </div>

      {/* Real GSI button — transparent, on top, captures the click + carries a11y. */}
      <div
        ref={containerRef}
        data-testid="gsi-button-container"
        className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden opacity-0 [&_iframe]:!w-full"
      />
    </div>
  );
}
