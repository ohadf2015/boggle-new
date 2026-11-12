'use client';

import { ResultsSocialSlot } from '@/components/results/ResultsSocialSlot';
import type { ResultsXp } from '@/components/progression/NextUnlockTeaser';
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import GameFeedback from '@/components/feedback/GameFeedback';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import { RotateCcw, Home } from 'lucide-react';
import { longestWordOf } from '@/components/results/utils';
import { BestMissedWordLine, RewardLine } from '@/components/results/ResultsLines';
import { pickBestMissedWord } from '@/components/results/bestMissedWord';
import SinglePlayerGoldTopUp from './results/components/SinglePlayerGoldTopUp';
import DoubleGoldAdButton from '@/components/ads/DoubleGoldAdButton';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import { SupporterInterestCard } from '@/components/monetization/SupporterInterestCard';

import NextStepPrompt, { type NextStepMode } from '@/components/results/NextStepPrompt';

const UGCFeaturedStrip = dynamic(() => import('@/components/ugc/UGCFeaturedStrip'), { ssr: false });
const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { useWinStreak } from '@/hooks/useWinStreak';
import { useIsDesktop } from '@/hooks/useDesktopLayout';
import { useResultsStickyCtaHeight } from '@/hooks/useResultsStickyCtaHeight';
import { displayScore } from '@/utils/scoreDisplay';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
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
  ChallengeButton,
} from './results';

import { ResultsNextBar } from '@/components/results/stage/ResultsNextBar';
import { SoloResultsHero } from './results/components/SoloResultsHero';
import { formatRankOrdinal } from '@/utils/formatRankOrdinal';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { GameEmojiShareCard, type SingleplayerShareData } from '@/components/shared/GameEmojiShareCard';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useSoloAsyncChallenge } from './results/hooks/useSoloAsyncChallenge';
import { useProgressSnapshot } from './results/hooks/useProgressSnapshot';
import { ProgressPulseCard } from './results/components/ProgressPulseCard';
import { NextGamePicker } from './results/components/NextGamePicker';
import { buildNextGameOptions } from './results/nextGame';
import { useSoloResultsMoment } from './results/hooks/useSoloResultsMoment';
import { NearMissLine } from './results/components/NearMissLine';
import { ResultsMascotMoment } from './results/components/ResultsMascotMoment';
import { SoloAchievementsBlock } from './results/components/SoloAchievementsBlock';
import { SoloAnalysisBlock } from './results/components/SoloAnalysisBlock';
import { SoloRetentionBlock } from './results/components/SoloRetentionBlock';
import { SoloResultsOverlays } from './results/components/SoloResultsOverlays';
import { RevealIn } from './results/components/RevealIn';
import { useSoloResultsExits } from './results/hooks/useSoloResultsExits';
import { useSoloResultsCelebration } from './results/hooks/useSoloResultsCelebration';

const HIDE_SAME = ['rematch-same'] as const;
import { MissionsCompletedNote, RecordBadges } from './results/components/RecordBadges';
import type { DifficultyLevel } from '@/shared/types/game';

const InlineSignupCard = dynamic(() => import('@/components/auth/InlineSignupCard'), { ssr: false });
const MobileCompactLeaderboard = dynamic(() => import('@/components/results/MobileCompactLeaderboard'), { ssr: false });

