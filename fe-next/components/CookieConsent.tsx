'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Granular cookie consent banner for GDPR compliance.
 * Shows at bottom until user makes a choice.
 * Supports "Accept All", "Decline All", and granular category toggles.
 * Can be re-opened via the ManageCookiesButton component.
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

    // Listen for consent resets (from ManageCookiesButton)
    return onConsentChange((state) => {
      if (state.timestamp === 0) {
        // Reset triggered
        setVisible(true);
        setAnalytics(false);
        setAdvertising(false);
      }
    });
  }, []);

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
  useFocusTrap(dialogRef, visible, handleDeclineAll);

  // Add bottom padding to body when banner is visible so content isn't hidden behind it
  useEffect(() => {
    if (visible) {
      document.body.style.paddingBottom = '140px';
    } else {
      document.body.style.paddingBottom = '';
    }
    return () => { document.body.style.paddingBottom = ''; };
  }, [visible]);

  // CrazyGames embeds its own platform-level consent UI before our iframe loads.
  // A second banner inside the iframe violates the embed UX expectation.
  if (isOnCrazyGamesPlatform) return null;
  if (!visible) return null;

  const isRtl = language === 'he';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label={t('cookieConsent.title')}
      aria-modal="true"
      className={cn(
        'fixed bottom-[var(--bottom-stack-height,0px)] inset-x-0 z-[110] p-3 sm:p-4',
        'bg-neo-navy border-t-4 border-neo-black',
        'animate-fade-in-up'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Close (X) button — declines all cookies */}
      <button
        onClick={handleDeclineAll}
        aria-label={t('cookieConsent.decline')}
        className={cn(
          'absolute top-2 inset-e-2 p-1.5 min-h-[44px] min-w-[44px]',
          'flex items-center justify-center',
          'text-neo-white hover:text-neo-white',
          'transition-colors duration-100'
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div className="max-w-4xl mx-auto">
        {/* Main message */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <p className="text-sm text-neo-white font-medium flex-1 text-center sm:text-start pe-8 sm:pe-0">
            {t('cookieConsent.message')}{' '}
            <a
              href={`/${language}/legal/cookies`}
              className="text-neo-cyan hover:underline font-bold"
            >
              {t('cookieConsent.learnMore')}
            </a>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeclineAll}
              className={cn(
                'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
                'text-neo-white hover:text-neo-white',
                'border-2 border-neo-cream/30 rounded-neo',
                'transition-colors duration-100'
              )}
            >
              {t('cookieConsent.decline')}
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
                'text-neo-cyan hover:text-neo-white',
                'border-2 border-neo-cyan/40 rounded-neo',
                'transition-colors duration-100'
              )}
            >
              {t('cookieConsent.customize')}
            </button>
            <button
              onClick={handleAcceptAll}
              className={cn(
                'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
                'bg-accent text-accent-foreground',
                'border-3 border-neo-black rounded-neo shadow-hard-sm',
                'hover:shadow-hard active:shadow-hard-pressed',
                'transition-all duration-100'
              )}
            >
              {t('cookieConsent.accept')}
            </button>
          </div>
        </div>

        {/* Granular preferences panel */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t-2 border-neo-cream/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
            <div className="flex justify-end">
              <button
                onClick={handleSavePreferences}
                className={cn(
                  'px-5 py-2 min-h-[44px] text-sm font-bold uppercase',
                  'bg-neo-cyan text-neo-black',
                  'border-3 border-neo-black rounded-neo shadow-hard-sm',
                  'hover:shadow-hard active:shadow-hard-pressed',
                  'transition-all duration-100'
                )}
              >
                {t('cookieConsent.savePreferences')}
              </button>
            </div>
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
      onClick={handleClick}
      className="text-sm text-neo-white hover:text-neo-white underline transition-colors"
    >
      {t('cookieConsent.manageCookies')}
    </button>
  );
}
