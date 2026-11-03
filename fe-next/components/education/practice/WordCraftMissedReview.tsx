'use client';

import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { missedReviewHref } from '@/lib/education/wordcraftMissedWords';
import { cn } from '@/lib/utils';

const PREVIEW = 3;

export interface WordCraftMissedReviewProps {
  lessonId: string;
  /** Lesson words the round dealt but the student did not build. */
  missed: readonly string[];
  className?: string;
}

export default function WordCraftMissedReview({ lessonId, missed, className }: WordCraftMissedReviewProps) {
  const { t, language } = useLanguage();
  if (missed.length === 0) return null;
  const rest = missed.length - PREVIEW;
  return (
    <Link
      href={missedReviewHref(language, lessonId)}
      data-testid="wordcraft-missed-review"
      className={cn(
        'flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-neo border-2 border-neo-cyan bg-neo-navy px-3 py-1.5 text-center text-neo-cyan transition-colors hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 font-neo-body text-sm font-bold uppercase">
        <BookOpenCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('wordcraftReview.cta', { count: missed.length })}
      </span>
      <span className="flex max-w-full flex-nowrap justify-center gap-1 overflow-hidden" translate="no">
        {missed.slice(0, PREVIEW).map((word) => (
          <span key={word} data-testid="wordcraft-missed-word" className="truncate rounded-sm bg-neo-cream px-1.5 font-neo-display text-xs font-bold text-neo-black">
            {word}
          </span>
        ))}
        {rest > 0 && (
          <span data-testid="wordcraft-missed-more" className="shrink-0 font-neo-display text-xs font-bold text-neo-cream">
            {`+${rest}`}
          </span>
        )}
      </span>
    </Link>
  );
}
