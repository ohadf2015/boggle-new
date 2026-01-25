'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, BarChart3, TrendingUp } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import Top3Leaderboard, { type LeaderboardParticipant } from '@/components/results/Top3Leaderboard';
import { AchievementBadge } from '@/components/AchievementBadge';
import WordFeedbackModal from '@/components/voting/WordFeedbackModal';
import MissedWords from '@/components/results/MissedWords';
import CompactResultsStats from '@/components/results/CompactResultsStats';
import BonusBadgesRow from '@/components/results/BonusBadgesRow';
import CoinRewardDisplay from '@/components/results/CoinRewardDisplay';
import BrainPointsDisplay from '@/components/results/BrainPointsDisplay';
import RewardsSummary from '@/components/results/RewardsSummary';
import NextStepPrompt, { type NextStepMode } from '@/components/results/NextStepPrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import type { SinglePlayerResultsData, SinglePlayerMode } from './SinglePlayerView';
import {
  useResultsData,
  useGuestStatsSync,
  useLeaderboardSync,
  useGameHistory,
  useGameSessionLogging,
  useCoinRewards,
  useWinStreakTracking,
  useCognitiveScoring,
  useSignupPrompt,
  useAchievementsSave,
  useWordValidation,
  useBannerConfig,
  GlobalRankBadge,
  RankingsSection,
  LandscapeBanner,
  LandscapeWordsSection,
  ScoreDisplay,
  PerformanceSection,
  YourWordsSection,
  AchievementsSection,
  BotWordsSection,
  MobileResultsTab,
  MobileDetailsTab,
  ChallengeButton,
} from './results';
import { TrainingAnalysisModal } from '@/components/training';

const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });

const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'],
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'],
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'],
};

interface SinglePlayerResultsProps {
  results: SinglePlayerResultsData;
  mode: SinglePlayerMode;
  onPlayAgain: () => void;
  onQuickRematch?: () => void;
  onBackToLobby: () => void;
}

