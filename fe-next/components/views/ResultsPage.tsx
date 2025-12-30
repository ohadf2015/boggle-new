'use client';

import React, { useMemo, useEffect, useState, useCallback, useRef, useDeferredValue, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, DoorOpen, Check, ArrowRight, Play } from 'lucide-react';
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
import { useMobileLandscape } from '@/hooks/useMobileLandscape';

// Dynamic imports for heavy components (loaded after initial render)
const ResultsPlayerCard = dynamic(() => import('@/components/results/ResultsPlayerCard'), { ssr: false });
const ResultsWinnerBanner = dynamic(() => import('@/components/results/ResultsWinnerBanner'), { ssr: false });
const ConfettiRetrigger = dynamic(() => import('@/components/results/ConfettiRetrigger'), { ssr: false });
const ConsolidatedPlayerCard = dynamic(() => import('@/components/results/ConsolidatedPlayerCard'), { ssr: false });
const Top3Leaderboard = dynamic(() => import('@/components/results/Top3Leaderboard'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });
const ShareWinPrompt = dynamic(() => import('@/components/results/ShareWinPrompt'), { ssr: false });
const WordFeedbackModal = dynamic(() => import('@/components/voting/WordFeedbackModal'), { ssr: false });
const PlayersReadyIndicator = dynamic(() => import('@/components/results/PlayersReadyIndicator'), { ssr: false });
const MissedWords = dynamic(() => import('@/components/results/MissedWords'), { ssr: false });
const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { Users } from 'lucide-react';
import { addGameToHistory } from '@/utils/gameHistoryManager';
import RoomChat from '@/components/RoomChat';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';


