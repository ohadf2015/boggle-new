'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ScientificTip {
  id: string;
  icon: string;
  sourceUrl?: string;
}

const TIPS: ScientificTip[] = [
  { id: 'tip1', icon: '🧠' },
  { id: 'tip2', icon: '⚡' },
  { id: 'tip3', icon: '💎' },
  { id: 'tip4', icon: '🎯' },
  { id: 'tip5', icon: '🔄' },
];

/**
 * Scientific Tips Carousel
 * Auto-rotating carousel of brain training facts with scientific backing.
 */
export default function ScientificTipsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { theme } = useTheme();
  const { t, dir } = useLanguage();
  const isDarkMode = theme === 'dark';
  const isRTL = dir === 'rtl';

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TIPS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const goToPrevious = () => {
    setActiveIndex((prev) => (prev - 1 + TIPS.length) % TIPS.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % TIPS.length);
  };

  const activeTip = TIPS[activeIndex];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className={cn(
          'w-5 h-5',
          isDarkMode ? 'text-neo-yellow' : 'text-neo-orange'
        )} />
        <h2 className={cn(
          'text-lg font-bold uppercase tracking-wide',
          isDarkMode ? 'text-neo-white' : 'text-neo-black'
        )}>
          {t('brain.scientificTips')}
        </h2>
      </div>

      <div
        className={cn(
          'relative rounded-neo border-3 border-neo-black shadow-hard overflow-hidden',
          isDarkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-neo-cream to-white'
        )}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Tip Content */}
        <div className="p-5 min-h-[140px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{activeTip.icon}</span>
                <div className="flex-1">
                  <p className={cn(
                    'text-sm font-medium leading-relaxed',
                    isDarkMode ? 'text-neo-white' : 'text-neo-black'
                  )}>
                    {t(`brain.tips.${activeTip.id}`)}
                  </p>
                </div>
              </div>

              {activeTip.sourceUrl && (
                <a
                  href={activeTip.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium',
                    isDarkMode ? 'text-neo-cyan hover:text-neo-cyan/80' : 'text-neo-purple hover:text-neo-purple/80'
                  )}
                >
                  {t('brain.learnMore')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className={cn(
          'flex items-center justify-between px-4 py-3 border-t-2 border-neo-black',
          isDarkMode ? 'bg-slate-800/50' : 'bg-neo-cream/50'
        )}>
          <button
            onClick={isRTL ? goToNext : goToPrevious}
            className={cn(
              'p-1.5 rounded-lg border-2 border-neo-black transition-all',
              'hover:translate-y-[-1px] hover:shadow-hard-sm active:translate-y-[1px]',
              isDarkMode ? 'bg-slate-700' : 'bg-white'
            )}
          >
            <ChevronLeft className={cn(
              'w-4 h-4',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )} />
          </button>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {TIPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to tip ${index + 1}`}
                className={cn(
                  'w-1.5 h-1.5 rounded-full border border-neo-black transition-all duration-300',
                  index === activeIndex
                    ? cn(
                        'scale-150 shadow-[1px_1px_0px_rgb(0,0,0)]',
                        isDarkMode ? 'bg-neo-yellow' : 'bg-neo-purple'
                      )
                    : cn(
                        'hover:scale-125',
                        isDarkMode ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-300 hover:bg-gray-400'
                      )
                )}
              />
            ))}
          </div>

          <button
            onClick={isRTL ? goToPrevious : goToNext}
            className={cn(
              'p-1.5 rounded-lg border-2 border-neo-black transition-all',
              'hover:translate-y-[-1px] hover:shadow-hard-sm active:translate-y-[1px]',
              isDarkMode ? 'bg-slate-700' : 'bg-white'
            )}
          >
            <ChevronRight className={cn(
              'w-4 h-4',
              isDarkMode ? 'text-neo-white' : 'text-neo-black'
            )} />
          </button>
        </div>
      </div>
    </div>
  );
}
