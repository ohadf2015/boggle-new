'use client';

import { BarChart3, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HOME_ROW } from './homeStyles';
import { HomeRosterFold } from './HomeRosterFold';
import type { RosterRow } from './rosterModel';

type T = (key: string, params?: Record<string, string | number>) => string;

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

/** Under the desk: one results row, then the class roster. */
export function HomeDeskBoard({ roster, memberCount, onOpenResults, readyLabel, readyEmpty, missed, onAssign, onAssignAll, language, nowMs, t }: HomeDeskBoardProps) {
  const rosterShown = roster !== null && memberCount > 0;
  const hasStudentsListed = rosterShown && !roster.failed && roster.rows !== null ? roster.rows.length > 0 : rosterShown && !roster.failed;
  const missedShown = !hasStudentsListed && Boolean(missed && missed.count > 0);
  const note = readyLabel
    ? <span data-testid="home-ready-chip" className="truncate font-neo-body text-xs font-bold text-neo-cream/75">{readyLabel}</span>
    : readyEmpty
      ? <span data-testid="home-ready-empty" className="truncate font-neo-body text-xs font-bold text-neo-cream/75">{readyEmpty}</span>
      : null;

  return (
    <section data-testid="home-desk-board" aria-label={t('eduShell.home.roster.title')} className="flex min-w-0 flex-col gap-3">
      <div className={cn('grid min-w-0 gap-3', missedShown && 'sm:grid-cols-2')}>
        {missedShown && missed ? (
          <button type="button" data-testid="home-homework" onClick={missed.onHomework} className={HOME_ROW}>
            <Send className="size-6 shrink-0 text-neo-yellow rtl:-scale-x-100" strokeWidth={2.5} aria-hidden="true" />
            <span className="min-w-0 font-neo-body text-sm font-black leading-tight">{t('eduShell.home.loop.missed', { count: missed.count })}</span>
          </button>
        ) : null}
        <div data-testid="home-weekly-reports" className="min-w-0">
          <button type="button" aria-haspopup="dialog" onClick={onOpenResults} className={HOME_ROW}>
            <BarChart3 className="size-6 shrink-0 text-neo-cyan" strokeWidth={2.5} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-neo-display text-base font-black leading-tight">{t('eduShell.home.seeResults')}</span>
              {note}
            </span>
            <ChevronRight className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 motion-reduce:transition-none" aria-hidden="true" />
          </button>
        </div>
      </div>

      {rosterShown ? (
        <HomeRosterFold rows={roster.rows} failed={roster.failed} filterable language={language} nowMs={nowMs} t={t} onAssign={onAssign} onAssignAll={onAssignAll} />
      ) : null}
    </section>
  );
}
