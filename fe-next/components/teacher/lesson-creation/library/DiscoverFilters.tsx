'use client';

import { Check, Globe2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { GRADE_BANDS, LIBRARY_TOPICS, isGradeBand, isLibraryTopic } from '@/lib/education/library';
import type { DiscoverFilters as Filters } from './useDiscoverLibrary';
import { NB_BLOCK, NB_SMALL } from '@/components/teacher/nb/nbStyles';

const PILL =
  'inline-flex h-10 shrink-0 items-center gap-1 rounded-full border-2 px-2.5 font-neo-display sm:px-3.5 text-sm font-bold transition-[translate,box-shadow,border-color] duration-150 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-edu-line';
const SELECT =
  'h-10 min-w-0 rounded-full border-2 border-edu-line bg-edu-surface px-2 text-sm font-bold text-edu-ink focus:outline-hidden focus:ring-2 focus:ring-edu-line';

interface DiscoverFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  total: number;
}

export default function DiscoverFilters({ filters, onChange, total }: DiscoverFiltersProps) {
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  const activeExtra = (filters.source !== 'all' ? 1 : 0) + (filters.grade ? 1 : 0) + (filters.topic ? 1 : 0) + (filters.sort !== 'popular' ? 1 : 0);

  return (
    <div data-testid="discover-filters" className="sticky top-0 z-10 -mx-1 space-y-2 bg-edu-surface px-1 pb-2 pt-1">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t('eduLibrary.discover.searchLabel')}</span>
          <Search className="pointer-events-none absolute z-10 start-3 top-1/2 size-4 -translate-y-1/2 text-edu-ink/60" aria-hidden="true" />
          <input
            type="search"
            data-testid="discover-search"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder={t('eduLibrary.discover.searchPlaceholder')}
            className="h-11 w-full min-w-0 rounded-neo border-2 border-edu-line bg-edu-surface shadow-hard-sm ps-9 pe-9 font-neo-body text-base text-edu-ink placeholder:text-edu-ink/55 focus:border-edu-line focus:outline-hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              aria-label={t('eduLibrary.discover.clearSearch')}
              title={t('eduLibrary.discover.clearSearch')}
              className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-edu-ink/70 hover:text-edu-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          aria-controls="discover-more-filters"
          aria-label={t('eduLibrary.discover.filters')}
          title={t('eduLibrary.discover.filters')}
          className={cn(NB_SMALL, NB_BLOCK.navy, 'relative h-11 shrink-0 px-3', showMore && 'border-edu-line')}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('eduLibrary.discover.filters')}</span>
          {activeExtra > 0 && (
            <span className="absolute -end-2 -top-2 flex size-5 items-center justify-center rounded-full border-2 border-edu-line bg-edu-surface text-[10px] font-black text-edu-ink">
              {activeExtra}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <label className="relative shrink-0">
          <Globe2 className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-edu-ink/70" aria-hidden="true" />
          <select
            aria-label={t('eduLibrary.meta.language')}
            data-testid="discover-language"
            value={filters.language}
            onChange={(e) => onChange({ language: e.target.value as Language | 'all' })}
            className={cn(SELECT, 'ps-7 pe-3')}
          >
            <option value="all">{t('eduLibrary.discover.allLanguages')}</option>
            {EDUCATION_LANGUAGES.map((code) => (
              <option key={code} value={code} lang={code}>{nativeLanguageName(code)}</option>
            ))}
          </select>
        </label>
        <span className="ms-auto shrink-0 text-xs font-bold tabular-nums text-edu-ink/70 max-sm:hidden" aria-live="polite">
          {t('eduLibrary.discover.count', { count: total })}
        </span>
      </div>

      {showMore && (
        <div id="discover-more-filters" className="space-y-2 motion-safe:animate-pop-in">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('eduLibrary.discover.sourceLabel')}>
            {(['all', 'verified', 'teacher'] as const).map((s) => {
              const active = filters.source === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ source: s })}
                  className={cn(PILL, active ? 'border-neo-lime text-edu-ink shadow-hard-sm ring-1 ring-neo-lime' : 'border-edu-line text-edu-ink/85 hover:border-edu-line')}
                >
                  {active && <Check className="size-3.5 text-edu-lime-ink" strokeWidth={3} aria-hidden="true" />}
                  {s === 'all' ? t('eduLibrary.discover.source.all') : t(`eduLibrary.badge.${s}`)}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select aria-label={t('eduLibrary.meta.grade')} value={filters.grade ?? ''} onChange={(e) => onChange({ grade: isGradeBand(e.target.value) ? e.target.value : null })} className={SELECT}>
              <option value="">{t('eduLibrary.grade.any')}</option>
              {GRADE_BANDS.map((g) => <option key={g} value={g}>{t(`eduLibrary.grade.${g}`)}</option>)}
            </select>
            <select aria-label={t('eduLibrary.meta.topic')} value={filters.topic ?? ''} onChange={(e) => onChange({ topic: isLibraryTopic(e.target.value) ? e.target.value : null })} className={SELECT}>
              <option value="">{t('eduLibrary.topic.all')}</option>
              {LIBRARY_TOPICS.map((tp) => <option key={tp} value={tp}>{t(`eduLibrary.topic.${tp}`)}</option>)}
            </select>
            <select aria-label={t('eduLibrary.discover.sortLabel')} value={filters.sort} onChange={(e) => onChange({ sort: e.target.value === 'newest' ? 'newest' : 'popular' })} className={SELECT}>
              <option value="popular">{t('eduLibrary.discover.sort.popular')}</option>
              <option value="newest">{t('eduLibrary.discover.sort.newest')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
