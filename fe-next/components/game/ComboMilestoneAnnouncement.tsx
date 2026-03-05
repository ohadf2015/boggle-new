'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const MILESTONES: Record<number, string> = {
  3: 'NICE!',
  5: 'FIRE!',
  7: 'MYTHIC!',
  10: 'GODLIKE!',
};

interface ComboMilestoneAnnouncementProps {
  comboLevel: number;
}

/**
 * Shows a pop-in announcement when combo reaches milestone levels.
 * Self-managing: tracks previous combo level internally.
 */
export function ComboMilestoneAnnouncement({ comboLevel }: ComboMilestoneAnnouncementProps) {
  const [milestone, setMilestone] = useState<string | null>(null);
  const prevComboRef = useRef(comboLevel);

  useEffect(() => {
    if (comboLevel > prevComboRef.current && MILESTONES[comboLevel]) {
      setMilestone(MILESTONES[comboLevel]);
      const timer = setTimeout(() => setMilestone(null), 1200);
      prevComboRef.current = comboLevel;
      return () => clearTimeout(timer);
    }
    prevComboRef.current = comboLevel;
    return undefined;
  }, [comboLevel]);

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-black text-lg uppercase tracking-wider',
            comboLevel >= 10 ? 'bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' :
            comboLevel >= 7 ? 'bg-gradient-to-r from-pink-500 via-cyan-500 to-yellow-500 text-white' :
            comboLevel >= 5 ? 'bg-gradient-to-r from-neo-yellow to-neo-orange text-neo-black' :
            'bg-neo-cyan text-neo-black'
          )}>
            {milestone}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
