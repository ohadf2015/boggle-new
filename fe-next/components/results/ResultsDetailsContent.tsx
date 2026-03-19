'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Trophy, Star, Users, Check } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import RoomChat from '@/components/RoomChat';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/utils/utils';
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
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
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
  /** Resolved game mode */
  gameMode?: string;
  /** Blast mode results data */
  blastResults?: { movesUsed: number; tilesCleared: number; tileBonus: number; playerStats?: Record<string, import('@/shared/types/game').BlastPlayerStats> };
  /** Word Hunt mode results data */
  wordHuntResults?: { targetWord: string; foundTarget: boolean; isFirstFinder: boolean; survivalTime: number; discoveryWords: number; playerResults?: Array<{ username: string; score: number; survived: boolean; lifeRemaining: number }>; currentUsername?: string };
  /** Whether the current player has marked ready (multiplayer) */
  isCurrentPlayerReady?: boolean;
  /** Handler to mark ready from details tab */
  onMarkReady?: () => void;
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
  gameMode,
  blastResults,
  wordHuntResults,
  isCurrentPlayerReady,
  onMarkReady,
}) => {
  const { language } = useLanguage();
  return (
    <div className="space-y-3">
      {/* Game-mode specific summary */}
      {gameMode === 'blast' && blastResults && (
        <BlastResultsSummary
          movesUsed={blastResults.movesUsed}
          tilesCleared={blastResults.tilesCleared}
          tileBonus={blastResults.tileBonus}
          playerStats={blastResults.playerStats}
        />
      )}
      {gameMode === 'word-hunt' && wordHuntResults && (
        <WordHuntResultsSummary
          targetWord={wordHuntResults.targetWord}
          foundTarget={wordHuntResults.foundTarget}
          isFirstFinder={wordHuntResults.isFirstFinder}
          survivalTime={wordHuntResults.survivalTime}
          discoveryWords={wordHuntResults.discoveryWords}
          playerResults={wordHuntResults.playerResults}
          currentUsername={wordHuntResults.currentUsername}
        />
      )}

      {/* Full Player Performance Card - Shows detailed breakdown */}
      {currentPlayerData && currentPlayerRank > 0 && (
        <ConsolidatedPlayerCard
          player={currentPlayerData}
          rank={currentPlayerRank}
          totalPlayers={sortedScores.length}
          winnerScore={winner?.score || 0}
          xpGainedData={xpGainedData}
          levelUpData={levelUpData}
          archetype={currentPlayerArchetype}
          duplicateRuleDisabled={duplicateRuleDisabled}
          hideRankAndScore={hideRankAndScore}
        />
      )}

      {/* Share Prompt removed from multiplayer results — decluttered per redesign */}

      {/* Other Players — auto-expand in 1v1 for natural word comparison */}
      {otherPlayers.length > 0 && (
        <CollapsibleSection
          title={otherPlayers.length === 1
            ? `${otherPlayers[0].username} ${t('results.foundWords')}`
            : (t('results.otherPlayers'))
          }
          icon={<Users className="w-4 h-4" />}
          badge={otherPlayers.length === 1 ? undefined : otherPlayers.length}
          defaultExpanded={otherPlayers.length === 1}
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

      {/* TurningPointCard + ComparativeInsights removed — decluttered per redesign */}

      {/* Performance Chart */}
      <CollapsibleSection
        title={t('results.yourProgress')}
        icon={<Trophy className="w-4 h-4" />}
        defaultExpanded={false}
        variant="tertiary"
        className="shadow-hard"
      >
        <PerformanceChart currentScore={currentPlayerData?.score} gamesLimit={10} />
      </CollapsibleSection>

      {/* Top Missed Word — single highlight instead of full list */}
      {missedWords.length > 0 && (() => {
        const topMissed = [...missedWords].sort((a, b) => b.score - a.score)[0];
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-neo border border-white/10"
          >
            <Star className="w-4 h-4 text-neo-lime flex-shrink-0" />
            <span className="text-xs font-bold text-slate-300 uppercase">{t('results.topMissedWord')}</span>
            <span className="font-black text-sm text-white uppercase tracking-wide">
              {language === 'he' ? applyHebrewFinalLetters(topMissed.word) : topMissed.word}
            </span>
            <span className="text-xs font-black bg-neo-lime/20 text-neo-lime px-1.5 py-0.5 rounded-sm">
              +{topMissed.score}
            </span>
          </motion.div>
        );
      })()}

      {/* Room Chat */}
      {gameCode && sortedScores.length > 1 && username && (
        <RoomChat username={username} isHost={isHost} gameCode={gameCode} className="max-h-[350px]" />
      )}

      {/* Sticky Ready chip — lets multiplayer users mark ready without tab-switching */}
      {gameCode && !isHost && onMarkReady && isCurrentPlayerReady === false && (
        <div className="sticky bottom-4 z-20 flex justify-center pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onMarkReady}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-neo-lime text-neo-black font-black text-sm uppercase border-3 border-neo-black rounded-neo shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all"
          >
            <Check className="w-4 h-4" />
            {t('results.imReady')}
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ResultsDetailsContent;
