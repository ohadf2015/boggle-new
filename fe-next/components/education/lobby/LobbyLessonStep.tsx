'use client';

import { useState, type ReactNode } from 'react';
import { BookOpen, ChevronDown, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { SPED_VOCAB_CAP, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import type { VocabularyLesson } from '@/lib/supabase/education';
import { LessonPicker } from '../pickers/LessonPicker';
import { BoardLanguageChip } from '../pickers/BoardLanguageChip';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

export interface LobbyLessonStepProps {
  lessons: VocabularyLesson[];
  selectedLessonIds: string[];
  onChange: (ids: string[]) => void;
  classLanguage?: string | null;
  createHref: string;
  wordCount: number;
  boardLanguage?: string | null;
  activePreset: ClassroomPresetId | null;
  className?: string;
  /** Named first on the line, so the teacher sees which class is about to play. */
  classroomName?: string;
  /** The class picker, shown in the opened line (it renders nothing for one class). */
  classPicker?: ReactNode;
}

/** The class and its word list: one confirm-at-a-glance line, with the pickers one tap away and open when nothing is chosen. */
export function LobbyLessonStep({ lessons, selectedLessonIds, onChange, classLanguage, createHref, wordCount, boardLanguage, activePreset, className, classroomName, classPicker }: LobbyLessonStepProps) {
  const { t, language } = useLanguage();
  const [opened, setOpened] = useState(false);
  const missing = selectedLessonIds.length === 0 || wordCount === 0;
  const open = opened || missing;
  const names = lessons.filter((l) => selectedLessonIds.includes(l.id)).map((l) => l.name).join(', ');

  return (
    <section data-testid="lobby-lesson-step" data-lobby-expanded={open || undefined} className={cn('flex flex-col gap-3', className)}>
      <button
        type="button"
        data-testid="lobby-lesson-toggle"
        aria-expanded={open}
        disabled={missing}
        onClick={() => setOpened((v) => !v)}
        className={cn(
          'flex min-h-12 w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-neo border-2 px-3 py-1.5 text-start font-neo-body text-sm font-bold transition-colors',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface',
          missing
            ? 'border-neo-pink bg-edu-surface text-edu-ink'
            : 'border-edu-line bg-edu-surface text-edu-ink hover:border-edu-line',
          'border-s-[6px] border-s-neo-cyan hover:border-s-neo-cyan'
        )}
      >
        {missing ? (
          <TriangleAlert className="size-4 shrink-0 text-edu-pink-ink" strokeWidth={3} aria-hidden="true" />
        ) : (
          <BookOpen className="size-4 shrink-0 text-edu-ink/70" strokeWidth={2.5} aria-hidden="true" />
        )}
        <span
          {...(missing ? { 'data-testid': 'mode-picker-blocked', role: 'alert' } : {})}
          className="min-w-0 flex-[1_1_auto]"
          dir="auto"
        >
          {missing ? t('education.modePicker.needsLesson') : classroomName ? `${classroomName} · ${names}` : names}
        </span>
        {!missing && (
          <span className="shrink-0 font-normal text-edu-ink/70">{t(pluralKeyOf('education.classroomGame.words', wordCount, language), { count: wordCount })}</span>
        )}
        {boardLanguage && !missing && (
          <BoardLanguageChip language={boardLanguage} className="rounded-full border border-edu-line bg-transparent font-normal text-edu-ink/80" />
        )}
        {!missing && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-neo border-2 border-edu-line px-2.5 py-1 font-neo-body text-xs font-bold text-edu-ink">
            {t(open ? 'eduShell.host.listDone' : classPicker ? 'eduShell.host.gameOptionsChange' : 'eduShell.host.changeList')}
            <ChevronDown className={cn('size-3.5 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </button>

      {open && (
        <div data-testid="lobby-lesson-body" className="flex flex-col gap-3 rounded-neo border-2 border-edu-line bg-edu-surface p-3">
          {classPicker}
          <LessonPicker
            mode="multi"
            lessons={lessons}
            selectedIds={selectedLessonIds}
            onChange={(ids) => {
              if (missing) setOpened(true);
              onChange(ids);
            }}
            classLanguage={classLanguage}
            createHref={createHref}
          />
          {activePreset === 'sped' && wordCount > SPED_VOCAB_CAP && (
            <p className="mt-2 font-neo-body text-xs text-edu-ink/60" data-testid="sped-vocab-cap-note">
              {t('teacher.classroom.support.vocabCapNote', { count: SPED_VOCAB_CAP })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default LobbyLessonStep;
