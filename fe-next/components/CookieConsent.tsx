'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
 * Blocking cookie-consent modal (GDPR).
 * Centered, screen-covering overlay shown until the user makes a choice — it
 * cannot be dismissed by backdrop click or Escape, so a decision is required
 * (unlike a bottom banner most users reflexively close). "Accept All" is the
 * prominent primary CTA; "Decline All" and "Customize" stay equal-weight,
 * one-click buttons so reject is as easy as accept (ePrivacy dark-pattern rule).
 * Re-openable via the ManageCookiesButton component.
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
    if (!hasConsentDecision()) {
      setVisible(true);
    }

    // Listen for consent resets (from ManageCookiesButton) — re-open the modal.
    return onConsentChange((state) => {
      if (state.timestamp === 0) {
        setVisible(true);
        setShowDetails(false);
        setAnalytics(false);
        setAdvertising(false);
      }
    });
  }, []);

  // Lock background scroll while the blocking modal is up. Save/restore the
  // prior inline value so we never clobber screen-fit's own overflow control.
  useEffect(() => {
    if (!visible || isOnCrazyGamesPlatform) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible, isOnCrazyGamesPlatform]);

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

  const dialogRef = useRef<HTMLDivElement>(null);
  // No onEscape handler: this is a blocking consent gate — Escape must NOT
  // dismiss it, the user has to pick an option.
  useFocusTrap(dialogRef, visible);

  // CrazyGames embeds its own platform-level consent UI before our iframe loads.
  // A second modal inside the iframe violates the embed UX expectation.
  if (isOnCrazyGamesPlatform) return null;
  if (!visible) return null;

  const isRtl = language === 'he';

  return (
    // Backdrop: covers the screen and captures all interaction. Intentionally
    // has NO onClick — clicking outside must not dismiss (user must choose).
    <div
      className={cn(
        'fixed inset-0 z-[110] flex items-center justify-center p-4',
        'bg-neo-black/80 backdrop-blur-sm animate-fade-in-up'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('cookieConsent.title')}
        className={cn(
          'relative w-full max-w-md max-h-[90vh] overflow-y-auto',
          'bg-neo-navy border-4 border-neo-black rounded-neo shadow-hard-lg',
          'p-6 animate-neo-pop'
        )}
      >
        {/* Mascot happily munching a cookie — decorative, brand personality */}
        <Image
          src="/cookie-consent-mascot.png"
          alt={t('cookieConsent.mascotAlt')}
          width={96}
          height={96}
          className="mx-auto mb-3 h-24 w-24 object-contain"
        />

        <h2 className="mb-2 text-center text-xl font-bold font-neo-display text-neo-white">
          {t('cookieConsent.title')}
        </h2>
        <p className="mb-5 text-center text-sm font-medium text-neo-white">
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
        <div className="flex flex-col gap-2">
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
          <div className="mt-5 pt-5 border-t-2 border-neo-cream/10">
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
    </div>
  );
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
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          className="sr-only peer"
        />
        <div
          className={cn(
            'w-10 h-6 rounded-full transition-colors',
            checked ? 'bg-neo-lime' : 'bg-neo-cream/20',
            disabled && 'bg-neo-cream/30'
          )}
        />
        <div
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full transition-transform',
            'bg-white border-2 border-neo-black shadow-xs',
            checked ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0.5 rtl:-translate-x-0.5'
          )}
        />
      </div>
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
