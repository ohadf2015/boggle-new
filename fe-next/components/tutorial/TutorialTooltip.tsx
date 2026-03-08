'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Grid3X3,
  Move,
  Flame,
  Clock,
  Trophy,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TutorialStep } from './tutorialSteps';
import { cn } from '@/lib/utils';

interface TutorialTooltipProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Grid3X3,
  Move,
  Flame,
  Clock,
  Trophy,
  Zap,
};

/**
 * TutorialTooltip - Compact toast-style tutorial banner
 * Fixed at the bottom of the screen, doesn't cover the game grid
 */
const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) => {
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const IconComponent = step.icon ? iconMap[step.icon] : null;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  return (
    <motion.div
      data-tutorial-tooltip
      initial={{ y: 60, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed bottom-16 left-4 right-4 z-[10000] max-w-[400px] mx-auto pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-neo-navy border-3 border-neo-black rounded-neo overflow-hidden"
        style={{
          boxShadow: isRtl
            ? '-4px 4px 0px #000'
            : '4px 4px 0px #000',
        }}
      >
        {/* Header row: icon + step counter + skip */}
        <div className="bg-neo-lime border-b-3 border-neo-black px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div className="w-7 h-7 bg-neo-white border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm">
                <IconComponent className="w-3.5 h-3.5 text-neo-black" />
              </div>
            )}
            <span className="font-black text-xs text-neo-black uppercase tracking-wide">
              {t('tutorial.stepLabel', { current: currentIndex + 1, total: totalSteps })}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="w-7 h-7 bg-neo-white border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm hover:bg-neo-pink transition-colors"
            aria-label={t('tutorial.skip')}
          >
            <X className="w-4 h-4 text-neo-black" />
          </button>
        </div>

        {/* Content: title + description */}
        <div className="px-3 py-2.5">
          <h3 className="font-black text-sm text-neo-white leading-tight">
            {t(step.titleKey)}
          </h3>
          <p className="text-xs text-neo-white/70 leading-snug mt-0.5">
            {t(step.descriptionKey)}
          </p>
        </div>

        {/* Navigation row */}
        <div className="px-3 py-2 border-t-2 border-neo-white/10 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={isFirstStep}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-neo border-2 border-neo-black font-bold text-xs transition-all',
              isFirstStep
                ? 'bg-neo-white/10 text-neo-white/30 cursor-not-allowed'
                : 'bg-neo-white shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed text-neo-black'
            )}
            aria-label={t('tutorial.prev')}
          >
            {isRtl ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{t('tutorial.prev')}</span>
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  index === currentIndex
                    ? 'bg-neo-lime scale-125'
                    : index < currentIndex
                    ? 'bg-neo-white/50'
                    : 'bg-neo-white/20'
                )}
              />
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-neo border-2 border-neo-black font-bold text-xs transition-all shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed',
              isLastStep ? 'bg-neo-lime text-neo-black' : 'bg-neo-cyan text-neo-black'
            )}
          >
            <span>{isLastStep ? t('tutorial.finish') : t('tutorial.next')}</span>
            {!isLastStep &&
              (isRtl ? (
                <ChevronLeft className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              ))}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TutorialTooltip;
