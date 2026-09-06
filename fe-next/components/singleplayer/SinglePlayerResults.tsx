'use client';

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import GameFeedback from '@/components/feedback/GameFeedback';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import { TrendingUp, ArrowLeft, RotateCcw } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import { longestWordOf } from '@/components/results/utils';
import { AchievementBadge } from '@/components/AchievementBadge';
import { useShareOpenGuard } from '@/hooks/useShareOpenGuard';

import WordFeedbackModal from '@/components/voting/WordFeedbackModal';
import UnfinishedBoardTeaser from '@/components/results/UnfinishedBoardTeaser';
import BonusBadgesRow from '@/components/results/BonusBadgesRow';
import CoinRewardDisplay from '@/components/results/CoinRewardDisplay';
import SinglePlayerGoldTopUp from './results/components/SinglePlayerGoldTopUp';
import DoubleGoldAdButton from '@/components/ads/DoubleGoldAdButton';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';

import NextStepPrompt, { type NextStepMode } from '@/components/results/NextStepPrompt';
import AutoPlayCountdown from '@/components/results/AutoPlayCountdown';
import TomorrowPreview from '@/components/results/TomorrowPreview';

const UGCFeaturedStrip = dynamic(() => import('@/components/ugc/UGCFeaturedStrip'), { ssr: false });
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
const UnifiedShareModal = dynamic(() => import('@/components/modals/UnifiedShareModal'), { ssr: false });

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useWinStreak } from '@/hooks/useWinStreak';
import { useIsDesktop } from '@/hooks/useDesktopLayout';
import { fireConfetti } from '@/utils/confettiUtils';
import { displayScore } from '@/utils/scoreDisplay';
import { useUnfinishedBoard } from '@/hooks/useUnfinishedBoard';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { useExperiment } from '@/hooks/useExperiment';
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

  useAchievementsSave,
  useWordValidation,
  useBannerConfig,
  useSharePromptImpression,
  GlobalRankBadge,
  PerformanceSection,
  YourWordsSection,
  AchievementsSection,
  BotWordsSection,
  ChallengeButton,
} from './results';

import { StatsCardGrid } from '@/components/results/shared';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import { GameEmojiShareCard, type SingleplayerShareData } from '@/components/shared/GameEmojiShareCard';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useAsyncChallengeProducer } from '@/hooks/useAsyncChallengeProducer';
import { readGamesCompletedCount } from '@/utils/gamesCompletedCount';
import { useProgressSnapshot } from './results/hooks/useProgressSnapshot';
import { ProgressPulseCard } from './results/components/ProgressPulseCard';
import { NextGamePicker } from './results/components/NextGamePicker';
import type { DifficultyLevel } from '@/shared/types/game';

const PerformanceChart = dynamic(() => import('@/components/results/PerformanceChart'), { ssr: false });
const InlineSignupCard = dynamic(() => import('@/components/auth/InlineSignupCard'), { ssr: false });
const PlacementHero = dynamic(() => import('@/components/results/PlacementHero'), { ssr: false });
const MobileCompactLeaderboard = dynamic(() => import('@/components/results/MobileCompactLeaderboard'), { ssr: false });
// Streak Ignition (t_89663cfc): the first-session payoff. Both cards read
// localStorage, so they stay out of SSR and reserve their own min-h (CLS=0).
const StreakIgnitionCard = dynamic(() => import('@/components/results/StreakIgnitionCard'), { ssr: false });
const TomorrowCard = dynamic(() => import('@/components/results/TomorrowCard'), { ssr: false });

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
  /** Board difficulty of the game just played — drives the bots ladder in the picker. */
  difficulty?: DifficultyLevel;
  /** Start a preset in-page (the "choose your next game" affordance). Picker hidden when absent. */
  onStartPreset?: (presetId: string) => void;
}

