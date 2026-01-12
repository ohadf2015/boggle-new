'use client';

/**
 * DailyWordHuntResults Component
 *
 * Main orchestrator component for displaying Word Hunt daily challenge results.
 * All sub-components and logic have been extracted to the results/ directory.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Eye, Trophy, Wand2 } from 'lucide-react';
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
import KeepPlayingSection from './KeepPlayingSection';
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
  DesktopStatsCard,
  RankBadge,
  TryAnotherLanguage,
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
  // RENDER HELPERS
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
        t={t}
      />

      {/* Rank badge - shows for both WIN and FAIL */}
      {stats && <RankBadge stats={stats} t={t} />}

      {/* Inline signup for guests - positioned after score, before share */}
      {!isAuthenticated && !inlineSignupDismissed && (
        <DailyChallengeInlineSignup
          pendingResult={{ result, puzzleNumber, puzzleDate, language }}
          onDismiss={() => setInlineSignupDismissed(true)}
        />
      )}

      {/* Share/Retry Section - order differs by result */}
      <ShareSection
        solved={result.solved}
        onShare={shareHandlers.handleNativeShare}
        onRetry={coinActions.handleRetryChallenge}
        canAffordRetry={coinActions.canAffordRetry}
        retryCost={coinActions.retryCost}
        onWhatsApp={shareHandlers.handleWhatsApp}
        onTwitter={shareHandlers.handleTwitter}
        onTelegram={shareHandlers.handleTelegram}
        onCopy={shareHandlers.handleCopy}
        onDownloadImage={shareHandlers.handleDownloadShareImage}
        copied={shareHandlers.copied}
        isGeneratingImage={shareHandlers.isGeneratingImage}
        t={t}
      />

      {/* FAIL state: Show reveal target word early + watch ad */}
      {!result.solved && (
        <>
          {/* Reveal target word - now appears early for failed players */}
          <div className="py-3 border-y border-gray-200 dark:border-gray-700">
            {coinActions.targetWordRevealed ? (
              <div className="space-y-2 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('wordHunt.results.theTargetWordWas')}</div>
                <div className="text-3xl font-black text-neo-lime tracking-wider">
                  {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="max-w-xs mx-auto">
                <CoinUnlockCard
                  icon={<Eye className="w-6 h-6 text-white" />}
                  title={t('wordHunt.results.revealTargetWord')}
                  subtitle={t('wordHunt.results.seeTheAnswer') || 'See what you were looking for'}
                  cost={coinActions.revealCost}
                  currentCoins={coinActions.currentCoins}
                  gradientFrom="from-neo-pink"
                  gradientTo="to-neo-pink"
                  onClick={coinActions.handleRevealTargetWord}
                  t={t}
                />
              </div>
            )}
          </div>

          {/* Watch Ad for Coins - only for failed players who can't afford retry */}
          {!coinActions.canAffordRetry && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-600" />
                <span>{t('wordHunt.ad.needMoreCoins') || 'Need more coins?'}</span>
                <div className="flex-1 h-px bg-gray-600" />
              </div>
              <WatchAdButton onCoinsEarned={() => {/* Update handled by coinActions */ }} t={t} />
            </div>
          )}
        </>
      )}

      {/* WIN state: Show rewards prominently */}
      {result.solved && (
        <PerformanceSection
          coinReward={coinActions.coinReward}
          coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
          survivalBonusTime={survivalBonusTime}
          rarestWord={rarestWord}
          solved={result.solved}
          efficiencyScore={result.efficiencyScore || 0}
          lifeRemaining={result.lifeRemaining || 0}
          unusedTokens={(result.clueTokensEarned || 0) - (result.clueTokensSpent || 0)}
          wordsDiscovered={result.wordsDiscovered?.length || 0}
          guessesUsed={result.attemptsUsed}
          t={t}
        />
      )}

      {/* Leaderboard - show to all users (guests see it with subtle signup hint in empty state) */}
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

      {/* FAIL state: Show performance breakdown lower */}
      {!result.solved && (
        <PerformanceSection
          coinReward={coinActions.coinReward}
          coinRewardMode={isAuthenticated ? 'earned' : 'teasing'}
          survivalBonusTime={survivalBonusTime}
          rarestWord={rarestWord}
          solved={result.solved}
          efficiencyScore={result.efficiencyScore || 0}
          lifeRemaining={result.lifeRemaining || 0}
          unusedTokens={(result.clueTokensEarned || 0) - (result.clueTokensSpent || 0)}
          wordsDiscovered={result.wordsDiscovered?.length || 0}
          guessesUsed={result.attemptsUsed}
          t={t}
        />
      )}

      <TryAnotherLanguage currentLanguage={language} onGameLanguageChange={onGameLanguageChange} />

      <KeepPlayingSection
        isSuccess={result.solved}
        timeSurvived={result.lifeRemaining !== undefined ? (10 - result.attemptsUsed) * 10 : undefined}
        efficiencyScore={result.efficiencyScore}
      />

      {/* Create Your Own Puzzle - only show for authenticated winners */}
      {result.solved && isAuthenticated && (
        <button
          onClick={() => setShowCreatePuzzle(true)}
          className="w-full mt-4 p-4 bg-gradient-to-r from-neo-pink/20 via-neo-orange/20 to-neo-lime/20 border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all cursor-pointer text-start group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-neo-pink to-neo-orange rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm group-hover:scale-105 transition-transform">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-white group-hover:text-neo-lime transition-colors">
                {t('customPuzzle.createYourOwn') || 'Create Your Own Puzzle'}
              </h3>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                {t('customPuzzle.createDescription') || 'Challenge friends with your own word puzzle'}
              </p>
            </div>
            <div className="flex-shrink-0 text-neo-pink group-hover:text-neo-lime transition-colors">
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      )}
    </div>
  );

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
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-1 pb-2 border-b border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-neo-navy">
        <div className="max-w-md mx-auto lg:max-w-5xl">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -ms-2 py-1">
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-20 lg:pb-4 relative">
        {/* Screenshot protection */}
        {isProtected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
            <div className="bg-neo-black/80 text-white px-6 py-4 rounded-neo border-3 border-neo-lime shadow-hard text-center">
              <div className="text-2xl mb-2">👀</div>
              <div className="font-bold text-sm">{t('daily.screenshotProtection') || 'Click here to continue'}</div>
            </div>
          </div>
        )}

        {/* Desktop: Two-column layout */}
        <div className="hidden md:flex md:flex-row md:gap-6 md:max-w-5xl md:mx-auto md:pt-4">
          <div className={cn("flex-1 min-w-0 max-w-xl", isProtected && "blur-xl pointer-events-none select-none")}>
            {renderResultsContent()}
          </div>
          <div className={cn("flex-1 min-w-0 max-w-xl space-y-4", isProtected && "blur-xl pointer-events-none select-none")}>
            <DesktopStatsCard stats={stats} t={t} />
            {/* Leaderboard - show to all users */}
            <TabbedDailyLeaderboard
              puzzleDate={puzzleDate}
              language={language}
              currentPlayerId={isAuthenticated && profile ? profile.id : null}
              currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
              maxVisible={3}
              compact
              t={t}
              defaultTab="today"
            />
          </div>
        </div>

        {/* Mobile: Tab-based layout */}
        <div className={cn("max-w-md mx-auto pt-3 md:hidden", isProtected && "blur-xl pointer-events-none select-none")}>
          {activeTab === 'results' && renderResultsContent()}
          {activeTab === 'stats' && renderStatsContent()}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t-4 border-neo-black safe-area-bottom md:hidden text-neo-white">
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

      {/* Modals */}
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
      {/* Note: Removed DailyChallengeSignupModal popup - using inline signup CTA instead for less interruption */}

      {/* Custom Puzzle Creator Modal */}
      <CustomPuzzleCreator
        isOpen={showCreatePuzzle}
        onClose={() => setShowCreatePuzzle(false)}
        language={language}
      />
    </motion.div>
  );
};

export default DailyWordHuntResults;
