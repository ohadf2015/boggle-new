'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lastPlayedLabel } from './HomeClassList';
import type { WeekClassRow, WeekClassTone } from './weekClassRows';

type T = (key: string, params?: Record<string, string | number>) => string;

const DOT: Record<WeekClassTone, string> = {
  today: 'border-neo-black bg-neo-lime',
  week: 'border-neo-black bg-neo-cyan',
  idle: 'border-neo-cream/45 bg-transparent',
};

const WHEN: Record<WeekClassTone, string> = {
  today: 'text-neo-lime',
  week: 'text-neo-cream/80',
  idle: 'text-neo-cream/55',
};

export interface HomeWeekClassesProps {
  rows: readonly WeekClassRow[];
  hidden: number;
  selectedId: string;
  onSelect: (id: string) => void;
  moreHref: string;
  language: string;
  nowMs: number;
  t: T;
}

/** Per-class breakdown under the week meter; picking a row puts that class on the desk. */
export function HomeWeekClasses({ rows, hidden, selectedId, onSelect, moreHref, language, nowMs, t }: HomeWeekClassesProps) {
  return (
    <div className="flex flex-col gap-1">
      <ul data-testid="home-week-classes" className="flex flex-col gap-1">
        {rows.map((row) => {
          const selected = row.id === selectedId;
          return (
            <li key={row.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(row.id)}
                className={cn(
                  'grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-full border-2 px-3 text-start',
                  'transition-[translate,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:translate-y-0.5 motion-reduce:transition-none motion-reduce:active:translate-y-0',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream',
                  '[@media(max-height:820px)]:min-h-10',
                  selected
                    ? 'border-neo-black bg-neo-cream shadow-hard'
                    : 'border-neo-cream/25 bg-neo-navy hover:-translate-y-0.5 hover:border-neo-cream/60 motion-reduce:hover:translate-y-0',
                )}
              >
                <span aria-hidden="true" data-testid="home-week-class-dot" data-tone={row.tone} className={cn('size-3 shrink-0 rounded-full border-2', DOT[row.tone], selected && row.tone === 'idle' && 'border-neo-black/50')} />
                <span dir="auto" className={cn('truncate font-neo-body text-sm font-bold', selected ? 'text-neo-black' : 'text-neo-cream')}>{row.name}</span>
                <span data-testid="home-week-class-when" className={cn('inline-block whitespace-nowrap font-neo-body text-xs font-bold first-letter:uppercase', selected ? 'text-neo-black/75' : WHEN[row.tone])}>
                  {row.playedAt ? lastPlayedLabel(row.playedAt, language, nowMs) : t('eduShell.week.idle')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <Link
          href={moreHref}
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-neo px-2.5 font-neo-body text-xs font-bold text-neo-cream/75 underline decoration-1 underline-offset-4 hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream"
        >
          {t('eduShell.week.more', { count: hidden })}
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export default HomeWeekClasses;
