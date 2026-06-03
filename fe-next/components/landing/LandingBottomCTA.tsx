'use client';

import { m } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { haptics } from '@/utils/haptics';
import { trackLandingCtaClick } from '@/utils/growthTracking';

interface LandingBottomCTAProps {
  onPlayClick: () => void;
}

export function LandingBottomCTA({ onPlayClick }: LandingBottomCTAProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleClick = () => {
    // Below-fold final CTA into onboarding — instrument it to see the visitor →
    // onboarding_started funnel leak (most drop pre-onboarding).
    trackLandingCtaClick('bottom_cta');
    haptics.success();
    onPlayClick();
  };

  return (
    <m.div
      className={cn(
        'w-full max-w-4xl mx-auto relative overflow-hidden',
        'bg-neo-navy',
        'border-3 border-neo-black shadow-hard-xl rounded-neo-lg',
        'p-8 sm:p-10 md:p-12 text-center'
      )}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Subtle top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-neo-lime" aria-hidden="true" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 bg-neo-lime/10 border-2 border-neo-lime/30 rounded-neo">
          <span className="text-neo-lime text-xs font-bold uppercase tracking-wider">
            {t('landing.freeToPlay')}
          </span>
        </div>

        <h2 className="font-black text-neo-white uppercase text-xl sm:text-2xl lg:text-3xl mb-3 neo-title">
          {t('landing.readyToCompete')}
        </h2>
        <p className="text-neo-white font-medium text-sm sm:text-base mb-8 max-w-lg mx-auto">
          {t('landing.welcomeSubtitle')}
        </p>
        <m.button
          onClick={handleClick}
          className={cn(
            'relative inline-flex items-center gap-2 px-10 py-4 sm:px-12 sm:py-5',
            'bg-neo-lime text-neo-black font-black uppercase text-lg sm:text-xl',
            'border-3 border-neo-black rounded-neo shadow-hard-lg',
            'hover:shadow-hard-xl active:shadow-hard-pressed active:translate-y-[2px]',
            'transition-all duration-150'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {t('landing.startPlaying')}
          <ArrowIcon className="w-5 h-5" />
        </m.button>
      </div>
    </m.div>
  );
}
