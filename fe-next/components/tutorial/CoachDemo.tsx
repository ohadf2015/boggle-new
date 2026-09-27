'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CoachAccent, CoachDemoType } from '@/lib/tutorial/modeCoachContent';

/**
 * Tiny looping gesture demos — "show, don't tell". Each is a ~108px square that
 * animates the ONE core mechanic of a mode. Reduced-motion renders the same
 * art with the final/static frame, so the meaning survives without movement.
 */

const ACCENT_BG: Record<CoachAccent, string> = {
  lime: 'bg-neo-lime text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
  pink: 'bg-neo-pink text-neo-white',
  purple: 'bg-neo-purple text-neo-white',
};

const LOOP = { repeat: Infinity, repeatDelay: 0.5, ease: 'easeInOut' as const };

function Tile({ children, className, active }: { children?: React.ReactNode; className?: string; active?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-[5px] border-2 border-black font-neo-display text-sm font-black shadow-hard-sm',
        active ? '' : 'bg-neo-navy-light text-neo-white/70',
        className,
      )}
    >
      {children}
    </div>
  );
}

function DragDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  const order = [0, 1, 2];
  return (
    <div className="relative flex gap-1.5">
      {order.map((i) => (
        <m.div
          key={i}
          initial={false}
          animate={reduced ? {} : { scale: [1, 1, 1.18, 1, 1] }}
          transition={reduced ? undefined : { duration: 2, times: [0, i * 0.22, i * 0.22 + 0.12, i * 0.22 + 0.3, 1], ...LOOP }}
        >
          <Tile active className={ACCENT_BG[accent]}>
            {['C', 'A', 'T'][i]}
          </Tile>
        </m.div>
      ))}
    </div>
  );
}

function LongWordDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <div className="flex gap-1">
          {['G', 'O'].map((l) => (
            <Tile key={l} active className="bg-neo-navy-light text-neo-white">
              {l}
            </Tile>
          ))}
        </div>
        <span className="font-neo-display text-[10px] font-black text-neo-white/60">+2</span>
      </div>
      <span className="font-neo-display text-lg font-black text-neo-white/50">→</span>
      <div className="flex flex-col items-center gap-1">
        <m.div
          className="flex gap-1"
          animate={reduced ? {} : { scale: [1, 1.12, 1] }}
          transition={reduced ? undefined : { duration: 1.4, ...LOOP }}
        >
          {['G', 'R', 'O', 'W'].map((l) => (
            <Tile key={l} active className={ACCENT_BG[accent]}>
              {l}
            </Tile>
          ))}
        </m.div>
        <span className={cn('font-neo-display text-xs font-black', accentText(accent))}>+12</span>
      </div>
    </div>
  );
}

function TapClueDemo({ reduced }: { reduced: boolean }) {
  // Wordle-style feedback flipping in sequence.
  const colors = ['bg-neo-lime text-neo-black', 'bg-neo-yellow text-neo-black', 'bg-neo-navy-light text-neo-white/70', 'bg-neo-lime text-neo-black'];
  return (
    <div className="flex gap-1.5">
      {['W', 'O', 'R', 'D'].map((l, i) => (
        <m.div
          key={l}
          animate={reduced ? {} : { rotateX: [0, 0, -90, 0], }}
          transition={reduced ? undefined : { duration: 2.2, times: [0, i * 0.18, i * 0.18 + 0.1, i * 0.18 + 0.25], ...LOOP }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <Tile active className={colors[i]}>
            {l}
          </Tile>
        </m.div>
      ))}
    </div>
  );
}

function CenterLetterDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="relative h-[88px] w-[88px]">
      {[
        { t: '0', l: '50%', x: '-50%', y: '0' },
        { t: '50%', l: '0', x: '0', y: '-50%' },
        { t: '50%', l: '100%', x: '-100%', y: '-50%' },
        { t: '100%', l: '50%', x: '-50%', y: '-100%' },
      ].map((p, i) => (
        <div key={i} className="absolute" style={{ top: p.t, left: p.l, transform: `translate(${p.x}, ${p.y})` }}>
          <Tile active className="bg-neo-navy-light text-neo-white">
            {['R', 'T', 'E', 'S'][i]}
          </Tile>
        </div>
      ))}
      <m.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={reduced ? {} : { scale: [1, 1.22, 1] }}
        transition={reduced ? undefined : { duration: 1.3, ...LOOP }}
      >
        <Tile active className={ACCENT_BG[accent]}>
          A
        </Tile>
      </m.div>
    </div>
  );
}

function LockWordDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="relative flex items-center gap-1.5">
      {['W', 'I', 'N'].map((l) => (
        <Tile key={l} active className={ACCENT_BG[accent]}>
          {l}
        </Tile>
      ))}
      <m.span
        className="ml-1 text-xl"
        animate={reduced ? {} : { scale: [1, 0.7, 1.15, 1], rotate: [0, -8, 0] }}
        transition={reduced ? undefined : { duration: 1.6, ...LOOP }}
      >
        🔒
      </m.span>
    </div>
  );
}

function ClearTilesDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 6 }).map((_, i) => {
        const clearing = i < 3;
        return (
          <m.div
            key={i}
            animate={reduced ? {} : clearing ? { scale: [1, 1.2, 0], opacity: [1, 1, 0] } : { y: [0, 0, -6, 0] }}
            transition={reduced ? undefined : { duration: 1.8, ...LOOP }}
          >
            <Tile active className={clearing ? ACCENT_BG[accent] : 'bg-neo-navy-light text-neo-white/70'}>
              {'BLASTX'[i]}
            </Tile>
          </m.div>
        );
      })}
    </div>
  );
}

function StackDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      {[0, 1, 2].map((i) => (
        <m.div
          key={i}
          className="flex gap-1"
          initial={false}
          animate={reduced ? {} : { y: [12, 0], opacity: [0, 1] }}
          transition={reduced ? undefined : { duration: 0.6, delay: i * 0.4, repeat: Infinity, repeatDelay: 1.5, repeatType: 'reverse' }}
        >
          {Array.from({ length: 3 - i }).map((__, j) => (
            <Tile key={j} active className={i === 0 ? ACCENT_BG[accent] : 'bg-neo-navy-light text-neo-white'} />
          ))}
        </m.div>
      ))}
    </div>
  );
}

function ConnectGroupDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: 6 }).map((_, i) => {
        const grouped = [0, 2, 3, 5].includes(i);
        return (
          <m.div
            key={i}
            animate={reduced ? {} : grouped ? { scale: [1, 1.12, 1] } : {}}
            transition={reduced ? undefined : { duration: 1.4, ...LOOP }}
          >
            <Tile active className={grouped ? ACCENT_BG[accent] : 'bg-neo-navy-light text-neo-white/60'} />
          </m.div>
        );
      })}
    </div>
  );
}

function ChainDemo({ accent, reduced }: { accent: CoachAccent; reduced: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {['C', 'A', 'T'].map((l, i) => (
        <Tile key={l} active className={i === 2 ? ACCENT_BG[accent] : 'bg-neo-navy-light text-neo-white'}>
          {l}
        </Tile>
      ))}
      <m.span
        className="font-neo-display text-base font-black text-neo-white/50"
        animate={reduced ? {} : { x: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
        transition={reduced ? undefined : { duration: 1.2, ...LOOP }}
      >
        →
      </m.span>
      {['T', 'O', 'P'].map((l, i) => (
        <Tile key={l} active className={i === 0 ? ACCENT_BG[accent] : 'bg-neo-navy-light text-neo-white'}>
          {l}
        </Tile>
      ))}
    </div>
  );
}

function accentText(accent: CoachAccent): string {
  return {
    lime: 'text-neo-lime',
    cyan: 'text-neo-cyan',
    pink: 'text-neo-pink',
    purple: 'text-neo-purple',
  }[accent];
}

export interface CoachDemoProps {
  demo: CoachDemoType;
  accent: CoachAccent;
  /** Emoji for the static `icon` demo. */
  emoji?: string;
}

export function CoachDemo({ demo, accent, emoji }: CoachDemoProps) {
  const reduced = useReducedMotion() ?? false;

  const inner = (() => {
    switch (demo) {
      case 'drag':
        return <DragDemo accent={accent} reduced={reduced} />;
      case 'longWord':
        return <LongWordDemo accent={accent} reduced={reduced} />;
      case 'tapClue':
        return <TapClueDemo reduced={reduced} />;
      case 'centerLetter':
        return <CenterLetterDemo accent={accent} reduced={reduced} />;
      case 'lockWord':
        return <LockWordDemo accent={accent} reduced={reduced} />;
      case 'clearTiles':
        return <ClearTilesDemo accent={accent} reduced={reduced} />;
      case 'stack':
        return <StackDemo accent={accent} reduced={reduced} />;
      case 'connectGroup':
        return <ConnectGroupDemo accent={accent} reduced={reduced} />;
      case 'chain':
        return <ChainDemo accent={accent} reduced={reduced} />;
      case 'icon':
      default:
        return <span className="text-4xl leading-none">{emoji ?? '✨'}</span>;
    }
  })();

  return (
    <div
      className="flex h-[108px] w-full items-center justify-center rounded-neo border-neo border-black bg-neo-navy/60"
      aria-hidden="true"
    >
      {inner}
    </div>
  );
}
