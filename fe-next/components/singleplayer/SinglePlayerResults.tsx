'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, ArrowLeft } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import { AchievementBadge } from '@/components/AchievementBadge';

import WordFeedbackModal from '@/components/voting/WordFeedbackModal';
import MissedWords from '@/components/results/MissedWords';
import BonusBadgesRow from '@/components/results/BonusBadgesRow';
import CoinRewardDisplay from '@/components/results/CoinRewardDisplay';

import NextStepPrompt, { type NextStepMode } from '@/components/results/NextStepPrompt';
import WordHuntAnnouncementBanner from '@/components/results/WordHuntAnnouncementBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { fireConfetti } from '@/utils/confettiUtils';
import { useMobileLandscape } from '@/hooks/useMobileLandscape';
import { Button } from '@/components/ui/button';
import type { SinglePlayerResultsData, SinglePlayerMode } from './SinglePlayerView';
import {
  useResultsData,
  useGuestStatsSync,
  useLeaderboardSync,
  useGameHistory,
  useGameSessionLogging,
  useCoinRewards,
  useWinStreakTracking,

  useSignupPrompt,
  useAchievementsSave,
  useWordValidation,
  useBannerConfig,
  GlobalRankBadge,
  LandscapeBanner,
  LandscapeWordsSection,
  ScoreDisplay,
  PerformanceSection,
  YourWordsSection,
  AchievementsSection,
  BotWordsSection,
  RankingsSection,
  ChallengeButton,
} from './results';
import { TrainingAnalysisModal } from '@/components/training';
import RewardedAdGoldButton from '@/components/ads/RewardedAdGoldButton';
import { StatsCardGrid } from '@/components/results/shared';

