/**
 * useAdventureQuestTracking — Extracted quest/objective tracking effects from AdventureGame.
 * Tracks daily quests, chapter quests, and boss objective progress.
 */
import { useEffect, useRef } from 'react';

interface UseAdventureQuestTrackingParams {
  // Game state
  wordsFound: string[];
  comboCount: number;
  // Boss
  isBossLevel: boolean;
  bossCurrentHP: number;
  bossMaxHP: number;
  playerCurrentHP: number;
  playerMaxHP: number;
  gridEffectTrigger: { name: string; id: number } | null;
  // Flash challenge
  isChallengeComplete: boolean;
  // Quest recorders
  chapterQuests: {
    recordWordsFound: (count: number) => void;
    recordLongWord: () => void;
    recordStreakMaster: () => void;
    recordFlashChallengeMaster: () => void;
    recordWorldMechanicUse: () => void;
  };
  // Objective updater
  updateObjective: (type: string, value: number, mode: 'set' | 'increment') => void;
}

export function useAdventureQuestTracking(params: UseAdventureQuestTrackingParams) {
  const {
    wordsFound, comboCount,
    isBossLevel, bossCurrentHP, bossMaxHP, playerCurrentHP, playerMaxHP, gridEffectTrigger,
    isChallengeComplete,
    chapterQuests, updateObjective,
  } = params;

  // Ref for chapterQuests to avoid having the object in useEffect deps.
  // The object changes on every render (new progress derived from state),
  // which causes infinite re-render loops when effects call methods that update state.
  const chapterQuestsRef = useRef(chapterQuests);
  chapterQuestsRef.current = chapterQuests;

  // Boss objective: defeatBoss — track boss HP depletion as percentage
  useEffect(() => {
    if (!isBossLevel) return;
    const depleted = bossMaxHP > 0
      ? Math.round(((bossMaxHP - bossCurrentHP) / bossMaxHP) * 100)
      : 0;
    updateObjective('defeatBoss', depleted, 'set');
  }, [isBossLevel, bossCurrentHP, bossMaxHP, updateObjective]);

  // Boss objective: surviveBattle — track player health percentage
  useEffect(() => {
    if (!isBossLevel) return;
    const healthPct = playerMaxHP > 0
      ? Math.round((playerCurrentHP / playerMaxHP) * 100)
      : 100;
    updateObjective('surviveBattle', healthPct, 'set');
  }, [isBossLevel, playerCurrentHP, playerMaxHP, updateObjective]);

  // Grid effect trigger: track for both boss objective AND chapter quest
  const prevGridEffectRef = useRef(gridEffectTrigger);
  useEffect(() => {
    if (gridEffectTrigger !== prevGridEffectRef.current && gridEffectTrigger) {
      // Mechanic trigger objective (boss AND regular levels with mechanics)
      updateObjective('mechanicTrigger', 1, 'increment');
      // Chapter quest: world mechanic use
      chapterQuestsRef.current.recordWorldMechanicUse();
    }
    prevGridEffectRef.current = gridEffectTrigger;
  }, [gridEffectTrigger, updateObjective]);

  // Chapter quest progress: track words found and long words
  const prevQuestWordsRef = useRef(wordsFound.length);
  useEffect(() => {
    const newWords = wordsFound.length - prevQuestWordsRef.current;
    if (newWords > 0) {
      chapterQuestsRef.current.recordWordsFound(newWords);
      const latestWord = wordsFound[wordsFound.length - 1];
      if (latestWord && latestWord.length >= 6) {
        chapterQuestsRef.current.recordLongWord();
      }
    }
    prevQuestWordsRef.current = wordsFound.length;
  }, [wordsFound]);

  // Chapter quest: streak master — fire when a new streak begins
  // (transition from 0 to positive), not on every word within a streak
  const prevComboRef = useRef(0);
  useEffect(() => {
    const prev = prevComboRef.current;
    if (comboCount > 0 && prev === 0) {
      chapterQuestsRef.current.recordStreakMaster();
    }
    prevComboRef.current = comboCount;
  }, [comboCount]);

  // Chapter quest: flash challenge master
  useEffect(() => {
    if (isChallengeComplete) {
      chapterQuestsRef.current.recordFlashChallengeMaster();
    }
  }, [isChallengeComplete]);

}
