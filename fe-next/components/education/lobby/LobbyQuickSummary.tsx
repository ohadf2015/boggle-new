'use client';

import { BookOpen, SlidersHorizontal, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BoardLanguageChip } from '../pickers/BoardLanguageChip';

export interface LobbyQuickSummaryProps {
  classroomName: string;
  lessonNames: string[];
  wordCount: number;
  boardLanguage?: string | null;
  onMoreOptions: () => void;
}

/** A quick launch arrives decided: say what is about to go live, and keep every other choice one tap away. */
export function LobbyQuickSummary({ classroomName, lessonNames, wordCount, boardLanguage, onMoreOptions }: LobbyQuickSummaryProps) {
  const { t } = useLanguage();
  return (
    <section
      data-testid="lobby-quick-summary"
      className="flex flex-col gap-3 rounded-neo-lg border-2 border-neo-cream/45 bg-neo-navy/85 p-4"
    >
      <p className="flex min-w-0 items-center gap-2 font-neo-display text-base font-black text-neo-cream">
        <Users className="size-5 shrink-0 text-neo-cyan" strokeWidth={3} aria-hidden="true" />
        <span className="min-w-0 truncate" dir="auto">{classroomName}</span>
      </p>
      <p className="flex min-w-0 flex-wrap items-center gap-2 font-neo-body text-sm font-bold text-neo-cream/90">
        <BookOpen className="size-5 shrink-0 text-neo-lime" strokeWidth={3} aria-hidden="true" />
        <span className="min-w-0 truncate" dir="auto">{lessonNames.join(', ')}</span>
        <span className="shrink-0 text-neo-cream/70">· {t('education.classroomGame.words', { count: wordCount })}</span>
        {boardLanguage && <BoardLanguageChip language={boardLanguage} />}
      </p>
      <button
        type="button"
        data-testid="lobby-more-options"
        onClick={onMoreOptions}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-neo border-2 border-neo-cream/60 bg-neo-navy-light px-4 font-neo-display text-sm font-black uppercase text-neo-cream transition-colors hover:border-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy"
      >
        <SlidersHorizontal className="size-4" strokeWidth={3} aria-hidden="true" />
        {t('eduShell.host.moreOptions')}
      </button>
    </section>
  );
}

export default LobbyQuickSummary;
