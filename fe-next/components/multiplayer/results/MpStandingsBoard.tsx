'use client';

import { memo } from 'react';
import { Bot, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { podiumTier, type MpStandingRow } from './mpStandings';
import fx from './mpResults.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpStandingsBoardProps {
  rows: MpStandingRow[];
  hiddenCount: number;
  /** Is the row at visual position `pos` (1 = top) revealed yet? */
  isRevealed: (pos: number) => boolean;
  t: TFn;
  className?: string;
}

const PODIUM = [
  { badge: 'bg-neo-lime text-neo-black', row: 'bg-neo-lime text-neo-black border-neo-black' },
  { badge: 'bg-neo-cyan text-neo-black', row: 'bg-neo-navy-light border-neo-cyan' },
  { badge: 'bg-neo-pink text-neo-black', row: 'bg-neo-navy-light border-neo-pink' },
] as const;

/**
 * The standings, revealed last place → 2nd, then 1st slams in with the crown.
 * Rows keep their slot while hidden (visibility, not mount), so nothing jumps;
 * the rise is transform-only. Rows share the body's height (flex-1, capped), so
 * 2 or 8 players both fill one screen with zero scroll. On a series final the
 * rows are the series ladder: the crown is the champion's and each row carries
 * its round points (`roundScore`) under the name.
 */
