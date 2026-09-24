'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ClassPagerProps {
  /** Zero-based current page. */
  page: number;
  pages: number;
  onChange: (page: number) => void;
  className?: string;
}

const STEP =
  'flex size-11 shrink-0 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-lime text-black shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:cursor-not-allowed disabled:bg-neo-navy-light disabled:text-neo-white/40 disabled:shadow-none disabled:hover:translate-y-0';

/**
 * Prev / "2 of 5" / next for the Classes tab. Renders nothing for one page.
 * Arrows are chevrons flipped for RTL by the `rtl:` variant, so "next" always
 * points the way the reader reads.
 */
export function ClassPager({ page, pages, onChange, className }: ClassPagerProps) {
  const { t } = useLanguage();
  if (pages <= 1) return null;

  return (
    <nav
      data-testid="class-pager"
      aria-label={t('academy.classes.pagerLabel', 'Classes pages')}
      className={cn('flex items-center justify-center gap-3', className)}
    >
      <button
        type="button"
        data-testid="class-pager-prev"
        onClick={() => onChange(page - 1)}
        disabled={page <= 0}
        aria-label={t('academy.classes.prevPage', 'Previous classes')}
        className={STEP}
      >
        <ChevronLeft className="size-5 rtl:rotate-180" strokeWidth={3} aria-hidden="true" />
      </button>
      <span
        data-testid="class-pager-status"
        aria-live="polite"
        className="min-w-20 text-center font-neo-display text-sm font-black uppercase tracking-wide text-neo-white tabular-nums"
      >
        {t('academy.classes.pageOf', '{{page}} of {{pages}}', { page: page + 1, pages })}
      </span>
      <button
        type="button"
        data-testid="class-pager-next"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages - 1}
        aria-label={t('academy.classes.nextPage', 'More classes')}
        className={STEP}
      >
        <ChevronRight className="size-5 rtl:rotate-180" strokeWidth={3} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default ClassPager;
