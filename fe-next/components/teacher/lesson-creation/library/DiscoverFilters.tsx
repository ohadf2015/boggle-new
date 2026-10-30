'use client';

import { Check, Globe2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { GRADE_BANDS, LIBRARY_TOPICS, isGradeBand, isLibraryTopic } from '@/lib/education/library';
import type { DiscoverFilters as Filters } from './useDiscoverLibrary';

const PILL = 'inline-flex h-10 shrink-0 items-center gap-1 rounded-neo border-2 px-2.5 text-sm font-bold transition focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cream';
const SELECT =
  'h-10 min-w-0 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-2 text-sm font-bold text-neo-white focus:outline-hidden focus:ring-2 focus:ring-neo-cream';

interface DiscoverFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  total: number;
}

export default function DiscoverFilters({ filters, onChange, total }: DiscoverFiltersProps) {
  const { t } = useLanguage();
  const [showMore, setShowMore] = useState(false);
  const activeExtra = (filters.grade ? 1 : 0) + (filters.topic ? 1 : 0) + (filters.sort !== 'popular' ? 1 : 0);

  return (
    <div data-testid="discover-filters" className="sticky top-0 z-10 -mx-1 space-y-2 bg-neo-navy px-1 pb-2 pt-1">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t('eduLibrary.discover.searchLabel')}</span>
          <Search className="pointer-events-none absolute z-10 start-3 top-1/2 size-4 -translate-y-1/2 text-neo-cream/60" aria-hidden="true" />
          <input
            type="search"
            data-testid="discover-search"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder={t('eduLibrary.discover.searchPlaceholder')}
            className="h-11 w-full min-w-0 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light ps-9 pe-9 font-neo-body text-base text-neo-white placeholder:text-neo-cream/55 focus:border-neo-cream focus:outline-hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              aria-label={t('eduLibrary.discover.clearSearch')}
              title={t('eduLibrary.discover.clearSearch')}
              className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-neo-cream/70 hover:text-neo-cream"
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
          className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-neo border-2 border-neo-cream/60 px-3 text-sm font-bold text-neo-white hover:border-neo-cream"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('eduLibrary.discover.filters')}</span>
          {activeExtra > 0 && (
            <span className="absolute -end-2 -top-2 flex size-5 items-center justify-center rounded-full border-2 border-neo-cream bg-neo-navy text-[10px] font-black text-neo-white">
              {activeExtra}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <label className="relative shrink-0">
          <Globe2 className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-neo-cream/70" aria-hidden="true" />
          <select
            aria-label={t('eduLibrary.meta.language')}
            data-testid="discover-language"
            value={filters.language}
            onChange={(e) => onChange({ language: e.target.value as Language | 'all' })}
            className={cn(SELECT, 'ps-7')}
          >
            <option value="all">{t('eduLibrary.discover.allLanguages')}</option>
            {EDUCATION_LANGUAGES.map((code) => (
              <option key={code} value={code} lang={code}>{nativeLanguageName(code)}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1.5" role="group" aria-label={t('eduLibrary.discover.sourceLabel')}>
          {(['all', 'verified', 'teacher'] as const).map((s) => {
            const active = filters.source === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ source: s })}
                className={cn(PILL, active ? 'border-neo-lime text-neo-white ring-1 ring-neo-lime' : 'border-neo-cream/40 text-neo-cream/85 hover:border-neo-cream')}
              >
                {active && <Check className="size-3.5 text-neo-lime" strokeWidth={3} aria-hidden="true" />}
                {s === 'all' ? t('eduLibrary.discover.source.all') : t(`eduLibrary.badge.${s}`)}
              </button>
            );
          })}
        </div>
        <span className="ms-auto shrink-0 text-xs font-bold tabular-nums text-neo-cream/70 max-sm:hidden" aria-live="polite">
          {t('eduLibrary.discover.count', { count: total })}
        </span>
      </div>

      {showMore && (
        <div id="discover-more-filters" className="grid grid-cols-3 gap-2 motion-safe:animate-pop-in">
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
      )}
    </div>
  );
}
