'use client';

import React from 'react';
import { FIELD_LABELS, type RegenerableField } from '../../types';

interface FeedbackStepProps {
  selectedFields: RegenerableField[];
  feedback: string;
  onFeedbackChange: (value: string) => void;
  isRegenerating: boolean;
}

export function FeedbackStep({
  selectedFields,
  feedback,
  onFeedbackChange,
  isRegenerating,
}: FeedbackStepProps) {
  // Generate placeholder based on selected fields
  const getPlaceholder = () => {
    if (selectedFields.includes('hint')) {
      return 'The hint is too obvious and gives away the answer';
    }
    if (selectedFields.includes('prompt')) {
      return 'The clue is confusing, needs clearer wording';
    }
    if (selectedFields.includes('answer')) {
      return 'The answer word is too obscure, pick something more common';
    }
    return 'The word is too obscure, The clue gives away the answer...';
  };

  return (
    <div className="space-y-4">
      {/* Selected fields summary */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
        <div className="text-xs text-slate-500 mb-1">Regenerating:</div>
        <div className="font-medium text-slate-700 dark:text-slate-300">
          {selectedFields.includes('all')
            ? 'Everything (full challenge)'
            : selectedFields.map((f) => FIELD_LABELS[f]).join(', ')}
        </div>
      </div>

      {/* Feedback input */}
      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
          What is wrong with this challenge?
        </label>
        <textarea
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder={`e.g., ${getPlaceholder()}`}
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
}
