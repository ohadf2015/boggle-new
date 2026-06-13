/**
 * Sound effect file path definitions and priority mappings.
 * Extracted from SoundEffectsContext to keep files under 500 lines.
 */
import { AUDIO_LOAD_PRIORITY } from './audioLoader';

/** Full context type — exported so SoundEffectsContext stays under 500 lines */
export interface SoundEffectsContextType {
  sfxVolume: number;
  sfxMuted: boolean;
  isGameActive: boolean;
  setSfxVolume: (volume: number) => void;
  toggleSfxMute: () => void;
  setGameActive: (active: boolean) => void;
  playSound: (soundKey: keyof typeof SOUND_EFFECTS, options?: SoundEffectOptions) => void;
  playComboSound: (comboLevel: number) => void;
  playCountdownBeep: (secondsRemaining: number) => void;
  playWordLengthSound: (length: number) => void;
  startFireCrackleLoop: () => void;
  stopFireCrackleLoop: () => void;
  // Individual play functions (from useSoundPlayFunctions hook)
  playAchievementSound: () => void;
  playWordAcceptedSound: () => void;
  playWordRejectedSound: () => void;
  playMessageSound: () => void;
  playErrorSound: () => void;
  playComboMilestoneSound: (milestoneLevel: number) => void;
  playComboBreakSound: (lostLevel: number) => void;
  playComboSavedSound: () => void;
  playEarthquakeRumble: () => void;
  playEarthquakeShake: () => void;
  playFireRoundStart: () => void;
  playVictorySound: () => void;
  playDefeatSound: () => void;
  playLevelUpSound: () => void;
  playLevelUpModalSound: () => void;
  playPowerUpSound: () => void;
  playBossHitSound: () => void;
  playBossPhaseChangeSound: () => void;
  playBossEntranceSound: () => void;
  playBossDefeatSound: () => void;
  playBlastBombSound: () => void;
  playBlastLightningSound: () => void;
  playBlastPrismSound: () => void;
  playBlastHighlightStingerSound: () => void;
  playMatchFoundSound: () => void;
  playStreakMilestoneSound: () => void;
  playTierPromotionSound: () => void;
  playTileSelectSound: () => void;
  playRoundStartSound: () => void;
  playTimesUpSound: () => void;
  playCoinCollectSound: (opts?: { rate?: number; volume?: number }) => void;
  playButtonClickSound: () => void;
  playChestOpenSound: () => void;
  playQuestCompleteSound: () => void;
  playBoardShuffleSound: () => void;
  playUpgradePurchaseSound: () => void;
  playHintRevealSound: () => void;
  playDailyRewardSound: () => void;
  playTimerUrgentSound: () => void;
  playStreakFireSound: () => void;
  playScreenTransitionSound: () => void;
  playLongWordBonusSound: () => void;
  playBoardClearSound: () => void;
  playCoinCascadeSound: (opts?: { rate?: number; volume?: number }) => void;
  playCrownVictorySound: () => void;
  playGiftReceivedSound: () => void;
  playLeadChangeSound: () => void;
  playMatchStartSound: () => void;
  playMenuOpenSound: () => void;
  playMenuCloseSound: () => void;
  playOpponentScoredSound: () => void;
  playPathConnectSound: () => void;
  playPerfectWordSound: () => void;
  playPlayerJoinedSound: () => void;
  playPlayerLeftSound: () => void;
  playRareWordSound: () => void;
  playSwipeTransitionSound: () => void;
  playTileAppearSound: () => void;
  playTimeBonusSound: () => void;
  playTimerHeartbeatSound: () => void;
  playXpGainSound: () => void;
  // Legendary epic moment sounds
  playMegaCascadeSound: () => void;
  playUltraComboSound: () => void;
  playBossDefeatLegendarySound: () => void;
  playLegendaryWordSound: () => void;
  playEpicVictorySound: () => void;
  playStreakLegendarySound: () => void;
  // New game mode sounds
  playDrillStartSound: () => void;
  playDrillCompleteSound: () => void;
  playWheelSpinSound: () => void;
  playFlashChallengeSound: () => void;
  playWordRevealSound: () => void;
}

export interface SoundEffectOptions {
  volume?: number;
  rate?: number;
  /** If false, sound plays even when game is not active (e.g., for achievements, chat) */
  requiresGameActive?: boolean;
}

