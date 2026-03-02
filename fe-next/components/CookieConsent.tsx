'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
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
 * Granular cookie consent banner for GDPR/AdSense compliance.
 * Shows at bottom until user makes a choice.
 * Supports "Accept All", "Decline All", and granular category toggles.
 * Can be re-opened via the ManageCookiesButton component.
 */
export default function CookieConsent() {
  const { t, language } = useLanguage();
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

  if (!visible) return null;

  const isRtl = language === 'he';

  return (
    <div
      role="dialog"
      aria-label={t('cookieConsent.title') || 'Cookie consent'}
      aria-modal="true"
      className={cn(
        'fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4',
        'bg-neo-navy border-t-4 border-neo-black',
        'animate-fade-in-up'
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-4xl mx-auto">
        {/* Main message */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <p className="text-sm text-neo-cream/90 font-medium flex-1 text-center sm:text-start">
            {t('cookieConsent.message') || 'We use cookies for analytics and to serve relevant ads. You can customize your preferences below.'}{' '}
            <a
              href={`/${language}/legal/cookies`}
              className="text-neo-cyan hover:underline font-bold"
            >
              {t('cookieConsent.learnMore') || 'Learn more'}
            </a>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeclineAll}
              className={cn(
                'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
                'text-neo-cream/80 hover:text-neo-white',
                'border-2 border-neo-cream/30 rounded-neo',
                'transition-colors duration-100'
              )}
            >
              {t('cookieConsent.decline') || 'Decline All'}
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
              {t('cookieConsent.customize') || 'Customize'}
            </button>
            <button
              onClick={handleAcceptAll}
              className={cn(
                'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
                'bg-neo-lime text-neo-black',
                'border-3 border-neo-black rounded-neo shadow-hard-sm',
                'hover:shadow-hard active:shadow-hard-pressed',
                'transition-all duration-100'
              )}
            >
              {t('cookieConsent.accept') || 'Accept All'}
            </button>
          </div>
        </div>

        {/* Granular preferences panel */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t-2 border-neo-cream/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Essential — always on */}
              <ConsentToggle
                label={t('cookieConsent.categories.essential') || 'Essential'}
                description={t('cookieConsent.categories.essentialDesc') || 'Required for site functionality (login, preferences)'}
                requiredLabel={t('cookieConsent.required') || 'Required'}
                checked={true}
                disabled
              />
              {/* Analytics */}
              <ConsentToggle
                label={t('cookieConsent.categories.analytics') || 'Analytics'}
                description={t('cookieConsent.categories.analyticsDesc') || 'Help us understand how you use the site'}
                checked={analytics}
                onChange={setAnalytics}
              />
              {/* Advertising */}
              <ConsentToggle
                label={t('cookieConsent.categories.advertising') || 'Advertising'}
                description={t('cookieConsent.categories.advertisingDesc') || 'Show relevant ads via Google AdSense'}
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
                {t('cookieConsent.savePreferences') || 'Save Preferences'}
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
            'bg-white border-2 border-neo-black shadow-sm',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-neo-white block">
          {label}
          {disabled && (
            <span className="text-neo-cream/50 font-normal ms-1">
              ({requiredLabel || 'Required'})
            </span>
          )}
        </span>
        <span className="text-xs text-neo-cream/60 block mt-0.5">{description}</span>
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
      className="text-sm text-neo-cream/50 hover:text-neo-cream/80 underline transition-colors"
    >
      {t('cookieConsent.manageCookies') || 'Manage Cookies'}
    </button>
  );
}
