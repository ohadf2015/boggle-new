'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, RotateCw, Home, Bot, BarChart3, Crown, Award, Settings, Sparkles, Hash, Target, ChevronDown, TrendingUp, Coins, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import PlayerInsights from '@/components/results/PlayerInsights';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import { WordPointsGroup, InvalidWordsSection } from '@/components/results/WordPointsGroup';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import ConfettiRetrigger from '@/components/results/ConfettiRetrigger';
import Top3Leaderboard, { type LeaderboardParticipant } from '@/components/results/Top3Leaderboard';
import { AchievementBadge } from '@/components/AchievementBadge';
import WordFeedbackModal from '@/components/voting/WordFeedbackModal';
import MissedWords from '@/components/results/MissedWords';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { fireConfetti } from '@/utils/confettiUtils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { updateGuestStatsAfterGame, getGuestStats } from '@/utils/guestManager';
import { logGameStart, logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import { getPointColor, getTextColor } from '@/components/results/utils';
import type { WordObject } from '@/components/results/types';
import { getRankBgColor } from '@/utils/rankingStyles';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { applyHebrewFinalLetters } from '@/utils/utils';
import type { SinglePlayerResultsData, SinglePlayerMode } from './SinglePlayerView';
import { useResultsData } from './results';
import { awardGameCoins } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';

// Dynamic import for PerformanceChart (heavy component)
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });

// Dynamic import for signup modal
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

