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
  'returning-named': '/mascot/spectating.webp',
  'returning-anon': '/mascot/spectating.webp',
};

type SparkleDot = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: string;
  color: string;
  delay: number;
};

const SPARKLE_DOTS: SparkleDot[] = [
  { top: '6%', left: '14%', size: 'w-2 h-2', color: 'bg-neo-yellow', delay: 0 },
  { top: '22%', right: '6%', size: 'w-3 h-3', color: 'bg-neo-cyan', delay: 0.4 },
  { bottom: '12%', left: '4%', size: 'w-2 h-2', color: 'bg-neo-pink', delay: 0.8 },
  { bottom: '24%', right: '12%', size: 'w-2.5 h-2.5', color: 'bg-neo-lime', delay: 1.2 },
];

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
      className="@container relative mx-3 sm:mx-4 mt-3 mb-4 rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard-lg overflow-hidden texture-halftone [container-type:inline-size]"
    >
      {/* Animated diagonal stripe wash — barely-there energy behind the layout */}
      <motion.span
        aria-hidden
        animate={{ backgroundPositionX: ['0px', '48px'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 opacity-[0.05] pointer-events-none motion-reduce:hidden bg-[repeating-linear-gradient(45deg,#BFFF00_0_2px,transparent_2px_24px)]"
      />
      {/* Soft conic glow anchored to mascot side */}
      <span
        aria-hidden
        className={`absolute top-1/2 ${isRTL ? 'left-0' : 'right-0'} -translate-y-1/2 w-[55%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.10),transparent_60%)] pointer-events-none`}
      />
      {/* Corner staples */}
      <span aria-hidden className="absolute top-2 left-2 w-2 h-1 bg-black rotate-12" />
      <span aria-hidden className="absolute top-2 right-2 w-2 h-1 bg-black -rotate-12" />
      <span aria-hidden className="absolute bottom-2 left-2 w-2 h-1 bg-black -rotate-12" />
      <span aria-hidden className="absolute bottom-2 right-2 w-2 h-1 bg-black rotate-12" />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-4 sm:gap-6 p-5 sm:p-6 items-center">
        {/* LEFT — speech bubble + sub + CTA */}
        <div className={`flex flex-col gap-3 ${isRTL ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left'} items-center text-center`}>
          <motion.div
            initial={{ opacity: 0, y: -10, rotate: -3, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: DECEL }}
            className="relative max-w-[28ch]"
          >
            <motion.div
              animate={{ y: [0, -2, 0, 1, 0], rotate: [0, 0.4, 0, -0.4, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative px-4 py-3 bg-neo-cream text-black border-neo-thick border-black rounded-neo shadow-hard motion-reduce:!animate-none motion-reduce:!transform-none"
            >
              <p className="font-neo-display uppercase leading-tight tracking-tight text-2xl sm:text-3xl">
                {greeting}
              </p>
              {/* Inner highlight stripe — adds depth without losing flatness */}
              <span aria-hidden className="absolute inset-x-2 top-1.5 h-0.5 bg-black/10 rounded-full" />
            </motion.div>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={`absolute -bottom-3 ${isRTL ? 'right-6' : 'left-6'} w-6 h-6 ${isRTL ? '-scale-x-100' : ''} drop-shadow-[2px_2px_0_rgba(0,0,0,1)]`}
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

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25, ease: DECEL }}
            className="relative w-full max-w-md mt-1"
          >
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
            <motion.button
              data-testid="cg-lobby-hero-play"
              onClick={handlePlay}
              animate={{ scale: [1, 1.022, 1] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              whileTap={{ scale: 0.97 }}
              className="relative z-[1] w-full py-4 px-5 rounded-neo border-neo-thick border-black bg-neo-lime text-black font-neo-display uppercase text-2xl tracking-tight shadow-hard-lg active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-shadow duration-100 flex items-center justify-center gap-2 overflow-hidden motion-reduce:!animate-none motion-reduce:!transform-none"
            >
              {/* Animated shine sweep — neo-brutalist gloss without softness */}
              <motion.span
                aria-hidden
                initial={{ x: '-120%' }}
                animate={{ x: ['-120%', '180%'] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'linear' }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent skew-x-[-18deg] pointer-events-none motion-reduce:hidden"
              />
              <motion.span
                aria-hidden
                animate={{ x: isRTL ? [0, -4, 0] : [0, 4, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                className="text-2xl motion-reduce:!animate-none motion-reduce:!transform-none"
              >
                {isRTL ? '◀' : '▶'}
              </motion.span>
              <span className="relative">{t('cg.hero.playCta')}</span>
            </motion.button>
            <motion.span
              aria-hidden
              animate={{ rotate: [-6, -10, -6, -3, -6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-2 -right-2 z-[2] inline-block bg-black text-neo-yellow font-neo-display text-xs uppercase px-2 py-0.5 border-2 border-black shadow-hard-sm motion-reduce:!animate-none motion-reduce:!transform-none"
            >
              {t('cg.hero.playMicrocopy')}
            </motion.span>
          </motion.div>

          <motion.button
            data-testid="cg-lobby-hero-browse"
            onClick={handleBrowse}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.4 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-neo border-neo-thick border-black bg-neo-navy text-neo-cream font-neo-display text-sm uppercase tracking-tight shadow-hard-sm hover:bg-neo-cyan hover:text-black hover:shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px] transition-[background,box-shadow,color] duration-150 motion-reduce:!transform-none"
          >
            <span>{t('cg.hero.browseRooms')}</span>
          </motion.button>
        </div>

        {/* RIGHT — mascot in circle frame with halo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82, rotate: isRTL ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: DECEL }}
          className="relative w-[clamp(120px,28cqi,220px)] mx-auto"
        >
          {/* Layered glow — cyan outer pulse, lime inner. Pure additive light, no blobs */}
          <motion.div
            aria-hidden
            animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 -m-8 rounded-full bg-neo-cyan/40 blur-2xl motion-reduce:hidden"
          />
          <motion.div
            aria-hidden
            animate={{ scale: [1.04, 1, 1.04], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            className="absolute inset-0 -m-3 rounded-full bg-neo-lime/35 blur-xl motion-reduce:hidden"
          />
          {/* Rotating dashed ring — kinetic energy, hard stroke (no softness) */}
          <motion.svg
            aria-hidden
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 -m-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] motion-reduce:hidden"
          >
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#BFFF00"
              strokeWidth="2.5"
              strokeDasharray="6 8"
              strokeLinecap="square"
            />
          </motion.svg>
          {/* Circle frame — hard border + offset shadow, neo style */}
          <div className="relative aspect-square rounded-full border-neo-thick border-black bg-neo-navy overflow-hidden shadow-hard-lg">
            {/* Subtle radial vignette inside the bezel */}
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(191,255,0,0.18),transparent_65%)] pointer-events-none" />
            <motion.img
              src={MASCOT[variant]}
              alt=""
              data-testid="cg-lobby-hero-mascot"
              className="w-full h-full object-cover scale-125 motion-reduce:!animate-none"
              animate={{ y: [0, -4, 0, -2, 0], rotate: [0, -1.2, 0, 1.2, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          {/* Big anchor dots — keep existing personality */}
          <div
            aria-hidden
            className={`absolute top-1 ${isRTL ? 'left-1' : 'right-1'} w-4 h-4 rounded-full bg-neo-lime border-2 border-black shadow-hard-sm`}
          />
          <div
            aria-hidden
            className={`absolute bottom-2 ${isRTL ? 'right-0' : 'left-0'} w-3 h-3 rounded-full bg-neo-pink border-2 border-black`}
          />
          {/* Floating sparkle dots — orbit around mascot for joyful energy */}
          {SPARKLE_DOTS.map((s, i) => (
            <motion.span
              key={i}
              aria-hidden
              style={{
                top: s.top,
                bottom: s.bottom,
                left: s.left,
                right: s.right,
              }}
              animate={{ scale: [0.7, 1.1, 0.7], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
              className={`absolute ${s.size} ${s.color} rounded-full border-2 border-black shadow-hard-sm motion-reduce:hidden`}
            />
          ))}
          {/* Decorative star — Jackbox-style flair */}
          <motion.svg
            aria-hidden
            viewBox="0 0 24 24"
            animate={{ rotate: [0, 18, -8, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute -top-3 ${isRTL ? '-left-3' : '-right-3'} w-7 h-7 motion-reduce:hidden`}
          >
            <path
              d="M12 2 L14.5 9 L22 9.5 L16 14 L18 21 L12 17 L6 21 L8 14 L2 9.5 L9.5 9 Z"
              fill="#FFE135"
              stroke="#000"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>
      </div>
    </section>
  );
};

export default CgLobbyHero;
