'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Bot, BarChart3, Crown, Award, Hash, TrendingUp } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import PlayerInsights from '@/components/results/PlayerInsights';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import Top3Leaderboard, { type LeaderboardParticipant } from '@/components/results/Top3Leaderboard';
import { AchievementBadge } from '@/components/AchievementBadge';
import WordFeedbackModal from '@/components/voting/WordFeedbackModal';
import MissedWords from '@/components/results/MissedWords';
// Shared result components
import CompactResultsStats from '@/components/results/CompactResultsStats';
import BonusBadgesRow from '@/components/results/BonusBadgesRow';
import CoinRewardDisplay from '@/components/results/CoinRewardDisplay';
import BrainPointsDisplay from '@/components/results/BrainPointsDisplay';
import { SinglePlayerActions } from '@/components/results/ResultsActionButtons';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { updateGuestStatsAfterGame, getGuestStats } from '@/utils/guestManager';
import { logGameStart, logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import { getPointColor, getTextColor } from '@/components/results/utils';
// WordObject type used by useResultsData
import { getRankBgColor } from '@/utils/rankingStyles';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { applyHebrewFinalLetters } from '@/utils/utils';
import type { SinglePlayerResultsData, SinglePlayerMode } from './SinglePlayerView';
import { useResultsData } from './results';
import { useCoinContext, type CoinRewardResult } from '@/contexts/CoinContext';
import { TrainingAnalysisModal } from '@/components/training';
import { useSaveCognitiveScore } from '@/hooks/useSaveCognitiveScore';

// Dynamic import for PerformanceChart (heavy component)
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });

// Dynamic import for signup modal
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

// Session storage key for tracking if signup prompt was shown
const SIGNUP_PROMPT_SHOWN_KEY = 'boggle_sp_signup_shown';

// Confetti colors for each rank (matching Top3Leaderboard)
const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
};

interface SinglePlayerResultsProps {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  onPlayAgain: () => void;
  onQuickRematch?: () => void;
  onBackToLobby: () => void;
}

/**
 * SinglePlayerResults - Display game results for single player modes
 * Shows score, words found, ranking against bots, and high score status
 */