const ResultsPage: React.FC<ResultsPageProps> = ({ finalScores, gameCode, onReturnToRoom, username, socket, achievements, duplicateRuleDisabled, playerCount, isHost = false, roomLanguage = 'en' }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const isLandscape = useMobileLandscape();
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showFirstWinModal, setShowFirstWinModal] = useState<boolean>(false);
  const [hasShownUpgradePrompt, setHasShownUpgradePrompt] = useState<boolean>(false);

  // Use refs for values that don't need to trigger re-renders
  const hasUpdatedStatsRef = useRef<boolean>(false);
  const hasTrackedGameRef = useRef<boolean>(false);
  const hasAddedToHistoryRef = useRef<boolean>(false);
  // previousStreak needs to be state since it's used in render
  const [previousStreak, setPreviousStreak] = useState<number>(0);

  // Word feedback state for crowd-sourced word validation (self-healing system)
  const [showWordFeedback, setShowWordFeedback] = useState<boolean>(false);
  const [wordToVote, setWordToVote] = useState<WordToVote | null>(null);
  const [wordQueue, setWordQueue] = useState<WordToVote[]>([]);

  // XP and Level state (received via socket after game ends)
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  // Track which players are ready for next game (received from socket)
  const [readyUsernames, setReadyUsernames] = useState<string[]>([]);

  // Track if current player has confirmed they're ready
  const [isCurrentPlayerReady, setIsCurrentPlayerReady] = useState<boolean>(false);

  // State for sticky action bar visibility (must be declared before any conditional returns)
  const [showStickyActions, setShowStickyActions] = useState<boolean>(true);
  const playAgainSectionRef = useRef<HTMLDivElement>(null);

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

  // Use actual player rank for styling (1st=gold, 2nd=silver, 3rd=bronze, 4+=purple encouraging)
  const bannerRank = currentPlayerRank >= 1 ? currentPlayerRank : 1;
  const isCurrentUserInBanner = bannerPlayer?.username === username;

  // Get current player data for share prompt
  const currentPlayerData = useMemo(() => {
    if (!finalScores || !username) return null;
    return finalScores.find(p => p.username === username);
  }, [finalScores, username]);

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
    // Don't set up scroll listener if already shown, authenticated, or word feedback is showing
    if (isAuthenticated || hasShownUpgradePrompt || !hasUpdatedStatsRef.current || showWordFeedback) {
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
  }, [isAuthenticated, hasShownUpgradePrompt, isCurrentUserWinner, showWordFeedback]);

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

    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);

    return () => {
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
    };
  }, [socket, t]);

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
                players={sortedScores.map(p => ({
                  username: p.username,
                  avatar: p.avatar,
                  isBot: p.isBot
                }))}
                readyUsernames={readyUsernames}
                currentUsername={username}
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col overflow-auto transition-colors duration-300 px-1 py-2 sm:px-4 sm:py-3 md:p-6 relative pb-16 lg:pb-6">
      {/* Neo-brutalist halftone dot pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-10 dark:opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
          backgroundSize: '8px 8px',
        }}
      />
      {/* Top Bar with Exit Button */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-end mb-2">
        <ExitRoomButton onClick={handleExitRoom} label={t('results.exitRoom')} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full">
        {/* Header Section - Centered */}
        <div className="max-w-4xl mx-auto">
          {/* Celebration Banner (shows current player if in top 3) */}
          {bannerPlayer && (
            <div className="relative">
              <ResultsWinnerBanner winner={bannerPlayer} isCurrentUserWinner={isCurrentUserInBanner} rank={bannerRank} />
              {/* Confetti retrigger button for winners and top 3 */}
              {isCurrentUserInBanner && bannerRank <= 3 && (
                <div className="absolute top-2 end-2">
                  <ConfettiRetrigger
                    variant="rank"
                    rank={bannerRank}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* Consolidated Player Card - Your Performance (always shows current player) */}
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

          {/* Performance Chart - Shows improvement over recent games - MORE VISIBLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-4 mb-4"
          >
            <PerformanceChart currentScore={currentPlayerData?.score} gamesLimit={10} />
          </motion.div>

          {/* Missed Words - Educational feedback on high-value words you missed */}
          {missedWords.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mt-2"
            >
              <MissedWords missedWords={missedWords} maxDisplay={5} />
            </motion.div>
          )}

          {/* Compact Top 3 Leaderboard */}
          {sortedScores.length > 1 && (
            <Top3Leaderboard
              players={sortedScores}
              currentUsername={username}
            />
          )}

          {/* Large Room Notice - Duplicate rule disabled */}
          {duplicateRuleDisabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mb-2 mx-auto max-w-md"
            >
              <div className="bg-neo-cyan border-3 border-neo-black rounded-neo p-3 shadow-hard text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">👥</span>
                  <span className="font-black text-neo-black text-sm uppercase">
                    {t('results.largeRoomMode') || 'Large Room Mode'}
                  </span>
                  <span className="text-lg">👥</span>
                </div>
                <p className="text-xs text-neo-black mt-1 font-bold">
                  {t('results.duplicateRuleDisabled') || `With ${playerCount || '8+'} players, duplicate words still count!`}
                </p>
              </div>
            </motion.div>
          )}

        </div>

        {/* Other Players Results - Collapsible Section */}
        {sortedScores.filter(p => p.username !== username).length > 0 && (
          <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 mt-2">
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
                  .map((player, filteredIndex) => {
                    // Find original index for proper ranking display
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
          </div>
        )}

        {/* Growth Features Section */}
        <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 mt-3 space-y-2">
          {/* Removed: WinStreakDisplay - streak info is shown in ShareWinPrompt badge */}

          {/* Share Prompt - Compact inline for non-winners, full for winners */}
          {/* Show for winners OR anyone with 30+ score to increase viral reach */}
          {currentPlayerData && gameCode && (isCurrentUserWinner || currentPlayerData.score >= 30) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
            >
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
            </motion.div>
          )}
        </div>

        {/* PROMINENT Action Section - Host sees Start Game, Players see I'm Ready */}
        {gameCode && onReturnToRoom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
            className="mt-4 max-w-2xl mx-auto px-2 sm:px-4"
          >
            {isHost ? (
              /* HOST VIEW - Start Game Button */
              <div className="bg-neo-lime text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 sm:p-8 relative overflow-hidden">
                {/* Attention-grabbing pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
                  backgroundImage: 'radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }} />
                <div className="text-center space-y-5 relative z-10">
                  <motion.div
                    animate={{ rotate: [0, -3, 3, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <h3 className="text-2xl sm:text-3xl font-black uppercase" style={{ textShadow: '3px 3px 0px var(--neo-cyan)' }}>
                      {t('results.readyForNextRound') || 'Ready for Next Round?'}
                    </h3>
                  </motion.div>
                  <p className="text-neo-black/80 text-base font-bold max-w-md mx-auto">
                    {t('results.hostStartDescription') || 'Start a new game when everyone is ready!'}
                  </p>

                  {/* HUGE Start Game Button for Host */}
                  <motion.button
                    onClick={handleStartGame}
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    whileHover={{ scale: 1.05, x: -3, y: -3 }}
                    whileTap={{ scale: 0.98, x: 3, y: 3 }}
                    className="w-full sm:w-auto bg-emerald-500 text-white font-black text-xl sm:text-2xl px-12 py-5 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                    <Play className="w-7 h-7" />
                    {t('hostView.startGame') || 'Start Game'}
                    <Play className="w-7 h-7" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                    onClick={handleExitRoom}
                    className="bg-neo-red text-neo-cream font-bold text-sm px-6 py-2.5 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2 mx-auto mt-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    {t('results.leaveRoom')}
                  </motion.button>
                </div>
              </div>
            ) : isCurrentPlayerReady ? (
              /* PLAYER Ready State - Confirmed */
              <div className="bg-emerald-500 text-white border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 sm:p-8 relative overflow-hidden">
                {/* Success pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-10" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
                }} />
                <div className="text-center space-y-4 relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex items-center justify-center gap-4"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-neo-black shadow-hard"
                    >
                      <Check className="w-8 h-8 text-emerald-600" />
                    </motion.div>
                  </motion.div>
                  <h3 className="text-2xl sm:text-3xl font-black uppercase" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
                    {t('results.youAreReady')}
                  </h3>
                  <p className="text-white/90 text-base font-bold">
                    {t('results.waitingForHostToStart') || 'Waiting for host to start the next round...'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                    <motion.button
                      whileHover={{ x: -2, y: -2 }}
                      whileTap={{ x: 2, y: 2 }}
                      onClick={onReturnToRoom}
                      className="bg-white text-neo-black font-black text-base px-6 py-3 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                      {t('results.goToLobby')}
                    </motion.button>
                    <motion.button
                      whileHover={{ x: -2, y: -2 }}
                      whileTap={{ x: 2, y: 2 }}
                      onClick={handleExitRoom}
                      className="bg-neo-red text-neo-cream font-black text-base px-6 py-3 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2"
                    >
                      <DoorOpen className="w-5 h-5" />
                      {t('results.leaveRoom')}
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              /* PLAYER Not Ready State - PROMINENT CTA */
              <div className="bg-neo-yellow text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 sm:p-8 relative overflow-hidden">
                {/* Attention-grabbing pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
                  backgroundImage: 'radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }} />
                <div className="text-center space-y-5 relative z-10">
                  <motion.div
                    animate={{ rotate: [0, -3, 3, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <h3 className="text-2xl sm:text-3xl font-black uppercase" style={{ textShadow: '3px 3px 0px var(--neo-pink)' }}>
                      {t('results.playAgainQuestion')}
                    </h3>
                  </motion.div>
                  <p className="text-neo-black/80 text-base font-bold max-w-md mx-auto">
                    {t('results.markReadyDescription') || 'Click below to let the host know you\'re ready for the next round'}
                  </p>

                  {/* HUGE I'm Ready Button */}
                  <motion.button
                    onClick={handleMarkReady}
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    whileHover={{ scale: 1.05, x: -3, y: -3 }}
                    whileTap={{ scale: 0.98, x: 3, y: 3 }}
                    className="w-full sm:w-auto bg-neo-lime text-neo-black font-black text-xl sm:text-2xl px-12 py-5 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl transition-all flex items-center justify-center gap-3 mx-auto"
                  >
                    <Star className="w-7 h-7" />
                    {t('results.imReady')}
                    <Star className="w-7 h-7" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: -2, y: -2 }}
                    whileTap={{ x: 2, y: 2 }}
                    onClick={handleExitRoom}
                    className="bg-neo-red text-neo-cream font-bold text-sm px-6 py-2.5 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2 mx-auto mt-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    {t('results.leaveRoom')}
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Players Ready Indicator - Shows who's ready for next round */}
        {gameCode && sortedScores.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mt-4 max-w-2xl mx-auto px-2 sm:px-4"
          >
            <PlayersReadyIndicator
              players={sortedScores.map(p => ({
                username: p.username,
                avatar: p.avatar,
                isBot: p.isBot
              }))}
              readyUsernames={readyUsernames}
              currentUsername={username}
            />
          </motion.div>
        )}

      </div>

      {/* Room Chat - At the bottom of the page for communication */}
      {gameCode && sortedScores.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="mt-6 max-w-2xl mx-auto px-2 sm:px-4 pb-4"
        >
          <RoomChat
            username={username}
            isHost={isHost}
            gameCode={gameCode}
            className="max-h-[300px]"
          />
        </motion.div>
      )}

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

    </div>
  );
};

export default ResultsPage;
