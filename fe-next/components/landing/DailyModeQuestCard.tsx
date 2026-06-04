'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyModeQuest } from '@/hooks/useDailyModeQuest';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCoinContext } from '@/contexts/CoinContext';

/**
 * Compact daily quest progress bar for landing page.
 * Collapsed: single-line "Daily Quest: 1/3 modes [dots]"
 * Expanded on tap: shows mode details + claim button
 * Max height collapsed: 80px. No modal — reward shown inline.
 */
export function DailyModeQuestCard() {
  const { t } = useLanguage();
  const { getQuestProgress, claimReward, data } = useDailyModeQuest();
  const { playDailyRewardSound } = useSoundEffects();
  const { addCoins } = useCoinContext();
  const [expanded, setExpanded] = useState(false);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);

  const progress = getQuestProgress();
  const modesPlayed = [progress.blast, progress.classicMp, progress.wordHuntMp].filter(Boolean).length;
  const claimed = data.claimed;

  const handleClaim = () => {
    // claimReward() flips claimed:true synchronously and returns null on
    // re-claim, so the grant below is idempotent — a double-click can't
    // double-credit. Fire-and-forget keeps this handler synchronous.
    const coins = claimReward();
    if (coins !== null) {
      setRewardAmount(coins);
      playDailyRewardSound();
      void addCoins(coins, t('dailyQuest.title'), { source: 'daily_mode_quest' });
    }
  };

  // Already claimed — show completion message
  if (claimed || rewardAmount !== null) {
    return (
      <div className="w-full border-neo rounded-neo bg-neo-navy-light px-4 py-3 flex items-center justify-between shadow-hard-sm">
        <span className="font-neo-display text-neo-lime text-sm">
          {rewardAmount !== null
            ? t('dailyQuest.rewardEarned', { coins: rewardAmount })
            : t('dailyQuest.questComplete')}
        </span>
      </div>
    );
  }

  // Quest complete, not yet claimed
  if (progress.completed) {
    return (
      <div className="w-full border-neo rounded-neo bg-neo-navy-light px-4 py-3 flex items-center justify-between shadow-hard-sm">
        <span className="font-neo-display text-neo-lime text-sm">
          {t('dailyQuest.title')}
        </span>
        <button
          onClick={handleClaim}
          className="bg-neo-lime text-neo-navy font-neo-display text-sm px-3 py-1 rounded-neo border-neo shadow-hard-sm active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-transform"
        >
          {t('dailyQuest.claimReward')}
        </button>
      </div>
    );
  }

  // In progress — collapsed bar with expand on tap
  return (
    <div
      className="w-full border-neo rounded-neo bg-neo-navy-light shadow-hard-sm cursor-pointer"
      onClick={() => setExpanded((p) => !p)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((p) => !p); }}
    >
      {/* Collapsed bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="font-neo-display text-neo-white text-sm">
          {t('dailyQuest.title')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-neo-white text-xs">
            {t('dailyQuest.modesPlayed', { count: modesPlayed })}
          </span>
          <div className="flex gap-1">
            {[
              { id: 'blast', done: progress.blast },
              { id: 'classicMp', done: progress.classicMp },
              { id: 'wordHuntMp', done: progress.wordHuntMp },
            ].map(({ id, done }) => (
              <span
                key={id}
                className={`w-2.5 h-2.5 rounded-full border border-neo-cream/30 ${
                  done ? 'bg-neo-lime' : 'bg-neo-navy animate-pulse'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 flex flex-col gap-1 border-t border-neo-cream/10">
          <ModeRow label={t('dailyQuest.blast')} done={progress.blast} emoji="&#x1F4A5;" />
          <ModeRow label={t('dailyQuest.classicMp')} done={progress.classicMp} emoji="&#x2694;&#xFE0F;" />
          <ModeRow label={t('dailyQuest.wordHuntMp')} done={progress.wordHuntMp} emoji="&#x1F3AF;" />
          <p className="text-neo-white text-xs mt-1">{t('dailyQuest.playAllModes')}</p>
        </div>
      )}
    </div>
  );
}

function ModeRow({ label, done, emoji }: { label: string; done: boolean; emoji: string }) {
  return (
    <div className="flex items-center gap-2 text-sm pt-1">
      <span>{emoji}</span>
      <span className={done ? 'text-neo-lime line-through' : 'text-neo-white'}>{label}</span>
      {done && <span className="text-neo-lime">&#x2713;</span>}
    </div>
  );
}
