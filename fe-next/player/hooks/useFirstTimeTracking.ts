import { useEffect, useRef } from 'react';
import { isNewPlayer } from '@/utils/multiplayerProgressStorage';
import type { WordDetail } from '@/shared/types/game';

type TriggerFn = (type: 'firstWord' | 'firstLongWord' | 'firstCombo') => void;

/**
 * Tracks first-time achievements for new multiplayer players:
 * first word found, first long word (5+ letters), first combo (level 2+).
 */
export function useFirstTimeTracking(
  foundWords: WordDetail[],
  comboLevel: number,
  gameActive: boolean,
  triggerAchievement: TriggerFn,
) {
  const isNewPlayerRef = useRef(isNewPlayer());
  const prevFoundWordsCountRef = useRef(0);
  const prevComboLevelRef = useRef(0);

  // Track first word and first long word
  useEffect(() => {
    if (!isNewPlayerRef.current || !gameActive) return;

    const validWords = foundWords.filter(w => w.validated !== false);
    if (validWords.length > 0 && prevFoundWordsCountRef.current === 0) {
      triggerAchievement('firstWord');
    }

    const hasLongWord = validWords.some(w => w.word.length >= 5);
    if (hasLongWord && !validWords.slice(0, prevFoundWordsCountRef.current).some(w => w.word.length >= 5)) {
      triggerAchievement('firstLongWord');
    }

    prevFoundWordsCountRef.current = validWords.length;
  }, [foundWords, gameActive, triggerAchievement]);

  // Track first combo
  useEffect(() => {
    if (!isNewPlayerRef.current || !gameActive) return;

    if (comboLevel >= 2 && prevComboLevelRef.current < 2) {
      triggerAchievement('firstCombo');
    }
    prevComboLevelRef.current = comboLevel;
  }, [comboLevel, gameActive, triggerAchievement]);

  return isNewPlayerRef;
}
