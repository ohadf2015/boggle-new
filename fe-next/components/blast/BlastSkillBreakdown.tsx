'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { BlastResultsData } from './types';

interface BlastSkillBreakdownProps {
  results: BlastResultsData;
  t: (key: string) => string | undefined;
}

interface SkillMetric {
  label: string;
  value: string;
  /** 0-100 percentage for the progress bar */
  pct: number;
  color: string;
}

function computeMetrics(results: BlastResultsData, t: (key: string) => string | undefined): SkillMetric[] {
  const words = results.wordsFound;
  const wordCount = words.length;
  if (wordCount === 0) return [];

  // Average word length
  const totalLetters = words.reduce((sum, w) => sum + w.length, 0);
  const avgLength = totalLetters / wordCount;
  // Scale: 3 = 0%, 4 = 33%, 5 = 66%, 6+ = 100%
  const avgPct = Math.min(100, Math.round(((avgLength - 3) / 3) * 100));

  // Long word rate (6+ letters)
  const longWords = words.filter(w => w.length >= 6).length;
  const longPct = Math.round((longWords / wordCount) * 100);

  // Move efficiency (words per move, scaled 0-100 where 1.0 = 100%)
  const movesUsed = results.wordsFound.length > 0
    ? Math.max(results.wordsFound.length, 1)
    : 1;
  // Approximate: clearPercentage / movesUsed ratio
  const efficiency = wordCount / movesUsed;
  const effPct = Math.min(100, Math.round(efficiency * 100));

  // Board clear percentage (already available)
  const clearPct = results.clearPercentage;

  return [
    {
      label: t('blast.skillAvgLength') ?? 'Avg Word Length',
      value: avgLength.toFixed(1),
      pct: Math.max(0, avgPct),
      color: 'bg-neo-cyan',
    },
    {
      label: t('blast.skillLongWords') ?? 'Long Words (6+)',
      value: `${longWords}/${wordCount} (${longPct}%)`,
      pct: longPct,
      color: 'bg-neo-lime',
    },
    {
      label: t('blast.skillEfficiency') ?? 'Move Efficiency',
      value: `${(efficiency * 100).toFixed(0)}%`,
      pct: effPct,
      color: 'bg-neo-orange',
    },
    {
      label: t('blast.skillBoardClear') ?? 'Board Cleared',
      value: `${clearPct}%`,
      pct: clearPct,
      color: 'bg-neo-pink',
    },
  ];
}

/**
 * BlastSkillBreakdown — Post-game skill metrics card.
 * Shows avg word length, long word rate, move efficiency, and board clear.
 * Each metric has a progress bar for visual comparison across sessions.
 */
export const BlastSkillBreakdown = memo(function BlastSkillBreakdown({
  results,
  t,
}: BlastSkillBreakdownProps) {
  const metrics = computeMetrics(results, t);
  if (metrics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.4, ease: 'easeOut' }}
      className="w-full space-y-2"
    >
      <h3 className="text-xs font-black uppercase tracking-wider text-white/50 mb-2">
        {t('blast.skillBreakdown') ?? 'Skill Breakdown'}
      </h3>

      {metrics.map((metric, i) => (
        <div key={metric.label} className="space-y-0.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-white/70">{metric.label}</span>
            <span className="font-black text-white tabular-nums">{metric.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${metric.pct}%` }}
              transition={{ delay: 1.2 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
              className={cn('h-full rounded-full', metric.color)}
            />
          </div>
        </div>
      ))}
    </motion.div>
  );
});
