'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Trophy, Star, Users } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import RoomChat from '@/components/RoomChat';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type {
  WordObject,
  Player,
  XpGainedData,
  LevelUpData,
} from '@/components/results/types';

// Dynamic imports for heavy components
const ResultsPlayerCard = dynamic(() => import('@/components/results/ResultsPlayerCard'), { ssr: false });
const ConsolidatedPlayerCard = dynamic(() => import('@/components/results/ConsolidatedPlayerCard'), { ssr: false });
const ShareWinPrompt = dynamic(() => import('@/components/results/ShareWinPrompt'), { ssr: false });
const MissedWordsComponent = dynamic(() => import('@/components/results/MissedWords'), { ssr: false });
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
import CrazyGamesBanner from '@/components/CrazyGamesBanner';
const BlastResultsSummary = dynamic(() => import('@/components/results/BlastResultsSummary'), { ssr: false });
const WordHuntResultsSummary = dynamic(() => import('@/components/results/WordHuntResultsSummary'), { ssr: false });

// ==============================================
// TYPES
// ==============================================

/** Achievement type matching ShareWinPrompt */
interface Achievement {
  id?: string;
  key?: string;
  icon?: string;
  name?: string;
}

interface ShareCardStats {
  maxCombo: number;
  longestWord: string;
}

