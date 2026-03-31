'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Users, Check } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type {
  WordObject,
  Player,
  XpGainedData,
  LevelUpData,
} from '@/components/results/types';

// Dynamic imports for heavy components
const ResultsPlayerCard = dynamic(() => import('@/components/results/ResultsPlayerCard'), { ssr: false });
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
  sortedScores,
  allPlayerWords,
  duplicateRuleDisabled,
  username,
  achievements,
  gameCode,
  otherPlayers,
  playerArchetypes,
  missedWords,
  isHost,
  t,
  hideRankAndScore = false,
  gameMode,
  blastResults,
  wordHuntResults,
  isCurrentPlayerReady,
  onMarkReady,
}) => {
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

      {/* Other Players — collapsed by default, compact cards */}
      {otherPlayers.length > 0 && (
        <CollapsibleSection
          title={otherPlayers.length === 1
            ? `${otherPlayers[0].username} ${t('results.foundWords')}`
            : (t('results.otherPlayers'))
          }
          icon={<Users className="w-4 h-4" />}
          badge={otherPlayers.length === 1 ? undefined : otherPlayers.length}
          summary={otherPlayers.slice(0, 3).map(p => p.username).join(', ') + (otherPlayers.length > 3 ? ` +${otherPlayers.length - 3}` : '')}
          defaultExpanded={hideRankAndScore}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-1.5">
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
                  compact
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}


      {/* Rarest Achievement */}
      {achievements && achievements.length > 0 && (() => {
        const rarest = achievements[achievements.length - 1];
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 250, damping: 14, delay: 0.4 }}
            className="flex items-center gap-3 px-4 py-3 bg-neo-navy border-3 border-neo-black shadow-hard-lg relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-[length:6px_6px]" />
            <motion.span
              className="text-2xl relative z-10"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.3, 1], rotate: [0, -10, 10, 0] }}
              transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
            >
              {rarest.icon || '🏆'}
            </motion.span>
            <div className="flex-1 min-w-0 relative z-10">
              <span className="text-[10px] font-black uppercase text-neo-cream/40 tracking-[0.2em] block">
                {t('results.rarestAchievement')}
              </span>
              <span className="text-sm font-black text-white truncate block">
                {rarest.name || rarest.key}
              </span>
            </div>
          </motion.div>
        );
      })()}

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
