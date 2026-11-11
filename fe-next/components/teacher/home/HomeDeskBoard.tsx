'use client';

import { useId, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, ChevronUp, Send } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { AnimatedNumber, useReducedMotionSafe } from '@/components/education/motion';
import { NB_BLOCK } from '../nb/nbStyles';
import { GAME_CARD, GAME_CARD_HOVER, QUIET_LINK, SKELETON } from './homeStyles';
import { HomeClassRoster } from './HomeClassRoster';
import { StatusDot } from './HomeRosterDetail';
import { rosterCounts, type RosterRow, type RosterStatus } from './rosterModel';

type T = (key: string, params?: Record<string, string | number>) => string;

const STATUSES: readonly RosterStatus[] = ['done', 'late', 'idle'];
const TILE = cn(
  GAME_CARD,
  GAME_CARD_HOVER,
  'group relative flex min-h-[4.75rem] min-w-0 flex-col items-start justify-between gap-1 px-3 py-2.5 text-start focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
);
const TILE_FACE: Record<RosterStatus, string> = {
  done: 'text-neo-cream',
  late: cn(NB_BLOCK.yellow, 'border-neo-black'),
  idle: 'text-neo-cream',
};
const NUMBER: Record<RosterStatus, string> = {
  done: 'text-neo-lime',
  late: 'text-neo-black',
  idle: 'text-neo-cream',
};
const LABEL = 'font-neo-body text-sm font-black leading-tight';

export interface HomeDeskBoardProps {
  /** null for a free teacher: per-student rows stay behind Pro. */
  roster: { rows: readonly RosterRow[] | null; failed: boolean } | null;
  memberCount: number;
  /** The one results entry on Home: weekly numbers, the parent email and the full results hub. */
  onOpenResults: () => void;
  readyLabel?: string | null;
  readyEmpty?: string | null;
  missed?: { count: number; onHomework: () => void } | null;
  onAssign?: (row: RosterRow) => void;
  onAssignAll?: () => void;
  language: string;
  nowMs: number;
  t: T;
}

/** Under the desk: who played, who is behind, who has not started, and the results; the roster opens from a tile. */
export function HomeDeskBoard({ roster, memberCount, onOpenResults, readyLabel, readyEmpty, missed, onAssign, onAssignAll, language, nowMs, t }: HomeDeskBoardProps) {
  const wide = useMediaQuery('(min-width: 1024px)');
  // Unset until the teacher picks: desktop shows the whole class, a phone keeps it folded.
  const [choice, setOpen] = useState<RosterStatus | 'all' | null | undefined>(undefined);
  const open = choice === undefined ? (wide ? 'all' : null) : choice;
  const rosterId = useId();
  const foldRef = useRef<HTMLDivElement>(null);
  const rows = roster?.rows ?? null;
  const counts = rows ? rosterCounts(rows) : null;
  const pending = roster !== null && rows === null && !roster.failed && memberCount > 0;
  const showTiles = Boolean(counts && rows && rows.length > 0);
  const missedShown = !showTiles && !pending && Boolean(missed && missed.count > 0);
  const reduced = useReducedMotionSafe();

  const toggle = (next: RosterStatus | 'all') => {
    const value = open === next ? null : next;
    setOpen(value);
    if (value) requestAnimationFrame(() => foldRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }));
  };

  return (
    <section data-testid="home-desk-board" aria-label={t('eduShell.home.roster.title')} className="flex min-w-0 flex-col gap-2.5">
      <div className={cn('grid gap-2.5 sm:gap-3', showTiles || pending ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2')}>
        {pending
          ? STATUSES.map((s) => <span key={s} data-testid="home-status-tile-loading" aria-hidden="true" className={cn(SKELETON, 'min-h-[4.75rem]')} />)
          : null}
        {showTiles && counts
          ? STATUSES.map((s, i) => (
              <button
                key={s}
                type="button"
                data-testid="home-status-tile"
                data-status={s}
                aria-expanded={open === s}
                aria-controls={rosterId}
                disabled={counts[s] === 0}
                onClick={() => toggle(s)}
                style={{ animationDelay: `${120 + i * 70}ms` }}
                className={cn(TILE, TILE_FACE[s], 'animate-edu-tile-in motion-reduce:animate-none disabled:pointer-events-none', open === s && 'ring-4 ring-neo-cyan')}
              >
                <span className="sr-only">{t(`eduShell.home.roster.count.${s}`, { count: counts[s] })}</span>
                <span aria-hidden="true" className={cn('font-neo-display text-3xl font-black tabular-nums leading-none', NUMBER[s])}>
                  <AnimatedNumber to={counts[s]} />
                </span>
                <span aria-hidden="true" className={cn(LABEL, 'flex min-w-0 items-center gap-1.5')}>
                  {s === 'late' ? null : <StatusDot status={s} />}
                  <span className="min-w-0 break-words">{t(`eduShell.home.roster.statusShort.${s}`)}</span>
                </span>
              </button>
            ))
          : null}
        {missedShown && missed ? (
          <button type="button" data-testid="home-homework" onClick={missed.onHomework} className={cn(TILE, NB_BLOCK.yellow, 'flex-row items-center justify-start gap-2.5 border-neo-black max-sm:min-h-[3.25rem]')}>
            <Send className="size-6 shrink-0 rtl:-scale-x-100" strokeWidth={2.5} aria-hidden="true" />
            <span className={LABEL}>{t('eduShell.home.loop.missed', { count: missed.count })}</span>
          </button>
        ) : null}
        <div data-testid="home-weekly-reports" className={cn('min-w-0', (showTiles || pending) && 'max-sm:col-span-3', !showTiles && !pending && !missedShown && 'sm:col-span-2')}>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onOpenResults}
            className={cn(TILE, NB_BLOCK.purple, 'h-full w-full flex-row items-center justify-start gap-2.5 border-neo-black max-sm:min-h-[3.25rem]')}
          >
            <BarChart3 className="size-7 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-neo-display text-base font-black leading-tight">{t('eduShell.home.seeResults')}</span>
              {readyLabel ? (
                <span data-testid="home-ready-chip" className="font-neo-body text-xs font-bold leading-snug text-white/85">{readyLabel}</span>
              ) : readyEmpty ? (
                <span data-testid="home-ready-empty" className="font-neo-body text-xs font-bold leading-snug text-white/85">{readyEmpty}</span>
              ) : null}
            </span>
            <ChevronRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 motion-reduce:transition-none" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showTiles && rows ? (
        <div ref={foldRef} className="flex min-w-0 flex-col gap-2">
          <button
            type="button"
            data-testid="home-roster-see-all"
            aria-expanded={open !== null}
            aria-controls={rosterId}
            onClick={() => (open ? setOpen(null) : toggle('all'))}
            className={cn(QUIET_LINK, 'self-start')}
          >
            {open ? t('eduShell.home.roster.hide') : t('eduShell.home.roster.seeAll', { count: rows.length })}
            {open ? <ChevronUp className="size-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="size-4 shrink-0" aria-hidden="true" />}
          </button>
          {open ? (
            <div id={rosterId}>
              <HomeClassRoster
                rows={rows}
                filter={open === 'all' ? null : open}
                onClearFilter={() => setOpen('all')}
                failed={false}
                language={language}
                nowMs={nowMs}
                t={t}
                onAssign={onAssign}
                onAssignAll={onAssignAll}
              />
            </div>
          ) : null}
        </div>
      ) : roster?.failed ? (
        <p data-testid="home-roster-error" className="font-neo-body text-sm font-semibold text-neo-cream/75">{t('eduShell.home.roster.error')}</p>
      ) : null}
    </section>
  );
}
