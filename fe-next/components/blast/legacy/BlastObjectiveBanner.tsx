'use client';

import { memo } from 'react';
import { Check, Target, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatObjectiveLabel } from './utils/blastObjectiveUtils';
import { TILE_VISUALS } from './blastTileVisuals';
import type { BlastObjectiveProgress, BlastTileType } from './types';

interface BlastObjectiveBannerProps {
  objectives: BlastObjectiveProgress[];
  t: (key: string) => string | undefined;
}

/**
 * Tiny inline tile preview that mirrors TILE_VISUALS — players see the
 * literal sprite the goal asks for, not just a translated noun. ~18px so
 * it sits next to the row text without a layout reflow.
 */
function ObjectiveTilePreview({ tileType }: { tileType: BlastTileType }) {
  const visual = TILE_VISUALS[tileType];
  if (!visual) return null;
  const Icon = visual.indicator;
  return (
    <span
      data-testid={`blast-objective-tile-preview-${tileType}`}
      aria-hidden="true"
      className={cn(
        'shrink-0 inline-flex items-center justify-center w-[18px] h-[18px] rounded',
        visual.text,
      )}
      style={visual.style}
    >
      {Icon ? <Icon className="w-3 h-3" strokeWidth={3} /> : null}
    </span>
  );
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
      {visible.map((p, i) => {
        const isTargetWord = p.objective.type === 'target_word';
        const isColorPower = p.objective.type === 'color_power';
        const colorTag = p.objective.colorTag;

        // Determine color CSS class for color_power objectives
        let colorClass = '';
        if (isColorPower && colorTag) {
          if (colorTag === 'pink') colorClass = 'text-neo-pink';
          else if (colorTag === 'cyan') colorClass = 'text-neo-cyan';
          else if (colorTag === 'lime') colorClass = 'text-neo-lime';
        }

        return (
          <div
            key={`${p.objective.type}-${p.objective.tileType ?? p.objective.targetWord ?? p.objective.colorTag ?? ''}-${i}`}
            data-testid={`blast-objective-row-${i}`}
            data-complete={p.isComplete ? 'true' : 'false'}
            className={cn(
              'flex items-center gap-2 text-xs font-bold tabular-nums transition-opacity',
              p.isComplete ? 'text-neo-lime opacity-80' : 'text-neo-cream',
            )}
          >
            {isTargetWord && <Target className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
            {isColorPower && <Heart className={cn('h-3.5 w-3.5 shrink-0', colorClass)} fill={colorClass.replace('text-', '')} strokeWidth={2} />}
            {p.isComplete && !isTargetWord && !isColorPower && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
            {(p.objective.type === 'collect_type' || p.objective.type === 'clear_all_type') && p.objective.tileType && (
              <ObjectiveTilePreview tileType={p.objective.tileType} />
            )}
            <span dir="auto" className="flex-1 truncate">{formatObjectiveLabel(p.objective, t)}</span>
            {!isTargetWord && !isColorPower && (
              <span dir="ltr" className="shrink-0 text-white/70">
                {Math.min(p.current, p.objective.target)} / {p.objective.target}
              </span>
            )}
            {isTargetWord && (
              <span className="shrink-0 text-white/70">
                {p.isComplete ? '✓' : '○'}
              </span>
            )}
            {isColorPower && (
              <span dir="ltr" className="shrink-0 text-white/70">
                {p.current} / {p.objective.minColorCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default BlastObjectiveBanner;
