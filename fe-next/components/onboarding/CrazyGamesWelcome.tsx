'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Sparkles, Gamepad2, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { detectCrazyGamesLanguage } from '@/utils/cgLocaleDetect';
import WelcomeDemoGrid from './WelcomeDemoGrid';
import { getWelcomeDemoConfig } from './demoConfigs';

export type CrazyGamesMode = 'daily' | 'practice' | 'multiplayer';

interface CrazyGamesWelcomeProps {
  onPlay: (mode: CrazyGamesMode) => void;
}

const DECEL = [0.22, 1, 0.36, 1] as const;

/**
 * CrazyGames portal welcome — one-screen, ~3s to first tap.
 *
 * Anti-pattern guards: no centered-everything, no glassmorphism, no gradient
 * text, no border-stripe accents. Asymmetric grid. Color rhythm: lime
 * dominant, pink+cyan as accents only. Demo lives on a "plinth" — physical,
 * tangible, neo-brutalist.
 *
 * Locale comes from URL (always /<locale>/...), so no language picker.
 * Profile is deferred until after first game.
 */
const AUTO_ROUTE_MS = 5000;
const AUTO_ROUTE_TICK_MS = 1000;

const CrazyGamesWelcome: React.FC<CrazyGamesWelcomeProps> = ({ onPlay }) => {
  const { t, dir, language, setLanguage } = useLanguage();
  const { getSystemInfo } = useCrazyGames();
  const isRTL = dir === 'rtl';

  // Intent flags — used to decide whether unmount counts as a dismissal.
  // ctaFiredRef = user picked a mode (or auto-route resolved). dismissedRef = ESC/explicit dismiss already fired the event.
  const ctaFiredRef = useRef(false);
  const dismissedRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remaining, setRemaining] = useState<number>(Math.ceil(AUTO_ROUTE_MS / 1000));

  useEffect(() => {
    trackGrowthEvent('cg_welcome_view', { source: 'crazygames' });
  }, []);

  const clearTimers = React.useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  // Auto-detect locale from CG country + browser. URL locale (default `en`)
  // wins only when no signal points elsewhere. `skipNavigation: true` swaps
  // strings in place — the Play CTA already routes to the new locale.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let countryCode: string | null = null;
      try {
        const info = await getSystemInfo();
        countryCode = info?.countryCode ?? null;
      } catch {
        countryCode = null;
      }
      if (cancelled) return;
      const detected = detectCrazyGamesLanguage(countryCode);
      if (!detected || detected === language) return;
      trackGrowthEvent('cg_welcome_view', {
        source: 'crazygames',
        action: 'auto_locale',
        from: language,
        to: detected,
        countryCode,
      });
      setLanguage(detected, { skipNavigation: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = React.useCallback((mode: CrazyGamesMode, opts: { auto?: boolean } = {}) => {
    if (ctaFiredRef.current) return;
    ctaFiredRef.current = true;
    clearTimers();
    trackGrowthEvent('cg_welcome_play', opts.auto ? { mode, auto: true } : { mode });
    onPlay(mode);
  }, [clearTimers, onPlay]);

  // 5s auto-route to daily for CG portal users who don't pick a mode.
  // Why: PostHog data 2026-05-15 — 19/20 CG arrivals never reached game_started.
  useEffect(() => {
    autoTimerRef.current = setTimeout(() => {
      handlePlay('daily', { auto: true });
    }, AUTO_ROUTE_MS);
    tickTimerRef.current = setInterval(() => {
      setRemaining((r) => (r > 1 ? r - 1 : 0));
    }, AUTO_ROUTE_TICK_MS);
    return clearTimers;
  }, [handlePlay, clearTimers]);

  // ESC dismisses without auto-routing — emit dismissal so we can size the leak.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (ctaFiredRef.current || dismissedRef.current) return;
      dismissedRef.current = true;
      clearTimers();
      trackGrowthEvent('cg_welcome_dismissed', { reason: 'esc' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearTimers]);

  // Cancel the auto-route as soon as a user touches the modal — they're engaged,
  // let them choose. Doesn't count as a dismissal (no event emitted here).
  const handlePointerActivity = React.useCallback(() => {
    if (ctaFiredRef.current || dismissedRef.current) return;
    clearTimers();
    setRemaining(0);
  }, [clearTimers]);

  // Unmount without CTA/dismissal = silent close (back button, route change).
  useEffect(() => {
    return () => {
      if (ctaFiredRef.current || dismissedRef.current) return;
      trackGrowthEvent('cg_welcome_dismissed', { reason: 'unmount' });
    };
  }, []);

  return (
    <div
      data-testid="crazygames-welcome"
      dir={dir}
      onPointerDown={handlePointerActivity}
      className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 overflow-hidden"
    >
      {/* Decorative confetti — hard pixel squares scattered, not glow blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <m.div
          initial={{ opacity: 0, rotate: -8 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="absolute top-6 right-8 w-4 h-4 bg-neo-pink border-2 border-black"
        />
        <m.div
          initial={{ opacity: 0, rotate: 12 }}
          animate={{ opacity: 1, rotate: 8 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="absolute top-20 left-12 w-3 h-3 bg-neo-cyan border-2 border-black rotate-12"
        />
        <m.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="absolute bottom-32 right-16 w-5 h-5 bg-neo-lime border-2 border-black -rotate-12"
        />
        <m.div
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: -15 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="absolute bottom-12 left-6 w-3 h-3 bg-neo-purple border-2 border-black"
        />
      </div>

      <div className="relative grid lg:grid-cols-[1.1fr_1fr] gap-6 lg:gap-10 items-center">
        {/* LEFT — greeting block, intentionally left-aligned */}
        <div className={`flex flex-col gap-5 ${isRTL ? 'lg:text-right lg:items-end' : 'lg:text-left lg:items-start'} text-center items-center`}>
          {/* Tag chip — small surprise of personality */}
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: DECEL }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-neo-pink text-black border-2 border-black rounded-full font-neo-display text-[11px] uppercase tracking-wider shadow-hard-sm"
          >
            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
            {t('onboarding.crazygames.tagline')}
          </m.div>

          {/* Hero — display-only on the punch word, body font on intro line */}
          <m.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: DECEL }}
            className="font-neo-display uppercase leading-[0.85] tracking-tight text-neo-white"
            style={{ fontSize: 'clamp(2.75rem, 8cqw, 5rem)' }}
          >
            {t('onboarding.crazygames.title')}{' '}
            <span
              className="inline-block bg-neo-lime text-black px-2 py-0.5 border-2 border-black shadow-hard"
              style={{ transform: `rotate(${isRTL ? 2 : -2}deg)` }}
            >
              {t('onboarding.crazygames.titleAccent')}
            </span>
          </m.h1>

          {/* Subtitle — narrow column, body font */}
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="font-neo-body text-base sm:text-lg text-neo-white max-w-[44ch] leading-relaxed"
          >
            {t('onboarding.crazygames.howTo')}
          </m.p>

          {/* CTA stack — one heavyweight primary, two side chips */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: DECEL }}
            className="w-full max-w-md flex flex-col gap-3 mt-1"
          >
            <button
              data-testid="crazygames-welcome-cta-daily"
              onClick={() => handlePlay('daily')}
              className="group relative w-full py-5 px-6 rounded-neo border-neo-thick border-black bg-neo-lime text-black font-neo-display text-2xl uppercase tracking-tight shadow-hard-lg active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-transform duration-100 flex items-center justify-center gap-3"
            >
              <Sparkles className="w-6 h-6" aria-hidden />
              <span>{t('onboarding.crazygames.playDaily')}</span>
              <span aria-hidden className="text-3xl font-black">{isRTL ? '←' : '→'}</span>
            </button>
            {remaining > 0 && (
              <p
                data-testid="crazygames-welcome-autostart"
                className="font-neo-display text-[11px] uppercase tracking-[0.15em] text-neo-white text-center"
                aria-live="polite"
              >
                {t('onboarding.crazygames.autoStart', { n: remaining })}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="crazygames-welcome-cta-practice"
                onClick={() => handlePlay('practice')}
                className="py-3 px-4 rounded-neo border-neo border-black bg-neo-navy-light text-neo-white font-neo-display text-sm uppercase tracking-tight shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px] transition-transform duration-100 flex items-center justify-center gap-1.5 hover:bg-neo-cyan hover:text-black"
              >
                <Gamepad2 className="w-4 h-4" aria-hidden />
                {t('onboarding.crazygames.playPractice')}
              </button>
              <button
                data-testid="crazygames-welcome-cta-multiplayer"
                onClick={() => handlePlay('multiplayer')}
                className="py-3 px-4 rounded-neo border-neo border-black bg-neo-navy-light text-neo-white font-neo-display text-sm uppercase tracking-tight shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px] transition-transform duration-100 flex items-center justify-center gap-1.5 hover:bg-neo-pink hover:text-black"
              >
                <Users className="w-4 h-4" aria-hidden />
                {t('onboarding.crazygames.playMultiplayer')}
              </button>
            </div>
          </m.div>
        </div>

        {/* RIGHT — demo on physical "plinth", slight tilt for charm */}
        <m.div
          initial={{ opacity: 0, scale: 0.92, rotate: isRTL ? 2 : -2 }}
          animate={{ opacity: 1, scale: 1, rotate: isRTL ? 1.5 : -1.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: DECEL }}
          className="relative w-full max-w-md mx-auto"
        >
          <div className="relative rounded-neo border-neo-thick border-black bg-neo-navy-light overflow-hidden shadow-hard-lg">
            <div className="p-3 sm:p-4">
              <WelcomeDemoGrid />
            </div>
            {/* Caption strip — gives the exhibit feel */}
            <div className="px-4 py-2.5 bg-black border-t-2 border-black flex items-center justify-between gap-3">
              <span className="font-neo-display text-[11px] uppercase tracking-[0.15em] text-neo-lime">
                {t('onboarding.crazygames.demoCaption')}
              </span>
              <m.span
                animate={{ x: isRTL ? [0, -4, 0] : [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="font-neo-display text-[11px] uppercase tracking-[0.15em] text-neo-white"
                aria-hidden
              >
                {isRTL
                  ? `← ${getWelcomeDemoConfig(language).word.split('').join('-')}`
                  : `${getWelcomeDemoConfig(language).word.split('').join('-')} →`}
              </m.span>
            </div>
          </div>
          {/* Pinned sticker corner */}
          <m.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: 1, rotate: -12 }}
            transition={{ duration: 0.4, delay: 0.5, ease: DECEL }}
            className={`absolute -top-3 ${isRTL ? '-left-3' : '-right-3'} w-14 h-14 rounded-full bg-neo-pink border-neo-thick border-black flex items-center justify-center font-neo-display text-[10px] uppercase text-black tracking-tight leading-none text-center shadow-hard`}
          >
            {t('onboarding.crazygames.freeBadge')}
          </m.div>
        </m.div>
      </div>
    </div>
  );
};

export default CrazyGamesWelcome;