// Session storage key for tracking if signup prompt was shown
const SIGNUP_PROMPT_SHOWN_KEY = 'boggle_sp_signup_shown';

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
  const isLandscape = useMobileLandscape();
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [wordValidationQueue, setWordValidationQueue] = useState<string[]>([]);
  const [showWordValidation, setShowWordValidation] = useState(false);

  // Collapsible section states - matching multiplayer pattern
  const [showDetails, setShowDetails] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // Mobile tab navigation state - Consolidated to 2 tabs for reduced cognitive load
  type MobileTab = 'results' | 'details';
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('results');

  // Refs to prevent duplicate stat updates
  const hasUpdatedStatsRef = useRef(false);
  const hasAddedToHistoryRef = useRef(false);
  const hasLoggedGameSessionRef = useRef(false);
  const hasAwardedCoinsRef = useRef(false);
  const hasSavedAchievementsRef = useRef(false);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  // Coin reward state
  const [coinReward, setCoinReward] = useState<{
    awarded: number;
    breakdown: { base: number; scoreBonus: number; placement: number };
  } | null>(null);

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
  } = useResultsData(results, t);

  // Celebration effect on mount - top 3 in solo-bots mode, or winner/high score
  // BUT only if player actually scored points (no confetti for 0 score)
  const hasMinimumScore = results.playerScore > 0;
  const shouldShowConfetti = hasMinimumScore && ((mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) || isWinner || results.isNewHighScore);

  // Confetti colors for each rank (matching Top3Leaderboard)
  const RANK_CONFETTI_COLORS: Record<number, string[]> = {
    1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
    2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
    3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
  };

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
          userId: null, // Will be set by the API if authenticated
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

  // Award coins for single player game completion
  useEffect(() => {
    if (hasAwardedCoinsRef.current) return;

    // Generate a unique session ID for this game if not already present
    const sessionId = results.gameSessionId || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const reward = awardGameCoins(
      sessionId,
      'singleplayer',
      results.playerScore,
      playerRank,
      allParticipants.length
    );

    if (reward) {
      setCoinReward(reward);

      // Sync coins to database for authenticated users
      if (user?.id && reward.awarded > 0) {
        syncCoinsToDatabase(
          user.id,
          reward.awarded,
          'Single Player Game',
          {
            sessionId,
            score: results.playerScore,
            rank: playerRank,
            totalPlayers: allParticipants.length
          }
        );
      }
    }

    hasAwardedCoinsRef.current = true;
  }, [results.playerScore, results.gameSessionId, playerRank, allParticipants.length, user?.id]);

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
  useEffect(() => {
    if (results.botWordsForValidation && results.botWordsForValidation.length > 0) {
      setTimeout(() => {
        setWordValidationQueue(results.botWordsForValidation || []);
        setShowWordValidation(true);
      }, 1500); // 1.5s delay so results render first
    }
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
              <div className="text-[8px] font-bold uppercase text-neo-black/70">{t('common.score') || 'Score'}</div>
            </div>
            <div className="bg-neo-cream border-2 border-neo-black rounded-neo px-3 py-2 text-center">
              <div className="text-lg font-black text-neo-black">{validWordCount}</div>
              <div className="text-[8px] font-bold uppercase text-neo-black/70">{t('common.words') || 'Words'}</div>
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
          {coinReward && (
            <div className="bg-neo-yellow border-2 border-neo-black rounded-neo px-3 py-1 text-center">
              <div className="flex items-center justify-center gap-1">
                <Coins className="w-3 h-3 text-neo-black" />
                <span className="font-black text-neo-black">+{coinReward.awarded}</span>
              </div>
              <div className="text-[8px] font-bold uppercase text-neo-black/70">{t('reveal.coins') || 'Coins'}</div>
            </div>
          )}
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
                        className="px-2 py-0.5 rounded-neo border border-neo-black text-[10px] font-bold"
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
                      {p.isPlayer && <span className="text-[8px] opacity-75">(you)</span>}
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
          <div className="flex flex-col gap-2 mt-auto">
            {onQuickRematch && (
              <Button
                size="sm"
                className="w-full py-2 bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black font-bold text-xs border-2 border-neo-black"
                onClick={onQuickRematch}
              >
                <RotateCw className="me-1 text-xs" />
                {t('common.rematch') || 'Rematch'}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                variant="cyan"
                size="sm"
                className="flex-1 py-2 font-bold text-xs border-2 border-neo-black"
                onClick={onPlayAgain}
              >
                <Settings className="me-1 text-xs" />
                {t('common.settings') || 'Settings'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 py-2 font-bold text-xs border-2 border-neo-black"
                onClick={onBackToLobby}
              >
                <Home className="me-1 text-xs" />
                {t('common.lobby') || 'Lobby'}
              </Button>
            </div>
          </div>
        </div>

        {/* Signup prompt for guests who have played multiple games */}
        <FirstWinSignupModal
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          variant="multiGames"
        />
      </div>
    );
  }

  // Calculate key stats - similar to multiplayer ConsolidatedPlayerCard
  const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;
  const totalAttempts = results.playerWordData?.length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((validWordCount / totalAttempts) * 100) : 0;
  const bestWord = results.playerWordData?.filter(w => w.isValid).reduce<{ word: string; score: number } | null>(
    (best, w) => (!best || (w.score || 0) > best.score) ? { word: w.word, score: w.score || 0 } : best,
    null
  );

  // Get rank-specific styling
  const getRankStyle = (rank: number) => {
    if (rank === 1) return { bg: 'bg-neo-yellow', text: 'text-neo-black' };
    if (rank === 2) return { bg: 'bg-slate-300', text: 'text-slate-800' };
    if (rank === 3) return { bg: 'bg-neo-orange', text: 'text-neo-black' };
    return { bg: 'bg-neo-cream', text: 'text-neo-black' };
  };
  const rankStyle = mode === 'solo-bots' ? getRankStyle(playerRank) : { bg: 'bg-neo-cyan', text: 'text-neo-black' };

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
        {shouldShowConfetti && (
          <div className="absolute top-2 end-2">
            <ConfettiRetrigger
              variant={mode === 'solo-bots' && playerRank <= 3 ? 'rank' : 'default'}
              rank={mode === 'solo-bots' ? playerRank : undefined}
              compact
            />
          </div>
        )}
      </div>

      {/* Compact Stats Card */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-3 shadow-hard">
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className={cn(
            'w-12 h-12 rounded-neo flex items-center justify-center border-3 border-neo-black font-black text-lg',
            rankStyle.bg, rankStyle.text
          )}>
            #{mode === 'solo-bots' ? playerRank : 1}
          </div>
          {/* Score & Stats */}
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-black text-white">{results.playerScore} <span className="text-sm text-white/60">{t('results.points') || 'pts'}</span></div>
            <div className="text-xs text-white/70 font-bold flex items-center gap-2 flex-wrap">
              <span>{validWordCount} {t('results.words') || 'words'}</span>
              <span>•</span>
              <span>{accuracy}% {t('results.accuracy') || 'accuracy'}</span>
              {playerArchetype && (
                <>
                  <span>•</span>
                  <span className="text-neo-cyan">{playerArchetype.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bonus Badges */}
        {(totalComboBonus > 0 || totalFireRoundBonus > 0) && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {totalComboBonus > 0 && (
              <span className="bg-neo-orange border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black text-xs font-black">
                ⚡ +{totalComboBonus}
              </span>
            )}
            {totalFireRoundBonus > 0 && (
              <span className="bg-neo-red border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream text-xs font-black">
                🔥 +{totalFireRoundBonus}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Coins Earned - Compact */}
      {coinReward && (
        <div className="bg-gradient-to-r from-neo-yellow to-amber-400 rounded-neo border-3 border-neo-black shadow-hard px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <Coins className="w-5 h-5 text-neo-black" />
            <span className="font-black text-xl text-neo-black">+{coinReward.awarded}</span>
            <span className="text-sm font-bold text-neo-black/70">{t('reveal.coins') || 'Coins'}</span>
          </div>
        </div>
      )}

      {/* Compact Top 3 Leaderboard */}
      {mode === 'solo-bots' && results.botScores.length > 0 && (
        <Top3Leaderboard
          participants={allParticipants.map(p => ({
            name: p.name,
            score: p.score,
            isCurrentPlayer: p.isPlayer,
            isBot: !p.isPlayer,
          })) as LeaderboardParticipant[]}
          headerText={t('common.leaderboard') || 'Leaderboard'}
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

      {/* Primary CTA - Quick Rematch */}
      {onQuickRematch && (
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Button
            size="lg"
            className="w-full py-4 text-xl shadow-hard-lg hover:shadow-hard-xl border-4 bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black font-black uppercase tracking-wider"
            onClick={onQuickRematch}
          >
            <RotateCw className="me-2 w-6 h-6" />
            {t('common.quickRematch') || 'Quick Rematch'}
          </Button>
        </motion.div>
      )}

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white hover:bg-neo-cream/50 dark:hover:bg-slate-700/50 border border-neo-black/20 dark:border-white/20"
          onClick={onPlayAgain}
        >
          <Settings className="me-1 w-3.5 h-3.5" />
          {t('common.settings') || 'Settings'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white hover:bg-neo-cream/50 dark:hover:bg-slate-700/50 border border-neo-black/20 dark:border-white/20"
          onClick={onBackToLobby}
        >
          <Home className="me-1 w-3.5 h-3.5" />
          {t('common.lobby') || 'Lobby'}
        </Button>
      </div>
    </div>
  );

  // Render Details Tab Content (Secondary: Words, Insights, Charts, Bot Details)
  const renderDetailsTab = () => (
    <div className="space-y-3">
      {/* Performance Insights - Expanded */}
      {playerInsights && (
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-3 shadow-hard">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-neo-cyan" />
            <h3 className="text-sm font-black uppercase text-white">{t('results.performanceDetails') || 'Performance Details'}</h3>
          </div>
          <PlayerInsights insights={playerInsights} />
        </div>
      )}

      {/* Words List - Expanded */}
      {results.playerWordData && results.playerWordData.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-3 shadow-hard">
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

      {/* Bot Words Details */}
      {mode === 'solo-bots' && botWordDetails.length > 0 && (
        <CollapsibleSection
          title={t('singlePlayer.botDetails') || 'Bot Performance Details'}
          icon={<Bot className="w-4 h-4" />}
          badge={botWordDetails.length}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-2">
            {botWordDetails.map((bot) => (
              <div
                key={bot.name}
                className="border-2 border-neo-black/30 dark:border-slate-500 rounded-neo overflow-hidden"
              >
                <button
                  onClick={() => setExpandedBot(expandedBot === bot.name ? null : bot.name)}
                  className="w-full flex items-center justify-between p-2 bg-neo-cream/50 dark:bg-slate-700 hover:bg-neo-cream dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-neo-black/70 dark:text-white/70" />
                    <span className="font-bold text-neo-black dark:text-white text-sm">{bot.name}</span>
                    <span className="text-[10px] bg-neo-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-bold">
                      {bot.totalWords} words
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-neo-black dark:text-white">{bot.score}</span>
                    <motion.span
                      animate={{ rotate: expandedBot === bot.name ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-neo-black/70 dark:text-white/70" />
                    </motion.span>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedBot === bot.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 bg-white dark:bg-slate-800 border-t border-neo-black/10 dark:border-slate-600 text-neo-black dark:text-white">
                        {bot.words && bot.words.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {bot.words.map((word, i) => {
                              const points = Math.max(word.length - 1, 1);
                              const gameLanguage = results.language || language;
                              const displayWord = gameLanguage === 'he' ? applyHebrewFinalLetters(word) : word;
                              return (
                                <span
                                  key={`${word}-${i}`}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black uppercase border border-neo-black rounded shadow-sm"
                                  style={{
                                    backgroundColor: getPointColor(points),
                                    color: getTextColor(points)
                                  }}
                                >
                                  {displayWord}
                                  <span className="opacity-70">+{points}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* MOBILE VIEW - Tab-based layout (hidden on lg+) */}
      <div className="lg:hidden flex flex-col min-h-full">
        {/* Tab Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-20">
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
        <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t-4 border-neo-black safe-area-bottom">
          <MobileTabBar
            tabs={mobileTabs}
            activeTab={mobileActiveTab}
            onTabChange={(id) => setMobileActiveTab(id as MobileTab)}
          />
        </div>
      </div>

      {/* DESKTOP VIEW - Original layout (hidden on mobile) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="hidden lg:block max-w-lg mx-auto space-y-3 px-2"
      >
      {/* Unified Victory/Results Banner - using shared component */}
      <div className="relative">
        <ResultsWinnerBanner
          winner={{
            username: t('common.you') || 'You',
            score: results.playerScore,
          }}
          isCurrentUserWinner={true}
          rank={mode === 'solo-bots' ? playerRank : 1}
          variant={
            // If score is 0 or very low, always use 'completion' variant (less celebratory)
            results.playerScore === 0 || validWordCount === 0 ? 'completion' :
            mode === 'practice' ? 'completion' :
            mode === 'challenge' && results.isNewHighScore ? (results.isNewAllTimeBest ? 'newRecord' : 'highScore') :
            mode === 'challenge' ? 'completion' :
            'ranking'
          }
          customMessage={
            // Low/zero score gets appropriate messaging
            results.playerScore === 0 || validWordCount === 0 ? (t('singlePlayer.tryAgain') || 'Try Again!') :
            validWordCount <= 2 ? (t('singlePlayer.keepPracticing') || 'Keep Practicing!') :
            mode === 'solo-bots' && isWinner && results.playerScore > 0 ? (t('singlePlayer.victory') || 'Victory!') :
            mode === 'solo-bots' && playerRank <= 3 && results.playerScore > 0 ? undefined :
            mode === 'solo-bots' ? (t('singlePlayer.gameOver') || 'Game Over') :
            mode === 'practice' ? (t('singlePlayer.practiceComplete') || 'Practice Complete!') :
            undefined
          }
          customAnnouncement={
            // Low/zero score gets encouraging but honest message
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
        {/* Confetti retrigger button for celebrations */}
        {shouldShowConfetti && (
          <div className="absolute top-2 end-2">
            <ConfettiRetrigger
              variant={mode === 'solo-bots' && playerRank <= 3 ? 'rank' : 'default'}
              rank={mode === 'solo-bots' ? playerRank : undefined}
              compact
            />
          </div>
        )}
      </div>

      {/* Consolidated Performance Card - Similar to multiplayer */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full"
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-neo-lg border-4 border-neo-black shadow-hard-lg',
            'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800'
          )}
          style={{ transform: 'rotate(-0.5deg)' }}
        >
          {/* Halftone texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }}
          />

          <div className="relative z-10 p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-neo-cyan" />
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                {t('results.yourPerformance') || 'Your Performance'}
              </h2>
            </div>

            {/* Primary Row: Rank + Score */}
            <div className="flex items-center gap-3 mb-3">
              {/* Rank Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className={cn(
                  'flex-shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-3 border-neo-black shadow-hard',
                  rankStyle.bg, rankStyle.text
                )}
              >
                <span className="text-xl font-black">#{mode === 'solo-bots' ? playerRank : 1}</span>
              </motion.div>

              {/* Username + Archetype */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white truncate">{t('common.you') || 'You'}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {mode === 'solo-bots' && (
                    <span className="text-xs text-white/60 font-bold">
                      #{playerRank} of {allParticipants.length}
                    </span>
                  )}
                  {playerArchetype && (
                    <PlayerArchetypeBadge archetype={playerArchetype} size="sm" />
                  )}
                </div>
              </div>

              {/* Score */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex-shrink-0 text-right"
              >
                <div className="text-3xl font-black text-white">{results.playerScore}</div>
                <div className="text-[10px] font-bold uppercase text-white/60">
                  {t('results.points') || 'Points'}
                </div>
              </motion.div>
            </div>

            {/* Key Stats Grid - Always visible */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {/* Words Found */}
              <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded bg-neo-lime text-neo-black border border-neo-black flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-neo-black" />
                  </div>
                </div>
                <div className="text-xl font-black text-white">{validWordCount}</div>
                <div className="text-[9px] font-bold uppercase text-white/60">{t('results.words') || 'Words'}</div>
              </div>

              {/* Accuracy */}
              <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded bg-neo-pink text-white border border-neo-black flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-neo-black" />
                  </div>
                </div>
                <div className="text-xl font-black text-white">{accuracy}%</div>
                <div className="text-[9px] font-bold uppercase text-white/60">{t('results.accuracy') || 'Accuracy'}</div>
              </div>

              {/* Best Word */}
              <div className="bg-white/10 rounded-neo border border-white/20 p-2 text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded bg-neo-purple text-white border border-neo-black flex items-center justify-center">
                    <Award className="w-3.5 h-3.5 text-neo-cream" />
                  </div>
                </div>
                <div className="text-sm font-black text-white uppercase truncate">
                  {bestWord ? applyHebrewFinalLetters(bestWord.word) : '-'}
                </div>
                <div className="text-[9px] font-bold uppercase text-white/60">
                  {bestWord?.score ? `${bestWord.score} pts` : (t('results.bestWord') || 'Best')}
                </div>
              </div>
            </div>

            {/* Bonus Badges Row */}
            {(totalComboBonus > 0 || totalFireRoundBonus > 0) && (
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {totalComboBonus > 0 && (
                  <span className="bg-neo-orange border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-black text-xs font-black">
                    ⚡ +{totalComboBonus}
                  </span>
                )}
                {totalFireRoundBonus > 0 && (
                  <span className="bg-neo-red border-2 border-neo-black rounded-neo px-2 py-0.5 shadow-hard-sm text-neo-cream text-xs font-black">
                    🔥 +{totalFireRoundBonus}
                  </span>
                )}
              </div>
            )}

            {/* Coins Earned */}
            {coinReward && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="mb-3 px-4 py-3 bg-gradient-to-r from-neo-yellow to-amber-400 rounded-neo border-3 border-neo-black shadow-hard"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Coins className="w-5 h-5 text-neo-black" />
                  <span className="font-black text-xl text-neo-black">+{coinReward.awarded}</span>
                  <span className="text-sm font-bold text-neo-black/70">{t('reveal.coins') || 'Coins'}</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-xs text-neo-black/70 font-medium">
                  {coinReward.breakdown.base > 0 && (
                    <span>{t('reveal.base') || 'Base'}: +{coinReward.breakdown.base}</span>
                  )}
                  {coinReward.breakdown.scoreBonus > 0 && (
                    <span>{t('coins.score') || 'Score'}: +{coinReward.breakdown.scoreBonus}</span>
                  )}
                  {coinReward.breakdown.placement > 0 && (
                    <span>🏆 {t('coins.placement') || 'Placement'}: +{coinReward.breakdown.placement}</span>
                  )}
                </div>
                <p className="text-xs text-neo-black/60 mt-1 text-center">
                  {t('reveal.usedForReveals') || 'Use coins to reveal words in single player games!'}
                </p>
              </motion.div>
            )}

            {/* Collapsible: Performance Details */}
            {playerInsights && (
              <>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}
                  className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-bold text-white uppercase border-2 border-neo-cyan/50 bg-neo-cyan/10 hover:bg-neo-cyan/20 transition-colors mb-2"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t('results.viewDetails') || 'View Performance Details'}
                  </span>
                  <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden mb-2"
                    >
                      <div className="bg-white/5 rounded-neo border border-white/10 p-2">
                        <PlayerInsights insights={playerInsights} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Collapsible: Words (only show if there are words) */}
            {results.playerWordData && results.playerWordData.length > 0 && (
            <>
            <button
              onClick={() => setShowWords(!showWords)}
              aria-expanded={showWords}
              className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-bold text-white uppercase border-2 border-white/20 bg-white/5 hover:bg-white/10 transition-colors mb-2"
            >
              <span className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                {t('results.viewAllWords') || 'View All Words'} ({results.playerWordData.length})
              </span>
              <motion.div animate={{ rotate: showWords ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </button>
            <AnimatePresence>
              {showWords && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden mb-2"
                >
                  <div className="bg-white/5 rounded-neo border border-white/10 p-2 space-y-2">
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
                </motion.div>
              )}
            </AnimatePresence>
            </>
            )}

            {/* Collapsible: Achievements */}
            {results.achievements && results.achievements.length > 0 && (
              <>
                <button
                  onClick={() => setShowAchievements(!showAchievements)}
                  aria-expanded={showAchievements}
                  className="w-full flex items-center justify-between p-2 rounded-neo text-sm font-bold text-white uppercase border-2 border-neo-yellow/50 bg-neo-yellow/10 hover:bg-neo-yellow/20 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {t('hostView.achievements') || 'Achievements'} ({results.achievements.length})
                  </span>
                  <motion.div animate={{ rotate: showAchievements ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {showAchievements && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden mt-2"
                    >
                      <div className="flex flex-wrap gap-2">
                        {results.achievements.map((ach, i) => (
                          <AchievementBadge key={ach.key} achievement={ach} index={i} />
                        ))}
                      </div>
                      <p className="text-xs text-white/50 mt-2 italic">
                        {t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Performance Chart - Collapsible */}
      <CollapsibleSection
        title={t('results.performanceHistory') || 'Performance History'}
        icon={<TrendingUp className="w-4 h-4" />}
        defaultExpanded={false}
        variant="tertiary"
        className="shadow-hard"
      >
        <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
      </CollapsibleSection>

      {/* Missed Words - Collapsible (for solo-bots mode) */}
      {mode === 'solo-bots' && missedWords.length > 0 && (
        <MissedWords missedWords={missedWords} maxDisplay={5} />
      )}

      {/* Leaderboard (solo-bots mode) - using shared Top3Leaderboard component */}
      {mode === 'solo-bots' && results.botScores.length > 0 && (
        <Top3Leaderboard
          participants={allParticipants.map(p => ({
            name: p.name,
            score: p.score,
            isCurrentPlayer: p.isPlayer,
            isBot: !p.isPlayer,
          })) as LeaderboardParticipant[]}
          headerText={t('common.leaderboard') || 'Leaderboard'}
        />
      )}

      {/* Bot Words Details - Collapsible */}
      {mode === 'solo-bots' && botWordDetails.length > 0 && (
        <CollapsibleSection
          title={t('singlePlayer.botDetails') || 'Bot Performance Details'}
          icon={<Bot className="w-4 h-4" />}
          badge={botWordDetails.length}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-2">
            {botWordDetails.map((bot) => (
              <div
                key={bot.name}
                className="border-2 border-neo-black/30 dark:border-slate-500 rounded-neo overflow-hidden"
              >
                <button
                  onClick={() => setExpandedBot(expandedBot === bot.name ? null : bot.name)}
                  className="w-full flex items-center justify-between p-2 bg-neo-cream/50 dark:bg-slate-700 hover:bg-neo-cream dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-neo-black/70 dark:text-white/70" />
                    <span className="font-bold text-neo-black dark:text-white text-sm">{bot.name}</span>
                    <span className="text-[10px] bg-neo-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-bold">
                      {bot.totalWords} words
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-neo-black dark:text-white">{bot.score}</span>
                    <motion.span
                      animate={{ rotate: expandedBot === bot.name ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-neo-black/70 dark:text-white/70" />
                    </motion.span>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedBot === bot.name && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 bg-white dark:bg-slate-800 border-t border-neo-black/10 dark:border-slate-600 text-neo-black dark:text-white">
                        {bot.words && bot.words.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {bot.words.map((word, i) => {
                              const points = Math.max(word.length - 1, 1);
                              const gameLanguage = results.language || language;
                              const displayWord = gameLanguage === 'he' ? applyHebrewFinalLetters(word) : word;
                              return (
                                <span
                                  key={`${word}-${i}`}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-black uppercase border border-neo-black rounded shadow-sm"
                                  style={{
                                    backgroundColor: getPointColor(points),
                                    color: getTextColor(points)
                                  }}
                                >
                                  {displayWord}
                                  <span className="opacity-70">+{points}</span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Action buttons - Compact */}
      <div ref={actionButtonsRef} className="flex flex-col gap-2 pt-2">
        {onQuickRematch && (
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button
              size="lg"
              className="w-full py-4 text-xl shadow-hard-lg hover:shadow-hard-xl border-4 bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black font-black uppercase tracking-wider"
              onClick={onQuickRematch}
            >
              <RotateCw className="me-2 w-6 h-6" />
              {t('common.quickRematch') || 'Quick Rematch'}
            </Button>
          </motion.div>
        )}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white hover:bg-neo-cream/50 dark:hover:bg-slate-700/50 border border-neo-black/20 dark:border-white/20"
            onClick={onPlayAgain}
          >
            <Settings className="me-1 w-3.5 h-3.5" />
            {t('common.settings') || 'Settings'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white hover:bg-neo-cream/50 dark:hover:bg-slate-700/50 border border-neo-black/20 dark:border-white/20"
            onClick={onBackToLobby}
          >
            <Home className="me-1 w-3.5 h-3.5" />
            {t('common.lobby') || 'Lobby'}
          </Button>
        </div>
      </div>

      </motion.div>

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
    </div>
  );
};

export default SinglePlayerResults;
