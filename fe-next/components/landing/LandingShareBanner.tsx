'use client';

import { m } from 'framer-motion';
import { Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LandingShareBannerProps {
  onShareClick: () => void;
}

export function LandingShareBanner({ onShareClick }: LandingShareBannerProps) {
  const { t, dir } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <button
        onClick={onShareClick}
        className={cn(
          'w-full flex items-center gap-4 p-5 sm:p-6 relative overflow-hidden',
          'bg-neo-navy border-3 border-neo-black rounded-neo-lg shadow-hard-lg',
          'hover:shadow-hard-xl hover:-translate-y-0.5 active:shadow-hard-pressed active:translate-y-[2px]',
          'transition-all duration-150',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
          'group text-start'
        )}
        aria-label={t('landing.shareTitle')}
      >
        {/* Subtle accent line */}
        <div className="absolute inset-y-0 inset-s-0 w-1.5 bg-neo-cyan" aria-hidden="true" />

        <div className="relative p-3 bg-neo-cyan/15 rounded-neo border-2 border-neo-cyan/30 shrink-0">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-neo-cyan" aria-hidden="true" />
        </div>

        <div className="relative flex-1 min-w-0">
          <div className="font-black text-neo-white text-sm sm:text-base uppercase leading-tight">
            {t('landing.shareTitle')}
          </div>
          <div data-testid="banner-subtitle" className="text-xs text-neo-white font-medium mt-1">
            {isAuthenticated
              ? (t('landing.shareSubtitle'))
              : (t('landing.shareSubtitleGuest'))}
          </div>
        </div>

        <m.div
          className={cn(
            'relative flex items-center gap-1.5 shrink-0',
            'bg-neo-cyan text-neo-black',
            'px-4 py-2 rounded-neo border-2 border-neo-black shadow-hard-sm',
            'group-hover:shadow-hard group-hover:-translate-y-0.5',
            'transition-all duration-150',
            'font-bold text-sm'
          )}
          aria-hidden="true"
        >
          <span className="hidden sm:inline">
            {t('landing.shareButton')}
          </span>
          <ArrowIcon className="w-4 h-4" />
        </m.div>
      </button>
    </m.div>
  );
}