const SinglePlayerResults: React.FC<SinglePlayerResultsProps> = ({
  results,
  mode,
  onPlayAgain,
  onQuickRematch,
  onBackToLobby,
}) => {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, profile, updateProfile, loading: authLoading } = useAuth();
  const { awardGameCompletion } = useCoinContext();
  const isLandscape = useMobileLandscape();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [wordValidationQueue, setWordValidationQueue] = useState<string[]>([]);
  const [showTrainingAnalysis, setShowTrainingAnalysis] = useState(false);
  const [showWordValidation, setShowWordValidation] = useState(false);

  // Mobile tab navigation state - Consolidated to 2 tabs for reduced cognitive load
  type MobileTab = 'results' | 'details';
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('results');

  // Refs to prevent duplicate stat updates
  const hasUpdatedStatsRef = useRef(false);
  const hasAddedToHistoryRef = useRef(false);
  const hasLoggedGameSessionRef = useRef(false);
  const hasAwardedCoinsRef = useRef(false);
  const hasSavedAchievementsRef = useRef(false);
  const hasSavedCognitiveScoreRef = useRef(false);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  // Cognitive scoring hook
  const { saveCognitiveScore } = useSaveCognitiveScore();

  // Coin reward state - uses CoinRewardResult type from unified context
  const [coinReward, setCoinReward] = useState<CoinRewardResult | null>(null);

  // Brain points state
  const [brainPointsReward, setBrainPointsReward] = useState<{
    scoreDelta: number;
    newScore: number;
  } | null>(null);

  // Get player avatar from profile for leaderboard display
  const playerAvatar = useMemo(() => {
    if (!profile) return undefined;
    return {
      emoji: profile.avatar_emoji,
      color: profile.avatar_color,
      profilePictureUrl: profile.profile_picture_url,
      avatarImage: profile.avatar_image,
    };
  }, [profile]);

  // Use extracted hook for data processing
  const {
    allParticipants,
    playerRank,
    isWinner,
    playerInsights,
    wordsByPoints,
    sortedPointGroups,
    invalidWords,
    totalComboBonus,
    totalFireRoundBonus,
    botWordDetails,
    playerArchetype,
    missedWords,
  } = useResultsData(results, t, playerAvatar);

  // Celebration effect on mount - top 3 in solo-bots mode, or winner/high score
  // BUT only if player actually scored points (no confetti for 0 score)
  const hasMinimumScore = results.playerScore > 0;
  const shouldShowConfetti = hasMinimumScore && ((mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) || isWinner || results.isNewHighScore);

  useEffect(() => {
    if (shouldShowConfetti) {
      // Use rank-specific colors for top 3 in solo-bots mode
      const colors = (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3)
        ? RANK_CONFETTI_COLORS[playerRank]
        : ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7']; // Default celebration colors

      fireConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });
    }
  }, [shouldShowConfetti, mode, playerRank]);

  // Training analysis is shown manually via button click in practice mode
  // No auto-transition - let player decide when to continue

  // Update guest stats for single player games (only for unauthenticated users)
  useEffect(() => {
    if (isAuthenticated || hasUpdatedStatsRef.current) return;

    // Get the longest valid word from player's words
    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    const longestWord = validWords.reduce<string | undefined>(
      (longest, w) => (w.word.length > (longest?.length || 0) ? w.word : longest),
      undefined
    );

    // Calculate average word length
    const avgWordLength = validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length
      : 0;

    // Update guest stats with all tracked data
    updateGuestStatsAfterGame({
      score: results.playerScore,
      wordCount: validWords.length,
      longestWord,
      isWinner: isWinner,
      achievements: results.achievements?.map(a => a.key) || [],
      comboBonus: totalComboBonus,
      fireRoundBonus: totalFireRoundBonus,
      archetype: playerArchetype?.id,
      averageWordLength: avgWordLength,
    });

    hasUpdatedStatsRef.current = true;
  }, [isAuthenticated, results, isWinner, totalComboBonus, totalFireRoundBonus, playerArchetype]);

  // Save achievements to profile for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !profile || hasSavedAchievementsRef.current) return;

    const achievements = results.achievements?.map(a => a.key) || [];
    if (achievements.length === 0) return;

    async function saveAchievements() {
      try {
        // Merge new achievements with existing counts
        const currentCounts = profile?.achievement_counts || {};
        const updatedCounts = { ...currentCounts };

        for (const achievement of achievements) {
          updatedCounts[achievement] = (updatedCounts[achievement] || 0) + 1;
        }

        // Update profile with new achievement counts
        await updateProfile({
          achievement_counts: updatedCounts,
        });

        console.log('[SinglePlayerResults] Saved achievements to profile:', achievements);
      } catch (error) {
        console.error('[SinglePlayerResults] Failed to save achievements:', error);
      }
    }

    saveAchievements();
    hasSavedAchievementsRef.current = true;
  }, [isAuthenticated, profile, results.achievements, updateProfile]);

  // Log game session to database for admin analytics (runs for all users)
  useEffect(() => {
    if (hasLoggedGameSessionRef.current) return;

    async function logSession() {
      try {
        const validWords = results.playerWordData?.filter(w => w.isValid) || [];
        const wordDetails = validWords.map(w => ({
          word: w.word,
          points: w.score || 0,
          timestamp: Date.now()
        }));

        // Start and immediately complete the session (single player game is already done)
        const sessionId = await logGameStart({
          mode: 'singleplayer',
          language: language as string,
          userId: user?.id || null, // Pass user ID if authenticated
        });

        if (sessionId) {
          await logGameEnd(sessionId, {
            score: results.playerScore,
            wordsFound: formatWordsForLogging(validWords.map(w => w.word), wordDetails),
            durationSeconds: results.gameDuration || 0,
            completed: true,
            finalRank: playerRank,
          });
        }
      } catch (error) {
        console.error('Failed to log single player game session:', error);
      }
    }

    logSession();
    hasLoggedGameSessionRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- One-time logging, user?.id captured at mount
  }, [results, language, playerRank]);

  // Add game to history for the performance chart (runs for all users)
  useEffect(() => {
    if (hasAddedToHistoryRef.current) return;

    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    const totalAttempts = results.playerWordData?.length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
    const longestWordLength = validWords.reduce((max, w) => Math.max(max, w.word.length), 0);
    const avgWordLength = validWords.length > 0
      ? validWords.reduce((sum, w) => sum + w.word.length, 0) / validWords.length
      : 0;

    addGameToHistory({
      score: results.playerScore,
      wordCount: validWords.length,
      accuracy,
      rank: playerRank,
      totalPlayers: allParticipants.length,
      mode: 'single',
      isWinner: isWinner,
      longestWordLength,
      // Additional comprehensive tracking data
      duration: results.gameDuration,
      comboBonus: totalComboBonus,
      fireRoundBonus: totalFireRoundBonus,
      archetype: playerArchetype?.id,
      averageWordLength: avgWordLength,
      achievementCount: results.achievements?.length || 0,
    });

    hasAddedToHistoryRef.current = true;
  }, [results, playerRank, allParticipants.length, isWinner, totalComboBonus, totalFireRoundBonus, playerArchetype]);

  // Award coins for single player game completion using unified CoinContext
  // This handles both auth and guest modes, duplicate prevention, and DB sync
  useEffect(() => {
    if (hasAwardedCoinsRef.current) return;
    hasAwardedCoinsRef.current = true;

    // Generate a unique session ID for this game if not already present
    const sessionId = results.gameSessionId || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const awardCoins = async () => {
      const reward = await awardGameCompletion({
        sessionId,
        mode: 'singleplayer',
        score: results.playerScore,
        rank: playerRank,
        totalPlayers: allParticipants.length,
      });

      if (reward) {
        setCoinReward(reward);
      }
    };

    void awardCoins();
  }, [awardGameCompletion, results.playerScore, results.gameSessionId, playerRank, allParticipants.length]);

  // Save cognitive scores for brain training (authenticated users only)
  useEffect(() => {
    if (hasSavedCognitiveScoreRef.current) return;
    if (!user?.id) return; // Only for authenticated users
    if (mode === 'practice') return; // Do not save cognitive scores in practice mode

    // Calculate max combo from word data
    const validWords = results.playerWordData?.filter(w => w.isValid) || [];
    let maxCombo = 0;
    let currentCombo = 0;
    for (const word of validWords) {
      if (word.comboBonus && word.comboBonus > 0) {
        currentCombo++;
        maxCombo = Math.max(maxCombo, currentCombo);
      } else {
        currentCombo = 0;
      }
    }

    // Save cognitive score
    saveCognitiveScore({
      playerWordData: results.playerWordData || [],
      gameDuration: results.gameDuration || 0,
      gridSize: (results.grid?.length || 5) ** 2, // Total cells: 5x5=25, 7x7=49, etc.
      maxCombo,
      hintsUsed: 0, // Single player mode doesn't have hints
      gameSessionId: results.gameSessionId,
    }).then(cognitiveResult => {
      if (cognitiveResult) {
        console.log('[SinglePlayerResults] Cognitive scores saved:', cognitiveResult);
        // Set the state to display the brain points feedback
        setBrainPointsReward({
          scoreDelta: cognitiveResult.scoreDelta,
          newScore: cognitiveResult.overallScore
        });
      }
    });

    hasSavedCognitiveScoreRef.current = true;
  }, [user?.id, results.playerWordData, results.gameDuration, results.grid, results.gameSessionId, saveCognitiveScore, mode]);

  // Show signup prompt for guests who have played 2+ games
  useEffect(() => {
    // Skip if authenticated, has a user session (profile may still be loading), or auth is still loading
    if (isAuthenticated || user || authLoading) return;
    if (typeof window === 'undefined') return;

    // Check if already shown this session
    const alreadyShown = sessionStorage.getItem(SIGNUP_PROMPT_SHOWN_KEY);
    if (alreadyShown) return;

    // Check if user has played 2+ games total
    const stats = getGuestStats();
    if ((stats.games || 0) < 2) return;

    // Show modal after 2 seconds delay
    const timer = setTimeout(() => {
      setShowSignupModal(true);
      sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
    }, 3500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, authLoading]);


  // Show word validation modal after game results load
  // Limit to 2 words to avoid overwhelming the user with modals
  useEffect(() => {
    const wordsForValidation = results.botWordsForValidation;
    if (!wordsForValidation || wordsForValidation.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      const limitedQueue = wordsForValidation.slice(0, 2);
      setWordValidationQueue(limitedQueue);
      setShowWordValidation(true);
    }, 1500); // 1.5s delay so results render first
    return () => clearTimeout(timer);
  }, [results.botWordsForValidation]);


  // Handle word validation votes
  const handleWordVote = useCallback(async (voteType: 'like' | 'dislike', word?: string) => {
    if (!word || !results.gameSessionId) return;

    try {
      const response = await fetch('/api/single-player/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          language: results.language || 'en',
          voteType,
          sessionId: results.gameSessionId
        })
      });

      const result = await response.json();
      console.log(`Vote recorded: ${voteType} for ${word}`, result);
    } catch (error) {
      console.error('Failed to record vote:', error);
    }
  }, [results.gameSessionId, results.language]);

  // getRankIcon returns React elements - kept local as it's component-specific
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-neo-yellow text-xl" />;
    if (rank === 2) return <Medal className="text-slate-500 dark:text-slate-300 text-xl" />;
    if (rank === 3) return <Medal className="text-amber-600 text-xl" />;
    return <span className="text-neo-black/70 dark:text-white/70 font-bold">#{rank}</span>;
  };

  // getRankBgColor imported from @/utils/rankingStyles

  // Landscape mode layout - 2-column: score/grid left, words/actions right
  if (isLandscape) {
    const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;

    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-white p-2 gap-2">
        {/* Left column: Victory banner + Score + Grid */}
        <div className="w-1/2 flex flex-col items-center gap-2 overflow-y-auto">
          {/* Victory/Defeat indicator - compact */}
          <div className={cn(
            'w-full text-center py-2 rounded-neo border-2 border-neo-black',
            // Don't celebrate 0 score - use neutral colors
            (results.playerScore === 0 || validWordCount === 0)
              ? 'bg-neo-cream dark:bg-slate-700'
              : (isWinner || results.isNewHighScore)
                ? 'bg-gradient-to-r from-neo-yellow to-yellow-300'
                : 'bg-neo-cream dark:bg-slate-700'
          )}>
            <div className="flex items-center justify-center gap-2">
              {results.playerScore === 0 || validWordCount === 0 ? (
                <span className="font-black text-neo-black">🎯</span>
              ) : isWinner ? (
                <Trophy className="text-xl text-neo-black" />
              ) : results.isNewHighScore ? (
                <Crown className="text-xl text-neo-black" />
              ) : (
                <span className="font-black text-neo-black">#{playerRank}</span>
              )}
              <span className="font-black text-sm uppercase text-neo-black">
                {results.playerScore === 0 || validWordCount === 0
                  ? (t('singlePlayer.tryAgain') || 'Try Again!')
                  : validWordCount <= 2
                    ? (t('singlePlayer.keepPracticing') || 'Keep Practicing!')
                    : results.isNewHighScore
                      ? (t('singlePlayer.newHighScore') || 'New High Score!')
                      : isWinner && results.playerScore > 0
                        ? (t('singlePlayer.victory') || 'Victory!')
                        : (t('singlePlayer.gameOver') || 'Game Over')}
              </span>
            </div>
          </div>

          {/* Score display - compact */}
          <div className="flex items-center gap-4">
            <div className="bg-neo-yellow border-2 border-neo-black rounded-neo px-4 py-2 text-center shadow-hard-sm">
              <div className="text-2xl font-black text-neo-black">{results.playerScore}</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase text-neo-black/70">{t('common.score') || 'Score'}</div>
            </div>
            <div className="bg-neo-cream border-2 border-neo-black rounded-neo px-3 py-2 text-center">
              <div className="text-lg font-black text-neo-black">{validWordCount}</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase text-neo-black/70">{t('common.words') || 'Words'}</div>
            </div>
          </div>

          {/* Archetype Badge - compact for landscape */}
          {mode === 'solo-bots' && playerArchetype && (
            <PlayerArchetypeBadge archetype={playerArchetype} size="sm" />
          )}

          {/* Achievements - compact */}
          {results.achievements && results.achievements.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {results.achievements.slice(0, 3).map((achievement, i) => (
                <AchievementBadge key={i} achievement={achievement} index={i} />
              ))}
            </div>
          )}

          {/* Coins earned - compact for landscape */}
          <CoinRewardDisplay reward={coinReward} variant="inline" mode={isAuthenticated ? 'earned' : 'teasing'} />

          {/* Brain Points - compact for landscape */}
          <BrainPointsDisplay reward={brainPointsReward} variant="inline" />
        </div>

        {/* Right column: Words + Bot scores + Actions */}
        <div className="w-1/2 flex flex-col gap-2 overflow-y-auto">
          {/* Words by points - compact */}
          <div className="bg-neo-cream text-neo-black dark:bg-slate-800 dark:text-white border-2 border-neo-black rounded-neo p-2 flex-1 overflow-y-auto">
            <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-cream mb-2">
              {t('results.yourWords') || 'Your Words'}
            </h3>
            <div className="space-y-1">
              {sortedPointGroups.map(points => {
                const words = wordsByPoints[points] || [];
                if (words.length === 0) return null;
                return (
                  <div key={points} className="flex flex-wrap gap-1">
                    {words.map(w => (
                      <span
                        key={w.word}
                        className="px-2 py-0.5 rounded-neo border border-neo-black text-[10px] sm:text-xs font-bold"
                        style={{ backgroundColor: getPointColor(points), color: getTextColor(points) }}
                      >
                        {w.word.toUpperCase()} +{w.score}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bot rankings - compact (for solo-bots mode) */}
          {mode === 'solo-bots' && allParticipants.length > 1 && (
            <div className="bg-neo-cream text-neo-black dark:bg-slate-800 dark:text-white border-2 border-neo-black rounded-neo p-2">
              <h3 className="text-xs font-black uppercase text-neo-black/80 dark:text-neo-cream mb-1">
                {t('results.rankings') || 'Rankings'}
              </h3>
              <div className="space-y-1">
                {allParticipants.slice(0, 4).map((p, i) => (
                  <div
                    key={p.name}
                    className={cn(
                      'flex items-center justify-between px-2 py-1 rounded-neo border border-neo-black text-[10px]',
                      getRankBgColor(i + 1, p.isPlayer)
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {getRankIcon(i + 1)}
                      <span className="font-bold">{p.name}</span>
                      {p.isPlayer && <span className="text-[9px] sm:text-[10px] opacity-75">(you)</span>}
                    </span>
                    <span className="font-black">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missed Words - compact for landscape */}
          {mode === 'solo-bots' && missedWords.length > 0 && (
            <MissedWords missedWords={missedWords} maxDisplay={3} className="text-sm" />
          )}

          {/* Action buttons - landscape compact layout */}
          <SinglePlayerActions
            onQuickRematch={onQuickRematch}
            onPlayAgain={onPlayAgain}
            onBackToLobby={onBackToLobby}
            onViewTrainingProgress={mode === 'practice' ? () => setShowTrainingAnalysis(true) : undefined}
            variant="landscape"
            className="mt-auto"
          />
        </div>

        {/* Signup prompt for guests who have played multiple games */}
        <FirstWinSignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          variant="multiGames"
        />

        {/* Training Analysis Modal for practice mode */}
        <TrainingAnalysisModal
          isOpen={showTrainingAnalysis}
          onClose={() => setShowTrainingAnalysis(false)}
          returnTo={null}
        />
      </div>
    );
  }

  // Calculate key stats - similar to multiplayer ConsolidatedPlayerCard
  const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;
  const totalAttempts = results.playerWordData?.length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((validWordCount / totalAttempts) * 100) : 0;

  // Mobile tab configuration - Consolidated to 2 tabs for reduced cognitive load
  const mobileTabs = [
    { id: 'results' as const, icon: <Trophy className="w-5 h-5" />, label: t('results.results') || 'Results' },
    { id: 'details' as const, icon: <BarChart3 className="w-5 h-5" />, label: t('results.details') || 'Details' },
  ];

  // Render Results Tab Content (Primary: Score, Leaderboard, Action Buttons)
  const renderResultsTab = () => (
    <div className="space-y-3">
      {/* Victory/Results Banner */}
      <div className="relative">
        <ResultsWinnerBanner
          winner={{
            username: t('common.you') || 'You',
            score: results.playerScore,
          }}
          isCurrentUserWinner={true}
          rank={mode === 'solo-bots' ? playerRank : 1}
          variant={
            results.playerScore === 0 || validWordCount === 0 ? 'completion' :
              mode === 'practice' ? 'completion' :
                mode === 'challenge' && results.isNewHighScore ? (results.isNewAllTimeBest ? 'newRecord' : 'highScore') :
                  mode === 'challenge' ? 'completion' :
                    'ranking'
          }
          customMessage={
            results.playerScore === 0 || validWordCount === 0 ? (t('singlePlayer.tryAgain') || 'Try Again!') :
              validWordCount <= 2 ? (t('singlePlayer.keepPracticing') || 'Keep Practicing!') :
                mode === 'solo-bots' && isWinner && results.playerScore > 0 ? (t('singlePlayer.victory') || 'Victory!') :
                  mode === 'solo-bots' && playerRank <= 3 && results.playerScore > 0 ? undefined :
                    mode === 'solo-bots' ? (t('singlePlayer.gameOver') || 'Game Over') :
                      mode === 'practice' ? (t('singlePlayer.practiceComplete') || 'Practice Complete!') :
                        undefined
          }
          customAnnouncement={
            results.playerScore === 0 || validWordCount === 0 ? (t('singlePlayer.noWordsFound') || "Didn't find any words this time") :
              validWordCount <= 2 ? (validWordCount === 1
                ? (t('singlePlayer.fewWordsFoundSingular') || 'Found 1 word')
                : (t('singlePlayer.fewWordsFound') || 'Found {count} words').replace('{count}', String(validWordCount))) :
                mode === 'solo-bots' ? `#${playerRank} ${t('results.of') || 'of'} ${allParticipants.length}` :
                  mode === 'challenge' && results.previousHighScore && results.previousHighScore > results.playerScore
                    ? (t('challenge.shortOf') || '{diff} points short of your record').replace('{diff}', String(results.previousHighScore - results.playerScore))
                    : undefined
          }
          showConfetti={shouldShowConfetti}
        />
      </div>

      {/* Compact Stats - Unified with coins, brain points, and sparkline */}
      <CompactResultsStats
        wordCount={validWordCount}
        accuracy={accuracy}
        archetype={playerArchetype}
        coinReward={coinReward}
        coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
        brainPointsReward={brainPointsReward}
        currentScore={results.playerScore}
      />

      {/* Bonus Badges */}
      <BonusBadgesRow
        comboBonus={totalComboBonus}
        fireRoundBonus={totalFireRoundBonus}
      />

      {/* Compact Top 3 Leaderboard */}
      {mode === 'solo-bots' && results.botScores.length > 0 && (
        <Top3Leaderboard
          participants={allParticipants.map(p => ({
            name: p.name,
            score: p.score,
            isCurrentPlayer: p.isPlayer,
            isBot: !p.isPlayer,
            avatar: p.avatar,
          })) as LeaderboardParticipant[]}
          compact
        />
      )}

      {/* Achievements - Inline badges */}
      {results.achievements && results.achievements.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {results.achievements.slice(0, 4).map((ach, i) => (
            <AchievementBadge key={ach.key} achievement={ach} index={i} />
          ))}
          {results.achievements.length > 4 && (
            <button
              onClick={() => setMobileActiveTab('details')}
              className="text-xs text-neo-cyan underline font-bold"
            >
              +{results.achievements.length - 4} more
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <SinglePlayerActions
        onQuickRematch={onQuickRematch}
        onPlayAgain={onPlayAgain}
        onBackToLobby={onBackToLobby}
        onViewTrainingProgress={mode === 'practice' ? () => setShowTrainingAnalysis(true) : undefined}
        variant="mobile"
      />
    </div>
  );

  // Render Details Tab Content (Secondary: Words, Insights, Charts, Bot Details)
  const renderDetailsTab = () => (
    <div className="space-y-3">
      {/* Performance Insights - Expanded */}
      {playerInsights && (
        <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-neo-cyan" />
            <h3 className="text-sm font-black uppercase text-white">{t('results.performanceDetails') || 'Performance Details'}</h3>
          </div>
          <PlayerInsights insights={playerInsights} />
        </div>
      )}

      {/* Words List - Expanded */}
      {results.playerWordData && results.playerWordData.length > 0 && (
        <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-neo-lime" />
            <h3 className="text-sm font-black uppercase text-white">
              {t('results.yourWords') || 'Your Words'} ({results.playerWordData.length})
            </h3>
          </div>
          <div className="space-y-2">
            <WordPointsGroup
              wordsByPoints={wordsByPoints}
              sortedPointGroups={sortedPointGroups}
              t={t}
              mode="chip"
            />
            <InvalidWordsSection
              invalidWords={invalidWords}
              t={t}
              mode="chip"
            />
          </div>
        </div>
      )}

      {/* Performance Chart */}
      <CollapsibleSection
        title={t('results.performanceHistory') || 'Performance History'}
        icon={<TrendingUp className="w-4 h-4" />}
        defaultExpanded={false}
        variant="tertiary"
        className="shadow-hard"
      >
        <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
      </CollapsibleSection>

      {/* Missed Words */}
      {mode === 'solo-bots' && missedWords.length > 0 && (
        <MissedWords missedWords={missedWords} maxDisplay={5} />
      )}

      {/* All Achievements */}
      {results.achievements && results.achievements.length > 0 && (
        <CollapsibleSection
          title={t('hostView.achievements') || 'Achievements'}
          icon={<Award className="w-4 h-4" />}
          badge={results.achievements.length}
          defaultExpanded={true}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="flex flex-wrap gap-2">
            {results.achievements.map((ach, i) => (
              <AchievementBadge key={ach.key} achievement={ach} index={i} />
            ))}
          </div>
          <p className="text-xs text-white/50 mt-2 italic">
            {t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
          </p>
        </CollapsibleSection>
      )}

      {/* Bot Words Found - Compact cards showing each bot's words */}
      {mode === 'solo-bots' && botWordDetails.length > 0 && (
        <CollapsibleSection
          title={t('singlePlayer.botWordsFound') || 'Bot Words Found'}
          icon={<Bot className="w-4 h-4" />}
          badge={botWordDetails.reduce((sum, bot) => sum + bot.totalWords, 0)}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-3">
            {botWordDetails.map((bot) => {
              const gameLanguage = results.language || language;
              return (
                <div
                  key={bot.name}
                  className="bg-slate-800/50 border-2 border-slate-600 rounded-neo p-3"
                >
                  {/* Bot header - compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <span className="font-bold text-white text-sm">{bot.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60 font-medium">
                        {bot.totalWords} {t('singlePlayer.botWords') || 'words'}
                      </span>
                      <span className="text-sm font-black text-neo-yellow">{bot.score} pts</span>
                    </div>
                  </div>
                  {/* Words grid - directly visible */}
                  {bot.words && bot.words.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {bot.words.slice(0, 20).map((word, i) => {
                        const points = Math.max(word.length - 1, 1);
                        const displayWord = gameLanguage === 'he' ? applyHebrewFinalLetters(word) : word;
                        return (
                          <span
                            key={`${word}-${i}`}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase border border-neo-black/50 rounded"
                            style={{
                              backgroundColor: getPointColor(points),
                              color: getTextColor(points)
                            }}
                          >
                            {displayWord}
                            <span className="opacity-60 text-[9px]">+{points}</span>
                          </span>
                        );
                      })}
                      {bot.words.length > 20 && (
                        <span className="text-[10px] text-white/50 font-medium self-center">
                          +{bot.words.length - 20} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 italic">
                      {t('singlePlayer.noWordsToShow') || 'Word details not available'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* MOBILE VIEW - Tab-based layout (hidden on md+, shown on fold mobiles) */}
      <div className="md:hidden flex flex-col min-h-full">
        {/* Tab Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-28">
          <div className="max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileActiveTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {mobileActiveTab === 'results' && renderResultsTab()}
                {mobileActiveTab === 'details' && renderDetailsTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Fixed Bottom Tab Bar */}
        <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy text-neo-cream border-t-4 border-neo-black safe-area-bottom">
          <MobileTabBar
            tabs={mobileTabs}
            activeTab={mobileActiveTab}
            onTabChange={(id) => setMobileActiveTab(id as MobileTab)}
          />
        </div>
      </div>

      {/* DESKTOP/TABLET VIEW - Two-column side-by-side layout (hidden on mobile) */}
      <div className="hidden md:flex md:flex-col md:overflow-auto p-4 xl:p-6">
        {/* Two-Column Layout */}
        <div className="flex-1 w-full max-w-5xl mx-auto flex flex-row gap-6">
          {/* LEFT COLUMN: Results (Banner, Score, Leaderboard, Actions) */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            {/* Victory/Results Banner */}
            <ResultsWinnerBanner
              winner={{
                username: t('common.you') || 'You',
                score: results.playerScore,
              }}
              isCurrentUserWinner={true}
              rank={mode === 'solo-bots' ? playerRank : 1}
              variant={
                results.playerScore === 0 || validWordCount === 0 ? 'completion' :
                  mode === 'practice' ? 'completion' :
                    mode === 'challenge' && results.isNewHighScore ? (results.isNewAllTimeBest ? 'newRecord' : 'highScore') :
                      mode === 'challenge' ? 'completion' :
                        'ranking'
              }
              customMessage={
                results.playerScore === 0 || validWordCount === 0 ? (t('singlePlayer.tryAgain') || 'Try Again!') :
                  validWordCount <= 2 ? (t('singlePlayer.keepPracticing') || 'Keep Practicing!') :
                    mode === 'solo-bots' && isWinner && results.playerScore > 0 ? (t('singlePlayer.victory') || 'Victory!') :
                      mode === 'solo-bots' && playerRank <= 3 && results.playerScore > 0 ? undefined :
                        mode === 'solo-bots' ? (t('singlePlayer.gameOver') || 'Game Over') :
                          mode === 'practice' ? (t('singlePlayer.practiceComplete') || 'Practice Complete!') :
                            undefined
              }
              customAnnouncement={
                results.playerScore === 0 || validWordCount === 0 ? (t('singlePlayer.noWordsFound') || "Didn't find any words this time") :
                  validWordCount <= 2 ? (validWordCount === 1
                    ? (t('singlePlayer.fewWordsFoundSingular') || 'Found 1 word')
                    : (t('singlePlayer.fewWordsFound') || 'Found {count} words').replace('{count}', String(validWordCount))) :
                    mode === 'solo-bots' ? `#${playerRank} ${t('results.of') || 'of'} ${allParticipants.length}` :
                      mode === 'challenge' && results.previousHighScore && results.previousHighScore > results.playerScore
                        ? (t('challenge.shortOf') || '{diff} points short of your record').replace('{diff}', String(results.previousHighScore - results.playerScore))
                        : undefined
              }
              showConfetti={shouldShowConfetti}
            />

            {/* Compact Stats - Unified with coins, brain points, and sparkline */}
            <CompactResultsStats
              wordCount={validWordCount}
              accuracy={accuracy}
              archetype={playerArchetype}
              coinReward={coinReward}
              coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
              brainPointsReward={brainPointsReward}
              currentScore={results.playerScore}
            />

            {/* Bonus Badges */}
            <BonusBadgesRow comboBonus={totalComboBonus} fireRoundBonus={totalFireRoundBonus} />

            {/* Leaderboard (solo-bots mode) */}
            {mode === 'solo-bots' && results.botScores.length > 0 && (
              <Top3Leaderboard
                participants={allParticipants.map(p => ({
                  name: p.name,
                  score: p.score,
                  isCurrentPlayer: p.isPlayer,
                  isBot: !p.isPlayer,
                  avatar: p.avatar,
                })) as LeaderboardParticipant[]}
                compact
              />
            )}

            {/* Achievements - Inline badges */}
            {results.achievements && results.achievements.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {results.achievements.slice(0, 4).map((ach, i) => (
                  <AchievementBadge key={ach.key} achievement={ach} index={i} />
                ))}
                {results.achievements.length > 4 && (
                  <span className="text-xs text-neo-cyan font-bold">+{results.achievements.length - 4} more</span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div ref={actionButtonsRef}>
              <SinglePlayerActions
                onQuickRematch={onQuickRematch}
                onPlayAgain={onPlayAgain}
                onBackToLobby={onBackToLobby}
                onViewTrainingProgress={mode === 'practice' ? () => setShowTrainingAnalysis(true) : undefined}
                variant="desktop"
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Details (Performance, Words, Charts, Bot Details) */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            {/* Performance Insights */}
            {playerInsights && (
              <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-neo-cyan" />
                  <h3 className="text-sm font-black uppercase text-white">{t('results.performanceDetails') || 'Performance Details'}</h3>
                </div>
                <PlayerInsights insights={playerInsights} />
              </div>
            )}

            {/* Words List */}
            {results.playerWordData && results.playerWordData.length > 0 && (
              <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-3 shadow-hard">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-neo-lime" />
                  <h3 className="text-sm font-black uppercase text-white">
                    {t('results.yourWords') || 'Your Words'} ({results.playerWordData.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  <WordPointsGroup wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups} t={t} mode="chip" />
                  <InvalidWordsSection invalidWords={invalidWords} t={t} mode="chip" />
                </div>
              </div>
            )}

            {/* Performance Chart */}
            <CollapsibleSection
              title={t('results.performanceHistory') || 'Performance History'}
              icon={<TrendingUp className="w-4 h-4" />}
              defaultExpanded={false}
              variant="tertiary"
              className="shadow-hard"
            >
              <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
            </CollapsibleSection>

            {/* Missed Words */}
            {mode === 'solo-bots' && missedWords.length > 0 && (
              <MissedWords missedWords={missedWords} maxDisplay={5} />
            )}

            {/* Bot Words Found - Compact cards showing each bot's words */}
            {mode === 'solo-bots' && botWordDetails.length > 0 && (
              <CollapsibleSection
                title={t('singlePlayer.botWordsFound') || 'Bot Words Found'}
                icon={<Bot className="w-4 h-4" />}
                badge={botWordDetails.reduce((sum, bot) => sum + bot.totalWords, 0)}
                defaultExpanded={false}
                variant="tertiary"
                className="shadow-hard"
              >
                <div className="space-y-3">
                  {botWordDetails.map((bot) => {
                    const gameLanguage = results.language || language;
                    return (
                      <div
                        key={bot.name}
                        className="bg-slate-800/50 border-2 border-slate-600 rounded-neo p-3"
                      >
                        {/* Bot header - compact */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <Bot className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                            <span className="font-bold text-white text-sm">{bot.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/60 font-medium">
                              {bot.totalWords} {t('singlePlayer.botWords') || 'words'}
                            </span>
                            <span className="text-sm font-black text-neo-yellow">{bot.score} pts</span>
                          </div>
                        </div>
                        {/* Words grid - directly visible */}
                        {bot.words && bot.words.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {bot.words.slice(0, 20).map((word, i) => {
                              const points = Math.max(word.length - 1, 1);
                              const displayWord = gameLanguage === 'he' ? applyHebrewFinalLetters(word) : word;
                              return (
                                <span
                                  key={`${word}-${i}`}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase border border-neo-black/50 rounded"
                                  style={{
                                    backgroundColor: getPointColor(points),
                                    color: getTextColor(points)
                                  }}
                                >
                                  {displayWord}
                                  <span className="opacity-60 text-[9px]">+{points}</span>
                                </span>
                              );
                            })}
                            {bot.words.length > 20 && (
                              <span className="text-[10px] text-white/50 font-medium self-center">
                                +{bot.words.length - 20} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 italic">
                            {t('singlePlayer.noWordsToShow') || 'Word details not available'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* All Achievements (if more than 4) */}
            {results.achievements && results.achievements.length > 4 && (
              <CollapsibleSection
                title={t('hostView.achievements') || 'Achievements'}
                icon={<Award className="w-4 h-4" />}
                badge={results.achievements.length}
                defaultExpanded={false}
                variant="tertiary"
                className="shadow-hard"
              >
                <div className="flex flex-wrap gap-2">
                  {results.achievements.map((ach, i) => (
                    <AchievementBadge key={ach.key} achievement={ach} index={i} />
                  ))}
                </div>
                <p className="text-xs text-white/50 mt-2 italic">
                  {t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
                </p>
              </CollapsibleSection>
            )}
          </div>
        </div>
      </div>

      {/* Modals - Outside both mobile and desktop views */}
      {/* Word validation modal */}
      {showWordValidation && wordValidationQueue.length > 0 && (
        <WordFeedbackModal
          isOpen={showWordValidation}
          word={wordValidationQueue[0] || ''}
          submittedBy="Bot"
          submitterAvatar={{ emoji: '🤖', color: '#6366f1' }}
          wordQueue={wordValidationQueue.map(w => ({
            word: w,
            submittedBy: 'Bot',
            submitterAvatar: { emoji: '🤖', color: '#6366f1' }
          }))}
          timeoutSeconds={15}
          onVote={handleWordVote}
          onSkip={() => setShowWordValidation(false)}
          onTimeout={() => setShowWordValidation(false)}
        />
      )}

      {/* Signup prompt for guests */}
      <FirstWinSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        variant="multiGames"
      />

      {/* Training Analysis Modal for practice mode */}
      <TrainingAnalysisModal
        isOpen={showTrainingAnalysis}
        onClose={() => setShowTrainingAnalysis(false)}
        returnTo={null}
      />
    </div>
  );
};

export default SinglePlayerResults;
