'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronLeft, ChevronRight, ExternalLink, FlaskConical, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ScientificTip {
  id: string;
  icon: string;
  sourceKey: string;
  sourceUrl: string;
  gradient: string;
  accentColor: string;
}

const TIPS: ScientificTip[] = [
  {
    id: 'tip1',
    icon: '🧠',
    sourceKey: 'source1',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5930973/',
    gradient: 'from-violet-600/20 via-purple-500/10 to-transparent',
    accentColor: 'neo-purple',
  },
  {
    id: 'tip2',
    icon: '⚡',
    sourceKey: 'source2',
    sourceUrl: 'https://medschool.duke.edu/news/study-shows-crossword-puzzles-beat-computer-games-slowing-memory-loss',
    gradient: 'from-amber-500/20 via-orange-400/10 to-transparent',
    accentColor: 'neo-orange',
  },
  {
    id: 'tip3',
    icon: '💎',
    sourceKey: 'source3',
    sourceUrl: 'https://www.nbcnews.com/health/aging/brain-game-boosts-chemical-memory-dementia-research-rcna237832',
    gradient: 'from-cyan-500/20 via-teal-400/10 to-transparent',
    accentColor: 'neo-cyan',
  },
  {
    id: 'tip4',
    icon: '🎯',
    sourceKey: 'source4',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12244833/',
    gradient: 'from-pink-500/20 via-rose-400/10 to-transparent',
    accentColor: 'neo-pink',
  },
  {
    id: 'tip5',
    icon: '🔄',
    sourceKey: 'source5',
    sourceUrl: 'https://www.nationalgeographic.com/health/article/crossword-puzzles-brain-health',
    gradient: 'from-lime-500/20 via-green-400/10 to-transparent',
    accentColor: 'neo-lime',
  },
];

const AUTO_ROTATE_INTERVAL = 6000;

/**
 * Scientific Tips Carousel
 * Auto-rotating carousel of brain training facts with research citations.
 */
