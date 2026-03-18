'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import SinglePlayerGame from './SinglePlayerGame';
import SinglePlayerResults from './SinglePlayerResults';
import PracticeResults from './results/PracticeResults';
import PreGameTutorial from './PreGameTutorial';
import { getHighScore } from './highScoreManager';
import { recordGameResult } from '@/utils/playerStats';
import { useGameMusic, type GamePhase } from '@/hooks/useGameMusic';
import { useMusic } from '@/contexts/MusicContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useFeatureUnlockNotifications } from '@/hooks/useFeatureUnlockNotifications';
import { incrementTrainingGames } from '@/utils/playerProgressStorage';
import { awardCreatorCoins } from '@/utils/creatorRewards';
import { getMinWordLength, getDefaultPreset, getPresetById } from './presetConfig';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';
import { useHideNavigation } from '@/contexts/NavigationContext';
import {
  shouldShowGuidance,
  markGuidanceShown,
} from '@/utils/contextualGuidanceStorage';

export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge';
export type SinglePlayerPhase = 'pre-game' | 'playing' | 'results';

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
  language?: Language; // Game language
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

  // Show pre-game tutorial for first-time players (unless auto-starting from URL)
  const [phase, setPhase] = useState<SinglePlayerPhase>(() => {
    const hasAutoStart = searchParams?.get('autoStart');
    const hasPreset = searchParams?.get('preset');
    if (hasAutoStart || hasPreset) return 'playing';
    return shouldShowGuidance('firstPlayTutorialCompleted') ? 'pre-game' : 'playing';
  });
  const setIsInGame = useHideNavigation();

  // Show feature unlock notifications when user reaches milestones
  useFeatureUnlockNotifications();

  // Track the current isInGame value to prevent redundant updates
  const isInGameRef = useRef(false);
  // Track if component is mounted to prevent updates after unmount
  const isMountedRef = useRef(true);

  // Hide bottom navigation during gameplay and pre-game tutorial
  // Note: Using useEffect instead of useLayoutEffect to avoid infinite loop on iOS Chrome
  // Split into two effects to prevent re-render loops from cleanup cascading
  useEffect(() => {
    const shouldBeInGame = phase === 'pre-game' || phase === 'playing' || phase === 'results';
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
  const returnTo = searchParams?.get('returnTo') || null;
  // Check for autoStart param (e.g., autoStart=practice from onboarding)
  const autoStart = searchParams?.get('autoStart') || null;
  // Check for preset param (e.g., preset=bots from NextStepPrompt after practice)
  const presetParam = searchParams?.get('preset') || null;
  // Check for boardCode param (e.g., boardCode=ABC123 from community board play)
  const boardCode = searchParams?.get('boardCode') || null;

  const [gameState, setGameState] = useState<SinglePlayerGameState>(() => ({
    mode: 'solo-bots',
    difficulty: 'MEDIUM',
    language: (uiLanguage as Language) || 'en',
    grid: null,
    timerSeconds: 120, // 2 minutes default (standard preset)
    bots: [DEFAULT_MEDIUM_BOT],
    minWordLength: 2, // Default to 2 letters minimum
  }));
  const [resultsData, setResultsData] = useState<SinglePlayerResultsData | null>(null);

  // Map SinglePlayerPhase to GamePhase for the music hook
  // 'playing' phase music is handled by SinglePlayerGame component
  // 'pre-game' maps to 'waiting' (no music during tutorial)
  const musicPhase: GamePhase = (phase === 'playing' || phase === 'pre-game') ? 'waiting' : phase;

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
  // Track if this was a first-timer practice game (from tutorial) — next game should be bots
  const wasFirstTimerPracticeRef = useRef(false);

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
          language: (uiLanguage as Language) || 'en',
          grid: null,
          minWordLength,
        }));
        setPhase('playing');
      }
    }

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
          language: (uiLanguage as Language) || 'en',
          grid: null,
          minWordLength,
        });

        setPhase('playing');
      }
    }

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
          language: (uiLanguage as Language) || 'en',
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
        language: (uiLanguage as Language) || 'en',
        grid: null,
        minWordLength,
      }));
      setPhase('playing');
    }
  }, [presetParam, autoStart, phase, uiLanguage]);

  // Auto-load community board when boardCode param is provided
  useEffect(() => {
    if (!boardCode || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;

    const loadCommunityBoard = async () => {
      try {
        const res = await fetch(`/api/ugc/boards/${boardCode}`);
        if (!res.ok) return;
        const data = await res.json();
        const board = data.board;
        if (!board?.grid) return;

        const difficulty: DifficultyLevel = board.difficulty === 'EASY' ? 'EASY' : board.difficulty === 'HARD' ? 'HARD' : 'MEDIUM';
        const timerSeconds = board.timer_seconds || 120;
        const minWordLength = getMinWordLength(board.language || uiLanguage, difficulty);

        setGameState(prev => ({
          ...prev,
          mode: 'solo-bots',
          difficulty,
          timerSeconds,
          bots: [],
          language: (board.language || uiLanguage) as Language,
          grid: board.grid as LetterGrid,
          minWordLength,
        }));
        setPhase('playing');
      } catch {
        // Silently fall back to normal game
      }
    };

    loadCommunityBoard();
  }, [boardCode, uiLanguage]);

  // Get current high score for challenge mode
  const currentHighScore = useMemo(() => {
    if (gameState.mode !== 'challenge') return null;
    return getHighScore(gameState.difficulty, gameState.timerSeconds);
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds]);

  const handleGameEnd = useCallback((results: SinglePlayerResultsData) => {
    // Track training game completion for progressive mode discovery
    // Count all single player modes as "training" games
    incrementTrainingGames();

    // Record high score for ALL modes (solo-bots, practice, challenge)
    const longestWord = (results.playerWords || []).reduce(
      (longest, word) => word.length > (longest?.length || 0) ? word : longest,
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

    const highScoreResult = recordGameResult({
      mode: gameState.mode,
      score: results.playerScore,
      wordCount: (results.playerWords || []).length,
      longestWord,
      difficulty: gameState.difficulty,
      durationSeconds: gameState.timerSeconds,
      accuracy,
      comboBonus: totalComboBonus,
      fireRoundBonus: totalFireRoundBonus,
      averageWordLength: avgWordLength,
      achievementCount: results.achievements?.length || 0,
    });

    // Update results with high score info
    results.isNewHighScore = highScoreResult.isNewHighScore;
    results.previousHighScore = highScoreResult.previousBest;
    results.isNewAllTimeBest = highScoreResult.isNewAllTimeBest;

    // Record community board play and award creator coins
    if (boardCode) {
      awardCreatorCoins('BOARD_PLAYED', { boardCode });
      fetch(`/api/ugc/boards/${boardCode}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: results.playerScore, words_found: (results.playerWords || []).length }),
      }).catch(() => { /* non-critical */ });
    }

    setResultsData(results);
    setPhase('results');
    // Note: We intentionally do NOT reset hasAutoStartedRef here.
    // If user navigates to a new URL (e.g., ?preset=bots), the component remounts
    // and hasAutoStartedRef resets naturally. Resetting here would cause infinite
    // game loops because the useEffects would re-trigger with the existing URL params.
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds, boardCode]);

  const handlePlayAgain = useCallback(() => {
    // After first-timer practice, transition to bot game instead of going back
    if (wasFirstTimerPracticeRef.current) {
      wasFirstTimerPracticeRef.current = false;
      const botsPreset = getDefaultPreset('solo-bots');
      if (botsPreset) {
        unlockAudio();
        const bots = generateBotsForPreset(botsPreset.settings.bots, botsPreset.settings.botDifficulty);
        const minWordLength = getMinWordLength(uiLanguage, botsPreset.settings.difficulty);
        setGameState({
          mode: 'solo-bots',
          difficulty: botsPreset.settings.difficulty,
          timerSeconds: botsPreset.settings.timerSeconds,
          bots,
          language: (uiLanguage as Language) || 'en',
          grid: null,
          minWordLength,
        });
        setResultsData(null);
        setPhase('playing');
        return;
      }
    }
    // Navigate back to landing page
    router.push(`/${uiLanguage}/`);
  }, [uiLanguage, router, unlockAudio]);

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

  // Handle pre-game tutorial completion — start in practice mode for first-timers
  const handleTutorialComplete = useCallback(() => {
    markGuidanceShown('firstPlayTutorialCompleted');
    wasFirstTimerPracticeRef.current = true;
    const practicePreset = getDefaultPreset('practice');
    if (practicePreset) {
      const minWordLength = getMinWordLength(uiLanguage, practicePreset.settings.difficulty);
      setGameState(prev => ({
        ...prev,
        mode: 'practice',
        difficulty: practicePreset.settings.difficulty,
        timerSeconds: practicePreset.settings.timerSeconds,
        bots: [],
        language: (uiLanguage as Language) || 'en',
        grid: null,
        minWordLength,
      }));
    }
    setPhase('playing');
  }, [uiLanguage]);

  const handleBackToLobby = () => {
    // Navigate back to landing page
    router.push(`/${uiLanguage}/`);
  };

  return (
    <div
      className={`flex flex-col bg-neo-navy dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative ${phase === 'playing' ? 'h-full overflow-hidden' : 'min-h-full'}`}
      {...pullToRefreshHandlers}
    >
      {/* Pull-to-refresh indicator - only show during results */}
      {phase === 'results' && (
        <PullToRefreshIndicator
          pullDistance={pullState.pullDistance}
          isRefreshing={pullState.isRefreshing}
          threshold={60}
        />
      )}

      <AutoHideHeader />

      {phase === 'pre-game' && (
        <PreGameTutorial onComplete={handleTutorialComplete} />
      )}

      <div className={`w-full px-2 sm:px-3 lg:px-4 landscape-content overflow-x-hidden ${phase === 'playing' ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
        {phase === 'playing' && (
            <SinglePlayerGame
              settings={gameState}
              targetHighScore={currentHighScore?.score || null}
              onGameEnd={handleGameEnd}
              onQuit={handleBackToLobby}
            />
        )}

        {phase === 'results' && resultsData && resultsData.playerWordData && (
          <>
            {gameState.mode === 'practice' ? (
              <PracticeResults
                key={resultsData.gameSessionId || `results-${Date.now()}`}
                results={resultsData}
                onPlayAgain={handlePlayAgain}
                onBackToLobby={handleBackToLobby}
              />
            ) : (
              <SinglePlayerResults
                key={resultsData.gameSessionId || `results-${Date.now()}`}
                results={resultsData}
                mode={gameState.mode}
                onPlayAgain={handlePlayAgain}
                onQuickRematch={handleQuickRematch}
                onBackToLobby={handleBackToLobby}
              />
            )}
            {/* Show redirect notice when coming from training suggestion */}
            {returnTo === 'daily' && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-neo-orange text-neo-black px-4 py-2 rounded-full shadow-hard-sm border-2 border-neo-black text-sm font-medium animate-pulse">
                  {t('daily.trainingSuggestion.redirecting')}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function SinglePlayerViewWithErrorBoundary() {
  return (
    <FeatureErrorBoundary featureName="Single Player" showHomeButton={true}>
      <SinglePlayerView />
    </FeatureErrorBoundary>
  );
}

export default SinglePlayerViewWithErrorBoundary;
