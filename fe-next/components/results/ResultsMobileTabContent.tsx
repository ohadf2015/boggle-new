'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Trophy, Star, Check, Play, Share2, Users } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import RoomChat from '@/components/RoomChat';
import CrazyGamesBanner from '@/components/CrazyGamesBanner';
import type { PlayerResult, XpGainedData, LevelUpData, GameAchievement } from '@/types/components';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { NearMiss } from '@/components/results/NearMissCard';
import type { MissedWord } from '@/components/results/MissedWords';

// Dynamic imports for components
const ResultsWinnerBanner = dynamic(() => import('@/components/results/ResultsWinnerBanner'), { ssr: false });
const ResultsPlayerCard = dynamic(() => import('@/components/results/ResultsPlayerCard'), { ssr: false });
const ConsolidatedPlayerCard = dynamic(() => import('@/components/results/ConsolidatedPlayerCard'), { ssr: false });
const Top3Leaderboard = dynamic(() => import('@/components/results/Top3Leaderboard'), { ssr: false });
const ScoreRevealAnimation = dynamic(() => import('@/components/results/ScoreRevealAnimation'), { ssr: false });
const ShareWinPrompt = dynamic(() => import('@/components/results/ShareWinPrompt'), { ssr: false });
const PlayersReadyIndicator = dynamic(() => import('@/components/results/PlayersReadyIndicator'), { ssr: false });
const MissedWords = dynamic(() => import('@/components/results/MissedWords'), { ssr: false });
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
const NearMissCard = dynamic(() => import('@/components/results/NearMissCard'), { ssr: false });
const CompactResultsStats = dynamic(() => import('@/components/results/CompactResultsStats'), { ssr: false });
const RewardsSummary = dynamic(() => import('@/components/results/RewardsSummary'), { ssr: false });
const NextStepPrompt = dynamic(() => import('@/components/results/NextStepPrompt'), { ssr: false });
const BrainPointsDisplay = dynamic(() => import('@/components/results/BrainPointsDisplay'), { ssr: false });

// Type for words in allPlayerWords
export interface PlayerWordEntry {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
  fireRoundBonus?: number;
  isAiVerified?: boolean;
  isPendingValidation?: boolean;
  potentialScore?: number;
  invalidReason?: string;
  aiReason?: string;
}

export interface ResultsTabContentProps {
  // Current Player
  currentPlayerData: PlayerResult | null;
  currentPlayerRank: number;
  currentPlayerArchetype: PlayerArchetype | null;
  currentPlayerValidWords: Array<{ word: string; score: number; validated: boolean }>;
  username: string;

  // Sorted Scores & Players
  sortedScores: PlayerResult[];
  winner: PlayerResult | null;
  bannerPlayer: PlayerResult | null;
  bannerRank: number;
  isCurrentUserInBanner: boolean;
  otherPlayers: PlayerResult[];

  // Game State
  gameCode?: string;
  isHost: boolean;
  isCurrentUserWinner: boolean;
  isBotsOnlyGame: boolean;
  hasZeroScore: boolean;
  currentStreak: number;

  // Ready State
  isCurrentPlayerReady: boolean;
  readyUsernames: string[];

  // Score Reveal
  scoreRevealComplete: boolean;
  setScoreRevealComplete: (complete: boolean) => void;

  // Actions
  onMarkReady: () => void;
  onStartGame: () => void;
  onExitRoom: () => void;
  onTabChange: (tab: 'results' | 'details') => void;

  // Player Words & Archetypes
  allPlayerWords: Record<string, PlayerWordEntry[]>;
  playerArchetypes: Map<string, PlayerArchetype>;

  // XP & Rewards
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;
  nearMisses: NearMiss[];
  winStreakData: {
    currentStreak: number;
    bestStreak: number;
    isNewMilestone: boolean;
    previousStreak: number;
  } | null;
  brainPointsReward: { scoreDelta: number; newScore: number } | null;

