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
}

/** The word list: one confirm-at-a-glance row, with the picker one tap away and open when nothing is chosen. */
export function LobbyLessonStep({ lessons, selectedLessonIds, onChange, classLanguage, createHref, wordCount, boardLanguage, activePreset }: LobbyLessonStepProps) {
  const { t } = useLanguage();
  const [opened, setOpened] = useState(false);
  const missing = selectedLessonIds.length === 0 || wordCount === 0;
  const open = opened || missing;
  const names = lessons.filter((l) => selectedLessonIds.includes(l.id)).map((l) => l.name).join(', ');

  return (
    <section data-testid="lobby-lesson-step" className="flex flex-col gap-3">
      <button
        type="button"
        data-testid="lobby-lesson-toggle"
        aria-expanded={open}
        disabled={missing}
        onClick={() => setOpened((v) => !v)}
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-neo border-2 px-3 py-2 text-start font-neo-body text-sm font-bold transition-colors',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          missing
            ? 'border-neo-pink bg-neo-navy-light text-neo-white'
            : 'border-neo-cream/45 bg-neo-navy/80 text-neo-cream hover:bg-neo-navy'
        )}
      >
        {missing ? (
          <TriangleAlert className="size-4 shrink-0 text-neo-pink" strokeWidth={3} aria-hidden="true" />
        ) : (
          <BookOpen className="size-4 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
        )}
        <span
          {...(missing ? { 'data-testid': 'mode-picker-blocked', role: 'alert' } : {})}
          className="min-w-0 flex-1 truncate"
          dir="auto"
        >
          {missing ? t('education.modePicker.needsLesson') : names}
        </span>
        {!missing && (
          <span className="shrink-0 text-neo-cream/75">{t('education.classroomGame.words', { count: wordCount })}</span>
        )}
        {boardLanguage && !missing && <BoardLanguageChip language={boardLanguage} />}
        {!missing && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-black bg-neo-cyan px-3 py-1 font-neo-display text-xs font-black uppercase text-black shadow-hard-sm">
            {t(open ? 'eduShell.host.listDone' : 'eduShell.host.changeList')}
            <ChevronDown className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </button>

      {open && (
        <div data-testid="lobby-lesson-body" className="rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light/60 p-3">
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
