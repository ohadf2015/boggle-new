'use client';

import { useId, useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { HomeClassRoster, type HomeClassRosterProps } from './HomeClassRoster';
import { HOME_ROW } from './homeStyles';
import { rosterCounts, type RosterStatus } from './rosterModel';

const STATUSES: readonly RosterStatus[] = ['done', 'late', 'idle'];

/** The class roster: always open on desktop; on a phone one line says who played and opens the list. */
export function HomeRosterFold(props: HomeClassRosterProps) {
  const { rows, failed, t } = props;
  const wide = useMediaQuery('(min-width: 1024px)');
  const [opened, setOpened] = useState(false);
  const listId = useId();
  if (rows?.length === 0) return null;
  if (wide || failed) return <HomeClassRoster {...props} />;

  const counts = rows ? rosterCounts(rows) : null;
  const line = counts
    ? STATUSES.filter((s) => counts[s] > 0).map((s) => t(`eduShell.home.roster.count.${s}`, { count: counts[s] })).join(' · ')
    : '';
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button type="button" data-testid="home-roster-see-all" aria-expanded={opened} aria-controls={listId} onClick={() => setOpened((v) => !v)} className={HOME_ROW}>
        <Users className="size-6 shrink-0 text-neo-cyan" strokeWidth={2.5} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-neo-display text-base font-black leading-tight">{t('eduShell.home.roster.title')}</span>
          {line ? <span className="truncate font-neo-body text-xs font-bold text-neo-cream/75">{line}</span> : null}
        </span>
        <ChevronDown className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', opened && 'rotate-180')} aria-hidden="true" />
      </button>
      {opened ? <div id={listId}><HomeClassRoster {...props} /></div> : null}
    </div>
  );
}

export default HomeRosterFold;
