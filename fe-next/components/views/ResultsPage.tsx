'use client';

import React, { useMemo, useEffect, useState, useCallback, useDeferredValue, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FeatureErrorBoundary } from '@/components/ErrorBoundaries';
import ExitRoomButton from '@/components/ExitRoomButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { clearSessionPreservingUsername } from '@/utils/session';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { useFirstWinCelebration } from '@/hooks/useFirstWinCelebration';
import logger from '@/utils/logger';
import type { ResultsPageProps } from '@/types/components';
import { useResultsSocketEvents } from '@/components/results/useResultsSocketEvents';
import { useResultsData } from '@/hooks/useResultsData';
import { useResultsSideEffects } from '@/hooks/useResultsSideEffects';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useMultiplayerSignupNudge } from '@/hooks/useMultiplayerSignupNudge';
import { FloatingReaction } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';

const PostGameEngagement = dynamic(() => import('@/components/growth/PostGameEngagement'), { ssr: false });
const MultiplayerSignupSheet = dynamic(() => import('@/components/auth/MultiplayerSignupSheet'), { ssr: false });
const SignupToast = dynamic(() => import('@/components/auth/SignupToast'), { ssr: false });
// MobileTabBar replaced by inline floating pill for results page

// Shared result components
import { ResultsModals } from '@/components/results/ResultsModals';
import { ResultsMainContent } from '@/components/results/ResultsMainContent';
import { ResultsDetailsContent } from '@/components/results/ResultsDetailsContent';
const StickyReadyBar = dynamic(() => import('@/components/results/StickyReadyBar'), { ssr: false });
const PostGameSocialActions = dynamic(() => import('@/components/results/PostGameSocialActions'), { ssr: false });
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { useCrazyGamesAds } from '@/hooks/useCrazyGamesAds';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { useGameKeyboardShortcuts } from '@/hooks/useGameKeyboardShortcuts';
import type { GameModeOption } from '@/components/GameModeSelector';
import { useGameMode, useWordHuntPlayerLives, useWordHuntEliminatedPlayers, useBlastMovesUsed, useBlastTotalTileBonus, useBlastTotalTilesCleared, useBlastPlayerStats } from '@/hooks/gameState/store';
const WordHuntResultsSummary = dynamic(() => import('@/components/results/WordHuntResultsSummary'), { ssr: false });
const BlastResultsSummary = dynamic(() => import('@/components/results/BlastResultsSummary'), { ssr: false });
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
const PostGameWordReview = dynamic(() => import('@/components/education/PostGameWordReview'), { ssr: false });

const SERIES_TOTAL_GAMES = 3;

// ==============================================
// DESKTOP RESULTS LAYOUT
// ==============================================
// Full-width hero area (podium + consolation) on top,
// then two-column grid for words/stats and other players below.

interface DesktopResultsLayoutProps {
  handleExitRoom: () => void;
  exitLabel?: string;
  mainContentProps: any;
  detailsContentProps: any;
  resolvedGameMode: string | undefined;
  wordHuntResultsData: any;
  blastMovesUsed: number;
  blastTotalTilesCleared: number;
  blastTotalTileBonus: number;
  gameCode?: string;
  sortedScores: any[];
  otherPlayers: any[];
  isBotsOnlyGame: boolean;
  postGameWordReview?: React.ReactNode;
}

