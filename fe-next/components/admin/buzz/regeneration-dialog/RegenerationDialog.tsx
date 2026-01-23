'use client';

import React from 'react';
import { RefreshCw, MessageSquare, Eye } from 'lucide-react';
import { NeoLoader } from '@/components/ui/NeoLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

// Types from parent
import type { RegenerationDialogProps } from '../types';

// Hooks
import { useRegenerationWizard } from './hooks';

// Components
import {
  StepIndicator,
  FieldSelectionStep,
  FeedbackStep,
  PreviewStep,
} from './components';

export default function RegenerationDialog({
  open,
  onOpenChange,
  challengeIndex,
  challengeData,
  onRegenerateSuccess,
}: RegenerationDialogProps): React.ReactElement {
  // Get current challenge
  const currentChallenge =
    challengeIndex !== null && challengeData
      ? challengeData.challenges[challengeIndex]
      : null;

  // Single consolidated wizard hook (no more double hook call)
  const wizard = useRegenerationWizard({
    open,
    challengeIndex,
    challengeData,
    onOpenChange,
    onRegenerateSuccess,
  });

  // Render step content
  function renderStepContent(): React.ReactElement {
    switch (wizard.currentStep) {
      case 'fields':
        return (
          <FieldSelectionStep
            currentChallenge={currentChallenge}
            selectedFields={wizard.selectedFields}
            onFieldToggle={wizard.handleFieldToggle}
          />
        );

      case 'feedback':
        return (
          <FeedbackStep
            selectedFields={wizard.selectedFields}
            feedback={wizard.feedback}
            onFeedbackChange={wizard.setFeedback}
            isRegenerating={wizard.isRegenerating}
          />
        );

      case 'preview':
        return (
          <PreviewStep
            promptPreview={wizard.promptPreview}
            customPrompt={wizard.customPrompt}
            onCustomPromptChange={wizard.setCustomPrompt}
            isEditingPrompt={wizard.isEditingPrompt}
            onToggleEdit={() => wizard.setIsEditingPrompt(!wizard.isEditingPrompt)}
            doNotDoExamples={wizard.doNotDoExamples}
            loadingPreview={wizard.loadingPreview}
            error={wizard.regenerateError || wizard.previewError}
          />
        );
    }
  }

  function handleBack(): void {
    if (wizard.currentStep === 'fields') {
      onOpenChange(false);
    } else {
      const prevStep = wizard.currentStep === 'preview' ? 'feedback' : 'fields';
      wizard.setCurrentStep(prevStep);
    }
  }

  function handleNext(): void {
    wizard.goToStep(wizard.currentStep === 'fields' ? 'feedback' : 'preview');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" noDescription>
        <DialogHeader variant="cyan">
          <DialogTitle className="flex items-center justify-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Edit Challenge #{challengeIndex !== null ? challengeIndex + 1 : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <StepIndicator
          currentStep={wizard.currentStep}
          onStepClick={(step) => wizard.goToStep(step)}
        />

        <DialogBody className="min-h-[300px]">{renderStepContent()}</DialogBody>

        <DialogFooter>
          {/* Back/Cancel button */}
          <button
            onClick={handleBack}
            disabled={wizard.isRegenerating}
            className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
          >
            {wizard.currentStep === 'fields' ? 'Cancel' : 'Back'}
          </button>

          {/* Next/Regenerate button */}
          {wizard.currentStep !== 'preview' ? (
            <button
              onClick={handleNext}
              disabled={!wizard.canGoNext()}
              className="px-4 py-2 rounded-lg bg-neo-cyan text-neo-black font-bold border-2 border-neo-black shadow-hard-sm hover:shadow-hard disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {wizard.currentStep === 'feedback' && <Eye className="w-4 h-4" />}
              {wizard.currentStep === 'fields' ? 'Next' : 'Preview Prompt'}
            </button>
          ) : (
            <button
              onClick={wizard.handleRegenerate}
              disabled={wizard.isRegenerating || wizard.loadingPreview}
              className="px-4 py-2 rounded-lg bg-neo-cyan text-neo-black font-bold border-2 border-neo-black shadow-hard-sm hover:shadow-hard disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {wizard.isRegenerating ? (
                <>
                  <NeoLoader variant="dots" size="sm" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </>
              )}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
