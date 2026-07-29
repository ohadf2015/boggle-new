'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Target, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { clearSessionPreservingUsername } from '@/utils/session';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWordHuntPromo } from '@/hooks/useWordHuntPromo';

const POPUP_DELAY_MS = 2500;
const CLOSE_BUTTON_DELAY_MS = 3000;

interface WordHuntPromoPopupProps {
  /** Delay before popup appears (ms) */
  delayMs?: number;
}

const WordHuntPromoPopup: React.FC<WordHuntPromoPopupProps> = ({
  delayMs = POPUP_DELAY_MS,
}) => {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const canAnimate = enableComplexAnimations && !prefersReducedMotion;
  const { canShow, recordImpression } = useWordHuntPromo();

  const [isVisible, setIsVisible] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    if (!canShow) return;

    const showTimer = setTimeout(() => {
      setIsVisible(true);
      recordImpression();
    }, delayMs);
    const closeTimer = setTimeout(
      () => setShowCloseButton(true),
      delayMs + CLOSE_BUTTON_DELAY_MS
    );

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [delayMs, canShow, recordImpression]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handlePlay = useCallback(() => {
    clearSessionPreservingUsername();
    router.push(`/${language}/multiplayer?mode=word-hunt&autoCreate=true`);
  }, [language, router]);

  return (
    <AnimatePresence>
      {isVisible && (
        <m.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <m.div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs"
            onClick={showCloseButton ? handleClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Popup Card */}
          <m.div
            className={cn(
              'relative w-full max-w-sm overflow-hidden rounded-neo border-3 border-neo-black',
              'bg-neo-navy shadow-[8px_8px_0px_rgb(var(--neo-black))]',
              isRTL && 'shadow-[-8px_8px_0px_rgb(var(--neo-black))]'
            )}
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.1 }}
          >
            {/* Close Button — delayed appearance */}
            <AnimatePresence>
              {showCloseButton && (
                <m.button
                  onClick={handleClose}
                  className="absolute top-2 inset-e-2 z-30 flex items-center justify-center w-8 h-8 rounded-full bg-neo-black/60 text-neo-white hover:text-neo-white hover:bg-neo-black/80 transition-colors"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  aria-label={t('common.close') || 'Close'}
                >
                  <X className="w-4 h-4" />
                </m.button>
              )}
            </AnimatePresence>

            {/* Hero Image */}
            <div className="relative w-full aspect-video overflow-hidden">
              <Image
                src="/images/word-hunt-promo.webp"
                alt={t('wordHuntPromo.imageAlt') || 'Word Hunt multiplayer duel'}
                fill
                className="object-cover"
                priority
              />
              {/* Gradient fade to card */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-neo-navy to-transparent" />

              {/* Floating sparkles on image */}
              {canAnimate && (
                <>
                  <m.div
                    className="absolute top-3 inset-s-4 z-10"
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles className="w-5 h-5 text-neo-lime drop-shadow-lg" />
                  </m.div>
                  <m.div
                    className="absolute bottom-6 inset-e-4 z-10"
                    animate={{ rotate: [0, -20, 20, 0], scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <Zap className="w-4 h-4 text-neo-lime fill-neo-lime drop-shadow-lg" />
                  </m.div>
                </>
              )}
            </div>

            {/* Content */}
            <div className="px-5 pb-5 pt-1 text-center">
              {/* Badge */}
              <m.span
                className="inline-flex items-center px-2.5 py-0.5 rounded-neo-sm bg-neo-lime text-neo-black text-[10px] font-black uppercase tracking-widest border border-neo-black mb-2"
                animate={canAnimate ? { scale: [1, 1.08, 1] } : undefined}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
              >
                {t('wordHuntAnnouncement.badge')}
              </m.span>

              <h2 className="font-neo-display font-black text-2xl text-neo-white leading-tight mb-1.5">
                {t('wordHuntPromo.title')}
              </h2>

              <p className="text-sm text-neo-white leading-snug mb-5 max-w-[280px] mx-auto">
                {t('wordHuntPromo.subtitle')}
              </p>

              {/* CTA Button */}
              <m.button
                onClick={handlePlay}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3 px-6 rounded-neo border-3 border-neo-black',
                  'bg-linear-to-r from-neo-purple via-purple-600 to-neo-pink',
                  'text-neo-white font-black text-base uppercase tracking-wide',
                  'shadow-hard active:shadow-hard-pressed',
                  'active:translate-y-[2px]',
                  isRTL
                    ? 'active:translate-x-[-2px] shadow-[-4px_4px_0px_rgb(var(--neo-black))]'
                    : 'active:translate-x-[2px]',
                  'transition-all duration-150'
                )}
                whileHover={canAnimate ? { scale: 1.03 } : undefined}
                whileTap={{ scale: 0.97 }}
              >
                <Target className="w-5 h-5" />
                {t('wordHuntPromo.cta')}
                <ChevronRight className={cn('w-4 h-4', isRTL && 'rotate-180')} />
              </m.button>

              {/* Dismiss text — appears with close button */}
              <AnimatePresence>
                {showCloseButton && (
                  <m.button
                    onClick={handleClose}
                    className="mt-3 text-xs text-neo-white hover:text-neo-white transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {t('wordHuntPromo.dismiss')}
                  </m.button>
                )}
              </AnimatePresence>
            </div>

            {/* Halftone texture */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '6px 6px',
              }}
            />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default WordHuntPromoPopup;
