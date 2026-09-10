/**
 * ResultsPodium — the first thing the room sees when a game ends.
 *
 * Three plinths, winner in the middle and tallest, revealed bottom-up: third,
 * second, then the crown. Kahoot draws flat bars in one purple; this is
 * colour-coded, hard-shadowed and rotated a hair off true, so the winner's
 * plinth reads as an object on the wall rather than a chart column.
 *
 * DOM order is rank order (1, 2, 3) — a screen reader hears the standings — and
 * `order-*` does the 2-1-3 staging only once there is room for three columns.
 * On a phone the plinths stack in rank order, which is the readable shape.
 *
 * Shared by the classroom results card and the Vocab Quiz projector so the two
 * modes celebrate identically. Takes `t` as a prop, not the context, because
 * the projector already threads a translate function through.
 */

'use client';

import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PodiumEntry {
  username: string;
  score: number;
  /** 1, 2 or 3 — decided by the server, never recomputed here. */
  rank: number;
  /** Optional sub-line: "3 of 4 words", "9 correct". Omitted when unknown. */
  detail?: string;
}

export interface ResultsPodiumProps {
  entries: PodiumEntry[];
  size?: 'card' | 'projector';
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Plinth height in rem — the whole point of a podium is that 1st is tallest. */
const HEIGHT: Record<number, { card: number; projector: number }> = {
  1: { card: 6.5, projector: 12 },
  2: { card: 5, projector: 9 },
  3: { card: 4, projector: 7 },
};

const PLINTH: Record<number, string> = {
  1: 'bg-neo-yellow text-neo-black',
  2: 'bg-neo-cyan text-neo-black',
  3: 'bg-neo-pink text-neo-black',
};

const TILT: Record<number, string> = {
  1: '',
  2: '-rotate-1',
  3: 'rotate-1',
};

const COLUMN: Record<number, string> = {
  1: 'sm:order-2',
  2: 'sm:order-1',
  3: 'sm:order-3',
};

/** Third rises first, the winner last — the reveal everyone waits for. */
const DELAY: Record<number, number> = { 3: 0.05, 2: 0.25, 1: 0.45 };

export function ResultsPodium({ entries, size = 'card', t }: ResultsPodiumProps) {
  if (entries.length === 0) return null;
  const projector = size === 'projector';

  return (
    <ol
      aria-label={t('education.results.podium.title')}
      className="flex flex-col sm:flex-row sm:items-end justify-center gap-3 sm:gap-4"
    >
      {entries.map((entry) => {
        const rank = entry.rank;
        const height = (HEIGHT[rank] ?? HEIGHT[3])[projector ? 'projector' : 'card'];
        return (
          <li
            key={entry.username}
            data-testid={`podium-place-${rank}`}
            data-rank={String(rank)}
            data-plinth-height={String(height)}
            style={{ animationDelay: `${DELAY[rank] ?? 0.05}s`, animationFillMode: 'both' }}
            className={cn(
              'flex-1 sm:max-w-[14rem] flex flex-col items-center',
              'animate-neo-pop motion-reduce:animate-none',
              COLUMN[rank] ?? 'sm:order-3'
            )}
          >
            {/* Name cap — sits on the plinth like a placard. */}
            <div
              className={cn(
                'relative z-10 w-full rounded-neo border-neo border-neo-black bg-neo-navy-elevated',
                'px-3 py-2 text-center shadow-hard-sm',
                TILT[rank]
              )}
            >
              {rank === 1 && (
                <Crown
                  className={cn(
                    'absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 text-neo-yellow',
                    projector ? 'w-10 h-10' : 'w-7 h-7'
                  )}
                  aria-hidden
                />
              )}
              <p
                className={cn(
                  'font-neo-display font-bold text-neo-white truncate',
                  projector ? 'text-3xl' : 'text-base'
                )}
              >
                {entry.username}
              </p>
            </div>

            {/* The plinth itself. */}
            <div
              style={{ height: `${height}rem` }}
              className={cn(
                '-mt-1 w-full flex flex-col items-center justify-center gap-0.5',
                'rounded-neo border-neo border-neo-black shadow-hard',
                PLINTH[rank] ?? PLINTH[3]
              )}
            >
              <span
                className={cn(
                  'font-neo-display font-black leading-none opacity-60',
                  projector ? 'text-2xl' : 'text-sm'
                )}
                aria-hidden
              >
                {rank}
              </span>
              <span
                className={cn(
                  'font-neo-display font-black tabular-nums leading-none',
                  projector ? 'text-6xl' : 'text-3xl'
                )}
              >
                {entry.score}
              </span>
              {entry.detail && (
                <span
                  data-testid={`podium-detail-${rank}`}
                  className={cn('font-neo-body font-bold opacity-80', projector ? 'text-xl' : 'text-xs')}
                >
                  {entry.detail}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default ResultsPodium;
