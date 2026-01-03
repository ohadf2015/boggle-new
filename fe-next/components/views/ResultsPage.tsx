'use client';

import React, { useMemo, useEffect, useState, useCallback, useRef, useDeferredValue, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, DoorOpen, Check, ArrowRight, Play, BarChart2, Share2 } from 'lucide-react';
import ExitRoomButton from '@/components/ExitRoomButton';
import { fireLevelUpConfetti } from '@/utils/confettiUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { clearSessionPreservingUsername } from '@/utils/session';
import { shouldShowUpgradePrompt, getGuestStatsSummary, updateGuestStatsAfterGame, isFirstWin } from '@/utils/guestManager';
import { useWinStreak } from '@/hooks/useWinStreak';
import { useFirstWinCelebration } from '@/hooks/useFirstWinCelebration';
import { trackGameCompletion, trackStreakMilestone } from '@/utils/growthTracking';
import logger from '@/utils/logger';
import { levelUpToast } from '@/components/NeoToast';
import { calculateAllPlayerArchetypes, getMissedWords, type PlayerArchetype } from '@/utils/playerArchetypes';
import type { ResultsPageProps, WordToVote, XpGainedData, LevelUpData } from '@/types/components';
import type { NearMiss } from '@/components/results/NearMissCard';
import type { MysteryReward } from '@/components/engagement/MysteryRewardPopup';
import type { ReferralMilestone } from '@/shared/types/socket';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

// Dynamic imports for heavy components (loaded after initial render)
const ResultsPlayerCard = dynamic(() => import('@/components/results/ResultsPlayerCard'), { ssr: false });
const ResultsWinnerBanner = dynamic(() => import('@/components/results/ResultsWinnerBanner'), { ssr: false });
const ConsolidatedPlayerCard = dynamic(() => import('@/components/results/ConsolidatedPlayerCard'), { ssr: false });
const Top3Leaderboard = dynamic(() => import('@/components/results/Top3Leaderboard'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });
const ShareWinPrompt = dynamic(() => import('@/components/results/ShareWinPrompt'), { ssr: false });
const WordFeedbackModal = dynamic(() => import('@/components/voting/WordFeedbackModal'), { ssr: false });
const PlayersReadyIndicator = dynamic(() => import('@/components/results/PlayersReadyIndicator'), { ssr: false });
const MissedWords = dynamic(() => import('@/components/results/MissedWords'), { ssr: false });
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
const NearMissCard = dynamic(() => import('@/components/results/NearMissCard'), { ssr: false });
const MysteryRewardPopup = dynamic(() => import('@/components/engagement/MysteryRewardPopup'), { ssr: false });
const ReferralMilestonePopup = dynamic(() => import('@/components/engagement/ReferralMilestonePopup'), { ssr: false });
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { Users } from 'lucide-react';
const PlayerArchetypeBadge = dynamic(() => import('@/components/results/PlayerArchetypeBadge'), { ssr: false });
const CompactResultsStats = dynamic(() => import('@/components/results/CompactResultsStats'), { ssr: false });
import { cn } from '@/lib/utils';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import { awardGameCoins } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';
import RoomChat from '@/components/RoomChat';
// Shared result components
import { MultiplayerActions } from '@/components/results/ResultsActionButtons';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';


