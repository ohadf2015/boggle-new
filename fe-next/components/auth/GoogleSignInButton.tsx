'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { isNative, isEdgeBrowser } from '@/utils/platform';
import {
  AUTH_CLIENT_LOAD_FAILED_EVENT,
  AuthClientLoadError,
  isAuthClientConfigured,
  loadAuthClient,
} from '@/lib/auth/loadAuthClient';
import { neoErrorToast } from '@/components/NeoToast';
import { ensureGoogleIdInitialized, type GoogleIdServices } from '@/lib/auth/googleOneTap';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { latchSignupSource, trackSignupFailed, trackSignupPromptClicked } from '@/utils/growthTracking';
import { GoogleIcon } from '@/components/auth/shared/icons/BrandIcons';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const GSI_MAX_WIDTH = 400; // GIS hard cap

interface GoogleSignInButtonProps {
  className?: string;
  /** Force a pixel width. If omitted, the button fills its container (≤400px). */
  width?: number;
  /**
   * Signup-prompt surface (e.g. first_win_sheet). GSI iframe clicks never hit
   * useOAuthSignIn — fire prompt_clicked on pointerdown so the mid-funnel
   * stays wired for soft-sheet Google (t_c75cbe59).
   */
  analyticsSource?: string;
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
 * overlay is impossible). So we render Google's own `filled_black` (dark) button and
 * wrap it in a neo frame whose chrome (border-3, rounded-xl, 48px) matches the
 * Discord Button so the two providers read as a matched pair. It uses the in-page
 * ID-token flow → consent shows OUR domain.
 *
 * Shares the single global GIS init with the One Tap initializer; success
 * propagates via Supabase `SIGNED_IN`. Web-only (native uses the SDK).
 */