/** Translation function type */
type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ResultsDetailsContentProps {
  /** Current player's data */
  currentPlayerData: Player | null;
  /** Current player's rank */
  currentPlayerRank: number;
  /** Total sorted scores */
  sortedScores: Player[];
  /** Winner player data */
  winner: Player | null;
  /** Map of all player words by username */
  allPlayerWords: Record<string, WordObject[]>;
  /** XP gained data for current player */
  xpGainedData: XpGainedData | null;
  /** Level up data for current player */
  levelUpData: LevelUpData | null;
  /** Current player's archetype */
  currentPlayerArchetype: PlayerArchetype | null;
  /** Whether duplicate rule is disabled */
  duplicateRuleDisabled: boolean;
  /** Whether current user won */
  isCurrentUserWinner: boolean;
  /** Current username */
  username: string | undefined;
  /** Current player's valid words */
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  /** Achievements earned */
  achievements?: Achievement[];
  /** Game code (multiplayer) */
  gameCode?: string;
  /** Share card stats */
  shareCardStats: ShareCardStats;
  /** Other players (excluding current user) */
  otherPlayers: Player[];
  /** Map of player archetypes by username */
  playerArchetypes: Map<string, PlayerArchetype>;
  /** Missed words array */
  missedWords: Array<{ word: string; score: number; foundBy: string[] }>;
  /** Whether current user is host */
  isHost: boolean;
  /** Win streak current count */
  currentStreakCount: number;
  /** Translation function */
  t: TFunction;
  /** Whether to hide rank and score in player card (desktop) */
  hideRankAndScore?: boolean;
  /** Show CrazyGames banner */
  showBanner?: boolean;
  /** Banner size for CrazyGames */
  bannerSize?: '320x50' | '300x250';
  /** Resolved game mode */
  gameMode?: string;
  /** Blast mode results data */
  blastResults?: { movesUsed: number; tilesCleared: number; tileBonus: number };
  /** Word Hunt mode results data */
  wordHuntResults?: { targetWord: string; foundTarget: boolean; isFirstFinder: boolean; survivalTime: number; discoveryWords: number };
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * ResultsDetailsContent - Reusable details view content
 *
 * Contains player performance card, share prompt, other players,
 * performance chart, missed words, and room chat.
 * Used across mobile, desktop, and landscape layouts.
 */
export const ResultsDetailsContent: React.FC<ResultsDetailsContentProps> = ({
  currentPlayerData,
  currentPlayerRank,
  sortedScores,
  winner,
  allPlayerWords,
  xpGainedData,
  levelUpData,
  currentPlayerArchetype,
  duplicateRuleDisabled,
  isCurrentUserWinner,
  username,
  currentPlayerValidWords,
  achievements,
  gameCode,
  shareCardStats,
  otherPlayers,
  playerArchetypes,
  missedWords,
  isHost,
  currentStreakCount,
  t,
  hideRankAndScore = false,
  showBanner = false,
  bannerSize = '300x250',
  gameMode,
  blastResults,
  wordHuntResults,
}) => {
  // Derived state
  const hasZeroScore = currentPlayerData?.score === 0 || currentPlayerValidWords.length === 0;

  return (
    <div className="space-y-3">
      {/* Full Player Performance Card - Shows detailed breakdown */}
      {currentPlayerData && currentPlayerRank > 0 && (
        <ConsolidatedPlayerCard
          player={currentPlayerData}
          rank={currentPlayerRank}
          totalPlayers={sortedScores.length}
          winnerScore={winner?.score || 0}
          allPlayerWords={allPlayerWords}
          xpGainedData={xpGainedData}
          levelUpData={levelUpData}
          archetype={currentPlayerArchetype}
          duplicateRuleDisabled={duplicateRuleDisabled}
          hideRankAndScore={hideRankAndScore}
        />
      )}

      {/* Mode-specific results summary */}
      {gameMode === 'blast' && blastResults && (
        <BlastResultsSummary {...blastResults} />
      )}
      {gameMode === 'word-hunt' && wordHuntResults && (
        <WordHuntResultsSummary {...wordHuntResults} />
      )}

      {/* Share Prompt */}
      {currentPlayerData && gameCode && username && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (isCurrentUserWinner || (currentPlayerData.score || 0) >= 30) && (
        <ShareWinPrompt
          isWinner={isCurrentUserWinner}
          username={username}
          score={currentPlayerData.score || 0}
          wordCount={currentPlayerValidWords.length}
          achievements={achievements}
          gameCode={gameCode}
          streakDays={isCurrentUserWinner ? currentStreakCount : 0}
          compact={!isCurrentUserWinner}
          maxCombo={shareCardStats.maxCombo}
          archetype={currentPlayerArchetype}
          placement={currentPlayerRank}
          totalPlayers={sortedScores.length}
          longestWord={shareCardStats.longestWord}
        />
      )}

      {/* Other Players */}
      {otherPlayers.length > 0 && (
        <CollapsibleSection
          title={t('results.otherPlayers') || 'Other Players'}
          icon={<Users className="w-4 h-4" />}
          badge={otherPlayers.length}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-2">
            {otherPlayers.map((player) => {
              const originalIndex = sortedScores.findIndex(p => p.username === player.username);
              return (
                <ResultsPlayerCard
                  key={player.username}
                  player={player}
                  index={originalIndex}
                  allPlayerWords={allPlayerWords}
                  currentUsername={username}
                  isWinner={originalIndex === 0}
                  xpGainedData={null}
                  levelUpData={null}
                  duplicateRuleDisabled={duplicateRuleDisabled}
                  archetype={playerArchetypes.get(player.username) || null}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Performance Chart */}
      <CollapsibleSection
        title={t('results.yourProgress') || 'Your Progress'}
        icon={<Trophy className="w-4 h-4" />}
        defaultExpanded={false}
        variant="tertiary"
        className="shadow-hard"
      >
        <PerformanceChart currentScore={currentPlayerData?.score} gamesLimit={10} />
      </CollapsibleSection>

      {/* Missed Words */}
      {missedWords.length > 0 && (
        <CollapsibleSection
          title={t('results.missedWords') || 'Words You Missed'}
          icon={<Star className="w-4 h-4" />}
          badge={missedWords.length}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <MissedWordsComponent missedWords={missedWords} maxDisplay={10} />
        </CollapsibleSection>
      )}

      {/* Room Chat */}
      {gameCode && sortedScores.length > 1 && username && (
        <RoomChat username={username} isHost={isHost} gameCode={gameCode} className="max-h-[350px]" />
      )}

      {/* CrazyGames Banner Ad */}
      {showBanner && (
        <div className="flex justify-center py-2">
          <CrazyGamesBanner size={bannerSize} />
        </div>
      )}
    </div>
  );
};

export default ResultsDetailsContent;
