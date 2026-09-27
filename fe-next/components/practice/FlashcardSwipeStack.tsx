'use client';

import { useState, useCallback, useEffect } from 'react';
import { m } from 'framer-motion';
import { AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useSwipeGesture, SwipeDirection } from '@/hooks/useSwipeGesture';
import { VocabularyCardEnriched } from './VocabularyCardEnriched';
import { SwipeFeedbackOverlay } from './SwipeFeedbackOverlay';
import {
  FlashcardOnboarding,
  hasSeenFlashcardOnboarding,
  markFlashcardOnboardingComplete,
} from './FlashcardOnboarding';
import type { EnrichedVocabularyWord } from '@/types/vocabulary';

interface FlashcardSwipeStackProps {
  /** Array of vocabulary words to review */
  words: EnrichedVocabularyWord[];
  /** Callback when user swipes right (Got It) */
  onGotIt: (word: EnrichedVocabularyWord) => void;
  /** Callback when user swipes left (Don't Know) */
  onDontKnow: (word: EnrichedVocabularyWord) => void;
  /** Callback when all cards reviewed */
  onComplete?: () => void;
  /** Custom className */
  className?: string;
}

/**
 * Swipeable flashcard stack for vocabulary review
 *
 * Displays cards in a stack with the top card being interactive.
 * Swipe right = "Got It" (mastered), swipe left = "Don't Know" (needs review).
 * Includes visual feedback overlays and keyboard shortcuts.
 */
export function FlashcardSwipeStack({
  words,
  onGotIt,
  onDontKnow,
  onComplete,
  className,
}: FlashcardSwipeStackProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  // Onboarding state - show for first-time users
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Only show onboarding if user hasn't seen it and there are words to review
    return words.length > 0 && !hasSeenFlashcardOnboarding();
  });

  const handleDismissOnboarding = useCallback(() => {
    markFlashcardOnboardingComplete();
    setShowOnboarding(false);
  }, []);

  const currentWord = words[currentIndex];
  const hasMoreCards = currentIndex < words.length;

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (!currentWord || isExiting) return;

    setIsExiting(true);
    setExitDirection(direction);

    // Callback based on direction
    if (direction === 'right') {
      onGotIt(currentWord);
    } else {
      onDontKnow(currentWord);
    }

    // Advance to next card after exit animation
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setShowDefinition(false);
      setIsExiting(false);
      setExitDirection(null);
    }, 300);
  }, [currentWord, isExiting, onGotIt, onDontKnow]);

  const SWIPE_THRESHOLD = 150; // Default threshold from useSwipeGesture
  const { x, rotate, opacity, handleDragEnd, handleKeyDown } = useSwipeGesture({
    onSwipe: handleSwipe,
    disabled: isExiting,
    threshold: SWIPE_THRESHOLD,
  });

  // Call onComplete when all cards reviewed
  useEffect(() => {
    if (currentIndex >= words.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, words.length, onComplete]);

  // Keyboard event listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Space to flip card
      if (e.key === ' ' && !showDefinition) {
        e.preventDefault();
        setShowDefinition(true);
        return;
      }
      // Arrow keys to swipe
      if (showDefinition) {
        handleKeyDown(e as any);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKeyDown, showDefinition]);

  // Handle card tap to flip
  const handleCardTap = () => {
    if (!showDefinition) {
      setShowDefinition(true);
    }
  };

  if (!hasMoreCards) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative w-full max-w-md mx-auto',
        'h-[500px]', // Fixed height for stack
        className
      )}
    >
      {/* Onboarding overlay for first-time users */}
      <FlashcardOnboarding
        isVisible={showOnboarding}
        onDismiss={handleDismissOnboarding}
      />

      {/* Stack of cards (show 2 behind current) */}
      <div className="relative h-full">
        {/* Background cards (visual stack effect) */}
        {words.slice(currentIndex + 1, currentIndex + 3).map((word, idx) => (
          <div
            key={word.word + idx}
            className={cn(
              'absolute inset-x-0 top-0 h-full',
              'pointer-events-none'
            )}
            style={{
              transform: `scale(${0.95 - idx * 0.03}) translateY(${(idx + 1) * 8}px)`,
              opacity: 0.7 - idx * 0.2,
              zIndex: -idx - 1,
            }}
          >
            <VocabularyCardEnriched
              word={word}
              className="h-full"
            />
          </div>
        ))}

        {/* Current draggable card */}
        <AdaptiveAnimatePresence mode="wait">
          {currentWord && (
            <m.div
              key={currentWord.word}
              className="absolute inset-x-0 top-0 h-full cursor-grab active:cursor-grabbing"
              drag={showDefinition ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={handleDragEnd}
              onClick={handleCardTap}
              style={{
                x,
                rotate,
                opacity,
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{
                x: exitDirection === 'right' ? 500 : exitDirection === 'left' ? -500 : 0,
                opacity: 0,
                transition: { duration: 0.3 },
              }}
            >
              {/* Swipe feedback overlay */}
              {showDefinition && (
                <SwipeFeedbackOverlay x={x} threshold={SWIPE_THRESHOLD} />
              )}

              {/* Card content */}
              <VocabularyCardEnriched
                word={currentWord}
                className="h-full"
              />

              {/* Tap hint when card is face-down */}
              {!showDefinition && (
                <div className="absolute inset-0 flex items-center justify-center bg-neo-navy/80 rounded-neo">
                  <div className="text-center">
                    <span className="text-neo-white text-3xl font-neo-display block mb-2">
                      {currentWord.word}
                    </span>
                    <span className="text-neo-white text-lg animate-pulse">
                      {t('education.lesson.tapToReveal')}
                    </span>
                  </div>
                </div>
              )}
            </m.div>
          )}
        </AdaptiveAnimatePresence>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 text-center py-2">
        <span className="text-neo-white text-sm">
          {currentIndex + 1} / {words.length}
        </span>
      </div>

      {/* Keyboard hints */}
      {showDefinition && (
        <div className="absolute -bottom-12 left-0 right-0 flex justify-center gap-8 text-neo-white text-xs">
          <span>{isRTL ? '← ' + t('education.lesson.gotIt') : t('education.lesson.dontKnow') + ' ←'}</span>
          <span>{isRTL ? t('education.lesson.dontKnow') + ' →' : '→ ' + t('education.lesson.gotIt')}</span>
        </div>
      )}
    </div>
  );
}
