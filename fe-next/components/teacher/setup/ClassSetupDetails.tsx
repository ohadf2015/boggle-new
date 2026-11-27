'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { PressSurface } from '@/components/motion/PressSurface';
import { cn } from '@/lib/utils';
import type { Language } from '@/lib/supabase/education/types';
import type { StarterLessonPack } from '@/lib/education/starterLessonPacks';
import { LanguagePicker } from '@/components/education/pickers/LanguagePicker';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { languageFlag } from '@/lib/i18n/languageLabels';
import { EduMascot } from '@/components/education/EduMascot';
import { NB_ADVANCED, NB_BLOCK, NB_INPUT, NB_LINK, NB_PRIMARY_FACE, NB_SECONDARY, NB_STICKER } from '../nb/nbStyles';
import { SetupCodePreview } from './SetupCodePreview';
import { GRADE_BANDS, type GradeBand } from './classSetupDefaults';
import { StarterPackRow } from './StarterPackRow';
import { SETUP_FIELD_LABEL, SetupOwnWordsField, type SetupOwnWords } from './SetupOwnWordsField';

type T = (key: string, params?: Record<string, string | number>) => string;

export type SetupBusy = 'live' | 'create' | 'done' | null;

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
// The name field and the fold sit on white cards, so the field itself is white with a black edge too.
const NAME_INPUT = 'border-edu-line bg-edu-surface text-edu-ink shadow-edu-lip-sm placeholder:text-edu-ink/45';
const FOLD = 'rounded-neo-xl border-solid bg-edu-surface p-4 text-base font-black text-edu-ink shadow-edu-lip sm:p-5';
const STICKER_BIG = 'px-3 py-1 text-sm shadow-edu-lip-sm';

/** One name field and one Create button; language, grade and the first word list wait behind one fold that names them. */
export function ClassSetupDetails(props: ClassSetupDetailsProps) {
  const { name, onNameChange, grade, onGradeChange, language, onLanguageChange, cap, busy, errorKey, t } = props;
  const placeholder = t(grade ? `eduShell.setup.gradeName.${grade}` : 'eduShell.setup.namePlaceholder');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const own = props.ownWords;
  const ownCount = own && own.count >= own.min ? own.count : null;
  // Half a list typed must stay in view, or the class silently gets the starter pack instead.
  const ownIncomplete = !!own && own.text.trim() !== '' && own.count < own.min;
  const foldOpen = advancedOpen || ownIncomplete;
  const listLabel =
    ownCount !== null
      ? t('eduShell.setup.ownWords.sticker', { count: ownCount })
      : `${t('eduShell.setup.packSticker', { name: t(props.pack.nameKey) })} · ${t('eduShell.setup.packWords', { count: props.pack.words.length })}`;
  return (
    <form
      data-testid="setup-step-details"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) props.onStartLive();
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-5 py-2 sm:gap-6">
        <div className="flex items-center gap-3">
          <EduMascot moment="success" size={112} className="size-16 shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))] sm:size-24" />
          <h1 data-wipe className="font-neo-display text-5xl font-black leading-none text-edu-ink sm:text-6xl">{t('eduShell.setup.title')}</h1>
        </div>

        <div data-testid="setup-name-card" className="edu-card flex flex-col gap-2 p-4 sm:p-5">
          <label htmlFor="setup-name" className={cn(FIELD_LABEL, 'text-lg')}>
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
            className={cn(NB_INPUT, NAME_INPUT, 'min-h-16 text-xl')}
          />
        </div>

        <SetupCodePreview name={name} t={t} />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-testid="setup-advanced-toggle"
            aria-expanded={foldOpen}
            aria-controls="setup-advanced"
            disabled={ownIncomplete}
            onClick={() => setAdvancedOpen((open) => !open)}
            className={cn(NB_ADVANCED, FOLD)}
          >
            <span className="flex min-w-0 flex-col">
              <span>{t(foldOpen ? 'eduShell.setup.advancedClose' : 'eduShell.setup.advancedOpen')}</span>
              <span data-testid="setup-advanced-summary" className="mt-2.5 flex min-w-0 flex-wrap gap-2">
                <span data-sticker className={cn(NB_STICKER, NB_BLOCK.cream, STICKER_BIG)}>{languageFlag(language)} {nativeLanguageName(language)}</span>
                <span data-sticker className={cn(NB_STICKER, NB_BLOCK.cyan, STICKER_BIG, 'min-w-0 truncate')}>{listLabel}</span>
                <span data-sticker className={cn(NB_STICKER, NB_BLOCK.cream, STICKER_BIG)}>{grade ? t(`eduShell.setup.grade.${grade}`) : t('eduShell.setup.anyGrade')}</span>
              </span>
            </span>
            <ChevronDown className={cn('size-6 shrink-0 transition-transform motion-reduce:transition-none', foldOpen && 'rotate-180')} aria-hidden="true" />
          </button>

          {foldOpen ? (
            <div id="setup-advanced" className="flex flex-col gap-4 max-sm:[&_p[id$='-hint']]:hidden">
              {own ? <SetupOwnWordsField own={own} t={t} /> : null}
              {ownCount !== null ? (
                <p data-testid="setup-own-list-hint" className="font-neo-body text-sm font-semibold text-edu-ink/80">
                  {t('eduShell.setup.ownWords.listHint', { count: ownCount })}
                </p>
              ) : (
                <p data-testid="setup-starter-list-hint" className="font-neo-body text-sm font-semibold text-edu-ink/80">
                  {t('eduShell.setup.starterListHint', { name: t(props.pack.nameKey) })}
                </p>
              )}
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
                          'inline-flex min-h-11 items-center gap-1 rounded-neo-pill border-2 border-neo-black px-3 font-neo-body text-sm font-black shadow-hard transition-transform duration-150 active:translate-x-px active:translate-y-px motion-reduce:transition-none',
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
          <p role="alert" className="font-neo-body text-base font-bold text-edu-pink-ink">
            {t(errorKey)}
          </p>
        ) : null}

        <PressSurface
          lip={6}
          type="submit"
          data-testid="setup-start-live"
          data-hero="true"
          disabled={busy !== null}
          aria-busy={busy === 'live' || undefined}
          className={cn(NB_PRIMARY_FACE, 'min-h-[80px] w-full text-3xl sm:min-h-[88px] sm:text-4xl', busy === 'done' && 'disabled:opacity-100')}
        >
          {busy === 'live' ? <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
          {busy === 'done' ? <Check className="size-7" strokeWidth={3} aria-hidden="true" /> : null}
          {busy === 'live'
            ? t('eduShell.setup.creating')
            : busy === 'done'
              ? t('eduShell.setup.readyTitle')
              : t(errorKey ? 'eduShell.setup.retry' : 'eduShell.setup.createClass')}
        </PressSurface>
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <Link href={props.skipHref} data-testid="setup-skip" className={NB_LINK}>
          {t('eduShell.setup.skip')}
        </Link>
        {cap ? (
          <p data-testid="setup-cap-meter" className="font-neo-body text-sm font-bold text-edu-ink/80">
            {t('eduShell.setup.capMeter', { count: cap.count, limit: cap.limit })}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export default ClassSetupDetails;
