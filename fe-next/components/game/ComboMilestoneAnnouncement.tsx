'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MILESTONE_KEYS } from './comboMilestones';
import { useLanguage } from '@/contexts/LanguageContext';
import { jitter, pickOther, sign } from '@/lib/animation/variety';

const ENTRANCES = {
  drop: (t: number) => ({ opacity: 0, y: -28, scale: 0.9, rotate: -t }),
  slam: (t: number) => ({ opacity: 0, scale: 1.8, rotate: t * 2 }),
  tilt: (t: number) => ({ opacity: 0, scale: 0.5, rotate: -t * 4 }),
};
type Entrance = keyof typeof ENTRANCES;
const ENTRANCE_NAMES = Object.keys(ENTRANCES) as Entrance[];

interface Shown {
  text: string;
  entrance: Entrance;
  tilt: number;
  stiffness: number;
}

interface ComboMilestoneAnnouncementProps {
  comboLevel: number;
}

/**
 * Shows a pop-in announcement when combo reaches milestone levels.
 * Self-managing: tracks previous combo level internally.
 */
export function ComboMilestoneAnnouncement({ comboLevel }: ComboMilestoneAnnouncementProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [milestone, setMilestone] = useState<Shown | null>(null);
  const lastEntranceRef = useRef<Entrance | undefined>(undefined);
  const prevComboRef = useRef(comboLevel);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const key = MILESTONE_KEYS[comboLevel];
    if (comboLevel > prevComboRef.current && key) {
      const entrance = pickOther(ENTRANCE_NAMES, lastEntranceRef.current);
      lastEntranceRef.current = entrance;
      setMilestone({ text: t(key), entrance, tilt: sign() * jitter(3.5, 1.5), stiffness: jitter(420, 60) });
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setMilestone(null), 1200);
    }
    prevComboRef.current = comboLevel;
  }, [comboLevel, t]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  return (
    <AnimatePresence>
      {milestone && (
        <m.div
          data-entrance={reducedMotion ? 'fade' : milestone.entrance}
          initial={reducedMotion ? { opacity: 0 } : ENTRANCES[milestone.entrance](milestone.tilt)}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, rotate: milestone.tilt }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.3, y: -10 }}
          transition={{ type: 'spring', stiffness: milestone.stiffness, damping: 24, mass: 0.8 }}
          className="absolute top-40 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-black text-lg uppercase tracking-wider',
            comboLevel >= 25 ? 'bg-neo-lime text-neo-black animate-pulse' :
            comboLevel >= 20 ? 'bg-neo-purple text-neo-white' :
            comboLevel >= 7 ? 'bg-neo-pink text-neo-black' :
            comboLevel >= 5 ? 'bg-neo-lime text-neo-black' :
            'bg-neo-cyan text-neo-black'
          )}>
            {milestone.text}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
