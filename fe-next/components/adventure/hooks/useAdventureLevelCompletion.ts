/**
 * useAdventureLevelCompletion Hook
 *
 * Manages level completion logic including:
 * - XP/gold awarding on completion
 * - Victory/defeat detection and cinematic triggering
 * - Achievement recording and progress tracking
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateAdventureXp } from '@/shared/utils/adventureXpUtils';
import { generateLevelLoot } from '@/lib/adventure/lootGenerator';
import { trackGameEnd } from '@/utils/growthTracking';
import { useHaptics } from '@/hooks/useHaptics';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { useNetworkState } from '@/hooks/useNetworkState';
import { getOfflineStore } from '@/lib/offline';
import { enqueueScore } from '@/lib/offline/scoreQueue';
import type { LootDrop } from '@/types/adventure';
import type { LevelUpPayload } from '@/components/education/LevelUpCelebration';
import type { BossTauntEvent } from '@/types/boss';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';

interface GameStateSlice {
  isComplete: boolean;
  stars: number;
  score: number;
  wordsFound: string[];
  comboCount: number;
}

interface ObjectiveSlice {
  type: string;
  current?: number;
  target?: number;
}

export interface UseAdventureLevelCompletionProps {
  gameState: GameStateSlice;
  timeRemaining: number;
  timerSeconds: number;
  levelConfig: { world: number; level: number };
  objectives: ObjectiveSlice[];
  currentLevel: number;
  upgradeBonuses: { xpBonus: number; timeBonus: number; scoreBonus: number };
  upgradeEffects?: { goldMultiplier: number; doubleFirstCompletionGold: boolean; failureGold: number; longWordGoldBonus: number };
  /** Combined gold multiplier from rune + streak + weekly (stacks with upgradeEffects.goldMultiplier) */
  bonusGoldMultiplier?: number;
  awardXp: (xp: number) => { leveledUp: boolean; newLevel?: number };
  addGold: (amount: number) => void;
  recordAttempt: (
    world: number,
    level: number,
    words: number,
    score: number,
    timeRemaining: number,
    objectiveProgress: Record<string, number>,
    isCompletion: boolean
  ) => void;
  recordCompletion: (data: {
    isCompletion: boolean;
    timeRemaining: number;
    timerSeconds: number;
    score: number;
    words: number;
    wordPath?: Array<{ row: number; col: number }>;
    targetWord?: string;
    lootDrops?: LootDrop[];
    retainedScore?: number;
  }) => Promise<void>;
  /** Eagerly save completion to DB (ProgressionContext.completeLevel) — called as soon as level ends */
  saveCompletion: (
    world: number,
    level: number,
    stars: 0 | 1 | 2 | 3,
    score: number,
    words: number,
    goldEarned?: number,
    longWords?: number,
    wordsFound?: string[],
    flashChallengeGold?: number,
    timePlayed?: number
  ) => Promise<boolean>;
  /** Gold earned from completed flash challenge (persisted server-side) */
  flashChallengeGold?: number;
  /** Update word album with words found this level */
  updateWordAlbum?: (words: string[]) => void;
  /** Update runes + fragment balance (optimistic, client-only) */
  updateRunes?: (runes: import('@/types/adventure').PlayerRune[], fragments: number) => void;
  /** Current rune state for fragment accumulation */
  currentRunes?: import('@/types/adventure').PlayerRune[];
  /** Current fragment balance */
  currentFragments?: number;
  endAIDirector: () => void;
  handleEarnAchievement: (id: AdventureAchievementId) => boolean;
  pauseGame: () => void;
  /** Dispatch COMPLETE_LEVEL to the game reducer (sets isComplete + calculates stars) */
  completeLevel: () => void;
  showVictory: () => void;
  showDefeat: () => void;
  showLevelComplete: boolean;
  showVictoryCinematic: boolean;
  showDefeatCinematic: boolean;
  isBossLevel: boolean;
  isBossActive: boolean;
  bossHealthPhase: string;
  playerIsDead: boolean;
  endBossBattle: (isVictory: boolean) => void;
  triggerBossTaunt: (event: BossTauntEvent) => void;
  isFirstCompletion?: boolean;
  /** Player health percentage (0-100) for boss no-damage achievement */
  playerHealthPercent?: number;
  /** Score retained from a previous retry (Salvage Claw upgrade) */
  retainedScore?: number;
  /** Authenticated user ID — omit for guests (guests skip offline enqueue) */
  userId?: string;
}

