'use client';

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

const MILESTONE_KEYS: Record<number, string> = {
  3: 'combo.milestones.nice',
  5: 'combo.milestones.fire',
  7: 'combo.milestones.mythic',
  10: 'combo.milestones.godlike',
  15: 'combo.milestones.legendary',
  20: 'combo.milestones.mythicStreak',
  25: 'combo.milestones.transcendent',
};

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

  useEffect(() => {
    const key = MILESTONE_KEYS[comboLevel];
    if (comboLevel > prevComboRef.current && key) {
      setMilestone(t(key));
      const timer = setTimeout(() => setMilestone(null), 1200);
      prevComboRef.current = comboLevel;
      return () => clearTimeout(timer);
    }
    prevComboRef.current = comboLevel;
    return undefined;
  }, [comboLevel, t]);

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
          aria-live="assertive"
          aria-label={`Combo ${comboLevel}x - ${milestone}`}
        >
          <div className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-black text-lg uppercase tracking-wider',
            comboLevel >= 25 ? 'bg-linear-to-r from-neo-lime-light via-neo-cream to-neo-lime-light text-neo-black animate-pulse' :
            comboLevel >= 20 ? 'bg-linear-to-r from-neo-purple via-neo-pink to-neo-purple text-neo-white' :
            comboLevel >= 15 ? 'bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' :
            comboLevel >= 10 ? 'bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' :
            comboLevel >= 7 ? 'bg-linear-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' :
            comboLevel >= 5 ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black' :
            'bg-neo-cyan text-neo-black'
          )}>
            {milestone}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
