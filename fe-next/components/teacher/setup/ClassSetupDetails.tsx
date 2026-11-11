'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { languageFlag } from '@/lib/i18n/languageLabels';
import { NB_ADVANCED, NB_BLOCK, NB_INPUT, NB_LINK, NB_PANEL, NB_PRIMARY, NB_SECONDARY, NB_STICKER } from '../nb/nbStyles';
import { GRADE_BANDS, type GradeBand } from './classSetupDefaults';
import { StarterPackRow } from './StarterPackRow';
import { SETUP_FIELD_LABEL, SetupOwnWordsField, type SetupOwnWords } from './SetupOwnWordsField';
import { SetupStepStrip } from './SetupStepStrip';
import { SetupCodePreview } from './SetupCodePreview';

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
  onCreateOnly?: () => void;
  skipHref: string;
  ownWords?: SetupOwnWords;
  t: T;
}

const FIELD_LABEL = SETUP_FIELD_LABEL;

/** Name, then Create class. Grade, language and the first list have defaults, shown as stickers behind one "Change" row. */
export function ClassSetupDetails(props: ClassSetupDetailsProps) {
  const { name, onNameChange, grade, onGradeChange, language, onLanguageChange, cap, busy, errorKey, t } = props;
  const placeholder = t(grade ? `eduShell.setup.gradeName.${grade}` : 'eduShell.setup.namePlaceholder');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const own = props.ownWords;
  const ownCount = own && own.count >= own.min ? own.count : null;
  return (
    <form
      data-testid="setup-step-details"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) props.onStartLive();
      }}
      className="flex flex-col gap-3 sm:gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 data-wipe className="font-neo-display text-3xl font-black leading-none text-neo-cream sm:text-4xl">{t('eduShell.setup.title')}</h1>
        <Link href={props.skipHref} data-testid="setup-skip" className={cn(NB_LINK, 'shrink-0')}>
          {t('eduShell.setup.skip')}
        </Link>
      </div>
      <SetupStepStrip current={0} t={t} />
      <SetupCodePreview name={name} placeholder={placeholder} t={t} />

      <div className={cn(NB_PANEL, 'flex flex-col gap-3 p-3.5 sm:p-5')}>
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
            className={NB_INPUT}
          />
        </div>

        {own ? <SetupOwnWordsField own={own} t={t} /> : null}

        <ul data-testid="setup-advanced-summary" aria-label={t('eduShell.setup.advancedOpen')} className="flex flex-wrap gap-1.5">
          <li className={cn(NB_STICKER, NB_BLOCK.cream)}>
            <span aria-hidden="true">{languageFlag(language)}</span>
            {nativeLanguageName(language)}
          </li>
          <li className={cn(NB_STICKER, NB_BLOCK.cyan)}>
            {ownCount !== null
              ? t('eduShell.setup.ownWords.sticker', { count: ownCount })
              : `${t('eduShell.setup.packSticker', { name: t(props.pack.nameKey) })} · ${t('eduShell.setup.packWords', { count: props.pack.words.length })}`}
          </li>
          <li className={cn(NB_STICKER, NB_BLOCK.cream)}>
            {grade ? t(`eduShell.setup.grade.${grade}`) : t('eduShell.setup.anyGrade')}
          </li>
        </ul>
        {ownCount !== null ? (
          <p data-testid="setup-own-list-hint" className="font-neo-body text-sm font-semibold text-neo-cream/80">
            {t('eduShell.setup.ownWords.listHint', { count: ownCount })}
          </p>
        ) : (
          <p data-testid="setup-starter-list-hint" className="font-neo-body text-sm font-semibold text-neo-cream/80">
            {t('eduShell.setup.starterListHint', { name: t(props.pack.nameKey) })}
          </p>
        )}

        <button
          type="button"
          data-testid="setup-advanced-toggle"
          aria-expanded={advancedOpen}
          aria-controls="setup-advanced"
          onClick={() => setAdvancedOpen((open) => !open)}
          className={NB_ADVANCED}
        >
          {t(advancedOpen ? 'eduShell.setup.advancedClose' : 'eduShell.setup.advancedOpen')}
          <ChevronDown className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', advancedOpen && 'rotate-180')} aria-hidden="true" />
        </button>

        {advancedOpen ? (
          <div id="setup-advanced" className="flex flex-col gap-3 max-sm:[&_p[id$='-hint']]:hidden">
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
                        'inline-flex min-h-10 items-center gap-1 rounded-neo-pill border-2 border-neo-black px-3 font-neo-body text-sm font-black shadow-hard transition-transform duration-150 active:translate-x-px active:translate-y-px motion-reduce:transition-none',
                        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                        on ? NB_BLOCK.lime : NB_BLOCK.cream,
                      )}
                    >
                      {on ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : null}
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
              variant="compact"
              selection="ring"
              showBoardHint
            />
            <StarterPackRow packs={props.packs} selectedKey={props.pack.nameKey} recommendedKey={props.recommendedKey} onSelect={props.onPackChange} t={t} />
          </div>
        ) : null}
      </div>

      {errorKey ? (
        <p role="alert" className={cn(NB_STICKER, NB_BLOCK.pink, 'whitespace-normal rounded-neo-lg px-3 py-2 text-sm')}>
          {t(errorKey)}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="setup-start-live"
        data-hero="true"
        disabled={busy !== null}
        aria-busy={busy === 'live' || undefined}
        className={cn(NB_PRIMARY, 'min-h-[60px] w-full text-2xl')}
      >
        {busy === 'live' ? <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
        {t(errorKey ? 'eduShell.setup.retry' : 'eduShell.setup.createClass')}
      </button>
      {props.onCreateOnly ? (
        <button
          type="button"
          data-testid="setup-create"
          disabled={busy !== null}
          aria-busy={busy === 'create' || undefined}
          onClick={props.onCreateOnly}
          className={cn(NB_SECONDARY, 'w-full')}
        >
          {busy === 'create' ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {t(busy === 'create' ? 'eduShell.setup.creating' : 'eduShell.setup.createOnly')}
        </button>
      ) : null}

      {cap ? (
        <p data-testid="setup-cap-meter" className="text-center font-neo-body text-xs font-bold text-neo-cream/75">
          {t('eduShell.setup.capMeter', { count: cap.count, limit: cap.limit })}
        </p>
      ) : null}
    </form>
  );
}

export default ClassSetupDetails;
