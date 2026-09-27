'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Pointer, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import MiniGrid from './MiniGrid';
import { demoConfigs } from './demoConfigs';

interface CrazyGamesTutorialProps {
  onContinue: () => void;
  onSkip: () => void;
}

const DECEL = [0.22, 1, 0.36, 1] as const;
const SUCCESS_REVEAL_MS = 900;

/**
 * CrazyGames portal tutorial — Step 1 of 2 in the CG flow.
 *
 * Mirrors WelcomeDemoStep's auto-trace → user-trace → done sequence, but
 * styled to match CrazyGamesWelcome's neo-brutalist aesthetic (asymmetric
 * layout, lime/pink/cyan, hard shadows, no glassmorphism). One full screen,
 * skippable so we never trap the user.
 */
const CrazyGamesTutorial: React.FC<CrazyGamesTutorialProps> = ({ onContinue, onSkip }) => {
  const { t, dir, language } = useLanguage();
  const isRTL = dir === 'rtl';

  const [autoTracing, setAutoTracing] = useState(true);
  const [completed, setCompleted] = useState(false);

  const demoConfig = useMemo(() => demoConfigs[language] || demoConfigs.en, [language]);

  useEffect(() => {
    trackGrowthEvent('cg_tutorial_view', { source: 'crazygames' });
  }, []);

  const handleAutoTraceComplete = useCallback(() => {
    setAutoTracing(false);
  }, []);

  const handleDemoComplete = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    trackGrowthEvent('cg_tutorial_complete', { source: 'crazygames' });
  }, [completed]);

  // Reveal welcome only after the success celebration has had a beat to land.
  useEffect(() => {
    if (!completed) return;
    const timer = setTimeout(onContinue, SUCCESS_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [completed, onContinue]);

  const handleSkip = useCallback(() => {
    trackGrowthEvent('cg_tutorial_skip', { source: 'crazygames', autoTracing });
    onSkip();
  }, [onSkip, autoTracing]);

  return (
    <div
      data-testid="crazygames-tutorial"
      dir={dir}
      className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 overflow-hidden"
    >
      {/* Hard-pixel confetti — same vocabulary as CrazyGamesWelcome */}
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

      <div className="relative grid lg:grid-cols-[1fr_1.05fr] gap-6 lg:gap-10 items-center">
        {/* LEFT — instruction column */}
        <div
          className={`flex flex-col gap-5 ${
            isRTL ? 'lg:text-right lg:items-end' : 'lg:text-left lg:items-start'
          } text-center items-center`}
        >
          {/* Step chip */}
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: DECEL }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-neo-cyan text-black border-2 border-black rounded-full font-neo-display text-[11px] uppercase tracking-wider shadow-hard-sm"
          >
            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
            {t('onboarding.crazygames.tutorial.tag')}
          </m.div>

          {/* Hero — kinetic, with lime accent block on the verb */}
          <m.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: DECEL }}
            className="font-neo-display uppercase leading-[0.85] tracking-tight text-neo-white"
            style={{ fontSize: 'clamp(2.5rem, 7cqw, 4.25rem)' }}
          >
            <span
              className="inline-block bg-neo-lime text-black px-2 py-0.5 border-2 border-black shadow-hard"
              style={{ transform: `rotate(${isRTL ? 2 : -2}deg)` }}
            >
              {t('onboarding.crazygames.tutorial.heading')}
            </span>{' '}
            {t('onboarding.crazygames.tutorial.headingAccent')}
          </m.h1>

          {/* Subtitle */}
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="font-neo-body text-base sm:text-lg text-neo-white max-w-[44ch] leading-relaxed"
          >
            {t('onboarding.crazygames.tutorial.subtitle')}
          </m.p>

          {/* Status chip — phase-driven copy */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: DECEL }}
            className="w-full max-w-md"
          >
            <AnimatePresence mode="wait">
              {completed ? (
                <m.div
                  key="success"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="flex items-center gap-2 px-4 py-3 bg-neo-lime text-black border-neo-thick border-black rounded-neo shadow-hard-lg"
                >
                  <Sparkles className="w-5 h-5" aria-hidden />
                  <span className="font-neo-display uppercase text-base sm:text-lg tracking-tight">
                    {t('onboarding.crazygames.tutorial.success')}
                  </span>
                </m.div>
              ) : autoTracing ? (
                <m.div
                  key="watch"
                  initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? -12 : 12 }}
                  className="flex items-center gap-2 px-4 py-3 bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard"
                >
                  <span className="inline-block w-2 h-2 bg-neo-pink rounded-full animate-pulse" aria-hidden />
                  <span className="font-neo-display uppercase text-sm sm:text-base tracking-tight">
                    {t('onboarding.crazygames.tutorial.watchMe')}
                  </span>
                </m.div>
              ) : (
                <m.div
                  key="turn"
                  initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 12 : -12 }}
                  className="flex items-center gap-2 px-4 py-3 bg-neo-pink text-black border-neo-thick border-black rounded-neo shadow-hard-lg"
                >
                  <Pointer className="w-5 h-5 animate-bounce" aria-hidden />
                  <span className="font-neo-display uppercase text-sm sm:text-base tracking-tight">
                    {t('onboarding.crazygames.tutorial.yourTurn')}
                  </span>
                  <span className="ms-auto inline-block px-2 py-0.5 bg-black text-neo-lime border-2 border-black rounded font-neo-display text-base sm:text-lg tracking-widest">
                    {demoConfig.word}
                  </span>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>

          {/* Skip — visible only while not yet completed */}
          {!completed && (
            <m.button
              data-testid="crazygames-tutorial-skip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 0.6 }}
              onClick={handleSkip}
              className="font-neo-display text-xs uppercase tracking-wider text-neo-white underline-offset-4 underline hover:text-neo-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan rounded-sm px-1 py-1"
            >
              {t('onboarding.crazygames.tutorial.skip')}
            </m.button>
          )}
        </div>

        {/* RIGHT — interactive grid on a tilted plinth, mirrors CrazyGamesWelcome */}
        <m.div
          initial={{ opacity: 0, scale: 0.92, rotate: isRTL ? 2 : -2 }}
          animate={{ opacity: 1, scale: 1, rotate: isRTL ? 1.5 : -1.5 }}
          transition={{ duration: 0.6, delay: 0.2, ease: DECEL }}
          className="relative w-full max-w-md mx-auto"
        >
          <div className="relative rounded-neo border-neo-thick border-black bg-neo-navy-light overflow-hidden shadow-hard-lg">
            <div className="p-3 sm:p-4">
              <MiniGrid
                size={3}
                letters={demoConfig.letters}
                demoWord={demoConfig.word}
                demoPath={demoConfig.path}
                onDemoComplete={handleDemoComplete}
                showHints={!autoTracing}
                autoTrace={autoTracing}
                onAutoTraceComplete={handleAutoTraceComplete}
              />
            </div>
            {/* Caption strip — matches the welcome plinth style */}
            <div className="px-4 py-2.5 bg-black border-t-2 border-black flex items-center justify-between gap-3">
              <span className="font-neo-display text-[11px] uppercase tracking-[0.15em] text-neo-lime">
                {t('onboarding.crazygames.tutorial.caption')}
              </span>
              <span
                className="font-neo-display text-[11px] uppercase tracking-[0.15em] text-neo-white"
                aria-hidden
              >
                {demoConfig.word.split('').join('-')}
              </span>
            </div>
          </div>
          {/* Pinned hint sticker — only while user is acting */}
          <AnimatePresence>
            {!autoTracing && !completed && (
              <m.div
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: -10 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: DECEL }}
                className={`absolute -top-3 ${isRTL ? '-left-3' : '-right-3'} w-14 h-14 rounded-full bg-neo-pink border-neo-thick border-black flex items-center justify-center font-neo-display text-[10px] uppercase text-black tracking-tight leading-none text-center shadow-hard`}
              >
                {t('onboarding.crazygames.tutorial.tryIt')}
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </div>
    </div>
  );
};

export default CrazyGamesTutorial;
