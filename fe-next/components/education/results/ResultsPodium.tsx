/**
 * ResultsPodium — the first thing the room sees when a game ends.
 *
 * Three plinths, winner in the middle and tallest. Kahoot draws flat bars in
 * one purple; this is colour-coded, hard-shadowed and rotated a hair off true,
 * so the winner's plinth reads as an object on the wall rather than a chart
 * column.
 *
 * It PAINTS ON MOUNT. The plinths used to rise bottom-up on staged
 * `animation-delay` over `animate-neo-pop`, whose first keyframe is
 * `opacity: 0` — with `animationFillMode: 'both'` the backwards fill held the
 * winner invisible for the whole 450ms delay. A capture read the full
 * standings out of the a11y tree while the screenshot showed an empty screen
 * (Pitfall Class 5).
 *
 * THE REVEAL IS BACK, AND IT IS NOT AN ENTRANCE TWEEN. Pass `stage` (from
 * `useRoundEndReveal`) and the room gets third, second, a beat, then the
 * winner. What is staged is the CONTENT of a placard that is already drawn:
 * from the first frame there are three full-height coloured plinths on the
 * wall, and the names and scores land inside them on a transform-only scale.
 * So a screenshot taken at any instant of the reveal shows a podium — and an
 * un-revealed plinth is `aria-hidden`, so the a11y tree can never read out a
 * name the pixels are not showing. Omit `stage` and everything is revealed
 * from the first frame, which is what the non-classroom callers get.
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
import { FINAL_STAGE, isRevealed, type RoundEndStage } from '@/lib/education/roundEndStage';

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
  /**
   * Classroom opt-in. Omitted (every non-classroom caller) means every placing
   * is readable from the first frame — the static podium, unchanged.
   */
  stage?: RoundEndStage;
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


/**
 * The placard's two states, both transform-only. A plinth waiting its turn sits
 * a hair small and tilted — visibly a plinth, visibly empty — and snaps to true
 * on reveal. No opacity is touched at any point, by anything.
 */
const REVEAL_MOTION =
  'transition-transform duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] motion-reduce:transition-none';

export function ResultsPodium({ entries, size = 'card', stage = FINAL_STAGE, t }: ResultsPodiumProps) {
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
        const revealed = isRevealed(rank, stage);
        return (
          <li
            key={entry.username}
            data-testid={`podium-place-${rank}`}
            data-rank={String(rank)}
            data-plinth-height={String(height)}
            data-revealed={String(revealed)}
            // The pixels and the screen reader say the same thing at the same
            // time: a plinth whose name has not landed yet is not readable.
            aria-hidden={revealed ? undefined : true}
            className={cn(
              'flex-1 sm:max-w-[14rem] flex flex-col items-center',
              COLUMN[rank] ?? 'sm:order-3'
            )}
          >
            {/* Name cap — sits on the plinth like a placard. */}
            <div
              className={cn(
                'relative z-10 w-full rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated',
                'px-3 py-2 text-center shadow-hard-sm',
                TILT[rank],
                REVEAL_MOTION,
                revealed ? 'scale-100' : 'scale-95'
              )}
            >
              {rank === 1 && revealed && (
                <Crown
                  data-testid="podium-crown"
                  className={cn(
                    'absolute start-1/2 -translate-x-1/2 rtl:translate-x-1/2 text-neo-yellow',
                    // Clear of the placard, not on it. Caught on the projector:
                    // a 40px crown at -top-4 dropped two-thirds of itself into a
                    // text-3xl name and struck it through. The offset tracks the
                    // icon so the crown sits ABOVE the board in both sizes.
                    projector ? '-top-9' : '-top-6',
                    // The ONE moving thing on the screen, and it is a 28px icon:
                    // a transform-only rotate, never an opacity tween, so no
                    // plinth can ever be caught mid-fade (Class 5).
                    'animate-neo-wobble motion-reduce:animate-none',
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
                {/* An em-dash placeholder, not a blank: the placard keeps its
                    height, so nothing on the wall moves when the name lands. */}
                {revealed ? entry.username : '—'}
              </p>
            </div>

            {/* The plinth itself — drawn at full height and full colour from
                the first frame, whatever the stage. This is the object a
                screenshot always catches. */}
            <div
              style={{ height: `${height}rem` }}
              className={cn(
                '-mt-1 w-full flex flex-col items-center justify-center gap-0.5',
                'rounded-neo border-[2px] border-neo-black shadow-hard',
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
                  REVEAL_MOTION,
                  revealed ? 'scale-100' : 'scale-90',
                  projector ? 'text-6xl' : 'text-3xl'
                )}
              >
                {revealed ? entry.score : '·····'}
              </span>
              {entry.detail && revealed && (
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
