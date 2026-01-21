'use client';

import { useState, useCallback, useEffect } from 'react';
import { getSession } from '@/lib/supabase';
import type {
  RegenerableField,
  DailyBuzzDataAdmin,
  RegenerationDialogProps,
} from '../../types';
import type { DialogStep } from '../types';
import { REGENERATE_TIMEOUT_MS, MIN_FEEDBACK_LENGTH } from '../constants';

interface UseRegenerationWizardOptions {
  open: boolean;
  challengeIndex: number | null;
  challengeData: DailyBuzzDataAdmin | null;
  onOpenChange: (open: boolean) => void;
  onRegenerateSuccess: RegenerationDialogProps['onRegenerateSuccess'];
  promptPreview: string;
  customPrompt: string;
  isEditingPrompt: boolean;
  loadPromptPreview: () => Promise<void>;
  resetPreview: () => void;
}

interface UseRegenerationWizardReturn {
  // Step management
  currentStep: DialogStep;
  setCurrentStep: (step: DialogStep) => void;
  goToStep: (step: DialogStep) => Promise<void>;
  canGoNext: () => boolean;

  // Field selection
  selectedFields: RegenerableField[];
  handleFieldToggle: (field: RegenerableField) => void;

  // Feedback
  feedback: string;
  setFeedback: (value: string) => void;

  // Regeneration
  isRegenerating: boolean;
  regenerateError: string | null;
  handleRegenerate: () => Promise<void>;
}

export function useRegenerationWizard({
  open,
  challengeIndex,
  challengeData,
  onOpenChange,
  onRegenerateSuccess,
  promptPreview,
  customPrompt,
  isEditingPrompt,
  loadPromptPreview,
  resetPreview,
}: UseRegenerationWizardOptions): UseRegenerationWizardReturn {
  // Step management
  const [currentStep, setCurrentStep] = useState<DialogStep>('fields');

  // Field selection
  const [selectedFields, setSelectedFields] = useState<RegenerableField[]>(['all']);

  // Feedback
  const [feedback, setFeedback] = useState('');

  // Regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('fields');
      setSelectedFields(['all']);
      setFeedback('');
      setRegenerateError(null);
      resetPreview();
    }
  }, [open, resetPreview]);

  // Field toggle handler
  const handleFieldToggle = useCallback((field: RegenerableField) => {
    if (field === 'all') {
      setSelectedFields(['all']);
    } else {
      setSelectedFields((prev) => {
        const withoutAll = prev.filter((f) => f !== 'all');
        if (withoutAll.includes(field)) {
          const newFields = withoutAll.filter((f) => f !== field);
          return newFields.length === 0 ? ['all'] : newFields;
        } else {
          return [...withoutAll, field];
        }
      });
    }
  }, []);

  // Step navigation
  const goToStep = useCallback(
    async (step: DialogStep) => {
      if (step === 'preview') {
        await loadPromptPreview();
      }
      setCurrentStep(step);
    },
    [loadPromptPreview]
  );

  // Check if can proceed to next step
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'fields':
        return selectedFields.length > 0;
      case 'feedback':
        return feedback.trim().length >= MIN_FEEDBACK_LENGTH;
      case 'preview':
        return true; // Preview step just needs to not be loading
      default:
        return false;
    }
  }, [currentStep, selectedFields.length, feedback]);

  // Handle regeneration
  const handleRegenerate = useCallback(async () => {
    if (challengeIndex === null || !challengeData || !feedback.trim()) return;

    setIsRegenerating(true);
    setRegenerateError(null);

    try {
      const {
        data: { session },
      } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const currentChallenge = challengeData.challenges[challengeIndex];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REGENERATE_TIMEOUT_MS);

      const requestBody: Record<string, unknown> = {
        date: challengeData.puzzle_date,
        language: challengeData.language,
        challengeIndex: challengeIndex,
        feedback: feedback.trim(),
        originalChallenge: {
          type: currentChallenge.type,
          prompt: currentChallenge.prompt,
          answer: currentChallenge.answer,
          trend_topic: currentChallenge.trend_topic,
        },
        saveFeedback: true,
        fieldsToRegenerate: selectedFields,
      };

      // Add custom prompt if user edited it
      if (isEditingPrompt && customPrompt !== promptPreview) {
        requestBody.customPromptOverride = customPrompt;
      }

      const response = await fetch('/api/admin/buzz/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      const data = await response.json();
      onOpenChange(false);

      // Build success message
      const isPartial = !selectedFields.includes('all');
      const fieldsList = selectedFields.join(', ');
      const message = isPartial
        ? `${fieldsList} regenerated successfully! Your feedback has been saved.`
        : 'Challenge regenerated successfully! Your feedback has been saved for AI improvement.';

      onRegenerateSuccess(data.data, message);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setRegenerateError(
          'Request timed out after 80 seconds. The AI model may be overloaded. Please try again in a few minutes.'
        );
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to regenerate';
        setRegenerateError(errorMsg);
      }
    } finally {
      setIsRegenerating(false);
    }
  }, [
    challengeIndex,
    challengeData,
    feedback,
    selectedFields,
    isEditingPrompt,
    customPrompt,
    promptPreview,
    onOpenChange,
    onRegenerateSuccess,
  ]);

  return {
    // Step management
    currentStep,
    setCurrentStep,
    goToStep,
    canGoNext,

    // Field selection
    selectedFields,
    handleFieldToggle,

    // Feedback
    feedback,
    setFeedback,

    // Regeneration
    isRegenerating,
    regenerateError,
    handleRegenerate,
  };
}
