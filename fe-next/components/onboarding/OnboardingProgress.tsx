'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

/**
 * OnboardingProgress - Dot pagination indicator
 * Shows current progress through onboarding steps
 */
const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="tablist">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isActive = i === currentStep;
        const isPast = i < currentStep;

        return (
          <m.button
            key={`step-${i}`}
            className="p-2 touch-target"
            aria-label={`Step ${i + 1} of ${totalSteps}`}
            aria-current={isActive ? 'step' : undefined}
            role="tab"
            tabIndex={-1} // Prevent keyboard navigation to dots
            disabled
          >
            <m.div
              className={cn(
                'rounded-full border-2 transition-all',
                isActive && 'bg-neo-pink border-neo-black scale-125 shadow-hard-sm',
                isPast && 'bg-neo-cyan border-neo-black',
                !isActive && !isPast && 'bg-neo-cream border-neo-black/30'
              )}
              initial={{ scale: 1 }}
              animate={{
                scale: isActive ? 1.25 : 1,
                width: isActive ? '12px' : '10px',
                height: isActive ? '12px' : '10px',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                width: isActive ? '12px' : '10px',
                height: isActive ? '12px' : '10px',
              }}
            />
          </m.button>
        );
      })}
    </div>
  );
};

export default OnboardingProgress;
