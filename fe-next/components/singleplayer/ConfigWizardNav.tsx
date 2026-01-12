'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WizardStep = 1 | 2 | 3;

interface StepInfo {
  number: WizardStep;
  labelKey: string;
  icon?: React.ReactNode;
}

// Simplified to 3 steps: Mode → Settings → Start
const STEPS: StepInfo[] = [
  { number: 1, labelKey: 'wizard.stepMode' },
  { number: 2, labelKey: 'wizard.stepSettings' },
  { number: 3, labelKey: 'wizard.stepStart' },
];

interface ConfigWizardNavProps {
  currentStep: WizardStep;
  onStepChange: (step: WizardStep) => void;
  canAdvance: boolean;
  onStart?: () => void;
  t: (key: string) => string;
  className?: string;
}

export const ConfigWizardNav: React.FC<ConfigWizardNavProps> = ({
  currentStep,
  onStepChange,
  canAdvance,
  onStart,
  t,
  className,
}) => {
  const handleBack = () => {
    if (currentStep > 1) {
      onStepChange((currentStep - 1) as WizardStep);
    }
  };

  const handleNext = () => {
    if (currentStep < 3 && canAdvance) {
      onStepChange((currentStep + 1) as WizardStep);
    } else if (currentStep === 3 && onStart) {
      onStart();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isUpcoming = step.number > currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Step Dot */}
              <motion.button
                type="button"
                onClick={() => step.number < currentStep && onStepChange(step.number)}
                disabled={step.number > currentStep}
                className={cn(
                  "relative flex items-center justify-center rounded-full transition-all",
                  "w-8 h-8 sm:w-10 sm:h-10",
                  "border-3 font-black text-sm",
                  isActive && "bg-neo-lime border-neo-black shadow-hard-sm scale-110 text-neo-black",
                  isCompleted && "bg-neo-lime border-neo-black cursor-pointer hover:scale-105 text-neo-black",
                  isUpcoming && "bg-slate-200 dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-400 dark:text-slate-400 cursor-not-allowed"
                )}
                whileTap={step.number < currentStep ? { scale: 0.95 } : undefined}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  step.number
                )}
              </motion.button>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-1 w-6 sm:w-10 rounded-full transition-colors",
                    step.number < currentStep ? "bg-neo-lime" : "bg-slate-200 dark:bg-slate-600"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Labels (desktop only) */}
      <div className="hidden sm:flex items-center justify-between px-2">
        {STEPS.map((step) => {
          const isActive = step.number === currentStep;
          return (
            <span
              key={step.number}
              className={cn(
                "text-[10px] font-bold uppercase tracking-wide transition-colors",
                isActive ? "text-neo-black dark:text-neo-white" : "text-slate-400 dark:text-slate-500"
              )}
            >
              {t(step.labelKey) || `Step ${step.number}`}
            </span>
          );
        })}
      </div>

      {/* Current Step Label (mobile) */}
      <div className="sm:hidden text-center">
        <span className="text-xs font-bold uppercase text-neo-black/70 dark:text-neo-white/70">
          {t('wizard.stepOf')?.replace('{current}', String(currentStep)).replace('{total}', '3') || `Step ${currentStep} of 3`}
        </span>
      </div>
    </div>
  );
};

interface WizardNavigationButtonsProps {
  currentStep: WizardStep;
  canAdvance: boolean;
  onBack: () => void;
  onNext: () => void;
  onStart: () => void;
  t: (key: string) => string;
  className?: string;
}

export const WizardNavigationButtons: React.FC<WizardNavigationButtonsProps> = ({
  currentStep,
  canAdvance,
  onBack,
  onNext,
  onStart,
  t,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-3 pt-4 border-t-2 border-neo-black/10 dark:border-slate-600", className)}>
      {/* Back Button - always reserve space to prevent layout shift */}
      <div className="flex-1 sm:flex-initial">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto min-h-[48px] gap-2"
          >
            <ArrowLeft className="rtl:rotate-180" />
            <span className="hidden sm:inline">{t('common.back') || 'Back'}</span>
          </Button>
        ) : (
          <div className="sm:hidden" />
        )}
      </div>

      {/* Next/Start Button */}
      {currentStep < 3 ? (
        <Button
          type="button"
          variant="default"
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            "flex-1 min-h-[48px] gap-2 font-bold",
            "bg-neo-lime hover:bg-neo-lime/90 text-neo-black border-3 border-neo-black",
            !canAdvance && "opacity-50 cursor-not-allowed"
          )}
        >
          <span>{t('common.next') || 'Next'}</span>
          <ArrowRight className="rtl:rotate-180" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="success"
          onClick={onStart}
          className="flex-1 min-h-[56px] gap-2 font-black text-lg shadow-hard hover:shadow-hard-lg"
        >
          <Play />
          <span>{t('singlePlayer.startGame') || 'Start Game'}</span>
        </Button>
      )}
    </div>
  );
};

export default ConfigWizardNav;
