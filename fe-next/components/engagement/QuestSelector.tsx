'use client';

/**
 * QuestSelector - Shows 3 quest cards for weekly quest selection.
 *
 * Each card: difficulty color (green/yellow/red), description, XP, "Select" button.
 * One-tap selection (no confirmation needed).
 * Neo-brutalist: border-neo, shadow-hard, difficulty badges.
 */

import React, { memo } from 'react';
import { Target, Medal, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { QuestTemplate, QuestDifficulty } from '@/shared/weeklyQuestTemplates';
import PartPreview from '@/components/avatar/PartPreview';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

interface QuestSelectorProps {
  quests: QuestTemplate[];
  onSelect: (questId: string) => void;
}

const DIFFICULTY_CONFIG: Record<QuestDifficulty, {
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  easy: {
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/50',
    icon: Target,
  },
  medium: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/50',
    icon: Medal,
  },
  hard: {
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/50',
    icon: Trophy,
  },
};

function QuestOption({
  quest,
  onSelect,
}: {
  quest: QuestTemplate;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();
  const config = DIFFICULTY_CONFIG[quest.difficulty];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-3 rounded-neo',
        'border-neo border-black',
        'shadow-hard-sm',
        config.bg,
      )}
    >
      {/* Difficulty badge */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black uppercase',
            config.color, config.border, 'border',
          )}
        >
          <Icon className="w-3 h-3" />
          {t(`weeklyQuest.${quest.difficulty}`)}
        </span>
        <div className="flex flex-col items-end gap-0.5">
          <span className={cn('text-xs font-black', config.color)}>
            {t('weeklyQuest.xpReward', { xp: quest.xpReward })}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neo-pink">
            <PartPreview
              partType={quest.avatarPartReward.category as 'eyes' | 'mouth' | 'hair' | 'accessory' | 'eyebrows' | 'facialHair'}
              partName={quest.avatarPartReward.partId}
              config={DEFAULT_AVATAR_CONFIG}
              size={18}
            />
            {t(`quests.avatarPartCategory.${quest.avatarPartReward.category}`)}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neo-white font-medium">
        {t(quest.description, { target: quest.displayTarget ?? quest.target })}
      </p>

      {/* Select button */}
      <button
        type="button"
        onClick={() => onSelect(quest.id)}
        aria-label={`${t('weeklyQuest.selectQuest')} - ${t(quest.description, { target: quest.displayTarget ?? quest.target })}`}
        className={cn(
          'w-full py-1.5 rounded-neo text-sm font-black',
          'border-neo border-black shadow-hard-sm',
          'active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
          'transition-all duration-100',
          config.bg, config.color,
          'hover:brightness-110',
        )}
      >
        {t('weeklyQuest.selectQuest')}
      </button>
    </div>
  );
}

export const QuestSelector: React.FC<QuestSelectorProps> = memo(({ quests, onSelect }) => {
  const { t } = useLanguage();
  if (!quests.length) return null;

  return (
    <div className="flex flex-col gap-2" role="list" aria-label={t('quests.questOptions')}>
      {quests.map((quest) => (
        <QuestOption key={quest.id} quest={quest} onSelect={onSelect} />
      ))}
    </div>
  );
});

QuestSelector.displayName = 'QuestSelector';
export default QuestSelector;
