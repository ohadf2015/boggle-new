'use client';

import { BookOpen, SlidersHorizontal, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BoardLanguageChip } from '../pickers/BoardLanguageChip';
import ListNameButton from '@/components/teacher/lesson-creation/ListNameButton';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

export interface LobbyQuickSummaryProps {
  classroomName: string;
  lessons: ReadonlyArray<{ id: string; name: string }>;
  wordCount: number;
  boardLanguage?: string | null;
  onMoreOptions: () => void;
}

/** A quick launch arrives decided: say what is about to go live, and keep every other choice one tap away. */
export function LobbyQuickSummary({ classroomName, lessons, wordCount, boardLanguage, onMoreOptions }: LobbyQuickSummaryProps) {
  const { t, language } = useLanguage();
  return (
    <section data-testid="lobby-quick-summary" className="flex flex-col gap-2 @2xl/lobby:flex-row @2xl/lobby:items-center">
      <p className="flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-neo border-2 border-s-[6px] border-edu-line border-s-neo-cyan bg-edu-surface px-3 py-1.5 font-neo-body text-sm font-bold text-edu-ink">
        <Users className="size-4 shrink-0 text-edu-ink/70" strokeWidth={3} aria-hidden="true" />
        <span className="min-w-0 truncate" dir="auto">{classroomName}</span>
        <BookOpen className="size-4 shrink-0 text-edu-ink/70" strokeWidth={3} aria-hidden="true" />
        <span className="flex min-w-0 flex-wrap gap-x-2" dir="auto">
          {lessons.map((l) => <ListNameButton key={l.id} lessonId={l.id} name={l.name} />)}
        </span>
        <span className="shrink-0 font-normal text-edu-ink/70">· {t(pluralKeyOf('education.classroomGame.words', wordCount, language), { count: wordCount })}</span>
        {boardLanguage && <BoardLanguageChip language={boardLanguage} className="rounded-full border border-edu-line bg-transparent font-normal text-edu-ink/80" />}
      </p>
      <button
        type="button"
        data-testid="lobby-more-options"
        onClick={onMoreOptions}
        className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-neo-lg border-[3px] border-dashed border-edu-line px-4 font-neo-body text-sm font-bold text-edu-ink transition-colors hover:border-edu-line focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface"
      >
        <SlidersHorizontal className="size-4" strokeWidth={3} aria-hidden="true" />
        {t('eduShell.host.moreOptions')}
      </button>
    </section>
  );
}

export default LobbyQuickSummary;
