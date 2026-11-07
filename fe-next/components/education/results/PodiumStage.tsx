/**
 * PodiumStage — the projector's round-end podium: three flat, hard-edged blocks
 * (silver left, gold centre, bronze right) standing on a floor strip.
 *
 * Same contract as `ResultsPodium` (same props, same `podium-place-N` rows, the
 * same reveal stages), so the two can be swapped at a call site: DOM order is
 * rank order for a screen reader, an unrevealed placing is `aria-hidden` with a
 * placeholder, every block carries `data-plinth-height` (1st tallest) and a
 * `min-height`, never a fixed height.
 *
 * The box keeps a 1920×1086 aspect (EduHostResults sizes the wall off it) and
 * is `dir="ltr"`: gold stays in the middle in Hebrew too. Type inside is sized
 * in `cqw`, so a 1100px projector column and a 390px phone read the same.
 *
 * No entrance opacity anywhere (Class 5): the blocks are painted from frame
 * one; the reveal swaps CONTENT on a transform-only pop and the score counts up.
 */

'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { FINAL_STAGE, isRevealed, type RoundEndStage } from '@/lib/education/roundEndStage';
import type { PodiumEntry } from './ResultsPodium';
import { orderPodiumByScore, podiumCountFloor } from './podiumOrder';

export interface PedestalSpot {
  /** Horizontal centre of the block, % of the stage's width. */
  x: number;
  /** Block width, % of the stage's width. */
  width: number;
  /** Block min-height in cqw of the stage — the step 1 > 2 > 3 the podium is for. */
  plinth: number;
  /** Top of the block at its min-height, % of the stage's height (1st highest). */
  top: number;
}

/** Floor strip the three blocks stand on, % of the stage's height. */
const FLOOR = 12;
/** The stage box is locked to 1920×1086, so its height is this many cqw. */
const STAGE_CQH = (100 * 1086) / 1920;

function spot(x: number, width: number, plinth: number): PedestalSpot {
  return { x, width, plinth, top: 100 - FLOOR - (plinth / STAGE_CQH) * 100 };
}

/** Gold in the centre, silver left, bronze right; the blocks touch like one podium. */
export const PEDESTALS: Record<1 | 2 | 3, PedestalSpot> = {
  1: spot(50, 21, 27),
  2: spot(30, 19, 20),
  3: spot(70, 19, 14.5),
};

/**
 * The three metals as flat neo blocks: gold, silver, bronze must read from the
 * back row with the digit covered. Whole literal classes (Tailwind v4 only
 * emits what it can read verbatim).
 */
export type Medal = 'gold' | 'silver' | 'bronze';

export const MEDAL: Record<1 | 2 | 3, Medal> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

export const MEDAL_FILL: Record<Medal, string> = {
  gold: 'bg-neo-yellow',
  silver: 'bg-neo-cream',
  bronze: 'bg-neo-orange',
};

const PLATE: Record<1 | 2 | 3, string> = {
  1: `${MEDAL_FILL.gold} border-neo-black text-neo-black`,
  2: `${MEDAL_FILL.silver} border-neo-black text-neo-black`,
  3: `${MEDAL_FILL.bronze} border-neo-black text-neo-black`,
};

/** Nobody scored: a plain slate block, so no metal hands out a place nobody earned. */
const MUTED_PLATE = 'bg-neo-navy-light border-neo-cream/50 text-neo-cream';

const RIBBON: Record<1 | 2 | 3, string> = { 1: 'bg-neo-pink', 2: 'bg-neo-cyan', 3: 'bg-neo-purple' };

/** Flat confetti chips stuck to the stage: [left %, top %, size cqw, tilt deg, fill]. */
const CONFETTI: Array<[number, number, number, number, string]> = [
  [5, 12, 3.4, -18, 'bg-neo-pink'],
  [15, 30, 2.4, 24, 'bg-neo-cyan'],
  [22, 6, 2.2, 40, 'bg-neo-orange'],
  [36, 18, 2, -30, 'bg-neo-purple'],
  [63, 8, 2.8, 12, 'bg-neo-cyan'],
  [80, 22, 2.2, -42, 'bg-neo-pink'],
  [88, 6, 3, 28, 'bg-neo-orange'],
  [93, 34, 2.4, -12, 'bg-neo-yellow'],
];

/** A hard-edged comic burst: 16 solid wedges, no gradient, no mask. */
const BURST_POINTS = Array.from({ length: 16 }, (_, i) => {
  const a0 = (i / 16) * Math.PI * 2;
  const a1 = a0 + Math.PI / 32;
  const r = 50;
  return `50,50 ${(50 + r * Math.cos(a0)).toFixed(2)},${(50 + r * Math.sin(a0)).toFixed(2)} ${(50 + r * Math.cos(a1)).toFixed(2)},${(50 + r * Math.sin(a1)).toFixed(2)}`;
});

