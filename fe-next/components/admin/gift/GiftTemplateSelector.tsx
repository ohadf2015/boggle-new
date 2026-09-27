'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { GIFT_TEMPLATES, type GiftTemplateType, type GiftTemplate } from './types';

interface GiftTemplateSelectorProps {
  selectedTemplate: GiftTemplateType;
  onSelect: (template: GiftTemplate) => void;
}

export function GiftTemplateSelector({
  selectedTemplate,
  onSelect,
}: GiftTemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {GIFT_TEMPLATES.map((template) => {
        const isSelected = selectedTemplate === template.id;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              'hover:border-neo-lime hover:bg-neo-lime/5',
              isSelected
                ? 'border-neo-lime bg-neo-lime/10 shadow-hard-sm'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-neo-navy-light'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm mb-1">
                  {template.defaultTitle || 'Custom Message'}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {template.id === 'custom'
                    ? 'Write your own personalized message'
                    : template.headerLine}
                </p>
                {template.id !== 'custom' && (
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                      {template.suggestedXp} XP
                    </span>
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      {template.suggestedCoins} coins
                    </span>
                  </div>
                )}
              </div>
              {isSelected && (
                <div className="w-5 h-5 bg-neo-lime rounded-full flex items-center justify-center">
                  <span className="text-black text-xs">✓</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
