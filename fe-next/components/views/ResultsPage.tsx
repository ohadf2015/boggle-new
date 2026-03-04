'use client';

import React, { useMemo, useEffect, useState, useCallback, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, BarChart2 } from 'lucide-react';
import ExitRoomButton from '@/components/ExitRoomButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { clearSessionPreservingUsername } from '@/utils/session';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { useFirstWinCelebration } from '@/hooks/useFirstWinCelebration';
import logger from '@/utils/logger';
import type { ResultsPageProps } from '@/types/components';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { useResultsSocketEvents } from '@/components/results/useResultsSocketEvents';
import { useResultsData } from '@/hooks/useResultsData';
import { useResultsSideEffects } from '@/hooks/useResultsSideEffects';
import { useHideNavigation } from '@/contexts/NavigationContext';

// Dynamic import for landscape layout
const ResultsLandscapeLayout = dynamic(() => import('@/components/results/ResultsLandscapeLayout'), { ssr: false });
import { MobileTabBar } from '@/components/layout/MobileTabBar';

// Shared result components
import { ResultsActionButtons } from '@/components/results/ResultsActionButtons';
import { ResultsModals } from '@/components/results/ResultsModals';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import { ResultsMainContent } from '@/components/results/ResultsMainContent';
import { ResultsDetailsContent } from '@/components/results/ResultsDetailsContent';
import { generateRandomTable } from '@/utils/utils';
import { DIFFICULTIES } from '@/utils/consts';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import type { GameModeOption } from '@/components/GameModeSelector';
import { useGameMode } from '@/hooks/gameState/store';

