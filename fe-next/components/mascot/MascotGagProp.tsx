'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { PropKind, PropMove } from '@/lib/mascot/gagTypes';

const TILE = 'rounded-sm border-2 border-neo-navy bg-neo-yellow shadow-hard-sm';

const MOVES: Record<PropMove, { initial: Record<string, number>; animate: Record<string, number>; duration: number }> = {
  enter: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, duration: 0.25 },
  hold: { initial: { opacity: 1 }, animate: { opacity: 1 }, duration: 0 },
  flip: { initial: { rotate: 0 }, animate: { rotate: 180 }, duration: 0.8 },
  close: { initial: { scaleX: 1 }, animate: { scaleX: 0.2 }, duration: 0.12 },
  fall: { initial: { y: 0, rotate: 0 }, animate: { y: 70, rotate: 40, opacity: 0 }, duration: 0.3 },
  drop: { initial: { y: -50 }, animate: { y: 0 }, duration: 0.14 },
  exit: { initial: { opacity: 1, x: 0 }, animate: { opacity: 0, x: 18 }, duration: 0.3 },
  'zip-out': { initial: { scaleX: 0.15 }, animate: { scaleX: 1 }, duration: 0.14 },
  snap: { initial: { scaleX: 1 }, animate: { scaleX: 0.15 }, duration: 0.09 },
  crumple: { initial: { scale: 1, rotate: 0 }, animate: { scale: 0.35, rotate: 220 }, duration: 1 },
};

const TAPE_STRIP = 'h-2 w-10 border-2 border-neo-navy bg-neo-yellow bg-[repeating-linear-gradient(90deg,var(--color-neo-navy)_0_1px,transparent_1px_5px)]';

function Tape({ double }: { double?: boolean }) {
  return (
    <div className="flex flex-row-reverse items-center">
      <div className="size-4 shrink-0 rounded-full border-2 border-neo-navy bg-neo-lime" />
      <div className={TAPE_STRIP} />
      {double && <div className="z-10 -mx-1 h-3 w-2 rotate-6 bg-neo-pink/80" />}
      {double && <div className={TAPE_STRIP} />}
    </div>
  );
}

function Shape({ kind }: { kind: PropKind }) {
  switch (kind) {
    case 'tile':
      return <div className={`size-5 ${TILE}`} />;
    case 'tile-stack':
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div className={`size-4 ${TILE}`} />
          <div className={`size-4 ${TILE} bg-neo-lime`} />
          <div className={`size-4 ${TILE} bg-neo-pink`} />
        </div>
      );
    case 'stamp':
      return (
        <div className="flex flex-col items-center">
          <div className="h-3 w-2 rounded-t-sm border-2 border-neo-navy bg-neo-pink" />
          <div className="h-3 w-7 rounded-sm border-2 border-neo-navy bg-neo-lime" />
        </div>
      );
    case 'book':
      return (
        <div className="flex">
          <div className="h-6 w-5 rounded-s-sm border-2 border-neo-navy bg-neo-cyan" />
          <div className="h-6 w-5 rounded-e-sm border-2 border-s-0 border-neo-navy bg-neo-cyan" />
        </div>
      );
    case 'photo':
      return (
        <div className="h-8 w-7 rotate-[-6deg] rounded-sm border-2 border-neo-navy bg-neo-cream p-0.5 pb-2 shadow-hard-sm">
          <div className="size-full bg-neo-navy" />
        </div>
      );
    case 'trophy':
      return (
        <div className="flex flex-col items-center">
          <div className="h-4 w-6 rounded-b-full border-2 border-neo-navy bg-neo-yellow" />
          <div className="h-2 w-1.5 bg-neo-navy" />
          <div className="h-1.5 w-5 rounded-sm bg-neo-navy" />
        </div>
      );
    case 'dust':
      return (
        <div className="flex gap-1">
          <div className="size-2 rounded-full bg-neo-cream/60" />
          <div className="size-1.5 rounded-full bg-neo-cream/50" />
          <div className="size-2.5 rounded-full bg-neo-cream/40" />
        </div>
      );
    case 'tape':
      return <Tape />;
    case 'tape-double':
      return <Tape double />;
    case 'score-sheet':
      return (
        <div className="flex h-8 w-7 rotate-3 flex-col items-center gap-1 rounded-sm border-2 border-neo-navy bg-neo-cream px-0.5 pt-0.5 shadow-hard-sm">
          <div className="size-2 rotate-45 bg-neo-yellow" />
          <div className="h-1 w-full bg-neo-pink" />
          <div className="h-0.5 w-2/3 bg-neo-navy" />
        </div>
      );
    case 'cheat-sheet':
      return (
        <div className="flex h-7 w-6 flex-col justify-center gap-1 rounded-sm border-2 border-neo-navy bg-neo-cream px-0.5">
          <div className="h-0.5 bg-neo-navy" />
          <div className="h-0.5 bg-neo-navy" />
          <div className="h-0.5 w-2/3 bg-neo-navy" />
        </div>
      );
  }
}

const SIDE: ReadonlySet<PropKind> = new Set(['photo', 'cheat-sheet', 'tile', 'score-sheet']);
const REACH: ReadonlySet<PropKind> = new Set(['tape', 'tape-double']);

export function MascotGagProp({ kind, move }: { kind: PropKind; move: PropMove }) {
  const m = MOVES[move];
  const place = REACH.has(kind)
    ? 'top-10 end-1/2 ltr:origin-right rtl:origin-left'
    : SIDE.has(kind) ? 'top-8 -start-5' : '-top-5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2';
  return (
    <AdaptiveMotion.div
      data-testid="mascot-gag-prop"
      data-prop={kind}
      initial={m.initial}
      animate={m.animate}
      transition={{ duration: m.duration }}
      className={`absolute ${place} pointer-events-none`}
    >
      <Shape kind={kind} />
    </AdaptiveMotion.div>
  );
}
