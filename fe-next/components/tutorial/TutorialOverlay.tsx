'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial } from './useTutorial';
import TutorialTooltip from './TutorialTooltip';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * TutorialOverlay - Full-screen overlay with spotlight effect
 * Highlights the current tutorial target and displays the tooltip
 */
const TutorialOverlay: React.FC = () => {
  const { isActive, currentStep, nextStep, prevStep, skipTutorial, currentStepIndex, totalSteps } =
    useTutorial();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Extract target for dependency tracking
  const currentTarget = currentStep?.target;

  // Find and measure the target element
  const updateTargetRect = useCallback(() => {
    if (!currentTarget) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(currentTarget);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Add some padding around the spotlight
      const padding = 8;
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    } else {
      // Element not found, center the tooltip
      setTargetRect(null);
    }
  }, [currentTarget]);

  // Update target rect on step change and window resize
  useEffect((): void | (() => void) => {
    if (isActive && currentStep) {
      // Delay to allow for step transition animation
      const delay = currentStep.delay || 100;
      const timer = setTimeout(() => {
        updateTargetRect();
        setIsVisible(true);
      }, delay);

      const handleResize = () => updateTargetRect();
      const handleScroll = () => updateTargetRect();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    } else {
      setIsVisible(false);
    }
  }, [isActive, currentStep, updateTargetRect]);

  // Handle keyboard navigation
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTutorial]);

  // Handle click on overlay to advance
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't advance if clicking on the tooltip itself
      if ((e.target as HTMLElement).closest('[data-tutorial-tooltip]')) {
        return;
      }
      nextStep();
    },
    [nextStep]
  );

  if (!isActive || !currentStep) {
    return null;
  }

  const showSpotlight = currentStep.spotlight && targetRect;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] cursor-pointer"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="Game tutorial"
        >
          {/* Dark overlay with spotlight cutout */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <mask id="spotlight-mask">
                {/* White background = visible overlay */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black cutout = transparent spotlight area */}
                {showSpotlight && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x={targetRect.left}
                    y={targetRect.top}
                    width={targetRect.width}
                    height={targetRect.height}
                    rx="12"
                    ry="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            {/* Semi-transparent overlay with mask applied */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Spotlight border glow effect */}
          {showSpotlight && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute pointer-events-none"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
              }}
            >
              <div
                className="w-full h-full rounded-neo border-3 border-neo-yellow shadow-hard animate-pulse"
                style={{
                  boxShadow:
                    '0 0 20px rgba(255, 225, 53, 0.5), 0 0 40px rgba(255, 225, 53, 0.3), 4px 4px 0 #000',
                }}
              />
            </motion.div>
          )}

          {/* Tooltip */}
          <TutorialTooltip
            step={currentStep}
            targetRect={targetRect}
            currentIndex={currentStepIndex}
            totalSteps={totalSteps}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTutorial}
          />

          {/* Progress dots */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[10000]">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`w-2 h-2 rounded-full border-2 border-neo-black transition-all ${
                  index === currentStepIndex
                    ? 'bg-neo-yellow scale-125'
                    : index < currentStepIndex
                    ? 'bg-neo-lime'
                    : 'bg-neo-white/50'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TutorialOverlay;
