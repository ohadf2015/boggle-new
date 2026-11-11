'use client';

import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorldRecords } from '@/lib/records/useWorldRecords';
import { recordsHeldBy } from '@/lib/records/worldRecordTypes';
import { cn } from '@/lib/utils';

export interface RecordHolderCrownProps {
  userId?: string | null;
  className?: string;
}

/** A small crown beside a player's name when they hold any world record. */
export function RecordHolderCrown({ userId, className }: RecordHolderCrownProps) {
  const { t } = useLanguage();
  const { records } = useWorldRecords();
  const held = recordsHeldBy(records, userId);
  if (held.length === 0) return null;
  const label = t('worldRecords.crown.label', { count: held.length });
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="record-holder-crown"
      className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm', className)}
    >
      <Crown className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

export default RecordHolderCrown;