const SinglePlayerResults: React.FC<SinglePlayerResultsProps> = ({
  results,
  mode,
  onPlayAgain: _onPlayAgain,
  onQuickRematch: _onQuickRematch,
  onBackToLobby,
}) => {
  void _onPlayAgain;
  void _onQuickRematch;

  const { t, language } = useLanguage();
  const { user, isAuthenticated, profile, updateProfile, loading: authLoading } = useAuth();
  const isLandscape = useMobileLandscape();

  const nextStepMode: NextStepMode = mode === 'practice' ? 'practice' : 'solo-bots';
  type MobileTab = 'results' | 'details';
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('results');
  const [showTrainingAnalysis, setShowTrainingAnalysis] = useState(false);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  const playerAvatar = useMemo(() => {
    if (!profile) return undefined;
    return {
      emoji: profile.avatar_emoji,
      color: profile.avatar_color,
      profilePictureUrl: profile.profile_picture_url,
      avatarImage: profile.avatar_image,
    };
  }, [profile]);

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

  const { hasUpdatedStats } = useGuestStatsSync({
    isAuthenticated,
    results,
    isWinner,
    totalComboBonus,
    totalFireRoundBonus,
    playerArchetype,
  });

  const { globalRank } = useLeaderboardSync({
    isAuthenticated,
    results,
    hasUpdatedStats,
  });

  useGameHistory({
    results,
    playerRank,
    totalParticipants: allParticipants.length,
    isWinner,
    totalComboBonus,
    totalFireRoundBonus,
    playerArchetype,
  });

  useGameSessionLogging({
    results,
    language: language as string,
    userId: user?.id,
    playerRank,
  });

  const { coinReward } = useCoinRewards({
    results,
    playerRank,
    totalParticipants: allParticipants.length,
  });

  const { winStreakData } = useWinStreakTracking({ mode, isWinner });

  const { brainPointsReward } = useCognitiveScoring({
    userId: user?.id,
    mode,
    results,
  });

  const { showSignupModal, setShowSignupModal } = useSignupPrompt({
    isAuthenticated,
    hasUser: !!user,
    authLoading,
  });

  useAchievementsSave({
    isAuthenticated,
    profile,
    results,
    updateProfile,
  });

  const {
    wordValidationQueue,
    showWordValidation,
    setShowWordValidation,
    handleWordVote,
  } = useWordValidation({
    botWordsForValidation: results.botWordsForValidation,
    gameSessionId: results.gameSessionId,
    language: results.language,
  });

  const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;
  const totalAttempts = results.playerWordData?.length || 0;
  const accuracy = totalAttempts > 0 ? Math.round((validWordCount / totalAttempts) * 100) : 0;

  const bannerConfig = useBannerConfig({
    playerScore: results.playerScore,
    validWordCount,
    mode,
    isNewHighScore: results.isNewHighScore,
    isNewAllTimeBest: results.isNewAllTimeBest,
    isWinner,
    playerRank,
    totalParticipants: allParticipants.length,
    t,
  });

  const hasMinimumScore = results.playerScore > 0;
  const shouldShowConfetti = hasMinimumScore && (
    (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) ||
    isWinner ||
    results.isNewHighScore
  );

  useEffect(() => {
    if (shouldShowConfetti) {
      const colors = (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3)
        ? RANK_CONFETTI_COLORS[playerRank]
        : ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7'];
      fireConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    }
  }, [shouldShowConfetti, mode, playerRank]);

  const mobileTabs = [
    { id: 'results' as const, icon: <Trophy className="w-5 h-5" />, label: t('results.results') || 'Results' },
    { id: 'details' as const, icon: <BarChart3 className="w-5 h-5" />, label: t('results.details') || 'Details' },
  ];

  const gameLanguage = results.language || language;

  // --- LANDSCAPE MODE ---
  if (isLandscape) {
    const bannerLabels = {
      tryAgain: t('singlePlayer.tryAgain') || 'Try Again!',
      keepPracticing: t('singlePlayer.keepPracticing') || 'Keep Practicing!',
      newHighScore: t('singlePlayer.newHighScore') || 'New High Score!',
      victory: t('singlePlayer.victory') || 'Victory!',
      gameOver: t('singlePlayer.gameOver') || 'Game Over',
    };

    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-900 text-white p-2 gap-2">
        <div className="w-1/2 flex flex-col items-center gap-2 overflow-y-auto scrollable-area">
          <LandscapeBanner
            playerScore={results.playerScore}
            validWordCount={validWordCount}
            isWinner={isWinner}
            isNewHighScore={results.isNewHighScore}
            playerRank={playerRank}
            labels={bannerLabels}
          />
          <ScoreDisplay
            score={results.playerScore}
            wordCount={validWordCount}
            scoreLabel={t('common.score') || 'Score'}
            wordsLabel={t('common.words') || 'Words'}
          />
          {mode === 'solo-bots' && playerArchetype && (
            <PlayerArchetypeBadge archetype={playerArchetype} size="sm" />
          )}
          {results.achievements && results.achievements.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {results.achievements.slice(0, 3).map((achievement, i) => (
                <AchievementBadge key={achievement.key || `ach-${i}`} achievement={achievement} index={i} />
              ))}
            </div>
          )}
          <CoinRewardDisplay reward={coinReward} variant="inline" mode={isAuthenticated ? 'earned' : 'teasing'} />
          <BrainPointsDisplay reward={brainPointsReward} variant="inline" />
        </div>
        <div className="w-1/2 flex flex-col gap-2 overflow-y-auto scrollable-area">
          <LandscapeWordsSection
            wordsByPoints={wordsByPoints}
            sortedPointGroups={sortedPointGroups}
            title={t('results.yourWords') || 'Your Words'}
          />
          {mode === 'solo-bots' && allParticipants.length > 1 && (
            <RankingsSection participants={allParticipants} maxDisplay={4} title={t('results.rankings') || 'Rankings'} />
          )}
          {mode === 'solo-bots' && missedWords.length > 0 && (
            <MissedWords missedWords={missedWords} maxDisplay={3} className="text-sm" />
          )}
          <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="landscape" className="mt-auto" />
        </div>
        <FirstWinSignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} variant="multiGames" />
        <TrainingAnalysisModal isOpen={showTrainingAnalysis} onClose={() => setShowTrainingAnalysis(false)} returnTo={null} />
      </div>
    );
  }

  // --- PORTRAIT / DESKTOP ---
  return (
    <div className="min-h-dvh flex flex-col">
      {/* MOBILE VIEW */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area isolate-scroll px-2 pb-[--mobile-bottom-safe]">
          <div className="max-w-lg mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={mobileActiveTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {mobileActiveTab === 'results' && (
                  <MobileResultsTab
                    results={results}
                    mode={mode}
                    nextStepMode={nextStepMode}
                    playerRank={playerRank}
                    validWordCount={validWordCount}
                    accuracy={accuracy}
                    isWinner={isWinner}
                    isAuthenticated={isAuthenticated}
                    playerArchetype={playerArchetype}
                    coinReward={coinReward}
                    brainPointsReward={brainPointsReward}
                    globalRank={globalRank}
                    totalComboBonus={totalComboBonus}
                    totalFireRoundBonus={totalFireRoundBonus}
                    winStreakData={winStreakData}
                    allParticipants={allParticipants}
                    bannerConfig={bannerConfig}
                    shouldShowConfetti={shouldShowConfetti}
                    onBackToLobby={onBackToLobby}
                    onSwitchToDetails={() => setMobileActiveTab('details')}
                    t={t}
                  />
                )}
                {mobileActiveTab === 'details' && (
                  <MobileDetailsTab
                    results={results}
                    mode={mode}
                    gameLanguage={gameLanguage}
                    playerInsights={playerInsights}
                    wordsByPoints={wordsByPoints}
                    sortedPointGroups={sortedPointGroups}
                    invalidWords={invalidWords}
                    botWordDetails={botWordDetails}
                    missedWords={missedWords}
                    t={t}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy text-neo-cream border-t-4 border-neo-black safe-area-bottom">
          <MobileTabBar tabs={mobileTabs} activeTab={mobileActiveTab} onTabChange={(id) => setMobileActiveTab(id as MobileTab)} />
        </div>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:flex md:flex-col md:overflow-auto p-4 xl:p-6">
        <div className="flex-1 w-full max-w-5xl mx-auto flex flex-row gap-6">
          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            <ResultsWinnerBanner
              winner={{ username: t('common.you') || 'You', score: results.playerScore }}
              isCurrentUserWinner={true}
              rank={mode === 'solo-bots' ? playerRank : 1}
              variant={bannerConfig.variant}
              customMessage={bannerConfig.message}
              customAnnouncement={bannerConfig.announcement}
              showConfetti={shouldShowConfetti}
            />
            {mode !== 'practice' && winStreakData && winStreakData.currentStreak > 0 && (
              <RewardsSummary
                coinReward={coinReward}
                isAuthenticated={isAuthenticated}
                winStreak={winStreakData}
                achievementsUnlocked={results.achievements?.length || 0}
                isWinner={isWinner}
                onAchievementsClick={() => setMobileActiveTab('details')}
              />
            )}
            <CompactResultsStats
              wordCount={validWordCount}
              accuracy={accuracy}
              archetype={playerArchetype}
              coinReward={coinReward}
              coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
              brainPointsReward={brainPointsReward}
              currentScore={results.playerScore}
            />
            {globalRank && (
              <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank') || 'Global Rank'} />
            )}
            <BonusBadgesRow comboBonus={totalComboBonus} fireRoundBonus={totalFireRoundBonus} />
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
            <div ref={actionButtonsRef}>
              <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="desktop" />
            </div>
            {/* Challenge a Friend - share the same board */}
            {results.grid && (
              <ChallengeButton
                grid={results.grid}
                score={results.playerScore}
                words={results.playerWords}
                gameLanguage={gameLanguage}
                gameDuration={results.gameDuration}
                variant="default"
              />
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 min-w-0 max-w-xl space-y-4">
            {playerInsights && (
              <PerformanceSection insights={playerInsights} title={t('results.performanceDetails') || 'Performance Details'} />
            )}
            {results.playerWordData && results.playerWordData.length > 0 && (
              <YourWordsSection
                wordsByPoints={wordsByPoints}
                sortedPointGroups={sortedPointGroups}
                invalidWords={invalidWords}
                wordCount={results.playerWordData.length}
                title={t('results.yourWords') || 'Your Words'}
                t={t}
              />
            )}
            <CollapsibleSection
              title={t('results.performanceHistory') || 'Performance History'}
              icon={<TrendingUp className="w-4 h-4" />}
              defaultExpanded={false}
              variant="tertiary"
              className="shadow-hard"
            >
              <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
            </CollapsibleSection>
            {mode === 'solo-bots' && missedWords.length > 0 && (
              <MissedWords missedWords={missedWords} maxDisplay={5} />
            )}
            {mode === 'solo-bots' && botWordDetails.length > 0 && (
              <BotWordsSection
                botWordDetails={botWordDetails}
                language={gameLanguage}
                title={t('singlePlayer.botWordsFound') || 'Bot Words Found'}
                t={t}
                defaultExpanded={false}
              />
            )}
            {results.achievements && results.achievements.length > 4 && (
              <AchievementsSection
                achievements={results.achievements}
                title={t('hostView.achievements') || 'Achievements'}
                disclaimer={t('singlePlayer.achievementsNotSaved') || 'Achievements in single player mode are not saved to your profile.'}
                defaultExpanded={false}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWordValidation && wordValidationQueue.length > 0 && (
        <WordFeedbackModal
          isOpen={showWordValidation}
          word={wordValidationQueue[0] || ''}
          submittedBy="Bot"
          submitterAvatar={{ emoji: '?', color: '#6366f1' }}
          wordQueue={wordValidationQueue.map(w => ({
            word: w,
            submittedBy: 'Bot',
            submitterAvatar: { emoji: '?', color: '#6366f1' }
          }))}
          timeoutSeconds={15}
          onVote={handleWordVote}
          onSkip={() => setShowWordValidation(false)}
          onTimeout={() => setShowWordValidation(false)}
        />
      )}
      <FirstWinSignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} variant="multiGames" />
      <TrainingAnalysisModal isOpen={showTrainingAnalysis} onClose={() => setShowTrainingAnalysis(false)} returnTo={null} />
    </div>
  );
};

export default SinglePlayerResults;
