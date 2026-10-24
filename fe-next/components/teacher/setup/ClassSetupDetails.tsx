'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';
import { EduMascot } from '@/components/education/EduMascot';
import { PANEL, PRIMARY_BUTTON } from '../home/homeStyles';
import { GRADE_BANDS, type GradeBand } from './classSetupDefaults';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassSetupDetailsProps {
  name: string;
  onNameChange: (name: string) => void;
  grade: GradeBand | null;
  onGradeChange: (grade: GradeBand | null) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  cap: { count: number; limit: number; atLimit: boolean } | null;
  busy: boolean;
  errorKey: string | null;
  onSubmit: () => void;
  t: T;
}

const FIELD_LABEL = 'font-neo-body text-sm font-bold text-neo-cream';
const INPUT =
  'min-h-[48px] w-full rounded-neo border-[3px] border-neo-cream bg-neo-navy px-3 font-neo-body text-base font-semibold text-neo-cream placeholder:text-neo-cream/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

/** Step 1: name, grade and language. Every field has a default, so "Create class" works untouched. */
export function ClassSetupDetails(props: ClassSetupDetailsProps) {
  const { name, onNameChange, grade, onGradeChange, language, onLanguageChange, cap, busy, errorKey, onSubmit, t } = props;
  const placeholder = t(grade ? `eduShell.setup.gradeName.${grade}` : 'eduShell.setup.namePlaceholder');
  return (
    <form
      data-testid="setup-step-details"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onSubmit();
      }}
      className={cn(PANEL, 'flex flex-col gap-5 p-5 sm:p-6')}
    >
      <div className="flex items-center gap-3">
        <EduMascot moment="setup" size={72} className="size-16 shrink-0 sm:size-18" />
        <div className="min-w-0">
          <h1 data-wipe className="font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-3xl">{t('eduShell.setup.title')}</h1>
          <p className="font-neo-body text-sm text-neo-cream/80">{t('eduShell.setup.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="setup-name" className={FIELD_LABEL}>
          {t('eduShell.setup.nameLabel')}
        </label>
        <input
          id="setup-name"
          dir="auto"
          value={name}
          maxLength={100}
          autoComplete="off"
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={placeholder}
          className={INPUT}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={cn(FIELD_LABEL, 'mb-1.5')}>{t('eduShell.setup.gradeLabel')}</legend>
        <div className="flex flex-wrap gap-2">
          {GRADE_BANDS.map((band) => {
            const on = grade === band;
            return (
              <button
                key={band}
                type="button"
                data-testid={`setup-grade-${band}`}
                aria-pressed={on}
                onClick={() => onGradeChange(on ? null : band)}
                className={cn(
                  'min-h-[44px] rounded-full border-[2px] px-4 font-neo-body text-sm font-bold transition-[transform,colors] duration-150 active:scale-[0.97]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  on ? 'border-neo-black bg-neo-cyan text-neo-black' : 'border-neo-cream/70 text-neo-cream hover:bg-neo-cream/10',
                )}
              >
                {t(`eduShell.setup.grade.${band}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <LanguagePicker
        label={<span className={FIELD_LABEL}>{t('eduShell.setup.languageLabel')}</span>}
        value={language}
        onChange={onLanguageChange}
        showBoardHint
      />

      {cap ? (
        <div data-testid="setup-cap-meter" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between font-neo-body text-xs font-bold text-neo-cream/80">
            <span>{t('eduShell.setup.capMeter', { count: cap.count, limit: cap.limit })}</span>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: cap.limit }, (_, i) => (
              <span key={i} className={cn('h-2 flex-1 rounded-full', i < cap.count ? 'bg-neo-yellow' : 'bg-neo-cream/15')} />
            ))}
          </div>
        </div>
      ) : null}

      {errorKey ? (
        <p role="alert" className="rounded-neo border-[2px] border-neo-pink bg-neo-navy px-3 py-2 font-neo-body text-sm font-bold text-neo-cream">
          {t(errorKey)}
        </p>
      ) : null}

      <button type="submit" data-testid="setup-create" disabled={busy} aria-busy={busy || undefined} className={cn(PRIMARY_BUTTON, 'w-full')}>
        {busy ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
        {t(busy ? 'eduShell.setup.creating' : errorKey ? 'eduShell.setup.retry' : 'eduShell.setup.create')}
      </button>
    </form>
  );
}

export default ClassSetupDetails;
