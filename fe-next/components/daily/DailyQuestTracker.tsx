'use client';

import { Check, Star, Coins, Zap, Target, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailySideQuests, QuestProgress } from '@/hooks/useDailySideQuests';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

const QUEST_ICONS: Record<string, React.ReactNode> = {
  play_games: <Swords className="w-4 h-4" />,
  find_long_word: <Target className="w-4 h-4" />,
  reach_combo: <Zap className="w-4 h-4" />,
};

const QUEST_LABEL_KEYS: Record<string, string> = {
  play_games: 'dailyQuests.playGames',
  find_long_word: 'dailyQuests.findLongWord',
  reach_combo: 'dailyQuests.reachCombo',
};

function QuestRow({ quest, t }: { quest: QuestProgress; t: (key: string, params?: Record<string, string | number>) => string }) {
  const progress = Math.min(quest.current / quest.target, 1);

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Icon */}
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-neo border-2 border-neo-black ${
          quest.complete ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy/50 text-neo-white'
        }`}
      >
        {quest.complete ? <Check className="w-4 h-4" strokeWidth={3} /> : QUEST_ICONS[quest.id]}
      </div>

      {/* Label + progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-sm font-bold truncate ${
              quest.complete ? 'text-neo-lime line-through' : 'text-neo-white'
            }`}
          >
            {t(QUEST_LABEL_KEYS[quest.id], { target: quest.target })}
          </span>
          <span className="text-xs font-mono text-neo-white ms-2">
            {quest.current}/{quest.target}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-neo-black/40 rounded-full overflow-hidden border border-neo-black/50">
          <AdaptiveMotion.div
            className={`h-full rounded-full ${quest.complete ? 'bg-neo-lime' : 'bg-neo-cyan'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Reward tag */}
      <div className="flex items-center gap-1 text-xs font-bold text-neo-orange whitespace-nowrap">
        <Star className="w-3 h-3" />
        {quest.xpReward}
        <Coins className="w-3 h-3 ms-1" />
        {quest.coinReward}
      </div>
    </div>
  );
}

export function DailyQuestTracker() {
  const { t } = useLanguage();
  const { quests, allComplete, totalRewards } = useDailySideQuests();

  return (
    <div className="bg-neo-navy border-3 border-neo-black shadow-hard rounded-neo p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-black text-neo-white uppercase tracking-wide">
          {t('dailyQuests.title')}
        </h3>
        {allComplete && (
          <span className="text-xs font-bold text-neo-lime bg-neo-lime/20 px-2 py-0.5 rounded-neo border border-neo-lime/40">
            {t('dailyQuests.allComplete')}
          </span>
        )}
      </div>

      {/* Quest list */}
      <div className="divide-y divide-neo-white/10">
        {quests.map((quest) => (
          <QuestRow key={quest.id} quest={quest} t={t} />
        ))}
      </div>

      {/* All complete celebration */}
      <AdaptiveAnimatePresence>
        {allComplete && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 pt-3 border-t-2 border-neo-lime/30"
          >
            <div className="flex items-center justify-center gap-3 text-sm font-bold text-neo-lime">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                {t('dailyQuests.totalXp', { xp: totalRewards.xp })}
              </div>
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4" />
                {t('dailyQuests.totalCoins', { coins: totalRewards.coins })}
              </div>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