// Sound effect definitions — maps keys to file paths
export const SOUND_EFFECTS = {
  achievement: '/sounds/achievement.mp3',
  combo: '/sounds/combo.mp3',
  wordAccepted: '/sounds/word-accepted.mp3',
  countdownBeep: '/sounds/countdown-beep.mp3',
  message: '/sounds/message.mp3',
  comboMilestone: '/sounds/combo-milestone.mp3',
  comboBreak: '/sounds/combo-break.mp3',
  comboSaved: '/sounds/combo-saved.mp3',
  earthquakeRumble: '/sounds/earthquake-rumble.mp3',
  earthquakeShake: '/sounds/earthquake-shake.mp3',
  fireRoundStart: '/sounds/fire-round-start.mp3',
  fireCrackleLoop: '/sounds/fire-crackle-loop.mp3',
  wordRejected: '/sounds/word-rejected.mp3',
  victoryFanfare: '/sounds/victory-fanfare.mp3',
  defeatSting: '/sounds/defeat-sting.mp3',
  levelUp: '/sounds/level-up.mp3',
  levelUpModal: '/sounds/level-up-modal.mp3',
  powerUp: '/sounds/power-up.mp3',
  bossHit: '/sounds/boss-hit.mp3',
  bossPhaseChange: '/sounds/boss-phase-change.mp3',
  bossEntrance: '/sounds/boss-entrance.mp3',
  bossDefeat: '/sounds/boss-defeat.mp3',
  blastBomb: '/sounds/blast-bomb.mp3',
  blastLightning: '/sounds/blast-lightning.mp3',
  blastPrism: '/sounds/blast-prism.mp3',
  blastHighlightStinger: '/sounds/blast-highlight-stinger.webm',
  matchFound: '/sounds/match-found.mp3',
  streakMilestone: '/sounds/streak-milestone.mp3',
  tierPromotion: '/sounds/tier-promotion.mp3',
  tileSelect: '/sounds/tile-select.mp3',
  coinCollect: '/sounds/coin-collect.mp3',
  buttonClick: '/sounds/button-click.mp3',
  chestOpen: '/sounds/chest-open.mp3',
  questComplete: '/sounds/quest-complete.mp3',
  boardShuffle: '/sounds/board-shuffle.mp3',
  upgradePurchase: '/sounds/upgrade-purchase.mp3',
  hintReveal: '/sounds/hint-reveal.mp3',
  dailyReward: '/sounds/daily-reward.mp3',
  timerUrgent: '/sounds/timer-urgent.mp3',
  streakFire: '/sounds/streak-fire.mp3',
  screenTransition: '/sounds/screen-transition.mp3',
  longWordBonus: '/sounds/long-word-bonus.mp3',
  roundStart: '/sounds/round-start.mp3',
  boardClear: '/sounds/board-clear.mp3',
  coinCascade: '/sounds/coin-cascade.mp3',
  crownVictory: '/sounds/crown-victory.mp3',
  giftReceived: '/sounds/gift-received.mp3',
  leadChange: '/sounds/lead-change.mp3',
  matchStart: '/sounds/match-start.mp3',
  menuOpen: '/sounds/menu-open.mp3',
  menuClose: '/sounds/menu-close.mp3',
  opponentScored: '/sounds/opponent-scored.mp3',
  pathConnect: '/sounds/path-connect.mp3',
  perfectWord: '/sounds/perfect-word.mp3',
  playerJoined: '/sounds/player-joined.mp3',
  playerLeft: '/sounds/player-left.mp3',
  rareWord: '/sounds/rare-word.mp3',
  swipeTransition: '/sounds/swipe-transition.mp3',
  tileAppear: '/sounds/tile-appear.mp3',
  timeBonus: '/sounds/time-bonus.mp3',
  timerHeartbeat: '/sounds/timer-heartbeat.mp3',
  xpGain: '/sounds/xp-gain.mp3',
  // Legendary epic moment sounds
  megaCascade: '/sounds/mega-cascade.mp3',
  ultraCombo: '/sounds/ultra-combo.mp3',
  bossDefeatLegendary: '/sounds/boss-defeat-legendary.mp3',
  legendaryWord: '/sounds/legendary-word.mp3',
  epicVictory: '/sounds/epic-victory.mp3',
  streakLegendary: '/sounds/streak-legendary.mp3',
  // New game mode sounds
  drillStart: '/sounds/drill-start.mp3',
  drillComplete: '/sounds/drill-complete.mp3',
  wheelSpin: '/sounds/wheel-spin.mp3',
  flashChallenge: '/sounds/flash-challenge.mp3',
  wordReveal: '/sounds/word-reveal.mp3',
  // Mascot voice reactions (kawaii character lines)
  mascotCheer: '/sounds/mascot-cheer.mp3',
  mascotGiggle: '/sounds/mascot-giggle.mp3',
  mascotGasp: '/sounds/mascot-gasp.mp3',
  mascotWhoa: '/sounds/mascot-whoa.mp3',
  mascotAww: '/sounds/mascot-aww.mp3',
  mascotDrumroll: '/sounds/mascot-drumroll.mp3',
  // Party signature sounds
  confettiRain: '/sounds/confetti-rain.mp3',
  balloonPop: '/sounds/balloon-pop.mp3',
  partyTada: '/sounds/party-tada.mp3',
  crownSparkle: '/sounds/crown-sparkle.mp3',
  bubbleBurst: '/sounds/bubble-burst.mp3',
  comebackSurge: '/sounds/comeback-surge.mp3',
  vaultUnlock: '/sounds/vault-unlock.mp3',
  xpSparkle: '/sounds/xp-sparkle.mp3',
  streakBuild: '/sounds/streak-build.mp3',
  perfectBoard: '/sounds/perfect-board.mp3',
  rivalTaunt: '/sounds/rival-taunt.mp3',
  brainPower: '/sounds/brain-power.mp3',
} as const;

