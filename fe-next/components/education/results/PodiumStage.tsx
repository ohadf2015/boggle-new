/**
 * PodiumStage — the projector's round-end podium, standing on the painted
 * pedestals of `podium-bg` (silver left, gold centre, bronze right).
 *
 * Same contract as `ResultsPodium` (same props, same `podium-place-N` rows, the
 * same reveal stages), so the two can be swapped at a call site: DOM order is
 * rank order for a screen reader, an unrevealed placing is `aria-hidden` with a
 * placeholder, every plinth carries `data-plinth-height` (1st tallest) and a
 * `min-height`, never a fixed height.
 *
 * THE ART IS ASPECT-LOCKED. The pedestals are pixels in a 1920×1086 painting,
 * so the box keeps that ratio and every placard is positioned in % of it
 * (`PEDESTALS`, measured off the art with a grid overlay). The box is
 * `dir="ltr"` and uses physical `left`: the painting does not mirror in Hebrew,
 * so logical offsets would slide RTL names off their pedestals. Type inside is
 * sized in `cqw` of the box, so a 1100px projector column and a 390px phone
 * preview read the same.
 *
 * No entrance opacity anywhere (Class 5): the art and the pedestals are painted
 * from frame one; the reveal swaps placard CONTENT on a transform-only pop and
 * the score counts up (`useCountUp`), landing on the real number — which is
 * also printed for assistive tech from the start of the reveal.
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
  /** Horizontal centre of the pedestal, % of the art's width. */
  x: number;
  /** Far edge of the pedestal's top surface, % of the art's height. */
  top: number;
  /** Centre of the pedestal's front face, % of the art's height. */
  face: number;
  /** Pedestal width, % of the art's width. */
  width: number;
  /** Plinth "height" in rem-equivalents — the step 1 > 2 > 3 the podium is for. */
  plinth: number;
}

/** Measured off public/images/education/podium-bg.webp (1920×1086). */
export const PEDESTALS: Record<1 | 2 | 3, PedestalSpot> = {
  1: { x: 48.8, top: 37.0, face: 54.0, width: 21.0, plinth: 12 },
  2: { x: 29.7, top: 46.8, face: 59.0, width: 18.7, plinth: 9 },
  3: { x: 68.2, top: 50.0, face: 62.0, width: 18.2, plinth: 7 },
};

/**
 * The three metals. A plate must read as GOLD / SILVER / BRONZE from the back
 * row with the digit covered — fill, trim and a medal disc all agree. Whole
 * literal classes (Tailwind v4 only emits what it can read verbatim); the
 * sheen is an inline gradient over the fill, so the fill still paints alone.
 */
export type Medal = 'gold' | 'silver' | 'bronze';

export const MEDAL: Record<1 | 2 | 3, Medal> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

const PLATE: Record<1 | 2 | 3, string> = {
  1: 'bg-neo-yellow text-neo-black',
  2: 'bg-[#dfe5ee] text-neo-black',
  3: 'bg-[#e8894b] text-neo-black',
};

const SHEEN: Record<1 | 2 | 3, string> = {
  1: 'linear-gradient(160deg, #fff6b0 0%, #ffe135 38%, #f2b90c 72%, #c98a00 100%)',
  2: 'linear-gradient(160deg, #ffffff 0%, #e4e9f0 40%, #b9c2cf 75%, #8e99a8 100%)',
  3: 'linear-gradient(160deg, #ffd0a3 0%, #e8894b 42%, #b85a24 78%, #8a3d12 100%)',
};

