'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { PYRAMID_ART, type PyramidSize } from './pyramidArt';

export type TierState = 'solved' | 'gaveUp' | 'current' | 'locked';

const BRICKS_PER_TIER = [5, 4, 3] as const;

// Written out in full so Tailwind's scanner sees them. The container variants
// apply only inside the phone play screen's size container.
const TIER_HEIGHT: Record<PyramidSize, string> = {
  play: 'h-7 [@container(max-height:42rem)]:h-6',
  trophy: 'h-[2.125rem]',
};

const WORD_SIZE: Record<PyramidSize, string> = {
  play: 'text-[0.8rem] [@container(max-height:42rem)]:text-[0.7rem]',
  trophy: 'text-sm',
};

const GHOST_BRICK: Record<'current' | 'locked', string> = {
  current: 'border-neo-cyan bg-neo-navy/70',
  locked: 'border-neo-cream/75 bg-neo-navy/45',
};

const WORD_TONE: Record<TierState, string> = {
  solved: 'text-neo-navy [text-shadow:0_1px_0_var(--neo-cream)]',
  gaveUp: 'text-neo-red [text-shadow:0_1px_0_var(--neo-cream)]',
  current: 'text-neo-cyan',
  locked: '',
};

interface PyramidTierProps {
  index: 0 | 1 | 2;
  state: TierState;
  word?: string;
  size: PyramidSize;
  landing: boolean;
  /** The explorer standing on this tier's step, if this is the highest laid tier. */
  explorer?: ReactNode;
}

export default function PyramidTier({ index, state, word, size, landing, explorer }: PyramidTierProps) {
  const laid = state === 'solved' || state === 'gaveUp';
  return (
    <m.div
      data-testid={`pyramid-tier-${index}`}
      data-state={state}
      data-landing={landing ? 'true' : 'false'}
      initial={landing ? { y: -28 } : false}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 17 }}
      className={`relative flex justify-center ${TIER_HEIGHT[size]}`}
    >
      {Array.from({ length: BRICKS_PER_TIER[index] }, (_, i) =>
        laid ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            data-brick
            src={PYRAMID_ART.brick}
            alt=""
            width={480}
            height={285}
            draggable={false}
            className={`h-full w-auto select-none ${state === 'gaveUp' ? 'grayscale-[0.7] brightness-90' : ''}`}
          />
        ) : (
          <span
            key={i}
            data-brick
            className={`m-px aspect-[480/285] h-[calc(100%-2px)] rounded-md border-2 border-dashed ${GHOST_BRICK[state as 'current' | 'locked']}`}
          />
        ),
      )}
      {state !== 'locked' && (
        <span
          dir="auto"
          className={`absolute inset-0 flex items-center justify-center px-3 text-center font-neo-display font-black uppercase leading-none tracking-wide ${WORD_SIZE[size]} ${WORD_TONE[state]}`}
        >
          {laid ? word : '···'}
        </span>
      )}
      {landing && laid && (
        <>
          <DustPuff side="start" />
          <DustPuff side="end" />
        </>
      )}
      {explorer}
    </m.div>
  );
}

function DustPuff({ side }: { side: 'start' | 'end' }) {
  return (
    <m.img
      data-testid={side === 'start' ? 'pyramid-dust' : undefined}
      src={PYRAMID_ART.dust}
      alt=""
      aria-hidden="true"
      draggable={false}
      initial={{ scale: 0.4, opacity: 1, y: 4 }}
      animate={{ scale: 1.3, opacity: 0, y: -4 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.08 }}
      className={`pointer-events-none absolute -bottom-2 h-7 w-auto ${side === 'start' ? '-start-4' : '-end-4'}`}
    />
  );
}

export const tierStateOf = (idx: number, stage: number, solvedBridges: string[], gaveUpBase: readonly boolean[]): TierState => {
  if (gaveUpBase[idx]) return 'gaveUp';
  if (solvedBridges[idx]) return 'solved';
  if (idx === stage) return 'current';
  return 'locked';
};
