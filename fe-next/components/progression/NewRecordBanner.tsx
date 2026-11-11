'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ResultsMode } from '@/lib/rivals/types';
import {
  PUBLISHING_MODES,
  evaluateAgainstLedger,
  getRunRecord,
  subscribeRunRecords,
  type RunRecord,
} from '@/lib/records/runRecord';

export interface NewRecordBannerProps {
  mode: ResultsMode;
  score?: number;
}

const noRecord = () => null;

export function NewRecordBanner({ mode, score }: NewRecordBannerProps) {
  const { t, language } = useLanguage();
  const published = useSyncExternalStore(subscribeRunRecords, () => getRunRecord(mode), noRecord);
  const [ledgerRecord, setLedgerRecord] = useState<RunRecord | null>(null);
  const usesLedger = !PUBLISHING_MODES.has(mode);

  useEffect(() => {
    if (!usesLedger || typeof score !== 'number' || score <= 0) return;
    setLedgerRecord(evaluateAgainstLedger(mode, score));
  }, [usesLedger, mode, score]);

  const record = usesLedger ? ledgerRecord : published && published.value === score ? published : null;
  if (!record) return null;

  const fmt = (n: number) => n.toLocaleString(language);
  return (
    <div
      data-testid="new-record-banner"
      role="status"
      className="relative flex items-center gap-3 overflow-hidden rounded-neo border-3 border-neo-black bg-neo-yellow px-3 py-2 text-neo-black shadow-hard motion-safe:animate-in motion-safe:zoom-in-95 duration-300"
    >
      <Trophy className="h-7 w-7 shrink-0 -rotate-6" aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="font-neo-display text-xl font-black uppercase tracking-wide">
          {t('progression.records.newRecord')}
        </p>
        <p className="text-xs font-bold">
          {t('progression.records.beatPrevious', { value: fmt(record.value), previous: fmt(record.previous) })}
        </p>
      </div>
    </div>
  );
}

export default NewRecordBanner;
