'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTutorial } from './useTutorial';
import TutorialTooltip from './TutorialTooltip';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * TutorialOverlay - Non-intrusive tutorial banner
 * Renders a compact toast at the bottom of the screen without covering the grid.
 * Supports swipe gestures and keyboard navigation.
 */
const TutorialOverlay: React.FC = () => {
  const { isActive, currentStep, nextStep, prevStep, skipTutorial, currentStepIndex, totalSteps } =
    useTutorial();
  const { dir } = useLanguage();
  const isRtl = dir === 'rtl';

  // Touch/swipe gesture handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        const isSwipeLeft = deltaX < 0;
        if (isRtl) {
          isSwipeLeft ? prevStep() : nextStep();
        } else {
          isSwipeLeft ? nextStep() : prevStep();
        }
      }

      touchStartRef.current = null;
    },
    [nextStep, prevStep, isRtl]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          skipTutorial();
          break;
        case 'ArrowRight':
        case 'Enter':
        case ' ':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isActive, nextStep, prevStep, skipTutorial, handleTouchStart, handleTouchEnd]);

  if (!isActive || !currentStep) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <TutorialTooltip
        key={currentStep.id}
        step={currentStep}
        currentIndex={currentStepIndex}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTutorial}
      />
    </AnimatePresence>
  );
};

export default TutorialOverlay;
