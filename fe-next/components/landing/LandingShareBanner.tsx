'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Gift, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface LandingShareBannerProps {
  onShareClick: () => void;
}

export function LandingShareBanner({ onShareClick }: LandingShareBannerProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
    >
      <button
        onClick={onShareClick}
        className={cn(
          'w-full flex items-center gap-3 p-3 sm:p-4',
          'bg-gradient-to-r from-neo-pink/90 to-purple-600/90',
          'border-3 border-neo-black rounded-neo shadow-hard',
          'hover:shadow-hard-lg active:shadow-none',
          'transition-shadow duration-150',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2',
          'group text-start'
        )}
        aria-label={t('landing.shareTitle')}
      >
        <div className="p-2 bg-white/20 rounded-neo border border-white/30 shrink-0">
          <Gift className="w-5 h-5 text-white" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-black text-white text-sm sm:text-base uppercase leading-tight">
            {t('landing.shareTitle')}
          </div>
          <div data-testid="banner-subtitle" className="text-xs text-white/80 font-medium mt-0.5">
            {isAuthenticated
              ? (t('landing.shareSubtitle'))
              : (t('landing.shareSubtitleGuest'))}
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 shrink-0',
            'bg-white/20 group-hover:bg-white/30',
            'px-3 py-1.5 rounded-neo border border-white/30',
            'transition-colors'
          )}
          aria-hidden="true"
        >
          <Share2 className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-bold hidden sm:inline">
            {t('landing.shareButton')}
          </span>
        </div>
      </button>
    </m.div>
  );
}
