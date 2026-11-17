'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
import { isGeneratedName } from '@/utils/defaultPlayerNames';
import { BragButton, useBragSharer } from '@/components/share/BragButton';
import { getBragShareUrl } from '@/utils/share';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

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
  if (isPlaceholderName(name) || isGeneratedName(name)) return 'claimName';
  return 'new';
}

export function WorldRecordChip({ mode, subMode, score, className }: WorldRecordChipProps) {
  const { t, language } = useLanguage();
  const { user, profile, loading } = useAuth();
  const { records, status } = useWorldRecords();
  const format = useRecordFormatter();
  const { me } = useBragSharer();
  const [authOpen, setAuthOpen] = useState(false);
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
  if (isNew) {
    const claimTapped = () => posthog.capture('world_record_claim_tapped', { mode, record_key: record.recordKey, state });
    const claimClass = 'mt-2 inline-flex items-center rounded-neo border-2 border-neo-black bg-neo-lime px-3 py-1.5 font-neo-display text-sm font-black text-neo-black shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none';
    return (
      <div
        data-testid="world-record-chip"
        data-state={state}
        role="status"
        className={cn(
          'flex min-w-0 items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-navy px-3 py-3 text-neo-white shadow-hard',
          'motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300',
          className,
        )}
      >
        <span
          data-testid="world-record-crown-badge"
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 -rotate-6 place-items-center rounded-full border-3 border-neo-black bg-neo-yellow shadow-hard-sm motion-safe:animate-in motion-safe:spin-in-12 motion-safe:zoom-in-50 motion-safe:duration-500"
        >
          <Crown className="h-6 w-6 text-neo-black" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-neo-display text-lg font-black uppercase tracking-wide text-neo-yellow">{t('worldRecords.chip.newRecord')}</p>
          {state === 'claimSignIn' && (
            <button type="button" onClick={() => { claimTapped(); setAuthOpen(true); }} className={claimClass}>
              {t('worldRecords.chip.claimSignIn')}
            </button>
          )}
          {state === 'claimName' && (
            <Link href={`/${language}/profile`} onClick={claimTapped} className={claimClass}>
              {t('worldRecords.chip.claimName')}
            </Link>
          )}
        </div>
        {state === 'new' && typeof score === 'number' && (
          <BragButton
            surface="world_record"
            kind="worldRecord"
            size="sm"
            text={t('brag2.text.worldRecord', { score: format(score, record.unit) })}
            url={getBragShareUrl('me', { score, mode, kind: 'worldRecord', me })}
          />
        )}
        {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
      </div>
    );
  }

  return (
    <div
      data-testid="world-record-chip"
      data-state={state}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-navy px-3 py-1.5 text-neo-white shadow-hard-sm',
        className,
      )}
    >
      <Crown className="h-5 w-5 shrink-0 -rotate-6 text-neo-yellow" aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-tight">
        {state === 'holder' ? (
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
