'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import { isNative } from '@/utils/platform';
import { supabase } from '@/lib/supabase';
import { ensureGoogleIdInitialized, type GoogleIdServices } from '@/lib/auth/googleOneTap';
import { cn } from '@/lib/utils';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const GSI_MAX_WIDTH = 400; // GIS hard cap

interface GoogleSignInButtonProps {
  className?: string;
  /** Force a pixel width. If omitted, the button fills its container (≤400px). */
  width?: number;
}

/**
 * Google's official "Sign in with Google" button (web), wrapped in a
 * neo-brutalist frame to match the app's other auth buttons.
 *
 * The GSI button is an iframe and can't be CSS-styled, and it MUST stay visible
 * (GSI anti-clickjacking ignores clicks on hidden/obscured buttons — a custom
 * overlay is impossible). So we render Google's own `filled_black` button at full
 * width and wrap it in our hard border + hard shadow, giving brand chrome around
 * a working button. It uses the in-page ID-token flow → consent shows OUR domain.
 *
 * Shares the single global GIS init with the One Tap initializer; success
 * propagates via Supabase `SIGNED_IN`. Web-only (native uses the SDK).
 */
export default function GoogleSignInButton({ className, width }: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  const enabled = !isNative() && !!clientId && !!supabase;

  const renderButton = useCallback(async () => {
    if (renderedRef.current || !clientId || !containerRef.current) return;
    const google = (window as unknown as { google?: GoogleIdServices }).google;
    if (!google?.accounts?.id) return;

    // Render near the GSI max so the snug frame is a comfortable size; the frame
    // hugs whatever GSI produces (the personalized "Continue as" form is narrower).
    const w = width ?? GSI_MAX_WIDTH;

    await ensureGoogleIdInitialized(google, clientId);
    renderedRef.current = true;
    // 'outline' = white button (white bg, dark text). The colored "G" can't be
    // recolored — Google's branding rules forbid a monochrome logo, so a black G
    // is impossible. White button inside our black frame = neo-brutalist look.
    google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'center',
      width: w,
    });
  }, [clientId, width]);

  // GIS may already be loaded (the global One Tap initializer pulls it in) — render
  // immediately rather than waiting for a fresh onReady.
  useEffect(() => {
    if (enabled) void renderButton();
  }, [enabled, renderButton]);

  if (!enabled) return null;

  return (
    <div ref={wrapperRef} className={cn('flex justify-center', className)}>
      <Script id="google-gsi-client" src={GSI_SRC} strategy="afterInteractive" onReady={() => void renderButton()} />
      {/* Neo-brutalist frame hugging the (visible, clickable) Google button — hard
          black border + hard shadow, corners clipped to rounded-neo. w-fit so it
          wraps the button snugly (GSI caps width at 400 and the personalized
          "Continue as" form is narrower, so a full-width frame would leave gaps). */}
      <div
        data-testid="gsi-frame"
        className="inline-flex w-fit overflow-hidden rounded-neo border-2 border-neo-black shadow-hard"
      >
        <div ref={containerRef} data-testid="gsi-button-container" />
      </div>
    </div>
  );
}
