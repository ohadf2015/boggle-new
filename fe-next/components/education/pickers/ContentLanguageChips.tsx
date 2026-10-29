'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import { LanguagePicker } from './LanguagePicker';

const isEducationLanguage = (code: unknown): code is Language =>
  typeof code === 'string' && (EDUCATION_LANGUAGES as readonly string[]).includes(code);

/** The class default first, then every other language the teacher already has lists in. */
export function contentLanguagesFor(classLanguage: string | null | undefined, lessonLanguages: readonly (string | null | undefined)[]): Language[] {
  const out: Language[] = [];
  for (const code of [classLanguage, ...lessonLanguages]) if (isEducationLanguage(code) && !out.includes(code)) out.push(code);
  return out.length > 0 ? out : ['en'];
}

export interface ContentLanguageChipsProps {
  label: string;
  languages: readonly Language[];
  value: Language;
  onChange: (code: Language) => void;
  testId?: string;
  className?: string;
}

/** Which language's ready-made content to show: the class's languages as chips, the rest one tap away. */
export function ContentLanguageChips({ label, languages, value, onChange, testId, className }: ContentLanguageChipsProps) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const base = languages.includes(value) ? languages : [...languages, value];
  const options = showAll ? [...base, ...EDUCATION_LANGUAGES.filter((code) => !base.includes(code))] : base;
  const canAdd = !showAll && options.length < EDUCATION_LANGUAGES.length;

  return (
    <div data-testid={testId} className={cn('flex flex-wrap items-end gap-1.5', className)}>
      <LanguagePicker label={label} variant="compact" options={options} value={value} onChange={onChange} className="min-w-0" />
      {canAdd && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="inline-flex min-h-10 items-center gap-1 rounded-neo border-2 border-dashed border-neo-cream/60 px-2.5 font-neo-body text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream hover:bg-neo-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          <Plus className="size-4" strokeWidth={3} aria-hidden="true" />
          {t('eduPickers.content.addLanguage', 'Add language')}
        </button>
      )}
    </div>
  );
}
