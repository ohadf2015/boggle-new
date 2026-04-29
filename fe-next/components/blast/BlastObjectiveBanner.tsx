'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatObjectiveLabel } from './utils/blastObjectiveUtils';
import type { BlastObjectiveProgress } from './types';

interface BlastObjectiveBannerProps {
  objectives: BlastObjectiveProgress[];
  t: (key: string) => string | undefined;
}

/**
 * BlastObjectiveBanner — persistent goal surface, never dismissable.
 *
 * Sits inline below the HUD. Filters out `clear_percent` because the HUD
 * already renders that as the main 90% progress bar. If the wave only has a
 * clear_percent objective the banner returns null.
 *
 * Sprint 1 clarity guard: replaces the dismissable banner that players
 * complained about losing track of mid-wave.
 */
export const BlastObjectiveBanner = memo(function BlastObjectiveBanner({
  objectives,
  t,
}: BlastObjectiveBannerProps) {
  const visible = objectives.filter(p => p.objective.type !== 'clear_percent');
  if (visible.length === 0) return null;

  return (
    <div
      data-testid="blast-objective-banner"
      className="flex flex-col gap-1 px-3 py-1.5 bg-neo-navy-light/80 border-b-2 border-neo-black"
      role="region"
      aria-label={t('blast.objective.bannerTitle') || 'Goals'}
    >
      {visible.map((p, i) => (
        <div
          key={`${p.objective.type}-${p.objective.tileType ?? ''}-${i}`}
          data-testid={`blast-objective-row-${i}`}
          data-complete={p.isComplete ? 'true' : 'false'}
          className={cn(
            'flex items-center gap-2 text-xs font-bold tabular-nums transition-opacity',
            p.isComplete ? 'text-neo-lime opacity-80' : 'text-neo-cream',
          )}
        >
          {p.isComplete && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
          <span className="flex-1 truncate">{formatObjectiveLabel(p.objective, t)}</span>
          <span className="shrink-0 text-white/70">
            {Math.min(p.current, p.objective.target)} / {p.objective.target}
          </span>
        </div>
      ))}
    </div>
  );
});

export default BlastObjectiveBanner;
