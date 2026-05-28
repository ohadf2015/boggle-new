'use client';

/**
 * WeeklyQuestCard - Landing page card for weekly quest commitment device.
 *
 * States:
 * - No quest selected: "Choose Your Weekly Quest" with QuestSelector
 * - Quest active: quest name + progress bar + XP reward preview
 * - Quest complete: celebration state with "Quest Complete! +500 XP"
 *
 * Neo-brutalist: border-neo-cyan, shadow-hard, target/medal icon
 */

import React, { memo, useCallback } from 'react';
import { Target, Trophy, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWeeklyQuest } from '@/hooks/useWeeklyQuest';
import { cn } from '@/lib/utils';
import { QuestSelector } from './QuestSelector';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
};

function ActiveQuestView({
  quest,
}: {
  quest: NonNullable<ReturnType<typeof useWeeklyQuest>['activeQuest']>;
}) {
  const { t } = useLanguage();
  const percent = quest.target > 0
    ? Math.round((quest.current / quest.target) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-neo-cyan" />
          <span className="text-sm font-black text-neo-cyan">
            {t('weeklyQuest.active')}
          </span>
        </div>
        <span className={cn(
          'text-xs font-black uppercase px-2 py-0.5 rounded-full border',
          DIFFICULTY_COLORS[quest.difficulty] ?? 'text-neo-white',
          quest.difficulty === 'easy' && 'border-green-400/50',
          quest.difficulty === 'medium' && 'border-yellow-400/50',
          quest.difficulty === 'hard' && 'border-red-400/50',
        )}>
          {t(`weeklyQuest.${quest.difficulty}`)}
        </span>
      </div>

      {/* Quest description */}
      <p className="text-sm text-neo-white font-medium">
        {t(quest.description, { target: quest.displayTarget ?? quest.target })}
      </p>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neo-white font-bold">
            {t('weeklyQuest.progress', { current: quest.current, target: quest.target })}
          </span>
          <span className="text-neo-cyan font-black">
            {t('weeklyQuest.xpReward', { xp: quest.xpReward })}
          </span>
        </div>
        <div
          className="h-2 bg-neo-white/10 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-neo-cyan rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CompletedQuestView({
  xpReward,
}: {
  xpReward: number;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-neo-yellow" />
        <Sparkles className="w-5 h-5 text-neo-yellow" />
      </div>
      <span className="text-lg font-black text-neo-yellow">
        {t('weeklyQuest.complete')}
      </span>
      <span className="text-sm font-black text-neo-cyan">
        {t('weeklyQuest.xpReward', { xp: xpReward })}
      </span>
      <p className="text-xs text-neo-white font-medium">
        {t('weeklyQuest.newQuestMonday')}
      </p>
    </div>
  );
}

export const WeeklyQuestCard: React.FC = memo(() => {
  const { t } = useLanguage();
  const { activeQuest, availableQuests, isComplete, loading, selectQuest } = useWeeklyQuest();

  const handleSelect = useCallback((questId: string) => {
    selectQuest(questId);
  }, [selectQuest]);

  if (loading) return null;

  return (
    <div
      role="region"
      aria-label={t('weeklyQuest.title')}
      className={cn(
        'rounded-neo p-4',
        'border-neo border-neo-cyan/30',
        'shadow-hard',
        'bg-neo-navy-dark/60',
      )}
    >
      {/* Title */}
      <h3 className="text-base font-black text-neo-white mb-3 flex items-center gap-2">
        <Target className="w-5 h-5 text-neo-cyan" />
        {t('weeklyQuest.title')}
      </h3>

      {isComplete && activeQuest ? (
        <CompletedQuestView xpReward={activeQuest.xpReward} />
      ) : activeQuest ? (
        <ActiveQuestView quest={activeQuest} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neo-white font-medium">
            {t('weeklyQuest.choose')}
          </p>
          <QuestSelector quests={availableQuests} onSelect={handleSelect} />
        </div>
      )}
    </div>
  );
});

WeeklyQuestCard.displayName = 'WeeklyQuestCard';
export default WeeklyQuestCard;