export default function ScientificTipsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  const goToPrevious = useCallback(() => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + TIPS.length) % TIPS.length);
  }, []);

  const goToNext = useCallback(() => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % TIPS.length);
  }, []);

  const goToIndex = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  }, [activeIndex]);

  // Auto-rotate with longer interval for reading
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(goToNext, AUTO_ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, goToNext]);

  const activeTip = TIPS[activeIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <div className="space-y-3">
      {/* Header with science badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-lg border-2 border-neo-black',
            isDarkMode ? 'bg-linear-to-br from-neo-lime/30 to-neo-cyan/20' : 'bg-linear-to-br from-neo-orange/30 to-neo-yellow/20'
          )}>
            <Lightbulb className={cn(
              'w-4 h-4',
              isDarkMode ? 'text-neo-lime' : 'text-neo-orange'
            )} />
          </div>
          <h2 className={cn(
            'text-lg font-bold uppercase tracking-wide',
            isDarkMode ? 'text-neo-white' : 'text-neo-black'
          )}>
            {t('brain.scientificTips')}
          </h2>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full border-2 border-neo-black text-xs font-bold uppercase',
          isDarkMode ? 'bg-neo-navy-light text-neo-cyan' : 'bg-white text-neo-purple'
        )}>
          <FlaskConical className="w-3 h-3" />
          {t('brain.researchBacked')}
        </div>
      </div>

      {/* Main carousel card */}
      <div
        className={cn(
          'relative rounded-neo border-3 border-neo-black shadow-hard overflow-hidden',
          isDarkMode ? 'bg-neo-navy' : 'bg-white'
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Animated gradient background */}
        <m.div
          key={`gradient-${activeIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={cn(
            'absolute inset-0 bg-linear-to-br pointer-events-none',
            activeTip.gradient
          )}
        />

        {/* Decorative elements */}
        <div className="absolute top-2 left-2 opacity-10">
          <Quote className={cn('w-12 h-12', isDarkMode ? 'text-neo-white' : 'text-neo-black')} />
        </div>

        {/* Tip Content */}
        <div className="relative p-5 min-h-[180px]">
          <AnimatePresence mode="wait" custom={direction}>
            <m.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Icon and main text */}
              <div className="flex items-start gap-4">
                <m.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className={cn(
                    'shrink-0 w-14 h-14 flex items-center justify-center rounded-xl border-3 border-neo-black shadow-hard-sm',
                    isDarkMode ? 'bg-neo-navy-light' : 'bg-neo-cream'
                  )}
                >
                  <span className="text-3xl">{activeTip.icon}</span>
                </m.div>
                <div className="flex-1 pt-1">
                  <p className={cn(
                    'text-base font-medium leading-relaxed',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black'
                  )}>
                    {t(`brain.tips.${activeTip.id}`)}
                  </p>
                </div>
              </div>

              {/* Citation block */}
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border-2',
                  isDarkMode
                    ? 'bg-neo-navy-light/80 border-slate-600'
                    : 'bg-neo-cream/80 border-slate-300'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-semibold uppercase tracking-wide mb-0.5',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black/50'
                  )}>
                    {t('brain.sourceLabel')}
                  </p>
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isDarkMode ? 'text-neo-cyan' : 'text-neo-purple'
                  )}>
                    {t(`brain.tips.${activeTip.sourceKey}`)}
                  </p>
                </div>
                <a
                  href={activeTip.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('brain.learnMore')}
                  className={cn(
                    'shrink-0 ms-3 p-2 rounded-lg border-2 border-neo-black transition-all',
                    'hover:translate-y-[-2px] hover:shadow-hard-sm active:translate-y-px',
                    isDarkMode
                      ? 'bg-neo-cyan text-neo-black hover:bg-neo-cyan/90'
                      : 'bg-neo-purple text-neo-white hover:bg-neo-purple/90'
                  )}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </m.div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-t-2 border-neo-black',
          isDarkMode ? 'bg-neo-navy-light/70' : 'bg-slate-100/70'
        )}>
          <button
            onClick={goToPrevious}
            aria-label={t('common.previous')}
            className={cn(
              'p-2 rounded-lg border-2 border-neo-black transition-all',
              'hover:translate-y-[-2px] hover:shadow-hard-sm active:translate-y-px',
              isDarkMode ? 'bg-neo-navy-elevated hover:bg-slate-600' : 'bg-white hover:bg-slate-50'
            )}
          >
            <ChevronLeft className={cn(
              'w-5 h-5 rtl:rotate-180',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )} />
          </button>

          {/* Progress dots with fixed width container */}
          <div className="flex items-center justify-center gap-2 w-[100px]">
            {TIPS.map((tip, index) => (
              <button
                key={tip.id}
                onClick={() => goToIndex(index)}
                aria-label={`Go to tip ${index + 1}`}
                className={cn(
                  'relative shrink-0 rounded-full border-2 border-neo-black transition-all duration-300',
                  index === activeIndex
                    ? cn(
                        'w-6 h-3',
                        isDarkMode ? 'bg-neo-lime' : 'bg-neo-purple'
                      )
                    : cn(
                        'w-3 h-3 hover:opacity-80',
                        isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                      )
                )}
              />
            ))}
          </div>

          <button
            onClick={goToNext}
            aria-label={t('common.next')}
            className={cn(
              'p-2 rounded-lg border-2 border-neo-black transition-all',
              'hover:translate-y-[-2px] hover:shadow-hard-sm active:translate-y-px',
              isDarkMode ? 'bg-neo-navy-elevated hover:bg-slate-600' : 'bg-white hover:bg-slate-50'
            )}
          >
            <ChevronRight className={cn(
              'w-5 h-5 rtl:rotate-180',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-300 dark:bg-neo-navy-elevated">
          <m.div
            key={`progress-${activeIndex}`}
            initial={{ width: '0%' }}
            animate={{ width: isPaused ? undefined : '100%' }}
            transition={{ duration: AUTO_ROTATE_INTERVAL / 1000, ease: 'linear' }}
            className={cn(
              'h-full',
              isDarkMode ? 'bg-neo-lime' : 'bg-neo-purple'
            )}
          />
        </div>
      </div>
    </div>
  );
}
