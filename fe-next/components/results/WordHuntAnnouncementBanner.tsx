'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Target, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { clearSessionPreservingUsername } from '@/utils/session';
import { useRouter } from 'next/navigation';
import { useWordHuntPromo } from '@/hooks/useWordHuntPromo';

interface WordHuntAnnouncementBannerProps {
  className?: string;
}

/**
 * Promotional banner for Word Hunt multiplayer mode.
 * Shown on the results page after non-word-hunt games.
 * Respects shared impression limit (max 3 total across popup + banner).
 */
const WordHuntAnnouncementBanner: React.FC<WordHuntAnnouncementBannerProps> = ({
  className,
}) => {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const canAnimate = enableComplexAnimations && !prefersReducedMotion;
  const { canShow, recordImpression } = useWordHuntPromo();
  const recorded = useRef(false);

  useEffect(() => {
    if (canShow && !recorded.current) {
      recorded.current = true;
      recordImpression();
    }
  }, [canShow, recordImpression]);

  if (!canShow) return null;

  const handleClick = () => {
    clearSessionPreservingUsername();
    router.push(`/${language}/multiplayer?mode=word-hunt&autoCreate=true`);
  };

  const glowColor = 'rgba(139, 92, 246, 0.5)';

  return (
    <m.button
      onClick={handleClick}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'w-full relative overflow-hidden rounded-neo border-3 border-neo-black cursor-pointer text-start',
        'bg-linear-to-br from-neo-purple via-purple-600 to-neo-pink',
        isRTL
          ? 'active:translate-x-[-2px] active:translate-y-[2px]'
          : 'active:translate-x-[2px] active:translate-y-[2px]',
        'active:shadow-hard-pressed',
        'transition-shadow duration-200',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 0 24px ${glowColor}, 0 0 48px ${glowColor}, 6px 6px 0px rgb(var(--neo-black))`
          : '6px 6px 0px rgb(var(--neo-black))',
      }}
    >
      {/* Animated sparkles — motion safe */}
      {canAnimate && (
        <>
          <m.div
            className="absolute top-1.5 inset-e-14 z-20"
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-neo-lime" />
          </m.div>
          <m.div
            className="absolute bottom-2 inset-e-6 z-20"
            animate={{ rotate: [0, -20, 20, 0], scale: [0.8, 1.1, 0.8], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
          >
            <Zap className="w-3 h-3 text-neo-lime fill-neo-lime" />
          </m.div>
        </>
      )}

      <div className="relative z-10 flex items-center gap-3 p-3">
        {/* Target icon with animated glow ring */}
        <div className="relative shrink-0">
          {canAnimate && (
            <m.div
              className="absolute -inset-1.5 rounded-neo"
              animate={{
                boxShadow: [
                  '0 0 0px rgba(139, 92, 246, 0)',
                  '0 0 16px rgba(139, 92, 246, 0.7)',
                  '0 0 0px rgba(139, 92, 246, 0)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}
          <m.div
            className="flex items-center justify-center w-11 h-11 rounded-neo border-2 border-neo-black bg-neo-navy relative"
            animate={canAnimate ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Target className="w-6 h-6 text-neo-purple-light" />
          </m.div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* "NEW" badge — arcade-style pulse */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <m.span
              className="inline-flex items-center px-1.5 py-px rounded-neo-sm bg-neo-lime text-neo-black text-[9px] font-black uppercase tracking-widest border border-neo-black"
              animate={canAnimate ? { scale: [1, 1.08, 1] } : undefined}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
            >
              {t('wordHuntAnnouncement.badge')}
            </m.span>
          </div>
          <h3 className="font-black text-base text-neo-white leading-tight">
            {t('wordHuntAnnouncement.title')}
          </h3>
          <p className="text-[11px] text-neo-white mt-0.5 leading-snug line-clamp-2">
            {t('wordHuntAnnouncement.subtitle')}
          </p>
        </div>

        {/* Chunky CTA pill */}
        <m.div
          animate={canAnimate ? { x: isRTL ? [-2, 0, -2] : [0, 2, 0] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="shrink-0 flex items-center gap-0.5 bg-neo-lime text-neo-black font-black text-[10px] uppercase px-2.5 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm"
        >
          <ChevronRight className={cn('w-3.5 h-3.5', isRTL && 'rotate-180')} />
        </m.div>
      </div>

      {/* Shine sweep on hover */}
      {canAnimate && (
        <m.div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo z-10"
          initial={false}
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <m.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: '-100%' }}
            animate={isHovered ? { x: '200%' } : { x: '-100%' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </m.div>
      )}

      {/* Halftone texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '6px 6px',
        }}
      />
    </m.button>
  );
};

export default WordHuntAnnouncementBanner;
