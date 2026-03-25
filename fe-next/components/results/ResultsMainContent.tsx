'use client';

import React, { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, Type, Zap } from 'lucide-react';
import type { Player, WordObject } from '@/components/results/types';
import { assignConsolationCrowns } from '@/utils/consolationCrowns';

// New cinematic components
import ResultsHeroSection from '@/components/results/ResultsHeroSection';
import ResultsPodium from '@/components/results/ResultsPodium';
import ConsolationRows from '@/components/results/ConsolationRows';
import HighlightsBar from '@/components/results/HighlightsBar';
import { ResultsRevengeSection } from '@/components/results/ResultsRevengeSection';

// Keep existing components for stats/words detail
const ScoreRevealAnimation = dynamic(() => import('@/components/results/ScoreRevealAnimation'), { ssr: false });
const SeriesStandingsBanner = dynamic(() => import('@/components/results/SeriesStandingsBanner'), { ssr: false });

import type { GameModeOption } from '@/components/GameModeSelector';
import type { SeriesStanding } from '@/hooks/useSeriesTracker';

import { ResultsWordsSection } from '@/components/results/ResultsWordsSection';


// ==============================================
// TYPES
// ==============================================

interface WinStreakData {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

/** Translation function type */
type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ResultsMainContentProps {
  sortedScores: Player[];
  nearMisses: any[];
  isHost: boolean;
  onStartGame: () => void;
  onMarkReady: () => void;
  onExit: () => void;
  winStreakData: WinStreakData | null;
  isAuthenticated: boolean;
  currentPlayerData: Player | null;
  isCurrentUserWinner: boolean;
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  currentPlayerRank: number;
  scoreRevealComplete: boolean;
  setScoreRevealComplete: (complete: boolean) => void;
  normalizeUsername: (name: string | undefined | null) => string;
  username: string | undefined;
  gameCode?: string;
  onReturnToRoom?: () => void;
  isBotsOnlyGame: boolean;
  isCurrentPlayerReady: boolean;
  readyUsernames: string[];
  duplicateRuleDisabled: boolean;
  onShowDetails?: () => void;
  t: TFunction;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
  seriesStandings?: SeriesStanding[];
  seriesRoundNumber?: number;
  gameMode?: string;
  missedWords?: Array<{ word: string; score: number; foundBy: string[] }>;
  emojiReactions?: Array<{ id: string; emoji: string; username: string; timestamp: number }>;
  hideInlineCta?: boolean;
  allPlayerWords?: Record<string, WordObject[]>;
  gameDuration?: number;
  /** All player words for crown + MVP computation */
  /** Word Hunt summary */
  wordHuntSummary?: {
    targetWord: string;
    playerLives: Record<string, number>;
    eliminatedPlayers: string[];
    targetFoundBy: string | null;
    survivalTime?: number;
  };
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * ResultsMainContent - Cinematic results view
 *
 * YOU-FIRST order: Hero → Podium → ConsolationRows → Highlights → Revenge → Details
 */
export const ResultsMainContent: React.FC<ResultsMainContentProps> = ({
  sortedScores,
  currentPlayerData,
  currentPlayerValidWords,
  currentPlayerRank,
  scoreRevealComplete,
  setScoreRevealComplete,
  normalizeUsername,
  username,
  gameMode,
  missedWords,
  seriesStandings,
  seriesRoundNumber,
  t,
  allPlayerWords,
  gameDuration: _gameDuration,
  wordHuntSummary,
}) => {
  const reducedMotion = useReducedMotion();
  const { dir: _dir } = useLanguage();

  // Derived data
  const winnerScore = sortedScores[0]?.score ?? 0;
  const gapToWinner = currentPlayerRank > 1 ? winnerScore - (currentPlayerData?.score ?? 0) : 0;
  const isWordHunt = gameMode === 'word-hunt';
  const isMultiplayer = sortedScores.length > 1;

  // Auto-complete score reveal for single-player/bots
  useEffect(() => {
    if (!isMultiplayer && !scoreRevealComplete) {
      setScoreRevealComplete(true);
    }
  }, [isMultiplayer, scoreRevealComplete, setScoreRevealComplete]);

  // Split players: top 3 for podium, 4th+ for consolation rows
  const podiumPlayers = useMemo(() => sortedScores.slice(0, 3), [sortedScores]);
  const consolationPlayers = useMemo(() => sortedScores.slice(3), [sortedScores]);

  // Assign consolation crowns to 4th+ players
  const consolationCrowns = useMemo(() => {
    const topThree = podiumPlayers.map(p => p.username);
    const playersWithStats = sortedScores.map(p => {
      const words = allPlayerWords?.[p.username]?.map(w => ({
        word: typeof w === 'string' ? w : (w as any).word || '',
        score: typeof w === 'string' ? 0 : (w as any).score || 0,
      }));
      return {
        username: p.username,
        score: p.score,
        wordsFoundCount: words?.length || p.allWords?.length || 0,
        allWords: words || p.allWords?.map(w => ({ word: w.word, score: w.score || 0 })),
      };
    });
    return assignConsolationCrowns(playersWithStats, topThree);
  }, [sortedScores, podiumPlayers, allPlayerWords]);

  // Compute highlights stats
  const highlightStats = useMemo(() => {
    if (!currentPlayerData) return [];
    const longestWord = currentPlayerValidWords.reduce(
      (best, w) => (w.word.length > best.length ? w.word : best),
      ''
    );
    return [
      {
        label: t('results.bestWord') || 'Best Word',
        value: longestWord.toUpperCase() || '—',
        icon: <Sparkles className="w-3 h-3" />,
        color: 'text-neo-pink',
      },
      {
        label: t('results.wordsFound') || 'Words Found',
        value: currentPlayerValidWords.length,
        icon: <Type className="w-3 h-3" />,
        color: 'text-neo-lime',
      },
      {
        label: t('results.score') || 'Score',
        value: currentPlayerData.score.toLocaleString(),
        icon: <Zap className="w-3 h-3" />,
        color: 'text-neo-orange',
      },
    ];
  }, [currentPlayerData, currentPlayerValidWords, t]);

  // Word Hunt status for current player
  const wordHuntStatus = useMemo(() => {
    if (!isWordHunt || !wordHuntSummary || !username) return undefined;
    return wordHuntSummary.eliminatedPlayers.includes(username) ? 'eliminated' as const : 'survived' as const;
  }, [isWordHunt, wordHuntSummary, username]);

  return (
    <div className="space-y-6">
      {/* Score Reveal Animation (before everything) */}
      {isMultiplayer && !scoreRevealComplete && (
        <ScoreRevealAnimation
          players={sortedScores.map(p => ({
            username: p.username,
            finalScore: p.score,
            avatar: p.avatar,
            isCurrentPlayer: normalizeUsername(p.username) === normalizeUsername(username),
          }))}
          currentUsername={username}
          duration={2500}
          onComplete={() => setScoreRevealComplete(true)}
        />
      )}

      {/* After reveal: cinematic results in YOU-FIRST order */}
      {scoreRevealComplete && (
        <>
          {/* 1. YOUR RESULT HERO */}
          {currentPlayerData && (
            <ResultsHeroSection
              rank={currentPlayerRank}
              score={currentPlayerData.score}
              username={currentPlayerData.username}
              avatar={currentPlayerData.avatar}
              winnerScore={winnerScore}
              totalPlayers={sortedScores.length}
              isWordHunt={isWordHunt}
              wordHuntStatus={wordHuntStatus}
              wordHuntTarget={wordHuntSummary?.targetWord}
              wordsFound={currentPlayerValidWords.length}
              t={t}
            />
          )}

          {/* 2. TOP 3 PODIUM */}
          {isMultiplayer && podiumPlayers.length >= 2 && (
            <ResultsPodium
              players={podiumPlayers}
              currentUsername={username}
              isWordHunt={isWordHunt}
              t={t}
            />
          )}

          {/* 3. CONSOLATION ROWS (4th+ with archetype titles) */}
          {consolationPlayers.length > 0 && (
            <ConsolationRows
              players={consolationPlayers}
              crowns={consolationCrowns}
              currentUsername={username}
              t={t}
            />
          )}

          {/* 4. HIGHLIGHTS BAR */}
          {currentPlayerData && (
            <HighlightsBar stats={highlightStats} />
          )}

          {/* 5. REVENGE CARD */}
          {isMultiplayer && currentPlayerData && sortedScores.length > 1 && (
            <ResultsRevengeSection
              sortedScores={sortedScores}
              currentPlayerData={currentPlayerData}
              currentPlayerRank={currentPlayerRank}
              gapToWinner={gapToWinner}
              gameMode={gameMode}
              reducedMotion={reducedMotion}
              revengeDelay={0.3}
              t={t}
              missedWords={missedWords}
            />
          )}

          {/* Series Standings */}
          {seriesStandings && seriesRoundNumber && seriesRoundNumber >= 2 && (
            <SeriesStandingsBanner
              standings={seriesStandings}
              roundNumber={seriesRoundNumber}
              currentUsername={username}
              t={t}
            />
          )}

          {/* Stats + Words Detail */}
          {currentPlayerData && (
            <ResultsWordsSection
              currentPlayerData={currentPlayerData}
              currentPlayerValidWords={currentPlayerValidWords}
              currentPlayerRank={currentPlayerRank}
              reducedMotion={reducedMotion}
              statsDelay={0.4}
              wordsDelay={0.5}
              isStatsVisible
              isWordsVisible
              t={t}
            />
          )}

          {/* Missed Words rendered in ResultsDetailsContent below */}
        </>
      )}
    </div>
  );
};

export default ResultsMainContent;
