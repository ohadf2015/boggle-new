'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { jitter, pickOther, sign } from '@/lib/animation/variety';

interface BridgeCelebrationProps {
  /** Solves in a row including this one; picks the praise word. */
  streak: number;
  /** Points this solve added (0 hides the chip). */
  points: number;
}

const ENTRANCES = {
  slam: (t: number) => ({ scale: [2.4, 0.92, 1, 1, 0.6], rotate: [t * 3, t, t, t, t], y: [0, 0, 0, 0, -24] }),
  drop: (t: number) => ({ scale: [1.3, 0.95, 1, 1, 0.6], rotate: [-t, t, t, t, t], y: [-60, 6, 0, 0, -24] }),
  spin: (t: number) => ({ scale: [0.4, 1.12, 1, 1, 0.6], rotate: [-t * 6, t, t, t, t], y: [0, 0, 0, 0, -24] }),
};
type Entrance = keyof typeof ENTRANCES;
const NAMES = Object.keys(ENTRANCES) as Entrance[];
let lastEntrance: Entrance | undefined;

function rollStamp() {
  lastEntrance = pickOther(NAMES, lastEntrance);
  return { entrance: lastEntrance, tilt: sign() * jitter(4.5, 1.5) };
}

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
  const [{ entrance, tilt }] = useState(rollStamp);
  // The feedback line already says "correct"; the stamp is pure motion.
  if (reducedMotion) return null;
  const frames = ENTRANCES[entrance](tilt);
  return (
    <div
      aria-hidden="true"
      data-testid="bridge-celebration"
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1"
    >
      <m.span
        data-entrance={entrance}
        initial={{ scale: frames.scale[0], rotate: frames.rotate[0], y: frames.y[0] }}
        animate={{ ...frames, opacity: [1, 1, 1, 1, 0] }}
        transition={{ duration: 1.5, times: [0, 0.22, 0.32, 0.8, 1], ease: [0.22, 1, 0.36, 1] }}
        className="rounded-neo border-neo-thick border-neo-black bg-neo-lime px-4 py-1 font-neo-display text-[clamp(1.5rem,8cqi,2.75rem)] font-black uppercase leading-tight text-neo-navy shadow-hard-lg"
      >
        {t(praiseKey(streak))}
      </m.span>
      {points > 0 && (
        <m.span
          initial={{ y: 8, scale: 0.6 }}
          animate={{ y: [8, 0, -46], scale: [0.6, 1.15, 1], opacity: [1, 1, 0] }}
          transition={{ duration: 1.3, times: [0, 0.3, 1], delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="font-neo-display text-2xl font-black text-neo-yellow tabular-nums [text-shadow:2px_2px_0_#000]"
          dir="ltr"
        >
          +{points}
        </m.span>
      )}
    </div>
  );
}
