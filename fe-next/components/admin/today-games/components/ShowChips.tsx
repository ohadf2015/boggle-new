'use client';

import React from 'react';
import { SHOW_FILTERS, type ShowFilter, type ShowCounts } from '@/lib/admin/gameLog/filterGroups';

type T = (key: string, fallback?: string) => string;

const LABEL_FALLBACK: Record<ShowFilter, string> = {
  people: 'People',
  real: 'Played',
  empty: 'Empty',
  bots: 'Bots',
  all: 'All',
};

const HINT_FALLBACK: Record<ShowFilter, string> = {
  people: 'Everyone except bots',
  real: 'Found a word, scored or built a floor',
  empty: 'People who left or finished with nothing found',
  bots: 'Headless / automated visitors',
  all: 'Everything, bots included',
};

/**
 * One-tap "what kind of games" filter with live counts — scrolls sideways on
 * phones instead of wrapping into a tall block.
 */
export function ShowChips({
  value,
  counts,
  onChange,
  t,
}: {
  value: ShowFilter;
  counts: ShowCounts | null;
  onChange: (v: ShowFilter) => void;
  t: T;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t('admin.todayGames.show.label', 'Show')}
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none]"
    >
      {SHOW_FILTERS.map((key) => {
        const active = key === value;
        const n = counts?.[key];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`show-chip-${key}`}
            title={t(`admin.todayGames.show.${key}Hint`, HINT_FALLBACK[key])}
            onClick={() => onChange(key)}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-neo-display transition-colors ${
              active
                ? 'bg-neo-lime text-neo-navy border-black shadow-hard-sm'
                : 'bg-neo-navy-elevated text-slate-200 border-black/60 hover:border-neo-lime/60'
            }`}
          >
            {t(`admin.todayGames.show.${key}`, LABEL_FALLBACK[key])}
            {typeof n === 'number' && (
              <span className={`font-mono text-xs ${active ? 'text-neo-navy/70' : 'text-slate-400'}`}>
                {n.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
