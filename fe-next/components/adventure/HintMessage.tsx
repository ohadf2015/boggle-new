/**
 * HintMessage Component
 *
 * Displays hint messages using translation keys for adaptive difficulty system
 */

'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HintData } from '@/lib/adaptiveDifficulty';

export interface HintMessageProps {
  hintData: HintData;
  className?: string;
}

export function HintMessage({ hintData, className }: HintMessageProps) {
  const { t } = useLanguage();

  // Don't render if no hint
  if (hintData.level === 'none') {
    return null;
  }

  // Build translation params based on hint data
  const params: Record<string, string | number> = {};

  if (hintData.level === 'length' && hintData.wordLength) {
    params.length = hintData.wordLength;
  } else if (hintData.level === 'lengthAndStart' && hintData.wordLength && hintData.startLetter) {
    params.length = hintData.wordLength;
    params.letter = hintData.startLetter;
  } else if (hintData.level === 'fullReveal' && hintData.targetWord) {
    params.word = hintData.targetWord;
  }

  // Get translation key (fallback to level if message not provided)
  const translationKey = hintData.message || `difficulty.hint.${hintData.level}`;

  return (
    <div
      className={`
        bg-neo-navy/90 border-neo border-neo-yellow
        rounded-neo px-4 py-2 text-neo-yellow
        font-neo-body text-sm animate-neo-pop
        ${className ?? ''}
      `}
    >
      {t(translationKey, params)}
    </div>
  );
}
