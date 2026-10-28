'use client';

import { cn } from '@/lib/utils';
import type { BlastMpPlayerResult, BlastScoreBreakdown } from '../legacy/blastMpRanking';
import { BLAST_RESULT_ASSETS } from './blastResultsTheme';
import type { BlastTranslate } from './types';

export function collectionBonusOf(b: BlastScoreBreakdown | undefined): number {
  return b ? (b.coinPoints ?? 0) + (b.diamondPoints ?? 0) : 0;
}

export function CollectionCounts({ player, className }: { player: BlastMpPlayerResult; className?: string }) {
  if (player.coinsCollected == null && player.diamondsCollected == null) return null;
  return (
    <span className={cn('inline-flex items-center gap-2 tabular-nums', className)} dir="ltr">
      {player.coinsCollected != null && (
        <span data-testid={`blast-mp-coins-${player.username}`} className="inline-flex items-center gap-0.5 font-black text-neo-yellow">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BLAST_RESULT_ASSETS.coin} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
          {player.coinsCollected}
        </span>
      )}
      {player.diamondsCollected != null && (
        <span data-testid={`blast-mp-diamonds-${player.username}`} className="inline-flex items-center gap-0.5 font-black text-neo-cyan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BLAST_RESULT_ASSETS.diamond} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
          {player.diamondsCollected}
        </span>
      )}
    </span>
  );
}

export function BonusChip({ player, t }: { player: BlastMpPlayerResult; t: BlastTranslate }) {
  const bonus = collectionBonusOf(player.scoreBreakdown);
  if (bonus <= 0) return null;
  return (
    <span
      data-bonus
      data-points={bonus}
      data-testid={`blast-mp-bonus-${player.username}`}
      title={t('blast.mpResults.bonusLabel')}
      className="inline-block rounded-neo border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 text-[10px] font-black tabular-nums text-neo-black shadow-hard-sm"
    >
      {t('blast.mpResults.bonus', { n: bonus })}
    </span>
  );
}

const AWARDS = [
  { id: 'coinKing', labelKey: 'blast.mpResults.coinKing', icon: BLAST_RESULT_ASSETS.coin, frame: 'bg-neo-yellow' },
  { id: 'mostDiamonds', labelKey: 'blast.mpResults.mostDiamonds', icon: BLAST_RESULT_ASSETS.diamond, frame: 'bg-neo-cyan' },
] as const;

export function CategoryAwards({
  winners,
  t,
}: {
  winners: { coinKing: string | null; mostDiamonds: string | null };
  t: BlastTranslate;
}) {
  const shown = AWARDS.filter((a) => winners[a.id]);
  if (shown.length === 0) return null;
  return (
    <div className="relative z-10 flex flex-wrap justify-center gap-2 px-3 pb-3">
      {shown.map((a) => (
        <div
          key={a.id}
          data-award
          data-testid={`blast-mp-award-${a.id}`}
          data-player={winners[a.id]!}
          className={cn(
            'flex min-w-0 items-center gap-1.5 rounded-neo border-3 border-neo-black px-2 py-1 text-neo-black shadow-hard',
            a.frame,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.icon} alt="" aria-hidden="true" className="h-6 w-6 shrink-0 object-contain" />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-[9px] font-black uppercase tracking-wider">{t(a.labelKey)}</span>
            <bdi className="truncate text-sm font-black">{winners[a.id]}</bdi>
          </span>
        </div>
      ))}
    </div>
  );
}
