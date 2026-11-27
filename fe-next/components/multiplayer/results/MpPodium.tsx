'use client';

import { Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { MOTION } from '@/components/motion/tokens';
import { cn } from '@/lib/utils';
import { podiumTier, type MpStandingRow } from './mpStandings';

/** DOM keeps the server's rank order (the same on every client); `order` stands the slots centre, left, right. */
const ORDER = ['order-2', 'order-1', 'order-3'];
/** Block per rank, so tied players stand at the same height. */
const PLACE: Record<number, { block: string; avatar: number }> = {
  1: { block: 'h-[calc(64px*var(--mp-u,1))] bg-neo-yellow', avatar: 52 },
  2: { block: 'h-[calc(46px*var(--mp-u,1))] bg-neo-cyan', avatar: 44 },
  3: { block: 'h-[calc(34px*var(--mp-u,1))] bg-neo-pink', avatar: 44 },
};

export interface MpPodiumProps {
  /** Standings in rank order; the first three stand on the podium. */
  rows: MpStandingRow[];
  /** Is the row at position `pos` (1 = top) revealed yet? Each place rises on its own beat. */
  isRevealed: (pos: number) => boolean;
  label: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

/** The top three rise in on springs: avatar, name and score over a block sized by place. */
export function MpPodium({ rows, isRevealed, label, t, className }: MpPodiumProps) {
  return (
    <ol data-testid="mp-podium" aria-label={label} className={cn('flex items-end justify-center gap-[calc(8px*var(--mp-u,1))] w-full', className)}>
      {rows.slice(0, 3).map((r, i) => {
        const slot = PLACE[Math.min(Math.max(r.rank, 1), 3)];
        const shown = isRevealed(i + 1);
        return (
          <li
            key={r.username}
            data-testid="mp-standing-row"
            data-rank={r.rank}
            data-revealed={String(shown)}
            data-me={String(r.isMe)}
            data-podium={podiumTier(r) ?? 'none'}
            className={cn('flex-1 max-w-[calc(112px*var(--mp-u,1))] min-w-0 flex flex-col items-center overflow-hidden', ORDER[i], !shown && 'invisible')}
          >
            <AdaptiveMotion.div
              key={shown ? 'up' : 'down'}
              initial={{ y: 56, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              transition={MOTION.pop}
              className="w-full flex flex-col items-center"
            >
              <span className="relative">
                {podiumTier(r) === 1 && (
                  <Crown data-testid="mp-standing-crown" aria-hidden="true" className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-6 h-6 fill-neo-yellow text-neo-black" />
                )}
                <span className={cn('block rounded-full border-[3px] bg-neo-navy-light', r.isMe ? 'border-neo-lime' : 'border-neo-black')}>
                  <Avatar avatarImage={r.avatar?.avatarImage} customAvatar={r.avatar?.customAvatar ?? null} userId={r.username} pixelSize={slot.avatar} disableEffects />
                </span>
              </span>
              <span dir="auto" className={cn('mt-1 max-w-full truncate font-neo-display font-bold text-[calc(12px*var(--mp-u,1))] leading-tight', r.isMe ? 'text-neo-lime' : 'text-neo-white')}>
                {r.username}
              </span>
              <span data-testid="mp-standing-score" dir="ltr" className="font-neo-display font-bold tabular-nums text-[calc(13px*var(--mp-u,1))] text-neo-white/80 leading-tight">{r.score}</span>
              {r.roundScore !== undefined && (
                <span data-testid="mp-standing-round" className={cn('max-w-full truncate text-[calc(10px*var(--mp-u,1))] font-bold tabular-nums text-neo-white/60', r.roundScore === 0 && 'opacity-60')}>
                  {t('mpUi.results.roundGain', { points: `\u2066+${r.roundScore}\u2069` })}
                </span>
              )}
              <span
                aria-hidden="true"
                className={cn('mt-1 w-full flex justify-center rounded-t-xl border-[3px] border-b-0 border-neo-black pt-0.5 font-neo-display font-bold text-neo-black text-[calc(20px*var(--mp-u,1))]', slot.block)}
              >
                {r.rank}
              </span>
            </AdaptiveMotion.div>
          </li>
        );
      })}
    </ol>
  );
}
