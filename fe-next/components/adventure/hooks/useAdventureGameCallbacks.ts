/**
 * useAdventureGameCallbacks — Extracted handleContinue, handleRetry, handleCinematicComplete
 * from AdventureGame to reduce file size.
 */
import { useCallback } from 'react';
import { getWorldConfig } from '@/lib/adventure/levelConfig';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';

interface UseAdventureGameCallbacksParams {
  // Game state
  gameStars: number;
  gameScore: number;
  wordsFoundList: string[];
  comboCount: number;
  // Level config
  isBossLevel: boolean;
  worldNumber: number;
  levelNumber: number;
  // Boss state
  bossHealthPhase: string;
  playerHealthCurrentHP: number;
  playerHealthMaxHP: number;
  resetBossHealth: () => void;
  resetPlayerHealth: () => void;
  // Cinematics
  showVictoryCinematic: boolean;
  showWorldUnlockCinematic: boolean;
  handleCinematicCompleteBase: () => void;
  showWorldUnlock: (props: any) => void;
  resetCinematics: () => void;
  // Completion
  earnedGold: number;
  resetRewards: () => void;
  // Chapter quests
  recordLevelPerfect: () => void;
  recordBossDefeatedNoHint: () => void;
  recordScoreChallenge: (score: number) => void;
  recordBossHighHealth: () => void;
  recordFullComboLevel: () => void;
  // Init
  handleEarnAchievement: (id: AdventureAchievementId) => void;
  upgradeRetryScoreRetention: number;
  // Parent callbacks
  onLevelComplete: (stars: number, score: number, wordsFound: number, goldEarned: number, longWords?: number) => void;
  // Other
  totalStars?: number;
  clearSelection: () => void;
  resetGame: (opts?: { retainedScore?: number }) => void;
  startGame: () => void;
  // Story beat
  storyBeat: any;
  showLootOrComplete: () => void;
  // Setters
  setShowLevelComplete: (v: boolean) => void;
  setRetriesUsed: React.Dispatch<React.SetStateAction<number>>;
  setShowStoryBeat: (v: boolean) => void;
  // Translation
  t: (key: string) => string;
  // Hints tracking ref value
  hintsUsed: number;
}

export function useAdventureGameCallbacks(params: UseAdventureGameCallbacksParams) {
  const {
    gameStars, gameScore, wordsFoundList, comboCount,
    isBossLevel, worldNumber, levelNumber,
    bossHealthPhase, playerHealthCurrentHP, playerHealthMaxHP,
    resetBossHealth, resetPlayerHealth,
    showVictoryCinematic, showWorldUnlockCinematic,
    handleCinematicCompleteBase, showWorldUnlock, resetCinematics,
    earnedGold, resetRewards,
    recordLevelPerfect, recordBossDefeatedNoHint, recordScoreChallenge,
    recordBossHighHealth, recordFullComboLevel,
    handleEarnAchievement, upgradeRetryScoreRetention,
    onLevelComplete, totalStars, clearSelection, resetGame, startGame,
    storyBeat, showLootOrComplete,
    setShowLevelComplete, setRetriesUsed, setShowStoryBeat,
    t, hintsUsed,
  } = params;

  const handleCinematicComplete = useCallback(() => {
    if (
      showVictoryCinematic && isBossLevel && gameStars > 0
      && worldNumber < 10 && !showWorldUnlockCinematic
    ) {
      const nextWorld = worldNumber + 1;
      const currentWorldConfig = getWorldConfig(worldNumber);
      const nextWorldConfig = getWorldConfig(nextWorld);
      handleCinematicCompleteBase();
      showWorldUnlock({
        previousWorldNumber: worldNumber,
        previousWorldName: t(`adventure.worlds.${currentWorldConfig.name}`),
        newWorldNumber: nextWorld,
        newWorldName: t(`adventure.worlds.${nextWorldConfig.name}`),
        previousColor: currentWorldConfig.colorPrimary,
        newColor: nextWorldConfig.colorPrimary,
        newSecondaryColor: nextWorldConfig.colorSecondary,
      });
      return;
    }

    handleCinematicCompleteBase();
    if (storyBeat && gameStars > 0) {
      setShowStoryBeat(true);
    } else {
      showLootOrComplete();
    }
  }, [showVictoryCinematic, isBossLevel, gameStars, worldNumber, showWorldUnlockCinematic,
    handleCinematicCompleteBase, showWorldUnlock, t, storyBeat, showLootOrComplete, setShowStoryBeat]);

  const handleContinue = useCallback(() => {
    if (gameStars >= 3) recordLevelPerfect();
    if (isBossLevel && bossHealthPhase === 'victory' && hintsUsed === 0) {
      recordBossDefeatedNoHint();
    }
    if (gameScore > 0) {
      recordScoreChallenge(gameScore);
    }
    if (isBossLevel && bossHealthPhase === 'victory' && playerHealthCurrentHP > playerHealthMaxHP * 0.75) {
      recordBossHighHealth();
    }
    if (gameStars > 0 && comboCount >= wordsFoundList.length && wordsFoundList.length > 0) {
      recordFullComboLevel();
    }
    const newTotalStars = (totalStars ?? 0) + gameStars;
    if (newTotalStars >= 50) handleEarnAchievement('STAR_COLLECTOR_50');
    if (newTotalStars >= 100) handleEarnAchievement('STAR_COLLECTOR_100');
    if (isBossLevel && gameStars > 0) {
      handleEarnAchievement('WORLD_COMPLETE');
    }
    if (isBossLevel && worldNumber === 10 && gameStars > 0) {
      handleEarnAchievement('ALL_BOSSES');
    }
    setShowLevelComplete(false);
    const longWords = wordsFoundList.filter(w => w.length >= 6).length;
    onLevelComplete(gameStars, gameScore, wordsFoundList.length, earnedGold, longWords);
  }, [gameStars, gameScore, wordsFoundList, comboCount, earnedGold, onLevelComplete,
    recordLevelPerfect, recordBossDefeatedNoHint, recordScoreChallenge, recordBossHighHealth,
    recordFullComboLevel, isBossLevel, bossHealthPhase, playerHealthCurrentHP, playerHealthMaxHP,
    totalStars, handleEarnAchievement, worldNumber, setShowLevelComplete, hintsUsed]);

  const handleRetry = useCallback(() => {
    setShowLevelComplete(false);
    setRetriesUsed(prev => prev + 1);
    resetRewards();
    clearSelection();
    const retainedScore = upgradeRetryScoreRetention > 0
      ? Math.floor(gameScore * upgradeRetryScoreRetention)
      : 0;
    resetGame({ retainedScore });
    resetBossHealth(); resetPlayerHealth();
    resetCinematics();
    // Boss levels: don't start game yet — boss intro dismissal triggers
    // handleBossIntroStart which calls bossStartBattle() + startGame().
    // Non-boss levels: start immediately.
    if (!isBossLevel) {
      startGame();
    }
  }, [resetGame, startGame, clearSelection, resetBossHealth, resetPlayerHealth, resetCinematics,
    resetRewards, upgradeRetryScoreRetention, gameScore, setShowLevelComplete, setRetriesUsed, isBossLevel]);

  return { handleCinematicComplete, handleContinue, handleRetry };
}
