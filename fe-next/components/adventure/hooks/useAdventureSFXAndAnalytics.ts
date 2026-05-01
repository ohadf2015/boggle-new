/**
 * useAdventureSFXAndAnalytics
 *
 * Manages sound effects gating and analytics tracking for adventure gameplay.
 * Extracted from AdventureGame to reduce file size.
 */

import { useEffect, useRef } from 'react';
import { trackAdventureLevel, trackFeatureFirstUse, trackGameStart } from '@/utils/growthTracking';

interface SFXHandlers {
  setGameActive: (active: boolean) => void;
  playCountdownBeep: (timeRemaining: number) => void;
  playWordAcceptedSound: () => void;
  playComboSound: (comboCount: number) => void;
  /** GF-002 — pairs with score-popup arc to complete the dopamine loop */
  playCoinCollectSound: () => void;
  playLevelUpSound: () => void;
  playBossEntranceSound: () => void;
  playBossHitSound: () => void;
  playBossPhaseChangeSound: () => void;
  playBossDefeatSound: () => void;
  playBossDefeatLegendarySound: () => void;
  playTimerUrgentSound: () => void;
  playLegendaryWordSound: () => void;
}

interface UseAdventureSFXOptions {
  isPlaying: boolean;
  timeRemaining: number;
  wordsFoundLength: number;
  prevWordsFoundLen: number | undefined;
  comboCount: number;
  sfx: SFXHandlers;
  /** Boss fight state */
  isBossLevel?: boolean;
  showBossIntro?: boolean;
  showBossFireworks?: boolean;
  bossHealthPhase?: string;
  bossCurrentHP?: number;
  /** Length of the last word found (for legendary word sound) */
  lastWordLength?: number;
  /** Level just completed (non-boss) */
  nonBossCompleted?: boolean;
  gameStars?: number;
}

export function useAdventureSFX({
  isPlaying, timeRemaining, wordsFoundLength, prevWordsFoundLen, comboCount, sfx,
  isBossLevel, showBossIntro, showBossFireworks, bossHealthPhase, bossCurrentHP,
  lastWordLength, nonBossCompleted, gameStars,
}: UseAdventureSFXOptions): void {
  // Gate sounds to active gameplay
  useEffect(() => { sfx.setGameActive(isPlaying); return () => sfx.setGameActive(false); }, [isPlaying, sfx]);

  // Countdown beep in last 10s
  useEffect(() => {
    if (isPlaying && timeRemaining <= 10 && timeRemaining > 0) sfx.playCountdownBeep(timeRemaining);
  }, [isPlaying, timeRemaining, sfx]);

  // Timer urgent in last 5s (supplements countdown beep)
  useEffect(() => {
    if (isPlaying && timeRemaining === 5) sfx.playTimerUrgentSound();
  }, [isPlaying, timeRemaining, sfx]);

  // Word accepted sound + combo sound + score-popup audio (GF-002)
  useEffect(() => {
    if (prevWordsFoundLen !== undefined && wordsFoundLength > prevWordsFoundLen && isPlaying) {
      sfx.playWordAcceptedSound();
      // GF-002: pair the score-popup arc with a coin-collect SFX so the visual
      // reward has audio support. Layered immediately — engine handles overlap.
      sfx.playCoinCollectSound();
      if (comboCount >= 2) sfx.playComboSound(comboCount);
    }
  }, [wordsFoundLength, prevWordsFoundLen, comboCount, isPlaying, sfx]);

  // Legendary word sound for 8+ letter words in adventure
  const prevWordCount = useRef(0);
  useEffect(() => {
    if (wordsFoundLength > prevWordCount.current && lastWordLength && lastWordLength >= 8) {
      sfx.playLegendaryWordSound();
    }
    prevWordCount.current = wordsFoundLength;
  }, [wordsFoundLength, lastWordLength, sfx]);

  // Level up sound when non-boss level completes with at least 1 star
  const prevNonBossCompleted = useRef(false);
  useEffect(() => {
    if (nonBossCompleted && !prevNonBossCompleted.current && (gameStars ?? 0) >= 1) {
      sfx.playLevelUpSound();
    }
    prevNonBossCompleted.current = !!nonBossCompleted;
  }, [nonBossCompleted, gameStars, sfx]);

  // Boss entrance sound when boss intro begins
  const prevShowBossIntro = useRef(false);
  useEffect(() => {
    if (showBossIntro && !prevShowBossIntro.current) sfx.playBossEntranceSound();
    prevShowBossIntro.current = !!showBossIntro;
  }, [showBossIntro, sfx]);

  // Boss defeat sound when fireworks appear — legendary version!
  const prevShowBossFireworks = useRef(false);
  useEffect(() => {
    if (showBossFireworks && !prevShowBossFireworks.current) sfx.playBossDefeatLegendarySound();
    prevShowBossFireworks.current = !!showBossFireworks;
  }, [showBossFireworks, sfx]);

  // Boss phase change sound
  const prevBossHealthPhase = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (isBossLevel && bossHealthPhase && bossHealthPhase !== prevBossHealthPhase.current && prevBossHealthPhase.current !== undefined) {
      sfx.playBossPhaseChangeSound();
    }
    prevBossHealthPhase.current = bossHealthPhase;
  }, [isBossLevel, bossHealthPhase, sfx]);

  // Boss hit sound when boss takes damage (HP decreases)
  // Boss defeat sound when HP reaches 0 (before fireworks)
  const prevBossCurrentHP = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (isBossLevel && bossCurrentHP !== undefined && prevBossCurrentHP.current !== undefined && bossCurrentHP < prevBossCurrentHP.current) {
      if (bossCurrentHP <= 0) {
        sfx.playBossDefeatSound();
      } else {
        sfx.playBossHitSound();
      }
    }
    prevBossCurrentHP.current = bossCurrentHP;
  }, [isBossLevel, bossCurrentHP, sfx]);
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
  isBossLevel?: boolean;
}

export function useAdventureAnalytics({
  isPlaying, entryPhase, worldNumber, levelNumber,
  gameStars, gameScore, nonBossCompleted, showVictoryCinematic, showDefeatCinematic,
  consecutiveFailures, isBossLevel,
}: UseAdventureAnalyticsOptions): { resetTracking: () => void } {
  // Track first adventure use (deduplicated in localStorage)
  useEffect(() => { trackFeatureFirstUse('adventure'); }, []);

  // Track level start when gameplay begins
  const hasTrackedStartRef = useRef(false);
  useEffect(() => {
    if (isPlaying && entryPhase === 'playing' && !hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackAdventureLevel('start', worldNumber, levelNumber);
      trackGameStart(isBossLevel ? 'adventure-boss' : 'adventure', { world: worldNumber, level: levelNumber });
    }
  }, [isPlaying, entryPhase, worldNumber, levelNumber, isBossLevel]);

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
