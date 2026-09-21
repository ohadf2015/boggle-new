'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  hasConsentDecision,
  getConsentState,
  acceptAll,
  declineAll,
  setConsentState,
  resetConsent,
  onConsentChange,
} from '@/utils/cookieConsent';
import { MODAL_OPEN_CLASS } from '@/lib/native/modalOpenSignal';
import { useInGameSurface } from '@/lib/inGameSurface';
import { useOverlayQuietZone } from '@/lib/overlayQuietZone';

/**
 * True while a modal owns the screen (`html.modal-open`, the ref-counted flag
 * set by AuthModal and the shared ui/dialog). The consent sheet sits at z-[200]
 * — above every modal — and is a bottom band up to 60vh tall, so on a short
 * viewport it lands over the MIDDLE of an open modal and eats its clicks.
 */
function useModalOwnsScreen(): boolean {
  const [owned, setOwned] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setOwned(root.classList.contains(MODAL_OPEN_CLASS));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return owned;
}

/**
 * Non-blocking cookie-consent bottom BAR (GDPR).
 *
 * History: t_01e346a5 turned the full-screen backdrop modal into a bottom sheet.
 * UX audit 2026-09-14 (lexiclash.live): that sheet still measured ~350px and sat
 * over the lower grid / lime PLAY NOW CTA; ACCEPT ALL (bg-accent = neo-lime)
 * was the loudest above-fold button. On mobile, Google One Tap stacked on top.
 *
 * This revision shrinks the prompt to a compact fixed bottom bar so the play-
 * first home and Puzzle #N hero stay usable without dismissing first. Accept
 * uses cyan (not lime) so one lime Play primary owns the fold. One Tap is gated
 * separately in GoogleOneTapInitializer until consent is decided.
 *
 * Still non-blocking: no backdrop, no scroll-lock, no Escape dismiss. Choice is
 * still required before non-essential scripts fire.
 */