export interface PodiumStageProps {
  entries: PodiumEntry[];
  stage?: RoundEndStage;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Extra art-space overlays (the class chest). Rendered inside the locked box. */
  children?: ReactNode;
  className?: string;
  /** Nobody scored: no crown, no god rays — the plinths stay, the party does not. */
  muted?: boolean;
}

function rankOf(entry: PodiumEntry): 1 | 2 | 3 {
  return entry.rank === 1 || entry.rank === 2 ? entry.rank : 3;
}

function MedalDisc({ position, rank }: { position: 1 | 2 | 3; rank: 1 | 2 | 3 }) {
  return (
    <span
      data-testid={`podium-medal-${position}`}
      aria-hidden="true"
      className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[62%] flex-col items-center"
    >
      <span className="flex" style={{ gap: '0.3cqw', marginBottom: '-1.2cqw' }}>
        <span className={cn('block -rotate-12 border-[2px] border-neo-black', RIBBON[rank])} style={{ width: '1.3cqw', height: '2cqw' }} />
        <span className={cn('block rotate-12 border-[2px] border-neo-black', RIBBON[rank])} style={{ width: '1.3cqw', height: '2cqw' }} />
      </span>
      <span
        className={cn(
          'grid place-items-center rounded-full border-[3px] border-neo-black font-neo-display font-black leading-none text-neo-black shadow-[0.3cqw_0.3cqw_0_rgb(var(--neo-black))]',
          MEDAL_FILL[MEDAL[rank]]
        )}
        style={{
          width: rank === 1 ? '4.6cqw' : '3.8cqw',
          height: rank === 1 ? '4.6cqw' : '3.8cqw',
          fontSize: rank === 1 ? '2.4cqw' : '2cqw',
        }}
      >
        {rank}
      </span>
    </span>
  );
}

/** Competition place: equal scores share a place, so a tie for first is gold twice. */
function placeOf(entry: PodiumEntry, ordered: PodiumEntry[]): 1 | 2 | 3 {
  const place = 1 + ordered.filter((o) => o.score > entry.score).length;
  return place === 1 || place === 2 ? place : 3;
}

function Placing({ entry, place, stage, floor, muted }: { entry: PodiumEntry; place: 1 | 2 | 3; stage: RoundEndStage; floor: number; muted: boolean }) {
  const reduceMotion = useReducedMotion();
  const rank = rankOf(entry);
  const spot = PEDESTALS[rank];
  const revealed = isRevealed(rank, stage);
  // Counts up FROM the placing below it, so silver can never read under bronze on a frame caught mid-reveal.
  const climbed = useCountUp({
    target: revealed ? Math.max(0, entry.score - floor) : 0,
    duration: rank === 1 ? 1600 : 1100,
    immediate: !!reduceMotion,
  });
  const shown = floor + climbed;
  const winner = rank === 1;

  return (
    <li
      data-testid={`podium-place-${rank}`}
      data-rank={String(rank)}
      data-plinth-height={String(spot.plinth)}
      data-revealed={String(revealed)}
      data-medal={muted ? undefined : MEDAL[place]}
      aria-hidden={revealed ? undefined : true}
      className="contents"
    >
      <div
        data-testid={`podium-plate-${rank}`}
        className={cn(
          'absolute flex -translate-x-1/2 flex-col items-center justify-start gap-[0.4cqw] rounded-t-neo border-[3px] px-[1cqw] pb-[1cqw] pt-[3cqw] shadow-[0.5cqw_0.5cqw_0_rgb(var(--neo-black))]',
          muted ? MUTED_PLATE : PLATE[place]
        )}
        style={{
          left: `${spot.x}%`,
          bottom: `${FLOOR}%`,
          width: `${spot.width}%`,
          minHeight: `${spot.plinth}cqw`,
        }}
      >
        {!muted && <MedalDisc position={rank} rank={place} />}
        <span
          aria-hidden="true"
          className="font-neo-display font-black tabular-nums leading-none"
          style={{ fontSize: winner ? '5.6cqw' : '4.4cqw' }}
        >
          {revealed ? shown : '···'}
        </span>
        {revealed && <span className="sr-only">{entry.score}</span>}
        {entry.detail && revealed && (
          <span
            data-testid={`podium-detail-${rank}`}
            className="max-w-full text-balance text-center font-neo-body font-bold leading-tight"
            style={{ fontSize: '1.4cqw' }}
          >
            {entry.detail}
          </span>
        )}
      </div>
      <m.div
        className="absolute flex -translate-x-1/2 flex-col items-center"
        style={{ left: `${spot.x}%`, bottom: `calc(${FLOOR}% + ${spot.plinth + (muted ? 1 : 3.4)}cqw)`, width: `${spot.width + 4}%` }}
        initial={false}
        animate={revealed ? { scale: 1, y: 0 } : { scale: 0.85, y: 6 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 13 }}
      >
        {winner && revealed && !muted && (
          <Crown
            data-testid="podium-crown"
            className="mb-[-0.6cqw] fill-neo-yellow text-neo-black motion-safe:animate-neo-wobble"
            style={{ width: '5cqw', height: '5cqw' }}
            aria-hidden
          />
        )}
        <span
          data-testid={revealed ? 'podium-avatar' : undefined}
          aria-hidden="true"
          className={cn(
            'relative grid place-items-center overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy-light shadow-[0.4cqw_0.4cqw_0_rgb(var(--neo-black))] [&_svg]:h-full [&_svg]:w-full',
            winner && !muted ? 'ring-[0.4cqw] ring-neo-yellow' : ''
          )}
          style={{ width: winner ? '10cqw' : '8cqw', height: winner ? '10cqw' : '8cqw' }}
        >
          {revealed ? (
            <Avatar userId={entry.username} size="xl" disableEffects className="!h-full !w-full" />
          ) : (
            <span className="font-neo-display font-black text-neo-cream" style={{ fontSize: '4cqw' }}>?</span>
          )}
        </span>
        <p
          dir="auto"
          className="mt-[0.6cqw] max-w-full truncate rounded-neo border-[2px] border-neo-black bg-neo-cream px-[1cqw] py-[0.3cqw] text-center font-neo-display font-black leading-tight text-neo-black shadow-[0.3cqw_0.3cqw_0_rgb(var(--neo-black))]"
          style={{ fontSize: winner ? '2.6cqw' : '2.1cqw' }}
        >
          {revealed ? entry.username : '—'}
        </p>
      </m.div>
    </li>
  );
}

