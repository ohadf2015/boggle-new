'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/ui/Mascot';
import { ArrowLeft, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';

const ONBOARDING_KEY = 'flashcard-onboarding-complete';

/**
 * Check if user has already seen the flashcard onboarding
 */
export function hasSeenFlashcardOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/**
 * Mark flashcard onboarding as complete
 */
export function markFlashcardOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export interface FlashcardOnboardingProps {
  /** Whether the onboarding overlay is visible */
  isVisible: boolean;
  /** Callback when user dismisses the onboarding */
  onDismiss: () => void;
  /** Custom className */
  className?: string;
}

/**
 * FlashcardOnboarding - First-time gesture tutorial overlay
 *
 * Shows animated swipe instructions for new users learning
 * the flashcard swipe mechanic. Features:
 * - Animated swipe gesture demonstration
 * - Clear left/right meaning labels
 * - Lexi mascot for friendly guidance
 * - RTL support (directions flip for Hebrew)
 */
export const FlashcardOnboarding = memo<FlashcardOnboardingProps>(({
  isVisible,
  onDismiss,
  className,
}) => {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const handleDismiss = () => {
    markFlashcardOnboardingComplete();
    onDismiss();
  };

  return (
    <AdaptiveAnimatePresence>
      {isVisible && (
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          className={cn(
            'fixed inset-0 z-[100]',
            'bg-neo-black/85 backdrop-blur-xs',
            'flex items-center justify-center',
            'p-4',
            className
          )}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <AdaptiveMotion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'max-w-md w-full',
              'bg-neo-navy border-neo border-neo-black rounded-neo',
              'shadow-hard-lg',
              'overflow-hidden'
            )}
          >
            {/* Gradient accent */}
            <div className="h-1.5 bg-linear-to-r from-neo-pink via-neo-cyan to-neo-yellow" />

            <div className="p-6 text-center">
              {/* Mascot */}
              <div className="flex justify-center mb-4">
                <Mascot variant="thinking" size="md" animated />
              </div>

              {/* Title */}
              <h2
                id="onboarding-title"
                className="text-2xl font-neo-display text-neo-white mb-2"
              >
                {t('education.practice.swipeHint')}
              </h2>

              {/* Explanation */}
              <p className="text-neo-white font-neo-body mb-6">
                {t('education.practice.swipeExplain') ||
                  "Swipe right for 'Got It', left for 'Don't Know'"}
              </p>

              {/* Swipe direction indicators */}
              <div className="flex items-center justify-center gap-8 mb-6">
                {/* Left indicator (Don't Know) */}
                <AdaptiveMotion.div
                  data-testid="swipe-left-indicator"
                  className="flex flex-col items-center gap-2"
                  animate={{ x: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                >
                  <div className="w-14 h-14 rounded-full bg-neo-pink/20 border-neo border-neo-pink flex items-center justify-center">
                    {isRTL ? (
                      <ArrowRight className="w-7 h-7 text-neo-pink" />
                    ) : (
                      <ArrowLeft className="w-7 h-7 text-neo-pink" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-neo-pink">
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm font-neo-body">
                      {t('education.practice.dontKnow')}
                    </span>
                  </div>
                </AdaptiveMotion.div>

                {/* Animated hand showing swipe gesture */}
                <AdaptiveMotion.div
                  className="relative"
                  animate={{ x: [-30, 30, -30] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <div className="w-16 h-16 rounded-neo bg-neo-white/10 flex items-center justify-center">
                    <span className="text-4xl">👆</span>
                  </div>
                </AdaptiveMotion.div>

                {/* Right indicator (Got It) */}
                <AdaptiveMotion.div
                  data-testid="swipe-right-indicator"
                  className="flex flex-col items-center gap-2"
                  animate={{ x: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                >
                  <div className="w-14 h-14 rounded-full bg-neo-cyan/20 border-neo border-neo-cyan flex items-center justify-center">
                    {isRTL ? (
                      <ArrowLeft className="w-7 h-7 text-neo-cyan" />
                    ) : (
                      <ArrowRight className="w-7 h-7 text-neo-cyan" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-neo-cyan">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-neo-body">
                      {t('education.practice.gotIt')}
                    </span>
                  </div>
                </AdaptiveMotion.div>
              </div>

              {/* Dismiss button */}
              <Button
                onClick={handleDismiss}
                size="lg"
                className={cn(
                  'font-neo-display text-lg',
                  'bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black',
                  'shadow-hard hover:shadow-hard-lg',
                  'border-neo border-neo-black',
                  'w-full sm:w-auto px-8'
                )}
              >
                {t('common.gotIt')}
              </Button>
            </div>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

FlashcardOnboarding.displayName = 'FlashcardOnboarding';

export default FlashcardOnboarding;
