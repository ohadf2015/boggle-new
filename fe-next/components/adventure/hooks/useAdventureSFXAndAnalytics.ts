/**
 * useAdventureSFXAndAnalytics
 *
 * Manages sound effects gating and analytics tracking for adventure gameplay.
 * Extracted from AdventureGame to reduce file size.
 */

import { useEffect, useRef } from 'react';
import { trackAdventureLevel, trackFeatureFirstUse } from '@/utils/growthTracking';

interface SFXHandlers {
  setGameActive: (active: boolean) => void;
  playCountdownBeep: (timeRemaining: number) => void;
  playWordAcceptedSound: () => void;
  playComboSound: (comboCount: number) => void;
}

interface UseAdventureSFXOptions {
  isPlaying: boolean;
  timeRemaining: number;
  wordsFoundLength: number;
  prevWordsFoundLen: number | undefined;
  comboCount: number;
  sfx: SFXHandlers;
}

export function useAdventureSFX({
  isPlaying, timeRemaining, wordsFoundLength, prevWordsFoundLen, comboCount, sfx,
}: UseAdventureSFXOptions): void {
  // Gate sounds to active gameplay
  useEffect(() => { sfx.setGameActive(isPlaying); return () => sfx.setGameActive(false); }, [isPlaying, sfx]);

  // Countdown beep in last 10s
  useEffect(() => {
    if (isPlaying && timeRemaining <= 10 && timeRemaining > 0) sfx.playCountdownBeep(timeRemaining);
  }, [isPlaying, timeRemaining, sfx]);

  // Word accepted sound + combo sound
  useEffect(() => {
    if (prevWordsFoundLen !== undefined && wordsFoundLength > prevWordsFoundLen && isPlaying) {
      sfx.playWordAcceptedSound();
      if (comboCount >= 2) sfx.playComboSound(comboCount);
    }
  }, [wordsFoundLength, prevWordsFoundLen, comboCount, isPlaying, sfx]);
}

interface UseAdventureAnalyticsOptions {
  isPlaying: boolean;
  entryPhase: string;
  worldNumber: number;
  levelNumber: number;
  gameStars: number;
  gameScore: number;
  nonBossCompleted: boolean;
  showVictoryCinematic: boolean;
  showDefeatCinematic: boolean;
  consecutiveFailures: number;
}

export function useAdventureAnalytics({
  isPlaying, entryPhase, worldNumber, levelNumber,
  gameStars, gameScore, nonBossCompleted, showVictoryCinematic, showDefeatCinematic,
  consecutiveFailures,
}: UseAdventureAnalyticsOptions): { resetTracking: () => void } {
  // Track first adventure use (deduplicated in localStorage)
  useEffect(() => { trackFeatureFirstUse('adventure'); }, []);

  // Track level start when gameplay begins
  const hasTrackedStartRef = useRef(false);
  useEffect(() => {
    if (isPlaying && entryPhase === 'playing' && !hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackAdventureLevel('start', worldNumber, levelNumber);
    }
  }, [isPlaying, entryPhase, worldNumber, levelNumber]);

  // Track level pass/fail when completion is determined
  const hasTrackedResultRef = useRef(false);
  useEffect(() => {
    if (hasTrackedResultRef.current) return;
    const completed = nonBossCompleted || showVictoryCinematic || showDefeatCinematic;
    if (!completed) return;
    hasTrackedResultRef.current = true;
    if (gameStars > 0) {
      trackAdventureLevel('pass', worldNumber, levelNumber, {
        score: gameScore, stars: gameStars,
      });
    } else {
      trackAdventureLevel('fail', worldNumber, levelNumber, {
        score: gameScore, consecutiveFailures,
      });
    }
  }, [nonBossCompleted, showVictoryCinematic, showDefeatCinematic, gameStars, gameScore, worldNumber, levelNumber, consecutiveFailures]);

  return {
    resetTracking: () => {
      hasTrackedStartRef.current = false;
      hasTrackedResultRef.current = false;
    },
  };
}