function MpStandingsBoardImpl({ rows, hiddenCount, isRevealed, t, className }: MpStandingsBoardProps) {
  return (
    <ol data-testid="mp-standings" className={cn('flex flex-col justify-center min-h-0 gap-[calc(6px*var(--mp-u,1))]', className)}>
      {rows.map((r, i) => {
        const pos = i + 1;
        const shown = isRevealed(pos);
        // Ties share a rank (and its colour); 0 points never earn the podium.
        const tier = podiumTier(r);
        const podium = tier ? PODIUM[tier - 1] : null;
        const first = tier === 1;
        return (
          <li
            key={r.username}
            data-testid="mp-standing-row"
            data-rank={r.rank}
            data-podium={tier ?? 'none'}
            data-me={String(r.isMe)}
            data-revealed={String(shown)}
            aria-hidden={shown ? undefined : true}
            className={cn(
              'relative flex items-center min-h-0 grow shrink overflow-hidden rounded-neo border-[3px] shadow-hard-sm',
              'gap-[calc(10px*var(--mp-u,1))] px-[calc(10px*var(--mp-u,1))]',
              first ? 'basis-[calc(76px*var(--mp-u,1))] max-h-[calc(108px*var(--mp-u,1))] min-h-[calc(44px*var(--mp-u,1))]' : 'basis-[calc(58px*var(--mp-u,1))] max-h-[calc(84px*var(--mp-u,1))] min-h-[calc(34px*var(--mp-u,1))]',
              podium ? podium.row : 'bg-neo-navy-light border-neo-black',
              r.isMe && !first && 'outline-[3px] outline-offset-2 outline-neo-lime outline',
              r.isMe && first && 'outline-[3px] outline-offset-2 outline-neo-white outline',
              !shown && 'invisible',
              shown && (first ? fx.firstSlam : fx.rowRise),
            )}
          >
            {first && shown && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <span className={cn('absolute inset-y-0 start-0 block w-1/5 bg-neo-white/45', fx.shine)} />
              </span>
            )}
            <span
              className={cn(
                'relative shrink-0 grid place-items-center rounded-neo border-2 border-neo-black font-neo-display font-bold tabular-nums',
                'w-[calc(34px*var(--mp-u,1))] h-[calc(34px*var(--mp-u,1))] text-[calc(17px*var(--mp-u,1))]',
                podium ? (first ? 'bg-neo-black text-neo-lime' : podium.badge) : 'bg-neo-navy text-neo-white',
              )}
            >
              {r.rank}
            </span>
            <span
              className={cn(
                'relative shrink-0 rounded-full border-2',
                first ? 'border-neo-black' : r.isMe ? 'border-neo-lime' : 'border-neo-black',
              )}
              style={{ width: 'calc(40px * var(--mp-u, 1))', height: 'calc(40px * var(--mp-u, 1))' }}
            >
              <span className="absolute top-0 left-0 block origin-top-left [transform:scale(var(--mp-u,1))]">
                <Avatar avatarImage={r.avatar?.avatarImage} customAvatar={r.avatar?.customAvatar ?? null} userId={r.username} pixelSize={36} disableEffects />
              </span>
              {first && shown && (
                <Crown
                  data-testid="mp-standing-crown"
                  aria-hidden="true"
                  className={cn('absolute -top-[calc(14px*var(--mp-u,1))] -start-[calc(6px*var(--mp-u,1))] w-[calc(22px*var(--mp-u,1))] h-[calc(22px*var(--mp-u,1))] text-neo-yellow fill-neo-yellow drop-shadow-[2px_2px_0_#000]', fx.crownDrop)}
                />
              )}
              {r.isBot && (
                <Bot aria-label={t('mpUi.shell.bot')} className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-neo-cyan text-neo-black p-0.5" />
              )}
            </span>
            <span className="min-w-0 flex-1 flex flex-col justify-center leading-tight">
              <span className="flex items-center gap-1.5 min-w-0">
                <span dir="auto" className={cn('truncate font-neo-display font-bold', 'text-[calc(17px*var(--mp-u,1))]')}>
                  {r.username}
                </span>
                {r.isMe && (
                  <span className={cn('shrink-0 rounded-full border-2 border-neo-black px-1.5 text-[calc(10px*var(--mp-u,1))] font-bold uppercase', first ? 'bg-neo-black text-neo-lime' : 'bg-neo-lime text-neo-black')}>
                    {t('mpUi.results.you')}
                  </span>
                )}
              </span>
              {(r.roundScore !== undefined || r.seriesTotal !== null) && (
                <span className={cn('flex items-center gap-1 text-[calc(11px*var(--mp-u,1))] font-neo-body tabular-nums', first ? 'text-neo-black/75' : 'text-neo-white/70')}>
                  {r.roundScore !== undefined ? (
                    <span
                      data-testid="mp-standing-round"
                      data-quiet={String(r.roundScore === 0)}
                      className={cn('truncate', r.roundScore === 0 && 'opacity-50')}
                    >
                      {t('mpUi.results.roundGain', { points: `\u2066+${r.roundScore}\u2069` })}
                    </span>
                  ) : (
                    t('mpUi.results.seriesTotal', { total: r.seriesTotal as number })
                  )}
                  {r.seriesDelta > 0 && (
                    <span data-testid="mp-standing-delta" className={cn('inline-flex items-center font-bold', first ? 'text-neo-black' : 'text-neo-lime', shown && fx.chipPop)}>
                      <ChevronUp aria-hidden="true" className="w-3 h-3" />
                      {r.seriesDelta}
                    </span>
                  )}
                  {r.seriesDelta < 0 && (
                    <span data-testid="mp-standing-delta" className={cn('inline-flex items-center font-bold', first ? 'text-neo-black' : 'text-neo-pink')}>
                      <ChevronDown aria-hidden="true" className="w-3 h-3" />
                      {Math.abs(r.seriesDelta)}
                    </span>
                  )}
                </span>
              )}
            </span>
            <span
              data-testid="mp-standing-score"
              className={cn('shrink-0 font-neo-display font-bold tabular-nums', first ? 'text-[calc(32px*var(--mp-u,1))]' : 'text-[calc(24px*var(--mp-u,1))]')}
            >
              {r.score}
            </span>
          </li>
        );
      })}
      {hiddenCount > 0 && (
        <li className="shrink-0 self-center rounded-full bg-neo-navy-light border-2 border-neo-black px-3 py-0.5 text-xs font-bold text-neo-white/80">
          {t('mpUi.results.moreHidden', { count: hiddenCount })}
        </li>
      )}
    </ol>
  );
}

export const MpStandingsBoard = memo(MpStandingsBoardImpl);
MpStandingsBoard.displayName = 'MpStandingsBoard';
