'use client';

import { useId, useState } from 'react';
import { BarChart3, ChevronDown, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { PressSurface } from '@/components/motion/PressSurface';
import { CountUp } from '@/components/motion/CountUp';
import { HomeClassRoster } from './HomeClassRoster';
import { rosterCounts, type RosterRow, type RosterStatus } from './rosterModel';

type T = (key: string, params?: Record<string, string | number>) => string;

const STATUSES: readonly RosterStatus[] = ['done', 'late', 'idle'];
const STAT_TONE: Record<RosterStatus, string> = { done: 'text-edu-lime-ink', late: 'text-edu-yellow-ink', idle: 'text-edu-ink' };

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

/** Under the desk: one strip with who played (it folds the roster open on a phone) and See results, then the roster on wide screens. */
export function HomeDeskBoard({ roster, memberCount, onOpenResults, readyLabel, readyEmpty, missed, onAssign, onAssignAll, language, nowMs, t }: HomeDeskBoardProps) {
  const wide = useMediaQuery('(min-width: 1024px)');
  const [opened, setOpened] = useState(false);
  const listId = useId();
  const rosterShown = roster !== null && memberCount > 0;
  const rows = rosterShown && !roster.failed ? roster.rows : null;
  const hasStudentsListed = rosterShown && !roster.failed && roster.rows !== null ? roster.rows.length > 0 : rosterShown && !roster.failed;
  const missedShown = !hasStudentsListed && Boolean(missed && missed.count > 0);
  // On wide screens the open roster's header already shows these counts.
  const counts = !wide && rows && rows.length > 0 ? rosterCounts(rows) : null;
  const split = Boolean(counts) || missedShown;
  const note = readyLabel
    ? <span data-testid="home-ready-chip" className="truncate font-neo-body text-xs font-bold text-edu-ink/80 sm:text-sm">{readyLabel}</span>
    : readyEmpty
      ? <span data-testid="home-ready-empty" className="truncate font-neo-body text-xs font-bold text-edu-ink/80">{readyEmpty}</span>
      : null;

  const stats = counts ? (
    <span className="flex min-w-0 flex-1 items-center gap-4">
      {STATUSES.filter((s) => counts[s] > 0).map((s) => (
        <span key={s} data-testid="home-strip-stat" className="flex min-w-0 flex-col items-start leading-none">
          <CountUp value={counts[s]} className={cn('font-neo-display text-2xl font-black tabular-nums', STAT_TONE[s])} />
          <span className="mt-1 truncate font-neo-body text-xs font-bold text-edu-ink/75">{t(`eduShell.home.roster.statusShort.${s}`)}</span>
        </span>
      ))}
    </span>
  ) : null;
  const resultsName = counts
    ? `${t('eduShell.home.seeResults')}: ${t('eduShell.home.focus.barLabel', { done: counts.done, late: counts.late, idle: counts.idle })}`
    : undefined;

  return (
    <section data-testid="home-desk-board" aria-label={t('eduShell.home.roster.title')} className="flex min-w-0 flex-col gap-3">
      <div data-testid="home-weekly-reports" className="flex min-w-0 flex-col gap-1.5">
      <div className={cn('flex min-w-0 items-stretch gap-2', split && 'min-h-[64px] rounded-neo-lg border-2 border-edu-line bg-edu-surface/70 p-1.5')}>
        {stats ? (
          <button
            type="button"
            data-testid="home-roster-see-all"
            aria-expanded={opened}
            aria-controls={listId}
            aria-label={t('eduShell.home.roster.title')}
            onClick={() => setOpened((v) => !v)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-neo px-2 text-start focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            {stats}
            <ChevronDown className={cn('size-5 shrink-0 text-edu-ink/80 transition-transform motion-reduce:transition-none', opened && 'rotate-180')} aria-hidden="true" />
          </button>
        ) : missedShown && missed ? (
          <button
            type="button"
            data-testid="home-homework"
            onClick={missed.onHomework}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-neo px-2 text-start text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <Send className="size-5 shrink-0 text-edu-yellow-ink rtl:-scale-x-100" strokeWidth={2.5} aria-hidden="true" />
            <span className="min-w-0 font-neo-body text-sm font-black leading-tight">{t('eduShell.home.loop.missed', { count: missed.count })}</span>
          </button>
        ) : null}
        <PressSurface
          lip={split ? 2 : 4}
          data-testid="home-open-results"
          aria-haspopup="dialog"
          aria-label={resultsName}
          onClick={onOpenResults}
          className={cn(
            'group flex min-h-11 items-center gap-2 rounded-neo border-2 border-edu-line bg-edu-page px-3 text-start text-edu-ink shadow-edu-line focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
            split ? 'shrink-0' : 'min-h-[72px] min-w-0 flex-1 gap-3 rounded-neo-lg border-[3px] bg-edu-surface px-4',
          )}
        >
          {split ? null : <BarChart3 className="box-content size-6 shrink-0 rounded-neo border-[3px] border-neo-black bg-neo-cyan p-1.5 text-neo-black" strokeWidth={2.5} aria-hidden="true" />}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn('font-neo-display font-black leading-tight', split ? 'text-sm' : 'text-lg sm:text-xl')}>{t('eduShell.home.seeResults')}</span>
            {split ? null : note}
          </span>
          <ChevronRight className={cn('shrink-0 rtl:-scale-x-100', split ? 'size-4' : 'size-6')} strokeWidth={split ? 2 : 3} aria-hidden="true" />
        </PressSurface>
      </div>
      {split && note ? <p className="px-2">{note}</p> : null}
      </div>

      {rosterShown && (wide || roster.failed || (opened && roster.rows !== null)) && !(roster.rows?.length === 0) ? (
        <div id={listId}>
          <HomeClassRoster rows={roster.rows} failed={roster.failed} filterable language={language} nowMs={nowMs} t={t} onAssign={onAssign} onAssignAll={onAssignAll} />
        </div>
      ) : null}
    </section>
  );
}
