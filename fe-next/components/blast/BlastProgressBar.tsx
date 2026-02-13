'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlastProgressBarProps {
  cleared: number;
  total: number;
  t: (key: string) => string | undefined;
}

/** Color stops for progress: white → cyan → lime → gold */
function getProgressColor(pct: number): string {
  if (pct >= 100) return '#FFD700'; // gold
  if (pct >= 75) return '#BFFF00';  // lime
  if (pct >= 50) return '#00FFFF';  // cyan
  return '#FFFFFF';                  // white
}

const MILESTONES = [25, 50, 75, 100];

/** Which milestone threshold was just crossed? */
function getMilestoneCrossed(prev: number, curr: number): number | null {
  for (const m of MILESTONES) {
    if (prev < m && curr >= m) return m;
  }
  return null;
}

/**
 * BlastProgressBar - Shows board clear progress with milestone markers.
 * Uses motion.div animate prop for reliable FM v12 spring animation.
 */
export function BlastProgressBar({ cleared, total, t }: BlastProgressBarProps) {
  const percentage = total > 0 ? Math.min(Math.round((cleared / total) * 100), 100) : 0;
  const color = getProgressColor(percentage);
  const prevPctRef = useRef(0);
  const [milestonePulse, setMilestonePulse] = useState<number | null>(null);

  // Detect milestone crossings for celebration pulse
  useEffect(() => {
    const milestone = getMilestoneCrossed(prevPctRef.current, percentage);
    prevPctRef.current = percentage;
    if (milestone) {
      setMilestonePulse(milestone);
      const timer = setTimeout(() => setMilestonePulse(null), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [percentage]);

  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
          {t('blast.progress') || 'Cleared'}
        </span>
        <span className="text-xs font-black text-white tabular-nums">
          {cleared}/{total}
        </span>
      </div>

      {/* Bar — chunky neo-brutalist */}
      <div className="relative h-4 bg-white/10 rounded-neo overflow-hidden border-2 border-white/25 shadow-hard-sm">
        {/* Milestone markers with star dots */}
        {MILESTONES.map(m => (
          <div
            key={m}
            className="absolute top-0 bottom-0 flex items-center justify-center"
            style={{
              left: `${m}%`,
              transform: 'translateX(-50%)',
              width: '8px',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: percentage >= m ? getProgressColor(m) : 'rgba(255,255,255,0.25)',
                boxShadow: percentage >= m ? `0 0 6px ${getProgressColor(m)}80` : 'none',
              }}
            />
          </div>
        ))}

        {/* Animated fill — chunky with glow trail */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-neo"
          initial={{ width: '0%' }}
          animate={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 ${milestonePulse ? '20px' : '10px'} ${color}${milestonePulse ? '90' : '50'}, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
          transition={{
            width: { type: 'spring', stiffness: 120, damping: 20, mass: 0.8 },
            backgroundColor: { duration: 0.3 },
            boxShadow: { duration: 0.3 },
          }}
        />

        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-neo pointer-events-none" />

        {/* Milestone pulse flash */}
        <AnimatePresence>
          {milestonePulse && (
            <motion.div
              key={`pulse-${milestonePulse}`}
              initial={{ opacity: 0.8, scaleX: 0 }}
              animate={{ opacity: 0, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 rounded-neo origin-left"
              style={{ backgroundColor: `${getProgressColor(milestonePulse)}40` }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Percentage badge */}
      {percentage > 0 && (
        <motion.div
          key={percentage}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mt-1"
        >
          <span
            className="text-[10px] font-black uppercase tracking-wide"
            style={{ color }}
          >
            {percentage}%
          </span>
        </motion.div>
      )}
    </div>
  );
}