export type SoundEffectKey = keyof typeof SOUND_EFFECTS;

// Sound effect priority levels for progressive loading
export const SOUND_PRIORITIES: Record<SoundEffectKey, AUDIO_LOAD_PRIORITY> = {
  wordAccepted: AUDIO_LOAD_PRIORITY.CRITICAL,
  comboBreak: AUDIO_LOAD_PRIORITY.CRITICAL,
  tileSelect: AUDIO_LOAD_PRIORITY.CRITICAL,
  combo: AUDIO_LOAD_PRIORITY.HIGH,
  countdownBeep: AUDIO_LOAD_PRIORITY.HIGH,
  comboMilestone: AUDIO_LOAD_PRIORITY.HIGH,
  wordRejected: AUDIO_LOAD_PRIORITY.HIGH,
  buttonClick: AUDIO_LOAD_PRIORITY.HIGH,
  message: AUDIO_LOAD_PRIORITY.NORMAL,
  comboSaved: AUDIO_LOAD_PRIORITY.NORMAL,
  // Bumped NORMAL → HIGH so the progressive idle-time preloader warms these
  // during gameplay. Without it, the first results-page playback triggers
  // decodeAudioData on the main thread (50–150ms stall on phones), which is
  // the dominant source of mount-time jank.
  victoryFanfare: AUDIO_LOAD_PRIORITY.HIGH,
  defeatSting: AUDIO_LOAD_PRIORITY.HIGH,
  levelUp: AUDIO_LOAD_PRIORITY.NORMAL,
  powerUp: AUDIO_LOAD_PRIORITY.NORMAL,
  bossHit: AUDIO_LOAD_PRIORITY.NORMAL,
  blastBomb: AUDIO_LOAD_PRIORITY.NORMAL,
  blastLightning: AUDIO_LOAD_PRIORITY.NORMAL,
  blastPrism: AUDIO_LOAD_PRIORITY.NORMAL,
  blastHighlightStinger: AUDIO_LOAD_PRIORITY.NORMAL,
  matchFound: AUDIO_LOAD_PRIORITY.NORMAL,
  coinCollect: AUDIO_LOAD_PRIORITY.NORMAL,
  boardShuffle: AUDIO_LOAD_PRIORITY.NORMAL,
  hintReveal: AUDIO_LOAD_PRIORITY.NORMAL,
  timerUrgent: AUDIO_LOAD_PRIORITY.NORMAL,
  screenTransition: AUDIO_LOAD_PRIORITY.NORMAL,
  longWordBonus: AUDIO_LOAD_PRIORITY.NORMAL,
  roundStart: AUDIO_LOAD_PRIORITY.NORMAL,
  boardClear: AUDIO_LOAD_PRIORITY.NORMAL,
  leadChange: AUDIO_LOAD_PRIORITY.NORMAL,
  matchStart: AUDIO_LOAD_PRIORITY.NORMAL,
  opponentScored: AUDIO_LOAD_PRIORITY.NORMAL,
  pathConnect: AUDIO_LOAD_PRIORITY.NORMAL,
  perfectWord: AUDIO_LOAD_PRIORITY.NORMAL,
  rareWord: AUDIO_LOAD_PRIORITY.NORMAL,
  tileAppear: AUDIO_LOAD_PRIORITY.NORMAL,
  timeBonus: AUDIO_LOAD_PRIORITY.NORMAL,
  timerHeartbeat: AUDIO_LOAD_PRIORITY.NORMAL,
  xpGain: AUDIO_LOAD_PRIORITY.NORMAL,
  achievement: AUDIO_LOAD_PRIORITY.LOW,
  earthquakeRumble: AUDIO_LOAD_PRIORITY.LOW,
  earthquakeShake: AUDIO_LOAD_PRIORITY.LOW,
  fireRoundStart: AUDIO_LOAD_PRIORITY.LOW,
  fireCrackleLoop: AUDIO_LOAD_PRIORITY.LOW,
  levelUpModal: AUDIO_LOAD_PRIORITY.LOW,
  bossPhaseChange: AUDIO_LOAD_PRIORITY.LOW,
  bossEntrance: AUDIO_LOAD_PRIORITY.LOW,
  bossDefeat: AUDIO_LOAD_PRIORITY.LOW,
  streakMilestone: AUDIO_LOAD_PRIORITY.LOW,
  tierPromotion: AUDIO_LOAD_PRIORITY.LOW,
  chestOpen: AUDIO_LOAD_PRIORITY.LOW,
  questComplete: AUDIO_LOAD_PRIORITY.LOW,
  upgradePurchase: AUDIO_LOAD_PRIORITY.LOW,
  dailyReward: AUDIO_LOAD_PRIORITY.LOW,
  streakFire: AUDIO_LOAD_PRIORITY.LOW,
  coinCascade: AUDIO_LOAD_PRIORITY.LOW,
  crownVictory: AUDIO_LOAD_PRIORITY.LOW,
  giftReceived: AUDIO_LOAD_PRIORITY.LOW,
  menuOpen: AUDIO_LOAD_PRIORITY.LOW,
  menuClose: AUDIO_LOAD_PRIORITY.LOW,
  playerJoined: AUDIO_LOAD_PRIORITY.LOW,
  playerLeft: AUDIO_LOAD_PRIORITY.LOW,
  swipeTransition: AUDIO_LOAD_PRIORITY.LOW,
  // Legendary sounds — rare, load lazily
  megaCascade: AUDIO_LOAD_PRIORITY.LOW,
  ultraCombo: AUDIO_LOAD_PRIORITY.LOW,
  bossDefeatLegendary: AUDIO_LOAD_PRIORITY.LOW,
  legendaryWord: AUDIO_LOAD_PRIORITY.LOW,
  epicVictory: AUDIO_LOAD_PRIORITY.LOW,
  streakLegendary: AUDIO_LOAD_PRIORITY.LOW,
  // New game mode sounds
  drillStart: AUDIO_LOAD_PRIORITY.NORMAL,
  drillComplete: AUDIO_LOAD_PRIORITY.NORMAL,
  wheelSpin: AUDIO_LOAD_PRIORITY.LOW,
  flashChallenge: AUDIO_LOAD_PRIORITY.NORMAL,
  wordReveal: AUDIO_LOAD_PRIORITY.LOW,
  // Mascot voice — lazy-load so first cheer fetches on demand
  mascotCheer: AUDIO_LOAD_PRIORITY.LOW,
  mascotGiggle: AUDIO_LOAD_PRIORITY.LOW,
  mascotGasp: AUDIO_LOAD_PRIORITY.LOW,
  mascotWhoa: AUDIO_LOAD_PRIORITY.LOW,
  mascotAww: AUDIO_LOAD_PRIORITY.LOW,
  mascotDrumroll: AUDIO_LOAD_PRIORITY.LOW,
  // Party signature — celebratory, infrequent, fine to lazy-load
  confettiRain: AUDIO_LOAD_PRIORITY.LOW,
  balloonPop: AUDIO_LOAD_PRIORITY.LOW,
  partyTada: AUDIO_LOAD_PRIORITY.LOW,
  crownSparkle: AUDIO_LOAD_PRIORITY.LOW,
  bubbleBurst: AUDIO_LOAD_PRIORITY.LOW,
  comebackSurge: AUDIO_LOAD_PRIORITY.LOW,
  vaultUnlock: AUDIO_LOAD_PRIORITY.LOW,
  xpSparkle: AUDIO_LOAD_PRIORITY.LOW,
  streakBuild: AUDIO_LOAD_PRIORITY.LOW,
  perfectBoard: AUDIO_LOAD_PRIORITY.LOW,
  rivalTaunt: AUDIO_LOAD_PRIORITY.LOW,
  brainPower: AUDIO_LOAD_PRIORITY.LOW,
};