interface SinglePlayerResultsProps {
  results: SinglePlayerResultsData;
  xp?: ResultsXp | null;
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
  xp = null,
  mode,
  onPlayAgain,
  onQuickRematch: _onQuickRematch,
  onBackToLobby,
  difficulty = 'MEDIUM',
  onStartPreset,
}) => {
  const {
    gateWithInterstitial, handleBackToLobby, handlePlayAgainGated, handleStartPresetGated,
    handleTomorrowDismiss, showTomorrowPreview,
  } = useSoloResultsExits({ onPlayAgain, onBackToLobby, onStartPreset });

  const { t, language } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, profile, updateProfile, loading: authLoading } = useAuth();
  const isDesktop = useIsDesktop()
  const stickyCtaRef = useResultsStickyCtaHeight<HTMLDivElement>();
  const { submitLeaderboardScore } = useCrazyGames();

  useEffect(() => {
    if (results.playerScore > 0) {
      submitLeaderboardScore(results.playerScore);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot BEFORE useGameHistory (below) appends this game — see the hook.
  const [guestAvatar] = useState(() => (user ? null : getOrCreateStoredCustomAvatar()));
  const progressSnapshot = useProgressSnapshot(results);

  useSoloAsyncChallenge(results);

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
    soloGamesPlayed, dailyDoneEver, recordFlags, previousBestScore,
  } = useResultsData(results, t, playerAvatar, {
    difficulty,
    trackSoloRound: mode === 'solo-bots',
  });

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

  // Web demand probe: honest "remove ads" interest card next to the rewarded gold top-up.
  const showSupporterCard = usePostHogFlag<boolean>('supporter-card-sp-results', false);

  const { coinReward } = useCoinRewards({
    results, playerRank, totalParticipants: allParticipants.length,
    currentStreak,
  });

  useWinStreakTracking({ isGameComplete: true });


  // Funnel anchor: fire once on mount so PostHog can measure results-page drop-off
  useEffect(() => {
    trackGrowthEvent('results_viewed', { mode, score: results.playerScore });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The one best word on this board the player didn't find: the full board
  // list when the game produced one, else the words the bots found.
  const bestMissed = useMemo(() => pickBestMissedWord(
    results.allPossibleWords?.length ? results.allPossibleWords : missedWords.map(w => w.word),
    (results.playerWordData ?? []).map(w => w.word),
    results.language || language,
  ), [results.allPossibleWords, results.playerWordData, results.language, missedWords, language]);

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

  const { showShareModal, setShowShareModal } = useSoloResultsCelebration({
    results, mode, playerRank, isWinner, hasMinimumScore,
  });

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

  // "How am I doing?" — every game, right under the hero.
  const progressBlock = (
    <div className="flex flex-col gap-4">
      <ResultsSocialSlot mode="single" score={results.playerScore} previousBest={previousBestScore} xp={xp} />
      <ProgressPulseCard snapshot={progressSnapshot} />
    </div>
  );

  // "What's next?" — the mode choice single player lost with its lobby.
  // "Run it back" IS the picker's same-setup option (incl. the new-player
  // rotation preset), so the picker hides that tile instead of duplicating it.
  const pickerGamesPlayed = mode === 'solo-bots' && typeof soloGamesPlayed === 'number' ? soloGamesPlayed : undefined;
  const pickerDailyDoneEver = mode === 'solo-bots' && typeof dailyDoneEver === 'boolean' ? dailyDoneEver : undefined;
  const replayPresetId = useMemo(() => {
    if (!onStartPreset) return '';
    const same = buildNextGameOptions({
      mode, difficulty, isWinner, language,
      ...(pickerGamesPlayed !== undefined && pickerDailyDoneEver !== undefined
        ? { gamesPlayed: pickerGamesPlayed, dailyDoneEver: pickerDailyDoneEver } : {}),
    }).find((opt) => opt.id === 'rematch-same');
    return same?.kind === 'action' ? same.presetId : '';
  }, [onStartPreset, mode, difficulty, isWinner, language, pickerGamesPlayed, pickerDailyDoneEver]);

  const { nearMiss, celebration } = useSoloResultsMoment({
    snapshot: progressSnapshot, isNewHighScore: !!results.isNewHighScore, scoreIsRecord: !!recordFlags?.scoreIsRecord,
    participants: allParticipants, playerRank, isWinner, isBotMatch: mode === 'solo-bots',
    longestWordLength: (longestWordOf(results.playerWords || []) ?? '').length,
  });

  const handleQuickReplay = useCallback(() => {
    trackGrowthEvent('results_cta_clicked', { cta: 'quick_replay', mode });
    trackGrowthEvent('sp_again_tapped', { mode, near_miss: nearMiss?.kind ?? 'none' });
    if (replayPresetId && onStartPreset) void gateWithInterstitial().then(() => onStartPreset(replayPresetId));
    else handlePlayAgainGated();
  }, [handlePlayAgainGated, mode, replayPresetId, onStartPreset, gateWithInterstitial, nearMiss]);

  const pickerBlock = onStartPreset ? (
    <NextGamePicker
      hideIds={HIDE_SAME}
      mode={mode}
      difficulty={difficulty}
      isWinner={isWinner}
      onStartPreset={handleStartPresetGated}
      onReplaySame={handlePlayAgainGated}
      gamesPlayed={pickerGamesPlayed}
      dailyDoneEver={pickerDailyDoneEver}
    />
  ) : null;

  const heroBlock = (
    <>
      <SoloResultsHero
        title={bannerConfig.message ?? (mode === 'solo-bots' && allParticipants.length > 1 ? formatRankOrdinal(playerRank, t) : t('results.finalScore'))}
        subtitle={bannerConfig.announcement}
        score={displayScore(results.playerScore)}
        words={validWordCount}
        avatar={{ userId: user?.id ?? 'guest', customAvatar: profile?.avatar_config ?? guestAvatar }}
        rank={playerRank}
        totalPlayers={mode === 'solo-bots' ? allParticipants.length : 1}
        isNewHighScore={!!results.isNewHighScore}
      />
      <RecordBadges
        scoreIsRecord={!!recordFlags?.scoreIsRecord}
        wordIsRecord={!!recordFlags?.wordIsRecord}
        score={results.playerScore}
        longestWord={longestWordOf(results.playerWords || []) ?? ''}
      />
      <MissionsCompletedNote count={results.missionsCompleted} />
      <div className="mt-2 flex flex-col items-center gap-1 text-center">
        <RewardLine coins={coinReward?.awarded} xp={isAuthenticated ? xp?.gained : null} mode={mode} t={t} className="text-base text-neo-yellow" />
        <BestMissedWordLine best={bestMissed} mode={mode} language={results.language || language} t={t} className="text-neo-cream/85" />
      </div>
    </>
  );

  const leaderboardParticipants = useMemo(() =>
    allParticipants.map(p => ({
      name: p.name, score: p.score, isCurrentPlayer: p.isPlayer, isBot: !p.isPlayer,
    })), [allParticipants]);

  const leaderboardBlock = mode === 'solo-bots' && allParticipants.length > 1 ? (
    <MobileCompactLeaderboard participants={leaderboardParticipants} />
  ) : null;

  // Zero words + no coins = three empty tiles; the hero already says 0.
  const signupBlock = !isAuthenticated && !authLoading ? (
    <InlineSignupCard
      isAuthenticated={isAuthenticated}
      titleKey="results.saveStreak.title"
      bodyKey="results.saveStreak.body"
      onCTAClick={() => trackGrowthEvent('save_streak_clicked', { source: 'solo_results' })}
      analyticsSource="results_inline"
    />
  ) : null;

  const retentionBlock = (
    <SoloRetentionBlock won={mode === 'practice' ? true : isWinner} currentStreak={currentStreak} isStreakLoaded={isStreakLoaded} />
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
    <SoloAchievementsBlock achievements={results.achievements} mode={mode} playerArchetype={playerArchetype}
      totalComboBonus={totalComboBonus} totalFireRoundBonus={totalFireRoundBonus} />
  );

  // The next game is always the player's choice — nothing auto-starts (an
  // auto-play countdown used to launch the next round after 5s). On phones the
  // fixed bottom bar already carries "play real opponents" + back, so the
  // inline copies render on desktop only.
  const ctaBlock = (
    <div className="space-y-3">
      {pickerBlock}
      <NextStepPrompt currentMode={nextStepMode} onBackToLobby={handleBackToLobby} variant={isDesktop ? 'desktop' : 'landscape'} beforeNavigate={gateWithInterstitial} />
      {results.grid && (
        <ChallengeButton grid={results.grid} score={results.playerScore} words={results.playerWords}
          gameLanguage={gameLanguage} gameDuration={results.gameDuration}
          variant={isDesktop ? 'default' : 'compact'} isWinner={isWinner} />
      )}
    </div>
  );

  const ugcBlock = (
    <UGCFeaturedStrip
      titleKey="ugc.strip.tryCustom"
      sort="popular"
      limit={3}
      variant="compact"
      showCreateCTA
      minToShow={1}
    />
  );

  const analysisBlock = (
    <SoloAnalysisBlock results={results} mode={mode} isDesktop={isDesktop} gameLanguage={gameLanguage}
      wordsByPoints={wordsByPoints} sortedPointGroups={sortedPointGroups} invalidWords={invalidWords}
      playerInsights={playerInsights} playerArchetype={playerArchetype} botWordDetails={botWordDetails} t={t} />
  );

  return (
    <div className="relative min-h-dvh bg-neo-navy text-white">
      {/* Victory flash on new high score */}
      {results.isNewHighScore && <ScreenFlashOverlay trigger={1} colorClass="bg-neo-lime" />}
      <div className={isDesktop ? 'max-w-5xl mx-auto px-6 xl:px-8 pb-32 pt-4' : 'mx-auto w-full max-w-xl px-3 sm:px-4 pb-28 pt-2'}>
        {isDesktop ? (
          <>
            <div className="mb-6">{heroBlock}</div>
            <div className="grid grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-6 items-start">
              <div className="space-y-4">{leaderboardBlock}{progressBlock}{showShareImmediate && shareBlock}</div>
              <div className="space-y-4">
                {ctaBlock}
                {/* Endowment/anchoring: double the exact amount they just earned */}
                {isAuthenticated && coinReward?.awarded ? (
                  <DoubleGoldAdButton earnedAmount={coinReward.awarded} surface="sp_results_double" />
                ) : null}
                {/* R7 — Rewarded gold top-up */}
                <SinglePlayerGoldTopUp t={t} />
                {showSupporterCard && <SupporterInterestCard />}
                {!showShareImmediate && shareBlock}
                {achievementsBlock}
                {globalRank && <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank')} />}
                {/* Signup is demoted below the return CTAs and reframed as
                    streak insurance (t_89663cfc) — the screen asks for a
                    RETURN first, an account second. */}
                {signupBlock}
              </div>
            </div>
            <div className="mt-6">{retentionBlock}</div>
            <div className="mt-8">{analysisBlock}</div>
            <div className="mt-6">{ugcBlock}</div>
            {/* Inline banner ad (web iframe; native shows no inline banner) */}
            <CrazyGamesBanner size="728x90" className="mt-6" />
          </>
        ) : (
          <div className="space-y-4">
            {/* Focused order: result → standings → numbers → NEXT GAME, then
                everything else (retention, rewards, ads, details) below it. */}
            {heroBlock}
            <RevealIn delay={0.14}>{leaderboardBlock}</RevealIn>
            <RevealIn delay={0.22}>{ctaBlock}</RevealIn>
            {showShareImmediate && <RevealIn delay={0.26}>{shareBlock}</RevealIn>}
            <ResultsBannerSlot placement="singleplayer-complete" className="my-3" />
            <RevealIn delay={0.3}>{progressBlock}</RevealIn>
            {/* Streak Ignition (t_89663cfc) — the return hook, right after the next-game choice */}
            <RevealIn delay={0.34}>{retentionBlock}</RevealIn>
            {isAuthenticated && coinReward?.awarded ? (
              <RevealIn delay={0.38}>
                <DoubleGoldAdButton earnedAmount={coinReward.awarded} surface="sp_results_double" />
              </RevealIn>
            ) : null}
            {/* R7 — Rewarded gold top-up */}
            <RevealIn delay={0.4}><SinglePlayerGoldTopUp t={t} /></RevealIn>
            {showSupporterCard && (
              <RevealIn delay={0.41}>
                <SupporterInterestCard />
              </RevealIn>
            )}
            {!showShareImmediate && <RevealIn delay={0.42}>{shareBlock}</RevealIn>}
            <RevealIn delay={0.44}>{achievementsBlock}</RevealIn>
            {globalRank && (
              <RevealIn delay={0.46}>
                <GlobalRankBadge rank={globalRank} label={t('leaderboard.globalRank')} />
              </RevealIn>
            )}
            {/* Signup reframed as streak insurance (t_89663cfc): ask for the RETURN first. */}
            {signupBlock && (
              <RevealIn delay={0.48}>
                {signupBlock}
              </RevealIn>
            )}
            {/* Inline banner ad (web iframe; native shows no inline banner) */}
            <RevealIn delay={0.5}><CrazyGamesBanner size="320x50" /></RevealIn>
            <RevealIn delay={0.54}>{analysisBlock}</RevealIn>
            <RevealIn delay={0.58}>{ugcBlock}</RevealIn>
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

      <ResultsNextBar
        barRef={stickyCtaRef}
        placement="fixed"
        shine
        top={nearMiss ? <NearMissLine nearMiss={nearMiss} mode={mode} t={t} /> : undefined}
        primary={{ label: t('results.playAgainQuestion'), onClick: handleQuickReplay, testId: 'quick-replay-btn', icon: <RotateCcw className="h-5 w-5" strokeWidth={3} /> }}
        secondary={{ label: t('common.home'), onClick: handleBackToLobby, testId: 'results-home-btn', icon: <Home className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" /> }}
      />
      <ResultsMascotMoment celebration={celebration} nearMiss={nearMiss} t={t} />
      <SoloResultsOverlays
        results={results} mode={mode} isWinner={isWinner} gameLanguage={gameLanguage}
        showTomorrowPreview={showTomorrowPreview} onTomorrowDismiss={handleTomorrowDismiss}
        wordValidationQueue={wordValidationQueue} showWordValidation={showWordValidation}
        setShowWordValidation={setShowWordValidation} onWordVote={handleWordVote}
        showShareModal={showShareModal} onCloseShare={() => setShowShareModal(false)} t={t}
      />
    </div>
  );
};

export default SinglePlayerResults;
