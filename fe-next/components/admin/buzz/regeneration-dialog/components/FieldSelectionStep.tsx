'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { FIELD_LABELS, type BuzzChallengeAdmin, type RegenerableField } from '../../types';

interface FieldSelectionStepProps {
  currentChallenge: BuzzChallengeAdmin | null;
  selectedFields: RegenerableField[];
  onFieldToggle: (field: RegenerableField) => void;
}

export function FieldSelectionStep({
  currentChallenge,
  selectedFields,
  onFieldToggle,
}: FieldSelectionStepProps) {
  return (
    <div className="space-y-4">
      {/* Current challenge preview */}
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
              {currentChallenge.hint && <span>Hint: {currentChallenge.hint}</span>}
            </div>
          </>
        )}
      </div>

      {/* Field selection */}
      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
          What do you want to regenerate?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(FIELD_LABELS) as [RegenerableField, string][]).map(
            ([field, label]) => {
              // Only show options field if challenge has options
              if (field === 'options' && !currentChallenge?.options) return null;

              const isSelected =
                selectedFields.includes(field) ||
                (field === 'all' && selectedFields.includes('all'));

              return (
                <button
                  key={field}
                  onClick={() => onFieldToggle(field)}
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
            }
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {selectedFields.includes('all')
            ? 'The AI will generate a completely new challenge'
            : 'Only the selected fields will be regenerated. Other fields will be kept as-is.'}
        </p>
      </div>
    </div>
  );
}
