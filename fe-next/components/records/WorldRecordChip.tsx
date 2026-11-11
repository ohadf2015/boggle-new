'use client';

import { useEffect } from 'react';
import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { recordKeyFor } from '@/lib/records/recordKeys';
import { useWorldRecords } from '@/lib/records/useWorldRecords';
import { gapToRecord } from '@/lib/records/worldRecordTypes';
import { useRecordFormatter } from './useRecordFormatter';
import type { ResultsMode } from '@/lib/rivals/types';
import { cn } from '@/lib/utils';
import { isPlaceholderName } from '@/lib/displayName';
import { isDefaultPlayerName } from '@/utils/defaultPlayerNames';

export interface WorldRecordChipProps {
  mode: ResultsMode;
  /** QP mode, MP game mode, or the daily hero mode. */
  subMode?: string | null;
  score?: number;
  className?: string;
}

type ChipState = 'new' | 'claimSignIn' | 'claimName' | 'holder' | 'chasing' | 'shown';

/** Only signed-in players with a chosen name can hold a record; anyone else who beats it is told how to claim it. */
function beatState(user: { id: string } | null | undefined, name: string | null | undefined): ChipState {
  if (!user) return 'claimSignIn';
  if (isPlaceholderName(name) || isDefaultPlayerName(name)) return 'claimName';
  return 'new';
}

export function WorldRecordChip({ mode, subMode, score, className }: WorldRecordChipProps) {
  const { t } = useLanguage();
  const { user, profile, loading } = useAuth();
  const { records, status } = useWorldRecords();
  const format = useRecordFormatter();
  const key = recordKeyFor(mode, subMode);
  const record = key && status === 'ready' ? records.find((r) => r.recordKey === key) : undefined;

  const hasScore = typeof score === 'number' && score > 0;
  const profileName = profile?.display_name || profile?.username;
  const state: ChipState | null = !record || loading
    ? null
    : hasScore && score > record.score
      ? beatState(user, profileName)
      : user?.id && user.id === record.holderId
        ? 'holder'
        : hasScore
          ? 'chasing'
          : 'shown';

  useEffect(() => {
    if (!record || !state) return;
    posthog.capture('world_record_viewed', { mode, record_key: record.recordKey, state });
  }, [mode, record, state]);

  if (!record || !state) return null;

  const isNew = state === 'new' || state === 'claimSignIn' || state === 'claimName';
  return (
    <div
      data-testid="world-record-chip"
      role={isNew ? 'status' : undefined}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-neo border-3 border-neo-black px-3 py-1.5 shadow-hard-sm',
        isNew ? 'bg-neo-yellow text-neo-black motion-safe:animate-in motion-safe:zoom-in-95 duration-300' : 'bg-neo-navy text-neo-white',
        className,
      )}
    >
      <Crown className={cn('h-5 w-5 shrink-0 -rotate-6', isNew ? 'text-neo-black' : 'text-neo-yellow')} aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-tight">
        {isNew ? (
          <>
            <p className="font-neo-display text-base font-black uppercase tracking-wide">{t('worldRecords.chip.newRecord')}</p>
            {state !== 'new' && <p className="text-xs font-bold">{t(`worldRecords.chip.${state}`)}</p>}
          </>
        ) : state === 'holder' ? (
          <p className="truncate text-sm font-black">{t('worldRecords.chip.youHold', { score: format(record.score, record.unit) })}</p>
        ) : (
          <p className="truncate text-sm font-bold">
            {t('worldRecords.chip.holder', { name: record.holderName, score: format(record.score, record.unit) })}
          </p>
        )}
        {state === 'chasing' && (
          <p className="text-xs font-black text-neo-yellow">
            {t('worldRecords.chip.gap', { gap: format(gapToRecord(record.score, score as number), record.unit) })}
          </p>
        )}
      </div>
    </div>
  );
}

export default WorldRecordChip;
