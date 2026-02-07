'use client';

import React from 'react';
import { Edit2 } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import type { PromptExample } from '../../types';

interface PreviewStepProps {
  promptPreview: string;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  isEditingPrompt: boolean;
  onToggleEdit: () => void;
  doNotDoExamples: PromptExample[];
  loadingPreview: boolean;
  error: string | null;
}

export function PreviewStep({
  promptPreview,
  customPrompt,
  onCustomPromptChange,
  isEditingPrompt,
  onToggleEdit,
  doNotDoExamples,
  loadingPreview,
  error,
}: PreviewStepProps) {
  return (
    <div className="space-y-4">
      {/* Header with edit toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
          AI Prompt Preview
        </div>
        <button
          onClick={onToggleEdit}
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

      {/* Prompt textarea */}
      {loadingPreview ? (
        <div className="flex justify-center py-8">
          <Loader size="lg" />
        </div>
      ) : (
        <textarea
          value={isEditingPrompt ? customPrompt : promptPreview}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          readOnly={!isEditingPrompt}
          className={`w-full px-4 py-3 bg-slate-900 border-2 rounded-lg text-white font-mono text-xs resize-none ${
            isEditingPrompt ? 'border-neo-yellow focus:border-neo-yellow' : 'border-slate-700'
          } focus:outline-none`}
          rows={12}
        />
      )}

      {/* Do Not Do examples */}
      {doNotDoExamples.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            Included &ldquo;Do Not Do&rdquo; Examples (
            {doNotDoExamples.filter((e) => e.isIncluded).length} of {doNotDoExamples.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {doNotDoExamples.slice(0, 5).map((example) => (
              <div
                key={example.id}
                className="p-2 bg-slate-800 rounded border border-slate-700 text-xs"
              >
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>{example.challengeType}</span>
                  {example.isIncluded && <span className="text-neo-yellow">Included</span>}
                </div>
                <div className="text-white truncate">
                  &ldquo;{example.originalPrompt}&rdquo;
                </div>
                <div className="text-red-400 truncate">{example.feedback}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