const ResultsPage: React.FC<ResultsPageProps> = ({ finalScores, gameCode, onReturnToRoom, username, socket, achievements, duplicateRuleDisabled, playerCount, isHost = false, roomLanguage = 'en', gridSize = 4, gameDuration = 180 }) => {
  const { t } = useLanguage();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const isLandscape = useMobileLandscape();
  const setIsInGame = useHideNavigation();

  // Hide global bottom nav on mobile while viewing results
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  // Score reveal animation state (Netflix Boggle Party-inspired "trading places" reveal)
  const [scoreRevealComplete, setScoreRevealComplete] = useState<boolean>(false);
  // Game mode override for host (results page lets host change mode before next game)
  const [selectedGameMode, setSelectedGameMode] = useState<GameModeOption>('random');
  const resolvedGameMode = useGameMode();

  // Socket events for word feedback, XP, engagement features, and player ready state
  const {
    showWordFeedback,
    wordToVote,
    wordQueue,
    xpGainedData,
    levelUpData,
    showLevelUpCelebration,
    setShowLevelUpCelebration,
    nearMisses,
    mysteryReward,
    showMysteryReward,
    referralMilestone,
    showReferralMilestone,
    readyUsernames,
    isCurrentPlayerReady,
    handleVote,
    handleFeedbackSkip,
    handleMysteryRewardClose,
    handleReferralMilestoneClose,
    handleMarkReady,
  } = useResultsSocketEvents({ socket, username });

  // Mobile tab navigation state - Consolidated to 2 tabs for reduced cognitive load
  type MobileTab = 'results' | 'details';
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('results');

  // Extract all data processing logic into a custom hook
  const {
    sortedScores,
    winner,
    isCurrentUserWinner,
    currentPlayerRank,
    currentPlayerData,
    currentPlayerValidWords,
    otherPlayers,
    bannerPlayer,
    bannerRank,
    isCurrentUserInBanner,
    playerArchetypes,
    currentPlayerArchetype,
    missedWords,
    shareCardStats,
    isBotsOnlyGame,
    normalizeUsername,
  } = useResultsData({
    finalScores,
    username,
    gameDuration: 180, // Default 3-minute game
  });

  // Extract all side effects into a custom hook
  const {
    brainPointsReward,
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
      gameMode: selectedGameMode,
    });
  }, [socket, isHost, roomLanguage, selectedGameMode]);

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
      mysteryReward={{
        reward: mysteryReward,
        showMysteryReward,
        onClose: handleMysteryRewardClose,
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
      }}
      authModal={{
        showAuthModal,
        setShowAuthModal,
      }}
      firstWinModal={{
        showFirstWinModal,
        setShowFirstWinModal,
      }}
      t={t}
    />
  );

  // Landscape mode layout - 2-column: winner/actions left, player cards right
  if (isLandscape) {
    return (
      <ResultsLandscapeLayout
        sortedScores={sortedScores}
        winner={winner ?? null}
        username={username || ''}
        currentUsername={username || ''}
        gameCode={gameCode}
        isHost={isHost}
        isBotsOnlyGame={isBotsOnlyGame}
        isCurrentPlayerReady={isCurrentPlayerReady}
        readyUsernames={readyUsernames}
        onReturnToRoom={onReturnToRoom}
        onExitRoom={handleExitRoom}
        onStartGame={handleStartGame}
        onMarkReady={handleMarkReady}
        showExitConfirm={showExitConfirm}
        setShowExitConfirm={setShowExitConfirm}
        onConfirmExit={confirmExitRoom}
        allPlayerWords={allPlayerWords}
        playerArchetypes={playerArchetypes}
        xpGainedData={xpGainedData}
        levelUpData={levelUpData}
        duplicateRuleDisabled={duplicateRuleDisabled}
        normalizeUsername={normalizeUsername}
        overlayModals={overlayModals}
        t={t}
        selectedGameMode={selectedGameMode}
        onSelectGameMode={setSelectedGameMode}
      />
    );
  }

  // Mobile tab configuration - Consolidated to 2 tabs for reduced cognitive load
  const mobileTabs = [
    { id: 'results' as MobileTab, icon: <Trophy className="w-5 h-5" />, label: t('results.results') || 'Results' },
    { id: 'details' as MobileTab, icon: <BarChart2 className="w-5 h-5" />, label: t('results.details') || 'Details' },
  ];

  // Shared props for main content component
  const mainContentProps = {
    bannerPlayer: bannerPlayer ?? null,
    isCurrentUserInBanner,
    bannerRank,
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
    currentPlayerArchetype: currentPlayerArchetype ?? null,
    currentPlayerRank,
    brainPointsReward: brainPointsReward ?? null,
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
    allPlayerWords,
    t,
    selectedGameMode,
    onSelectGameMode: setSelectedGameMode,
  };

  // Render Results Tab Content using shared component
  const renderResultsTab = () => (
    <ResultsMainContent
      {...mainContentProps}
      onShowDetails={() => setMobileActiveTab('details')}
      showBanner={true}
      bannerSize="320x50"
    />
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
  };

  // Render Details Tab Content using shared component
  const renderDetailsTab = () => (
    <ResultsDetailsContent {...detailsContentProps} />
  );

  return (
    <>
      {overlayModals}
      <div className="flex-1 flex flex-col min-h-0 bg-neo-navy transition-colors duration-300 relative">
        {/* Neo-brutalist halftone dot pattern overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-10 dark:opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />

      {/* MOBILE VIEW - Tab-based layout (hidden on lg+) */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        {/* Exit Button Header */}
        <div className="flex-shrink-0 w-full flex items-center justify-end px-2 py-2">
          <ExitRoomButton onClick={handleExitRoom} label="" className="w-10 h-10 min-w-[40px] min-h-[40px] p-0" />
        </div>

        {/* Tab Content - Scrollable area */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area px-2 pb-24"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
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
        {/* Top Bar with Exit Button */}
        <div className="w-full max-w-6xl mx-auto flex items-center justify-end mb-4">
          <ExitRoomButton onClick={handleExitRoom} label={t('results.exitRoom')} />
        </div>

        {/* Two-Column Layout */}
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-row gap-6">
          {/* LEFT COLUMN: Results (Winner banner, stats, leaderboard, actions) */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            <ResultsMainContent
              {...mainContentProps}
              showBanner={false}
            />
          </div>

          {/* RIGHT COLUMN: Details (Your words, other players, charts, chat) */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            <ResultsDetailsContent
              {...detailsContentProps}
              hideRankAndScore={true}
              showBanner={true}
              bannerSize="300x250"
            />
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

      </div>
    </>
  );
};

export default ResultsPage;