function DesktopResultsLayout({
  handleExitRoom,
  exitLabel,
  mainContentProps,
  detailsContentProps,
  resolvedGameMode,
  wordHuntResultsData,
  blastMovesUsed,
  blastTotalTilesCleared,
  blastTotalTileBonus,
  gameCode,
  sortedScores,
  otherPlayers,
  isBotsOnlyGame,
  postGameWordReview,
}: DesktopResultsLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      const hasMoreContent = el.scrollHeight > el.clientHeight + 40;
      const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      setShowScrollIndicator(hasMoreContent && !isNearBottom);
    };

    checkScroll();
    // Recheck after animations settle
    const timer = setTimeout(checkScroll, 800);
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 relative">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area p-4 xl:p-6 pb-32"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Top Bar with Exit Button */}
        <div className="w-full max-w-5xl mx-auto flex items-center justify-end mb-4">
          <ExitRoomButton onClick={handleExitRoom} label={exitLabel || ''} />
        </div>

        {/* Full-width cinematic area: Hero + Podium + Consolation */}
        <div className="w-full max-w-5xl mx-auto">
          <ResultsMainContent
            {...mainContentProps}
            hideInlineCta={!!gameCode && !isBotsOnlyGame}
          />
        </div>

        {/* Two-column area below the cinematic hero */}
        <div className="w-full max-w-5xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Game mode summary + social + engagement */}
          <div className="space-y-4">
            {resolvedGameMode === 'word-hunt' && wordHuntResultsData && (
              <WordHuntResultsSummary {...wordHuntResultsData} />
            )}
            {resolvedGameMode === 'blast' && (
              <BlastResultsSummary
                movesUsed={blastMovesUsed}
                tilesCleared={blastTotalTilesCleared}
                tileBonus={blastTotalTileBonus}
              />
            )}
            {gameCode && sortedScores.length > 1 && (
              <PostGameSocialActions
                opponents={otherPlayers}
                reducedMotion={null}
              />
            )}
            <PostGameEngagement />
            {postGameWordReview}
          </div>

          {/* RIGHT: Other players expanded + achievements */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 20 }}
            className="space-y-4"
          >
            <ResultsDetailsContent
              {...detailsContentProps}
              hideRankAndScore={true}
            />
          </motion.div>
        </div>

        {/* CrazyGames banner ad — shown after results content */}
        <div className="w-full max-w-5xl mx-auto mt-6">
          <CrazyGamesBanner size="728x90" />
        </div>
      </div>

      {/* Scroll indicator — subtle bouncing chevron at bottom */}
      <AnimatePresence>
        {showScrollIndicator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="flex flex-col items-center gap-0.5"
            >
              <div className="w-6 h-6 rounded-full bg-neo-white/10 backdrop-blur-sm flex items-center justify-center border border-neo-white/20">
                <svg className="w-3 h-3 text-neo-white/60" viewBox="0 0 12 12" fill="none">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ResultsPage: React.FC<ResultsPageProps> = ({ finalScores, gameCode, onReturnToRoom, username, socket, achievements, duplicateRuleDisabled, isHost = false, roomLanguage = 'en', gridSize = 4, gameDuration = 180, seriesStandings, seriesRoundNumber, onResetSeries, wordHuntSummary }) => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const setIsInGame = useHideNavigation();

  // Hide global bottom nav on mobile while viewing results
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const router = useRouter();

  // Classroom lesson data from sessionStorage (set by ClassroomGameLobby)
  const lessonGameData = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('lessonGameData');
      if (!raw) return null;
      return JSON.parse(raw) as {
        lessonId: string;
        vocabularyWords: string[];
      };
    } catch {
      return null;
    }
  }, []);

  const { showInterstitial } = useAdPlacement();
  const { requestMidgameAd } = useCrazyGamesAds();
  useEffect(() => {
    showInterstitial('multiplayer-round-complete');
    // Show CrazyGames midgame ad at this natural break between rounds
    requestMidgameAd();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  // Score reveal animation state (Netflix Boggle Party-inspired "trading places" reveal)
  const [scoreRevealComplete, setScoreRevealComplete] = useState<boolean>(true);

  // Desktop keyboard shortcuts: R=rematch, Escape=exit (enabled after score reveal)
  useGameKeyboardShortcuts({
    onRematch: onReturnToRoom || undefined,
    onEscape: () => setShowExitConfirm(true),
    enabled: scoreRevealComplete,
  });
  // Game mode override for host (results page lets host change mode before next game)
  const resolvedGameMode = useGameMode();
  // Persist the game mode that was just played (so "Play Again" keeps the same mode)
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>(resolvedGameMode || 'random');
  const wordHuntPlayerLives = useWordHuntPlayerLives();
  const wordHuntEliminatedPlayers = useWordHuntEliminatedPlayers();
  const blastMovesUsed = useBlastMovesUsed();
  const blastTotalTileBonus = useBlastTotalTileBonus();
  const blastTotalTilesCleared = useBlastTotalTilesCleared();
  const blastPlayerStats = useBlastPlayerStats();

  // Socket events for word feedback, XP, engagement features, and player ready state
  const {
    showWordFeedback,
    wordToVote,
    wordQueue,
    xpGainedData,
    levelUpData,
    showLevelUpCelebration,
    setShowLevelUpCelebration,
    setLevelUpData,
    nearMisses,
    referralMilestone,
    showReferralMilestone,
    readyUsernames,
    isCurrentPlayerReady,
    handleVote,
    handleFeedbackSkip,
    handleReferralMilestoneClose,
    handleMarkReady,
  } = useResultsSocketEvents({ socket, username });

  // Quick emoji reactions for multiplayer results
  const { floatingReactions, sendReaction, dismissReaction } = useQuickReactions({
    socket: socket ?? null,
    username: username || '',
  });

  // Emoji picker no longer needed — reactions are always visible in the bottom bar

  // Extract all data processing logic into a custom hook
  const {
    sortedScores,
    winner,
    isCurrentUserWinner,
    currentPlayerRank,
    currentPlayerData,
    currentPlayerValidWords,
    otherPlayers,
    playerArchetypes,
    currentPlayerArchetype,
    missedWords,
    shareCardStats,
    isBotsOnlyGame,
    normalizeUsername,
  } = useResultsData({
    finalScores,
    username,
    gameDuration,
    gameMode: resolvedGameMode,
    wordHuntTargetFoundBy: wordHuntSummary?.targetFoundBy,
  });

  // Word review card for classroom games (shared between mobile + desktop)
  const postGameWordReviewNode = lessonGameData ? (
    <PostGameWordReview
      vocabularyWords={lessonGameData.vocabularyWords}
      wordsFound={currentPlayerValidWords.map((w: { word: string }) => w.word)}
      lessonId={lessonGameData.lessonId}
      onPractice={() => router.push(`/student/practice?lessonId=${lessonGameData.lessonId}&mode=review`)}
    />
  ) : null;

  // Extract all side effects into a custom hook
  const {
    winStreakData,
    showAuthModal,
    setShowAuthModal,
    showFirstWinModal,
    setShowFirstWinModal,
  } = useResultsSideEffects({
    currentPlayerData,
    currentPlayerValidWords,
    isCurrentUserWinner,
    currentPlayerRank,
    totalPlayers: sortedScores.length,
    sortedScores,
    username,
    gameCode,
    gameDuration,
    gridSize,
    achievements,
    showWordFeedback,
    normalizeUsername,
  });

  // CrazyGames lifecycle - stop gameplay when results page loads
  // Call happytime if winner (throttled to once per 30s)
  useCrazyGamesLifecycle({
    isGameActive: false, // Results = not playing
    isGameOver: true,
    isWinner: isCurrentUserWinner,
  });

  // MP signup nudge — non-intrusive bottom sheet + toast for guests
  const {
    activeNudge,
    stats: mpNudgeStats,
    dismissNudge,
    recordMpGame,
    // shouldPulseCoins — wire into CoinRewardDisplay as follow-up
  } = useMultiplayerSignupNudge({
    isAuthenticated,
    isResultsVisible: true,
  });

  // Record MP game completion on mount (recordMpGame is stable via useCallback)
  useEffect(() => {
    if (gameCode) recordMpGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get games played for first win detection
  const guestStats = useMemo(() => getGuestStatsSummary(), []);

  // First win celebration (epic confetti on first multiplayer win)
  useFirstWinCelebration({
    isWinner: isCurrentUserWinner,
    gamesPlayed: guestStats.gamesPlayed,
    isMultiplayer: true,
  });

  const handleExitRoom = () => {
    setShowExitConfirm(true);
  };

  const confirmExitRoom = () => {
    // Emit leaveRoom so backend properly removes/disconnects the player
    try {
      if (socket && gameCode && username) {
        socket.emit('leaveRoom', { gameCode, username });
      }
    } catch (error) {
      logger.error('[RESULTS] Error emitting leaveRoom:', error);
    }

    clearSessionPreservingUsername(username);

    setTimeout(() => {
      try {
        if (socket) {
          socket.disconnect();
        }
      } catch (error) {
        logger.error('[RESULTS] Error disconnecting socket:', error);
      }
      window.location.reload();
    }, 200);
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

  // Pre-generate next grid during results (Brawl Stars-style: zero delay on start)
  const preGeneratedGrid = useMemo(() => {
    const difficultyConfig = DIFFICULTIES.MEDIUM;
    return generateRandomTable(difficultyConfig.rows, difficultyConfig.cols, roomLanguage, []);
  }, [roomLanguage]);

  // Handle host starting a new game directly from results page
  // Must reset game state first (like handleStartNewGame in useHostGameActions)
  const handleStartGame = useCallback(() => {
    if (!socket || !isHost) return;
    logger.log('[RESULTS] Host starting new game from results page');

    // Timeout guard: if resetGame callback never fires (socket issue), recover
    let callbackFired = false;
    const timeout = setTimeout(() => {
      if (!callbackFired) {
        logger.warn('[RESULTS] resetGame callback timed out — attempting startGame anyway');
        socket.emit('startGame', {
          letterGrid: preGeneratedGrid,
          timerSeconds: 120,
          language: roomLanguage,
          hostPlaying: true,
          minWordLength: 2,
          difficulty: 'MEDIUM',
          boardTheme: null,
          gameMode: selectedGameMode,
        });
      }
    }, 3000);

    // Reset game state first, then start new game in callback
    // Pass gameCode as fallback for mobile reconnects where socket mapping may be stale
    socket.emit('resetGame', { gameCode }, (response: { success: boolean; error?: string; gameState?: string }) => {
      callbackFired = true;
      clearTimeout(timeout);
      if (response?.success) {
        logger.log('[RESULTS] Game reset confirmed, starting new game');

        socket.emit('startGame', {
          letterGrid: preGeneratedGrid,
          timerSeconds: 120,
          language: roomLanguage,
          hostPlaying: true,
          minWordLength: 2,
          difficulty: 'MEDIUM',
          boardTheme: null,
          gameMode: selectedGameMode,
        });
      } else {
        logger.warn('[RESULTS] Game reset failed:', response?.error);
      }
    });
  }, [socket, isHost, roomLanguage, selectedGameMode, preGeneratedGrid, gameCode]);

  // Series (best-of-3) completion detection
  const isSeriesComplete = (seriesRoundNumber ?? 0) >= SERIES_TOTAL_GAMES;
  const seriesWinnerUsername = isSeriesComplete && seriesStandings?.[0]?.username
    ? seriesStandings[0].username : undefined;

  // Start a new series: reset tracker then start a fresh game
  const handleNewSeries = useCallback(() => {
    onResetSeries?.();
    handleStartGame();
  }, [onResetSeries, handleStartGame]);

  // Overlay modals that should render regardless of orientation
  // These are rendered BEFORE the conditional returns to ensure they appear in both landscape and portrait modes
  // This fixes the bug where modals would only appear after switching from landscape to portrait
  const overlayModals = (
    <ResultsModals
      wordFeedback={{
        showWordFeedback,
        wordToVote,
        wordQueue,
        onVote: handleVote,
        onSkip: handleFeedbackSkip,
      }}
      referralMilestone={{
        milestone: referralMilestone,
        showReferralMilestone,
        onClose: handleReferralMilestoneClose,
      }}
      levelUp={{
        levelUpData,
        showLevelUpCelebration,
        setShowLevelUpCelebration,
        setLevelUpData,
      }}
      authModal={{
        showAuthModal,
        setShowAuthModal,
      }}
      firstWinModal={{
        showFirstWinModal,
        setShowFirstWinModal,
      }}
    />
  );

  // Shared props for main content component (built before landscape check so landscape can use them)
  const mainContentProps = {
    sortedScores,
    nearMisses,
    isHost,
    onStartGame: handleStartGame,
    onMarkReady: handleMarkReady,
    onExit: handleExitRoom,
    winStreakData: winStreakData ?? null,
    isAuthenticated,
    currentPlayerData: currentPlayerData ?? null,
    isCurrentUserWinner,
    currentPlayerValidWords,
    currentPlayerRank,
    scoreRevealComplete,
    setScoreRevealComplete,
    normalizeUsername,
    username,
    gameCode,
    onReturnToRoom,
    isBotsOnlyGame,
    isCurrentPlayerReady,
    readyUsernames,
    duplicateRuleDisabled: duplicateRuleDisabled ?? false,
    t,
    selectedGameMode,
    onSelectGameMode: setSelectedGameMode,
    seriesStandings,
    seriesRoundNumber,
    gameMode: resolvedGameMode,
    missedWords,
    emojiReactions: floatingReactions.map(r => ({
      id: r.id,
      emoji: r.emoji,
      username: r.username,
      timestamp: 0,
    })),
    allPlayerWords,
    gameDuration,
    wordHuntSummary,
    onPodiumReaction: sendReaction,
  };

  // Word Hunt results data (shared between tabs)
  const wordHuntResultsData = resolvedGameMode === 'word-hunt' ? {
    targetWord: wordHuntSummary?.targetWord || '',
    foundTarget: !!wordHuntSummary?.targetFoundBy,
    isFirstFinder: wordHuntSummary?.targetFoundBy === username,
    survivalTime: wordHuntSummary?.survivalTime ?? 0,
    discoveryWords: wordHuntSummary?.discoveryWords ?? 0,
    playerResults: (sortedScores || []).map((p) => {
      const words = p.allWords || [];
      const validWords = words.filter(w => w && !w.isDuplicate && w.validated);
      const invalidWords = words.filter(w => w && !w.isDuplicate && !w.validated);
      const avgLen = validWords.length > 0
        ? Math.round((validWords.reduce((s, w) => s + w.word.length, 0) / validWords.length) * 10) / 10
        : 0;
      const longestLen = validWords.reduce((max, w) => Math.max(max, w.word.length), 0);
      return {
        username: p.username,
        score: p.score || 0,
        survived: !(wordHuntSummary?.eliminatedPlayers || wordHuntEliminatedPlayers).includes(p.username),
        lifeRemaining: (wordHuntSummary?.playerLives || wordHuntPlayerLives)[p.username] ?? 0,
        validWordCount: validWords.length,
        invalidWordCount: invalidWords.length,
        avgWordLength: avgLen,
        longestWordLength: longestLen,
        avatar: p.avatar,
      };
    }),
    currentUsername: username,
  } : undefined;

  // Render Results Tab Content using shared component
  const renderResultsTab = () => (
    <>
      <ResultsMainContent
        {...mainContentProps}
        hideInlineCta={!isBotsOnlyGame}
      />
      {/* Game mode summary after hero banner — hero stays on top */}
      {resolvedGameMode === 'word-hunt' && wordHuntResultsData && (
        <div className="mb-3">
          <WordHuntResultsSummary {...wordHuntResultsData} />
        </div>
      )}
      {resolvedGameMode === 'blast' && (
        <div className="mb-3">
          <BlastResultsSummary
            movesUsed={blastMovesUsed}
            tilesCleared={blastTotalTilesCleared}
            tileBonus={blastTotalTileBonus}
          />
        </div>
      )}
      {/* Social actions: Add Friend for non-friend opponents (E-10, E-14) */}
      {gameCode && sortedScores.length > 1 && (
        <PostGameSocialActions
          opponents={otherPlayers}
          reducedMotion={null}
        />
      )}
    </>
  );

  // Shared props for details content component
  const detailsContentProps = {
    currentPlayerData: currentPlayerData ?? null,
    currentPlayerRank,
    sortedScores,
    winner: winner ?? null,
    allPlayerWords,
    xpGainedData: xpGainedData ?? null,
    levelUpData: levelUpData ?? null,
    currentPlayerArchetype: currentPlayerArchetype ?? null,
    duplicateRuleDisabled: duplicateRuleDisabled ?? false,
    isCurrentUserWinner,
    username,
    currentPlayerValidWords,
    achievements,
    gameCode,
    shareCardStats: {
      maxCombo: shareCardStats.maxCombo ?? 0,
      longestWord: shareCardStats.longestWord ?? '',
    },
    otherPlayers,
    playerArchetypes,
    missedWords,
    isHost,
    currentStreakCount: winStreakData?.currentStreak || 0,
    t,
    gameMode: resolvedGameMode,
    ...(resolvedGameMode === 'blast' ? {
      blastResults: {
        movesUsed: blastMovesUsed,
        tilesCleared: blastTotalTilesCleared,
        tileBonus: blastTotalTileBonus,
        playerStats: blastPlayerStats,
      },
    } : {}),
    ...(resolvedGameMode === 'word-hunt' && wordHuntResultsData ? {
      wordHuntResults: wordHuntResultsData,
    } : {}),
    isCurrentPlayerReady,
    onMarkReady: handleMarkReady,
  };

  // Render Details Tab Content using shared component
  const renderDetailsTab = () => (
    <ResultsDetailsContent {...detailsContentProps} />
  );

  return (
    <>
      {overlayModals}

      {/* MP signup nudges — non-intrusive, hidden on CrazyGames */}
      <MultiplayerSignupSheet
        isOpen={activeNudge === 'sheet'}
        onClose={dismissNudge}
        stats={mpNudgeStats}
      />
      <SignupToast
        isVisible={activeNudge === 'toast'}
        onDismiss={dismissNudge}
        mpGamesThisSession={mpNudgeStats.mpGamesThisSession}
      />

      <div
        className="flex-1 flex flex-col min-h-0 bg-neo-navy transition-colors duration-300 relative"
        style={{ background: 'radial-gradient(circle at center, var(--neo-navy-radial) 0%, var(--neo-navy) 70%)' }}
      >
        {/* Subtle dot pattern */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
            backgroundSize: '10px 10px',
          }}
        />

      {/* Subtle top gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-neo-cyan/5 to-transparent pointer-events-none" />

      {/* Floating emoji reactions overlay */}
      <div className="absolute inset-0 pointer-events-none z-40">
        <AnimatePresence>
          {floatingReactions.map((r) => (
            <FloatingReaction key={r.id} id={r.id} emoji={r.emoji} username={r.username} x={r.x} y={r.y} onComplete={dismissReaction} />
          ))}
        </AnimatePresence>
      </div>

      {/* MOBILE VIEW — single scroll, no tabs */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        {/* Header with pulsing indicator + exit */}
        <div className="flex-shrink-0 w-full flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-neo-cyan rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {t('results.matchResults') || 'Match Summary'}
            </span>
          </div>
          <ExitRoomButton onClick={handleExitRoom} label="" className="w-11 h-11 min-w-[44px] min-h-[44px] p-0" />
        </div>

        {/* Scrollable content — everything in one flow */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area px-2 pb-36 bg-neo-navy"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="max-w-lg mx-auto space-y-6">
            {renderResultsTab()}
            {/* CrazyGames banner ad — mobile size between results and details */}
            <CrazyGamesBanner size="320x50" />
            {/* Other players' details (inline, no tab switch needed) */}
            {renderDetailsTab()}
            {postGameWordReviewNode}
          </div>
        </div>

        {/* Floating bottom bar — always-visible sticky CTA */}
        {gameCode && onReturnToRoom && (
          <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 text-neo-cream">
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.3 }}
              className="bg-neo-navy/95 backdrop-blur-xl border-t border-neo-white/[0.08] shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
            >
              <div className="px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
                <StickyReadyBar
                  isHost={isHost}
                  isCurrentPlayerReady={isCurrentPlayerReady}
                  currentPlayerRank={currentPlayerRank}
                  winnerUsername={sortedScores[0]?.username}
                  readyCount={readyUsernames.length}
                  totalPlayers={sortedScores.length}
                  readyUsernames={readyUsernames}
                  players={sortedScores}
                  onStartGame={handleStartGame}
                  onMarkReady={handleMarkReady}
                  selectedGameMode={selectedGameMode}
                  onSelectGameMode={isHost ? setSelectedGameMode : undefined}
                  isSeriesComplete={isSeriesComplete}
                  seriesWinnerUsername={seriesWinnerUsername}
                  onNewSeries={handleNewSeries}
                />
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* DESKTOP/TABLET VIEW - Full-width hero then two-column details */}
      <DesktopResultsLayout
        handleExitRoom={handleExitRoom}
        exitLabel={t('results.exitRoom')}
        mainContentProps={mainContentProps}
        detailsContentProps={detailsContentProps}
        resolvedGameMode={resolvedGameMode}
        wordHuntResultsData={wordHuntResultsData}
        blastMovesUsed={blastMovesUsed}
        blastTotalTilesCleared={blastTotalTilesCleared}
        blastTotalTileBonus={blastTotalTileBonus}
        gameCode={gameCode}
        sortedScores={sortedScores}
        otherPlayers={otherPlayers}
        isBotsOnlyGame={isBotsOnlyGame}
        postGameWordReview={postGameWordReviewNode}
      />

      {/* DESKTOP Sticky Ready Bar — pinned to bottom on md+ screens */}
      {gameCode && onReturnToRoom && (
        <div className="hidden md:block fixed bottom-0 inset-x-0 z-50 bg-neo-navy text-neo-cream border-t-4 border-neo-black safe-area-pb">
          <div className="max-w-6xl mx-auto px-4 py-2.5">
            <StickyReadyBar
              isHost={isHost}
              isCurrentPlayerReady={isCurrentPlayerReady}
              currentPlayerRank={currentPlayerRank}
              winnerUsername={sortedScores[0]?.username}
              readyCount={readyUsernames.length}
              totalPlayers={sortedScores.length}
              readyUsernames={readyUsernames}
              players={sortedScores.map(p => ({ username: p.username, avatar: p.avatar, isBot: p.isBot }))}
              onStartGame={handleStartGame}
              onMarkReady={handleMarkReady}
              selectedGameMode={selectedGameMode}
              onSelectGameMode={isHost ? setSelectedGameMode : undefined}
              isSeriesComplete={isSeriesComplete}
              seriesWinnerUsername={seriesWinnerUsername}
              onNewSeries={handleNewSeries}
            />
          </div>
        </div>
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

      </div>
    </>
  );
};

function ResultsPageWithErrorBoundary(props: ResultsPageProps) {
  return (
    <FeatureErrorBoundary featureName="Results" showHomeButton={true}>
      <ResultsPage {...props} />
    </FeatureErrorBoundary>
  );
}

export default ResultsPageWithErrorBoundary;