  // Missed Words
  missedWords: MissedWord[];

  // Share Stats
  shareCardStats: { maxCombo?: number; longestWord?: string };

  // Rules
  duplicateRuleDisabled?: boolean;
  isAuthenticated: boolean;
  achievements?: GameAchievement[];

  // Translation
  t: (key: string) => string;
}

/**
 * Results Tab Content - Primary results view
 * Shows score, leaderboard, and play again CTA
 */
export function ResultsTabContent({
  currentPlayerData,
  currentPlayerRank,
  currentPlayerArchetype,
  currentPlayerValidWords,
  username,
  sortedScores,
  bannerPlayer,
  bannerRank,
  isCurrentUserInBanner,
  gameCode,
  isHost,
  isCurrentUserWinner,
  isBotsOnlyGame,
  hasZeroScore,
  isCurrentPlayerReady,
  readyUsernames,
  scoreRevealComplete,
  setScoreRevealComplete,
  onMarkReady,
  onStartGame,
  onExitRoom,
  onTabChange,
  nearMisses,
  winStreakData,
  brainPointsReward,
  duplicateRuleDisabled,
  isAuthenticated,
  t,
}: ResultsTabContentProps) {
  return (
    <div className="space-y-3">
      {/* Compact Celebration Banner */}
      {bannerPlayer && (
        <ResultsWinnerBanner winner={bannerPlayer} isCurrentUserWinner={isCurrentUserInBanner} rank={bannerRank} totalPlayers={sortedScores.length} />
      )}

      {/* Near-Miss Notifications - Motivate "one more game" */}
      {nearMisses.length > 0 && (
        <NearMissCard
          nearMisses={nearMisses}
          t={t}
          onPlayAgain={isHost ? onStartGame : onMarkReady}
          compact
        />
      )}

      {/* Rewards Summary - Shows win streak prominently for winners */}
      {winStreakData && winStreakData.currentStreak > 0 && (
        <RewardsSummary
          coinReward={null}
          isAuthenticated={isAuthenticated}
          winStreak={winStreakData}
          achievementsUnlocked={currentPlayerData?.achievements?.length || 0}
          isWinner={isCurrentUserWinner}
          onAchievementsClick={() => onTabChange('details')}
        />
      )}

      {/* Compact Stats Row - Using shared component */}
      {currentPlayerData && currentPlayerRank > 0 && (
        <CompactResultsStats
          wordCount={currentPlayerValidWords.length}
          accuracy={(() => {
            const total = currentPlayerData.allWords?.length || 0;
            const valid = currentPlayerValidWords.length;
            return total > 0 ? Math.round((valid / total) * 100) : 0;
          })()}
          archetype={currentPlayerArchetype}
        />
      )}

      {/* Brain Points Feedback */}
      <BrainPointsDisplay reward={brainPointsReward} variant="compact" />

      {/* Compact Top 3 Leaderboard with Score Reveal Animation */}
      {sortedScores.length > 1 && (
        scoreRevealComplete ? (
          <Top3Leaderboard players={sortedScores} currentUsername={username} compact />
        ) : (
          <ScoreRevealAnimation
            players={sortedScores.map(p => ({
              username: p.username,
              finalScore: p.score,
              avatar: p.avatar,
              isCurrentPlayer: p.username === username,
            }))}
            currentUsername={username}
            duration={2500}
            onComplete={() => setScoreRevealComplete(true)}
          />
        )
      )}

      {/* Primary CTA - Play Again / Ready / Next Step */}
      {gameCode && (
        isBotsOnlyGame ? (
          /* Bots-only game: Suggest Brain Training */
          <NextStepPrompt
            currentMode="multiplayer-bots"
            onBackToLobby={onExitRoom}
            variant="mobile"
            className="mt-2"
          />
        ) : (
          <>
            <div className="mt-2">
              {isHost ? (
                <motion.button
                  onClick={onStartGame}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-emerald-500 text-white font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-6 h-6" />
                  {t('hostView.startGame') || 'Start Game'}
                </motion.button>
              ) : isCurrentPlayerReady ? (
                <div className="bg-emerald-500 text-white border-3 border-neo-black rounded-neo p-3 shadow-hard">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="font-black uppercase">{t('results.youAreReady')}</span>
                  </div>
                  <p className="text-center text-sm text-white/80 mt-1">{t('results.waitingForHostToStart') || 'Waiting for host...'}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <motion.button
                    onClick={onMarkReady}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-neo-lime text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                  >
                    <Star className="w-6 h-6" />
                    {t('results.imReady')}
                  </motion.button>
                  <p className="text-center text-xs text-neo-cream/60">
                    {t('results.readyExplanation') || 'Tap to let the host know you want to play again'}
                  </p>
                </div>
              )}
            </div>

            {/* Share Button - Exit button is in header */}
            {currentPlayerData && gameCode && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (
              <button
                onClick={() => onTabChange('details')}
                className="w-full bg-neo-pink text-white font-bold text-sm px-4 py-2.5 uppercase border-2 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-1"
              >
                <Share2 className="w-4 h-4" />
                {t('results.share') || 'Share'}
              </button>
            )}
          </>
        )
      )}

      {/* Players Ready Status - Compact */}
      {gameCode && sortedScores.length > 1 && (
        <PlayersReadyIndicator
          players={sortedScores
            .filter(p => !isHost || p.username !== username)
            .map(p => ({ username: p.username, avatar: p.avatar, isBot: p.isBot }))}
          readyUsernames={readyUsernames}
          currentUsername={username}
          isHost={isHost}
        />
      )}

      {/* Large Room Notice - Compact */}
      {duplicateRuleDisabled && (
        <div className="bg-neo-cyan/20 border-2 border-neo-cyan rounded-neo p-2 text-center">
          <span className="text-xs text-neo-cyan font-bold">
            👥 {t('results.largeRoomMode') || 'Large Room Mode'} - {t('results.duplicateRuleDisabled') || 'duplicate words count'}
          </span>
        </div>
      )}

      {/* CrazyGames Banner Ad - Mobile Results */}
      <div className="flex justify-center py-2">
        <CrazyGamesBanner size="320x50" />
      </div>
    </div>
  );
}

