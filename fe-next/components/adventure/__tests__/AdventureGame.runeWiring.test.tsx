// @vitest-environment jsdom
/**
 * AdventureGame rune wiring tests (Gap A + Gap B)
 *
 * Gap A: runeEffects.hintBonus + forgeEffects.hintBonus must be added to maxHintsPerLevel
 * Gap B: forgeEffects.timeBonus must be applied to levelConfig.timerSeconds passed to useAdventureGame
 */

import React from 'react';
import { render } from '@testing-library/react';
import AdventureGame from '../AdventureGame';
import type { LevelConfig } from '@/types/adventure';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// vi.hoisted ensures spies exist before vi.mock factories run
const { useAdventureHintsSpy, useAdventureGameSpy, useAdventureForgePickerSpy } = vi.hoisted(() => ({
  useAdventureHintsSpy: vi.fn(),
  useAdventureGameSpy: vi.fn(),
  useAdventureForgePickerSpy: vi.fn(),
}));

vi.mock('@/hooks/useAdventureHints', () => ({ useAdventureHints: useAdventureHintsSpy }));
vi.mock('@/hooks/useAdventureGame', () => ({ useAdventureGame: useAdventureGameSpy }));
vi.mock('../hooks/useAdventureForgePicker', () => ({ useAdventureForgePicker: useAdventureForgePickerSpy }));

// ── All other required mocks (copied from AdventureGame.test.tsx) ──

vi.mock('@/components/ads/RewardedAdGoldButton', () => ({
  __esModule: true,
  default: () => null,
  RewardedAdGoldButton: () => null,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), isDarkMode: true }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockTranslations: Record<string, string> = {};
vi.mock('@/contexts/LanguageContext', () => {
  const langValue = { t: (key: string) => mockTranslations[key] || key, language: 'en', dir: 'ltr', setLanguage: vi.fn() };
  return { useLanguage: () => langValue, useLanguageSafe: () => langValue };
});

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    coins: 100, spendCoins: vi.fn(), refreshCoins: vi.fn(),
    awardGameCompletion: vi.fn().mockResolvedValue(null),
    awardWatchedAd: vi.fn().mockResolvedValue(null),
    rewards: { WATCH_AD: 50 },
  }),
}));

vi.mock('@/hooks/useAdventureWordValidation', () => ({
  useAdventureWordValidation: () => ({ validateWord: vi.fn().mockResolvedValue({ isValid: true, score: 30 }), isValidating: false, lastValidationResult: null }),
}));

vi.mock('@/hooks/useAdventureSelection', () => ({
  useAdventureSelection: () => ({
    selectedIndices: [], currentWord: '', isSelecting: false,
    selectTile: vi.fn(), clearSelection: vi.fn(), getPath: vi.fn().mockReturnValue([]),
    pathPoints: [], adjacentIndices: [],
  }),
}));

vi.mock('@/contexts/ProgressionContext', () => ({
  useProgression: () => ({
    recordAttempt: vi.fn(), getLevelAttempt: vi.fn(() => null),
    getLevelCompletion: vi.fn(() => undefined), progression: null, isLoading: false, error: null,
    refreshProgression: vi.fn(), completeLevel: vi.fn(), isWorldUnlocked: vi.fn(() => true),
    isLevelUnlocked: vi.fn(() => true), getWorldStars: vi.fn(() => 0),
    updateWordAlbum: vi.fn(), updateRunes: vi.fn(), attempts: [],
  }),
}));

vi.mock('@/hooks/useAdaptiveDifficulty', () => ({
  useAdaptiveDifficulty: () => ({
    tier: 'normal',
    adjustedConfig: { world: 1, level: 1, gridSize: 4, timerSeconds: 120, objectives: [], specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false },
    hintData: { level: 'none' }, powerUpCooldownMultiplier: 1.0, recordCompletion: vi.fn(),
  }),
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({ stopMusic: vi.fn(), playMusic: vi.fn(), pauseMusic: vi.fn(), resumeMusic: vi.fn(), isPlaying: false, currentTrack: null }),
}));

