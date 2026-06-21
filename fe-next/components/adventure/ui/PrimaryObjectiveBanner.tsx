/**
 * PrimaryObjectiveBanner
 *
 * Prominent single-goal strip shown directly beneath the header during gameplay.
 * Answers "what's my main goal right now?" at a glance — closing the mobile
 * clarity gap where objectives were rendered as icon-only chips with no label.
 *
 * Neo-brutalist: solid border + hard shadow, electric accent, hard progress bar.
 * Desktop keeps the full objective list in the sidebar, so this is mobile-only
 * at the call site (lg:hidden); the component itself is layout-agnostic.
 */

'use client';

import React, { memo } from 'react';
import {
  FileText, Target, Star, Snowflake, Clock, Gem, Swords, Heart, Zap, Shield, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { LevelObjective, ObjectiveType } from '@/types/adventure';
import {
  getObjectiveLabel,
  getObjectiveProgress,
  selectPrimaryObjective,
} from '@/lib/adventure/objectiveProgress';

const OBJECTIVE_ICONS: Record<ObjectiveType, React.ComponentType<{ className?: string }>> = {
  wordCount: FileText,
  scoreTarget: Target,
  longWords: Star,
  clearIce: Snowflake,
  timeBonus: Clock,
  collectGems: Gem,
  defeatBoss: Swords,
  surviveBattle: Heart,
  mechanicTrigger: Zap,
  noDamage: Shield,
};

interface PrimaryObjectiveBannerProps {
  objectives: LevelObjective[];
  className?: string;
}

export const PrimaryObjectiveBanner = memo(function PrimaryObjectiveBanner({
  objectives,
  className,
}: PrimaryObjectiveBannerProps) {
  const { t } = useLanguage();
  const primary = selectPrimaryObjective(objectives);
  if (!primary) return null;

  const { current, target, pct, isComplete } = getObjectiveProgress(primary);
  const label = getObjectiveLabel(primary, t);
  const Icon = OBJECTIVE_ICONS[primary.type] ?? Target;

  return (
    <div
      data-testid="primary-objective-banner"
      role="status"
      aria-label={`${label}: ${current} / ${target}`}
      className={cn(
        'mx-3 my-1 px-3 py-2 rounded-neo border-3 border-neo-black shadow-hard',
        isComplete ? 'bg-neo-lime/20' : 'bg-neo-navy-light',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {/* Icon plate */}
        <span
          className={cn(
            'shrink-0 grid place-items-center w-7 h-7 rounded-neo border-2 border-neo-black',
            isComplete ? 'bg-neo-lime' : 'bg-neo-cyan'
          )}
        >
          {isComplete ? (
            <Check data-testid="primary-objective-complete" className="w-4 h-4 text-neo-black" />
          ) : (
            <Icon className="w-4 h-4 text-neo-black" />
          )}
        </span>

        {/* Label */}
        <span className="flex-1 min-w-0 truncate font-neo-body font-bold text-sm text-neo-cream">
          {label}
        </span>

        {/* Progress count */}
        <span
          data-testid="primary-objective-count"
          className={cn(
            'shrink-0 font-neo-display font-black tabular-nums text-base',
            isComplete ? 'text-neo-lime' : 'text-neo-cyan'
          )}
        >
          {current}/{target}
        </span>
      </div>

      {/* Hard progress bar */}
      <div className="mt-1.5 h-2 rounded-full border-2 border-neo-black bg-neo-black overflow-hidden">
        <AdaptiveMotion.div
          data-testid="primary-objective-bar"
          className={cn('h-full', isComplete ? 'bg-neo-lime' : 'bg-neo-cyan')}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

export default PrimaryObjectiveBanner;