const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
const FirstWinSignupModal = dynamic(() => import('@/components/auth/FirstWinSignupModal'), { ssr: false });
const PlacementHero = dynamic(() => import('@/components/results/PlacementHero'), { ssr: false });
const MobileCompactLeaderboard = dynamic(() => import('@/components/results/MobileCompactLeaderboard'), { ssr: false });

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

  const { t, language } = useLanguage();
  const { user, isAuthenticated, profile, updateProfile, loading: authLoading } = useAuth();
  const isLandscape = useMobileLandscape();
  const { showInterstitial } = useAdPlacement();

  useEffect(() => {
    showInterstitial('singleplayer-complete');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nextStepMode: NextStepMode = mode === 'practice' ? 'practice' : 'solo-bots';
  const [showTrainingAnalysis, setShowTrainingAnalysis] = useState(false);

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
    allParticipants, playerRank, isWinner, playerInsights,
    wordsByPoints, sortedPointGroups, invalidWords,
    totalComboBonus, totalFireRoundBonus, botWordDetails,
    playerArchetype, missedWords,
  } = useResultsData(results, t, playerAvatar);

  const { hasUpdatedStats } = useGuestStatsSync({
    isAuthenticated, results, isWinner, totalComboBonus, totalFireRoundBonus, playerArchetype,
  });

  const { globalRank } = useLeaderboardSync({ isAuthenticated, results, hasUpdatedStats });

  useGameHistory({
    results, playerRank, totalParticipants: allParticipants.length,
    isWinner, totalComboBonus, totalFireRoundBonus, playerArchetype,
  });

  useGameSessionLogging({ results, language: language as string, userId: user?.id, playerRank });

  const { coinReward } = useCoinRewards({
    results, playerRank, totalParticipants: allParticipants.length,
  });

  useWinStreakTracking({ mode, isWinner });


  const { showSignupModal, setShowSignupModal } = useSignupPrompt({
    isAuthenticated, hasUser: !!user, authLoading,
  });

  useAchievementsSave({ isAuthenticated, profile, results, updateProfile });

  const {
    wordValidationQueue, showWordValidation, setShowWordValidation, handleWordVote,
  } = useWordValidation({
    botWordsForValidation: results.botWordsForValidation,
    gameSessionId: results.gameSessionId,
    language: results.language,
    disabled: showSignupModal,
  });

  const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;

  const bannerConfig = useBannerConfig({
    playerScore: results.playerScore, validWordCount, mode,
    isNewHighScore: results.isNewHighScore, isNewAllTimeBest: results.isNewAllTimeBest,
    isWinner, playerRank, totalParticipants: allParticipants.length, t,
  });

  const hasMinimumScore = results.playerScore > 0;
  const shouldShowConfetti = hasMinimumScore && (
    (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) || isWinner || results.isNewHighScore
  );

  useEffect(() => {
    if (shouldShowConfetti) {
      const colors = (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3)
        ? RANK_CONFETTI_COLORS[playerRank]
        : ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7'];
      fireConfetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
    }
  }, [shouldShowConfetti, mode, playerRank]);

  const gameLanguage = results.language || language;

  // --- LANDSCAPE MODE (unchanged) ---
  if (isLandscape) {
    const bannerLabels = {
      tryAgain: t('singlePlayer.tryAgain'),
      keepPracticing: t('singlePlayer.keepPracticing'),
      newHighScore: t('singlePlayer.newHighScore'),
      victory: t('singlePlayer.victory'),
      gameOver: t('singlePlayer.gameOver'),
    };

    return (
      <div className="flex h-dvh w-full overflow-hidden bg-slate-900 text-white p-2 gap-2">
        <div className="w-1/2 flex flex-col items-center gap-2 overflow-y-auto scrollable-area">
          <LandscapeBanner
            playerScore={results.playerScore} validWordCount={validWordCount}
            isWinner={isWinner} isNewHighScore={results.isNewHighScore}
            playerRank={playerRank} labels={bannerLabels}
          />
          <ScoreDisplay
            score={results.playerScore} wordCount={validWordCount}
            scoreLabel={t('common.score')} wordsLabel={t('common.words')}
          />
          {mode === 'solo-bots' && playerArchetype && (
            <PlayerArchetypeBadge archetype={playerArchetype} size="sm" />
          )}
          {results.achievements && results.achievements.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center max-w-full px-2">
              {results.achievements.slice(0, 3).map((achievement, i) => (
                <AchievementBadge key={achievement.key || `ach-${i}`} achievement={achievement} index={i} />
              ))}
            </div>
          )}
          <CoinRewardDisplay reward={coinReward} variant="inline" mode={isAuthenticated ? 'earned' : 'teasing'} />
        </div>
        <div className="w-1/2 flex flex-col gap-2 overflow-y-auto scrollable-area">
          <LandscapeWordsSection
            wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups}
            title={t('results.yourWords')}
          />
          {mode === 'solo-bots' && allParticipants.length > 1 && (
            <RankingsSection participants={allParticipants} maxDisplay={4} title={t('results.rankings')} />
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

  // --- PORTRAIT / DESKTOP: Single-scroll layout ---
  // Uses natural page scroll (no internal overflow container) so mobile scrolling works reliably.
  // Fixed bottom bar on mobile provides the sticky CTA.
  return (
    <div className="min-h-dvh bg-neo-navy text-white">
      <div className="px-2 md:px-4 xl:px-6 pb-20 md:pb-6">
        <div className="mx-auto space-y-4 md:space-y-6 pt-2 md:pt-4">

          {/* 1. Hero Zone — PlacementHero for solo-bots (matches MP style) */}
          {mode === 'solo-bots' ? (
            <PlacementHero
              rank={playerRank}
              score={results.playerScore}
              totalPlayers={allParticipants.length}
              username={profile?.display_name || profile?.username || t('common.you')}
              avatar={playerAvatar}
              gapToWinner={playerRank > 1 ? (allParticipants[0]?.score || 0) - results.playerScore : 0}
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-xs font-black uppercase tracking-widest text-neo-lime mb-1">
                {bannerConfig.message || t('results.finalScore')}
              </p>
              <p className="font-black text-6xl sm:text-7xl text-white tabular-nums" style={{ WebkitTextStroke: '2px rgba(0,0,0,0.3)', textShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
                {results.playerScore}
              </p>
              {bannerConfig.announcement && (
                <p className="text-white/60 text-sm font-bold mt-1">{bannerConfig.announcement}</p>
              )}
            </div>
          )}

          {/* 2. Leaderboard — compact ranked list (matches MP MobileCompactLeaderboard) */}
          {mode === 'solo-bots' && allParticipants.length > 1 && (
            <MobileCompactLeaderboard
              participants={allParticipants.map(p => ({
                name: p.name,
                score: p.score,
                isCurrentPlayer: p.isPlayer,
                isBot: !p.isPlayer,
              }))}
            />
          )}

          {/* 3. Stats row — same grid style as MP */}
          <StatsCardGrid
            cards={[
              { label: t('results.words'), value: validWordCount, icon: '📝' },
              {
                label: t('results.bestWord'),
                value: results.playerWordData && results.playerWordData.filter(w => w.isValid).length > 0
                  ? results.playerWordData.filter(w => w.isValid).reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase()
                  : '-',
                icon: '⭐',
                accent: 'lime',
              },
              {
                label: t('results.coinsEarned'),
                value: coinReward ? `+${coinReward.awarded}` : '-',
                icon: '🪙',
                accent: 'amber',
              },
            ]}
          />

          {/* 3.5. Rewarded Ad for Gold */}
          <div className="flex justify-center">
            <RewardedAdGoldButton goldAmount={25} />
          </div>

          {/* 4. Achievements + Bonus */}
          {(results.achievements && results.achievements.length > 0) || totalComboBonus > 0 || totalFireRoundBonus > 0 ? (
            <div className="space-y-2">
              {results.achievements && results.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-3">
                  {results.achievements.slice(0, 8).map((ach, i) => (
                    <AchievementBadge key={ach.key} achievement={ach} index={i} />
                  ))}
                  {results.achievements.length > 8 && (
                    <span className="text-xs text-neo-cyan font-bold lg:col-span-3 xl:col-span-4 text-center">+{results.achievements.length - 8} more</span>
                  )}
                </div>
              )}
              <BonusBadgesRow comboBonus={totalComboBonus} fireRoundBonus={totalFireRoundBonus} />
            </div>
          ) : null}

          {/* 5. Global Rank Badge */}
          {globalRank && (
            <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank')} />
          )}

          {/* Word Hunt promo — shown max 3 times total, only for non-WH games */}
          <WordHuntAnnouncementBanner className="mt-4" />

          {/* 7. Desktop What's Next + Challenge - 70/30 split */}
          <div className="hidden md:flex gap-4">
            <div className="flex-[7]">
              <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="desktop" />
            </div>
            <div className="flex-[3] space-y-3">
              {results.grid && (
                <ChallengeButton
                  grid={results.grid} score={results.playerScore}
                  words={results.playerWords} gameLanguage={gameLanguage}
                  gameDuration={results.gameDuration} variant="default"
                />
              )}
              <Button
                variant="ghost"
                className="w-full border-2 border-white/20 text-white/70 hover:text-white hover:border-white/40"
                onClick={onBackToLobby}
              >
                <ArrowLeft className="me-2 w-4 h-4 rtl:rotate-180" />
                {t('nextStep.backToLobby')}
              </Button>
            </div>
          </div>

          {/* 8. Mobile: Challenge + Back buttons */}
          <div className="md:hidden space-y-3">
            {results.grid && (
              <ChallengeButton
                grid={results.grid} score={results.playerScore}
                words={results.playerWords} gameLanguage={gameLanguage}
                gameDuration={results.gameDuration} variant="compact"
                isWinner={isWinner}
              />
            )}
            <Button
              variant="ghost"
              className="w-full border-2 border-white/20 text-white/70 hover:text-white hover:border-white/40"
              onClick={onBackToLobby}
            >
              <ArrowLeft className="me-2 w-4 h-4 rtl:rotate-180" />
              {t('nextStep.backToLobby')}
            </Button>
          </div>

          {/* 9. Detailed Analysis - collapsed sections, 2-col on desktop */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-neo-lime rounded-full" />
              <h3 className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-wider">
                {t('results.detailedAnalysis')}
              </h3>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start space-y-3 lg:space-y-0">
              {/* Left analysis column */}
              <div className="space-y-3">
                {results.playerWordData && results.playerWordData.length > 0 && (
                  <YourWordsSection
                    wordsByPoints={wordsByPoints}
                    sortedPointGroups={sortedPointGroups}
                    invalidWords={invalidWords}
                    wordCount={results.playerWordData.length}
                    title={t('results.yourWords')}
                    t={t}
                    defaultExpanded={false}
                  />
                )}

                {playerInsights && (
                  <PerformanceSection
                    insights={playerInsights}
                    title={t('results.performanceDetails')}
                    archetype={playerArchetype}
                  />
                )}

                <CollapsibleSection
                  title={t('results.performanceHistory')}
                  icon={<TrendingUp className="w-4 h-4" />}
                  defaultExpanded={false}
                  variant="tertiary"
                  className="shadow-hard"
                >
                  <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
                </CollapsibleSection>
              </div>

              {/* Right analysis column */}
              <div className="space-y-3">
                {mode === 'solo-bots' && missedWords.length > 0 && (
                  <MissedWords missedWords={missedWords} maxDisplay={5} />
                )}

                {mode === 'solo-bots' && botWordDetails.length > 0 && (
                  <BotWordsSection
                    botWordDetails={botWordDetails}
                    language={gameLanguage}
                    title={t('singlePlayer.botWordsFound')}
                    t={t}
                    defaultExpanded={false}
                  />
                )}

                {results.achievements && results.achievements.length > 4 && (
                  <AchievementsSection
                    achievements={results.achievements}
                    title={t('hostView.achievements')}
                    disclaimer={t('singlePlayer.achievementsNotSaved')}
                    defaultExpanded={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar - compact single row */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-neo-navy/95 backdrop-blur-sm border-t-3 border-neo-black safe-area-bottom px-3 py-2.5">
        <NextStepPrompt currentMode={nextStepMode} onBackToLobby={onBackToLobby} variant="landscape" />
      </div>

      {/* Modals */}
      {showWordValidation && wordValidationQueue.length > 0 && (
        <WordFeedbackModal
          isOpen={showWordValidation}
          word={wordValidationQueue[0] || ''}
          submittedBy="Bot"
          submitterAvatar={{ emoji: '\u{1F916}', color: '#6366f1' }}
          wordQueue={wordValidationQueue.map(w => ({
            word: w,
            submittedBy: 'Bot',
            submitterAvatar: { emoji: '\u{1F916}', color: '#6366f1' },
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
