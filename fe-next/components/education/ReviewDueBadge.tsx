'use client';

import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReviewDueBadgeProps {
  /** Number of words due for review */
  count: number;
  /** Called when the badge is clicked to start a review session */
  onStartReview: () => void;
}

/**
 * Small neo-brutalist pill showing how many words are due for spaced
 * repetition review. Clicking it triggers a practice session with
 * only the due words.
 */
export function ReviewDueBadge({ count, onStartReview }: ReviewDueBadgeProps) {
  const { t } = useLanguage();

  if (count <= 0) return null;

  return (
    <button
      type="button"
      onClick={onStartReview}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neo-pink text-neo-black rounded-neo border-neo border-black shadow-hard-sm font-neo-body font-bold text-sm hover:brightness-110 active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
      aria-label={t('education.reviewDue', { count })}
    >
      <BookOpen className="w-4 h-4 shrink-0" />
      <span>{t('education.reviewDue', { count })}</span>
    </button>
  );
}
