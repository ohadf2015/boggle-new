'use client';

import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface BridgeCelebrationProps {
  /** Solves in a row including this one; picks the praise word. */
  streak: number;
  /** Points this solve added (0 hides the chip). */
  points: number;
}

const PRAISE_TILT = [-6, 4, -3, 5] as const;

export function praiseKey(streak: number): string {
  return `connections.praise${Math.min(Math.max(streak, 1), 4)}`;
}

/**
 * The solve stamp: a praise word slams onto the bridge and the points float up
 * out of it. Sits over the stage (parent is `relative`), never captures taps,
 * and starts visible so a stalled motion bundle still shows the praise.
 */
export default function BridgeCelebration({ streak, points }: BridgeCelebrationProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  // The feedback line already says "correct"; the stamp is pure motion.
  if (reducedMotion) return null;
  const tilt = PRAISE_TILT[(Math.max(streak, 1) - 1) % PRAISE_TILT.length];
  return (
    <div
      aria-hidden="true"
      data-testid="bridge-celebration"
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1"
    >
      <m.span
        initial={{ scale: 2.4, rotate: tilt * 3 }}
        animate={{
          scale: [2.4, 0.92, 1, 1, 0.6],
          rotate: [tilt * 3, tilt, tilt, tilt, tilt],
          y: [0, 0, 0, 0, -24],
          opacity: [1, 1, 1, 1, 0],
        }}
        transition={{ duration: 1.5, times: [0, 0.22, 0.32, 0.8, 1], ease: 'easeOut' }}
        className="rounded-neo border-neo-thick border-neo-black bg-neo-lime px-4 py-1 font-neo-display text-[clamp(1.5rem,8cqi,2.75rem)] font-black uppercase leading-tight text-neo-navy shadow-hard-lg"
      >
        {t(praiseKey(streak))}
      </m.span>
      {points > 0 && (
        <m.span
          initial={{ y: 8, scale: 0.6 }}
          animate={{ y: [8, 0, -46], scale: [0.6, 1.15, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, times: [0, 0.3, 1], delay: 0.18, ease: 'easeOut' }}
          className="font-neo-display text-2xl font-black text-neo-yellow tabular-nums [text-shadow:2px_2px_0_#000]"
          dir="ltr"
        >
          +{points}
        </m.span>
      )}
    </div>
  );
}
