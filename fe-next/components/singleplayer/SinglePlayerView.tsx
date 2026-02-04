'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import SinglePlayerGame from './SinglePlayerGame';
import SinglePlayerResults from './SinglePlayerResults';
import { getHighScore, recordGameResult, getAllTimeBest } from './highScoreManager';
import { useGameMusic, type GamePhase } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useFeatureUnlockNotifications } from '@/hooks/useFeatureUnlockNotifications';
import { incrementTrainingGames } from '@/utils/playerProgressStorage';
import { getMinWordLength, getDefaultPreset, getPresetById, type PresetConfig } from './presetConfig';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';
import { useHideNavigation } from '@/contexts/NavigationContext';

export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge';
export type SinglePlayerPhase = 'playing' | 'results';

export interface BotOpponent {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  wordsFound: string[];
}

export interface SinglePlayerGameState {
  mode: SinglePlayerMode;
  difficulty: DifficultyLevel;
  language: Language;
  grid: LetterGrid | null;
  timerSeconds: number;
  bots: BotOpponent[];
  minWordLength: number; // Minimum word length (2 for EASY, 3 for others)
}

export interface PlayerWordData {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean;
  comboBonus?: number;
  fireRoundBonus?: number; // Extra points from 2x fire round multiplier
}

export interface SinglePlayerAchievement {
  key: string;
  icon: string;
}

export interface SinglePlayerResultsData {
  playerScore: number;
  playerWords: string[];
  playerWordData: PlayerWordData[]; // Word data with timing for insights
  gameDuration: number; // Game duration in seconds for pace calculation
  botScores: Array<{ name: string; score: number; words: string[] }>;
  grid: LetterGrid;
  allPossibleWords: string[];
  isNewHighScore: boolean;
  previousHighScore?: number | null; // For showing improvement
  isNewAllTimeBest?: boolean; // For extra celebration
  achievements?: SinglePlayerAchievement[]; // Achievements earned (not saved to profile)
  botWordsForValidation?: string[]; // Bot words to show in validation modal
  gameSessionId?: string; // Unique session ID for vote tracking
  language?: Language; // Game language for vote recording
}

/**
 * SinglePlayerView - Main orchestrator for single player modes
 * Handles state transitions between lobby, playing, and results phases
 */
// Default medium bot for single player mode
const DEFAULT_MEDIUM_BOT: BotOpponent = {
  id: 'default-medium-bot',
  name: 'WordBot',
  difficulty: 'medium',
  score: 0,
  wordsFound: [],
};

const BOT_NAMES = [
  'WordBot', 'LexiBot', 'AlphaBot', 'BrainBot', 'SpeedBot',
  'CleverBot', 'QuickBot', 'SmartBot', 'ProBot', 'MasterBot'
];

/**
 * Generate bot opponents for a preset
 * Standalone function to be used in useEffect without dependency issues
 */
function generateBotsForPreset(count: number, difficulty: 'easy' | 'medium' | 'hard'): BotOpponent[] {
  const bots: BotOpponent[] = [];
  const availableNames = [...BOT_NAMES];

  for (let i = 0; i < count && availableNames.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableNames.length);
    const botName = availableNames.splice(randomIndex, 1)[0];
    bots.push({
      id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: botName,
      difficulty,
      score: 0,
      wordsFound: [],
    });
  }
  return bots;
}

