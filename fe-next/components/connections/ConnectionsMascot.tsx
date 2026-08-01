'use client';

import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type MascotMood = 'idle' | 'wrong' | 'happy' | 'encourage' | 'panic' | 'won' | 'lost';

/** Mood → transparent mascot art (same pool the rest of the app uses). */
export const MOOD_SRC: Record<MascotMood, string> = {
  idle: '/mascot/question.webp',
  wrong: '/mascot/oops.webp',
  happy: '/mascot/celebration.webp',
  encourage: '/mascot/encouraging.webp',
  panic: '/mascot/panic.webp',
  won: '/mascot/trophy.webp',
  lost: '/mascot/crying.webp',
};

/** Pure status → mood mapping so game views stay dumb about assets. */
export function moodForStatus(status: string): MascotMood {
  switch (status) {
    case 'wrong':
      return 'wrong';
    case 'correct':
      return 'happy';
    case 'gaveUp':
      return 'encourage';
    case 'outOfLives':
      return 'panic';
    case 'won':
      return 'won';
    case 'lost':
      return 'lost';
    default:
      return 'idle';
  }
}

interface ConnectionsMascotProps {
  /** Game status (pyramid/bridge status strings) — mapped via moodForStatus. */
  status: string;
  /** Sizing classes for the image box (default: compact header size). */
  className?: string;
}

/**
 * Mood-reactive Lexi mascot for Connections. Pops on every mood change and
 * wobbles when the player gets it wrong. Decorative — hidden from the a11y
 * tree (status is already announced by the game copy itself).
 *
 * Plain `<img>` on purpose (same rationale as DancingMascot): assets are
 * already-optimised WebPs and next/image adds nothing for tiny local files.
 */
export default function ConnectionsMascot({ status, className }: ConnectionsMascotProps) {
  const mood = moodForStatus(status);
  return (
    <span aria-hidden="true" className={cn('relative inline-block h-14 w-14 shrink-0', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={mood}
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={
            mood === 'wrong'
              ? { scale: 1, opacity: 1, rotate: [0, -10, 10, -6, 6, 0] }
              : { scale: [0.4, 1.12, 1], opacity: 1, rotate: 0 }
          }
          exit={{ scale: 0.5, opacity: 0 }}
          transition={
            mood === 'wrong'
              ? { duration: 0.45, ease: 'easeOut' }
              : { type: 'spring', stiffness: 380, damping: 20 }
          }
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MOOD_SRC[mood]}
            alt=""
            draggable={false}
            className="h-full w-full object-contain select-none pointer-events-none drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
          />
        </m.span>
      </AnimatePresence>
    </span>
  );
}
