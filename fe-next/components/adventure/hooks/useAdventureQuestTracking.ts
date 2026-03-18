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
  gridEffectTrigger: any;
  // Flash challenge
  isChallengeComplete: boolean;
  // Quest recorders
  recordQuestProgress: (type: 'longWord' | 'comboStreak' | 'wordCount' | 'perfectStar' | 'speedRun' | 'bossDefeat' | 'mechanicUse', amount?: number) => void;
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
    recordQuestProgress, chapterQuests, updateObjective,
  } = params;

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

  // Boss objective: mechanicTrigger — increment when boss grid effect triggers
  const prevGridEffectRef = useRef(gridEffectTrigger);
  useEffect(() => {
    if (!isBossLevel) return;
    if (gridEffectTrigger !== prevGridEffectRef.current && gridEffectTrigger) {
      updateObjective('mechanicTrigger', 1, 'increment');
    }
    prevGridEffectRef.current = gridEffectTrigger;
  }, [isBossLevel, gridEffectTrigger, updateObjective]);

  // Daily quest progress: track words found, long words, and combos
  const prevQuestWordsRef = useRef(wordsFound.length);
  useEffect(() => {
    const newWords = wordsFound.length - prevQuestWordsRef.current;
    if (newWords > 0) {
      recordQuestProgress('wordCount', newWords);
      chapterQuests.recordWordsFound(newWords);
      const latestWord = wordsFound[wordsFound.length - 1];
      if (latestWord && latestWord.length >= 6) {
        recordQuestProgress('longWord');
        chapterQuests.recordLongWord();
      }
    }
    prevQuestWordsRef.current = wordsFound.length;
  }, [wordsFound, recordQuestProgress, chapterQuests]);

  useEffect(() => {
    if (comboCount >= 5) recordQuestProgress('comboStreak');
  }, [comboCount, recordQuestProgress]);

  // Chapter quest: streak master
  useEffect(() => {
    if (comboCount > 0) {
      chapterQuests.recordStreakMaster();
    }
  }, [comboCount, chapterQuests]);

  // Chapter quest: flash challenge master
  useEffect(() => {
    if (isChallengeComplete) {
      chapterQuests.recordFlashChallengeMaster();
    }
  }, [isChallengeComplete, chapterQuests]);

  // Chapter quest: world mechanic use
  const prevMechanicTriggerRef = useRef(gridEffectTrigger);
  useEffect(() => {
    if (gridEffectTrigger !== prevMechanicTriggerRef.current && gridEffectTrigger) {
      chapterQuests.recordWorldMechanicUse();
    }
    prevMechanicTriggerRef.current = gridEffectTrigger;
  }, [gridEffectTrigger, chapterQuests]);
}
