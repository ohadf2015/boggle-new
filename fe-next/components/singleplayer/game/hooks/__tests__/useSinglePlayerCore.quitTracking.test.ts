/**
 * Quit-attempt tracking: handleQuitRequest must emit game_abandon_attempted
 * for non-practice modes so PostHog can measure intentional mid-game quits
 * (distinct from passive pagehide-based game_abandoned events).
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
  trackDeadTime: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/contexts/AccessibilityContext', () => ({
  useCosyMode: () => false,
  useSuppressTimerUrgency: () => false,
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn(), stopSound: vi.fn(), playWordFound: vi.fn(), playWordError: vi.fn(), playCountdownBeep: vi.fn(), stopAllMusic: vi.fn() }),
}));
vi.mock('@/hooks/useGameMusic', () => ({ useGameMusic: () => ({ startMusic: vi.fn(), stopMusic: vi.fn() }) }));
vi.mock('@/hooks/useEarthquakeFireRound', () => ({ useEarthquakeFireRound: () => ({ fireRoundActive: false, fireRoundRemaining: 0, earthquakeState: null, startFireRound: vi.fn() }) }));
vi.mock('@/hooks/useComboSystem', () => ({ useComboSystem: () => ({ combo: { comboLevel: 0, comboTimeRemaining: 0, isDangerState: false, maxCombo: 0 }, comboCoinReward: null, recordComboWord: vi.fn(), resetCombo: vi.fn(), handleCoinAnimationComplete: vi.fn() }) }));
vi.mock('@/hooks/useDevicePerformance', () => ({ useDevicePerformance: () => ({ tier: 'high' }) }));
vi.mock('@/hooks/useGameTimer', () => ({ useGameTimer: () => ({ timer: { remainingTime: 120 }, startTimer: vi.fn(), pauseTimer: vi.fn(), resumeTimer: vi.fn() }) }));
vi.mock('@/hooks/useWordPace', () => ({ useWordPace: () => ({ recordWord: vi.fn(), pace: 0 }) }));
vi.mock('@/hooks/useAutoScrollOnGameStart', () => ({ useAutoScrollOnGameStart: vi.fn() }));
vi.mock('@/hooks/useDesktopLayout', () => ({ useDesktopLayout: () => ({ isDesktop: false, isTv: false, isLandscape: false }) }));
vi.mock('@/hooks/useNavigationGuard', () => ({ useNavigationGuard: () => ({ disableGuard: vi.fn() }) }));
vi.mock('@/hooks/useGiftModalPause', () => ({ useGiftModalPause: () => ({ isPausedByGift: false }) }));
vi.mock('@/hooks/useRewardAdPause', () => ({ useRewardAdPause: () => ({ isPausedByAd: false }) }));
vi.mock('@/components/GameAnnouncer', () => ({ useAnnouncer: () => ({ announce: vi.fn() }) }));
vi.mock('@/hooks/useDirectionPatternGuidance', () => ({ useDirectionPatternGuidance: () => ({ directionGuidance: null }) }));
vi.mock('@/hooks/useFirstPlayTutorial', () => ({ useFirstPlayTutorial: () => ({ firstPlayTutorial: null, advanceTutorial: vi.fn() }) }));
vi.mock('@/hooks/useCrazyGamesLifecycle', () => ({ useCrazyGamesLifecycle: vi.fn() }));
vi.mock('@/hooks/useTrainingAnalysis', () => ({ useTrainingAnalysis: () => ({ trainingAnalysisTrackPath: vi.fn() }) }));
vi.mock('@/hooks/useTrainingProgress', () => ({ useTrainingProgress: () => ({ trainingCompletedSkills: new Set(), trainingJustUnlocked: null, trainingUpdateProgress: vi.fn(), trainingTrackPath: vi.fn() }) }));
vi.mock('@/hooks/useKeyboardWordInput', () => ({ useKeyboardWordInput: () => ({ keyboardInput: null }) }));
vi.mock('@/utils/singlePlayerAchievements', () => ({ checkLiveAchievements: () => [], createAchievementState: () => ({}) }));
vi.mock('@/shared/utils/scoring', () => ({ getComboBonus: () => 0, calculateWordScore: () => 5 }));
vi.mock('@/lib/cosy/cosyGameplay', () => ({ shouldPlayCountdownBeep: () => false }));
vi.mock('./useBotSimulation', () => ({ useBotSimulation: () => ({ botScores: [], simulateBotWord: vi.fn() }) }));
vi.mock('./useSpamDetection', () => ({ useSpamDetection: () => ({ checkSpam: vi.fn() }) }));
vi.mock('./useSinglePlayerEffects', () => ({ useSinglePlayerEffects: vi.fn() }));
vi.mock('./buildGameResults', () => ({
  buildGameResults: vi.fn(),
  buildFallbackResults: vi.fn(),
  emitSinglePlayerGameEnd: vi.fn(),
}));
vi.mock('@/lib/boardSelection', () => ({ pickRichestBoardClient: vi.fn().mockResolvedValue(null) }));
vi.mock('@/utils/wordPathFinder', () => ({ selectRandomRevealWord: vi.fn(), getRevealableWordCount: () => 0 }));
vi.mock('@/utils/clientWordValidator', () => ({ validateWordLocally: vi.fn(), isWordOnBoard: vi.fn() }));
vi.mock('@/components/NeoToast', () => ({ wordErrorToast: vi.fn() }));
vi.mock('@/utils/coinManager', () => ({ awardComboCoins: vi.fn() }));
vi.mock('@/utils/haptics', () => ({ hapticForWordScore: vi.fn(), hapticError: vi.fn() }));
vi.mock('@/utils/invalidWordTracker', () => ({ recordNotInDictionary: vi.fn() }));
vi.mock('@/utils/utils', () => ({ generateRandomTable: () => [] }));

import { useSinglePlayerCore } from '../useSinglePlayerCore';
import type { SinglePlayerGameState } from '../../../SinglePlayerView';

const baseSettings: SinglePlayerGameState = {
  mode: 'classic',
  difficulty: 'medium',
  language: 'en',
  timerSeconds: 180,
  gridSize: 4,
} as unknown as SinglePlayerGameState;

describe('useSinglePlayerCore quit tracking', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
  });

  it('emits game_abandon_attempted when handleQuitRequest fires for non-practice mode', async () => {
    const onQuit = vi.fn();
    const { result } = renderHook(() =>
      useSinglePlayerCore({ settings: baseSettings, targetHighScore: null, onGameEnd: vi.fn(), onQuit })
    );

    act(() => {
      result.current.handleQuitRequest();
    });

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith(
      'game_abandon_attempted',
      expect.objectContaining({ mode: 'classic' }),
    );
  });

  it('does NOT emit game_abandon_attempted for practice mode', async () => {
    const practiceSettings = { ...baseSettings, mode: 'practice' } as unknown as SinglePlayerGameState;
    const onQuit = vi.fn();
    const { result } = renderHook(() =>
      useSinglePlayerCore({ settings: practiceSettings, targetHighScore: null, onGameEnd: vi.fn(), onQuit })
    );

    act(() => {
      result.current.handleQuitRequest();
    });

    expect(mockTrackGrowthEvent).not.toHaveBeenCalledWith(
      'game_abandon_attempted',
      expect.anything(),
    );
  });
});
