/**
 * ChapterQuestProgress — Minimal quest progress display for the game sidebar.
 * Shows each quest with a name, progress bar, and completion state.
 */

'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChapterQuest, ChapterQuestProgress as QuestProgress } from '@/types/adventure';

interface ChapterQuestProgressProps {
  quests: ChapterQuest[];
  progress: QuestProgress[];
}

export const ChapterQuestProgress = memo(function ChapterQuestProgress({
  quests,
  progress,
}: ChapterQuestProgressProps) {
  const { t } = useLanguage();

  if (quests.length === 0) return null;

  return (
    <div data-testid="chapter-quest-progress" className="space-y-2">
      <h3 className="text-xs font-black text-neo-white uppercase tracking-wide">
        {t('adventure.quest.title')}
      </h3>
      {quests.map((quest) => {
        const p = progress.find((pr) => pr.questId === quest.id);
        const current = p?.current ?? 0;
        const pct = Math.min((current / quest.target) * 100, 100);
        const isComplete = p?.isComplete ?? false;

        return (
          <div
            key={quest.id}
            className={cn(
              'p-2 rounded-neo border-2',
              'bg-neo-black/30',
              isComplete ? 'border-neo-lime/50' : 'border-neo-white/10'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-[10px] font-bold', isComplete ? 'text-neo-lime' : 'text-neo-white')}>
                {t(quest.titleKey)}
              </span>
              {isComplete && (
                <span data-testid={`quest-complete-${quest.id}`}>
                  <Check className="w-3 h-3 text-neo-lime" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={quest.target}
                className="flex-1 h-1.5 bg-neo-black/50 rounded-full overflow-hidden"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isComplete ? 'bg-neo-lime' : 'bg-neo-yellow'
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-neo-white">
                {current}/{quest.target}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default ChapterQuestProgress;