const ResultsPage: React.FC<ResultsPageProps> = ({ finalScores, gameCode, onReturnToRoom, username, socket, achievements, duplicateRuleDisabled, playerCount, isHost = false, roomLanguage = 'en' }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const isLandscape = useMobileLandscape();
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showFirstWinModal, setShowFirstWinModal] = useState<boolean>(false);
  const [hasShownUpgradePrompt, setHasShownUpgradePrompt] = useState<boolean>(false);

  // Use refs for values that don't need to trigger re-renders
  const hasUpdatedStatsRef = useRef<boolean>(false);
  const hasTrackedGameRef = useRef<boolean>(false);
  const hasAddedToHistoryRef = useRef<boolean>(false);
  const hasAwardedCoinsRef = useRef<boolean>(false);
  // previousStreak needs to be state since it's used in render
  const [previousStreak, setPreviousStreak] = useState<number>(0);

  // Word feedback state for crowd-sourced word validation (self-healing system)
  const [showWordFeedback, setShowWordFeedback] = useState<boolean>(false);
  const [wordToVote, setWordToVote] = useState<WordToVote | null>(null);
  const [wordQueue, setWordQueue] = useState<WordToVote[]>([]);

  // XP and Level state (received via socket after game ends)
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  // Near-miss notifications (received via socket after game ends)
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([]);

  // Mystery reward state (received via socket after game ends)
  const [mysteryReward, setMysteryReward] = useState<MysteryReward | null>(null);
  const [showMysteryReward, setShowMysteryReward] = useState<boolean>(false);
  const mysteryRewardQueueRef = useRef<MysteryReward[]>([]);

  // Referral milestone state (received via socket when friend reaches milestone)
  const [referralMilestone, setReferralMilestone] = useState<ReferralMilestone | null>(null);
  const [showReferralMilestone, setShowReferralMilestone] = useState<boolean>(false);

  // Track which players are ready for next game (received from socket)
  const [readyUsernames, setReadyUsernames] = useState<string[]>([]);

  // Track if current player has confirmed they're ready
  const [isCurrentPlayerReady, setIsCurrentPlayerReady] = useState<boolean>(false);

  // State for sticky action bar visibility (must be declared before any conditional returns)
  const [showStickyActions, setShowStickyActions] = useState<boolean>(true);
  const playAgainSectionRef = useRef<HTMLDivElement>(null);

  // Mobile tab navigation state - Consolidated to 2 tabs for reduced cognitive load
  type MobileTab = 'results' | 'details';
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('results');

  // Win streak tracking
  const { currentStreak, bestStreak, recordWin } = useWinStreak();

  // Calculate if current player is the winner
  const sortedScores = useMemo(() => {
    return finalScores ? [...finalScores].sort((a, b) => b.score - a.score) : [];
  }, [finalScores]);

  const winner = sortedScores[0];
  const isCurrentUserWinner = winner?.username === username;

  // Get games played for first win detection
  const guestStats = useMemo(() => getGuestStatsSummary(), []);

  // First win celebration (epic confetti on first multiplayer win)
  useFirstWinCelebration({
    isWinner: isCurrentUserWinner,
    gamesPlayed: guestStats.gamesPlayed,
    isMultiplayer: true,
  });

  // Calculate current player's rank (1-based: 1st, 2nd, 3rd, etc.)
  const currentPlayerRank = useMemo(() => {
    if (!username || sortedScores.length === 0) return -1;
    const index = sortedScores.findIndex(p => p.username === username);
    return index >= 0 ? index + 1 : -1;
  }, [sortedScores, username]);

  // Always show the current player in the celebration banner
  // This ensures personalized feedback regardless of rank
  const bannerPlayer = useMemo(() => {
    if (currentPlayerRank >= 1) {
      return sortedScores[currentPlayerRank - 1];
    }
    return winner;
  }, [currentPlayerRank, sortedScores, winner]);

  // Get current player data for share prompt
  const currentPlayerData = useMemo(() => {
    if (!finalScores || !username) return null;
    return finalScores.find(p => p.username === username);
  }, [finalScores, username]);

  // Use actual player rank for styling (1st=gold, 2nd=silver, 3rd=bronze, 4+=purple encouraging)
  // BUT if player has 0 score, treat them as non-winner (rank 4+)
  const hasZeroScore = currentPlayerData?.score === 0 || (currentPlayerData?.allWords?.filter(w => w.validated && w.score > 0).length || 0) === 0;
  const bannerRank = hasZeroScore ? 4 : (currentPlayerRank >= 1 ? currentPlayerRank : 1);
  const isCurrentUserInBanner = bannerPlayer?.username === username;

  // Update guest stats when results load (only once)
  useEffect(() => {
    if (!isAuthenticated && !hasUpdatedStatsRef.current && finalScores && username) {
      const currentPlayerData = finalScores.find(p => p.username === username);

      if (currentPlayerData) {
        const validWords = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0) || [];
        const longestValidWord = validWords.reduce<string | undefined>((longest, w) =>
          w.word.length > (longest?.length || 0) ? w.word : longest, undefined
        );

        updateGuestStatsAfterGame({
          score: typeof currentPlayerData.score === 'number' ? currentPlayerData.score : 0,
          wordCount: validWords.length,
          longestWord: longestValidWord ?? undefined,
          isWinner: isCurrentUserWinner,
          achievements: (currentPlayerData.achievements || achievements || []).map(a =>
            typeof a === 'string' ? a : (a.key || a.name || '')
          )
        });
        hasUpdatedStatsRef.current = true;
      }
    }
  }, [isAuthenticated, finalScores, username, isCurrentUserWinner, achievements]);

  // Award coins for multiplayer game completion
  useEffect(() => {
    if (hasAwardedCoinsRef.current || !currentPlayerData || !gameCode) return;

    // Generate a session ID for this game
    const sessionId = `mp_${gameCode}_${Date.now()}`;
    const totalPlayers = sortedScores.length;

    const reward = awardGameCoins(
      sessionId,
      'multiplayer',
      currentPlayerData.score || 0,
      currentPlayerRank,
      totalPlayers
    );

    if (reward && reward.awarded > 0) {
      // Sync coins to database for authenticated users
      if (user?.id) {
        syncCoinsToDatabase(
          user.id,
          reward.awarded,
          'Multiplayer Game',
          {
            gameCode,
            score: currentPlayerData.score || 0,
            rank: currentPlayerRank,
            totalPlayers
          }
        );
      }
    }

    hasAwardedCoinsRef.current = true;
  }, [currentPlayerData, currentPlayerRank, sortedScores.length, gameCode, user?.id]);

  // Track game completion and record win streak (only once)
  useEffect(() => {
    if (hasTrackedGameRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0) || [];
    const guestStats = getGuestStatsSummary();
    const isFirstGame = guestStats.gamesPlayed <= 1;

    // Track game completion for analytics
    trackGameCompletion(
      isCurrentUserWinner,
      currentPlayerData.score || 0,
      validWords.length,
      isFirstGame
    );

    // Record win and update streak
    if (isCurrentUserWinner) {
      setPreviousStreak(currentStreak);
      recordWin();

      // Track streak milestones
      const newStreak = currentStreak + 1;
      trackStreakMilestone(newStreak);
    }

    hasTrackedGameRef.current = true;
  }, [currentPlayerData, isCurrentUserWinner, currentStreak, recordWin]);

  // Add game to history for the performance chart (runs for all users)
  useEffect(() => {
    if (hasAddedToHistoryRef.current || !currentPlayerData) return;

    const validWords = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0) || [];
    const totalAttempts = currentPlayerData.allWords?.length || 0;
    const accuracy = totalAttempts > 0 ? Math.round((validWords.length / totalAttempts) * 100) : 0;
    const longestWordLength = validWords.reduce((max, w) => Math.max(max, w.word.length), 0);

    addGameToHistory({
      score: currentPlayerData.score || 0,
      wordCount: validWords.length,
      accuracy,
      rank: currentPlayerRank,
      totalPlayers: sortedScores.length,
      mode: 'multiplayer',
      isWinner: isCurrentUserWinner,
      longestWordLength,
    });

    hasAddedToHistoryRef.current = true;
  }, [currentPlayerData, currentPlayerRank, sortedScores.length, isCurrentUserWinner]);

  // Show celebratory signup prompt for guests - triggered on scroll near bottom
  // This ensures it doesn't interfere with the word feedback modal
  useEffect(() => {
    // Don't set up scroll listener if already shown, authenticated, has user session, auth loading, or word feedback is showing
    if (isAuthenticated || user || authLoading || hasShownUpgradePrompt || !hasUpdatedStatsRef.current || showWordFeedback) {
      return;
    }

    const shouldShowModal = shouldShowUpgradePrompt();
    const isFirstWinUser = isFirstWin();

    // Only proceed if we should show a modal
    if (!shouldShowModal && !(isCurrentUserWinner && isFirstWinUser)) {
      return;
    }

    const handleScroll = () => {
      // Check if user has scrolled near the bottom (80% of page)
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= 0.8 && !showWordFeedback) {
        if (isCurrentUserWinner && (isFirstWinUser || shouldShowModal)) {
          setShowFirstWinModal(true);
        } else if (shouldShowModal) {
          setShowAuthModal(true);
        }
        setHasShownUpgradePrompt(true);

        // Remove listener after showing
        window.removeEventListener('scroll', handleScroll);
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also check immediately in case page is already scrolled or short
    // But with a delay to let word feedback show first
    const initialCheckTimeout = setTimeout(() => {
      if (!showWordFeedback) {
        handleScroll();
      }
    }, 2000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheckTimeout);
    };
  }, [isAuthenticated, user, authLoading, hasShownUpgradePrompt, isCurrentUserWinner, showWordFeedback]);

  const handleExitRoom = () => {
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    // Preserve username in localStorage for smooth fallback to lobby
    clearSessionPreservingUsername();
    window.location.reload();
  };

  // Defer expensive word mapping calculation
  const deferredFinalScoresForWords = useDeferredValue(finalScores);
  
  // Create a map of all player words for duplicate detection
  // Using 'any' here as the exact WordObject type varies between components
  const allPlayerWords = useMemo(() => {
    const wordMap: Record<string, Array<{
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
    }>> = {};
    if (deferredFinalScoresForWords) {
      deferredFinalScoresForWords.forEach(player => {
        // Map allWords with required fields, defaulting isDuplicate to false
        wordMap[player.username] = (player.allWords || []).map(w => ({
          word: w.word,
          score: w.score ?? 0,
          validated: w.validated ?? false,
          isDuplicate: (w as { isDuplicate?: boolean }).isDuplicate ?? false,
          comboBonus: (w as { comboBonus?: number }).comboBonus,
          fireRoundBonus: (w as { fireRoundBonus?: number }).fireRoundBonus,
          isAiVerified: (w as { isAiVerified?: boolean }).isAiVerified,
          isPendingValidation: (w as { isPendingValidation?: boolean }).isPendingValidation,
          potentialScore: (w as { potentialScore?: number }).potentialScore,
          invalidReason: (w as { invalidReason?: string }).invalidReason,
          aiReason: (w as { aiReason?: string }).aiReason,
          // Include timing data for pace analysis in PlayerInsights
          timestamp: (w as { timestamp?: number }).timestamp,
          timeSinceStart: (w as { timeSinceStart?: number }).timeSinceStart,
        }));
      });
    }
    return wordMap;
  }, [deferredFinalScoresForWords]);

  // Use transition for non-urgent UI updates
  const [isPending, startTransition] = useTransition();

  // Defer expensive archetype calculations - can be delayed without affecting UX
  const deferredFinalScores = useDeferredValue(finalScores);

  // Calculate player archetypes for all players (deferred for better performance)
  const playerArchetypes = useMemo(() => {
    if (!deferredFinalScores || deferredFinalScores.length === 0) return new Map<string, PlayerArchetype>();
    return calculateAllPlayerArchetypes(deferredFinalScores, 180); // Default 3 min game
  }, [deferredFinalScores]);

  // Get current player's archetype
  const currentPlayerArchetype = useMemo(() => {
    if (!username) return null;
    return playerArchetypes.get(username) || null;
  }, [playerArchetypes, username]);

  // Calculate max combo and longest word for sharing
  const shareCardStats = useMemo(() => {
    if (!currentPlayerData) return { maxCombo: undefined, longestWord: undefined };

    const validWords = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0) || [];

    // Find max combo from combo bonuses (combo bonus > 0 means they had a combo)
    const maxCombo = validWords.reduce((max, w) => {
      const comboLevel = (w as { comboBonus?: number }).comboBonus;
      return comboLevel && comboLevel > max ? comboLevel : max;
    }, 0);

    // Find longest word
    const longestWord = validWords.reduce<string | undefined>(
      (longest, w) => w.word.length > (longest?.length || 0) ? w.word : longest,
      undefined
    );

    return { maxCombo: maxCombo > 0 ? maxCombo : undefined, longestWord };
  }, [currentPlayerData]);

  // Calculate missed words for current player (high-value words others found)
  const missedWords = useMemo(() => {
    if (!username || !allPlayerWords) return [];
    return getMissedWords(username, allPlayerWords, 10);
  }, [username, allPlayerWords]);


  // Note: Confetti is now handled by ResultsWinnerBanner with rank-specific colors


  // Socket event listeners for word feedback (crowd-sourced word validation) and XP
  useEffect(() => {
    if (!socket) return;

    const handleShowWordFeedback = (data: {
      word: string;
      submittedBy: string;
      submitterAvatar?: { emoji: string; color: string } | null;
      voteInfo?: { votesFor?: number; votesAgainst?: number; approvalCount?: number; disapprovalCount?: number };
      timeoutSeconds?: number;
      gameCode: string;
      language: string;
      wordQueue?: WordToVote[];
    }) => {
      logger.log('[RESULTS] Received word feedback request:', data);

      // Handle new word queue format (self-healing system)
      if (data.wordQueue && data.wordQueue.length > 0) {
        setWordQueue(data.wordQueue);
        logger.log('[RESULTS] Word queue with', data.wordQueue.length, 'words for voting');
      }

      // Transform voteInfo to match expected VoteInfo interface
      const transformedVoteInfo = data.voteInfo ? {
        approvalCount: data.voteInfo.votesFor ?? data.voteInfo.approvalCount,
        disapprovalCount: data.voteInfo.votesAgainst ?? data.voteInfo.disapprovalCount
      } : undefined;

      setWordToVote({
        word: data.word,
        submittedBy: data.submittedBy,
        submitterAvatar: data.submitterAvatar,
        voteInfo: transformedVoteInfo,
        timeoutSeconds: data.timeoutSeconds || 10,
        gameCode: data.gameCode,
        language: data.language
      });
      setShowWordFeedback(true);
    };

    const handleVoteRecorded = (data: { success: boolean; message?: string }) => {
      logger.log('[RESULTS] Vote recorded:', data);
    };

    // XP and Level Up handlers
    const handleXpGained = (data: XpGainedData) => {
      logger.log('[RESULTS] XP gained:', data);
      setXpGainedData(data);
    };

    const handleLevelUp = (data: LevelUpData) => {
      logger.log('[RESULTS] Level up!', data);
      setLevelUpData(data);
      // Celebratory confetti for level up
      fireLevelUpConfetti();
      // Show level up toast notification
      levelUpToast(data.oldLevel, data.newLevel, {
        title: t('xp.levelUp') || 'Level Up!',
        newTitle: data.newTitles?.[0],
        newTitleLabel: t('xp.titleUnlocked') || 'New Title',
        duration: 5000
      });
    };

    // Near-miss notifications handler
    const handleNearMisses = (data: { nearMisses: NearMiss[] }) => {
      logger.log('[RESULTS] Near-miss notifications:', data);
      if (data.nearMisses && data.nearMisses.length > 0) {
        setNearMisses(data.nearMisses);
      }
    };

    // Mystery reward handler - queue rewards to show one at a time
    const handleMysteryReward = (data: { reward: MysteryReward }) => {
      logger.log('[RESULTS] Mystery reward received:', data);
      if (data.reward) {
        // Add to queue
        mysteryRewardQueueRef.current.push(data.reward);
        // If not currently showing a reward, show this one
        if (!showMysteryReward) {
          setMysteryReward(data.reward);
          setShowMysteryReward(true);
        }
      }
    };

    // Handle referral milestone notifications
    const handleReferralMilestone = (data: { milestone: ReferralMilestone }) => {
      logger.log('[RESULTS] Referral milestone received:', data);
      if (data.milestone) {
        setReferralMilestone(data.milestone);
        setShowReferralMilestone(true);
      }
    };

    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);
    socket.on('engagement:nearMisses', handleNearMisses);
    socket.on('engagement:mysteryReward', handleMysteryReward);
    socket.on('engagement:referralMilestone', handleReferralMilestone);

    return () => {
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
      socket.off('engagement:nearMisses', handleNearMisses);
      socket.off('engagement:mysteryReward', handleMysteryReward);
      socket.off('engagement:referralMilestone', handleReferralMilestone);
    };
  }, [socket, t, showMysteryReward]);

  // Socket listener for players ready for next game updates
  useEffect(() => {
    if (!socket) return;

    const handlePlayersReadyUpdate = (data: {
      readyCount: number;
      totalPlayers: number;
      username?: string;
      readyUsernames?: string[];
    }) => {
      logger.log('[RESULTS] Players ready update:', data);
      // If we receive the full list of ready usernames, use it
      if (data.readyUsernames) {
        setReadyUsernames(data.readyUsernames);
        // Check if current player is in the ready list
        if (username && data.readyUsernames.includes(username)) {
          setIsCurrentPlayerReady(true);
        }
      } else if (data.username) {
        // Otherwise, add the new ready username to the list
        setReadyUsernames(prev => {
          if (prev.includes(data.username!)) return prev;
          return [...prev, data.username!];
        });
        // Check if current player just became ready
        if (data.username === username) {
          setIsCurrentPlayerReady(true);
        }
      }
    };

    socket.on('playersReadyUpdate', handlePlayersReadyUpdate);

    // Request initial ready state
    socket.emit('getPlayersReadyCount');

    return () => {
      socket.off('playersReadyUpdate', handlePlayersReadyUpdate);
    };
  }, [socket, username]);

  // Handle word feedback vote (supports multi-word queue from self-healing system)
  // Memoized to prevent recreation on every render
  const handleVote = useCallback((voteType: 'like' | 'dislike', votedWord?: string) => {
    if (!socket || !wordToVote) return;

    // Use the specific word being voted on, or fall back to current word
    const wordToSubmit = votedWord || wordToVote.word;

    // Send 'like'/'dislike' directly - database expects these values
    logger.log('[RESULTS] Submitting vote:', { word: wordToSubmit, voteType });
    socket.emit('submitWordVote', {
      word: wordToSubmit,
      language: wordToVote.language,
      gameCode: wordToVote.gameCode,
      voteType: voteType,
      submittedBy: wordToVote.submittedBy
    });

    // Note: Modal handles moving to next word internally via word queue
    // Only close when modal calls onSkip/onTimeout (after all words)
  }, [socket, wordToVote]);

  // Handle word feedback skip/timeout (clears queue for self-healing system)
  const handleFeedbackSkip = useCallback(() => {
    logger.log('[RESULTS] Skipping word feedback');
    setShowWordFeedback(false);
    setWordToVote(null);
    setWordQueue([]); // Clear the queue
  }, []);

  // Handle mystery reward popup close - show next in queue if any
  const handleMysteryRewardClose = useCallback(() => {
    setShowMysteryReward(false);
    // Remove the current reward from queue
    mysteryRewardQueueRef.current.shift();
    // If there are more rewards, show the next one after a short delay
    if (mysteryRewardQueueRef.current.length > 0) {
      setTimeout(() => {
        setMysteryReward(mysteryRewardQueueRef.current[0]);
        setShowMysteryReward(true);
      }, 500);
    } else {
      setMysteryReward(null);
    }
  }, []);

  // Handle referral milestone popup close
  const handleReferralMilestoneClose = useCallback(() => {
    setShowReferralMilestone(false);
    setReferralMilestone(null);
  }, []);

  // Handle marking the player as ready for the next game
  const handleMarkReady = useCallback(() => {
    if (!socket || isCurrentPlayerReady) return;
    logger.log('[RESULTS] Marking player as ready for next game');
    socket.emit('confirmReadyForNextGame');
    setIsCurrentPlayerReady(true);
  }, [socket, isCurrentPlayerReady]);

  // Handle host starting a new game directly from results page
  const handleStartGame = useCallback(() => {
    if (!socket || !isHost) return;
    logger.log('[RESULTS] Host starting new game from results page');

    // Generate a new board with default settings
    const difficultyConfig = DIFFICULTIES.MEDIUM;
    const newTable = generateRandomTable(
      difficultyConfig.rows,
      difficultyConfig.cols,
      roomLanguage,
      []
    );

    // Default timer: 3 minutes
    const timerSeconds = 180;

    socket.emit('startGame', {
      letterGrid: newTable,
      timerSeconds: timerSeconds,
      language: roomLanguage,
      hostPlaying: true,
      minWordLength: 3,
      difficulty: 'MEDIUM',
      boardTheme: null,
    });
  }, [socket, isHost, roomLanguage]);

  // Hide sticky bar when play again section is visible (portrait mode only)
  useEffect(() => {
    if (!playAgainSectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyActions(!entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    observer.observe(playAgainSectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Landscape mode layout - 2-column: winner/grid left, player cards right
  if (isLandscape) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-white p-2 gap-2">
        {/* Left column: Winner Banner */}
        <div className="w-1/2 flex flex-col items-center justify-start gap-2 overflow-y-auto">
          {/* Exit button - compact */}
          <div className="w-full flex justify-end">
            <ExitRoomButton onClick={handleExitRoom} label="" className="w-11 h-11 min-w-[44px] min-h-[44px] p-0" />
          </div>

          {/* Winner Banner - compact */}
          {winner && (
            <div className="w-full max-w-xs">
              <ResultsWinnerBanner winner={winner} isCurrentUserWinner={winner.username === username} />
            </div>
          )}

          {/* Players Ready Indicator - Compact for landscape */}
          {gameCode && sortedScores.length > 1 && (
            <div className="w-full max-w-xs mt-4">
              <PlayersReadyIndicator
                players={sortedScores
                  .filter(p => !isHost || p.username !== username)
                  .map(p => ({
                    username: p.username,
                    avatar: p.avatar,
                    isBot: p.isBot
                  }))}
                readyUsernames={readyUsernames}
                currentUsername={username}
                isHost={isHost}
              />
            </div>
          )}

        </div>

        {/* Right column: Player cards + Actions */}
        <div className="w-1/2 flex flex-col gap-2 overflow-y-auto">
          {/* Final Scores Title - compact */}
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-black text-yellow-400">{t('results.finalScores')}</h2>
          </div>

          {/* Player Cards - compact */}
          <div className="space-y-2 flex-1 overflow-y-auto">
            {sortedScores.map((player, index) => (
              <ResultsPlayerCard
                key={player.username}
                player={player}
                index={index}
                allPlayerWords={allPlayerWords}
                currentUsername={username}
                isWinner={index === 0}
                xpGainedData={player.username === username ? xpGainedData : null}
                levelUpData={player.username === username ? levelUpData : null}
                duplicateRuleDisabled={duplicateRuleDisabled}
                archetype={playerArchetypes.get(player.username) || null}
              />
            ))}
          </div>

          {/* Action Buttons */}
          {gameCode && onReturnToRoom && (
            <div className="flex gap-2 mt-2">
              {isHost ? (
                /* HOST: Start Game button */
                <>
                  <button
                    onClick={handleStartGame}
                    className="flex-1 bg-emerald-500 text-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    {t('hostView.startGame') || 'Start Game'}
                  </button>
                  <button
                    onClick={handleExitRoom}
                    className="flex-1 bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
                  >
                    <DoorOpen className="w-3 h-3" />
                    {t('results.leaveRoom')}
                  </button>
                </>
              ) : isCurrentPlayerReady ? (
                /* PLAYER: Ready state */
                <>
                  <button
                    onClick={onReturnToRoom}
                    className="flex-1 bg-emerald-500 text-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {t('results.ready')}
                  </button>
                  <button
                    onClick={handleExitRoom}
                    className="flex-1 bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
                  >
                    <DoorOpen className="w-3 h-3" />
                    {t('results.leaveRoom')}
                  </button>
                </>
              ) : (
                /* PLAYER: Not ready state */
                <>
                  <button
                    onClick={handleMarkReady}
                    className="flex-1 bg-neo-yellow text-neo-black font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
                  >
                    <Star className="w-3 h-3" />
                    {t('results.imReady')}
                  </button>
                  <button
                    onClick={handleExitRoom}
                    className="flex-1 bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
                  >
                    <DoorOpen className="w-3 h-3" />
                    {t('results.leaveRoom')}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Room Chat - At the bottom of right column */}
          {gameCode && sortedScores.length > 1 && (
            <div className="mt-2">
              <RoomChat
                username={username}
                isHost={isHost}
                gameCode={gameCode}
                className="max-h-[150px]"
              />
            </div>
          )}
        </div>

        {/* Exit Confirmation Dialog */}
        <ConfirmationDialog
          open={showExitConfirm}
          onOpenChange={setShowExitConfirm}
          title={t('playerView.exitConfirmation')}
          description={t('results.exitWarning')}
          confirmText={t('common.confirm')}
          cancelText={t('common.cancel')}
          onConfirm={confirmExitRoom}
          variant="default"
        />

        {/* Word Feedback Modal */}
        <WordFeedbackModal
          isOpen={showWordFeedback && wordToVote !== null}
          word={wordToVote?.word || ''}
          submittedBy={wordToVote?.submittedBy || ''}
          submitterAvatar={wordToVote?.submitterAvatar ?? undefined}
          voteInfo={wordToVote?.voteInfo}
          wordQueue={wordQueue.map(w => ({ ...w, submitterAvatar: w.submitterAvatar ?? undefined }))}
          timeoutSeconds={wordToVote?.timeoutSeconds || 15}
          onVote={handleVote}
          onSkip={handleFeedbackSkip}
          onTimeout={handleFeedbackSkip}
        />
      </div>
    );
  }

  // Mobile tab configuration - Consolidated to 2 tabs for reduced cognitive load
  const mobileTabs = [
    { id: 'results' as MobileTab, icon: <Trophy className="w-5 h-5" />, label: t('results.results') || 'Results' },
    { id: 'details' as MobileTab, icon: <BarChart2 className="w-5 h-5" />, label: t('results.details') || 'Details' },
  ];

  // Render Results Tab Content (Consolidated: Your Score + Top 3 + Play Again CTA)
  // Designed to fit in viewport without scrolling for quick post-game decision
  const renderResultsTab = () => (
    <div className="space-y-3">
      {/* Compact Celebration Banner */}
      {bannerPlayer && (
        <ResultsWinnerBanner winner={bannerPlayer} isCurrentUserWinner={isCurrentUserInBanner} rank={bannerRank} />
      )}

      {/* Near-Miss Notifications - Motivate "one more game" */}
      {nearMisses.length > 0 && (
        <NearMissCard
          nearMisses={nearMisses}
          t={t}
          onPlayAgain={isHost ? handleStartGame : handleMarkReady}
          compact
        />
      )}

      {/* Compact Stats Row - Using shared component */}
      {currentPlayerData && currentPlayerRank > 0 && (
        <CompactResultsStats
          wordCount={currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0}
          accuracy={(() => {
            const total = currentPlayerData.allWords?.length || 0;
            const valid = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0;
            return total > 0 ? Math.round((valid / total) * 100) : 0;
          })()}
          archetype={currentPlayerArchetype}
        />
      )}

      {/* Compact Top 3 Leaderboard - Horizontal */}
      {sortedScores.length > 1 && (
        <Top3Leaderboard players={sortedScores} currentUsername={username} compact />
      )}

      {/* Primary CTA - Play Again / Ready */}
      {gameCode && onReturnToRoom && (
        <div className="mt-2">
          {isHost ? (
            <motion.button
              onClick={handleStartGame}
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
            <motion.button
              onClick={handleMarkReady}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-neo-yellow text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
            >
              <Star className="w-6 h-6" />
              {t('results.imReady')}
            </motion.button>
          )}
        </div>
      )}

      {/* Secondary Actions Row */}
      <div className="flex gap-2">
        {/* Share Button */}
        {currentPlayerData && gameCode && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (
          <button
            onClick={() => setMobileActiveTab('details')}
            className="flex-1 bg-neo-pink text-white font-bold text-sm px-4 py-2.5 uppercase border-2 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-1"
          >
            <Share2 className="w-4 h-4" />
            {t('results.share') || 'Share'}
          </button>
        )}
        {/* Exit Button */}
        <button
          onClick={handleExitRoom}
          className="flex-1 bg-neo-red text-neo-cream font-bold text-sm px-4 py-2.5 uppercase border-2 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-1"
        >
          <DoorOpen className="w-4 h-4" />
          {t('results.leaveRoom')}
        </button>
      </div>

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
    </div>
  );

  // Render Details Tab Content (Consolidated: Words, XP, Achievements, Other Players, Share, Chat)
  const renderDetailsTab = () => (
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
          wordCount={currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0}
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
      {sortedScores.filter(p => p.username !== username).length > 0 && (
        <CollapsibleSection
          title={t('results.otherPlayers') || 'Other Players'}
          icon={<Users className="w-4 h-4" />}
          badge={sortedScores.filter(p => p.username !== username).length}
          defaultExpanded={false}
          variant="tertiary"
          className="shadow-hard"
        >
          <div className="space-y-2">
            {sortedScores
              .filter(player => player.username !== username)
              .map((player) => {
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

  return (
    <div className="screen-fit lg:min-h-full lg:h-auto bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 relative">
      {/* Neo-brutalist halftone dot pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10 dark:opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
        }}
      />

      {/* MOBILE VIEW - Tab-based layout (hidden on lg+) */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Exit Button Header */}
        <div className="flex-shrink-0 w-full flex items-center justify-end px-2 py-2">
          <ExitRoomButton onClick={handleExitRoom} label="" className="w-10 h-10 min-w-[40px] min-h-[40px] p-0" />
        </div>

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

      {/* DESKTOP VIEW - Two-column side-by-side layout (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-col lg:overflow-auto p-4 xl:p-6">
        {/* Top Bar with Exit Button */}
        <div className="w-full max-w-6xl mx-auto flex items-center justify-end mb-4">
          <ExitRoomButton onClick={handleExitRoom} label={t('results.exitRoom')} />
        </div>

        {/* Two-Column Layout */}
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-row gap-6">
          {/* LEFT COLUMN: Results (Winner banner, stats, leaderboard, actions) */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            {/* Celebration Banner */}
            {bannerPlayer && (
              <ResultsWinnerBanner winner={bannerPlayer} isCurrentUserWinner={isCurrentUserInBanner} rank={bannerRank} />
            )}

            {/* Near-Miss Notifications - Motivate "one more game" */}
            {nearMisses.length > 0 && (
              <NearMissCard
                nearMisses={nearMisses}
                t={t}
                onPlayAgain={isHost ? handleStartGame : handleMarkReady}
              />
            )}

            {/* Compact Stats Row - Using shared component */}
            {currentPlayerData && currentPlayerRank > 0 && (
              <CompactResultsStats
                wordCount={currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0}
                accuracy={(() => {
                  const total = currentPlayerData.allWords?.length || 0;
                  const valid = currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0;
                  return total > 0 ? Math.round((valid / total) * 100) : 0;
                })()}
                archetype={currentPlayerArchetype}
              />
            )}

            {/* Top 3 Leaderboard */}
            {sortedScores.length > 1 && (
              <Top3Leaderboard players={sortedScores} currentUsername={username} compact />
            )}

            {/* Large Room Notice */}
            {duplicateRuleDisabled && (
              <div className="bg-neo-cyan/20 border-2 border-neo-cyan rounded-neo p-2 text-center">
                <span className="text-xs text-neo-cyan font-bold">
                  👥 {t('results.largeRoomMode') || 'Large Room Mode'} - {t('results.duplicateRuleDisabled') || 'duplicate words count'}
                </span>
              </div>
            )}

            {/* Play Again / Ready CTA */}
            {gameCode && onReturnToRoom && (
              <div className="mt-2">
                {isHost ? (
                  <motion.button
                    onClick={handleStartGame}
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
                  <motion.button
                    onClick={handleMarkReady}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-neo-yellow text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2"
                  >
                    <Star className="w-6 h-6" />
                    {t('results.imReady')}
                  </motion.button>
                )}
              </div>
            )}

            {/* Secondary Actions */}
            <div className="flex gap-2">
              {currentPlayerData && gameCode && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (
                <button
                  onClick={() => {/* Scroll to share section */}}
                  className="flex-1 bg-neo-pink text-white font-bold text-sm px-4 py-2.5 uppercase border-2 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-1"
                >
                  <Share2 className="w-4 h-4" />
                  {t('results.share') || 'Share'}
                </button>
              )}
              <button
                onClick={handleExitRoom}
                className="flex-1 bg-neo-red text-neo-cream font-bold text-sm px-4 py-2.5 uppercase border-2 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-1"
              >
                <DoorOpen className="w-4 h-4" />
                {t('results.leaveRoom')}
              </button>
            </div>

            {/* Players Ready Indicator */}
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
          </div>

          {/* RIGHT COLUMN: Details (Your words, other players, charts, chat) */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            {/* Full Player Performance Card - hide rank/score since banner already shows them */}
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
                hideRankAndScore
              />
            )}

            {/* Share Prompt */}
            {currentPlayerData && gameCode && !hasZeroScore && (currentPlayerData.score || 0) >= 10 && (isCurrentUserWinner || currentPlayerData.score >= 30) && (
              <ShareWinPrompt
                isWinner={isCurrentUserWinner}
                username={username}
                score={currentPlayerData.score || 0}
                wordCount={currentPlayerData.allWords?.filter(w => w.validated && w.score > 0).length || 0}
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
            {sortedScores.filter(p => p.username !== username).length > 0 && (
              <CollapsibleSection
                title={t('results.otherPlayers') || 'Other Players'}
                icon={<Users className="w-4 h-4" />}
                badge={sortedScores.filter(p => p.username !== username).length}
                defaultExpanded={false}
                variant="tertiary"
                className="shadow-hard"
              >
                <div className="space-y-2">
                  {sortedScores
                    .filter(player => player.username !== username)
                    .map((player) => {
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
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title={t('playerView.exitConfirmation')}
        description={t('results.exitWarning')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmExitRoom}
        variant="default"
      />

      {/* Sign Up Prompt for Guests (non-winners) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        showGuestStats={true}
      />

      {/* Celebratory First Win Signup Prompt */}
      <FirstWinSignupModal
        isOpen={showFirstWinModal}
        onClose={() => setShowFirstWinModal(false)}
      />

      {/* Word Feedback Modal - Self-healing dictionary validation */}
      <WordFeedbackModal
        isOpen={showWordFeedback && wordToVote !== null}
        word={wordToVote?.word || ''}
        submittedBy={wordToVote?.submittedBy || ''}
        submitterAvatar={wordToVote?.submitterAvatar ?? undefined}
        voteInfo={wordToVote?.voteInfo}
        wordQueue={wordQueue.map(w => ({
          ...w,
          submitterAvatar: w.submitterAvatar ?? undefined
        }))}
        timeoutSeconds={wordToVote?.timeoutSeconds || 15}
        onVote={handleVote}
        onSkip={handleFeedbackSkip}
        onTimeout={handleFeedbackSkip}
      />

      {/* Mystery Reward Popup - Variable ratio reward system */}
      <MysteryRewardPopup
        reward={mysteryReward}
        isOpen={showMysteryReward}
        onClose={handleMysteryRewardClose}
        t={t}
      />

      {/* Referral Milestone Popup - Notify when friend hits milestone */}
      <ReferralMilestonePopup
        milestone={referralMilestone}
        isOpen={showReferralMilestone}
        onClose={handleReferralMilestoneClose}
      />

    </div>
  );
};

export default ResultsPage;
