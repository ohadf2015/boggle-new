'use client';

import Link from 'next/link';
import { BarChart3, ChevronRight, ClipboardList, Plus, Trash2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoButton } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { NB_BLOCK, NB_ICON_TILE, NB_PANEL, NB_SMALL, NB_STICKER } from '../../nb/nbStyles';
import type { ClassWordList } from './classWordLists';
import ListNameButton from '@/components/teacher/lesson-creation/ListNameButton';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassLastGameSummary {
  playedAt: string;
  players: readonly { name: string; score: number }[];
  participation: { played: number; roster: number };
  coveragePct: number;
}

export interface ClassLastGameState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  game: ClassLastGameSummary | null;
}

const CARD = cn(NB_PANEL, 'flex min-w-0 flex-col gap-3 p-4');
const HEAD = 'flex items-center gap-2 font-neo-display text-lg font-black leading-tight text-neo-cream';

export function ClassLastGame({ state, resultsHref, language, t }: { state: ClassLastGameState; resultsHref: string; language: string; t: T }) {
  const game = state.game;
  const top = game?.players[0];
  return (
    <section data-testid="class-page-last-game" aria-labelledby="class-last-game-title" className={CARD}>
      <h2 id="class-last-game-title" className={HEAD}>
        <span className={cn(NB_ICON_TILE, NB_BLOCK.yellow)} aria-hidden="true"><Trophy className="size-5" /></span>
        {t('teacher.lastGame.title')}
      </h2>
      {state.status === 'loading' || state.status === 'idle' ? (
        <div aria-busy="true" className="h-16 rounded-neo-lg bg-neo-cream/10 motion-safe:animate-pulse" />
      ) : game ? (
        <>
          <p className="font-neo-body text-sm font-bold text-neo-cream/75">
            {new Date(game.playedAt).toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {top ? (
              <span className={cn(NB_STICKER, NB_BLOCK.yellow, 'text-sm')}>
                <Trophy className="size-4" aria-hidden="true" />
                <bdi>{top.name}</bdi> · {top.score}
              </span>
            ) : null}
            <span className={cn(NB_STICKER, NB_BLOCK.cream, 'text-sm')}>{t('teacher.lastGame.playersPlayed', { count: game.participation.played })}</span>
            <span className={cn(NB_STICKER, NB_BLOCK.cyan, 'text-sm')}>{t('teacher.classPage.coverage', { pct: Math.round(game.coveragePct) })}</span>
          </div>
          <Link href={resultsHref} className={cn(NB_SMALL, NB_BLOCK.navy, 'self-start')}>
            <BarChart3 className="size-4" aria-hidden="true" />
            {t('eduShell.home.seeResults')}
            <DirectionalIcon icon={ChevronRight} className="size-4" />
          </Link>
        </>
      ) : (
        <p className="font-neo-body text-sm font-bold text-neo-cream/80">
          {t(state.status === 'error' ? 'teacher.lastGame.error' : 'teacher.lastGame.emptyTitle')}
        </p>
      )}
    </section>
  );
}

export function ClassWordLists({ lists, loading, libraryHref, t }: { lists: readonly ClassWordList[]; loading: boolean; libraryHref: string; t: T }) {
  return (
    <section data-testid="class-page-lists" aria-labelledby="class-lists-title" className={CARD}>
      <h2 id="class-lists-title" className={HEAD}>
        <span className={cn(NB_ICON_TILE, NB_BLOCK.cyan)} aria-hidden="true"><ClipboardList className="size-5" /></span>
        {t('eduHq.lists.label')}
      </h2>
      {loading ? (
        <div aria-busy="true" className="h-12 rounded-neo-lg bg-neo-cream/10 motion-safe:animate-pulse" />
      ) : lists.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {lists.slice(0, 5).map((l) => (
            <li key={l.id} className="flex min-h-11 items-center justify-between gap-3 rounded-neo-lg border-2 border-neo-cream/50 bg-neo-navy px-3 py-2">
              <ListNameButton lessonId={l.id} name={l.name} className="min-w-0 truncate font-neo-body text-sm font-black text-neo-cream" />
              <span className="shrink-0 font-neo-body text-xs font-bold tabular-nums text-neo-cream/70">{t('eduLibrary.card.words', { count: l.wordCount })}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-neo-body text-sm font-bold text-neo-cream/80">{t('teacher.classPage.noLists')}</p>
      )}
      <Link href={libraryHref} className={cn(NB_SMALL, NB_BLOCK.navy, 'self-start')}>
        <Plus className="size-4" aria-hidden="true" />
        {t('eduLibrary.editor.createTitle')}
      </Link>
    </section>
  );
}

export function ClassDangerZone({ onRequestDelete, t }: { onRequestDelete: () => void; t: T }) {
  return (
    <section
      id="delete"
      data-testid="class-page-danger"
      aria-labelledby="class-danger-title"
      className="flex flex-col gap-3 rounded-neo-xl border-[3px] border-dashed border-neo-red/70 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h2 id="class-danger-title" className="font-neo-display text-base font-black text-neo-cream">{t('settings.dangerZone')}</h2>
        <p className="font-neo-body text-sm font-semibold text-neo-cream/75">{t('teacher.classroom.confirmDelete')}</p>
      </div>
      <NeoButton
        variant="small"
        onClick={onRequestDelete}
        data-testid="delete-class-affordance"
        className="min-h-12 shrink-0 self-start border-neo-black bg-neo-red px-4 text-base text-neo-white sm:self-auto"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {t('teacher.classroom.delete')}
      </NeoButton>
    </section>
  );
}
