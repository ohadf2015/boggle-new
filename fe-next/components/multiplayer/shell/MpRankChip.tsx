'use client';

import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface MpRankChipProps {
  /** 1-based; 0 = not ranked yet. */
  rank: number;
  total: number;
  /** Changing this re-keys the value so the flip (rotateX, 300ms) runs once. */
  flipKey?: string;
  className?: string;
}

function MpRankChipImpl({ rank, total, flipKey, className }: MpRankChipProps) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="mp-rank-chip"
      aria-label={rank > 0 ? t('mpUi.shell.rankOf', { rank, total }) : undefined}
      className={cn(
        'inline-flex items-baseline rounded-neo border-2 border-neo-black bg-neo-navy-light px-2 h-10 font-neo-display font-bold tabular-nums text-neo-white [perspective:400px]',
        className,
      )}
    >
      <span key={flipKey ?? 'rank'} data-testid="mp-rank-value" className={cn('inline-block text-xl', flipKey && 'animate-mp-flip')}>
        {rank > 0 ? `#${rank}` : '–'}
      </span>
      <span className="text-xs opacity-70">/{total}</span>
    </div>
  );
}

export const MpRankChip = memo(MpRankChipImpl);
MpRankChip.displayName = 'MpRankChip';
