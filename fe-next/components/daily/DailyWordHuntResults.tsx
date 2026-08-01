'use client';

/**
 * DailyWordHuntResults Component
 *
 * Results page with improved UI and mobile tab bar for detailed stats.
 * Results tab shows core metrics, Stats tab shows in-depth data.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import GameFeedback from '@/components/feedback/GameFeedback';
import { m } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ArrowLeft, Trophy, BarChart3 } from 'lucide-react';
import { CoinSpendAnimation } from '@/components/animations/CoinSpendAnimation';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { Button } from '@/components/ui/button';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useCrazyGames } from '@/components/CrazyGamesSDK';

const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';
import {
  getGuestFingerprint,
  getGuestDailyPlayer,
  getStreakMilestoneMessage,
  shouldCelebrateStreakMilestone,
  findRarestWord,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { fireConfetti } from '@/utils/confettiUtils';
import StreakMilestoneCelebration from './StreakMilestoneCelebration';
import StreakSavedCelebration from './StreakSavedCelebration';
import CustomPuzzleCreator from '@/components/custom-puzzle/CustomPuzzleCreator';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { fetchGeolocation } from '@/contexts/auth/authUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { WinCinematic } from './WinCinematic';
import { WordHuntResultsContent } from './WordHuntResultsContent';
import { usePracticeFlag } from '@/hooks/usePracticeFlag';
import PracticeChainCta from '@/components/practice/PracticeChainCta';

// Import from results module
import {
  type WordHuntStats,
  type DailyWordHuntResultsProps,
  type ResultTab,
  useShareHandlers,
  useResultSubmission,
  useCoinActions,
  useConfettiEffects,
  useSpendAnimation,
  useStreakFreezeStatus,
  ScoreBadge,
  AttemptHistory,
  StatsSection,
  SharePanel,
} from './results';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DailyWordHuntResults: React.FC<DailyWordHuntResultsProps> = ({
  result,
  puzzleNumber,
  puzzleDate,
  language,
  countdown,
  isNewCompletion,
  onBack,
  onRetry,
  onGameLanguageChange,
}) => {
  const { t, language: uiLanguage } = useLanguage();
  const isPractice = usePracticeFlag();
  const { user, profile, isAuthenticated } = useAuth();

  const { showInterstitial } = useInterstitialAd();
  const { submitLeaderboardScore } = useCrazyGames();

  // This screen ships its own Results/Stats MobileTabBar (below) sized against
  // --mobile-bottom-safe. GlobalBottomNav only hides while DailyWordHuntSurvival
  // reports active gameplay, so once the game ends it re-mounts UNDER/behind
  // that custom bar — two fixed bottom bars stacked, and the sticky CTA's lift
  // (calibrated for one bar) ends up looking gapped against whichever renders
  // on top. Keep it hidden for as long as this results screen is shown too.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Ads + leaderboard on mount
  useEffect(() => {
    showInterstitial('word-hunt-complete');
    if (result.efficiencyScore != null && result.efficiencyScore > 0) {
      submitLeaderboardScore(result.efficiencyScore);
    }
    trackGrowthEvent('results_viewed', { mode: 'word-hunt', score: result.efficiencyScore ?? 0 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show win cinematic for new completions before revealing results
  const [showCinematic, setShowCinematic] = useState(() => Boolean(isNewCompletion && result.solved));

  // Local state
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [stats, setStats] = useState<WordHuntStats | null>(null);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [showStreakSaved, setShowStreakSaved] = useState(false);
  const [streakSavedFreezesLeft, setStreakSavedFreezesLeft] = useState<number | undefined>(undefined);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ResultTab>('results');
  const [_countryCode, setCountryCode] = useState<string | null>(null);
  const [countryCodeReady, setCountryCodeReady] = useState(false);
  const [inlineSignupDismissed, setInlineSignupDismissed] = useState(false);
  const [showCreatePuzzle, setShowCreatePuzzle] = useState(false);
  const spendAnimation = useSpendAnimation();
  const { freezesAvailable, isStreakProtected } = useStreakFreezeStatus(isAuthenticated);

  // Derived values
  // Tracked at every milestone (analytics), celebrated on screen at only the rare
  // ones — see CELEBRATED_STREAK_MILESTONES.
  const milestoneMessage = shouldCelebrateStreakMilestone(result.streakDays)
    ? getStreakMilestoneMessage(result.streakDays)
    : null;
  const rarestWord = result.wordsDiscovered ? findRarestWord(result.wordsDiscovered, language) : null;

  const survivalBonusTime = useMemo(() => {
    if (!result.wordsDiscovered || result.wordsDiscovered.length === 0) return 0;
    return result.wordsDiscovered.reduce((total, word) => total + (word.lifeGained || 0), 0);
  }, [result.wordsDiscovered]);

  const emojiWords = useMemo(() => {
    // For Word Hunt, use attempt history with per-letter feedback (green/yellow/gray)
    if (result.attempts && result.attempts.length > 0) {
      return result.attempts.map((attempt) => ({
        word: attempt.word || '',
        found: attempt.feedback?.every((f) => f.feedback === 'green') ?? false,
        feedback: attempt.feedback,
      }));
    }
    // Fallback: discovered words without feedback
    if (!result.wordsDiscovered) return [];
    return result.wordsDiscovered.map((w: { word: string }) => ({
      word: w.word || '',
      found: true,
    }));
  }, [result.attempts, result.wordsDiscovered]);

  const displayName = isAuthenticated && profile
    ? profile.display_name || profile.username || t('common.player')
    : guestPlayer?.displayName || t('common.player');
  const avatarEmoji = isAuthenticated && profile
    ? profile.avatar_emoji || '🎯'
    : guestPlayer?.avatarEmoji || '🎯';

  // Use extracted hooks
  const shareHandlers = useShareHandlers({
    result,
    puzzleNumber,
    puzzleDate,
    language,
    displayName,
    avatarEmoji,
    stats,
    isAuthenticated,
    profile,
    guestPlayer,
    t,
  });

  const coinActions = useCoinActions({
    puzzleDate,
    puzzleNumber,
    language,
    isNewCompletion,
    solved: result.solved,
    efficiencyScore: result.efficiencyScore || 0,
    streakDays: result.streakDays || 0,
    userId: user?.id,
    onRetry,
  });

  // Fetch stats callback
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (isAuthenticated && profile) params.append('playerId', profile.id);
      else if (guestFingerprint) params.append('guestFingerprint', guestFingerprint);
      const response = await fetch(`/api/daily-challenge/word-hunt/stats/${puzzleDate}/${language}?${params.toString()}`);
      if (response.ok) setStats(await response.json());
    } catch (err) {
      console.error('Failed to fetch Word Hunt stats:', err);
    }
  }, [puzzleDate, language, isAuthenticated, profile, guestFingerprint]);

  // Use result submission hook (BUG-004: pass t for error toast translations)
  useResultSubmission({
    result,
    puzzleNumber,
    puzzleDate,
    language,
    isNewCompletion,
    guestFingerprint,
    isAuthenticated,
    profile,
    guestPlayer,
    countryCodeReady,
    onSubmitSuccess: () => {
      setLeaderboardKey(prev => prev + 1);
      fetchStats();
    },
    onFreezeBridged: ({ freezesRemaining }) => {
      setStreakSavedFreezesLeft(freezesRemaining);
      // Let the results / win-cinematic settle, then reveal the save.
      setTimeout(() => setShowStreakSaved(true), 900);
    },
    extraTries: result.extraTries,
    t,
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Get guest fingerprint and player info
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

  // Fetch country code
  useEffect(() => {
    if (isAuthenticated && profile?.country_code) {
      setCountryCode(profile.country_code);
      setCountryCodeReady(true);
      return;
    }
    fetchGeolocation()
      .then((geo) => { setCountryCode(geo.countryCode || null); setCountryCodeReady(true); })
      .catch(() => setCountryCodeReady(true));
    const timeout = setTimeout(() => setCountryCodeReady(true), 2000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, profile?.country_code]);

  // Fetch stats on mount (for non-new completions)
  useEffect(() => {
    if (!isNewCompletion) {
      fetchStats();
    }
  }, [isNewCompletion, fetchStats]);

  // Use confetti effects hook
  const { handleBadgeClickConfetti } = useConfettiEffects({
    isNewCompletion,
    solved: result.solved,
    attemptsUsed: result.attemptsUsed,
    stats,
  });

  // Confetti burst after results entrance (centered, timed after rank badge appears)
  useEffect(() => {
    if (isNewCompletion && result.solved) {
      const timer = setTimeout(() => {
        fireConfetti({
          particleCount: 80,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#BFFF00', '#00FFFF', '#FF1493', '#FFE135'],
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, result.solved]);

  // Show streak milestone
  useEffect(() => {
    if (isNewCompletion && milestoneMessage) {
      const timer = setTimeout(() => setShowMilestoneCelebration(true), 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, milestoneMessage]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Note: Removed handleSignupModalClose - using inline signup CTA instead

  const handleScoreBadgeClick = useCallback(() => {
    if (result.solved) {
      handleBadgeClickConfetti(stats?.yourStats?.rank);
    }
  }, [result.solved, stats?.yourStats?.rank, handleBadgeClickConfetti]);

  // Results content props for extracted component
  const resultsContentProps = {
    result,
    puzzleNumber,
    puzzleDate,
    language,
    countdown,
    isNewCompletion,
    survivalBonusTime,
    rarestWord,
    emojiWords,
    stats,
    shareHandlers,
    coinActions,
    onRetryFree: onRetry,
    isAuthenticated,
    inlineSignupDismissed,
    onInlineSignupDismiss: () => setInlineSignupDismissed(true),
    leaderboardKey,
    profile,
    guestFingerprint,
    onGameLanguageChange,
    onShowCreatePuzzle: () => setShowCreatePuzzle(true),
    onSpendStart: spendAnimation.start,
    onBackToLobby: onBack,
    freezesAvailable,
    isStreakProtected,
    t,
  };

  /** Stats tab - Shows immersive attempt history and animated statistics */
  const renderStatsContent = () => (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 pb-4"
    >
      <AttemptHistory attempts={result.attempts} attemptsUsed={result.attemptsUsed} t={t} />
      {stats && <StatsSection stats={stats} result={result} t={t} />}
    </m.div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  // Show win cinematic before revealing results
  if (showCinematic) {
    return (
      <WinCinematic
        puzzleNumber={puzzleNumber}
        finalScore={result.efficiencyScore ?? 0}
        onComplete={() => setShowCinematic(false)}
      />
    );
  }

  return (
    <m.div
      key="word-hunt-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col min-h-0 overflow-hidden"
    >
      {/* Compact Header */}
      <div className="shrink-0 px-3 py-2 border-b border-slate-700/50 bg-neo-navy">
        <div className="max-w-md mx-auto lg:max-w-5xl xl:max-w-6xl">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-neo-white/60 hover:text-neo-white -ms-2 py-1">
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('common.back')}
            </Button>
            <ScoreBadge
              solved={result.solved}
              attemptsUsed={result.attemptsUsed}
              targetWord={result.targetWord}
              streakDays={result.streakDays}
              language={language}
              onClick={handleScoreBadgeClick}
            />
          </div>
        </div>
      </div>

      {/* Main Content - flex-1 min-h-0 fills remaining space after compact header */}
      {/* Bottom padding clears BOTH the fixed MobileTabBar (--mobile-bottom-safe
          ≈ 80px + safe-area) AND the AdMob banner it now sits above, so the last
          CTA (retry/share) is never clipped. pb-bottom-stack omitted the tab-bar
          height — its lying comment is now true. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area px-3 pb-[calc(var(--admob-banner-height,0px)+var(--mobile-bottom-safe))] md:pb-6">
        {isPractice && (
          <div className="max-w-md mx-auto pt-3">
            <PracticeChainCta currentMode="wordHunt" />
          </div>
        )}
        {/* Mobile: Tab-based content */}
        <div className="max-w-md mx-auto pt-4 md:hidden">
          {activeTab === 'results' && <WordHuntResultsContent {...resultsContentProps} />}
          {activeTab === 'stats' && renderStatsContent()}
        </div>

        {/* Desktop: Two-column layout — results left, stats right */}
        <div className="hidden md:block max-w-md lg:max-w-5xl xl:max-w-6xl mx-auto pt-4">
          <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 xl:gap-10 lg:items-start">
            <WordHuntResultsContent {...resultsContentProps} />
            <div className="hidden lg:block lg:sticky lg:top-4">
              {renderStatsContent()}
            </div>
          </div>
        </div>
        {/* End-of-game sentiment (game_feedback, surface=word_hunt) — fresh
            completion only; shared throttle keeps it rare across surfaces. */}
        <div className="mt-4 max-w-md mx-auto">
          <GameFeedback
            surface="word_hunt"
            eligible={isNewCompletion}
            gameMode="word-hunt"
            language={uiLanguage}
            throttleKey={String(puzzleNumber)}
          />
        </div>

        {/* Inline banner ad — CrazyGamesBanner covers web iframe; ResultsBannerSlot
            covers native AdMob. Lives INSIDE the scrollport (not as a flex sibling
            after it): the sticky CTA's `bottom` offset is calibrated against this
            box's own edge, so if the banners sat outside it as separate flex items,
            the scrollport would stop short of them and the CTA would stick ~120px
            above the real page bottom — a big dead gap above the mobile tab bar. */}
        <div className="hidden md:flex justify-center py-2">
          <CrazyGamesBanner size="728x90" />
        </div>
        <div className="flex justify-center py-2 md:hidden">
          <CrazyGamesBanner size="320x50" />
        </div>
        <ResultsBannerSlot placement="word-hunt-complete" className="px-4" />
      </div>

      {/* Mobile Tab Bar — lifted above the native AdMob banner (a SurfaceView
          composited above the WebView, pinned to the viewport bottom) so the
          Results/Stats CTA is never hidden behind the ad. GlobalBottomNav is
          hidden on /daily, so offset by --admob-banner-height directly — NOT
          --bottom-stack-height, whose phantom ~64px --bottom-nav-height fallback
          (never reset here) would float the bar above empty space. */}
      <div className="shrink-0 fixed bottom-[var(--admob-banner-height,0px)] inset-x-0 z-50 bg-neo-navy border-t-4 border-neo-black md:hidden">
        <MobileTabBar
          tabs={[
            { id: 'results', icon: <Trophy className="w-5 h-5" />, label: t('wordHunt.results.title') },
            { id: 'stats', icon: <BarChart3 className="w-5 h-5" />, label: t('wordHunt.stats.title') },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ResultTab)}
        />
      </div>

      {/* Share Panel Modal */}
      <SharePanel
        isOpen={shareHandlers.showSharePanel}
        onClose={() => shareHandlers.setShowSharePanel(false)}
        copied={shareHandlers.copied}
        onCopy={shareHandlers.handleCopy}
        onWhatsApp={shareHandlers.handleWhatsApp}
        onTwitter={shareHandlers.handleTwitter}
        onTelegram={shareHandlers.handleTelegram}
        onLinkedIn={shareHandlers.handleLinkedIn}
        onFacebook={shareHandlers.handleFacebook}
        onEmail={shareHandlers.handleEmail}
        onSMS={shareHandlers.handleSMS}
        onDownloadImage={shareHandlers.handleDownloadShareImage}
        isGeneratingImage={shareHandlers.isGeneratingImage}
        ogImageUrl={shareHandlers.ogImageUrl}
        t={t}
      />

      {/* Streak Milestone Celebration Modal */}
      {milestoneMessage && (
        <StreakMilestoneCelebration
          isOpen={showMilestoneCelebration}
          onClose={() => setShowMilestoneCelebration(false)}
          streak={result.streakDays}
          emoji={milestoneMessage.emoji}
          title={milestoneMessage.title}
          subtitle={milestoneMessage.subtitle}
        />
      )}

      {/* Streak Saved (freeze bridge) Celebration Modal */}
      <StreakSavedCelebration
        isOpen={showStreakSaved}
        onClose={() => setShowStreakSaved(false)}
        freezesRemaining={streakSavedFreezesLeft}
        t={t}
      />

      {/* Custom Puzzle Creator Modal */}
      <CustomPuzzleCreator
        isOpen={showCreatePuzzle}
        onClose={() => setShowCreatePuzzle(false)}
        language={language}
      />

      {/* Spend animation portal */}
      {typeof document !== 'undefined' && spendAnimation.isVisible && createPortal(
        <CoinSpendAnimation
          trigger={spendAnimation.isVisible}
          position={spendAnimation.position}
          amount={spendAnimation.amount}
          onComplete={spendAnimation.hide}
        />,
        document.body
      )}
    </m.div>
  );
};

export default DailyWordHuntResults;
