'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSkipAnimations } from './AdaptiveMotion';

// Spelled out in full so Tailwind's scanner sees every class. Letters are fixed per theme so SSR and client match.
const THEMES = {
  home: { tile: 'bg-neo-lime/12 border-neo-lime/40 shadow-neo-lime/35 text-neo-lime/30', ink: 'fill-neo-lime/12 stroke-neo-lime/40', hill: 'fill-neo-lime/10 stroke-neo-lime/35', letters: 'LEX' },
  daily: { tile: 'bg-neo-orange/12 border-neo-orange/40 shadow-neo-orange/35 text-neo-orange/30', ink: 'fill-neo-orange/12 stroke-neo-orange/40', hill: 'fill-neo-orange/10 stroke-neo-orange/35', letters: 'DAY' },
  solo: { tile: 'bg-neo-cyan/12 border-neo-cyan/40 shadow-neo-cyan/35 text-neo-cyan/30', ink: 'fill-neo-cyan/12 stroke-neo-cyan/40', hill: 'fill-neo-cyan/10 stroke-neo-cyan/35', letters: 'WOR' },
  multiplayer: { tile: 'bg-neo-pink/12 border-neo-pink/40 shadow-neo-pink/35 text-neo-pink/30', ink: 'fill-neo-pink/12 stroke-neo-pink/40', hill: 'fill-neo-pink/10 stroke-neo-pink/35', letters: 'VSK' },
  profile: { tile: 'bg-neo-purple/12 border-neo-purple/40 shadow-neo-purple/35 text-neo-purple/30', ink: 'fill-neo-purple/12 stroke-neo-purple/40', hill: 'fill-neo-purple/10 stroke-neo-purple/35', letters: 'MEZ' },
  teacher: { tile: 'bg-neo-yellow/12 border-neo-yellow/40 shadow-neo-yellow/35 text-neo-yellow/30', ink: 'fill-neo-yellow/12 stroke-neo-yellow/40', hill: 'fill-neo-yellow/10 stroke-neo-yellow/35', letters: 'ABC' },
  student: { tile: 'bg-neo-cyan/12 border-neo-cyan/40 shadow-neo-cyan/35 text-neo-cyan/30', ink: 'fill-neo-cyan/12 stroke-neo-cyan/40', hill: 'fill-neo-cyan/10 stroke-neo-cyan/35', letters: 'QUO' },
} as const;

type Shape = { kind: 'tile' | 'star'; pos: string; dur: number; lively?: true };

// Edges and lower corners only (headers start top-left), sized by vmin so TV screens get big shapes and phones keep a floor.
const SHAPES: Shape[] = [
  { kind: 'tile', pos: 'bottom-[24%] -left-10 size-[max(5rem,14vmin)] -rotate-12', dur: 14 },
  { kind: 'star', pos: 'top-[2%] right-[3%] size-[max(2.5rem,7vmin)]', dur: 11 },
  { kind: 'tile', pos: 'top-[44%] -right-8 size-[max(6rem,16vmin)] rotate-[10deg]', dur: 18 },
  { kind: 'star', pos: 'top-[58%] left-[3%] size-[max(2rem,5vmin)]', dur: 9, lively: true },
  { kind: 'tile', pos: 'bottom-[14%] right-[30%] size-[max(3rem,9vmin)] rotate-6', dur: 13, lively: true },
  { kind: 'star', pos: 'top-[74%] right-[12%] size-[max(1.5rem,4vmin)]', dur: 16, lively: true },
];

const STAR = 'M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z';
const HILL = 'M0 64 V34 C60 10 110 10 170 28 S290 50 330 26 S390 14 400 20 V64 Z';

export interface AmbientBackdropProps {
  theme: keyof typeof THEMES;
  density?: 'calm' | 'lively';
  hill?: boolean;
  className?: string;
}

/** Place inside a `relative isolate` parent; it sits behind that parent's content. */
export function AmbientBackdrop({ theme, density = 'calm', hill = true, className }: AmbientBackdropProps) {
  const skip = useSkipAnimations();
  const [hidden, setHidden] = useState(false);
  const t = THEMES[theme];

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const bob = !skip && 'neo-ambient-bob';
  let tileIndex = 0;

  return (
    <div
      data-ambient
      data-paused={hidden ? 'true' : undefined}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      {SHAPES.filter((s) => density === 'lively' || !s.lively).map((s, i) =>
        s.kind === 'tile' ? (
          <div key={i} data-shape className={cn('absolute', s.pos)}>
            <div
              className={cn(
                '@container flex size-full items-center justify-center rounded-[22%] border-2 shadow-[0_6px_0_0]',
                t.tile,
                bob,
              )}
              style={{ animationDuration: `${s.dur}s`, animationDelay: `-${i * 2.3}s` }}
            >
              <span data-letter className="font-neo-display text-[60cqw] font-black leading-none">
                {t.letters[tileIndex++ % t.letters.length]}
              </span>
            </div>
          </div>
        ) : (
          <div key={i} data-shape className={cn('absolute', s.pos)}>
            <svg
              viewBox="0 0 24 24"
              className={cn('size-full overflow-visible', t.ink, bob)}
              style={{ animationDuration: `${s.dur}s`, animationDelay: `-${i * 1.7}s` }}
            >
              <path d={STAR} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        ),
      )}
      {hill && (
        <svg
          data-shape
          data-hill
          viewBox="0 0 400 64"
          preserveAspectRatio="none"
          className={cn('absolute inset-x-0 bottom-0 h-[max(6rem,14vh)] w-full', t.hill)}
        >
          <path d={HILL} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}