const SinglePlayerView: React.FC = () => {
  const { language: uiLanguage, t } = useLanguage();
  const { unlockAudio } = useMusic();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<SinglePlayerPhase>('playing');
  const setIsInGame = useHideNavigation();

  // Show feature unlock notifications when user reaches milestones
  useFeatureUnlockNotifications();

  // Track the current isInGame value to prevent redundant updates
  const isInGameRef = useRef(false);
  // Track if component is mounted to prevent updates after unmount
  const isMountedRef = useRef(true);

  // Hide bottom navigation during gameplay
  // Note: Using useEffect instead of useLayoutEffect to avoid infinite loop on iOS Chrome
  // Split into two effects to prevent re-render loops from cleanup cascading
  useEffect(() => {
    const shouldBeInGame = phase === 'playing' || phase === 'results';
    // Only update if state actually changed and component is still mounted
    if (isMountedRef.current && isInGameRef.current !== shouldBeInGame) {
      isInGameRef.current = shouldBeInGame;
      setIsInGame(shouldBeInGame);
    }
  }, [phase, setIsInGame]);

  // Separate cleanup effect that only runs on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Reset navigation visibility on unmount
      setIsInGame(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: only run on mount/unmount, setIsInGame is stable

  // Check for returnTo param (e.g., returnTo=daily from training suggestion)
  const returnTo = searchParams.get('returnTo');
  // Check for autoStart param (e.g., autoStart=practice from onboarding)
  const autoStart = searchParams.get('autoStart');
  // Check for preset param (e.g., preset=bots from NextStepPrompt after practice)
  const presetParam = searchParams.get('preset');

  const [gameState, setGameState] = useState<SinglePlayerGameState>(() => ({
    mode: 'solo-bots',
    difficulty: 'MEDIUM',
    language: (uiLanguage as Language) || 'en',
    grid: null,
    timerSeconds: 120, // 2 minutes default (standard preset)
    bots: [DEFAULT_MEDIUM_BOT],
    minWordLength: 3, // Default to 3 letters minimum
  }));
  const [resultsData, setResultsData] = useState<SinglePlayerResultsData | null>(null);

  // Get challenge high score info
  const challengeHighScore = useMemo(() => getAllTimeBest(), []);

  // Map SinglePlayerPhase to GamePhase for the music hook
  // 'playing' phase music is handled by SinglePlayerGame component
  const musicPhase: GamePhase = phase === 'playing' ? 'waiting' : phase;

  // Use shared music hook for lobby and results phases
  // Playing phase is handled by SinglePlayerGame for timer-based transitions
  useGameMusic({
    phase: musicPhase,
    enabled: phase !== 'playing', // Disable when playing - SinglePlayerGame handles it
  });

  // Pull-to-refresh - disabled during gameplay
  const { pullToRefreshHandlers, pullState } = usePullToRefresh({
    onRefresh: async () => {
      window.location.reload();
    },
    threshold: 60,
    enabled: phase !== 'playing', // Disable during gameplay
  });

  // Auto-redirect to daily challenge after game ends when returnTo=daily
  // This is used when players come from the training suggestion modal
  useEffect(() => {
    if (phase === 'results' && returnTo === 'daily' && resultsData) {
      // Wait a moment for user to see results, then redirect
      const timer = setTimeout(() => {
        router.push(`/${uiLanguage}/daily`);
      }, 3000); // 3 second delay to see results

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, returnTo, resultsData, router, uiLanguage]);

  // Guard to prevent auto-start from running multiple times
  const hasAutoStartedRef = useRef(false);

  // Auto-start practice mode when coming from onboarding (autoStart=practice)
  // Note: 'phase' intentionally NOT in deps - this effect should only run once on mount
  // based on URL params, not re-run when phase changes (which would cause infinite loop)
  useEffect(() => {
    // Only run once - prevents infinite loop when uiLanguage changes during hydration
    if (autoStart === 'practice' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      // Get the default practice preset (explorer - EASY, no timer, no bots)
      const practicePreset = getDefaultPreset('practice');
      if (practicePreset) {
        const minWordLength = getMinWordLength(uiLanguage, practicePreset.settings.difficulty);
        setGameState(prev => ({
          ...prev,
          mode: 'practice',
          difficulty: practicePreset.settings.difficulty,
          timerSeconds: practicePreset.settings.timerSeconds,
          bots: [],
          language: uiLanguage as Language,
          grid: null,
          minWordLength,
        }));
        setPhase('playing');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, uiLanguage]);

  // Auto-start bot game when autoStart=bots (direct from landing page)
  // Note: 'phase' intentionally NOT in deps - this effect should only run once on mount
  // based on URL params, not re-run when phase changes (which would cause infinite loop)
  useEffect(() => {
    if (autoStart === 'bots' && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      // Get the default solo-bots preset (MEDIUM difficulty, 2 medium bots, 120s timer)
      const botsPreset = getDefaultPreset('solo-bots');

      if (botsPreset) {
        const bots = generateBotsForPreset(
          botsPreset.settings.bots,
          botsPreset.settings.botDifficulty
        );

        const minWordLength = getMinWordLength(uiLanguage, botsPreset.settings.difficulty);
        setGameState({
          mode: 'solo-bots',
          difficulty: botsPreset.settings.difficulty,
          timerSeconds: botsPreset.settings.timerSeconds,
          bots,
          language: uiLanguage as Language,
          grid: null,
          minWordLength,
        });

        setPhase('playing');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, uiLanguage]);

  // Auto-start with preset when preset param is provided (e.g., preset=bots from NextStepPrompt)
  // This handles navigation from practice mode results to "Challenge Bots"
  useEffect(() => {
    // Don't run if autoStart is handling the start
    if (autoStart) return;
    // Don't run if no preset param or already started
    if (!presetParam || hasAutoStartedRef.current) return;
    // Don't interrupt an ongoing game
    if (phase === 'playing') return;

    hasAutoStartedRef.current = true;

    // Handle special "bots" preset which means solo-bots mode with default settings
    if (presetParam === 'bots') {
      const botsPreset = getDefaultPreset('solo-bots');
      if (botsPreset) {
        const minWordLength = getMinWordLength(uiLanguage, botsPreset.settings.difficulty);
        const bots = botsPreset.settings.bots > 0
          ? generateBotsForPreset(botsPreset.settings.bots, botsPreset.settings.botDifficulty)
          : [];
        setGameState(prev => ({
          ...prev,
          mode: 'solo-bots',
          difficulty: botsPreset.settings.difficulty,
          timerSeconds: botsPreset.settings.timerSeconds,
          bots,
          language: uiLanguage as Language,
          grid: null,
          minWordLength,
        }));
        setPhase('playing');
      }
      return;
    }

    // Try to find preset by ID
    const preset = getPresetById(presetParam);
    if (preset) {
      // Determine mode based on preset settings
      let mode: SinglePlayerMode = 'solo-bots';
      if (preset.settings.bots === 0 && preset.settings.timerSeconds === 0) {
        mode = 'practice';
      } else if (preset.settings.bots === 0 && preset.settings.timerSeconds > 0) {
        mode = 'challenge';
      }

      const minWordLength = getMinWordLength(uiLanguage, preset.settings.difficulty);
      const bots = preset.settings.bots > 0
        ? generateBotsForPreset(preset.settings.bots, preset.settings.botDifficulty)
        : [];

      setGameState(prev => ({
        ...prev,
        mode,
        difficulty: preset.settings.difficulty,
        timerSeconds: preset.settings.timerSeconds,
        bots,
        language: uiLanguage as Language,
        grid: null,
        minWordLength,
      }));
      setPhase('playing');
    }
  }, [presetParam, autoStart, phase, uiLanguage]);

  // Get current high score for challenge mode
  const currentHighScore = useMemo(() => {
    if (gameState.mode !== 'challenge') return null;
    return getHighScore(gameState.difficulty, gameState.timerSeconds);
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds]);

  // Generate bots for a preset
  const generateBots = useCallback((count: number, difficulty: 'easy' | 'medium' | 'hard'): BotOpponent[] => {
    const bots: BotOpponent[] = [];
    const availableNames = [...BOT_NAMES];

    for (let i = 0; i < count && availableNames.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableNames.length);
      const botName = availableNames.splice(randomIndex, 1)[0];
      bots.push({
        id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: botName,
        difficulty,
        score: 0,
        wordsFound: [],
      });
    }
    return bots;
  }, []);

  // Handle preset selection - quick start with preset settings
  const handleSelectPreset = useCallback((preset: PresetConfig) => {
    // CRITICAL: Unlock audio immediately on user click
    // This ensures browser autoplay policy is satisfied within the user gesture
    unlockAudio();

    // Determine mode based on preset
    let mode: SinglePlayerMode = 'solo-bots';
    if (preset.settings.bots === 0 && preset.settings.timerSeconds === 0) {
      mode = 'practice';
    } else if (preset.settings.bots === 0 && preset.settings.timerSeconds > 0) {
      mode = 'challenge';
    }

    // Generate bots if needed
    const bots = preset.settings.bots > 0
      ? generateBots(preset.settings.bots, preset.settings.botDifficulty)
      : [];

    // Set game state and start immediately
    // Calculate minWordLength based on language and difficulty
    // Japanese: always 2+, Other languages: Hard = 3+, Easy/Medium = 2+
    const minWordLength = getMinWordLength(uiLanguage, preset.settings.difficulty);

    setGameState(prev => ({
      ...prev,
      mode,
      difficulty: preset.settings.difficulty,
      timerSeconds: preset.settings.timerSeconds,
      bots,
      language: uiLanguage as Language,
      grid: null,
      minWordLength,
    }));
    setPhase('playing');
  }, [uiLanguage, generateBots, unlockAudio]);


  const handleStartGame = useCallback((settings: Partial<SinglePlayerGameState>) => {
    // Unlock audio on user gesture (required for browser autoplay policy)
    unlockAudio();
    setGameState(prev => ({ ...prev, ...settings }));
    setPhase('playing');
  }, [unlockAudio]);

  const handleGameEnd = useCallback((results: SinglePlayerResultsData) => {
    // Track training game completion for progressive mode discovery
    // Count all single player modes as "training" games
    incrementTrainingGames();

    // Record high score for challenge mode
    if (gameState.mode === 'challenge') {
      const longestWord = results.playerWords.reduce(
        (longest, word) => word.length > longest.length ? word : longest,
        ''
      );

      // Calculate additional stats for high score tracking
      const validWords = results.playerWordData?.filter(w => w.isValid) || [];
      const totalAttempts = results.playerWordData?.length || 0;
      const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
      const avgWordLength = validWords.length > 0
        ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length
        : 0;
      const totalComboBonus = validWords.reduce((sum, w) => sum + (w.comboBonus || 0), 0);
      const totalFireRoundBonus = validWords.reduce((sum, w) => sum + (w.fireRoundBonus || 0), 0);

      const highScoreResult = recordGameResult(
        results.playerScore,
        results.playerWords.length,
        longestWord,
        gameState.difficulty,
        gameState.timerSeconds,
        {
          accuracy,
          comboBonus: totalComboBonus,
          fireRoundBonus: totalFireRoundBonus,
          averageWordLength: avgWordLength,
          achievementCount: results.achievements?.length || 0,
        }
      );

      // Update results with high score info
      results.isNewHighScore = highScoreResult.isNewHighScore;
      results.previousHighScore = highScoreResult.previousBest;
      results.isNewAllTimeBest = highScoreResult.isNewAllTimeBest;
    }

    setResultsData(results);
    setPhase('results');
    // Note: We intentionally do NOT reset hasAutoStartedRef here.
    // If user navigates to a new URL (e.g., ?preset=bots), the component remounts
    // and hasAutoStartedRef resets naturally. Resetting here would cause infinite
    // game loops because the useEffects would re-trigger with the existing URL params.
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds]);

  const handlePlayAgain = () => {
    // Navigate back to landing page
    router.push(`/${uiLanguage}/`);
  };

  // Quick rematch - immediately start a new game with same settings
  const handleQuickRematch = useCallback(() => {
    // Unlock audio on user gesture (required for browser autoplay policy)
    unlockAudio();
    setResultsData(null);
    // Reset grid to null so a new grid is generated
    setGameState(prev => ({ ...prev, grid: null }));
    // Immediately go to playing phase
    setPhase('playing');
  }, [unlockAudio]);

  const handleBackToLobby = () => {
    // Navigate back to landing page
    router.push(`/${uiLanguage}/`);
  };

  return (
    <div
      className="flex flex-col min-h-full bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative"
      {...pullToRefreshHandlers}
    >
      {/* Pull-to-refresh indicator - only show when not playing */}
      {phase !== 'playing' && (
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />
      )}

      <AutoHideHeader />

      <main className="w-full px-2 sm:px-3 lg:px-4 py-4 sm:py-4 lg:py-6 landscape-content overflow-x-hidden">
        {phase === 'playing' && (
          <SinglePlayerGame
            settings={gameState}
            targetHighScore={currentHighScore?.score || null}
            onGameEnd={handleGameEnd}
            onQuit={handleBackToLobby}
          />
        )}

        {phase === 'results' && resultsData && (
          <>
            <SinglePlayerResults
              key={resultsData.gameSessionId || `results-${Date.now()}`}
              results={resultsData}
              mode={gameState.mode}
              onPlayAgain={handlePlayAgain}
              onQuickRematch={handleQuickRematch}
              onBackToLobby={handleBackToLobby}
            />
            {/* Show redirect notice when coming from training suggestion */}
            {returnTo === 'daily' && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-neo-orange text-neo-black px-4 py-2 rounded-full shadow-hard-sm border-2 border-neo-black text-sm font-medium animate-pulse">
                  {t('daily.trainingSuggestion.redirecting') || 'Heading to Daily Challenge...'}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default SinglePlayerView;
