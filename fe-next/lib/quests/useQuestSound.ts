'use client';

import { useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { QuestSound } from './questReactions';

export function useQuestSound(): (sound: QuestSound) => void {
  const s = useSoundEffects();
  return useCallback((sound: QuestSound) => {
    const play = {
      quest: s.playQuestCompleteSound,
      achievement: s.playAchievementSound,
      perfect: s.playPerfectWordSound,
      epic: s.playEpicVictorySound,
      crown: s.playCrownVictorySound,
    }[sound] ?? s.playQuestCompleteSound;
    void play?.();
  }, [s]);
}
