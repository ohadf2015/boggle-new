'use client';

import React, { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Share2, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useReferralShare } from './useReferralShare';
import { useFocusTrap } from '@/hooks/useFocusTrap';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface ShareReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareReferralModal({ isOpen, onClose }: ShareReferralModalProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { referralCode, referralRewardXp, isLoading, copied, fetchShareData, handleCopy, handleShare } =
    useReferralShare();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      fetchShareData();
    }
  }, [isOpen, fetchShareData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            data-testid="share-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neo-black/60 z-[60] backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          <m.div
            ref={dialogRef}
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            className={cn(
              'fixed bottom-0 left-0 right-0 z-61',
              'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
              'sm:w-full sm:max-w-md',
              'bg-white dark:bg-neo-navy',
              'border-t-3 border-neo-black',
              'sm:border-3 sm:rounded-neo',
              'shadow-hard-lg',
              'p-5 sm:p-6',
            )}
          >
            <button
              data-testid="share-modal-close"
              onClick={onClose}
              autoFocus
              className="absolute top-3 right-3 rtl:right-auto rtl:left-3 p-1.5 rounded-neo hover:bg-neo-black/10 transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neo-pink/20 rounded-neo border border-neo-pink/30 shrink-0">
                <Gift className="w-5 h-5 text-neo-pink" aria-hidden="true" />
              </div>
              <h2
                id="share-modal-title"
                className="font-black text-base sm:text-lg uppercase text-neo-black dark:text-neo-white"
              >
                {t('landing.shareModalTitle')}
              </h2>
            </div>

            {isAuthenticated && isLoading && (
              <div
                data-testid="share-modal-loading"
                className="h-14 animate-pulse bg-neo-black/10 dark:bg-white/10 rounded-neo mb-4"
              />
            )}

            {isAuthenticated && !isLoading && referralCode && (
              <div
                data-testid="share-modal-referral-code"
                className="flex items-center justify-between bg-neo-black/5 dark:bg-white/10 rounded-neo border border-neo-black/10 p-3 mb-3"
              >
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-neo-black/50 dark:text-white mb-0.5">
                    {t('profile.yourReferralCode')}
                  </div>
                  <code className="text-xl font-black text-neo-pink tracking-wider">{referralCode}</code>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-neo-black/50 dark:text-white mb-0.5">
                    {t('common.reward')}
                  </div>
                  <div className="text-lg font-black text-neo-lime">+{referralRewardXp} XP</div>
                </div>
              </div>
            )}

            {isAuthenticated && !isLoading && (
              <p className="text-sm font-bold text-neo-pink mb-4">
                ✨ {t('landing.shareXpReward')}
              </p>
            )}

            {!isAuthenticated && (
              <p
                data-testid="share-modal-guest-nudge"
                className="text-sm text-neo-black/70 dark:text-white mb-4 bg-neo-lime/20 rounded-neo p-3 border-2 border-neo-lime/50"
              >
                🎯 {t('landing.shareGuestNudge')}
              </p>
            )}

            <div className="flex gap-2 mb-3">
              <button
                data-testid="share-btn-whatsapp"
                onClick={() => handleShare('whatsapp')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-11',
                  'bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white font-bold',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'transition-shadow hover:shadow-hard-lg active:shadow-none',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
                )}
                aria-label={t('common.shareViaWhatsApp')}
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm hidden sm:inline">WhatsApp</span>
              </button>

              <button
                data-testid="share-btn-telegram"
                onClick={() => handleShare('telegram')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-11',
                  'bg-brand-telegram hover:bg-brand-telegram-hover text-white font-bold',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'transition-shadow hover:shadow-hard-lg active:shadow-none',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
                )}
                aria-label={t('common.shareViaTelegram')}
              >
                <TelegramIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm hidden sm:inline">Telegram</span>
              </button>

              <button
                data-testid="share-btn-native"
                onClick={() => handleShare('native')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-11',
                  'bg-neo-pink hover:bg-neo-pink/90 text-white font-bold',
                  'rounded-neo border-3 border-neo-black shadow-hard',
                  'transition-shadow hover:shadow-hard-lg active:shadow-none',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
                )}
                aria-label={t('common.share')}
              >
                <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-sm hidden sm:inline">{t('common.share')}</span>
              </button>
            </div>

            <button
              data-testid="share-btn-copy"
              onClick={handleCopy}
              className={cn(
                'w-full flex items-center justify-center gap-2 h-10 font-bold text-sm',
                'rounded-neo border-3 border-neo-black',
                'transition-all',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
                copied
                  ? 'bg-neo-lime text-neo-black shadow-none'
                  : 'bg-neo-black/5 dark:bg-white/10 hover:bg-neo-black/10 shadow-hard hover:shadow-hard-lg active:shadow-none'
              )}
            >
              {copied ? (
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span aria-live="polite">{copied ? (t('common.copied')) : (t('common.copy'))}</span>
            </button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
