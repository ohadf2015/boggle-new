'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { SPED_VOCAB_CAP, type ClassroomPresetId } from '@/lib/education/classroomPresets';
import type { VocabularyLesson } from '@/lib/supabase/education';
import { LessonPicker } from '../pickers/LessonPicker';
import { BoardLanguageChip } from '../pickers/BoardLanguageChip';

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
}

/** The word list: one confirm-at-a-glance row, with the picker one tap away and open when nothing is chosen. */
export function LobbyLessonStep({ lessons, selectedLessonIds, onChange, classLanguage, createHref, wordCount, boardLanguage, activePreset, className }: LobbyLessonStepProps) {
  const { t } = useLanguage();
  const [opened, setOpened] = useState(false);
  const missing = selectedLessonIds.length === 0 || wordCount === 0;
  const open = opened || missing;
  const names = lessons.filter((l) => selectedLessonIds.includes(l.id)).map((l) => l.name).join(', ');

  return (
    <section data-testid="lobby-lesson-step" className={cn('flex flex-col gap-3', className)}>
      <button
        type="button"
        data-testid="lobby-lesson-toggle"
        aria-expanded={open}
        disabled={missing}
        onClick={() => setOpened((v) => !v)}
        className={cn(
          'flex min-h-11 w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-neo border-2 px-3 py-1.5 text-start font-neo-body text-sm font-bold transition-colors',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          missing
            ? 'border-neo-pink bg-neo-navy-light text-neo-white'
            : 'border-neo-cream/35 bg-neo-navy-light text-neo-cream hover:border-neo-cream/50'
        )}
      >
        {missing ? (
          <TriangleAlert className="size-4 shrink-0 text-neo-pink" strokeWidth={3} aria-hidden="true" />
        ) : (
          <BookOpen className="size-4 shrink-0 text-neo-cream/70" strokeWidth={2.5} aria-hidden="true" />
        )}
        <span
          {...(missing ? { 'data-testid': 'mode-picker-blocked', role: 'alert' } : {})}
          className="min-w-0 flex-[1_1_auto]"
          dir="auto"
        >
          {missing ? t('education.modePicker.needsLesson') : names}
        </span>
        {!missing && (
          <span className="shrink-0 font-normal text-neo-cream/70">{t('education.classroomGame.words', { count: wordCount })}</span>
        )}
        {boardLanguage && !missing && (
          <BoardLanguageChip language={boardLanguage} className="rounded-full border border-neo-cream/35 bg-transparent font-normal text-neo-cream/80" />
        )}
        {!missing && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-neo border-2 border-neo-cream/50 px-2.5 py-1 font-neo-body text-xs font-bold text-neo-cream">
            {t(open ? 'eduShell.host.listDone' : 'eduShell.host.changeList')}
            <ChevronDown className={cn('size-3.5 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </button>

      {open && (
        <div data-testid="lobby-lesson-body" className="rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light p-3">
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
            <p className="mt-2 font-neo-body text-xs text-neo-white/60" data-testid="sped-vocab-cap-note">
              {t('teacher.classroom.support.vocabCapNote', { count: SPED_VOCAB_CAP })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default LobbyLessonStep;
