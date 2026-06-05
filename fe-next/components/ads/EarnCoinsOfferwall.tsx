'use client';

import React, { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { Coins, X, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoinContext } from '@/contexts/CoinContext';
import {
  isAyetOfferwallConfigured,
  hasOfferwallTestFlag,
  isOfferwallAvailable,
  getAyetOfferwallUrl,
} from '@/lib/ads/ayetOfferwall';

interface EarnCoinsOfferwallButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * "Earn free coins" offerwall CTA + modal. Pay-per-action complement to the rewarded
 * video button: the user completes an offer in the ayeT offerwall and coins are credited
 * by the verified S2S webhook (/api/offerwall/ayet) — never by this component.
 *
 * - Renders nothing unless the offerwall is configured + web (not native/CrazyGames).
 * - Guests see the CTA but clicking routes them to signup (the webhook needs a real
 *   user id as `external_identifier`); authed users open the offerwall iframe.
 * - The offerwall grid breaks under RTL, so its container is forced `dir="ltr"` even in
 *   Hebrew (the surrounding chrome stays localized).
 * - On close we refetch the balance, since the credit arrives out-of-band via webhook.
 */
export const EarnCoinsOfferwallButton: React.FC<EarnCoinsOfferwallButtonProps> = ({
  className,
  size = 'sm',
}) => {
  const { t, language } = useLanguage();
  const { user, isGuest } = useAuth();
  const { refreshCoins } = useCoinContext();
  const crazyGames = useCrazyGames();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const available = isOfferwallAvailable({
    configured: isAyetOfferwallConfigured(),
    isProd: process.env.NODE_ENV === 'production',
    hasTestFlag: hasOfferwallTestFlag(),
    isNative: Capacitor.isNativePlatform(),
    isCrazyGames: crazyGames?.isOnCrazyGamesPlatform === true,
  });

  const handleClick = useCallback(() => {
    if (!user || isGuest) {
      // Acquisition lever: offerwall conversions must attribute to a real account.
      router.push(`/${language}/login`);
      return;
    }
    setOpen(true);
  }, [user, isGuest, router, language]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Coins land via the S2S webhook, not the iframe — refetch so the user sees them.
    void refreshCoins();
  }, [refreshCoins]);

  if (!available) return null;

  const url = user ? getAyetOfferwallUrl(user.id) : '';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={t('offerwall.cta.aria')}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-neo border-neo border-black bg-neo-cyan font-neo-display font-bold text-neo-navy shadow-hard transition-transform active:translate-y-px active:shadow-hard-pressed',
          size === 'md' ? 'px-5 py-3 text-base' : 'px-3 py-2 text-sm',
          className,
        )}
      >
        <Gift className="h-4 w-4" aria-hidden="true" />
        {t('offerwall.cta.label')}
      </button>

      {open && url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('offerwall.modal.title')}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3"
          onClick={handleClose}
        >
          <div
            className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy shadow-hard-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b-neo border-black bg-neo-cyan px-4 py-3">
              <span className="flex items-center gap-2 font-neo-display font-bold text-neo-navy">
                <Coins className="h-5 w-5" aria-hidden="true" />
                {t('offerwall.modal.title')}
              </span>
              <button
                type="button"
                onClick={handleClose}
                aria-label={t('offerwall.modal.close')}
                className="rounded-neo border-neo border-black bg-neo-white p-1 text-neo-navy shadow-hard-sm active:translate-y-px"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <p className="px-4 py-2 text-center font-neo-body text-xs text-neo-cream/80">
              {t('offerwall.modal.subtitle')}
            </p>

            {/* RTL guard: the ayeT offerwall grid renders broken under dir=rtl. */}
            <div dir="ltr" className="flex-1 bg-white">
              <iframe
                src={url}
                title={t('offerwall.modal.title')}
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EarnCoinsOfferwallButton;
