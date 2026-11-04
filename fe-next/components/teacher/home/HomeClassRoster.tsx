'use client';

import { Fragment, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import AvatarLite, { type AvatarLiteConfig } from '@/components/AvatarLite';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { GHOST_BUTTON, OUTLINE_BUTTON, PANEL, SKELETON } from './homeStyles';
import { RosterDrawer, RosterSheet, StatusDot, StatusPill } from './HomeRosterDetail';
import { HomeRosterMeter } from './HomeRosterMeter';
import { rosterAccuracy, rosterCounts, type RosterRow, type RosterStatus } from './rosterModel';

type T = (key: string, params?: Record<string, string | number>) => string;

const STATUSES: readonly RosterStatus[] = ['done', 'late', 'idle'];
// Every cell is placed explicitly so a narrow box falls back to the two-line phone row, never a wrapped grid.
const COLS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 @md/roster:grid-cols-[minmax(7rem,12rem)_minmax(5.5rem,1fr)_4.5rem_4.5rem] @md/roster:gap-x-4 @[40rem]/list:grid-cols-[minmax(7rem,12rem)_5.5rem_minmax(6rem,1fr)_4.5rem_4.5rem]';
const CELL = {
  name: 'col-start-1 row-start-1',
  status: 'col-start-1 row-start-2 ps-10 @md/roster:col-start-2 @md/roster:row-start-1 @md/roster:ps-0',
  accuracy: 'hidden @[40rem]/list:col-start-3 @[40rem]/list:row-start-1',
  xp: 'col-start-2 row-span-2 row-start-1 text-end @md/roster:col-start-3 @md/roster:row-span-1 @[40rem]/list:col-start-4',
  words: 'hidden text-end @md/roster:col-start-4 @md/roster:row-start-1 @md/roster:block @[40rem]/list:col-start-5',
} as const;
const NUM = 'font-neo-body text-sm font-semibold tabular-nums text-neo-cream/80';
// Fixed width on every row and the header so the columns line up whether or not a row has an action.
const ACTION_SLOT = 'flex w-11 shrink-0 justify-end @[36rem]/list:w-28';
const HEAD = 'truncate whitespace-nowrap font-neo-body text-[0.7rem] font-bold uppercase tracking-wide text-neo-cream/55';

export interface HomeClassRosterProps {
  /** null while the read is in flight or failed. */
  rows: readonly RosterRow[] | null;
  failed: boolean;
  language: string;
  nowMs: number;
  t: T;
  className?: string;
  /** Opens the assign flow for one student; a Behind row offers it on hover or selection. */
  onAssign?: (row: RosterRow) => void;
  /** Opens the assign flow for everyone who still needs to play; shown once, beside the Behind count. */
  onAssignAll?: () => void;
}

/** The class desk roster: who played this week, who is behind, who has not started; a row opens that student. */
export function HomeClassRoster({ rows, failed, language, nowMs, t, className, onAssign, onAssignAll }: HomeClassRosterProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const wide = useMediaQuery('(min-width: 1024px)');
  const open = rows?.find((r) => r.id === openId) ?? null;
  const counts = rows ? rosterCounts(rows) : null;
  const bulk = onAssignAll && counts && counts.late + counts.idle > 0;
  const close = () => setOpenId(null);

  return (
    <section data-testid="home-roster" aria-labelledby="home-roster-title" className={cn(PANEL, '@container/roster flex min-h-0 flex-col overflow-hidden', className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-neo-cream/10 px-3 py-2 sm:px-4">
        <h2 id="home-roster-title" className="font-neo-display text-lg font-black text-neo-cream">
          {t('eduShell.home.roster.title')}
        </h2>
        {counts && rows && rows.length > 0 ? (
          <p data-testid="home-roster-summary" className="flex flex-wrap items-center gap-x-3 gap-y-1 font-neo-body text-xs font-bold text-neo-cream/80 sm:text-sm">
            {STATUSES.map((s) => (
              <Fragment key={s}>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot status={s} />
                  {t(`eduShell.home.roster.count.${s}`, { count: counts[s] })}
                </span>
                {s === 'late' && bulk ? (
                  <button
                    type="button"
                    data-testid="home-roster-assign-all"
                    onClick={onAssignAll}
                    className={cn(OUTLINE_BUTTON, 'min-h-11 px-2.5 text-xs sm:text-sm [@media(pointer:fine)]:min-h-8')}
                  >
                    <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
                    {t('eduShell.home.focus.assign')}
                  </button>
                ) : null}
              </Fragment>
            ))}
          </p>
        ) : null}
      </header>

      {failed ? (
        <p data-testid="home-roster-error" className="px-4 py-6 font-neo-body text-sm font-semibold text-neo-cream/75">{t('eduShell.home.roster.error')}</p>
      ) : rows === null ? (
        <div data-testid="home-roster-loading" aria-hidden="true" className="flex flex-col gap-2 p-3 sm:p-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn(SKELETON, 'h-9 w-full')} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p data-testid="home-roster-empty" className="px-4 py-6 font-neo-body text-sm font-semibold text-neo-cream/75">{t('eduShell.home.roster.empty')}</p>
      ) : (
        <div className={cn('grid min-h-0 flex-1', open && wide && '@3xl/roster:grid-cols-[minmax(0,1fr)_18rem]')}>
          <div className="@container/list min-h-0 overflow-y-auto overscroll-contain max-lg:max-h-[min(25rem,58dvh)] lg:max-h-[max(16rem,calc(100dvh-30rem))]">
            <div aria-hidden="true" className="sticky top-0 z-10 flex items-center gap-2 border-b border-s-4 border-b-neo-cream/15 border-s-transparent bg-neo-navy-light px-3 py-1.5 sm:px-4">
              <div data-testid="home-roster-head" className={cn(COLS, 'min-w-0 flex-1')}>
                <span className={cn(HEAD, CELL.name)}>{t('eduShell.home.roster.colName')}</span>
                <span className={cn(HEAD, CELL.status, 'hidden @md/roster:block')}>{t('eduShell.home.roster.colWeek')}</span>
                <span className={cn(HEAD, CELL.accuracy, '@[40rem]/list:block')}>{t('eduShell.home.roster.colAccuracy')}</span>
                <span className={cn(HEAD, CELL.xp)}>{t('eduShell.home.roster.colXp')}</span>
                <span className={cn(HEAD, CELL.words)}>{t('eduShell.home.roster.colWords')}</span>
              </div>
              {onAssign ? <span className={ACTION_SLOT} /> : null}
            </div>
            <ul className="divide-y divide-neo-cream/10">
              {rows.map((r, i) => {
                const selected = r.id === openId;
                const share = rosterAccuracy(r);
                return (
                  <li
                    key={r.id}
                    className={cn(
                      'group/row flex items-center gap-2 border-s-4 px-3 transition-colors duration-150 motion-reduce:transition-none sm:px-4',
                      selected ? 'border-neo-cyan bg-neo-cyan/15' : 'border-transparent hover:bg-neo-cyan/[0.07]',
                    )}
                  >
                    <button
                      type="button"
                      data-testid="home-roster-row"
                      aria-pressed={selected}
                      onClick={() => setOpenId(selected ? null : r.id)}
                      className={cn(COLS, 'min-w-0 flex-1 rounded-neo py-1.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:bg-neo-cyan/10')}
                    >
                      <span data-col="name" className={cn(CELL.name, 'flex min-w-0 items-center gap-2.5')}>
                        <AvatarLite userId={r.id} customAvatar={r.avatarConfig as AvatarLiteConfig | null} pixelSize={30} className="shrink-0" />
                        <span dir="auto" className={cn('truncate font-neo-body text-[0.95rem] font-black', selected ? 'text-neo-cyan' : 'text-neo-cream')}>{r.name}</span>
                      </span>
                      <span data-col="status" className={cn(CELL.status, 'flex min-w-0 items-center')}>
                        <StatusPill status={r.status} label={t(`eduShell.home.roster.statusShort.${r.status}`)} />
                      </span>
                      <span data-col="accuracy" className={cn(CELL.accuracy, '@[40rem]/list:flex min-w-0 items-center gap-2')}>
                        {share === null ? (
                          <span className="font-neo-body text-sm font-semibold text-neo-cream/40">
                            <span aria-hidden="true">–</span>
                            <span className="sr-only">{t('eduShell.home.roster.noWordsYet')}</span>
                          </span>
                        ) : (
                          <>
                            <HomeRosterMeter share={share} index={i} isRTL={language === 'he'} />
                            <span className={cn(NUM, 'w-10 shrink-0 text-end')}>{share.toLocaleString(language, { style: 'percent' })}</span>
                          </>
                        )}
                      </span>
                      <span data-col="xp" className={cn(CELL.xp, NUM, 'font-bold text-neo-cream')}>{r.xp.toLocaleString(language)}</span>
                      <span data-col="words" className={cn(CELL.words, NUM)}>{r.wordsMastered.toLocaleString(language)}</span>
                    </button>
                    {onAssign ? (
                      <span className={cn(ACTION_SLOT, !selected && 'invisible group-hover/row:visible group-focus-within/row:visible')}>
                        {r.status === 'late' ? (
                          <button
                            type="button"
                            data-testid="home-roster-assign"
                            aria-label={t('eduShell.home.roster.assignFor', { name: r.name })}
                            onClick={() => onAssign(r)}
                            className={cn(GHOST_BUTTON, 'min-w-11 px-2 text-neo-cyan hover:text-neo-cyan [@media(pointer:fine)]:min-h-9 [@media(pointer:fine)]:min-w-9 @[36rem]/list:px-2.5')}
                          >
                            <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
                            <span className="hidden @[36rem]/list:inline">{t('eduShell.home.roster.assign')}</span>
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          {open && wide ? <RosterDrawer row={open} onClose={close} onAssign={onAssign} isRTL={language === 'he'} language={language} nowMs={nowMs} t={t} /> : null}
        </div>
      )}
      {open && !wide ? <RosterSheet row={open} onClose={close} onAssign={onAssign} language={language} nowMs={nowMs} t={t} /> : null}
    </section>
  );
}
