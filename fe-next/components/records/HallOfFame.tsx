'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Crown, RotateCcw } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { TitleBadge } from '@/components/progression/TitleBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { useWorldRecords } from '@/lib/records/useWorldRecords';
import type { WorldRecord } from '@/lib/records/worldRecordTypes';
import { safeToLocaleDateString } from '@/utils/bcp47Locale';
import { cn } from '@/lib/utils';
import { useRecordFormatter } from './useRecordFormatter';

const MODE_ACCENT: Record<string, string> = {
  multiplayer: 'bg-neo-purple text-neo-white',
  quickPlay: 'bg-neo-cyan text-neo-black',
  daily: 'bg-neo-lime text-neo-black',
  blast: 'bg-neo-pink text-neo-black',
  tower: 'bg-neo-orange text-neo-black',
  single: 'bg-neo-yellow text-neo-black',
};

export interface HallOfFameProps {
  /** Highlights the records this player holds. */
  viewerId?: string | null;
  className?: string;
}

export function HallOfFame({ viewerId, className }: HallOfFameProps) {
  const { t } = useLanguage();
  const { records, status, retry } = useWorldRecords();
  const tracked = useRef(false);

  useEffect(() => {
    if (status !== 'ready' || tracked.current) return;
    tracked.current = true;
    posthog.capture('world_record_viewed', { mode: 'hall_of_fame', count: records.length });
  }, [status, records.length]);

  return (
    <section data-testid="hall-of-fame" aria-labelledby="hall-of-fame-title" className={cn('space-y-3', className)}>
      <header className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm">
          <Crown className="h-5 w-5 -rotate-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="hall-of-fame-title" className="font-neo-display text-xl font-black text-neo-white">
            {t('worldRecords.hallOfFame.title')}
          </h2>
          <p className="text-xs font-bold text-neo-white/70">{t('worldRecords.hallOfFame.subtitle')}</p>
        </div>
      </header>

      {status === 'loading' && (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-neo border-3 border-neo-black bg-neo-navy-light" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 text-neo-white shadow-hard">
          <p className="flex-1 text-sm font-bold">{t('worldRecords.hallOfFame.error')}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-3 border-neo-black bg-neo-yellow px-3 font-black text-neo-black shadow-hard-sm active:translate-y-px"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('worldRecords.hallOfFame.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && records.length === 0 && (
        <p className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-4 text-sm font-bold text-neo-white shadow-hard">
          {t('worldRecords.hallOfFame.empty')}
        </p>
      )}

      {status === 'ready' && records.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {records.map((r) => (
            <RecordCard key={r.recordKey} record={r} mine={!!viewerId && viewerId === r.holderId} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RecordCard({ record, mine }: { record: WorldRecord; mine: boolean }) {
  const { t, language } = useLanguage();
  const format = useRecordFormatter();
  const since = safeToLocaleDateString(new Date(record.setAt), language, { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <li
      data-testid="hall-of-fame-card"
      className={cn(
        'overflow-hidden rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard',
        mine && 'ring-4 ring-neo-yellow',
      )}
    >
      <div className={cn('flex items-center justify-between gap-2 border-b-3 border-neo-black px-3 py-1.5', MODE_ACCENT[record.mode] ?? 'bg-neo-yellow text-neo-black')}>
        <span className="truncate text-xs font-black uppercase tracking-wide">{t(record.labelKey)}</span>
        {mine && (
          <span className="shrink-0 rounded-md border-2 border-neo-black bg-neo-yellow px-1.5 text-[10px] font-black uppercase text-neo-black">
            {t('worldRecords.hallOfFame.yours')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 p-3">
        <Avatar customAvatar={record.avatarConfig ?? undefined} userId={record.holderId} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/${language}/player/${encodeURIComponent(record.holderId)}`} className="truncate font-bold hover:underline">
              {record.holderName}
            </Link>
            <TitleBadge title={record.title} className="min-w-0 max-w-[45%] shrink" />
          </div>
          <p className="text-[11px] font-bold text-neo-white/70">{t('worldRecords.hallOfFame.since', { date: since })}</p>
        </div>
        <span className="shrink-0 font-neo-display text-2xl font-black tabular-nums text-neo-yellow">{format(record.score, record.unit)}</span>
      </div>
    </li>
  );
}

export default HallOfFame;
