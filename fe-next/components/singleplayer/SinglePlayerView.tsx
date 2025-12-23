'use client';

import React, { useState, useMemo } from 'react';
import AutoHideHeader from '@/components/AutoHideHeader';
import SinglePlayerLobby from './SinglePlayerLobby';
import SinglePlayerGame from './SinglePlayerGame';
import SinglePlayerResults from './SinglePlayerResults';
import { getHighScore, recordGameResult } from './highScoreManager';
import { useGameMusic, type GamePhase } from '@/hooks/useGameMusic';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';

export type SinglePlayerMode = 'solo-bots' | 'practice' | 'challenge';
export type SinglePlayerPhase = 'lobby' | 'playing' | 'results';

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
}

export interface PlayerWordData {
  word: string;
  score: number;
  timestamp: number;
  timeSinceStart: number;
  isValid: boolean;
  comboBonus?: number;
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

const SinglePlayerView: React.FC = () => {
  const [phase, setPhase] = useState<SinglePlayerPhase>('lobby');
  const isLandscape = useMobileLandscape();
  const [gameState, setGameState] = useState<SinglePlayerGameState>({
    mode: 'solo-bots',
    difficulty: 'MEDIUM',
    language: 'en',
    grid: null,
    timerSeconds: 60, // 1 minute default
    bots: [DEFAULT_MEDIUM_BOT],
  });
  const [resultsData, setResultsData] = useState<SinglePlayerResultsData | null>(null);

  // Map SinglePlayerPhase to GamePhase for the music hook
  // 'playing' phase music is handled by SinglePlayerGame component
  const musicPhase: GamePhase = phase === 'playing' ? 'waiting' : phase;

  // Use shared music hook for lobby and results phases
  // Playing phase is handled by SinglePlayerGame for timer-based transitions
  useGameMusic({
    phase: musicPhase,
    enabled: phase !== 'playing', // Disable when playing - SinglePlayerGame handles it
  });

  // Get current high score for challenge mode
  const currentHighScore = useMemo(() => {
    if (gameState.mode !== 'challenge') return null;
    return getHighScore(gameState.difficulty, gameState.timerSeconds);
  }, [gameState.mode, gameState.difficulty, gameState.timerSeconds]);

  const handleStartGame = (settings: Partial<SinglePlayerGameState>) => {
    setGameState(prev => ({ ...prev, ...settings }));
    setPhase('playing');
  };

  const handleGameEnd = (results: SinglePlayerResultsData) => {
    // Record high score for challenge mode
    if (gameState.mode === 'challenge') {
      const longestWord = results.playerWords.reduce(
        (longest, word) => word.length > longest.length ? word : longest,
        ''
      );
      const highScoreResult = recordGameResult(
        results.playerScore,
        results.playerWords.length,
        longestWord,
        gameState.difficulty,
        gameState.timerSeconds
      );

      // Update results with high score info
      results.isNewHighScore = highScoreResult.isNewHighScore;
      results.previousHighScore = highScoreResult.previousBest;
      results.isNewAllTimeBest = highScoreResult.isNewAllTimeBest;
    }

    setResultsData(results);
    setPhase('results');
  };

  const handlePlayAgain = () => {
    setResultsData(null);
    setPhase('lobby');
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
    setPhase('lobby');
  };

  // Hide header completely in landscape mode during gameplay (not just auto-hide)
  const showHeader = !(phase === 'playing' && isLandscape);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      {showHeader && <AutoHideHeader />}

      <main className="max-w-6xl mx-auto px-2 xs:px-4 sm:px-6 py-8 landscape-content overflow-x-hidden">
        {phase === 'lobby' && (
          <SinglePlayerLobby
            initialSettings={gameState}
            onStartGame={handleStartGame}
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
