'use client';

import { memo } from 'react';
import { Check, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChapterQuest, ChapterQuestProgress } from '@/types/adventure';

interface QuestCardProps {
  quest: ChapterQuest;
  progress: ChapterQuestProgress;
}

export const QuestCard = memo(function QuestCard({ quest, progress }: QuestCardProps) {
  const { t } = useLanguage();
  const pct = Math.min((progress.current / quest.target) * 100, 100);

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-neo border-2',
        'transition-all duration-300',
        progress.isComplete
          ? 'bg-neo-lime/10 border-neo-lime/60'
          : 'bg-neo-black/20 border-neo-white/10'
      )}
    >
      {/* Completion dot */}
      <div className={cn(
        'shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center',
        progress.isComplete ? 'bg-neo-lime border-neo-black' : 'border-neo-white/20'
      )}>
        {progress.isComplete && <Check className="w-2.5 h-2.5 text-neo-black" strokeWidth={3} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={cn('text-xs font-bold truncate', progress.isComplete ? 'text-neo-lime' : 'text-neo-white')}>
            {t(quest.titleKey)}
          </span>
          <span className="text-[10px] font-mono font-black text-neo-white tabular-nums shrink-0">
            {progress.current}/{quest.target}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1 h-1 bg-neo-black/50 rounded-full overflow-hidden border border-neo-white/10">
          <div
            className={cn('h-full rounded-full transition-all duration-500', progress.isComplete ? 'bg-neo-lime' : 'bg-neo-yellow/60')}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Reward */}
        <div className="flex items-center gap-1 mt-1">
          <Coins className="w-3 h-3 text-neo-yellow/60" />
          <span className="text-[10px] text-neo-yellow/60">{quest.reward.coins}</span>
        </div>
      </div>
    </div>
  );
});

QuestCard.displayName = 'QuestCard';
export default QuestCard;