const SinglePlayerResults: React.FC<SinglePlayerResultsProps> = ({
  results,
  mode,
  onPlayAgain,
  onQuickRematch: _onQuickRematch,
  onBackToLobby,
  difficulty = 'MEDIUM',
  onStartPreset,
}) => {
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);
  const [showTomorrowPreview, setShowTomorrowPreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Interstitial AT THE TRANSITION, not over the score reveal. It used to fire
  // on mount — a fullscreen ad before the player had even seen their score,
  // the least relevant (and most exhausting) moment possible. Now every exit
  // (play again, harder rematch, next step, back) awaits it once; the hook's
  // own `firedRef` makes repeated calls no-ops, and the gate is best-effort so
  // a stalled ad can never strand the player on this screen.
  const { showInterstitial } = useInterstitialAd();
  const gateWithInterstitial = useCallback(async () => {
    try {
      await showInterstitial('singleplayer-complete');
    } catch {
      /* never block the exit */
    }
  }, [showInterstitial]);

  const handleBackToLobby = useCallback(() => {
    void gateWithInterstitial().then(() => {
      // Streak Ignition (t_89663cfc): first-session players already see the
      // persistent TomorrowCard on this screen — the 3s auto-dismiss banner
      // would only duplicate it. Send them straight back to the lobby.
      if (readGamesCompletedCount() <= 1) {
        onBackToLobby();
        return;
      }
      setShowTomorrowPreview(true);
    });
  }, [onBackToLobby, gateWithInterstitial]);

  const handlePlayAgainGated = useCallback(() => {
    void gateWithInterstitial().then(onPlayAgain);
  }, [gateWithInterstitial, onPlayAgain]);

  const handleQuickReplay = useCallback(() => {
    trackGrowthEvent('results_cta_clicked', { cta: 'quick_replay', mode });
    handlePlayAgainGated();
  }, [handlePlayAgainGated, mode]);

  const handleStartPresetGated = useCallback((presetId: string) => {
    if (!onStartPreset) return;
    void gateWithInterstitial().then(() => onStartPreset(presetId));
  }, [gateWithInterstitial, onStartPreset]);

  const handleTomorrowDismiss = useCallback(() => {
    setShowTomorrowPreview(false);
    onBackToLobby();
  }, [onBackToLobby]);

  const { t, language } = useLanguage();
  const { user, isAuthenticated, profile, updateProfile, loading: authLoading } = useAuth();
  const isDesktop = useIsDesktop();
  const { submitLeaderboardScore } = useCrazyGames();

  useEffect(() => {
    if (results.playerScore > 0) {
      submitLeaderboardScore(results.playerScore);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot BEFORE useGameHistory (below) appends this game — see the hook.
  const progressSnapshot = useProgressSnapshot(results);

  // Async friend-challenge integration: fires POST (challenger flow) or
  // PUT phase=challenged (friend flow) when a pending config is in sessionStorage.
  // Spec: fe-next/docs/specs/2026-05-13-friend-challenge-async-design.md
  const asyncChallengeBestWord = useMemo(() => {
    return (results.playerWords || []).reduce(
      (longest, w) => (w.length > longest.length ? w : longest),
      '',
    );
  }, [results.playerWords]);
  useAsyncChallengeProducer({
    enabled: true,
    score: results.playerScore,
    words: results.playerWords || [],
    bestWord: asyncChallengeBestWord || undefined,
    letterGrid: results.grid,
    gridSize: results.grid?.length ?? 4,
  });

  const nextStepMode: NextStepMode = mode === 'practice'
    ? 'practice'
    : (mode === 'solo-bots' ? 'solo-bots-to-mp' : 'daily');

  const playerAvatar = useMemo(() => {
    if (!profile) return undefined;
    return {
      customAvatar: profile.avatar_config ?? null,
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

  const { currentStreak, isLoaded: isStreakLoaded } = useWinStreak();

  // A/B test: show share prompt immediately after hero vs in normal results-page position
  const sharePromptTiming = usePostHogFlag<string>('share-prompt-timing', 'results-page');
  const showShareImmediate = sharePromptTiming === 'immediate';

  const { coinReward } = useCoinRewards({
    results, playerRank, totalParticipants: allParticipants.length,
    currentStreak,
  });

  useWinStreakTracking({ isGameComplete: true });

  // exp-results-replay-cta-v1: prominent "Run it back?" button above NextStepPrompt
  const { variant: replayCTAVariant, trackExposure: trackReplayCTAExposure } =
    useExperiment('exp-results-replay-cta-v1');

  // Funnel anchor: fire once on mount so PostHog can measure results-page drop-off
  useEffect(() => {
    trackGrowthEvent('results_viewed', { mode, score: results.playerScore });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save unfinished board for carry-over feature
  const { saveUnfinishedBoard } = useUnfinishedBoard();
  const missedWordStrings = useMemo(
    () => missedWords.map(w => w.word),
    [missedWords]
  );

  useEffect(() => {
    if (missedWordStrings.length >= 3 && results.grid) {
      saveUnfinishedBoard(results.grid, missedWordStrings, mode, results.playerScore);
    }
  }, [missedWordStrings, results.grid, mode, results.playerScore, saveUnfinishedBoard]);

  useAchievementsSave({ isAuthenticated, profile, results, updateProfile });

  const {
    wordValidationQueue, showWordValidation, setShowWordValidation, handleWordVote,
  } = useWordValidation({
    botWordsForValidation: results.botWordsForValidation,
    gameSessionId: results.gameSessionId,
    language: results.language,
    disabled: false,
  });

  const validWordCount = results.playerWordData?.filter(w => w.isValid).length || 0;

  const bannerConfig = useBannerConfig({
    playerScore: results.playerScore, validWordCount, mode,
    isNewHighScore: results.isNewHighScore, isNewAllTimeBest: results.isNewAllTimeBest,
    isWinner, playerRank, totalParticipants: allParticipants.length, t,
    totalBoardWords: results.allPossibleWords?.length,
  });

  const hasMinimumScore = results.playerScore > 0;

  useSharePromptImpression({ variant: sharePromptTiming, enabled: hasMinimumScore });

  // Share modal auto-open: fire exactly once per game session on win
  const { shouldFireShareOpen } = useShareOpenGuard();
  useEffect(() => {
    // Single-player: "win" = beat a bot or new high score
    const shouldAutoOpen = hasMinimumScore && (isWinner || results.isNewHighScore);
    if (!shouldAutoOpen) return;
    if (!results.gameSessionId) return;

    if (shouldFireShareOpen(results.gameSessionId)) {
      setShowShareModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire exactly once per gameSessionId
  }, [results.gameSessionId, isWinner, results.isNewHighScore, hasMinimumScore]);

  const shouldShowConfetti = hasMinimumScore && (
    (mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3) || isWinner || results.isNewHighScore
  );

  useEffect(() => {
    if (shouldShowConfetti) {
      const isRankCelebration = mode === 'solo-bots' && playerRank >= 1 && playerRank <= 3;
      const colors = isRankCelebration
        ? RANK_CONFETTI_COLORS[playerRank]
        : ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7'];
      // Bigger celebration for new high score / first place
      const particleCount = results.isNewHighScore ? 180 : isRankCelebration ? 140 : 100;
      const spread = results.isNewHighScore ? 100 : 70;
      fireConfetti({ particleCount, spread, origin: { y: 0.6 }, colors });
    }
  }, [shouldShowConfetti, mode, playerRank, results.isNewHighScore]);

  const gameLanguage = results.language || language;

  const shareData: SingleplayerShareData = useMemo(() => ({
    mode: 'singleplayer' as const,
    score: results.playerScore,
    words: results.playerWords || [],
    maxCombo: results.maxCombo,
    rank: mode === 'solo-bots' ? playerRank : undefined,
    totalPlayers: mode === 'solo-bots' ? allParticipants.length : undefined,
    isNewHighScore: results.isNewHighScore,
  }), [results.playerScore, results.playerWords, results.maxCombo, results.isNewHighScore, mode, playerRank, allParticipants.length]);

  // --- PORTRAIT / DESKTOP ---
  // Same components, different layout: desktop uses two-column grid via isDesktop hook.
  const profileDisplayName = profile?.display_name || profile?.username || t('common.you');

  // "How am I doing?" — every game, right under the hero.
  const progressBlock = <ProgressPulseCard snapshot={progressSnapshot} />;

  // "What's next?" — the mode choice single player lost with its lobby.
  const pickerBlock = onStartPreset ? (
    <NextGamePicker
      mode={mode}
      difficulty={difficulty}
      isWinner={isWinner}
      onStartPreset={handleStartPresetGated}
      onReplaySame={handlePlayAgainGated}
    />
  ) : null;

  const heroBlock = mode === 'solo-bots' ? (
    <PlacementHero
      rank={playerRank} score={displayScore(results.playerScore)} totalPlayers={allParticipants.length}
      username={profileDisplayName} avatar={playerAvatar}
      gapToWinner={playerRank > 1 ? (allParticipants[0]?.score || 0) - results.playerScore : 0}
    />
  ) : (
    <ResultsWinnerBanner
      winner={{ username: profileDisplayName, score: results.playerScore, avatar: playerAvatar }}
      isCurrentUserWinner={true}
      variant="completion"
      customMessage={bannerConfig.message || t('results.finalScore')}
      customAnnouncement={bannerConfig.announcement}
      compact={true}
    />
  );

  const leaderboardParticipants = useMemo(() =>
    allParticipants.map(p => ({
      name: p.name, score: p.score, isCurrentPlayer: p.isPlayer, isBot: !p.isPlayer,
    })), [allParticipants]);

  const leaderboardBlock = mode === 'solo-bots' && allParticipants.length > 1 ? (
    <MobileCompactLeaderboard participants={leaderboardParticipants} />
  ) : null;

  const statsBlock = (
    <StatsCardGrid cards={[
      { label: t('results.words'), value: validWordCount, icon: '📝' },
      {
        label: t('results.bestWord'),
        value: results.playerWordData && results.playerWordData.filter(w => w.isValid).length > 0
          ? results.playerWordData.filter(w => w.isValid).reduce((a, b) => a.word.length >= b.word.length ? a : b).word.toUpperCase()
          : '-',
        icon: '⭐', accent: 'lime' as const,
      },
      { label: t('results.coinsEarned'), value: coinReward ? `+${coinReward.awarded}` : '-', icon: '🪙', accent: 'amber' as const },
    ]} />
  );

  const signupBlock = !isAuthenticated && !authLoading ? (
    <InlineSignupCard
      isAuthenticated={isAuthenticated}
      titleKey="results.saveStreak.title"
      bodyKey="results.saveStreak.body"
      onCTAClick={() => trackGrowthEvent('save_streak_clicked', { source: 'solo_results' })}
    />
  ) : null;

  // Streak Ignition (t_89663cfc): the payoff directly below the celebration
  // hero — the visible streak + the persistent tomorrow hook. Two-column on
  // lg (TV/party screens), stacked on mobile. Practice mode has no opponent,
  // so completing the board IS the win there.
  const retentionBlock = (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-stretch">
      <StreakIgnitionCard
        won={mode === 'practice' ? true : isWinner}
        currentStreak={currentStreak}
        isLoaded={isStreakLoaded}
      />
      <TomorrowCard />
    </div>
  );

  const shareBlock = results.playerScore > 0 ? (
    <GameEmojiShareCard
      data={shareData}
      t={t}
      onShareClick={(method) =>
        trackGrowthEvent('share_win_prompt_clicked', { variant: sharePromptTiming, method })
      }
    />
  ) : null;

  const achievementsBlock = (
    ((results.achievements && results.achievements.length > 0) || totalComboBonus > 0 || totalFireRoundBonus > 0) ? (
      <div className="space-y-2">
        {mode === 'solo-bots' && playerArchetype && (
          <div className="flex justify-center"><PlayerArchetypeBadge archetype={playerArchetype} size="md" /></div>
        )}
        <BonusBadgesRow comboBonus={totalComboBonus} fireRoundBonus={totalFireRoundBonus} />
        {results.achievements && results.achievements.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {results.achievements.slice(0, 8).map((ach, i) => (
              <AchievementBadge key={ach.key} achievement={ach} index={i} />
            ))}
            {results.achievements.length > 8 && (
              <span className="text-xs text-neo-cyan font-bold text-center w-full">+{results.achievements.length - 8} more</span>
            )}
          </div>
        )}
      </div>
    ) : null
  );

  const ctaBlock = (
    <div className="space-y-3">
      {!autoPlayCancelled ? (
        <AutoPlayCountdown
          onComplete={handlePlayAgainGated}
          onCancel={() => {
            trackGrowthEvent('results_autoplay_cancelled', { mode });
            setAutoPlayCancelled(true);
          }}
          duration={5}
        />
      ) : (
        <>
          {replayCTAVariant === 'quick-replay' && (
            <Button
              className="w-full border-neo border-neo-black bg-neo-cyan text-neo-black font-bold shadow-hard hover:bg-neo-cyan/90 active:shadow-hard-pressed active:translate-y-px"
              onClick={() => { trackReplayCTAExposure(); handleQuickReplay(); }}
              data-testid="quick-replay-btn"
            >
              <RotateCcw className="me-2 w-4 h-4" />
              {t('results.playAgainQuestion')}
            </Button>
          )}
          {pickerBlock}
          <NextStepPrompt currentMode={nextStepMode} onBackToLobby={handleBackToLobby} variant={isDesktop ? 'desktop' : 'mobile'} beforeNavigate={gateWithInterstitial} />
          {results.grid && (
            <ChallengeButton grid={results.grid} score={results.playerScore} words={results.playerWords}
              gameLanguage={gameLanguage} gameDuration={results.gameDuration}
              variant={isDesktop ? 'default' : 'compact'} isWinner={isWinner} />
          )}
          <UGCFeaturedStrip
            titleKey="ugc.strip.tryCustom"
            sort="popular"
            limit={3}
            variant="compact"
            showCreateCTA
            minToShow={1}
          />
          <Button variant="ghost" className="w-full border-2 border-white/20 text-white hover:text-white hover:border-white/40" onClick={handleBackToLobby}>
            <ArrowLeft className="me-2 w-4 h-4 rtl:rotate-180" />{t('nextStep.backToLobby')}
          </Button>
        </>
      )}
    </div>
  );

  const analysisBlock = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-1 md:w-1.5 h-6 md:h-8 bg-neo-lime rounded-full" />
        <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider md:tracking-[0.2em]">
          {t('results.detailedAnalysis')}
        </h3>
        {isDesktop && <div className="flex-1 h-px bg-white/10" />}
      </div>
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 lg:items-start">
        <div className="space-y-3">
          {results.playerWordData && results.playerWordData.length > 0 && (
            <YourWordsSection wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups}
              invalidWords={invalidWords} wordCount={results.playerWordData.length}
              title={t('results.yourWords')} t={t} defaultExpanded={false} />
          )}
          {playerInsights && (
            <PerformanceSection insights={playerInsights} title={t('results.performanceDetails')} archetype={playerArchetype} />
          )}
          <CollapsibleSection title={t('results.performanceHistory')} icon={<TrendingUp className="w-4 h-4" />}
            defaultExpanded={false} variant="tertiary" className="shadow-hard">
            <PerformanceChart currentScore={results.playerScore} gamesLimit={10} />
          </CollapsibleSection>
        </div>
        <div className="space-y-3">
          {missedWordStrings.length >= 3 && (
            <UnfinishedBoardTeaser missedWords={missedWordStrings.slice(0, 3)} />
          )}
          {mode === 'solo-bots' && botWordDetails.length > 0 && (
            <BotWordsSection botWordDetails={botWordDetails} language={gameLanguage}
              title={t('singlePlayer.botWordsFound')} t={t} defaultExpanded={false} />
          )}
          {results.achievements && results.achievements.length > 4 && (
            <AchievementsSection achievements={results.achievements} title={t('hostView.achievements')}
              disclaimer={t('singlePlayer.achievementsNotSaved')} defaultExpanded={false} />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-dvh bg-neo-navy text-white">
      {/* Victory flash on new high score */}
      {results.isNewHighScore && <ScreenFlashOverlay trigger={1} colorClass="bg-neo-lime" />}
      <div className={isDesktop ? 'max-w-5xl mx-auto px-6 xl:px-8 pb-8 pt-4' : 'px-2 pb-28 pt-2'}>
        {isDesktop ? (
          <>
            <div className="grid grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-6 items-start">
              <div className="space-y-4">{heroBlock}{progressBlock}{showShareImmediate && shareBlock}{leaderboardBlock}</div>
              <div className="space-y-4">
                {statsBlock}
                <CoinRewardDisplay reward={coinReward} variant="compact" mode={isAuthenticated ? 'earned' : 'teasing'} />
                {/* Endowment/anchoring: double the exact amount they just earned */}
                {isAuthenticated && coinReward?.awarded ? (
                  <DoubleGoldAdButton earnedAmount={coinReward.awarded} surface="sp_results_double" />
                ) : null}
                {/* R7 — Rewarded gold top-up */}
                <SinglePlayerGoldTopUp t={t} />
                {!showShareImmediate && shareBlock}
                {achievementsBlock}
                {globalRank && <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank')} />}
                {ctaBlock}
                {/* Signup is demoted below the return CTAs and reframed as
                    streak insurance (t_89663cfc) — the screen asks for a
                    RETURN first, an account second. */}
                {signupBlock}
              </div>
            </div>
            <div className="mt-6">{retentionBlock}</div>
            <div className="mt-8">{analysisBlock}</div>
            {/* Inline banner ad (web iframe; native shows no inline banner) */}
            <CrazyGamesBanner size="728x90" className="mt-6" />
          </>
        ) : (
          <div className="space-y-4">
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>{heroBlock}</m.div>
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>{progressBlock}</m.div>
            {/* Streak Ignition: the payoff directly below the hero (t_89663cfc) */}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>{retentionBlock}</m.div>
            {showShareImmediate && <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>{shareBlock}</m.div>}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{leaderboardBlock}</m.div>
            <ResultsBannerSlot placement="singleplayer-complete" className="my-3" />
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{statsBlock}</m.div>
            {isAuthenticated && coinReward?.awarded ? (
              <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
                <DoubleGoldAdButton earnedAmount={coinReward.awarded} surface="sp_results_double" />
              </m.div>
            ) : null}
            {/* R7 — Rewarded gold top-up */}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
              <SinglePlayerGoldTopUp t={t} />
            </m.div>
            {!showShareImmediate && <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>{shareBlock}</m.div>}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>{achievementsBlock}</m.div>
            {globalRank && (
              <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43 }}>
                <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank')} />
              </m.div>
            )}
            {/* Inline banner ad (web iframe; native shows no inline banner) */}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
              <CrazyGamesBanner size="320x50" />
            </m.div>
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>{ctaBlock}</m.div>
            {/* Signup demoted below the return CTAs, reframed as streak
                insurance (t_89663cfc): ask for the RETURN first. */}
            {signupBlock && (
              <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}>
                {signupBlock}
              </m.div>
            )}
            <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>{analysisBlock}</m.div>
          </div>
        )}
        {/* End-of-game sentiment (game_feedback, surface=singleplayer). Shared
            throttle keeps it to ~once every few days across all surfaces. */}
        <div className="mt-4 max-w-lg mx-auto">
          <GameFeedback
            surface="singleplayer"
            eligible
            gameMode={mode}
            language={language}
            throttleKey={results.gameSessionId}
          />
        </div>
      </div>

      {!isDesktop && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-neo-navy/95 border-t-3 border-neo-black safe-area-bottom px-3 py-2.5">
          <NextStepPrompt currentMode={nextStepMode} onBackToLobby={handleBackToLobby} variant="landscape" beforeNavigate={gateWithInterstitial} />
        </div>
      )}

      <AnimatePresence>
        {showTomorrowPreview && (
          <TomorrowPreview mode={mode === 'practice' ? 'singleplayer' : mode as 'singleplayer'} onDismiss={handleTomorrowDismiss} />
        )}
      </AnimatePresence>

      {showWordValidation && wordValidationQueue.length > 0 && (
        <WordFeedbackModal isOpen={showWordValidation} word={wordValidationQueue[0] || ''} submittedBy="Bot"
          submitterAvatar={{ emoji: '\u{1F916}', color: '#6366f1' }}
          wordQueue={wordValidationQueue.map(w => ({ word: w, submittedBy: 'Bot', submitterAvatar: { emoji: '\u{1F916}', color: '#6366f1' } }))}
          timeoutSeconds={15} onVote={handleWordVote}
          onSkip={() => setShowWordValidation(false)} onTimeout={() => setShowWordValidation(false)} />
      )}

      {/* Post-win Share Prompt - Auto-opens exactly once via useShareOpenGuard */}
      <UnifiedShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        gameCode={`sp_${results.gameSessionId || ''}`}
        context="post-game"
        gameResult={{
          score: results.playerScore,
          wordCount: results.playerWords?.length || 0,
          isWinner: isWinner || results.isNewHighScore,
          longestWord: longestWordOf(results.playerWords),
          maxCombo: results.maxCombo,
        }}
        language={gameLanguage}
        t={t}
      />
    </div>
  );
};

export default SinglePlayerResults;
