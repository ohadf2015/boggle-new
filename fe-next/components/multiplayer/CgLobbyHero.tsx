'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { CgLobbyHeroVariant } from '@/hooks/useCgLobbyHeroVariant';

interface CgLobbyHeroProps {
  variant: CgLobbyHeroVariant;
  displayName: string | null;
  onPlay: () => void;
  onBrowse: () => void;
}

const DECEL = [0.22, 1, 0.36, 1] as const;

const MASCOT: Record<CgLobbyHeroVariant, string> = {
  'first-timer': '/mascot/play.webp',
  'returning-named': '/mascot/waving.webp',
  'returning-anon': '/mascot/waving.webp',
};

const CgLobbyHero: React.FC<CgLobbyHeroProps> = ({ variant, displayName, onPlay, onBrowse }) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  useEffect(() => {
    trackGrowthEvent('cg_lobby_hero_view', { variant });
  }, [variant]);

  const greeting =
    variant === 'returning-named' && displayName
      ? t('cg.hero.welcomeBack', { name: displayName })
      : variant === 'returning-anon'
        ? t('cg.hero.welcomeBackAnon')
        : t('cg.hero.firstGreeting');

  const sub = variant === 'first-timer' ? t('cg.hero.firstSub') : t('cg.hero.returnSub');

  const handlePlay = () => {
    trackGrowthEvent('cg_lobby_hero_play', { variant });
    onPlay();
  };

  const handleBrowse = () => {
    trackGrowthEvent('cg_lobby_hero_browse', { variant });
    onBrowse();
  };

  return (
    <section
      aria-label={t('cg.hero.aria.section')}
      dir={dir}
      data-testid="cg-lobby-hero"
      className="relative mx-3 sm:mx-4 mt-3 mb-4 rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard-lg overflow-hidden texture-halftone"
    >
      {/* Corner staples */}
      <span aria-hidden className="absolute top-2 left-2 w-2 h-1 bg-black rotate-12" />
      <span aria-hidden className="absolute top-2 right-2 w-2 h-1 bg-black -rotate-12" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 p-5 sm:p-6 items-center">
        {/* LEFT — speech bubble + sub + CTA */}
        <div className={`flex flex-col gap-3 ${isRTL ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left'} items-center text-center`}>
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: DECEL }}
            className="relative max-w-[28ch]"
          >
            <div className="relative px-4 py-3 bg-neo-cream text-black border-neo-thick border-black rounded-neo shadow-hard">
              <p className="font-neo-display uppercase leading-tight tracking-tight text-2xl sm:text-3xl">
                {greeting}
              </p>
            </div>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={`absolute -bottom-3 ${isRTL ? 'right-6' : 'left-6'} w-6 h-6 ${isRTL ? '-scale-x-100' : ''}`}
            >
              <path d="M0 0 L20 0 L8 18 Z" fill="#FFFEF0" stroke="#000" strokeWidth="2.5" />
            </svg>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="font-neo-body text-base sm:text-lg text-neo-cream/85 max-w-[36ch]"
          >
            {sub}
          </motion.p>

          <div className="relative w-full max-w-md mt-1">
            <svg
              aria-hidden
              viewBox="0 0 200 100"
              className="absolute inset-0 w-full h-full -z-0 pointer-events-none"
              preserveAspectRatio="none"
            >
              <polygon
                points="20,20 50,5 80,25 110,0 140,22 170,8 195,28 175,55 198,80 165,90 135,72 105,98 75,75 45,95 20,75 0,55"
                fill="#FFE135"
                stroke="#000"
                strokeWidth="3"
              />
            </svg>
            <button
              data-testid="cg-lobby-hero-play"
              onClick={handlePlay}
              className="relative z-[1] w-full py-4 px-5 rounded-neo border-neo-thick border-black bg-neo-lime text-black font-neo-display uppercase text-2xl tracking-tight shadow-hard-lg active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-transform duration-100 flex items-center justify-center gap-2"
            >
              <span aria-hidden className="text-2xl">{isRTL ? '◀' : '▶'}</span>
              <span>{t('cg.hero.playCta')}</span>
            </button>
            <span
              aria-hidden
              className="absolute -top-2 -right-2 z-[2] inline-block bg-black text-neo-yellow font-neo-display text-xs uppercase px-2 py-0.5 border-2 border-black -rotate-6"
            >
              {t('cg.hero.playMicrocopy')}
            </span>
          </div>

          <button
            data-testid="cg-lobby-hero-browse"
            onClick={handleBrowse}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-neo border-neo-thick border-black bg-neo-navy text-neo-cream font-neo-display text-sm uppercase tracking-tight shadow-hard-sm active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px] transition-transform duration-100 hover:bg-neo-cyan hover:text-black"
          >
            <span>{t('cg.hero.browseRooms')}</span>
          </button>
        </div>

        {/* RIGHT — mascot in circle frame with halo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: DECEL }}
          className="relative w-[160px] sm:w-[180px] mx-auto"
        >
          {/* Layered glow — cyan outer, lime inner. Pure additive light, no blobs */}
          <div
            aria-hidden
            className="absolute inset-0 -m-8 rounded-full bg-neo-cyan/35 blur-2xl motion-reduce:hidden"
          />
          <div
            aria-hidden
            className="absolute inset-0 -m-3 rounded-full bg-neo-lime/30 blur-xl motion-reduce:hidden"
          />
          {/* Circle frame — hard border + offset shadow, neo style */}
          <div className="relative aspect-square rounded-full border-neo-thick border-black bg-neo-navy overflow-hidden shadow-hard">
            <motion.img
              src={MASCOT[variant]}
              alt=""
              data-testid="cg-lobby-hero-mascot"
              className="w-full h-full object-cover scale-125 motion-reduce:!animate-none"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          {/* Sparkle accent — small lime dot for personality */}
          <div
            aria-hidden
            className={`absolute top-1 ${isRTL ? 'left-1' : 'right-1'} w-4 h-4 rounded-full bg-neo-lime border-2 border-black shadow-hard-sm`}
          />
          <div
            aria-hidden
            className={`absolute bottom-2 ${isRTL ? 'right-0' : 'left-0'} w-3 h-3 rounded-full bg-neo-pink border-2 border-black`}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default CgLobbyHero;
