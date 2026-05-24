'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProgressPercent, meterZone } from '@/lib/word-craft/run/feedbackTiers';

interface RunProgressMeterProps {
  score: number;
  target: number;
  t: (key: string) => string;
}

// Encouraging, not alarming: builds in the brand purple, brightens to cyan with
// anticipation near the target, then celebrates lime once reached. No red.
const ZONE_FILL: Record<string, string> = {
  building: 'bg-neo-purple',
  close: 'bg-neo-cyan',
  reached: 'bg-neo-lime motion-safe:animate-pulse',
};

/**
 * RunProgressMeter — the felt-progress surface for WordCraft run rounds.
 *
 * Replaces the bare "score / target" number with a chunky neo-brutalist fill
 * bar so the player *sees* the round filling. Progress math is pure
 * (lib/word-craft/run/feedbackTiers).
 */
export default function RunProgressMeter({ score, target, t }: RunProgressMeterProps) {
  const zone = meterZone(score, target);
  const pct = `${Math.round(getProgressPercent(score, target) * 100)}%`;
  const reached = zone === 'reached';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-wide text-neo-white/80">
          {t('wordcraft.run.target')}
        </span>
        <span className="text-xs font-black tabular-nums text-neo-white">
          {score}/{target}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t('wordcraft.run.target')}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={target}
        data-zone={zone}
        className="relative h-4 w-full rounded-neo border-2 border-neo-black overflow-hidden bg-slate-900"
      >
        <div
          data-testid="run-meter-fill"
          style={{ width: pct }}
          className={cn('h-full transition-[width] duration-300 ease-out', ZONE_FILL[zone])}
        />
        {reached && (
          <Sparkles className="absolute inset-y-0 right-1 my-auto w-3.5 h-3.5 text-neo-black" />
        )}
      </div>
    </div>
  );
}