export function PodiumStage({ entries, stage = FINAL_STAGE, t, children, className, muted = false }: PodiumStageProps) {
  // Rank follows SCORE here too (not only at the call site): a block must never hold more points than the one above it.
  const ordered = orderPodiumByScore(entries);
  const winnerUp = isRevealed(1, stage) && !muted;

  return (
    <div
      data-testid="podium-stage"
      data-muted={muted ? 'true' : undefined}
      dir="ltr"
      className={cn(
        'relative mx-auto aspect-[1920/1086] w-full overflow-hidden rounded-neo-lg border-4 border-neo-cream bg-neo-navy shadow-hard-lg [container-type:inline-size]',
        className
      )}
    >
      {winnerUp && (
        <svg
          aria-hidden="true"
          data-testid="podium-burst"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute"
          style={{ left: `${PEDESTALS[1].x}%`, top: `${PEDESTALS[1].top - 18}%`, width: '62cqw', height: '62cqw', marginLeft: '-31cqw', marginTop: '-31cqw' }}
        >
          <g className="motion-safe:animate-[spin_40s_linear_infinite]" style={{ transformOrigin: '50px 50px', transformBox: 'view-box' }}>
            {BURST_POINTS.map((points) => (
              <polygon key={points} points={points} className="fill-neo-yellow" opacity={0.16} />
            ))}
          </g>
        </svg>
      )}

      {!muted &&
        CONFETTI.map(([left, top, size, tilt, fill]) => (
          <span
            key={`${left}-${top}`}
            aria-hidden="true"
            className={cn('pointer-events-none absolute border-[2px] border-neo-black', fill)}
            style={{ left: `${left}%`, top: `${top}%`, width: `${size}cqw`, height: `${size * 0.55}cqw`, transform: `rotate(${tilt}deg)` }}
          />
        ))}

      <div
        aria-hidden="true"
        data-testid="podium-floor"
        className="absolute inset-x-0 bottom-0 border-t-[3px] border-t-neo-cream/50 bg-neo-navy-light"
        style={{ height: `${FLOOR}%` }}
      />

      <ol aria-label={t('education.results.podium.title')} className="absolute inset-0 m-0 list-none p-0">
        {ordered.map((entry) => (
          <Placing key={entry.username} entry={entry} place={placeOf(entry, ordered)} stage={stage} floor={podiumCountFloor(ordered, entry.rank)} muted={muted} />
        ))}
      </ol>

      {children}
    </div>
  );
}

export default PodiumStage;