export default function GoogleSignInButton({ className, width, analyticsSource }: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const { language, t } = useLanguage();
  // Inert look-alike shown until GSI paints its own button, so the iframe swap
  // doesn't jump. Removed once rendered: GSI ignores clicks on obscured buttons.
  const [gsiRendered, setGsiRendered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  const edgeFallback = isEdgeBrowser();
  const enabled = !isNative() && !edgeFallback && !!clientId && isAuthClientConfigured();

  // GSI iframe swallows clicks — pointerdown on our chrome is the last
  // reliable signal that the soft-sheet Google CTA was engaged.
  // The GSI button is a cross-origin iframe: taps inside it never bubble a
  // pointerdown to our wrapper. GSI's documented `click_listener` is the only
  // signal for the Google tap itself (t_147a0f0c CHECK). Both paths share this
  // handler, deduped so a frame pointerdown + click_listener counts once.
  const sourceRef = useRef(analyticsSource);
  sourceRef.current = analyticsSource;
  const lastIntentAtRef = useRef(0);
  const redirectStartedRef = useRef(false);

  // Until the GSI iframe paints, a tap has nothing to land on, so it takes the redirect path.
  // Bound to click: a pointerdown also starts every scroll of the sheet.
  const startRedirectFallback = useCallback(() => {
    if (redirectStartedRef.current || renderedRef.current) return;
    redirectStartedRef.current = true;
    const fail = (message: string, showToast = true) => {
      redirectStartedRef.current = false;
      if (showToast) neoErrorToast(t('errors.signInFailedRetry'));
      trackSignupFailed('oauth_redirect_error', { source: sourceRef.current, message });
    };
    void loadAuthClient()
      .then(async ({ signInWithGoogle }) => {
        if (typeof signInWithGoogle !== 'function') {
          fail('signInWithGoogle is not a function');
          return;
        }
        const res = await signInWithGoogle();
        const err = (res as { error?: { message?: string } | null } | undefined)?.error;
        if (err) fail(err.message ?? 'Google sign-in failed');
      })
      .catch((e: unknown) => {
        const loadFailed = e instanceof AuthClientLoadError;
        if (loadFailed) window.dispatchEvent(new Event(AUTH_CLIENT_LOAD_FAILED_EVENT));
        fail(e instanceof Error ? e.message : String(e), !loadFailed);
      });
  }, [t]);

  const handlePromptClickIntent = useCallback(() => {
    const source = sourceRef.current;
    try {
      if (source) {
        const now = Date.now();
        if (now - lastIntentAtRef.current >= 1500) {
          lastIntentAtRef.current = now;
          if (typeof trackSignupPromptClicked === 'function') trackSignupPromptClicked(source);
          if (typeof latchSignupSource === 'function') latchSignupSource(source);
          else trackSignupFailed('click_handler_throw', { source, message: 'latchSignupSource is not a function' });
        }
      }
    } catch (e) {
      trackSignupFailed('click_handler_throw', {
        source,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, []);

  useEffect(() => {
    const showLoadFailure = () => neoErrorToast(t('errors.signInFailedRetry'));
    window.addEventListener(AUTH_CLIENT_LOAD_FAILED_EVENT, showLoadFailure);
    return () => window.removeEventListener(AUTH_CLIENT_LOAD_FAILED_EVENT, showLoadFailure);
  }, [t]);

  const renderButton = useCallback(async () => {
    if (renderedRef.current || !clientId || !containerRef.current) return;
    const google = (window as unknown as { google?: GoogleIdServices }).google;
    if (!google?.accounts?.id) return;

    await ensureGoogleIdInitialized(google, clientId);
    // Re-read the ref: init is async, and a component that unmounted while it was
    // in flight (auth modal closed, route changed) nulls the ref out. Passing that
    // null to renderButton is what logs `[GSI_LOGGER]: Failed to render button
    // because there is no parent or options set.` to Sentry.
    const container = containerRef.current;
    if (!container) return;
    renderedRef.current = true;
    // A snug GSI button draws its own grey box inside our dark frame; filling the
    // frame (logo_alignment 'center' keeps he/en content centered) leaves one box.
    const frameWidth = container.parentElement?.clientWidth ?? 0;
    const fitWidth = width ?? (frameWidth > 0 ? frameWidth : undefined);
    google.accounts.id.renderButton(container, {
      type: 'standard',
      // Dark theme: the white `outline` button clashed with the dark navy modal.
      theme: 'filled_black',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'center',
      // Follow the SITE language, not the browser locale — otherwise a visitor
      // on /he with a Dutch browser gets "Doorgaan met Google". `locale` is a
      // renderButton option (it is NOT part of the initialize config).
      locale: language,
      click_listener: handlePromptClickIntent,
      ...(fitWidth != null ? { width: Math.min(fitWidth, GSI_MAX_WIDTH) } : {}),
    });
    setGsiRendered(true);
  }, [clientId, width, language, handlePromptClickIntent]);

  // Script onReady never fires when another tag already loaded the same GSI URL.
  // Edge never mounts containerRef (redirect fallback below). Running this loop
  // there paints nothing for 8s and then logs a false gsi_render_timeout.
  useEffect(() => {
    if (!enabled || edgeFallback) return;
    let attempts = 0;
    let timer = 0;
    const tick = () => {
      if (renderedRef.current) return;
      void renderButton();
      attempts += 1;
      if (!renderedRef.current && attempts < 40) {
        timer = window.setTimeout(tick, 200);
      } else if (!renderedRef.current) {
        trackSignupFailed('gsi_render_timeout', {
          source: sourceRef.current,
          message: 'GSI button did not paint',
        });
      }
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, edgeFallback, renderButton]);

  // Edge browser: GSI iframe + third-party cookie blocking breaks the flow.
  // Render a fallback button that triggers Supabase's redirect-based OAuth.
  if (edgeFallback) {
    return (
      <div className={cn('flex justify-center', className)}>
        <button
          type="button"
          data-testid="google-signin-edge-fallback"
          onClick={() => {
            handlePromptClickIntent();
            void loadAuthClient()
              .then(({ signInWithGoogle }) => signInWithGoogle())
              .then((res) => {
                const err = (res as { error?: { message?: string } | null } | undefined)?.error;
                if (err) trackSignupFailed('oauth_redirect_error', { source: analyticsSource, message: err.message });
              })
              .catch((e: unknown) => {
                if (e instanceof AuthClientLoadError) window.dispatchEvent(new Event(AUTH_CLIENT_LOAD_FAILED_EVENT));
                trackSignupFailed('oauth_redirect_error', {
                  source: analyticsSource,
                  message: e instanceof Error ? e.message : String(e),
                });
              });
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl',
            'border-3 border-neo-black bg-[#131314] text-white font-black text-sm',
            'shadow-hard transition hover:shadow-hard-sm active:translate-y-0.5',
          )}
        >
          <GoogleIcon className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>
      </div>
    );
  }

  if (!enabled) return null;

  // Google's docs: the GSI button's displayed language comes from the `hl`
  // query param on the SCRIPT tag URL — the client library itself is fetched
  // in that language. Without it, GSI falls back to the browser/OS locale, so
  // a browser set to e.g. Arabic renders an Arabic button even on the English
  // site. `renderButton`'s own `locale` option only sticks if it matches the
  // locale the library was loaded with, so both must agree.
  const gsiSrc = `${GSI_SRC}?hl=${language}`;

  return (
    <div ref={wrapperRef} className={cn('flex justify-center', className)}>
      <Script id="google-gsi-client" src={gsiSrc} strategy="afterInteractive" onReady={() => void renderButton()} />
      {/* Neo-brutalist frame around the (visible, clickable) Google button — hard
          black border + hard shadow, corners rounded-neo; overflow MUST stay visible — GSI anti-clickjacking drops clicks when an ancestor clips/obscures the iframe (t_375bffc3). Full width +
          dark bg + centered: GSI renders a snug, content-sized dark button, and
          the dark frame bg blends with it so the control reads as one full-width
          button (matching the Discord/email buttons) with perfectly centered
          content — instead of a fixed-width button with the logo+text drifting to
          one end. */}
      <div
        data-testid="gsi-frame"
        onPointerDown={handlePromptClickIntent}
        onClick={startRedirectFallback}
        className="relative flex w-full min-h-[48px] items-center justify-center overflow-visible rounded-xl border-3 border-neo-black bg-[#131314] shadow-hard"
      >
        {!gsiRendered && (
          <div
            data-testid="gsi-placeholder"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-white"
          >
            <GoogleIcon className="w-[18px] h-[18px]" />
            <span>{t('auth.continueWithGoogle', 'Continue with Google')}</span>
          </div>
        )}
        {/*
          colorScheme light: the site root is `color-scheme: dark` and the GSI
          iframe document is light. When the two differ the browser paints an
          opaque white backdrop behind the iframe, and GSI's iframe is 20px wider
          than the button (margin -10px), so a white strip stuck out of the dark
          frame on both sides. Matching schemes keeps the backdrop transparent.
        */}
        <div ref={containerRef} data-testid="gsi-button-container" className="w-full shrink-0 min-h-[44px]" style={{ colorScheme: 'light' }} />
      </div>
    </div>
  );
}