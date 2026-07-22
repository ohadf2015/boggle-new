'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import { isNative, isEdgeBrowser } from '@/utils/platform';
import { supabase, signInWithGoogle } from '@/lib/supabase';
import { ensureGoogleIdInitialized, type GoogleIdServices } from '@/lib/auth/googleOneTap';
import { cn } from '@/lib/utils';
import { GoogleIcon } from '@/components/auth/shared/icons/BrandIcons';

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
 * On Microsoft Edge, Google's GSI (in-page iframe) button is broken because
 * Edge blocks third-party cookies by default. Edge users get a fallback
 * button that triggers Supabase's redirect-based OAuth flow instead.
 *
 * The GSI button is an iframe and can't be CSS-styled, and it MUST stay visible
 * (GSI anti-clickjacking ignores clicks on hidden/obscured buttons — a custom
 * overlay is impossible). So we render Google's own `outline` (white) button and
 * wrap it in a neo frame whose chrome (border-3, rounded-xl, 48px) matches the
 * Discord Button so the two providers read as a matched pair. It uses the in-page
 * ID-token flow → consent shows OUR domain.
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

    await ensureGoogleIdInitialized(google, clientId);
    renderedRef.current = true;
    // 'outline' = white button (white bg, dark text). The colored "G" can't be
    // recolored — Google's branding rules forbid a monochrome logo, so a black G
    // is impossible. White button inside our black frame = neo-brutalist look.
    //
    // No forced width by default: a width wider than the content makes GSI float
    // the logo+text off-center (it drifts to the "end", glaringly so with RTL
    // locales). Auto-sizing keeps the button snug to its content so the content
    // stays centered; the full-width white frame below supplies the full-width
    // look. An explicit `width` prop still wins for callers that need a fixed size.
    google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'center',
      ...(width != null ? { width: Math.min(width, GSI_MAX_WIDTH) } : {}),
    });
  }, [clientId, width]);

  // GIS may already be loaded (the global One Tap initializer pulls it in) — render
  // immediately rather than waiting for a fresh onReady.
  useEffect(() => {
    if (enabled) void renderButton();
  }, [enabled, renderButton]);

  // Edge browser: GSI iframe + third-party cookie blocking breaks the flow.
  // Render a fallback button that triggers Supabase's redirect-based OAuth.
  if (isEdgeBrowser()) {
    return (
      <div className={cn('flex justify-center', className)}>
        <button
          type="button"
          data-testid="google-signin-edge-fallback"
          onClick={() => { void signInWithGoogle(); }}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
            'border-3 border-neo-black bg-white text-neo-black font-black text-sm',
            'shadow-hard transition-all hover:shadow-hard-sm active:translate-y-0.5',
          )}
        >
          <GoogleIcon className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>
      </div>
    );
  }

  if (!enabled) return null;

  return (
    <div ref={wrapperRef} className={cn('flex justify-center', className)}>
      <Script id="google-gsi-client" src={GSI_SRC} strategy="afterInteractive" onReady={() => void renderButton()} />
      {/* Neo-brutalist frame around the (visible, clickable) Google button — hard
          black border + hard shadow, corners clipped to rounded-neo. Full width +
          white bg + centered: GSI renders a snug, content-sized white button, and
          the white frame bg blends with it so the control reads as one full-width
          button (matching the Discord/email buttons) with perfectly centered
          content — instead of a fixed-width button with the logo+text drifting to
          one end. */}
      <div
        data-testid="gsi-frame"
        className="flex w-full min-h-[48px] items-center justify-center overflow-hidden rounded-xl border-3 border-neo-black bg-white shadow-hard"
      >
        <div ref={containerRef} data-testid="gsi-button-container" />
      </div>
    </div>
  );
}