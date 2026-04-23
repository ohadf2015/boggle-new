'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Map, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackModeSelected, trackLandingCtaClick } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

export function LandingAdventureStrip() {
  const { t, language, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const handleClick = () => {
    trackModeSelected('adventure', 'home');
    trackLandingCtaClick('mode_card', { mode: 'adventure', variant: 'lime' });
  };

  return (
    <motion.div
      data-testid="landing-adventure-strip"
      className={cn(
        'w-full max-w-4xl mx-auto relative overflow-hidden',
        'bg-gradient-to-r from-neo-navy-light to-neo-navy',
        'border-neo-thick border-neo-lime rounded-neo shadow-hard-lg',
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-neo-lime" />

      <Link
        href={`/${language}/adventure`}
        onClick={handleClick}
        className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 group"
      >
        <div className="relative flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-neo border-neo border-neo-black bg-neo-lime/15 overflow-hidden">
          <Image
            src="/modes/adventure.png"
            alt=""
            fill
            sizes="(max-width: 640px) 80px, 112px"
            className="object-contain p-2"
          />
        </div>

        <div className="flex-1 min-w-0 text-start">
          <div className="inline-flex items-center gap-1 mb-1.5 text-neo-lime">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            <Map className="w-3 h-3" aria-hidden="true" />
          </div>
          <h3 className="font-neo-display font-black text-neo-white uppercase text-lg sm:text-2xl leading-tight">
            {t('landing.adventureMode')}
          </h3>
          <p className="text-neo-white/70 font-medium text-xs sm:text-sm mt-0.5 line-clamp-2">
            {t('landing.adventureModeDesc')}
          </p>
        </div>

        <div className={cn(
          'hidden sm:inline-flex flex-shrink-0 items-center gap-2 px-4 py-2.5',
          'bg-neo-lime text-neo-black font-black uppercase text-sm',
          'border-neo border-neo-black rounded-neo shadow-hard',
          'group-hover:shadow-hard-lg group-active:shadow-hard-pressed group-active:translate-y-[1px]',
          'transition-all duration-150',
        )}>
          <span>{t('landing.startPlaying')}</span>
          <ArrowIcon className="w-4 h-4" />
        </div>

        <ArrowIcon className="sm:hidden flex-shrink-0 w-6 h-6 text-neo-lime" aria-hidden="true" />
      </Link>
    </motion.div>
  );
}
