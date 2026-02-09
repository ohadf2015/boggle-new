'use client';

import React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

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

/**
 * BlastProgressBar - Shows board clear progress with milestone markers.
 * Uses spring physics for satisfying bounce when progress increases.
 */
export function BlastProgressBar({ cleared, total, t }: BlastProgressBarProps) {
  const percentage = total > 0 ? Math.round((cleared / total) * 100) : 0;
  const color = getProgressColor(percentage);

  // Spring-animated width for satisfying overshoot
  const springValue = useSpring(percentage, {
    stiffness: 120,
    damping: 20,
    mass: 0.8,
  });
  const width = useTransform(springValue, (v: number) => `${Math.min(v, 100)}%`);

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

      {/* Bar */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
        {/* Milestone markers */}
        {MILESTONES.map(m => (
          <div
            key={m}
            className="absolute top-0 bottom-0 w-px bg-white/20"
            style={{ left: `${m}%` }}
          />
        ))}

        {/* Animated fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />

        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
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
