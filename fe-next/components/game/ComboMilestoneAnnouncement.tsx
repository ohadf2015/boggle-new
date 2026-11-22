'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MILESTONE_KEYS } from './comboMilestones';
import { useLanguage } from '@/contexts/LanguageContext';

interface ComboMilestoneAnnouncementProps {
  comboLevel: number;
}

/**
 * Shows a pop-in announcement when combo reaches milestone levels.
 * Self-managing: tracks previous combo level internally.
 */
export function ComboMilestoneAnnouncement({ comboLevel }: ComboMilestoneAnnouncementProps) {
  const { t } = useLanguage();
  const [milestone, setMilestone] = useState<string | null>(null);
  const prevComboRef = useRef(comboLevel);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const key = MILESTONE_KEYS[comboLevel];
    if (comboLevel > prevComboRef.current && key) {
      setMilestone(t(key));
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
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
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
            {milestone}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
