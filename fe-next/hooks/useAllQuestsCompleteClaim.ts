'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCoinsFromContext } from '@/contexts/CoinContext';
import { publishLevelUp } from '@/lib/avatar/revealTrigger';
import { useQuestSound } from '@/lib/quests/useQuestSound';

interface ClaimResponse {
  success: boolean;
  claimed: boolean;
  xpReward: number;
  coinReward: number;
  levelUp?: { oldLevel: number; newLevel: number } | null;
}

/** Claims the daily+weekly "all done" reward wherever the player is; the server flag makes it once per day. */
export function useAllQuestsCompleteClaim(isGrandSlam: boolean, weeklyComplete: boolean, loading: boolean): void {
  const { t } = useLanguage();
  const { refreshCoins } = useCoinsFromContext();
  const playQuestSound = useQuestSound();
  const attempted = useRef(false);

  useEffect(() => {
    if (loading || !isGrandSlam || !weeklyComplete || attempted.current) return;
    attempted.current = true;
    fetch('/api/quests/all-complete-claim', { method: 'POST' })
      .then((res) => res.json() as Promise<ClaimResponse>)
      .then((json) => {
        if (!json.success || !json.claimed) return;
        refreshCoins();
        if (json.levelUp) publishLevelUp(json.levelUp, 'quests');
        import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
          showQuestCompletionToast({
            questName: '',
            xpReward: json.xpReward,
            goldReward: json.coinReward,
            isAllComplete: true,
            dedupKey: 'quests:all-complete',
            t,
            onComplete: playQuestSound,
          });
        });
      })
      .catch(() => {
        attempted.current = false;
      });
  }, [isGrandSlam, weeklyComplete, loading, t, refreshCoins, playQuestSound]);
}
