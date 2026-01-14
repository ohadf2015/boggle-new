'use client';

import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, MessageSquare, Eye, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { getSession } from '@/lib/supabase';
import {
  type RegenerationDialogProps,
  type RegenerableField,
  type PromptExample,
  type PromptPreviewResponse,
  FIELD_LABELS,
} from './types';

const REGENERATE_TIMEOUT_MS = 80_000;

type DialogStep = 'fields' | 'feedback' | 'preview';

export default function RegenerationDialog({
  open,
  onOpenChange,
  challengeIndex,
  challengeData,
  onRegenerateSuccess,
}: RegenerationDialogProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState<DialogStep>('fields');

  // Field selection
  const [selectedFields, setSelectedFields] = useState<RegenerableField[]>(['all']);

  // Feedback
  const [feedback, setFeedback] = useState('');

  // Prompt preview
  const [promptPreview, setPromptPreview] = useState<string>('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [doNotDoExamples, setDoNotDoExamples] = useState<PromptExample[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('fields');
      setSelectedFields(['all']);
      setFeedback('');
      setPromptPreview('');
      setCustomPrompt('');
      setIsEditingPrompt(false);
      setDoNotDoExamples([]);
      setRegenerateError(null);
    }
  }, [open]);

  // Get current challenge
  const currentChallenge = challengeIndex !== null && challengeData
    ? challengeData.challenges[challengeIndex]
    : null;

  // Field selection handlers
  const handleFieldToggle = (field: RegenerableField) => {
    if (field === 'all') {
      setSelectedFields(['all']);
    } else {
      setSelectedFields(prev => {
        const withoutAll = prev.filter(f => f !== 'all');
        if (withoutAll.includes(field)) {
          const newFields = withoutAll.filter(f => f !== field);
          return newFields.length === 0 ? ['all'] : newFields;
        } else {
          return [...withoutAll, field];
        }
      });
    }
  };

  // Load prompt preview
  const loadPromptPreview = useCallback(async () => {
    if (!challengeData || challengeIndex === null) return;

    setLoadingPreview(true);
    try {
      const { data: { session } } = await getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const fieldsParam = selectedFields.join(',');
      const params = new URLSearchParams({
        date: challengeData.puzzle_date,
        language: challengeData.language,
        challengeIndex: challengeIndex.toString(),
        feedback: feedback || 'Needs improvement',
        fields: fieldsParam,
      });

      const response = await fetch(`/api/admin/buzz/prompt-preview?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load prompt preview');
      }

      const data: PromptPreviewResponse = await response.json();
      setPromptPreview(data.data.aiPrompt);
      setCustomPrompt(data.data.aiPrompt);
      setDoNotDoExamples(data.data.availableExamples);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load preview';
      setRegenerateError(errorMsg);
    } finally {
      setLoadingPreview(false);
    }
  }, [challengeData, challengeIndex, selectedFields, feedback]);

  // Handle step navigation
  const goToStep = async (step: DialogStep) => {
    if (step === 'preview') {
      await loadPromptPreview();
    }
    setCurrentStep(step);
  };

  // Handle regeneration
  const handleRegenerate = async () => {
    if (challengeIndex === null || !challengeData || !feedback.trim()) return;

    setIsRegenerating(true);
    setRegenerateError(null);

    try {
      const { data: { session } } = await getSession();
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
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'fields':
        return (
          <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Current Challenge:
              </div>
              {currentChallenge && (
                <>
                  <div className="text-neo-black dark:text-white font-medium">
                    {currentChallenge.prompt}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      Answer: <strong className="text-neo-orange">{currentChallenge.answer}</strong>
                    </span>
                    <span>Type: {currentChallenge.type}</span>
                    {currentChallenge.hint && (
                      <span>Hint: {currentChallenge.hint}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                What do you want to regenerate?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(FIELD_LABELS) as [RegenerableField, string][]).map(([field, label]) => {
                  // Only show options field if challenge has options
                  if (field === 'options' && !currentChallenge?.options) return null;

                  const isSelected = selectedFields.includes(field) ||
                    (field === 'all' && selectedFields.includes('all'));

                  return (
                    <button
                      key={field}
                      onClick={() => handleFieldToggle(field)}
                      className={`px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                        isSelected
                          ? 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {selectedFields.includes('all')
                  ? 'The AI will generate a completely new challenge'
                  : `Only the selected fields will be regenerated. Other fields will be kept as-is.`}
              </p>
            </div>
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Regenerating:</div>
              <div className="font-medium text-slate-700 dark:text-slate-300">
                {selectedFields.includes('all')
                  ? 'Everything (full challenge)'
                  : selectedFields.map(f => FIELD_LABELS[f]).join(', ')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                What is wrong with this challenge?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={`e.g., ${
                  selectedFields.includes('hint')
                    ? 'The hint is too obvious and gives away the answer'
                    : selectedFields.includes('prompt')
                    ? 'The clue is confusing, needs clearer wording'
                    : selectedFields.includes('answer')
                    ? 'The answer word is too obscure, pick something more common'
                    : 'The word is too obscure, The clue gives away the answer...'
                }`}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg text-neo-black dark:text-white focus:border-neo-cyan focus:outline-none resize-none"
                rows={4}
                disabled={isRegenerating}
              />
              <p className="mt-1 text-xs text-slate-500">
                This feedback will be saved and used to improve future AI generations.
              </p>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                AI Prompt Preview
              </div>
              <button
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  isEditingPrompt
                    ? 'bg-neo-yellow/20 text-neo-yellow'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <Edit2 className="w-3 h-3 inline me-1" />
                {isEditingPrompt ? 'Editing' : 'Edit'}
              </button>
            </div>

            {loadingPreview ? (
              <div className="flex justify-center py-8">
                <NeoLoader variant="dots" size="lg" />
              </div>
            ) : (
              <textarea
                value={isEditingPrompt ? customPrompt : promptPreview}
                onChange={(e) => setCustomPrompt(e.target.value)}
                readOnly={!isEditingPrompt}
                className={`w-full px-4 py-3 bg-slate-900 border-2 rounded-lg text-white font-mono text-xs resize-none ${
                  isEditingPrompt
                    ? 'border-neo-yellow focus:border-neo-yellow'
                    : 'border-slate-700'
                } focus:outline-none`}
                rows={12}
              />
            )}

            {doNotDoExamples.length > 0 && (
              <div className="border-t border-slate-700 pt-4">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Included &ldquo;Do Not Do&rdquo; Examples ({doNotDoExamples.filter(e => e.isIncluded).length} of {doNotDoExamples.length})
                </div>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {doNotDoExamples.slice(0, 5).map((example) => (
                    <div
                      key={example.id}
                      className="p-2 bg-slate-800 rounded border border-slate-700 text-xs"
                    >
                      <div className="flex justify-between text-slate-500 mb-1">
                        <span>{example.challengeType}</span>
                        {example.isIncluded && (
                          <span className="text-neo-yellow">Included</span>
                        )}
                      </div>
                      <div className="text-white truncate">&ldquo;{example.originalPrompt}&rdquo;</div>
                      <div className="text-red-400 truncate">{example.feedback}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {regenerateError && (
              <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg">
                <p className="text-sm text-red-400">{regenerateError}</p>
              </div>
            )}
          </div>
        );
    }
  };

  // Step navigation buttons
  const canGoNext = () => {
    switch (currentStep) {
      case 'fields':
        return selectedFields.length > 0;
      case 'feedback':
        return feedback.trim().length >= 5;
      case 'preview':
        return !loadingPreview;
      default:
        return false;
    }
  };

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
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {(['fields', 'feedback', 'preview'] as DialogStep[]).map((step, idx) => {
            const isActive = currentStep === step;
            const isPast = (
              (step === 'fields' && currentStep !== 'fields') ||
              (step === 'feedback' && currentStep === 'preview')
            );
            const stepLabels = {
              fields: '1. Fields',
              feedback: '2. Feedback',
              preview: '3. Preview',
            };

            return (
              <button
                key={step}
                onClick={() => {
                  if (isPast) goToStep(step);
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
                {stepLabels[step]}
              </button>
            );
          })}
        </div>

        <DialogBody className="min-h-[300px]">
          {renderStepContent()}
        </DialogBody>

        <DialogFooter>
          <button
            onClick={() => {
              if (currentStep === 'fields') {
                onOpenChange(false);
              } else {
                const prevStep = currentStep === 'preview' ? 'feedback' : 'fields';
                setCurrentStep(prevStep);
              }
            }}
            disabled={isRegenerating}
            className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
          >
            {currentStep === 'fields' ? 'Cancel' : 'Back'}
          </button>

          {currentStep !== 'preview' ? (
            <button
              onClick={() => goToStep(currentStep === 'fields' ? 'feedback' : 'preview')}
              disabled={!canGoNext()}
              className="px-4 py-2 rounded-lg bg-neo-cyan text-neo-black font-bold border-2 border-neo-black shadow-hard-sm hover:shadow-hard disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {currentStep === 'feedback' && <Eye className="w-4 h-4" />}
              {currentStep === 'fields' ? 'Next' : 'Preview Prompt'}
            </button>
          ) : (
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating || !canGoNext()}
              className="px-4 py-2 rounded-lg bg-neo-cyan text-neo-black font-bold border-2 border-neo-black shadow-hard-sm hover:shadow-hard disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRegenerating ? (
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
