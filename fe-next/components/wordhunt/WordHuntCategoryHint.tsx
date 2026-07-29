'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORY_EMOJIS, getCategoryLabel } from '@/shared/data/wordCategories';

/** Duration in ms before the full hint fades to icon-only */
const FADE_DELAY_MS = 10_000;

interface WordHuntCategoryHintProps {
  targetLength: number;
  targetCategory: string | null;
}

/**
 * Inline category hint for Word Hunt MP.
 * Shows full text for 10s, then collapses to emoji-only.
 * Designed to integrate into existing HUD, not as a standalone card.
 */
export function WordHuntCategoryHint({
  targetLength,
  targetCategory,
}: WordHuntCategoryHintProps) {
  const { t, language: locale } = useLanguage();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setExpanded(false), FADE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Don't show hint if we aren't sure about the category
  if (!targetCategory) return null;

  const emoji = CATEGORY_EMOJIS[targetCategory] ?? null;
  const label = t('wordHunt.categoryHint', {
    length: targetLength,
    category: getCategoryLabel(targetCategory, locale),
  });

  if (!expanded) {
    // Collapsed: show emoji-only, expand on hover/tap
    if (!emoji) return null;
    return (
      <button
        data-testid="category-hint"
        type="button"
        className="animate-fade-in text-xl cursor-pointer"
        onClick={() => setExpanded(true)}
        onMouseEnter={() => setExpanded(true)}
        aria-label={label}
        title={label}
      >
        {emoji}
      </button>
    );
  }

  return (
    <span
      data-testid="category-hint"
      className="animate-fade-in font-neo-display text-neo-white text-base inline-flex items-center gap-1"
    >
      {label}
      {emoji && (
        <span className="text-lg" aria-hidden="true">
          {emoji}
        </span>
      )}
    </span>
  );
}
