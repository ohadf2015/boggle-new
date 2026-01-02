'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AutoHideHeader from '@/components/AutoHideHeader';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import PresetSelector from './PresetSelector';
import SinglePlayerLobby from './SinglePlayerLobby';
import SinglePlayerGame from './SinglePlayerGame';
import SinglePlayerResults from './SinglePlayerResults';
import { getHighScore, recordGameResult, getAllTimeBest } from './highScoreManager';
import { useGameMusic, type GamePhase } from '@/hooks/useGameMusic';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { incrementTrainingGames } from '@/utils/playerProgressStorage';
import { getMinWordLength, type PresetConfig } from './presetConfig';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';

export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge' | 'daily';
export type SinglePlayerPhase = 'preset-selection' | 'lobby' | 'playing' | 'results';

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

import type { GameCognitiveScores } from '@/shared/types/cognitiveScores';

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
  cognitiveScores?: GameCognitiveScores; // Brain training cognitive scores
  hintsUsed?: number; // Number of hints used (for cognitive scoring)
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

const SinglePlayerView: React.FC = () => {
  const { language: uiLanguage } = useLanguage();
  const router = useRouter();
  const [phase, setPhase] = useState<SinglePlayerPhase>('preset-selection');

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
  const musicPhase: GamePhase = phase === 'playing' ? 'waiting' : (phase === 'preset-selection' ? 'lobby' : phase);

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
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    // Daily mode redirects to the dedicated daily challenge page
    if (preset.id === 'daily' || preset.modes.includes('daily')) {
      router.push(`/${uiLanguage}/daily`);
      return;
    }

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
  }, [uiLanguage, router, generateBots]);

  // Handle custom game - go to detailed lobby
  const handleCustomGame = useCallback(() => {
    setPhase('lobby');
  }, []);

  const handleStartGame = (settings: Partial<SinglePlayerGameState>) => {
    setGameState(prev => ({ ...prev, ...settings }));
    setPhase('playing');
  };

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
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds]);

  const handlePlayAgain = () => {
    setResultsData(null);
    setPhase('preset-selection');
  };

  // Quick rematch - immediately start a new game with same settings
  const handleQuickRematch = () => {
    setResultsData(null);
    // Reset grid to null so a new grid is generated
    setGameState(prev => ({ ...prev, grid: null }));
    // Immediately go to playing phase
    setPhase('playing');
  };

  const handleBackToLobby = () => {
    setResultsData(null);
    setPhase('preset-selection');
  };

  // Back from custom lobby to preset selection
  const handleBackToPresets = () => {
    setPhase('preset-selection');
  };

  return (
    <div
      className="flex flex-col min-h-full bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy relative"
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
        {phase === 'preset-selection' && (
          <PresetSelector
            onSelectPreset={handleSelectPreset}
            onCustomGame={handleCustomGame}
            challengeInfo={{
              highScore: challengeHighScore?.score || null,
              wordCount: challengeHighScore?.wordCount,
              longestWord: challengeHighScore?.longestWord,
            }}
          />
        )}

        {phase === 'lobby' && (
          <SinglePlayerLobby
            initialSettings={gameState}
            onStartGame={handleStartGame}
            onBack={handleBackToPresets}
          />
        )}

        {phase === 'playing' && (
          <SinglePlayerGame
            settings={gameState}
            targetHighScore={currentHighScore?.score || null}
            onGameEnd={handleGameEnd}
            onQuit={handleBackToLobby}
          />
        )}

        {phase === 'results' && resultsData && (
          <SinglePlayerResults
            results={resultsData}
            mode={gameState.mode}
            onPlayAgain={handlePlayAgain}
            onQuickRematch={handleQuickRematch}
            onBackToLobby={handleBackToLobby}
          />
        )}
      </main>
    </div>
  );
};

export default SinglePlayerView;
