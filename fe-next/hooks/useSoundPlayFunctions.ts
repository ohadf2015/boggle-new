/**
 * Individual sound play functions derived from the base playSound function.
 * Extracted from SoundEffectsContext to keep files under 500 lines.
 */
import { useCallback } from 'react';
import { SOUND_EFFECTS, type SoundEffectOptions } from '@/lib/audio/soundEffectsConfig';
import { haptics } from '@/utils/haptics/HapticsManager';
import {
  vibrateBlastBomb,
  vibrateBlastLightning,
  vibrateBlastPrism,
} from '@/components/grid/hapticFeedback';

type PlaySoundFn = (soundKey: keyof typeof SOUND_EFFECTS, options?: SoundEffectOptions) => void;

interface SoundGuards {
  audioUnlocked: boolean;
  sfxMuted: boolean;
  isTabVisibleRef: React.RefObject<boolean>;
  isGameActiveRef: React.RefObject<boolean>;
}

/**
 * Creates all named sound play functions from a base playSound function.
 * Each function wraps playSound with appropriate volume, haptics, and game-active settings.
 */
export function useSoundPlayFunctions(playSound: PlaySoundFn, guards: SoundGuards) {
  const { audioUnlocked, sfxMuted } = guards;

  // Word sounds
  const playWordAcceptedSound = useCallback(() => {
    playSound('wordAccepted', { volume: 0.4 });
  }, [playSound]);

  const playWordRejectedSound = useCallback(() => {
    playSound('wordRejected', { volume: 0.5 });
    haptics.error();
  }, [playSound]);

  // Achievement (plays on results screen too)
  const playAchievementSound = useCallback(() => {
    playSound('achievement', { volume: 0.8, requiresGameActive: false });
    haptics.success();
  }, [playSound]);

  // Chat message
  const playMessageSound = useCallback(() => {
    playSound('message', { volume: 0.5, requiresGameActive: false });
  }, [playSound]);

  // Error
  const playErrorSound = useCallback(() => {
    playSound('comboBreak', { volume: 0.4 });
  }, [playSound]);

  // Combo feedback
  const playComboMilestoneSound = useCallback((milestoneLevel: number) => {
    if (!audioUnlocked || sfxMuted || !guards.isTabVisibleRef.current || !guards.isGameActiveRef.current) return;
    const pitchMap: Record<number, number> = { 5: 1.0, 10: 1.1, 15: 1.2 };
    const volumeMap: Record<number, number> = { 5: 0.7, 10: 0.8, 15: 0.9 };
    playSound('comboMilestone', { rate: pitchMap[milestoneLevel] || 1.0, volume: volumeMap[milestoneLevel] || 0.7 });
    haptics.success();
  }, [audioUnlocked, sfxMuted, playSound, guards.isTabVisibleRef, guards.isGameActiveRef]);

  const playComboBreakSound = useCallback((lostLevel: number) => {
    if (!audioUnlocked || sfxMuted || !guards.isTabVisibleRef.current || !guards.isGameActiveRef.current) return;
    const volume = Math.min(0.3 + (lostLevel * 0.04), 0.6);
    playSound('comboBreak', { volume });
    haptics.error();
  }, [audioUnlocked, sfxMuted, playSound, guards.isTabVisibleRef, guards.isGameActiveRef]);

  const playComboSavedSound = useCallback(() => {
    if (!audioUnlocked || sfxMuted || !guards.isTabVisibleRef.current || !guards.isGameActiveRef.current) return;
    playSound('comboSaved', { volume: 0.5 });
    haptics.success();
  }, [audioUnlocked, sfxMuted, playSound, guards.isTabVisibleRef, guards.isGameActiveRef]);

  // Earthquake/Fire
  const playEarthquakeRumble = useCallback(() => { playSound('earthquakeRumble', { volume: 0.7 }); }, [playSound]);
  const playEarthquakeShake = useCallback(() => { playSound('earthquakeShake', { volume: 0.8 }); }, [playSound]);
  const playFireRoundStart = useCallback(() => { playSound('fireRoundStart', { volume: 0.8 }); }, [playSound]);

  // Victory/Defeat
  const playVictorySound = useCallback(() => {
    playSound('victoryFanfare', { volume: 0.8, requiresGameActive: false });
    haptics.success();
  }, [playSound]);

  const playDefeatSound = useCallback(() => {
    playSound('defeatSting', { volume: 0.7, requiresGameActive: false });
  }, [playSound]);

  // Level up
  const playLevelUpSound = useCallback(() => {
    playSound('levelUp', { volume: 0.8 });
    haptics.success();
  }, [playSound]);

  const playLevelUpModalSound = useCallback(() => {
    playSound('levelUpModal', { volume: 0.8, requiresGameActive: false });
    haptics.success();
  }, [playSound]);

  // Power-up
  const playPowerUpSound = useCallback(() => {
    playSound('powerUp', { volume: 0.7 });
    haptics.tap();
  }, [playSound]);

  // Boss sounds
  const playBossHitSound = useCallback(() => { playSound('bossHit', { volume: 0.6 }); haptics.tap(); }, [playSound]);
  const playBossPhaseChangeSound = useCallback(() => { playSound('bossPhaseChange', { volume: 0.8 }); haptics.error(); }, [playSound]);
  const playBossEntranceSound = useCallback(() => { playSound('bossEntrance', { volume: 0.8, requiresGameActive: false }); }, [playSound]);
  const playBossDefeatSound = useCallback(() => { playSound('bossDefeat', { volume: 0.8 }); haptics.success(); }, [playSound]);

  // Blast tile sounds — use distinct rich patterns from hapticFeedback (not generic tap)
  const playBlastBombSound = useCallback(() => { playSound('blastBomb', { volume: 0.7 }); vibrateBlastBomb(); }, [playSound]);
  const playBlastLightningSound = useCallback(() => { playSound('blastLightning', { volume: 0.7 }); vibrateBlastLightning(); }, [playSound]);
  const playBlastPrismSound = useCallback(() => { playSound('blastPrism', { volume: 0.7 }); vibrateBlastPrism(); }, [playSound]);
  const playBlastHighlightStingerSound = useCallback(() => { playSound('blastHighlightStinger', { volume: 0.8, requiresGameActive: false }); }, [playSound]);

  // Matchmaking & multiplayer
  const playMatchFoundSound = useCallback(() => { playSound('matchFound', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playStreakMilestoneSound = useCallback(() => { playSound('streakMilestone', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playTierPromotionSound = useCallback(() => { playSound('tierPromotion', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playTileSelectSound = useCallback(() => { playSound('tileSelect', { volume: 0.3 }); }, [playSound]);
  const playRoundStartSound = useCallback(() => { playSound('roundStart', { volume: 0.8, requiresGameActive: false }); }, [playSound]);
  const playTimesUpSound = useCallback(() => { playSound('timerUrgent', { volume: 0.8 }); }, [playSound]);

  // ElevenLabs-generated sounds.
  // Coin collect accepts per-play pitch (rate) + volume so the reward arpeggio
  // can climb in pitch for that casino "ding-ding-ding" feel. Always
  // requiresGameActive:false — coins are earned on menus/results too.
  const playCoinCollectSound = useCallback((opts?: { rate?: number; volume?: number }) => {
    playSound('coinCollect', { volume: opts?.volume ?? 0.5, rate: opts?.rate, requiresGameActive: false });
  }, [playSound]);
  const playButtonClickSound = useCallback(() => { playSound('buttonClick', { volume: 0.3, requiresGameActive: false }); }, [playSound]);
  const playChestOpenSound = useCallback(() => { playSound('chestOpen', { volume: 0.7, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playQuestCompleteSound = useCallback(() => { playSound('questComplete', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playBoardShuffleSound = useCallback(() => { playSound('boardShuffle', { volume: 0.5 }); }, [playSound]);
  const playUpgradePurchaseSound = useCallback(() => { playSound('upgradePurchase', { volume: 0.7, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playHintRevealSound = useCallback(() => { playSound('hintReveal', { volume: 0.5 }); }, [playSound]);
  const playDailyRewardSound = useCallback(() => { playSound('dailyReward', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  // Softened from 0.6 → 0.35: the final-seconds cue should nudge, not alarm.
  // Only the brain-training Lightning Round uses this; play-by-play "time's up"
  // has its own louder cue (playTimesUpSound).
  const playTimerUrgentSound = useCallback(() => { playSound('timerUrgent', { volume: 0.35 }); }, [playSound]);
  const playStreakFireSound = useCallback(() => { playSound('streakFire', { volume: 0.7, requiresGameActive: false }); haptics.tap(); }, [playSound]);
  const playScreenTransitionSound = useCallback(() => { playSound('screenTransition', { volume: 0.3, requiresGameActive: false }); }, [playSound]);
  const playLongWordBonusSound = useCallback(() => { playSound('longWordBonus', { volume: 0.6 }); haptics.tap(); }, [playSound]);

  // Multiplayer & misc event sounds
  const playBoardClearSound = useCallback(() => { playSound('boardClear', { volume: 0.7 }); }, [playSound]);
  const playCoinCascadeSound = useCallback((opts?: { rate?: number; volume?: number }) => {
    playSound('coinCascade', { volume: opts?.volume ?? 0.6, rate: opts?.rate, requiresGameActive: false });
  }, [playSound]);
  const playCrownVictorySound = useCallback(() => { playSound('crownVictory', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playGiftReceivedSound = useCallback(() => { playSound('giftReceived', { volume: 0.7, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playLeadChangeSound = useCallback(() => { playSound('leadChange', { volume: 0.6 }); }, [playSound]);
  const playMatchStartSound = useCallback(() => { playSound('matchStart', { volume: 0.8, requiresGameActive: false }); }, [playSound]);
  const playMenuOpenSound = useCallback(() => { playSound('menuOpen', { volume: 0.3, requiresGameActive: false }); }, [playSound]);
  const playMenuCloseSound = useCallback(() => { playSound('menuClose', { volume: 0.3, requiresGameActive: false }); }, [playSound]);
  const playOpponentScoredSound = useCallback(() => { playSound('opponentScored', { volume: 0.5 }); }, [playSound]);
  const playPathConnectSound = useCallback(() => { playSound('pathConnect', { volume: 0.3 }); }, [playSound]);
  const playPerfectWordSound = useCallback(() => { playSound('perfectWord', { volume: 0.7 }); haptics.success(); }, [playSound]);
  const playPlayerJoinedSound = useCallback(() => { playSound('playerJoined', { volume: 0.5, requiresGameActive: false }); }, [playSound]);
  const playPlayerLeftSound = useCallback(() => { playSound('playerLeft', { volume: 0.4, requiresGameActive: false }); }, [playSound]);
  const playRareWordSound = useCallback(() => { playSound('rareWord', { volume: 0.7 }); haptics.tap(); }, [playSound]);
  const playSwipeTransitionSound = useCallback(() => { playSound('swipeTransition', { volume: 0.2, requiresGameActive: false }); }, [playSound]);
  const playTileAppearSound = useCallback(() => { playSound('tileAppear', { volume: 0.3 }); }, [playSound]);
  const playTimeBonusSound = useCallback(() => { playSound('timeBonus', { volume: 0.6 }); haptics.tap(); }, [playSound]);
  const playTimerHeartbeatSound = useCallback(() => { playSound('timerHeartbeat', { volume: 0.5 }); }, [playSound]);
  const playXpGainSound = useCallback(() => { playSound('xpGain', { volume: 0.5, requiresGameActive: false }); }, [playSound]);

  // Legendary epic moment sounds — escalated pattern vs plain success
  const playMegaCascadeSound = useCallback(() => { playSound('megaCascade', { volume: 0.9 }); haptics.legendary(); }, [playSound]);
  const playUltraComboSound = useCallback(() => { playSound('ultraCombo', { volume: 0.9 }); haptics.legendary(); }, [playSound]);
  const playBossDefeatLegendarySound = useCallback(() => { playSound('bossDefeatLegendary', { volume: 0.9, requiresGameActive: false }); haptics.legendary(); }, [playSound]);
  const playLegendaryWordSound = useCallback(() => { playSound('legendaryWord', { volume: 0.8 }); haptics.legendary(); }, [playSound]);
  const playEpicVictorySound = useCallback(() => { playSound('epicVictory', { volume: 0.9, requiresGameActive: false }); haptics.legendary(); }, [playSound]);
  const playStreakLegendarySound = useCallback(() => { playSound('streakLegendary', { volume: 0.8, requiresGameActive: false }); haptics.legendary(); }, [playSound]);

  // New game mode sounds. Drill start/complete are lifecycle bookends that fire
  // OUTSIDE the active window (start: ready->playing transition; complete: after
  // game-active is cleared), so they must bypass the game-active guard or they
  // stay silent — same opt-out the other lifecycle sounds use.
  const playDrillStartSound = useCallback(() => { playSound('drillStart', { volume: 0.7, requiresGameActive: false }); }, [playSound]);
  const playDrillCompleteSound = useCallback(() => { playSound('drillComplete', { volume: 0.8, requiresGameActive: false }); haptics.success(); }, [playSound]);
  const playWheelSpinSound = useCallback(() => { playSound('wheelSpin', { volume: 0.6, requiresGameActive: false }); }, [playSound]);
  const playFlashChallengeSound = useCallback(() => { playSound('flashChallenge', { volume: 0.7 }); haptics.tap(); }, [playSound]);
  const playWordRevealSound = useCallback(() => { playSound('wordReveal', { volume: 0.6, requiresGameActive: false }); }, [playSound]);

  return {
    playWordAcceptedSound,
    playWordRejectedSound,
    playAchievementSound,
    playMessageSound,
    playErrorSound,
    playComboMilestoneSound,
    playComboBreakSound,
    playComboSavedSound,
    playEarthquakeRumble,
    playEarthquakeShake,
    playFireRoundStart,
    playVictorySound,
    playDefeatSound,
    playLevelUpSound,
    playLevelUpModalSound,
    playPowerUpSound,
    playBossHitSound,
    playBossPhaseChangeSound,
    playBossEntranceSound,
    playBossDefeatSound,
    playBlastBombSound,
    playBlastLightningSound,
    playBlastPrismSound,
    playBlastHighlightStingerSound,
    playMatchFoundSound,
    playStreakMilestoneSound,
    playTierPromotionSound,
    playTileSelectSound,
    playRoundStartSound,
    playTimesUpSound,
    playCoinCollectSound,
    playButtonClickSound,
    playChestOpenSound,
    playQuestCompleteSound,
    playBoardShuffleSound,
    playUpgradePurchaseSound,
    playHintRevealSound,
    playDailyRewardSound,
    playTimerUrgentSound,
    playStreakFireSound,
    playScreenTransitionSound,
    playLongWordBonusSound,
    playBoardClearSound,
    playCoinCascadeSound,
    playCrownVictorySound,
    playGiftReceivedSound,
    playLeadChangeSound,
    playMatchStartSound,
    playMenuOpenSound,
    playMenuCloseSound,
    playOpponentScoredSound,
    playPathConnectSound,
    playPerfectWordSound,
    playPlayerJoinedSound,
    playPlayerLeftSound,
    playRareWordSound,
    playSwipeTransitionSound,
    playTileAppearSound,
    playTimeBonusSound,
    playTimerHeartbeatSound,
    playXpGainSound,
    playMegaCascadeSound,
    playUltraComboSound,
    playBossDefeatLegendarySound,
    playLegendaryWordSound,
    playEpicVictorySound,
    playStreakLegendarySound,
    playDrillStartSound,
    playDrillCompleteSound,
    playWheelSpinSound,
    playFlashChallengeSound,
    playWordRevealSound,
  };
}
