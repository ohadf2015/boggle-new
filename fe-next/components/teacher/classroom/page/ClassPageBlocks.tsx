'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight, ClipboardList, Plus, Trash2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { HOME_ROW, OUTLINE_BUTTON, PANEL, QUIET_LINK } from '../../home/homeStyles';
import type { ClassWordList } from './classWordLists';
import ListNameButton from '@/components/teacher/lesson-creation/ListNameButton';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassLastGameSummary {
  playedAt: string;
  players: readonly { name: string; score: number }[];
  participation: { played: number; roster: number };
  coveragePct: number;
  totalLessonWords: number;
}

export interface ClassLastGameState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  game: ClassLastGameSummary | null;
}

const TITLE = 'font-neo-display text-base font-black leading-tight text-neo-cream';
const LINE = 'truncate font-neo-body text-xs font-bold text-neo-cream/75';

/** The last class game as one row that opens its results; hidden until a game exists. */
export function ClassLastGame({ state, resultsHref, language, t }: { state: ClassLastGameState; resultsHref: string; language: string; t: T }) {
  const game = state.game;
  if (state.status === 'loading' || state.status === 'idle') {
    return <div data-testid="class-page-last-game" aria-busy="true" className={cn(PANEL, 'h-[60px] motion-safe:animate-pulse')} />;
  }
  if (state.status === 'error') {
    return (
      <p data-testid="class-page-last-game" className={cn(PANEL, 'px-4 py-3 font-neo-body text-sm font-bold text-neo-cream/80')}>
        {t('teacher.lastGame.error')}
      </p>
    );
  }
  if (!game) return null;
  const top = game.players[0];
  const facts = [
    new Date(game.playedAt).toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' }),
    top && top.score > 0 ? t('teacher.lastGame.topScorer', { name: top.name, score: top.score }) : null,
    t(pluralKeyOf('teacher.lastGame.playersPlayed', game.participation.played, language), { count: game.participation.played }),
    game.totalLessonWords > 0 ? t('teacher.classPage.coverage', { pct: Math.round(game.coveragePct) }) : null,
  ].filter(Boolean).join(' · ');
  return (
    <div data-testid="class-page-last-game">
      <Link href={resultsHref} className={HOME_ROW}>
        <Trophy className="size-6 shrink-0 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={TITLE}>{t('teacher.lastGame.title')}</span>
          <bdi className={LINE}>{facts}</bdi>
        </span>
        <DirectionalIcon icon={ChevronRight} className="size-5 shrink-0" />
      </Link>
    </div>
  );
}

/** The class's word lists, folded; with none yet, only the way to make one. */
export function ClassWordLists({ lists, loading, libraryHref, language, t }: { lists: readonly ClassWordList[]; loading: boolean; libraryHref: string; language: string; t: T }) {
  const create = (
    <Link href={libraryHref} className={cn(QUIET_LINK, 'self-start')}>
      <Plus className="size-4" aria-hidden="true" />
      {t('eduLibrary.editor.createTitle')}
    </Link>
  );
  return (
    <section data-testid="class-page-lists" aria-label={t('eduHq.lists.label')} className="min-w-0">
      {loading ? (
        <div aria-busy="true" className={cn(PANEL, 'h-[60px] motion-safe:animate-pulse')} />
      ) : lists.length > 0 ? (
        <details data-testid="class-page-lists-fold" className={cn(PANEL, 'group')}>
          <summary className="flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-4 py-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan [&::-webkit-details-marker]:hidden">
            <ClipboardList className="size-6 shrink-0 text-neo-cyan" strokeWidth={2.5} aria-hidden="true" />
            <span className={cn(TITLE, 'flex-1')}>{t('eduHq.lists.label')}</span>
            <span className="font-neo-body text-sm font-bold tabular-nums text-neo-cream/70">{lists.length}</span>
            <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <ul className="flex flex-col divide-y divide-neo-cream/10 border-t-2 border-neo-cream/10 px-4">
            {lists.slice(0, 5).map((l) => (
              <li key={l.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
                <ListNameButton lessonId={l.id} name={l.name} className="min-w-0 truncate font-neo-body text-sm font-black text-neo-cream" />
                <span className="shrink-0 font-neo-body text-xs font-bold tabular-nums text-neo-cream/70">{t(pluralKeyOf('eduLibrary.card.words', l.wordCount, language), { count: l.wordCount })}</span>
              </li>
            ))}
          </ul>
          <div className="px-2 pb-2">{create}</div>
        </details>
      ) : (
        create
      )}
    </section>
  );
}

export function ClassDangerZone({ onRequestDelete, t }: { onRequestDelete: () => void; t: T }) {
  return (
    <section
      id="delete"
      data-testid="class-page-danger"
      aria-labelledby="class-danger-title"
      className="flex items-center justify-between gap-3 border-t-2 border-neo-cream/10 pt-4"
    >
      <h2 id="class-danger-title" className="font-neo-body text-sm font-bold text-neo-cream/70">{t('settings.dangerZone')}</h2>
      <button type="button" onClick={onRequestDelete} data-testid="delete-class-affordance" className={cn(OUTLINE_BUTTON, 'min-h-11 shrink-0 px-3 text-neo-red hover:text-neo-red')}>
        <Trash2 className="size-4" aria-hidden="true" />
        {t('teacher.classroom.delete')}
      </button>
    </section>
  );
}
