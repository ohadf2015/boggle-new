'use client';

import { THEME_ICON, getWaveTheme } from '@/components/blast/progress/waveTheme';
import { BlastObjectiveBanner } from '../BlastObjectiveBanner';
import { formatObjectiveLabel } from '../utils/blastObjectiveUtils';
import type { BlastObjectiveProgress } from '../types';
import { BlastHudClearMeter } from './BlastHudClearMeter';

interface BlastHudGoalProps {
  waveNumber: number;
  passPct: number;
  tilesCleared: number;
  totalTiles: number;
  goalMet: boolean;
  accent?: string;
  /** Solo runs show the themed wave chip; other single-player arms keep the strip's W chip. */
  showWave: boolean;
  objectives?: BlastObjectiveProgress[];
  modifierSlot?: React.ReactNode;
  t: (key: string, fallback?: string) => string | undefined;
}

function WaveChip({ wave, accent, label }: { wave: number; accent?: string; label: string | undefined }) {
  const Icon = THEME_ICON[getWaveTheme(wave).id];
  return (
    <span
      data-testid="blast-hud-wave"
      aria-label={`${label ?? 'Wave'} ${wave}`}
      className="flex h-6 shrink-0 items-center gap-0.5 rounded-md border-2 border-neo-black px-1.5 font-neo-display text-[11px] font-black tabular-nums text-neo-black shadow-hard-sm tv:h-9 tv:text-base"
      style={{ backgroundColor: accent ?? 'var(--neo-cyan)' }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 tv:h-5 tv:w-5" strokeWidth={3} aria-hidden="true" />
      {wave}
    </span>
  );
}

/** One goal element: the wave, its clear goal + bar, and any side objectives. */
export function BlastHudGoal({
  waveNumber, passPct, tilesCleared, totalTiles, goalMet, accent, showWave, objectives, modifierSlot, t,
}: BlastHudGoalProps) {
  const label = formatObjectiveLabel({ type: 'clear_percent', target: passPct }, t);
  return (
    <section
      data-testid="blast-hud-goal"
      data-goal-met={goalMet ? 'true' : 'false'}
      className="mx-2 mb-1.5 rounded-neo border-2 border-neo-black bg-neo-navy-light px-2.5 pb-1.5 pt-1 shadow-hard-sm tv:mx-4 tv:px-4 tv:py-2"
      aria-label={t('blast.objective.bannerTitle', 'Goals')}
    >
      <div className="lg:flex lg:items-center lg:gap-3">
        <div data-testid="blast-hud-progress" className="flex min-h-6 min-w-0 items-center gap-2 lg:max-w-[55%] lg:shrink-0">
          {showWave && <WaveChip wave={waveNumber} accent={accent} label={t('blast.wave')} />}
          <span dir="auto" className="min-w-0 flex-1 truncate font-neo-display text-[13px] font-black text-neo-white tv:text-lg">
            {label}
          </span>
          {modifierSlot && <span className="blast-hud-modifier shrink-0">{modifierSlot}</span>}
        </div>
        <div className="mt-1 lg:mt-0 lg:flex-1">
          <BlastHudClearMeter
            layout="card"
            tilesCleared={tilesCleared}
            totalTiles={totalTiles}
            passPct={passPct}
            goalMet={goalMet}
            accent={accent}
            clearedLabel={t('blast.cleared')}
          />
        </div>
      </div>
      {objectives && objectives.length > 0 && (
        <BlastObjectiveBanner objectives={objectives} t={t} variant="inline" />
      )}
    </section>
  );
}
