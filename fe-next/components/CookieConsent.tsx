'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'cookie-consent';

/**
 * Cookie consent banner for GDPR/AdSense compliance.
 * Shows at the bottom of the page until user accepts or declines.
 * Stores preference in localStorage.
 */
export default function CookieConsent() {
  const { t, language } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('cookieConsent.title') || 'Cookie consent'}
      className={cn(
        'fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4',
        'bg-neo-navy border-t-4 border-neo-black',
        'animate-fade-in-up'
      )}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-sm text-neo-cream/90 font-medium flex-1 text-center sm:text-start">
          {t('cookieConsent.message') || 'We use cookies for analytics and to serve relevant ads. You can accept or decline non-essential cookies.'}{' '}
          <a
            href={`/${language}/legal/cookies`}
            className="text-neo-cyan hover:underline font-bold"
          >
            {t('cookieConsent.learnMore') || 'Learn more'}
          </a>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDecline}
            className={cn(
              'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
              'text-neo-cream/80 hover:text-neo-white',
              'border-2 border-neo-cream/30 rounded-neo',
              'transition-colors duration-100'
            )}
          >
            {t('cookieConsent.decline') || 'Decline'}
          </button>
          <button
            onClick={handleAccept}
            className={cn(
              'px-4 py-2 min-h-[44px] text-sm font-bold uppercase',
              'bg-neo-lime text-neo-black',
              'border-3 border-neo-black rounded-neo shadow-hard-sm',
              'hover:shadow-hard active:shadow-hard-pressed',
              'transition-all duration-100'
            )}
          >
            {t('cookieConsent.accept') || 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
