'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';
import { EduMascot } from '@/components/education/EduMascot';
import { PANEL, PRIMARY_BUTTON, QUIET_LINK, SECONDARY_BUTTON } from '../home/homeStyles';
import { GRADE_BANDS, type GradeBand } from './classSetupDefaults';
import { StarterPackRow } from './StarterPackRow';

type T = (key: string, params?: Record<string, string | number>) => string;

export type SetupBusy = 'live' | 'create' | null;

export interface ClassSetupDetailsProps {
  name: string;
  onNameChange: (name: string) => void;
  grade: GradeBand | null;
  onGradeChange: (grade: GradeBand | null) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  packs: StarterLessonPack[];
  pack: StarterLessonPack;
  recommendedKey: string;
  onPackChange: (nameKey: string) => void;
  cap: { count: number; limit: number; atLimit: boolean } | null;
  busy: SetupBusy;
  errorKey: string | null;
  onStartLive: () => void;
  onCreateOnly: () => void;
  skipHref: string;
  t: T;
}

const FIELD_LABEL = 'font-neo-body text-sm font-bold text-neo-cream';
const INPUT =
  'min-h-[48px] w-full rounded-neo border-[3px] border-neo-cream bg-neo-navy px-3 font-neo-body text-base font-semibold text-neo-cream placeholder:text-neo-cream/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

/** Grade, language, a pre-picked pack, Start live: every field has a default, so one tap launches. */
export function ClassSetupDetails(props: ClassSetupDetailsProps) {
  const { name, onNameChange, grade, onGradeChange, language, onLanguageChange, cap, busy, errorKey, t } = props;
  const placeholder = t(grade ? `eduShell.setup.gradeName.${grade}` : 'eduShell.setup.namePlaceholder');
  const [languageTouched, setLanguageTouched] = useState(false);
  const pose = !grade ? 'pickGrade' : languageTouched ? 'firstClass' : 'pickLanguage';
  return (
    <form
      data-testid="setup-step-details"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) props.onStartLive();
      }}
      className={cn(PANEL, 'grid grid-cols-1 gap-2 p-3 sm:gap-4 sm:p-5 lg:grid-cols-2 lg:gap-x-8')}
    >
      <div className="flex items-start gap-3 lg:col-span-2">
        <EduMascot moment={pose} size={72} className="size-16 shrink-0 max-sm:hidden" />
        <div className="min-w-0 flex-1">
          <h1 data-wipe className="font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-3xl">{t('eduShell.setup.title')}</h1>
          <p className="font-neo-body text-sm text-neo-cream/80 max-sm:sr-only">{t('eduShell.setup.subtitle')}</p>
        </div>
        <Link href={props.skipHref} data-testid="setup-skip" className={cn(QUIET_LINK, 'shrink-0')}>
          {t('eduShell.setup.skip')}
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:gap-4 max-sm:[&_p[id$='-hint']]:hidden">
      <fieldset className="flex flex-col gap-1.5">
        <legend className={cn(FIELD_LABEL, 'mb-1.5')}>{t('eduShell.setup.gradeLabel')}</legend>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                  'inline-flex min-h-10 items-center gap-1 rounded-full border-[2px] px-3 font-neo-body text-sm font-bold text-neo-cream transition-[transform,colors] duration-150 active:scale-[0.97] motion-reduce:transition-none sm:min-h-[44px] sm:px-4',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream',
                  on ? 'border-neo-lime ring-2 ring-neo-lime' : 'border-neo-cream/50 hover:bg-neo-cream/10',
                )}
              >
                {on ? <Check className="size-4 text-neo-lime" strokeWidth={3} aria-hidden="true" /> : null}
                {t(`eduShell.setup.grade.${band}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <LanguagePicker
        label={<span className={FIELD_LABEL}>{t('eduShell.setup.languageLabel')}</span>}
        value={language}
        onChange={(next) => {
          setLanguageTouched(true);
          onLanguageChange(next);
        }}
        variant="compact"
        selection="ring"
        showBoardHint
      />
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
      <StarterPackRow packs={props.packs} selectedKey={props.pack.nameKey} recommendedKey={props.recommendedKey} onSelect={props.onPackChange} t={t} />

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

      {cap ? (
        <div data-testid="setup-cap-meter" className="flex flex-col gap-1.5">
          <span className="font-neo-body text-xs font-bold text-neo-cream/80">{t('eduShell.setup.capMeter', { count: cap.count, limit: cap.limit })}</span>
          <div className="flex gap-1 max-sm:hidden" aria-hidden="true">
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

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          data-testid="setup-start-live"
          data-hero="true"
          disabled={busy !== null}
          aria-busy={busy === 'live' || undefined}
          className={cn(PRIMARY_BUTTON, 'min-h-12 w-full text-xl sm:min-h-14')}
        >
          {busy === 'live' ? (
            <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Play className="size-6 fill-current" aria-hidden="true" />
          )}
          {t(errorKey ? 'eduShell.setup.retry' : 'eduShell.setup.startLive')}
        </button>
        <button
          type="button"
          data-testid="setup-create"
          disabled={busy !== null}
          aria-busy={busy === 'create' || undefined}
          onClick={props.onCreateOnly}
          className={cn(SECONDARY_BUTTON, 'w-full')}
        >
          {busy === 'create' ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {t(busy === 'create' ? 'eduShell.setup.creating' : 'eduShell.setup.createOnly')}
        </button>
      </div>
      </div>
    </form>
  );
}

export default ClassSetupDetails;
