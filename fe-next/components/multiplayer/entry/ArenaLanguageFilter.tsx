'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_FLAGS } from '@/lib/languageConfig';
import type { Language } from '@/shared/types/game';
import { cn } from '@/lib/utils';
import { languageDisplayName } from './arenaLanguage';

interface ArenaLanguageFilterProps {
  languages: Language[];
  counts: Partial<Record<Language, number>>;
  value: Language;
  onChange: (language: Language) => void;
}

/** One row of flag chips: the active one is named, the rest show how many rooms are open in them. */
export function ArenaLanguageFilter({ languages, counts, value, onChange }: ArenaLanguageFilterProps) {
  const { t, language: uiLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('mpUi.entry.roomLanguage')}
      className="mp-arena-langs -mx-0.5 flex shrink-0 gap-1.5 overflow-x-auto overscroll-x-contain ps-0.5 pe-6 pb-1 pt-0.5 tv:gap-3"
    >
      {languages.map((code) => {
        const active = code === value;
        const count = counts[code] ?? 0;
        const name = languageDisplayName(code, uiLocale);
        return (
          <button
            key={code}
            type="button"
            data-testid={`arena-lang-${code}`}
            aria-pressed={active}
            aria-label={t('mpUi.entry.languageChip', { language: name, count })}
            onClick={() => onChange(code)}
            className={cn(
              'inline-flex h-8 lg:h-9 tv:h-12 shrink-0 items-center gap-1.5 rounded-full border-2 px-2.5 lg:px-3 tv:px-4 font-neo-display text-xs lg:text-sm tv:text-lg font-bold transition-transform duration-100',
              'active:translate-y-0.5 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
              active
                ? 'border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm'
                : 'border-neo-cream/40 bg-neo-navy-light text-neo-white hover:-translate-y-0.5',
              !active && count === 0 && 'text-neo-white/60',
            )}
          >
            <span aria-hidden="true" className="text-base leading-none lg:text-lg tv:text-2xl">{LANGUAGE_FLAGS[code] || '🌐'}</span>
            {active && <span className="whitespace-nowrap capitalize">{name}</span>}
            {count > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'min-w-5 rounded-full px-1 text-center tabular-nums',
                  active ? 'bg-neo-black text-neo-yellow' : 'bg-neo-cyan text-neo-black',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
