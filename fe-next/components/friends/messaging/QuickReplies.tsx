'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/** Translation keys under social.quick — one tap sends the phrase as-is. */
export const QUICK_REPLY_KEYS = ['hi', 'gg', 'rematch', 'nice', 'playNow', 'beatMe'] as const;

interface QuickRepliesProps {
  onPick: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

/** One-tap phrases above the composer, so a reply never needs typing. */
export function QuickReplies({ onPick, disabled = false, className }: QuickRepliesProps) {
  const { t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t('friendSocial.quickRepliesLabel')}
      data-testid="quick-replies"
      className={cn('flex gap-2 overflow-x-auto px-3 pt-2 pb-1 scrollbar-none', className)}
    >
      {QUICK_REPLY_KEYS.map((key) => {
        const phrase = t(`friendSocial.quick.${key}`);
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onPick(phrase)}
            className="shrink-0 whitespace-nowrap rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1.5 text-xs font-bold text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow] disabled:opacity-50"
          >
            <span dir="auto">{phrase}</span>
          </button>
        );
      })}
    </div>
  );
}

export default QuickReplies;
