'use client';

import React from 'react';
import { STEP_LABELS, DIALOG_STEPS, type DialogStep } from '../types';

interface StepIndicatorProps {
  currentStep: DialogStep;
  onStepClick: (step: DialogStep) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700">
      {DIALOG_STEPS.map((step) => {
        const isActive = currentStep === step;
        const isPast =
          (step === 'fields' && currentStep !== 'fields') ||
          (step === 'feedback' && currentStep === 'preview');

        return (
          <button
            key={step}
            onClick={() => {
              if (isPast) onStepClick(step);
            }}
            disabled={!isPast && !isActive}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'text-neo-cyan border-b-2 border-neo-cyan'
                : isPast
                  ? 'text-slate-600 dark:text-slate-400 hover:text-neo-cyan cursor-pointer'
                  : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {STEP_LABELS[step]}
          </button>
        );
      })}
    </div>
  );
}
