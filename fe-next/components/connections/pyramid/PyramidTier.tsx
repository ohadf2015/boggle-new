'use client';

import type { CSSProperties } from 'react';
import { m } from 'framer-motion';
import { PYRAMID_ART, type PyramidSize } from './pyramidArt';
import { carvedWordSize } from './pyramidFit';

export type TierState = 'solved' | 'gaveUp' | 'current' | 'locked';

// Written out in full so Tailwind's scanner sees them. The container variants
// apply only inside the phone play screen's size container.
const BRICK_HEIGHT: Record<PyramidSize, string> = {
  play: 'h-10 [@container(max-height:42rem)]:h-9',
  trophy: 'h-14',
};

const SOCKET: Record<'current' | 'locked', string> = {
  current: 'border-neo-cyan bg-neo-navy/75 text-neo-cyan shadow-[0_0_0_3px_color-mix(in_srgb,var(--neo-cyan)_30%,transparent)]',
  locked: 'border-neo-cream/60 bg-neo-navy/50',
};

// Carved: dark sandstone ink, lit lip below, shadowed lip above.
const ENGRAVED = '[text-shadow:0_1px_0_color-mix(in_srgb,var(--neo-cream)_75%,transparent),0_-1px_0_rgb(var(--neo-black)/0.35)]';

const WORD_TONE: Record<'solved' | 'gaveUp', string> = {
  solved: 'text-neo-navy/85',
  gaveUp: 'text-neo-red',
};

interface PyramidTierProps {
  index: 0 | 1 | 2;
  state: TierState;
  word?: string;
  size: PyramidSize;
  landing: boolean;
}

/** One base brick: the bridge word of one riddle, carved into sandstone once it is solved. */
export default function PyramidTier({ index, state, word = '', size, landing }: PyramidTierProps) {
  const laid = state === 'solved' || state === 'gaveUp';
  return (
    <m.div
      data-testid={`pyramid-tier-${index}`}
      data-brick
      data-state={state}
      data-landing={landing ? 'true' : 'false'}
      initial={landing ? { y: -28 } : false}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 17 }}
      className={`relative flex min-w-0 flex-1 items-center justify-center [container-type:size] ${BRICK_HEIGHT[size]} ${
        laid ? '' : `rounded-md border-[3px] border-dashed ${SOCKET[state as 'current' | 'locked']}`
      }`}
    >
      {laid ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PYRAMID_ART.brick}
            alt=""
            width={480}
            height={285}
            draggable={false}
            className={`absolute inset-0 h-full w-full select-none object-fill ${state === 'gaveUp' ? 'grayscale brightness-90' : ''}`}
          />
          <span
            data-word
            dir="auto"
            style={{ '--carve': carvedWordSize(word) } as CSSProperties}
            className={`relative whitespace-nowrap [font-size:var(--carve)] px-1 pt-[6%] text-center font-neo-display font-black uppercase leading-none tracking-wide rtl:tracking-normal ${ENGRAVED} ${WORD_TONE[state as 'solved' | 'gaveUp']}`}
          >
            {word}
          </span>
        </>
      ) : (
        state === 'current' && <span className="font-neo-display text-[55cqh] font-black leading-none">?</span>
      )}
      {landing && laid && (
        <>
          <DustPuff side="start" />
          <DustPuff side="end" />
        </>
      )}
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
