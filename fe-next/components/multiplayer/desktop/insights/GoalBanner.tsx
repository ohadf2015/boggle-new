import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedPanel } from '../ThemedPanel';
import type { MpDesktopMode } from '../types';

export type BlastGoalType = 'target_word' | 'color_power' | 'classic';

export interface BlastGoal {
  type: BlastGoalType;
  payload?: string;
  progress?: number;
  target?: number;
}

interface GoalBannerProps {
  mode: MpDesktopMode;
  goal: BlastGoal;
}

export function GoalBanner({ mode, goal }: GoalBannerProps) {
  const { t } = useLanguage();
  const headerKey =
    goal.type === 'target_word'
      ? 'mp.insights.goalTypeTargetWord'
      : goal.type === 'color_power'
      ? 'mp.insights.goalTypeColorPower'
      : 'mp.insights.goalTypeClassic';
  return (
    <ThemedPanel mode={mode} variant="rail" header={t(headerKey)} testId="goal-banner">
      <div className="flex items-center justify-between gap-2">
        <span
          data-testid="goal-banner-payload"
          className="font-neo-display font-black uppercase text-base tracking-wide truncate"
        >
          {goal.payload ?? '—'}
        </span>
        {goal.progress != null && goal.target != null && (
          <span
            data-testid="goal-banner-progress"
            className="text-xs font-bold tabular-nums opacity-80"
          >
            {goal.progress}/{goal.target}
          </span>
        )}
      </div>
    </ThemedPanel>
  );
}
