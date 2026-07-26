'use client';

/**
 * WordHuntResultsContent - Results tab content for DailyWordHuntResults.
 *
 * Extracted from DailyWordHuntResults to keep files under 500 lines.
 * Contains the main results view: mascot, result display, performance,
 * rank badge, facts, emoji share, share section, signup CTA, fail state,
 * leaderboard, and more options.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { Eye, CircleDot, ArrowRight, CheckCircle2, Home, BookOpen } from 'lucide-react';
import Link from 'next/link';
import DailyChallengeInlineSignup from '@/components/auth/DailyChallengeInlineSignup';
import { useIsGuest } from '@/hooks/useIsGuest';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import DailyInsightStack from './DailyInsightStack';
import WordHuntTipBadge from '@/components/results/WordHuntTipBadge';
import CatchUpSuggestion from './CatchUpSuggestion';
import { STICKY_CTA_WORD_HUNT } from './stickyCta';
import { SuggestWordCard } from './SuggestWordCard';
import MpModeCrossPromo from './MpModeCrossPromo';
import WatchAdButton from './WatchAdButton';
import WatchAdForRevealButton from '@/components/ads/WatchAdForRevealButton';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { hasPlayedConnectionsToday } from '@/lib/connections/dailyClient';
import { useDailyModePlayed } from '@/hooks/useDailyModePlayed';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useExperiment } from '@/hooks/useExperiment';
import RivalCompareCard from './RivalCompareCard';
import { useDailyRivalCompare } from '@/hooks/useDailyRivalCompare';
import { getPastWordHuntPerformance } from '@/utils/dailyChallenge';
import type { WordHuntResult } from '@/utils/dailyChallenge/types';
import type { Language } from '@/shared/types/game';
import {
  ResultDisplay,
  PerformanceSection,
  RankBadge,
  StatsBlurb,
  PastPerformanceCompare,
  DailyWordHuntFacts,
  ShareSection,
  CoinUnlockCard,
  MoreOptionsAccordion,
  StreakFreezeIndicator,
  type WordHuntStats,
  type CoinReward,
} from './results';

export interface WordHuntResultsContentProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  countdown: string;
  isNewCompletion?: boolean;
  survivalBonusTime: number;
  rarestWord: { word: string; rarity: number; emoji: string; label: string } | null;
  emojiWords: Array<{ word: string; found: boolean }>;
  stats: WordHuntStats | null;
  shareHandlers: {
    handleNativeShare: () => void;
    handleChallengeShare: () => void;
    handleWhatsApp: () => void;
    handleTwitter: () => void;
    handleTelegram: () => void;
    handleLinkedIn: () => void;
    handleFacebook: () => void;
    handleEmail: () => void;
    handleSMS: () => void;
    handleCopy: () => void;
    handleDownloadShareImage: () => void;
    copied: boolean;
    isGeneratingImage: boolean;
    showSharePanel: boolean;
    setShowSharePanel: (show: boolean) => void;
    ogImageUrl: string | null;
  };
  coinActions: {
    coinReward: CoinReward | null;
    handleRetryChallenge: () => void;
    canAffordRetry: boolean;
    canAffordReveal: boolean;
    retryCost: number;
    currentCoins: number;
    targetWordRevealed: boolean;
    revealCost: number;
    handleRevealTargetWord: () => void;
    handleRevealTargetWordViaAd: () => void;
  };
  /** Native ad-gated retry callback — runs the underlying retry without spending coins. */
  onRetryFree?: () => void | Promise<void>;
  isAuthenticated: boolean;
  inlineSignupDismissed: boolean;
  onInlineSignupDismiss: () => void;
  leaderboardKey: number;
  profile: { id: string } | null;
  guestFingerprint: string | null;
  onGameLanguageChange?: (lang: Language) => void;
  onShowCreatePuzzle: () => void;
  onSpendStart: (position: { x: number; y: number }, amount: number) => void;
  onBackToLobby?: () => void;
  freezesAvailable?: number;
  isStreakProtected?: boolean;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export const WordHuntResultsContent: React.FC<WordHuntResultsContentProps> = ({
  result,
  puzzleNumber,
  puzzleDate,
  language,
  countdown,
  isNewCompletion: _isNewCompletion,
  survivalBonusTime,
  rarestWord,
  emojiWords: _emojiWords,
  stats,
  shareHandlers,
  coinActions,
  onRetryFree,
  isAuthenticated,
  inlineSignupDismissed,
  onInlineSignupDismiss,
  leaderboardKey,
  profile,
  guestFingerprint,
  onGameLanguageChange,
  onShowCreatePuzzle,
  onSpendStart,
  onBackToLobby: _onBackToLobby,
  freezesAvailable = 0,
  isStreakProtected = false,
  t,
}) => {
  // Head-to-head rival captured from a friend's challenge share link (persisted
  // to sessionStorage on the /daily landing). Compare on the same score axis the
  // challenger sent — efficiencyScore — so the verdict is honest.
  const rival = useDailyRivalCompare(puzzleNumber);

  // Resolution-aware: gating on the `isAuthenticated` prop alone would flash the
  // simplified screen at a logged-in player on first paint (rules/60 Class 1).
  const isGuest = useIsGuest(isAuthenticated);

  // Word Wheel completion gate: localStorage-first (no first-paint flash) then
  // server-of-record cross-device check — so a player who finished the wheel on
  // another device sees "Back to Daily Hub", not a nag to replay it.
  const wordWheelPlayed = useDailyModePlayed('word-wheel', language, {
    isAuthenticated,
    playerId: profile?.id,
    guestFingerprint,
  });
  // Mirror for the Word Bridge (Connections) cross-promo — don't nudge a mode
  // the player already finished today. Lazy-init avoids a first-paint flash.
  // (localStorage-only is fine here: Connections is a separate daily system.)
  const [connectionsPlayed, setConnectionsPlayed] = useState(() =>
    typeof window === 'undefined' ? false : hasPlayedConnectionsToday(),
  );
  useEffect(() => {
    const refresh = () => setConnectionsPlayed(hasPlayedConnectionsToday());
    refresh();
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // NOTE: the `wordhunt-crosspromo-position` A/B (wheel CTA above vs below the
  // leaderboard) is concluded — the primary CTA is now pinned to the bottom of
  // the scrollport in both cases, so the two arms would render identically and
  // collect null data. Removed rather than left tracking exposure for nothing.

  // A/B: hide the dead "Tap a player to see their path" hint that causes rage clicks.
  const { variant: hintVariant, trackExposure: trackHintExposure } =
    useExperiment('exp-wordhunt-hint-v1');
  useEffect(() => {
    trackHintExposure();
    trackGrowthEvent('wordhunt_results_loaded', {
      solved: result.solved,
      hint_variant: hintVariant,
      language,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackHintExposure]);

  // Local play history vs today's result — powers the "vs your past" comparison.
  const pastPerformance = useMemo(
    () => getPastWordHuntPerformance(language, puzzleDate),
    [language, puzzleDate],
  );

  const wheelCtaNode = !wordWheelPlayed && (
    <m.div
      data-testid="wordhunt-wheel-cta"
      className={STICKY_CTA_WORD_HUNT}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <div className="relative">
        <span className="absolute -top-2 left-4 z-10 inline-block px-2 py-0.5 rounded-full bg-neo-purple text-neo-white text-[10px] font-neo-display font-black tracking-wider border-2 border-neo-black shadow-hard-sm">
          {t('wordWheel.results.stepBadge', 'STEP 2 OF 2')}
        </span>
        <Link
          href={`/${language}/daily/word-wheel`}
          onClick={() => trackGrowthEvent('cross_promo_click', {
            target: 'word_wheel',
            source: 'word_hunt_results',
            placement: 'sticky',
            solved: result.solved,
            language,
          })}
          className="flex items-center justify-between gap-3 w-full p-5 rounded-neo border-3 border-neo-black bg-neo-purple shadow-hard-lg hover:scale-[1.02] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
              <CircleDot className="w-7 h-7 text-neo-purple-light" />
            </div>
            <div>
              <span className="block font-neo-display font-black text-neo-white text-base leading-tight">
                {t('wordWheel.results.completeDailyTitle', "Finish today's challenge")}
              </span>
              <p className="text-neo-white text-xs mt-0.5">
                {t('wordWheel.results.completeDailyDesc', 'Play Word Wheel to complete your Daily Challenge')}
              </p>
            </div>
          </div>
          <m.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.2, repeat: 3, repeatDelay: 0.4, ease: 'easeInOut' }}
          >
            <ArrowRight className="w-6 h-6 text-neo-white shrink-0" />
          </m.div>
        </Link>
      </div>
    </m.div>
  );

  // When the other game is already done, the primary CTA goes back to the
  // Daily Hub (which surfaces the combined leaderboard) instead of nagging
  // the player to "complete the other challenge".
  const backToDailyCtaNode = wordWheelPlayed && (
    <m.div
      data-testid="wordhunt-back-to-daily-cta"
      className={STICKY_CTA_WORD_HUNT}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <Link
        href={`/${language}/daily`}
        data-testid="back-to-daily-link"
        className="flex items-center justify-between gap-3 w-full p-5 rounded-neo border-3 border-neo-black bg-neo-cyan shadow-hard-lg hover:scale-[1.02] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
            <Home className="w-7 h-7 text-neo-cyan" />
          </div>
          <div>
            <span className="block font-neo-display font-black text-neo-black text-base leading-tight">
              {t('wordHunt.results.backToDaily', 'Back to Daily Hub')}
            </span>
            <p className="text-neo-black/70 text-xs mt-0.5">
              {t('wordHunt.results.backToDailyDesc', "See today's leaderboard")}
            </p>
          </div>
        </div>
        <ArrowRight className="w-6 h-6 text-neo-black shrink-0" />
      </Link>
    </m.div>
  );

  /* The three blocks a guest keeps. Hoisted so the guest branch below reuses
     them verbatim instead of a second copy that can drift.

     failStateNode = reveal target word + watch ad. Guests keep it — the answer
     is what they came back for. */
  const failStateNode = !result.solved ? (
      <div className="space-y-3">
        {/* Reveal target word */}
        {coinActions.targetWordRevealed ? (
          <div className="py-3 px-4 bg-neo-navy-light/50 rounded-neo border-2 border-slate-700/50 text-center space-y-2">
            <div className="text-xs text-slate-400">{t('wordHunt.results.theTargetWordWas')}</div>
            <div className="text-2xl font-black text-neo-lime tracking-wider">
              {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
            </div>
            {result.meaning && (
              <div className="mt-2 flex items-start gap-2.5 rounded-neo border-neo-thick border-black bg-neo-cyan/15 px-3 py-2.5 shadow-hard text-start">
                <BookOpen className="w-4 h-4 text-neo-cyan shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neo-cyan">
                    {t('wordHunt.results.meaning')}
                  </span>
                  <span className="text-sm font-bold text-neo-cream leading-snug">
                    {result.meaning}
                  </span>
                  {/* CC BY-SA attribution: meanings are dictionary-sourced from Wiktionary (all langs) */}
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {t('wordHunt.results.meaningSource')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-btn space-y-2">
            <CoinUnlockCard
              icon={<Eye className="w-5 h-5 text-white" />}
              title={t('wordHunt.results.revealTargetWord')}
              subtitle={t('wordHunt.results.seeTheAnswer')}
              cost={coinActions.revealCost}
              currentCoins={coinActions.currentCoins}
              gradientFrom="from-neo-pink"
              gradientTo="to-neo-pink"
              onClick={coinActions.handleRevealTargetWord}
              onSpendStart={(pos) => onSpendStart(pos, coinActions.revealCost)}
              t={t}
            />
            {/* Paywall-softener: free reveal via rewarded ad when coin-poor */}
            {!coinActions.canAffordReveal && (
              <WatchAdForRevealButton
                onReveal={coinActions.handleRevealTargetWordViaAd}
                revealed={coinActions.targetWordRevealed}
                placement="reveal_target_word"
              />
            )}
          </div>
        )}

        {/* Watch Ad for Coins */}
        {!coinActions.canAffordRetry && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex-1 h-px bg-neo-navy-elevated" />
              <span>{t('wordHunt.ad.needMoreCoins')}</span>
              <div className="flex-1 h-px bg-neo-navy-elevated" />
            </div>
            <WatchAdButton onCoinsEarned={() => {}} t={t} language={language} surface="word_hunt_results" />
          </div>
        )}
      </div>
  ) : null;

  const heroNode = (
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
      currentUserId={profile?.id}
      meaning={result.meaning}
      t={t}
    />
  );

  const leaderboardNode = (
    <>
      {(result.wordsDiscovered?.length ?? 0) > 0 && hintVariant !== 'hide-hint' && <p className="text-xs text-neo-white text-center font-medium -mb-1">{t('wordHunt.results.tapPlayerHint', 'Tap a player to see their path')}</p>}
      <div onClick={() => trackGrowthEvent('wordhunt_leaderboard_tap', { language, solved: result.solved })}>
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
          scope="word-hunt"
          myHuntWordsDiscovered={result.wordsDiscovered?.map(w => w.word)}
        />
      </div>
    </>
  );

  const signupNode = !isAuthenticated && !inlineSignupDismissed ? (
    <DailyChallengeInlineSignup
      pendingResult={{ result, puzzleNumber, puzzleDate, language }}
      onDismiss={onInlineSignupDismiss}
    />
  ) : null;

  /* An unregistered player has no streak, no coin balance, no past plays and no
     stats row — the full recap is mostly empty cards plus promos. Show the
     score, the answer, where they placed, and the one thing we want from them.
     Dismissing the CTA falls through to the full recap (no dead end). */
  if (isGuest && !inlineSignupDismissed) {
    return (
      <div className="space-y-4">
        {heroNode}
        {failStateNode}
        {leaderboardNode}
        {signupNode}
      </div>
    );
  }

  return (
  <div className="space-y-4">
    {heroNode}

    {/* Vs your own past plays — placement/score is above, this is the
        "how do I compare to how I usually do" the player cares about next.
        Also carries a small randomized celebratory flourish (variable reward). */}
    <PastPerformanceCompare
      currentScore={result.efficiencyScore ?? 0}
      solved={result.solved}
      past={pastPerformance}
      t={t}
    />

    {/* Head-to-head: a friend challenged you — did you beat their score? */}
    {rival && (
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <RivalCompareCard
          rivalName={rival.name}
          rivalEmoji={rival.emoji}
          rivalScore={rival.score}
          myScore={result.efficiencyScore ?? 0}
          t={t}
        />
      </m.div>
    )}

    {/* Streak freeze shields indicator */}
    {(freezesAvailable > 0 || isStreakProtected) && (
      <StreakFreezeIndicator
        freezesAvailable={freezesAvailable}
        isProtected={isStreakProtected}
        t={t}
      />
    )}

    {/* WIN state: Performance breakdown with 3 bars */}
    {result.solved && (
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
      >
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
          extraTries={result.extraTries}
          t={t}
          language={language}
        />
      </m.div>
    )}

    {/* Rank badge - shows for both WIN and FAIL */}
    {stats && (
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <RankBadge stats={stats} t={t} />
      </m.div>
    )}

    {/* Single-stat narrative blurb — one compelling number in a sentence */}
    {stats && (
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <StatsBlurb stats={stats} solved={result.solved} t={t} />
      </m.div>
    )}

    {/* Primary next-step: back-to-daily (wheel already done) or the wheel
        cross-promo. Sticky-pinned to the bottom of the scrollport, so it stays
        on screen through the leaderboard and the rest of the recap. It sits
        here in DOM order so it lands right above "who else played" once the
        player scrolls to the end and it unpins. */}
    {backToDailyCtaNode}
    {wheelCtaNode}

    {/* Leaderboard — who else played, and how you stack up. Sits with
        rank/placement/vs-past so the "what matters" cluster (score,
        placement, vs others, vs your past) is together before promo/CTA noise. */}
    {leaderboardNode}

    {/* Actionable "score more next time" insight — guess-efficiency aware.
        attemptsToFind = guesses used; a fast solve gets a positive nudge, a blind
        solve learns the word→clue loop, a slow solve learns to trust its clues. */}
    {(() => {
      const words = result.wordsDiscovered ?? [];
      const lengths = words.map((w) => w.word.length);
      const avgWordLength = lengths.length
        ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10
        : 0;
      return (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
          className="mx-auto max-w-xs"
        >
          <WordHuntTipBadge stats={{
            score: result.efficiencyScore || 0,
            survived: result.solved,
            lifeRemaining: result.lifeRemaining || 0,
            discoveryWords: words.length,
            foundTarget: result.solved,
            isFirstFinder: false,
            totalPlayers: 1,
            rank: 1,
            validWordCount: words.length,
            invalidWordCount: 0,
            avgWordLength,
            longestWordLength: lengths.length ? Math.max(...lengths) : 0,
            attemptsToFind: result.attemptsUsed,
          }} />
        </m.div>
      );
    })()}

    {/* Daily Insight Cards — personalized analytics on challenge performance */}
    <DailyInsightStack mode="word_hunt" date={puzzleDate} />

    {/* Multiplayer cross-promo — surfaced once today's daily pair is complete, so
        it never competes with the daily↔daily "finish today's challenge" CTA. */}
    {wordWheelPlayed && (
      <MpModeCrossPromo language={language} source="word_hunt_results" t={t} />
    )}

    {/* Catch up dailies missed in the last 3 days — nudge after finishing one. */}
    <CatchUpSuggestion excludeDate={puzzleDate} />

    {failStateNode}

    {/* Share/Retry Section */}
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <ShareSection
        solved={result.solved}
        onShare={shareHandlers.handleNativeShare}
        onChallengeShare={shareHandlers.handleChallengeShare}
        onRetry={coinActions.handleRetryChallenge}
        onRetryFree={onRetryFree}
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
        onSpendStart={onSpendStart}
        t={t}
      />
    </m.div>

    {/* Inline signup for guests (only reachable here while auth is still
        resolving — a resolved guest gets the simplified branch above). */}
    {signupNode}

    {/* Daily complete badge — shown once both games done */}
    {wordWheelPlayed && (
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <div className="flex items-center gap-3 w-full p-4 rounded-neo border-3 border-neo-black bg-neo-lime shadow-hard-lg">
          <CheckCircle2 className="w-6 h-6 text-neo-black shrink-0" />
          <div>
            <span className="font-neo-display font-black text-neo-black text-sm">
              {t('wordWheel.results.dailyComplete', 'Daily Challenge complete!')}
            </span>
            <p className="text-neo-black/70 text-xs">
              {t('wordWheel.results.dailyCompleteDesc', 'Both games done. Come back tomorrow!')}
            </p>
          </div>
        </div>
      </m.div>
    )}

    {/* Word Bridge (Connections) cross-promo — EN/HE only, after daily complete.
        Hidden once today's Connections is itself played (no already-played nag). */}
    {wordWheelPlayed && !connectionsPlayed && (language === 'en' || language === 'he') && (
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <Link
          href={`/${language}/connections/play`}
          data-testid="daily-connections-cross-promo"
          onClick={() =>
            trackGrowthEvent('cross_promo_click', {
              target: 'connections',
              source: 'word_hunt_results',
              placement: 'post_daily_complete',
              language,
            })
          }
          className="flex items-center justify-between gap-3 w-full p-4 rounded-neo border-3 border-neo-black bg-neo-pink shadow-hard-lg hover:scale-[1.02] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0 font-neo-display font-black text-neo-white text-lg">
              ↔
            </div>
            <div>
              <span className="block font-neo-display font-black text-neo-white text-base leading-tight">
                {t('connections.landing.crossPromoTitle', language === 'he' ? 'נסה ראש זנב' : 'Try Word Bridge')}
              </span>
              <p className="text-neo-white text-xs mt-0.5">
                {t('connections.landing.crossPromoBody', language === 'he' ? 'שתי מילים, גשר אחד. חינם.' : 'Two words. One bridge. Free.')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-neo-white shrink-0" />
        </Link>
      </m.div>
    )}

    {/* Back-to-daily CTA lives above the leaderboard now (see primary CTA block). */}

    {/* Witty facts — supplementary, below the fold */}
    {stats && (
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <DailyWordHuntFacts result={result} stats={stats} t={t} />
      </m.div>
    )}

    {/* Suggest tomorrow's word — community contribution */}
    <SuggestWordCard language={language} playerId={profile?.id} guestFingerprint={guestFingerprint} />

    {/* Create Your Own Board + Language Options — visible, not collapsed */}
    <MoreOptionsAccordion
      isAuthenticated={isAuthenticated}
      solved={result.solved}
      currentLanguage={language}
      onCreatePuzzle={onShowCreatePuzzle}
      onGameLanguageChange={onGameLanguageChange}
      t={t}
    />

  </div>
  );
};