/** The medal disc's face — same metal, deeper, with a darker rim. */
const DISC: Record<1 | 2 | 3, { face: string; rim: string; ribbon: string }> = {
  1: { face: 'radial-gradient(circle at 35% 30%, #fffbd1 0%, #ffd400 45%, #d19a00 100%)', rim: '#8a6200', ribbon: '#ff1493' },
  2: { face: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #cfd6e0 50%, #8b96a6 100%)', rim: '#5b6574', ribbon: '#00b3ff' },
  3: { face: 'radial-gradient(circle at 35% 30%, #ffe0c2 0%, #d9793c 50%, #8a3d12 100%)', rim: '#5e2708', ribbon: '#8b5cf6' },
};

export interface PodiumStageProps {
  entries: PodiumEntry[];
  stage?: RoundEndStage;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Extra art-space overlays (the class chest). Rendered inside the locked box. */
  children?: ReactNode;
  className?: string;
}

function rankOf(entry: PodiumEntry): 1 | 2 | 3 {
  return entry.rank === 1 || entry.rank === 2 ? entry.rank : 3;
}

function MedalDisc({ rank }: { rank: 1 | 2 | 3 }) {
  const disc = DISC[rank];
  return (
    <span
      data-testid={`podium-medal-${rank}`}
      aria-hidden="true"
      className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[70%] flex-col items-center"
    >
      {/* Ribbon: two tails in a V, behind the disc. */}
      <span className="flex" style={{ gap: '0.3cqw', marginBottom: '-1.2cqw' }}>
        <span className="block -rotate-12 border-[2px] border-neo-black" style={{ width: '1.3cqw', height: '2cqw', background: disc.ribbon }} />
        <span className="block rotate-12 border-[2px] border-neo-black" style={{ width: '1.3cqw', height: '2cqw', background: disc.ribbon }} />
      </span>
      <span
        className="grid place-items-center rounded-full font-neo-display font-black leading-none text-neo-black shadow-[0.25cqw_0.25cqw_0_#000]"
        style={{
          width: rank === 1 ? '4.4cqw' : '3.6cqw',
          height: rank === 1 ? '4.4cqw' : '3.6cqw',
          background: disc.face,
          border: `0.35cqw solid ${disc.rim}`,
          outline: '0.18cqw solid #000',
          fontSize: rank === 1 ? '2.3cqw' : '1.9cqw',
        }}
      >
        {rank}
      </span>
    </span>
  );
}

function Placing({ entry, stage, floor }: { entry: PodiumEntry; stage: RoundEndStage; floor: number }) {
  const reduceMotion = useReducedMotion();
  const rank = rankOf(entry);
  const spot = PEDESTALS[rank];
  const revealed = isRevealed(rank, stage);
  // Counts up FROM the placing below it, so silver can never read under bronze
  // on a frame caught mid-reveal.
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
      data-medal={MEDAL[rank]}
      aria-hidden={revealed ? undefined : true}
      className="contents"
    >
      {/* The plate on the pedestal's face: score + sub-line. First in the
          row so it is the plinth element a reader of `[style]` finds. */}
      <div
        data-testid={`podium-plate-${rank}`}
        className={cn(
          'absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-neo border-[3px] border-neo-black px-[1cqw] pt-[1.6cqw] shadow-[0.35cqw_0.35cqw_0_#000]',
          PLATE[rank]
        )}
        style={{
          left: `${spot.x}%`,
          top: `${spot.face}%`,
          minWidth: `${spot.width * 0.62}%`,
          maxWidth: `${spot.width * 0.9}%`,
          minHeight: `${spot.plinth * 0.6}cqw`,
          backgroundImage: SHEEN[rank],
          // An inner trim line in the metal's own dark tone: a plate, not a sticker.
          boxShadow: `inset 0 0 0 0.3cqw rgba(255,255,255,0.55), inset 0 -0.6cqw 0 rgba(0,0,0,0.18), 0.35cqw 0.35cqw 0 #000`,
        }}
      >
        <MedalDisc rank={rank} />
        <span
          aria-hidden="true"
          className="font-neo-display font-black tabular-nums leading-none"
          style={{ fontSize: winner ? '5.2cqw' : '4.2cqw' }}
        >
          {revealed ? shown : '···'}
        </span>
        {revealed && <span className="sr-only">{entry.score}</span>}
        {entry.detail && revealed && (
          <span
            data-testid={`podium-detail-${rank}`}
            className="max-w-full truncate font-neo-body font-bold leading-tight opacity-85"
            style={{ fontSize: '1.4cqw' }}
          >
            {entry.detail}
          </span>
        )}
      </div>
      {/* The student, standing on the pedestal top: face, crown, name plate. */}
      <m.div
        className="absolute flex -translate-x-1/2 flex-col items-center"
        style={{ left: `${spot.x}%`, bottom: `${100 - spot.top - 2.5}%`, width: `${spot.width + 4}%` }}
        initial={false}
        animate={revealed ? { scale: 1, y: 0 } : { scale: 0.85, y: 6 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 13 }}
      >
        {winner && revealed && (
          <Crown
            data-testid="podium-crown"
            className="mb-[-0.6cqw] text-neo-yellow drop-shadow-[0.25cqw_0.25cqw_0_#000] motion-safe:animate-neo-wobble"
            style={{ width: '5cqw', height: '5cqw' }}
            aria-hidden
          />
        )}
        <span
          data-testid={revealed ? 'podium-avatar' : undefined}
          aria-hidden="true"
          className={cn(
            'relative grid place-items-center overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy shadow-[0.4cqw_0.4cqw_0_#000] [&_svg]:h-full [&_svg]:w-full',
            winner ? 'ring-[0.4cqw] ring-neo-yellow' : ''
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
          className="mt-[0.6cqw] max-w-full truncate rounded-neo border-[2px] border-neo-cream bg-neo-navy px-[1cqw] py-[0.3cqw] text-center font-neo-display font-black leading-tight text-neo-white shadow-[0.3cqw_0.3cqw_0_#000]"
          style={{ fontSize: winner ? '2.6cqw' : '2.1cqw' }}
        >
          {revealed ? entry.username : '—'}
        </p>
      </m.div>

    </li>
  );
}

export function PodiumStage({ entries, stage = FINAL_STAGE, t, children, className }: PodiumStageProps) {
  const reduceMotion = useReducedMotion();
  // Rank follows SCORE here too (not only at the call site): a pedestal must
  // never hold more points than the one above it, whatever the payload says.
  const ordered = orderPodiumByScore(entries);
  const winnerUp = isRevealed(1, stage);

  return (
    <div
      data-testid="podium-stage"
      dir="ltr"
      className={cn(
        'relative mx-auto aspect-[1920/1086] w-full overflow-hidden rounded-neo-lg border-4 border-neo-cream bg-neo-navy shadow-hard-lg [container-type:inline-size]',
        className
      )}
    >
      <img
        data-testid="podium-stage-art"
        src="/images/education/podium-bg.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />

      {/* God rays wheel out from behind the gold pedestal once the winner lands.
          Static opacity, transform-only spin; still under reduced motion. */}
      {winnerUp && (
        <m.div
          aria-hidden="true"
          data-testid="podium-god-rays"
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${PEDESTALS[1].x}%`,
            top: `${PEDESTALS[1].top}%`,
            width: '90cqw',
            height: '90cqw',
            marginLeft: '-45cqw',
            marginTop: '-45cqw',
            opacity: 0.35,
            background:
              'conic-gradient(from 0deg, #FFE135 0deg 10deg, transparent 10deg 30deg, #FFE135 30deg 40deg, transparent 40deg 60deg, #FFE135 60deg 70deg, transparent 70deg 90deg, #FFE135 90deg 100deg, transparent 100deg 120deg, #FFE135 120deg 130deg, transparent 130deg 150deg, #FFE135 150deg 160deg, transparent 160deg 180deg, #FFE135 180deg 190deg, transparent 190deg 210deg, #FFE135 210deg 220deg, transparent 220deg 240deg, #FFE135 240deg 250deg, transparent 250deg 270deg, #FFE135 270deg 280deg, transparent 280deg 300deg, #FFE135 300deg 310deg, transparent 310deg 330deg, #FFE135 330deg 340deg, transparent 340deg 360deg)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 4%, black 18%, transparent 60%)',
            maskImage: 'radial-gradient(circle, transparent 4%, black 18%, transparent 60%)',
            willChange: 'transform',
          }}
          initial={false}
          animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 30, ease: 'linear', repeat: Infinity }}
        />
      )}

      <ol aria-label={t('education.results.podium.title')} className="absolute inset-0 m-0 list-none p-0">
        {ordered.map((entry) => (
          <Placing key={entry.username} entry={entry} stage={stage} floor={podiumCountFloor(ordered, entry.rank)} />
        ))}
      </ol>

      {children}
    </div>
  );
}

export default PodiumStage;
