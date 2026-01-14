'use client';

import React, { useMemo } from 'react';
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

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialTooltipProps {
  step: TutorialStep;
  targetRect: TargetRect | null;
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
 * TutorialTooltip - Displays tutorial step information
 * Positioned relative to the target element with neo-brutalist styling
 */
const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  step,
  targetRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) => {
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  // Get the icon component
  const IconComponent = step.icon ? iconMap[step.icon] : null;

  // Calculate tooltip position
  const tooltipStyle = useMemo(() => {
    if (!targetRect || step.position === 'center') {
      // Center on screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 320; // Approximate width
    const tooltipHeight = 200; // Approximate height

    switch (step.position) {
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          top: targetRect.top + targetRect.height + padding,
          left: Math.max(
            padding,
            Math.min(
              window.innerWidth - tooltipWidth - padding,
              targetRect.left + targetRect.width / 2 - tooltipWidth / 2
            )
          ),
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left + targetRect.width + padding,
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  }, [targetRect, step.position]);

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  return (
    <motion.div
      data-tutorial-tooltip
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      className="fixed z-100 w-[320px] max-w-[90vw] pointer-events-auto"
      style={{ ...tooltipStyle, willChange: 'transform, opacity' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Main tooltip card */}
      <div className="bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-lg">
        {/* Header with icon and skip button */}
        <div className="bg-neo-lime border-b-3 border-neo-black px-4 py-3 flex items-center justify-between text-neo-black overflow-visible">
          <div className="flex items-center gap-2">
            {IconComponent && (
              <div className="w-8 h-8 bg-neo-white border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm">
                <IconComponent className="w-4 h-4 text-neo-black" />
              </div>
            )}
            <span className="font-black text-sm text-neo-black uppercase tracking-wide">
              {t('tutorial.stepLabel', { current: currentIndex + 1, total: totalSteps })}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip();
            }}
            className="w-8 h-8 bg-neo-white border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm hover:bg-neo-pink transition-colors overflow-visible"
            aria-label={t('tutorial.skip')}
          >
            <X className="w-5 h-5 text-neo-black" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3 overflow-hidden">
          <h3 className="font-black text-lg text-neo-black">
            {t(step.titleKey)}
          </h3>
          <p className="text-sm text-neo-black/80 leading-relaxed">
            {t(step.descriptionKey)}
          </p>
        </div>

        {/* Navigation buttons */}
        <div className="px-4 py-3 bg-neo-white/50 border-t-2 border-neo-black/20 flex items-center justify-between overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            disabled={isFirstStep}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-neo border-2 border-neo-black font-bold text-sm transition-all',
              isFirstStep
                ? 'bg-neo-black/10 text-neo-black/40 cursor-not-allowed'
                : 'bg-neo-white shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed'
            )}
            aria-label={t('tutorial.prev')}
          >
            {isRtl ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{t('tutorial.prev')}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className={cn(
              'flex items-center gap-1 px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-sm transition-all shadow-hard-sm hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed',
              isLastStep ? 'bg-neo-lime' : 'bg-neo-cyan'
            )}
          >
            <span>{isLastStep ? t('tutorial.finish') : t('tutorial.next')}</span>
            {!isLastStep &&
              (isRtl ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}
          </button>
        </div>
      </div>

      {/* Tap hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-neo-white/70 mt-2"
      >
        {t('tutorial.tapToContinue')}
      </motion.p>
    </motion.div>
  );
};

export default TutorialTooltip;
