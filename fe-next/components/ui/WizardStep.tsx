/**
 * WizardStep Component
 *
 * Multi-step wizard component with progress indicators and navigation
 * Used for guided flows like game creation, onboarding, etc.
 *
 * Features:
 * - Visual progress indicator (dots)
 * - Step counter (Step X of Y)
 * - Optional navigation buttons (Back/Next/Finish)
 * - Customizable labels and loading states
 * - RTL support
 */

'use client';

import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';

export interface WizardStepProps {
  /** Current step number (1-indexed) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step title */
  title?: string;
  /** Step description */
  description?: string;
  /** Step content */
  children: ReactNode;
  /** Handler for next button */
  onNext?: () => void;
  /** Handler for back button */
  onBack?: () => void;
  /** Custom label for next button */
  nextLabel?: string;
  /** Custom label for back button */
  backLabel?: string;
  /** Disable next button */
  nextDisabled?: boolean;
  /** Show loading state on next button */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function WizardStep({
  currentStep,
  totalSteps,
  title,
  description,
  children,
  onNext,
  onBack,
  nextLabel,
  backLabel,
  nextDisabled = false,
  isLoading = false,
  className,
}: WizardStepProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const isLastStep = currentStep === totalSteps;

  // Default labels
  const defaultNextLabel = isLastStep ? t('common.finish') : t('common.next');
  const defaultBackLabel = t('common.back');

  // Show navigation if either handler is provided
  const showNavigation = onNext || onBack;

  return (
    <div className={cn('space-y-6', isRTL && 'rtl', className)}>
      {/* Progress Indicator */}
      <div className="space-y-3">
        {/* Step Counter */}
        <div className="text-center">
          <span className="text-sm font-neo-body text-neo-white">
            {t('common.step')} {currentStep} {t('common.of')} {totalSteps}
          </span>
        </div>

        {/* Step Dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber <= currentStep;

            return (
              <div
                key={stepNumber}
                data-testid={`step-dot-${stepNumber}`}
                className={cn(
                  'w-3 h-3 rounded-full border-2 border-neo-black transition-all',
                  isCompleted ? 'bg-neo-cyan shadow-hard-sm' : 'bg-neo-navy/50'
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Content Card */}
      <div className="p-6 rounded-neo border-neo border-neo-black bg-neo-navy/80 shadow-hard">
        {/* Title */}
        {title && (
          <h2 className="text-2xl font-neo-display text-neo-white mb-3">
            {title}
          </h2>
        )}

        {/* Description */}
        {description && (
          <p className="text-neo-white font-neo-body mb-6">{description}</p>
        )}

        {/* Step Content */}
        <div>{children}</div>
      </div>

      {/* Navigation Buttons */}
      {showNavigation && (
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          {onBack ? (
            <Button
              onClick={onBack}
              variant="outline"
              disabled={isLoading}
              className={cn(
                'border-neo border-neo-black shadow-hard-sm',
                'bg-neo-navy/50 text-neo-white hover:bg-neo-navy',
                'transition-all'
              )}
            >
              <DirectionalIcon
                icon={ArrowLeft}
                className="w-4 h-4 me-2"
              />
              {backLabel || defaultBackLabel}
            </Button>
          ) : (
            <div /> // Spacer
          )}

          {/* Next/Finish Button */}
          {onNext && (
            <Button
              onClick={onNext}
              disabled={nextDisabled || isLoading}
              className={cn(
                'px-8 py-3 font-bold',
                'bg-neo-lime text-neo-black',
                'border-neo border-neo-black rounded-neo shadow-hard',
                'hover:shadow-hard-lg hover:translate-y-[-2px]',
                'active:shadow-hard-pressed active:translate-y-0',
                'transition-all duration-150',
                'disabled:opacity-70 disabled:cursor-not-allowed',
                'disabled:hover:translate-y-0',
                isLoading && 'opacity-50'
              )}
            >
              {isLoading && <span className="animate-spin me-2">⏳</span>}
              {nextLabel || defaultNextLabel}
              {!isLoading && !isLastStep && (
                <ArrowRight
                  className={cn(
                    'w-4 h-4',
                    'ms-2 rtl:rotate-180'
                  )}
                />
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