vi.mock('@/hooks/useAdventureMusic', () => ({
  useAdventureMusic: () => ({ currentTrack: 1, stopMusic: vi.fn(), hasMusic: false }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMockMotion = (element: string) => {
    const C = React.forwardRef(({ children, ...props }: any, ref: any) => React.createElement(element, { ...props, ref }, children));
    C.displayName = `MM${element}`;
    return C;
  };
  const createMV = (v: any) => ({ get: () => v, set: vi.fn(), on: () => () => {}, onChange: () => () => {}, current: v });
  const motionComponents = { div: createMockMotion('div'), button: createMockMotion('button'), ul: createMockMotion('ul'), li: createMockMotion('li'), span: createMockMotion('span') };
  return {
    m: motionComponents, m: motionComponents,
    AnimatePresence: ({ children }: any) => children,
    useSpring: (v: any) => createMV(typeof v === 'object' ? 0 : v),
    useTransform: (mv: any, fn: (v: any) => any) => createMV(fn(mv.get())),
  };
});

vi.mock('@/contexts/AdventureThemeContext', () => {
  const React = require('react');
  const Ctx = React.createContext({ worldId: 1, level: 1, theme: { worldId: 1, background: { baseColor: 'bg-neo-navy', layers: [], texture: { type: 'none', opacity: 0, blendMode: 'normal' }, particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 } }, tiles: {}, ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' }, chapters: [], containerClass: 'adventure-world-1' } });
  return {
    AdventureThemeContext: Ctx,
    useAdventureTheme: () => ({ theme: { worldId: 1, background: { baseColor: 'bg-neo-navy', layers: [], texture: { type: 'none', opacity: 0, blendMode: 'normal' }, particles: { type: 'leaves', count: 0, colors: [], sizeRange: [2, 4], speed: 1 } }, tiles: {}, ui: { accentColor: 'neo-lime', textColor: 'neo-white', headerBg: 'bg-neo-navy/80' }, chapters: [], containerClass: 'adventure-world-1' }, worldId: 1, level: 1, setWorld: vi.fn(), setLevel: vi.fn(), isTransitioning: false, chapter: { id: 1, name: 'Tutorial', levels: [1, 2], starThreshold: 0, accentColor: 'neo-lime' } }),
    AdventureThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useHUDTheme: () => ({ headerBg: 'bg-neo-navy/90', headerBorder: '', sidebarBg: '', scoreAccent: '', levelBadgeColor: '', levelBadgeText: '', objectiveAccent: '', hintActiveColor: '', hintActiveText: '' }),
    useTimerTheme: () => ({ normal: { bg: '', text: '', shadow: '' }, warning: { bg: '', text: '', shadow: '' }, danger: { bg: '', text: '', shadow: '' }, critical: { bg: '', text: '', shadow: '' } }),
    useBossFightTheme: () => ({ dialogueBg: '', dialogueBorder: '', bossNameColor: '', hpSegmentColors: [], telegraphColor: '', telegraphProgressColor: '', playerHealthNormal: '', playerHealthLow: '', phaseColors: { phase1: { bg: '', text: '' }, phase2: { bg: '', text: '' }, enraged: { bg: '', text: '' } }, avatarGlow: '', victoryGlow: '', arenaEffect: 'none' }),
  };
});

vi.mock('@/hooks/useFlashChallenge', () => ({ useFlashChallenge: () => ({ activeChallenge: null, isChallengeComplete: false, dismiss: vi.fn() }) }));
vi.mock('@/hooks/useBossMechanics', () => ({ useBossMechanics: () => ({ checkWord: () => ({ meetsRequirement: false, scoreMultiplier: 1.0 }), triggerTaunt: vi.fn() }) }));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(), playComboSound: vi.fn(), playComboBreakSound: vi.fn(),
    playCountdownBeep: vi.fn(), playComboMilestoneSound: vi.fn(), playComboSavedSound: vi.fn(),
    setGameActive: vi.fn(), playAchievementSound: vi.fn(), playSound: vi.fn(), playWordSound: vi.fn(),
    playGameStartSound: vi.fn(), playGameEndSound: vi.fn(), playSoloGameSound: vi.fn(),
    playLevelUpSound: vi.fn(), playBossEntranceSound: vi.fn(), playBossHitSound: vi.fn(),
    playBossPhaseChangeSound: vi.fn(), playBossDefeatSound: vi.fn(), playTimerUrgentSound: vi.fn(),
    playCoinCollectSound: vi.fn(), playQuestCompleteSound: vi.fn(), playBoardShuffleSound: vi.fn(),
    playBossDefeatLegendarySound: vi.fn(), playLegendaryWordSound: vi.fn(), playFlashChallengeSound: vi.fn(),
  }),
}));

