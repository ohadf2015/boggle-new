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
    <div role="radiogroup" aria-label="Template" className="flex flex-wrap gap-2">
      {GIFT_TEMPLATES.map((template) => {
        const isSelected = selectedTemplate === template.id;
        const name = template.id === 'custom' ? 'Custom' : template.defaultTitle;
        return (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            title={template.id === 'custom' ? 'Write your own message' : `${template.suggestedXp} XP · ${template.suggestedCoins} coins`}
            onClick={() => onSelect(template)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition',
              isSelected
                ? 'border-neo-lime bg-neo-lime/15 text-neo-lime-dark dark:text-neo-lime'
                : 'border-slate-300 dark:border-slate-600 hover:border-neo-lime'
            )}
          >
            <span aria-hidden>{template.icon}</span>
            {name}
          </button>
        );
      })}
    </div>
  );
}