export function useAdventureLevelCompletion(props: UseAdventureLevelCompletionProps) {
  const {
    gameState, timeRemaining, timerSeconds, levelConfig, objectives,
    currentLevel, upgradeBonuses, awardXp,
    recordAttempt, recordCompletion, endAIDirector, handleEarnAchievement,
    pauseGame, completeLevel, showVictory, showDefeat,
    showLevelComplete, showVictoryCinematic, showDefeatCinematic,
    isBossLevel, isBossActive, bossHealthPhase, playerIsDead,
    endBossBattle, triggerBossTaunt,
  } = props;
  const offlineFlag = useOfflineModeFlag();
  const { online } = useNetworkState();

  const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
  const [hasAwardedLevelRewards, setHasAwardedLevelRewards] = useState(false);
  const [lootDrops, setLootDrops] = useState<LootDrop[]>([]);
  const [earnedXp, setEarnedXp] = useState<number>(0);
  const [earnedGold, setEarnedGold] = useState<number>(0);
  // Ref mirror of earnedGold — used by the eager DB save effect which fires
  // in the same React commit phase as the gold-awarding effect. useState updates
  // are batched to the next render, so the save effect's closure sees stale 0.
  // The ref is written synchronously and always has the correct value.
  const earnedGoldRef = useRef<number>(0);
  const lootDropsRef = useRef<LootDrop[]>([]);
  const [nonBossCompleted, setNonBossCompleted] = useState(false);
  const completionProcessedRef = useRef(false);
  /** Tracks whether recordAttempt has been fired to prevent duplicate API calls */
  const attemptRecordedRef = useRef(false);
  /** Tracks whether the DB save has been fired to prevent double-saves */
  const completionSavedRef = useRef(false);
  /** Tracks whether the eager DB save failed (so Continue/Retry can retry) */
  const completionSaveFailedRef = useRef(false);

  // Track if player ever took damage (for BOSS_NO_DAMAGE achievement)
  const playerTookDamageRef = useRef(false);
  useEffect(() => {
    if (isBossLevel && props.playerHealthPercent !== undefined && props.playerHealthPercent < 100) {
      playerTookDamageRef.current = true;
    }
  }, [isBossLevel, props.playerHealthPercent]);

  // Store callbacks in refs for stable references
  const recordAttemptRef = useRef(recordAttempt);
  const recordCompletionRef = useRef(recordCompletion);
  const saveCompletionRef = useRef(props.saveCompletion);
  const endAIDirectorRef = useRef(endAIDirector);
  const handleEarnAchievementRef = useRef(handleEarnAchievement);
  const updateWordAlbumRef = useRef(props.updateWordAlbum);
  const updateRunesRef = useRef(props.updateRunes);

  // Keep callback refs in sync (separated from reset to avoid clearing
  // completion guards when only a callback reference changes — H8 fix)
  useEffect(() => {
    recordAttemptRef.current = recordAttempt;
    recordCompletionRef.current = recordCompletion;
    saveCompletionRef.current = props.saveCompletion;
    endAIDirectorRef.current = endAIDirector;
    handleEarnAchievementRef.current = handleEarnAchievement;
    updateWordAlbumRef.current = props.updateWordAlbum;
    updateRunesRef.current = props.updateRunes;
  }); // runs every render — ref sync is cheap, no deps needed

  // Reset completion flags ONLY on actual level change
  const completionHapticFiredRef = useRef(false);
  useEffect(() => {
    completionProcessedRef.current = false;
    attemptRecordedRef.current = false;
    completionSavedRef.current = false;
    completionSaveFailedRef.current = false;
    completionHapticFiredRef.current = false;
  }, [levelConfig.world, levelConfig.level]);

  // GF-003 — fire level-complete haptic once when stars are earned on a non-boss level.
  // Boss levels emit their own haptic from BossVictory.tsx, so skip here to avoid double-fire.
  const haptics = useHaptics();
  useEffect(() => {
    if (isBossLevel) return;
    if (!showLevelComplete) return;
    if (gameState.stars <= 0) return;
    if (completionHapticFiredRef.current) return;
    completionHapticFiredRef.current = true;
    void haptics.levelComplete();
  }, [showLevelComplete, gameState.stars, isBossLevel, haptics]);

  // Calculate estimated XP and gold for UI display on level completion.
  // Actual state updates happen server-side via ProgressionContext.completeLevel().
  // This eliminates client/server gold+XP divergence (C1 audit fix).
  useEffect(() => {
    if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars > 0) {
      const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
        1: 'easy', 2: 'easy', 3: 'medium', 4: 'medium', 5: 'hard',
      };
      const difficulty = difficultyMap[levelConfig.level] || 'medium';
      const isPerfectClear = gameState.stars === 3;
      const hasTimeBonus = timeRemaining > (timerSeconds * 0.5);

      // Estimated XP for UI display — server is the source of truth
      const baseXp = calculateAdventureXp(
        difficulty,
        Math.max(1, gameState.comboCount),
        { perfectClear: isPerfectClear, timeBonus: hasTimeBonus ? 0.1 : 0 }
      );
      const computedXp = Math.floor(baseXp * upgradeBonuses.xpBonus);
      setEarnedXp(computedXp);

      // awardXp for level-up detection only (uses functional updater to avoid stale closure)
      const oldLevel = currentLevel;
      const levelUpResult = awardXp(computedXp);
      if (levelUpResult.leveledUp && levelUpResult.newLevel !== undefined) {
        setLevelUpData({ oldLevel, newLevel: levelUpResult.newLevel, newTitles: [] });
      }

      // Estimated gold for UI display — server calculates the real value
      const baseGold = (10 + levelConfig.world * 3) * gameState.stars;
      const perfectClearGoldBonus = isPerfectClear ? 50 : 0;
      let computedGold = baseGold + perfectClearGoldBonus;
      // Lucky Pickaxe T4: double gold on first completion (matches server logic)
      if (props.isFirstCompletion && props.upgradeEffects?.doubleFirstCompletionGold) {
        computedGold = computedGold * 2;
      }
      earnedGoldRef.current = computedGold;
      setEarnedGold(computedGold);
      // NOTE: addGold() is NOT called — gold is updated from server response
      // in ProgressionContext.completeLevel() to prevent client/server divergence

      // Generate loot drops
      const drops = generateLevelLoot({
        world: levelConfig.world,
        level: levelConfig.level,
        stars: gameState.stars as 0 | 1 | 2 | 3,
        score: gameState.score,
        isFirstCompletion: props.isFirstCompletion ?? true,
        isBossLevel,
      });
      lootDropsRef.current = drops;
      setLootDrops(drops);

      // Accumulate rune fragments from loot drops
      const fragmentCount = drops
        .filter(d => d.type === 'runeFragment')
        .reduce((sum, d) => sum + (d.quantity ?? 1), 0);
      if (fragmentCount > 0 && updateRunesRef.current) {
        updateRunesRef.current(
          props.currentRunes ?? [],
          (props.currentFragments ?? 0) + fragmentCount,
        );
      }

      setHasAwardedLevelRewards(true);
    }
    // Failure gold (Salvage Claw) — server handles via complete endpoint
    if ((gameState.isComplete || timeRemaining === 0) && !hasAwardedLevelRewards && gameState.stars === 0) {
      setHasAwardedLevelRewards(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.isComplete, gameState.stars, gameState.comboCount, gameState.score, gameState.wordsFound, timeRemaining, hasAwardedLevelRewards, levelConfig.level, levelConfig.world, timerSeconds, awardXp, currentLevel, upgradeBonuses.xpBonus, isBossLevel, props.isFirstCompletion, props.upgradeEffects?.doubleFirstCompletionGold]);

  // Victory/Defeat Detection & Cinematic Trigger
  useEffect(() => {
    if (showLevelComplete || showVictoryCinematic || showDefeatCinematic) return;
    if (completionProcessedRef.current) return;

    const playerDied = isBossLevel && playerIsDead;

    const shouldComplete = isBossLevel
      ? bossHealthPhase === 'victory' || bossHealthPhase === 'defeat' || playerDied
      : gameState.isComplete || timeRemaining === 0;

    if (!shouldComplete) return;

    completionProcessedRef.current = true;

    const isVictory = isBossLevel
      ? bossHealthPhase === 'victory' && !playerDied
      : gameState.stars > 0;

    // Boss levels get cinematic treatment; non-boss levels skip straight to results
    if (isBossLevel) {
      if (isVictory) showVictory();
      else showDefeat();

      // Boss battle completion — handled in same effect as victory/defeat detection
      // to eliminate implicit ordering dependency on completionProcessedRef (M6 fix)
      if (isBossActive) {
        if (bossHealthPhase !== 'victory' && bossHealthPhase !== 'defeat') {
          endBossBattle(isVictory);
        }

        triggerBossTaunt(isVictory ? 'onVictory' : 'onDefeat');

        if (isVictory) {
          handleEarnAchievementRef.current('BOSS_SLAYER');
          // Boss timer counts UP (elapsed seconds) — speedrun if under 60s
          if (timeRemaining < 60) {
            handleEarnAchievementRef.current('BOSS_SPEEDRUN');
          }
          if (!playerIsDead && !playerTookDamageRef.current) {
            handleEarnAchievementRef.current('BOSS_NO_DAMAGE');
          }
        }
      }
    }

    // Ensure reducer marks game as complete (sets isComplete=true + calculates stars).
    // For non-boss timer=0, the TICK handler already does this. For boss endings
    // (HP=0, player death, timer=0 during boss), the reducer doesn't know the game
    // ended — completeLevel() bridges that gap.
    if (isBossLevel && !gameState.isComplete) {
      completeLevel();
    }

    pauseGame();
    setNonBossCompleted(!isBossLevel);
  }, [showLevelComplete, showVictoryCinematic, showDefeatCinematic, gameState.isComplete, gameState.stars, timeRemaining, pauseGame, completeLevel, isBossLevel, isBossActive, bossHealthPhase, playerIsDead, showVictory, showDefeat, endBossBattle, triggerBossTaunt, timerSeconds]);

  // Achievement & Progress Recording + Eager DB Save
  useEffect(() => {
    if (!completionProcessedRef.current) return;
    if (!gameState.isComplete && timeRemaining > 0) return;

    if (gameState.stars === 3) {
      handleEarnAchievementRef.current('PERFECT_LEVEL');
    }

    // Guard: only record attempt once per level completion to prevent
    // duplicate API calls that cause 429 rate limits (Sentry JAVASCRIPT-NEXTJS-9K)
    if (!attemptRecordedRef.current) {
      attemptRecordedRef.current = true;

      const objectiveProgress: Record<string, number> = {};
      for (const obj of objectives) {
        objectiveProgress[obj.type] = obj.current ?? 0;
      }

      recordAttemptRef.current(
        levelConfig.world, levelConfig.level,
        gameState.wordsFound.length, gameState.score,
        timeRemaining, objectiveProgress, gameState.stars > 0
      );

      recordCompletionRef.current({
        isCompletion: gameState.stars > 0,
        timeRemaining,
        timerSeconds,
        score: gameState.score,
        words: gameState.wordsFound.length,
        lootDrops: lootDropsRef.current,
        retainedScore: props.retainedScore,
      });

      // Eagerly save completion to DB — don't wait for Continue button click.
      // This ensures progress is persisted even if user navigates away (browser back, exit).
      if (gameState.stars > 0 && !completionSavedRef.current) {
        // Mark in-flight immediately to prevent re-entry from effect re-fires,
        // but track actual success separately so we can retry on failure.
        completionSavedRef.current = true;
        const longWords = gameState.wordsFound.filter(w => w.length >= 6).length;
        const timePlayed = Math.max(0, Math.floor(timerSeconds - timeRemaining));

        if (offlineFlag && !online && props.userId) {
          getOfflineStore().then(store =>
            enqueueScore(store, 'adventure', {
              world: levelConfig.world, level: levelConfig.level,
              stars: gameState.stars, score: gameState.score,
              words: gameState.wordsFound.length,
              goldEarned: earnedGoldRef.current, longWords,
              wordsFound: gameState.wordsFound,
              flashChallengeGold: props.flashChallengeGold, timePlayed,
            })
          ).then(() => {
            saveResolvedRef.current = true;
          }).catch(() => {
            saveResolvedRef.current = true;
            completionSaveFailedRef.current = true;
          });
        } else {
          saveCompletionRef.current(
            levelConfig.world, levelConfig.level,
            gameState.stars as 0 | 1 | 2 | 3,
            gameState.score, gameState.wordsFound.length,
            earnedGoldRef.current, longWords, gameState.wordsFound,
            props.flashChallengeGold, timePlayed
          ).then((success) => {
            saveResolvedRef.current = true;
            if (!success) {
              completionSaveFailedRef.current = true;
            }
          }).catch(() => {
            saveResolvedRef.current = true;
            // Mark as failed so Continue/Retry can retry — do NOT reset
            // completionSavedRef (that would let this effect re-fire and cause 429 cascades)
            completionSaveFailedRef.current = true;
          });
        }
      }

      endAIDirectorRef.current();

      // Update word album with words found this level
      if (gameState.wordsFound.length > 0) {
        updateWordAlbumRef.current?.(gameState.wordsFound);
      }

      trackGameEnd(
        isBossLevel ? 'adventure-boss' : 'adventure',
        gameState.score,
        gameState.wordsFound.length,
        gameState.stars > 0,
        Math.max(0, Math.floor(timerSeconds - timeRemaining)),
        { isWinner: gameState.stars > 0, stars: gameState.stars, world: levelConfig.world, level: levelConfig.level }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- wordsFound via ref (.length sufficient); earnedGoldRef instead of earnedGold state (stale closure)
  }, [gameState.isComplete, gameState.stars, gameState.wordsFound.length, gameState.score, timeRemaining, objectives, levelConfig.world, levelConfig.level, timerSeconds]);

  const handleLevelUpClose = useCallback(() => {
    setLevelUpData(null);
  }, []);

  // Track whether the DB save Promise has actually resolved (not just fired).
  // completionSavedRef tracks "was the save initiated", this tracks "did it finish".
  const saveResolvedRef = useRef(false);

  // Guard against page unload / SPA navigation while save is in-flight.
  // sendBeacon sends the completion payload to the server as a keep-alive request
  // that survives page teardown. The endpoint handles duplicate saves via UPSERT.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (completionSavedRef.current && !saveResolvedRef.current) {
        // Save was initiated but hasn't resolved — fire sendBeacon as fallback
        try {
          const payload = {
            world: levelConfig.world, level: levelConfig.level,
            stars: gameState.stars, score: gameState.score,
            words: gameState.wordsFound.length,
            goldEarned: earnedGoldRef.current,
            longWords: gameState.wordsFound.filter(w => w.length >= 6).length,
            flashChallengeCompleted: (props.flashChallengeGold ?? 0) > 0,
            timePlayed: Math.max(0, Math.floor(timerSeconds - timeRemaining)),
          };
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(
              '/api/adventure/complete',
              new Blob([JSON.stringify(payload)], { type: 'application/json' })
            );
          }
        } catch { /* best effort */ }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [levelConfig.world, levelConfig.level, gameState.stars, gameState.score, gameState.wordsFound, props.flashChallengeGold, timeRemaining, timerSeconds]);

  // Reset rewards flag (needed for retry)
  const resetRewards = useCallback(() => {
    setHasAwardedLevelRewards(false);
    setLootDrops([]);
    setEarnedXp(0);
    setEarnedGold(0);
    earnedGoldRef.current = 0;
    setNonBossCompleted(false);
    completionProcessedRef.current = false;
    attemptRecordedRef.current = false;
    completionSavedRef.current = false;
    completionSaveFailedRef.current = false;
    saveResolvedRef.current = false;
  }, []);

  return {
    levelUpData,
    hasAwardedLevelRewards,
    lootDrops,
    earnedXp,
    earnedGold,
    nonBossCompleted,
    handleLevelUpClose,
    resetRewards,
    completionProcessedRef,
    /** Whether the completion has been eagerly saved to DB */
    completionSavedRef,
    /** Whether the eager save failed (for Continue/Retry to retry) */
    completionSaveFailedRef,
  };
}