/**
 * Details Tab Content - Detailed breakdown
 * Shows words, other players, charts, share, chat
 */
export function DetailsTabContent({
  currentPlayerData,
  currentPlayerRank,
  currentPlayerArchetype,
  currentPlayerValidWords,
  username,
  sortedScores,
  winner,
  otherPlayers,
  gameCode,
  isHost,
  isCurrentUserWinner,
  hasZeroScore,
  currentStreak,
  allPlayerWords,
  playerArchetypes,
  xpGainedData,
  levelUpData,
  missedWords,
  shareCardStats,
  duplicateRuleDisabled,
  achievements,
  t,
}: ResultsTabContentProps) {
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
        />
      )}

      {/* Share Prompt */}
      {currentPlayerData && gameCode && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (isCurrentUserWinner || currentPlayerData.score >= 30) && (
        <ShareWinPrompt
          isWinner={isCurrentUserWinner}
          username={username}
          score={currentPlayerData.score || 0}
          wordCount={currentPlayerValidWords.length}
          achievements={currentPlayerData.achievements || achievements || []}
          gameCode={gameCode}
          streakDays={isCurrentUserWinner ? currentStreak : 0}
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
          <MissedWords missedWords={missedWords} maxDisplay={10} />
        </CollapsibleSection>
      )}

      {/* Room Chat */}
      {gameCode && sortedScores.length > 1 && (
        <RoomChat username={username} isHost={isHost} gameCode={gameCode} className="max-h-[250px]" />
      )}
    </div>
  );
}

// Named exports are preferred - components are exported individually above
