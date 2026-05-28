'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChapterQuest, ChapterQuestProgress } from '@/types/adventure';
import { QuestCard } from './QuestCard';

interface ChapterQuestPanelProps {
  quests: ChapterQuest[];
  progress: ChapterQuestProgress[];
  className?: string;
}

export const ChapterQuestPanel = memo(function ChapterQuestPanel({
  quests,
  progress,
  className,
}: ChapterQuestPanelProps) {
  const { t } = useLanguage();

  if (quests.length === 0) return null;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-neo border-3 border-neo-yellow/40 bg-neo-black/40',
        'p-3 shadow-hard',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-neo bg-neo-yellow/20 border-2 border-neo-yellow/40 flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-neo-yellow" />
        </div>
        <h3 className="text-xs font-black text-neo-white uppercase tracking-wide">
          {t('adventure.quests.chapter.panelTitle')}
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        {quests.map(quest => {
          const prog = progress.find(p => p.questId === quest.id) ?? {
            questId: quest.id, current: 0, isComplete: false, rewardClaimed: false,
          };
          return <QuestCard key={quest.id} quest={quest} progress={prog} />;
        })}
      </div>
    </AdaptiveMotion.div>
  );
});

ChapterQuestPanel.displayName = 'ChapterQuestPanel';
export default ChapterQuestPanel;