export default function CookieConsent() {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const modalOwnsScreen = useModalOwnsScreen();
  const inGameSurface = useInGameSurface();
  // Re-ranking to z-[60] on a game surface (below) was not enough: the sheet is
  // a band up to 60vh tall, and it was measured sitting on a guest's board for
  // 36 seconds of a live round, and over the round-end recap after it. Inside
  // the quiet zone it does not render at all. `visible` is untouched, so the ask
  // is DEFERRED — non-essential scripts stay gated on a decision nobody made,
  // and the sheet reappears the instant the zone clears.
  const overlayQuietZone = useOverlayQuietZone();
  const showSheet = visible && !modalOwnsScreen && !overlayQuietZone;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelShow = () => {};
    if (!hasConsentDecision()) {
      // Defer mounting the consent UI until the underlying page has captured its
      // LCP. Mounting immediately after hydration made the consent text the LCP
      // element on a busy main thread (~16s mobile LCP). The sheet simply
      // appears once the browser is idle, after the hero has painted.
      // Re-read the decision at SHOW time, not only when the callback was
      // scheduled: the idle callback can land a second or more later, and by
      // then another tab or the ManageCookies flow may have recorded a choice.
      // One source of truth, read at the moment it is acted on (pitfalls class 1).
      const showIfStillUndecided = () => {
        if (hasConsentDecision()) return;
        setVisible(true);
      };
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(showIfStillUndecided, { timeout: 1200 });
        cancelShow = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(showIfStillUndecided, 800);
        cancelShow = () => window.clearTimeout(id);
      }
    }

    // Listen for consent resets (from ManageCookiesButton) — re-open the sheet.
    const unsubscribe = onConsentChange((state) => {
      if (state.timestamp === 0) {
        setVisible(true);
        setShowDetails(false);
        setAnalytics(false);
        setAdvertising(false);
      }
    });
    return () => {
      cancelShow();
      unsubscribe();
    };
  }, []);

  // Intentionally NOT locking body scroll: this is a non-blocking bottom sheet.
  // The page behind it remains scrollable and usable, satisfying the "non-blocking"
  // requirement and removing the main-thread composite cost of a full-screen
  // backdrop. Prior scroll-lock effect removed as part of Option A.

  // Non-blocking is not enough on its own: the sheet is a FIXED band at the
  // viewport bottom, and it covered bottom CTAs (seen live on the Arena hub —
  // the sheet hid Multiplayer QUICK START / CREATE PRIVATE BATTLE behind
  // "Care for a cookie?"). Reserve its measured height exactly like the bottom
  // nav / ad banner do: `has-cookie-consent` on <html> + `--cookie-consent-height`
  // feed the body.screen-fit padding-bottom rule in globals.css, so page content
  // shifts up clear of the sheet instead of sliding under it. ResizeObserver
  // tracks the sheet growing (the Customize panel) and viewport resizes; the
  // reservation is removed the moment a consent choice hides the sheet.
  useEffect(() => {
    if (!showSheet) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty('--cookie-consent-height', `${sheet.offsetHeight}px`);
    };
    apply();
    root.classList.add('has-cookie-consent');
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
    observer?.observe(sheet);
    window.addEventListener('resize', apply);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', apply);
      root.classList.remove('has-cookie-consent');
      root.style.removeProperty('--cookie-consent-height');
    };
  }, [showSheet]);

  // Load existing state when showing details
  useEffect(() => {
    if (showDetails) {
      const state = getConsentState();
      setAnalytics(state.analytics);
      setAdvertising(state.advertising);
    }
  }, [showDetails]);

  const handleAcceptAll = useCallback(() => {
    acceptAll();
    setVisible(false);
    setShowDetails(false);
  }, []);

  const handleDeclineAll = useCallback(() => {
    declineAll();
    setVisible(false);
    setShowDetails(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    setConsentState({ analytics, advertising });
    setVisible(false);
    setShowDetails(false);
  }, [analytics, advertising]);

  // Deliberately no focus trap here: this is a non-blocking sheet (see header
  // comment) — trapping Tab/Shift+Tab would fully block keyboard-only users
  // from the rest of the page while pointer users remain unaffected, which is
  // the opposite of the "non-blocking" goal. Keyboard users can Tab past the
  // sheet the same way pointer users can click past it.

  // CrazyGames embeds its own platform-level consent UI before our iframe loads.
  // A second banner inside the iframe violates the embed UX expectation.
  if (isOnCrazyGamesPlatform) return null;
  if (!showSheet) return null;

  const isRtl = language === 'he';

  // Portal to <body> at z-[200]: the Android install Dialog portals to body at
  // z-90, and an in-tree sheet loses the stacking contest to that portal
  // (layout ancestors create stacking contexts). Body-level z-[200] keeps
  // consent actions clickable even if another modal races the first visit.
  const sheet = (
    // Compact fixed bottom BAR — not a ~350px sheet. No backdrop, no filter.
    // Collapsed height stays small so lime Play / the letter grid stay clear;
    // Customize expands in-place (ResizeObserver updates the reservation).
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="false"
      aria-label={t('cookieConsent.title')}
      data-cookie-consent="compact-bar"
      className={cn(
        'fixed bottom-0 left-0 right-0',
        // z-[200] wins every stacking contest — including the ones it should
        // lose. On a projected game surface it covered `TeacherLiveControls`
        // (z-[70]) and `GamePausedOverlay` (z-60). There it drops below both
        // and waits its turn; everywhere else it keeps the rank that makes
        // consent reachable over the install Dialog's body-level z-90 portal.
        inGameSurface ? 'z-[60]' : 'z-[200]',
        'w-full max-w-4xl mx-auto',
        // No min-h-[280px]: that forced the fold-stealing ~350px band.
        showDetails ? 'max-h-[50vh] overflow-y-auto' : 'overflow-visible',
        'bg-neo-navy border-t-4 border-s-4 border-e-4 border-neo-black rounded-t-2xl shadow-hard-lg',
        'px-3 py-2 sm:px-4 sm:py-3 animate-slide-up pointer-events-auto'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
          {/* Small inline mascot — brand personality without owning the fold.
              Hidden on mobile to reduce reserved height; visible on tablet+ */}
          <Image
            src="/cookie-consent-mascot.png"
            alt={t('cookieConsent.mascotAlt')}
            width={40}
            height={40}
            className="hidden sm:block mt-0.5 h-10 w-10 shrink-0 object-contain sm:mt-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold font-neo-display text-neo-white sm:text-base">
              {t('cookieConsent.title')}
            </h2>
            <p className="mt-0.5 text-xs font-medium leading-snug text-neo-white/90 line-clamp-1 sm:line-clamp-2 sm:text-[13px]">
              {t('cookieConsent.message')}{' '}
              <a
                href={`/${language}/legal/cookies`}
                className="font-bold text-neo-cyan hover:underline"
              >
                {t('cookieConsent.learnMore')}
              </a>
            </p>
          </div>
        </div>

        {/* Actions stay one-tap reachable. Accept is cyan — NOT neo-lime — so the
            home Play CTA remains the only lime primary above the fold. Decline
            is leveled up to equal weight with Accept (border-3, text-sm).
            Customize stays lighter for hierarchy. */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={handleAcceptAll}
            className={cn(
              'min-h-[44px] flex-1 px-3 py-2 text-sm font-bold uppercase sm:flex-none sm:px-4',
              'bg-neo-cyan text-neo-black',
              'border-3 border-neo-black rounded-neo shadow-hard-sm',
              'hover:shadow-hard active:shadow-hard-pressed',
              'transition-all duration-100'
            )}
          >
            {t('cookieConsent.accept')}
          </button>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              'min-h-[44px] flex-1 px-3 py-2 text-xs font-bold uppercase sm:flex-none',
              'text-neo-cyan hover:text-neo-white',
              'border-2 border-neo-cyan rounded-neo transition-colors duration-100'
            )}
          >
            {t('cookieConsent.customize')}
          </button>
          <button
            type="button"
            onClick={handleDeclineAll}
            className={cn(
              'min-h-[44px] flex-1 px-3 py-2 text-sm font-bold uppercase sm:flex-none',
              'text-neo-white',
              'border-3 border-neo-cream rounded-neo transition-colors duration-100'
            )}
          >
            {t('cookieConsent.decline')}
          </button>
        </div>
      </div>

      {/* Granular preferences panel — expands the bar; reservation tracks height */}
      {showDetails && (
        <div className="mt-3 border-t-2 border-neo-cream/10 pt-3">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ConsentToggle
              label={t('cookieConsent.categories.essential')}
              description={t('cookieConsent.categories.essentialDesc')}
              requiredLabel={t('cookieConsent.required')}
              checked={true}
              disabled
            />
            <ConsentToggle
              label={t('cookieConsent.categories.analytics')}
              description={t('cookieConsent.categories.analyticsDesc')}
              checked={analytics}
              onChange={setAnalytics}
            />
            <ConsentToggle
              label={t('cookieConsent.categories.advertising')}
              description={t('cookieConsent.categories.advertisingDesc')}
              checked={advertising}
              onChange={setAdvertising}
            />
          </div>
          <button
            type="button"
            onClick={handleSavePreferences}
            className={cn(
              'w-full px-5 py-2 min-h-[44px] text-sm font-bold uppercase sm:w-auto',
              'bg-neo-cyan text-neo-black',
              'border-3 border-neo-black rounded-neo shadow-hard-sm',
              'hover:shadow-hard active:shadow-hard-pressed',
              'transition-all duration-100'
            )}
          >
            {t('cookieConsent.savePreferences')}
          </button>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') return sheet;
  return createPortal(sheet, document.body);
}

// ─── Toggle component ───────────────────────

interface ConsentToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  requiredLabel?: string;
  onChange?: (val: boolean) => void;
}

function ConsentToggle({ label, description, checked, disabled, requiredLabel, onChange }: ConsentToggleProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 p-3 rounded-neo',
        'border-2 transition-colors',
        disabled
          ? 'border-neo-cream/10 opacity-70'
          : checked
            ? 'border-neo-lime/40 bg-neo-lime/5'
            : 'border-neo-cream/20 hover:border-neo-cream/40',
        !disabled && 'cursor-pointer'
      )}
    >
      <span className="mt-0.5 shrink-0">
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onChange}
          className="border-neo-cream/40 data-[state=checked]:bg-neo-lime data-[state=unchecked]:bg-neo-cream/20"
        />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-neo-white block">
          {label}
          {disabled && (
            <span className="text-neo-white font-normal ms-1">
              ({requiredLabel || 'Required'})
            </span>
          )}
        </span>
        <span className="text-xs text-neo-white block mt-0.5">{description}</span>
      </div>
    </label>
  );
}

// ─── Manage Cookies Button (for footer/settings) ───────────────

/**
 * Small button to re-open cookie preferences.
 * Place in footer or settings page.
 */
export function ManageCookiesButton() {
  const { t } = useLanguage();

  const handleClick = () => {
    resetConsent();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-neo-white hover:text-neo-white underline transition-colors"
    >
      {t('cookieConsent.manageCookies')}
    </button>
  );
}
