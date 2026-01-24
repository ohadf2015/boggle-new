'use client';

/**
 * DailyWordHuntResults Component
 *
 * Results page with improved UI and mobile tab bar for detailed stats.
 * Results tab shows core metrics, Stats tab shows in-depth data.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, Trophy, BarChart3 } from 'lucide-react';
import { CoinSpendAnimation } from '@/components/animations/CoinSpendAnimation';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import {
  getGuestFingerprint,
  getGuestDailyPlayer,
  getStreakMilestone,
  getStreakMilestoneMessage,
  findRarestWord,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';
import DailyChallengeInlineSignup from '@/components/auth/DailyChallengeInlineSignup';
import StreakMilestoneCelebration from './StreakMilestoneCelebration';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import WatchAdButton from './WatchAdButton';
import CustomPuzzleCreator from '@/components/custom-puzzle/CustomPuzzleCreator';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGeolocation } from '@/contexts/auth/authUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

// Import from results module
import {
  type WordHuntStats,
  type DailyWordHuntResultsProps,
  type ResultTab,
  useShareHandlers,
  useResultSubmission,
  useCoinActions,
  useConfettiEffects,
  ScoreBadge,
  ResultDisplay,
  PerformanceSection,
  CoinUnlockCard,
  ShareSection,
  AttemptHistory,
  StatsSection,
  RankBadge,
  MoreOptionsAccordion,
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
  const { t } = useLanguage();
  const { user, profile, isAuthenticated } = useAuth();
  const { isProtected } = useScreenshotProtection();

  // Local state
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [stats, setStats] = useState<WordHuntStats | null>(null);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ResultTab>('results');
  const [_countryCode, setCountryCode] = useState<string | null>(null);
  const [countryCodeReady, setCountryCodeReady] = useState(false);
  const [inlineSignupDismissed, setInlineSignupDismissed] = useState(false);
  const [showCreatePuzzle, setShowCreatePuzzle] = useState(false);
  const [showSpendAnimation, setShowSpendAnimation] = useState(false);
  const [spendAnimationPosition, setSpendAnimationPosition] = useState({ x: 0, y: 0 });
  const [spendAnimationAmount, setSpendAnimationAmount] = useState(0);

  // Handle spend animation trigger
  const handleSpendStart = useCallback((position: { x: number; y: number }, amount: number) => {
    setSpendAnimationPosition(position);
    setSpendAnimationAmount(amount);
    setShowSpendAnimation(true);
  }, []);

  // Derived values
  const streakMilestone = getStreakMilestone(result.streakDays);
  const milestoneMessage = streakMilestone ? getStreakMilestoneMessage(result.streakDays) : null;
  const rarestWord = result.wordsDiscovered ? findRarestWord(result.wordsDiscovered, language) : null;

  const survivalBonusTime = useMemo(() => {
    if (!result.wordsDiscovered || result.wordsDiscovered.length === 0) return 0;
    return result.wordsDiscovered.reduce((total, word) => total + (word.lifeGained || 0), 0);
  }, [result.wordsDiscovered]);

  const displayName = isAuthenticated && profile
    ? profile.display_name || profile.username || 'Player'
    : guestPlayer?.displayName || 'Player';
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

  // Use result submission hook
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

  // ============================================================================
  // RENDER HELPERS - Results tab and Stats tab content
  // ============================================================================

  const renderResultsContent = () => (
    <div className="space-y-4">
      {/* Hero Result Display */}
      <ResultDisplay
        solved={result.solved}
        attemptsUsed={result.attemptsUsed}
        targetWord={result.targetWord}
        streakDays={result.streakDays}
        language={language}
        puzzleNumber={puzzleNumber}
        countdown={countdown}
        lifeRemaining={result.lifeRemaining || 0}
        wordsDiscovered={result.wordsDiscovered?.length || 0}
        t={t}
      />

      {/* WIN state: Performance breakdown with 3 bars */}
      {result.solved && (
        <PerformanceSection
          coinReward={coinActions.coinReward}
          coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
          survivalBonusTime={survivalBonusTime}
          rarestWord={rarestWord}
          solved={result.solved}
          efficiencyScore={result.efficiencyScore || 0}
          lifeRemaining={result.lifeRemaining || 0}
          wordsDiscovered={result.wordsDiscovered?.length || 0}
          guessesUsed={result.attemptsUsed}
          t={t}
        />
      )}

      {/* Rank badge - shows for both WIN and FAIL */}
      {stats && <RankBadge stats={stats} t={t} />}

      {/* Share/Retry Section */}
      <ShareSection
        solved={result.solved}
        onShare={shareHandlers.handleNativeShare}
        onRetry={coinActions.handleRetryChallenge}
        canAffordRetry={coinActions.canAffordRetry}
        retryCost={coinActions.retryCost}
        currentCoins={coinActions.currentCoins}
        onWhatsApp={shareHandlers.handleWhatsApp}
        onTwitter={shareHandlers.handleTwitter}
        onTelegram={shareHandlers.handleTelegram}
        onCopy={shareHandlers.handleCopy}
        onDownloadImage={shareHandlers.handleDownloadShareImage}
        copied={shareHandlers.copied}
        isGeneratingImage={shareHandlers.isGeneratingImage}
        t={t}
      />

      {/* Inline signup for guests */}
      {!isAuthenticated && !inlineSignupDismissed && (
        <DailyChallengeInlineSignup
          pendingResult={{ result, puzzleNumber, puzzleDate, language }}
          onDismiss={() => setInlineSignupDismissed(true)}
        />
      )}

      {/* FAIL state: Reveal target word + watch ad */}
      {!result.solved && (
        <div className="space-y-3">
          {/* Reveal target word */}
          {coinActions.targetWordRevealed ? (
            <div className="py-3 px-4 bg-slate-800/50 rounded-neo border-2 border-slate-700/50 text-center">
              <div className="text-xs text-slate-400 mb-1">{t('wordHunt.results.theTargetWordWas')}</div>
              <div className="text-2xl font-black text-neo-lime tracking-wider">
                {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="max-w-xs mx-auto">
              <CoinUnlockCard
                icon={<Eye className="w-5 h-5 text-white" />}
                title={t('wordHunt.results.revealTargetWord')}
                subtitle={t('wordHunt.results.seeTheAnswer') || 'See what you were looking for'}
                cost={coinActions.revealCost}
                currentCoins={coinActions.currentCoins}
                gradientFrom="from-neo-pink"
                gradientTo="to-neo-pink"
                onClick={coinActions.handleRevealTargetWord}
                onSpendStart={(pos) => handleSpendStart(pos, coinActions.revealCost)}
                t={t}
              />
            </div>
          )}

          {/* Watch Ad for Coins */}
          {!coinActions.canAffordRetry && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <div className="flex-1 h-px bg-slate-700" />
                <span>{t('wordHunt.ad.needMoreCoins') || 'Need more coins?'}</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <WatchAdButton onCoinsEarned={() => {}} t={t} />
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <TabbedDailyLeaderboard
        key={leaderboardKey}
        puzzleDate={puzzleDate}
        language={language}
        currentPlayerId={isAuthenticated && profile ? profile.id : null}
        currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
        maxVisible={3}
        compact
        t={t}
        defaultTab="today"
      />

      {/* More Options - Secondary actions in accordion */}
      <MoreOptionsAccordion
        isAuthenticated={isAuthenticated}
        solved={result.solved}
        currentLanguage={language}
        onCreatePuzzle={() => setShowCreatePuzzle(true)}
        onGameLanguageChange={onGameLanguageChange}
        t={t}
      />
    </div>
  );

  /** Stats tab - Shows in-depth attempt history and statistics */
  const renderStatsContent = () => (
    <div className="space-y-4">
      <AttemptHistory attempts={result.attempts} attemptsUsed={result.attemptsUsed} t={t} />
      {stats && <StatsSection stats={stats} result={result} t={t} />}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <motion.div
      key="word-hunt-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Compact Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700/50 bg-neo-navy">
        <div className="max-w-md mx-auto lg:max-w-5xl">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white -ms-2 py-1">
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('daily.home')}
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

      {/* Main Content - uses isolate-scroll on mobile for fixed tab bar compatibility */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollable-area isolate-scroll px-3 pb-[--mobile-bottom-safe] md:pb-6 relative">
        {/* Screenshot protection overlay */}
        {isProtected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
            <div className="bg-neo-black/80 text-white px-6 py-4 rounded-neo border-3 border-neo-lime shadow-hard text-center">
              <div className="text-2xl mb-2">👀</div>
              <div className="font-bold text-sm">{t('daily.screenshotProtection') || 'Click here to continue'}</div>
            </div>
          </div>
        )}

        {/* Mobile: Tab-based content */}
        <div className={cn("max-w-md mx-auto pt-4 md:hidden", isProtected && "blur-xl pointer-events-none select-none")}>
          {activeTab === 'results' && renderResultsContent()}
          {activeTab === 'stats' && renderStatsContent()}
        </div>

        {/* Desktop: Single column layout */}
        <div className={cn("hidden md:block max-w-md mx-auto pt-4", isProtected && "blur-xl pointer-events-none select-none")}>
          {renderResultsContent()}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t-4 border-neo-black safe-area-bottom md:hidden">
        <MobileTabBar
          tabs={[
            { id: 'results', icon: <Trophy className="w-5 h-5" />, label: t('wordHunt.results.title') || 'Results' },
            { id: 'stats', icon: <BarChart3 className="w-5 h-5" />, label: t('wordHunt.stats.title') || 'Stats' },
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

      {/* Custom Puzzle Creator Modal */}
      <CustomPuzzleCreator
        isOpen={showCreatePuzzle}
        onClose={() => setShowCreatePuzzle(false)}
        language={language}
      />

      {/* Spend animation portal */}
      {typeof document !== 'undefined' && showSpendAnimation && createPortal(
        <CoinSpendAnimation
          trigger={showSpendAnimation}
          position={spendAnimationPosition}
          amount={spendAnimationAmount}
          onComplete={() => setShowSpendAnimation(false)}
        />,
        document.body
      )}
    </motion.div>
  );
};

export default DailyWordHuntResults;
