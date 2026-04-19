'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type {
  WordObject,
  Player,
  XpGainedData,
  LevelUpData,
} from '@/components/results/types';

import WordComparisonGrid from '@/components/results/WordComparisonGrid';
import MissedWords from '@/components/results/MissedWords';

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
  wordHuntResults?: { targetWord: string; foundTarget: boolean; isFirstFinder: boolean; survivalTime: number; discoveryWords: number; playerResults?: Array<{ username: string; score: number; survived: boolean; lifeRemaining: number; avatar?: { customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null } }>; currentUsername?: string };
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
  allPlayerWords,
  username,
  gameCode,
  otherPlayers,
  missedWords,
  isHost,
  t,
  isCurrentPlayerReady,
  onMarkReady,
}) => {
  return (
    <div className="space-y-3">
      {/* Multiplayer word comparison — who found what, current player's uniques highlighted */}
      {otherPlayers.length > 0 && (
        <WordComparisonGrid
          allPlayerWords={allPlayerWords}
          currentUsername={username || ''}
          t={t}
        />
      )}

      {/* Words on the board you missed — most conversation-driving data */}
      {missedWords && missedWords.length > 0 && (
        <MissedWords missedWords={missedWords} />
      )}

      {/* Sticky Ready chip — lets multiplayer users mark ready without tab-switching */}
      {gameCode && !isHost && onMarkReady && isCurrentPlayerReady === false && (
        <div className="sticky bottom-4 z-20 flex justify-center pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onMarkReady}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-neo-lime text-neo-black font-black text-sm uppercase border-3 border-neo-black rounded-neo shadow-hard hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed transition-all"
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