vi.mock('@/lib/adventure/weeklyModifiers', () => ({ getWeeklyModifiers: () => [], applyModifiers: (c: any) => c }));
vi.mock('../effects/hooks/useAdventureEffects', () => ({
  useAdventureEffects: () => ({
    screenShake: { isShaking: false, trigger: vi.fn() }, particleBudget: { canSpawn: vi.fn(() => true), record: vi.fn() },
    lexiReaction: null, scorePopups: [], addScorePopup: vi.fn(), pendingExplosions: [], addExplosion: vi.fn(),
    clearExplosion: vi.fn(), particles: [], addParticles: vi.fn(), chainBursts: [], addChainBurst: vi.fn(), triggerWordEffect: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureCinematics', () => ({
  useAdventureCinematics: () => ({
    showVictoryCinematic: false, showDefeatCinematic: false, showWorldUnlockCinematic: false,
    worldUnlockData: null, triggerVictory: vi.fn(), triggerDefeat: vi.fn(),
    triggerWorldUnlock: vi.fn(), dismissCinematic: vi.fn(),
  }),
}));

vi.mock('../hooks/useAdventureGameInit', () => ({
  useAdventureGameInit: () => ({
    tier: 'normal', hintData: { level: 'none' }, powerUpCooldownMultiplier: 1.0, recordCompletion: vi.fn(),
    adjustedLevelConfig: {
      world: 1, level: 1, gridSize: 4, timerSeconds: 120,
      objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
      specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
    },
    intensityAdjustments: { hintEscalationRate: 1, difficultyScale: 1, comboDecayRate: 1 },
    flowState: 'normal', startAIDirector: vi.fn(), endAIDirector: vi.fn(),
    recordAIWord: vi.fn(), handleAITransition: vi.fn(), isAIBossBattle: false,
    totalXp: 0, currentLevel: 1, xpProgress: 0, awardXp: vi.fn(),
    gold: 100, upgrades: {}, addGold: vi.fn(), purchase: vi.fn(),
    getUpgradeEffect: vi.fn(() => 0),
    upgradeBonuses: { scoreBonus: 1, goldBonus: 1 },
    upgradeEffects: {
      bonusTimeSeconds: 0, bossDamageMultiplier: 1, blockFirstAttack: false,
      bossHealPerWord: 0, goldMultiplier: 1, longWordGoldBonus: 0,
      doubleFirstCompletionGold: false, comboDecayMultiplier: 1, comboScoreMultiplier: 1,
      failureGold: 0, retryScoreRetention: 0, freeRetriesPerWorld: 0,
      hintRechargeMultiplier: 1,
      hintsPerLevel: 1,   // base: 1
      freeStartHint: false,
      specialTileBoost: 0, guaranteedGoldTile: false, iceTileReduction: false,
      bombTimerInvert: false, scrambleImmunity: false, shuffleUsesPerLevel: 0,
      canDetonateWords: false,
      bonusHintsPerLevel: 0,  // upgrade bonus: 0
      timeFreezeSeconds: 0, freezeHighlightsWord: false,
    },
    skillEffects: { bossDamageMultiplier: 1 },
    handleEarnAchievement: vi.fn(), currentMilestone: null, checkMilestone: vi.fn(),
    adjustedInactivityThresholdMs: 15000,
    runeEffects: {
      scoreMultiplier: 1, goldMultiplier: 1, timeBonus: 0,
      comboDecay: 1,
      hintBonus: 2,  // equipped rune gives +2 hints
      bossDamage: 1,
    },
    streakMultiplier: 1, weeklyModifiers: [],
  }),
}));

vi.mock('../hooks/useAdventureLevelCompletion', () => ({
  useAdventureLevelCompletion: () => ({ handleLevelComplete: vi.fn(), goldEarned: 0 }),
}));

vi.mock('../hooks/useAdventureBossOrchestration', () => ({
  useAdventureBossOrchestration: () => ({
    bossState: null, bossActions: { dealDamage: vi.fn(), takeDamage: vi.fn() },
    isBossFight: false, isBossActive: false, bossCurrentHP: 0, bossMaxHP: 0, bossConfig: null,
    bossHealthState: { phase: 'phase1' }, playerHealthState: { currentHP: 100, maxHP: 100, isDead: false },
    gridEffectTrigger: null, triggerBossTaunt: vi.fn(), handleBossWordSubmit: vi.fn(),
    dealBossDamage: vi.fn(), healPlayer: vi.fn(), resetPlayerHealth: vi.fn(), endBossBattle: vi.fn(),
    showBossIntro: false, showBossFireworks: false, handleBossIntroStart: vi.fn(), handleBossIntroSkip: vi.fn(),
    defeatedBossTier: null, lockedTiles: [], bossEffectCallbacks: { onTileFreeze: vi.fn(), onTileShuffle: vi.fn() },
    bossDialogue: null, bossTelegraph: null, bossPhase: null, bossDefeated: false,
  }),
}));

vi.mock('@/hooks/useLexiStuckDetection', () => ({ useLexiStuckDetection: () => ({ isStuck: false, stuckDuration: 0, resetOnGameAction: vi.fn() }) }));
vi.mock('@/hooks/useGemDetectorHighlights', () => ({ useGemDetectorHighlights: () => ({ highlightedTiles: [] }) }));
vi.mock('@/hooks/useChapterQuests', () => ({ useChapterQuests: () => ({ quests: [], refreshQuests: vi.fn(), recordProgress: vi.fn() }) }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: () => ({ gameplayStart: vi.fn(), gameplayStop: vi.fn(), happyTime: vi.fn(), loadingStart: vi.fn(), loadingStop: vi.fn() }) }));
vi.mock('../hooks/useAdventureGameCallbacks', () => ({ useAdventureGameCallbacks: () => ({ handlePause: vi.fn(), handleResume: vi.fn(), handleExit: vi.fn() }) }));
vi.mock('../hooks/useAdventureQuestTracking', () => ({ useAdventureQuestTracking: () => ({}) }));
vi.mock('../hooks/useAdventureGridInteraction', () => ({ useAdventureGridInteraction: () => ({ handleTileSelect: vi.fn(), handleTileDragEnd: vi.fn(), handleDragStart: vi.fn(), handleDragEnter: vi.fn(), handleDragEnd: vi.fn(), handlePopupComplete: vi.fn(), handlePauseToggle: vi.fn() }) }));
vi.mock('../AdventureGameOverlays', () => ({ __esModule: true, default: () => null }));
vi.mock('../themed/GameplayBackground', () => ({ __esModule: true, default: () => null }));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({
    showInterstitial: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ── Fixtures ──

const mockLevelConfig: LevelConfig = {
  world: 1, level: 1, gridSize: 4, timerSeconds: 120,
  objectives: [{ type: 'wordCount', target: 5, isPrimary: true }],
  specialTiles: [], difficulty: 'EASY', chapterNumber: 1, levelInChapter: 1, isBossLevel: false,
};

const mockGrid = [
  ['C', 'A', 'T', 'S'], ['D', 'O', 'G', 'E'], ['B', 'I', 'R', 'D'], ['F', 'I', 'S', 'H'],
];

const defaultProps = { levelConfig: mockLevelConfig, initialGrid: mockGrid, onLevelComplete: vi.fn(), onExit: vi.fn() };

const mockGameState = {
  gameState: { score: 0, wordsFound: [], combo: 0, comboMultiplier: 1, goldEarned: 0, isComplete: false, longWordsFound: 0, tilesCleared: 0 },
  tiles: [], tilesVersion: 0, objectives: [], timeRemaining: 120,
  timerStore: { subscribe: vi.fn(() => () => {}), getState: vi.fn(() => ({ timeRemaining: 120, isRunning: false })), getSnapshot: vi.fn(() => 120), destroy: vi.fn() },
  isPlaying: false, submitWordWithPath: vi.fn(), startGame: vi.fn(), pauseGame: vi.fn(),
  completeLevel: vi.fn(), resetGame: vi.fn(), markCascadeComplete: vi.fn(), isCascading: false,
  cascadePhase: 'idle', addTime: vi.fn(), activateFreeze: vi.fn(), isFrozen: false, freezeUsed: false,
  useShuffle: vi.fn(), shufflesRemaining: 0, updateObjective: vi.fn(), effectiveComboTimeout: 5000,
  upgradeState: {}, upgradeTriggered: null, themedWordsFound: 0, lastWordWasThemed: false,
  movesRemaining: null, currentHP: null, maxHP: null,
  huntTargetWord: null, huntAttempts: 0, huntFound: false, setHuntTarget: vi.fn(), submitHuntGuess: vi.fn(),
};

const mockHintsReturn = {
  hasHintsAvailable: true, getHint: vi.fn(), currentHint: null, clearCurrentHint: vi.fn(),
  recordActivity: vi.fn(), showAutoHint: false, dismissAutoHint: vi.fn(), isLoading: false,
  error: null, remainingHintWords: [], findPathForWord: vi.fn(() => null), nextHintCost: 10,
};

// forge returns: hintBonus: 1, timeBonus: 15
const mockForgePickerReturn = {
  forgePickerOpen: false, setForgePickerOpen: vi.fn(), forgeEquippedRunes: [], forgeOffering: [],
  forgeEffects: { scoreMultiplier: 1, goldMultiplier: 1, timeBonus: 15, comboDecay: 1, hintBonus: 1, bossDamage: 1 },
  handleForgePick: vi.fn(), handleForgeSkip: vi.fn(),
};

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryWrapper';
  return Wrapper;
};

// ── Tests ──

describe('AdventureGame rune wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    useAdventureGameSpy.mockReturnValue(mockGameState);
    useAdventureHintsSpy.mockReturnValue(mockHintsReturn);
    useAdventureForgePickerSpy.mockReturnValue(mockForgePickerReturn);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Gap A: maxHintsPerLevel includes runeEffects.hintBonus and forgeEffects.hintBonus', () => {
    // GIVEN: runeEffects.hintBonus=2, upgradeEffects.hintsPerLevel=1, bonusHintsPerLevel=0, forgeEffects.hintBonus=1
    // EXPECT: maxHintsPerLevel = 1 + 0 + 2 + 1 = 4
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

    const callArgs = useAdventureHintsSpy.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs.maxHintsPerLevel).toBe(4);
  });

  it('Gap B: forgeEffects.timeBonus is applied to levelConfig.timerSeconds passed to useAdventureGame', () => {
    // GIVEN: adjustedLevelConfig.timerSeconds=120, forgeEffects.timeBonus=15
    // EXPECT: timerSeconds = 120 + 15 = 135
    render(<AdventureGame {...defaultProps} />, { wrapper: createWrapper() });

    const callArgs = useAdventureGameSpy.mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs.levelConfig.timerSeconds).toBe(135);
  });
});
