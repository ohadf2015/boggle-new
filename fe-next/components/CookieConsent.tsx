'use client';

import { useState, useEffect, useCallback } from 'react';
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

/**
 * Non-blocking cookie-consent bottom sheet (GDPR).
 *
 * Product decision t_01e346a5 (Option A): convert the full-screen backdrop-blur
 * modal into a fixed bottom sheet. It does NOT block interaction with the page
 * behind it, it does NOT lock body scroll, and it carries no backdrop-filter cost,
 * so the hero/LCP element can paint and measure unimpeded. The same legal copy,
 * Accept/Decline/Manage choices, and granular toggles are preserved.
 *
 * The sheet is still a persistent consent gate: it cannot be dismissed by
 * backdrop click or Escape, and a choice is still required before non-essential
 * scripts fire (ads/analytics are consent-gated independently).
 */
export default function CookieConsent() {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelShow = () => {};
    if (!hasConsentDecision()) {
      // Defer mounting the consent UI until the underlying page has captured its
      // LCP. Mounting immediately after hydration made the consent text the LCP
      // element on a busy main thread (~16s mobile LCP). The sheet simply
      // appears once the browser is idle, after the hero has painted.
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(() => setVisible(true), { timeout: 1200 });
        cancelShow = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(() => setVisible(true), 800);
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
  if (!visible) return null;

  const isRtl = language === 'he';

  // Portal to <body> at z-[200]: the Android install Dialog portals to body at
  // z-90, and an in-tree z-[110] sheet loses the stacking contest to that portal
  // (layout ancestors create stacking contexts). Body-level z-[200] keeps ACCEPT
  // ALL clickable even if another modal races the first visit.
  const sheet = (
    // Fixed bottom sheet. No full-screen backdrop, no backdrop-filter.
    // A reserved min-height prevents layout shift when the sheet mounts.
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('cookieConsent.title')}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[200]',
        'w-full max-w-2xl mx-auto',
        'min-h-[280px] max-h-[60vh] overflow-y-auto',
        'bg-neo-navy border-t-4 border-s-4 border-e-4 border-neo-black rounded-t-2xl shadow-hard-lg',
        'p-4 sm:p-5 animate-slide-up pointer-events-auto'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Mascot happily munching a cookie — decorative, brand personality */}
      <Image
        src="/cookie-consent-mascot.png"
        alt={t('cookieConsent.mascotAlt')}
        width={80}
        height={80}
        className="mx-auto mb-2 h-20 w-20 object-contain"
      />

      <h2 className="mb-2 text-center text-lg font-bold font-neo-display text-neo-white">
        {t('cookieConsent.title')}
      </h2>
      <p className="mb-4 text-center text-sm font-medium text-neo-white">
        {t('cookieConsent.message')}{' '}
        <a
          href={`/${language}/legal/cookies`}
          className="font-bold text-neo-cyan hover:underline"
        >
          {t('cookieConsent.learnMore')}
        </a>
      </p>

      {/* Actions. Accept = prominent primary (top, full-width, accent).
          Decline + Customize = equal-weight one-click buttons below — reject
          stays as easy as accept; only visual weight nudges toward Accept. */}
      <div className="flex flex-col gap-2 max-w-md mx-auto">
        <button
          type="button"
          onClick={handleAcceptAll}
          className={cn(
            'w-full px-4 py-3 text-base font-bold uppercase',
            'bg-accent text-accent-foreground',
            'border-3 border-neo-black rounded-neo shadow-hard',
            'hover:shadow-hard-lg active:shadow-hard-pressed',
            'transition-all duration-100'
          )}
        >
          {t('cookieConsent.accept')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              'flex-1 px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
              'text-neo-cyan hover:text-neo-white',
              'border-2 border-neo-cyan/40 rounded-neo transition-colors duration-100'
            )}
          >
            {t('cookieConsent.customize')}
          </button>
          <button
            type="button"
            onClick={handleDeclineAll}
            className={cn(
              'flex-1 px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
              'text-neo-white hover:text-neo-white',
              'border-2 border-neo-cream/30 rounded-neo transition-colors duration-100'
            )}
          >
            {t('cookieConsent.decline')}
          </button>
        </div>
      </div>

      {/* Granular preferences panel */}
      {showDetails && (
        <div className="mt-5 pt-5 border-t-2 border-neo-cream/10 max-w-md mx-auto">
          <div className="grid grid-cols-1 gap-3 mb-4">
            {/* Essential — always on */}
            <ConsentToggle
              label={t('cookieConsent.categories.essential')}
              description={t('cookieConsent.categories.essentialDesc')}
              requiredLabel={t('cookieConsent.required')}
              checked={true}
              disabled
            />
            {/* Analytics */}
            <ConsentToggle
              label={t('cookieConsent.categories.analytics')}
              description={t('cookieConsent.categories.analyticsDesc')}
              checked={analytics}
              onChange={setAnalytics}
            />
            {/* Advertising */}
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
              'w-full px-5 py-2 min-h-[44px] text-sm font-bold uppercase',
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
