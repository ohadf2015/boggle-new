'use client';

/**
 * WordHuntResultsContent - Results tab content for DailyWordHuntResults.
 *
 * Extracted from DailyWordHuntResults to keep files under 500 lines.
 * Contains the main results view: mascot, result display, performance,
 * rank badge, facts, emoji share, share section, signup CTA, fail state,
 * leaderboard, and more options.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import DailyChallengeInlineSignup from '@/components/auth/DailyChallengeInlineSignup';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import WatchAdButton from './WatchAdButton';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import { MascotWithEntrance } from '@/components/ui/Mascot';
import type { WordHuntStats, CoinReward } from './results';
import type { WordHuntResult } from '@/utils/dailyChallenge/types';
import type { Language } from '@/shared/types/game';
import {
  ResultDisplay,
  PerformanceSection,
  RankBadge,
  DailyWordHuntFacts,
  EmojiShareCard,
  ShareSection,
  CoinUnlockCard,
  MoreOptionsAccordion,
} from './results';

export interface WordHuntResultsContentProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  countdown: string;
  isNewCompletion?: boolean;
  showFlexing: boolean;
  showEncouraging: boolean;
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
    retryCost: number;
    currentCoins: number;
    targetWordRevealed: boolean;
    revealCost: number;
    handleRevealTargetWord: () => void;
  };
  isAuthenticated: boolean;
  inlineSignupDismissed: boolean;
  onInlineSignupDismiss: () => void;
  leaderboardKey: number;
  profile: { id: string } | null;
  guestFingerprint: string | null;
  onGameLanguageChange?: (lang: Language) => void;
  onShowCreatePuzzle: () => void;
  onSpendStart: (position: { x: number; y: number }, amount: number) => void;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
}

export const WordHuntResultsContent: React.FC<WordHuntResultsContentProps> = ({
  result,
  puzzleNumber,
  puzzleDate,
  language,
  countdown,
  isNewCompletion,
  showFlexing,
  showEncouraging,
  survivalBonusTime,
  rarestWord,
  emojiWords,
  stats,
  shareHandlers,
  coinActions,
  isAuthenticated,
  inlineSignupDismissed,
  onInlineSignupDismiss,
  leaderboardKey,
  profile,
  guestFingerprint,
  onGameLanguageChange,
  onShowCreatePuzzle,
  onSpendStart,
  t,
}) => (
  <div className="space-y-4">
    {/* Performance mascot — reacts to how many words the player found */}
    {showFlexing && (
      <div className="flex justify-center mb-4">
        <MascotWithEntrance variant="flexing" size="lg" delay={0.2} />
      </div>
    )}
    {showEncouraging && (
      <div className="flex justify-center mb-4">
        <MascotWithEntrance variant="encouraging" size="md" delay={0.2} />
      </div>
    )}

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
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
          t={t}
        />
      </motion.div>
    )}

    {/* Rank badge - shows for both WIN and FAIL */}
    {stats && (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <RankBadge stats={stats} t={t} />
      </motion.div>
    )}

    {/* Witty facts — data-driven insights about the player's performance */}
    {stats && (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <DailyWordHuntFacts result={result} stats={stats} t={t} />
      </motion.div>
    )}

    {/* Emoji share card — visible for winners with discovered words */}
    {result.solved && emojiWords.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 26 }}
      >
        <EmojiShareCard
          puzzleNumber={puzzleNumber}
          score={result.efficiencyScore || 0}
          solved={result.solved}
          words={emojiWords}
          language={language}
          t={t}
        />
      </motion.div>
    )}

    {/* Share/Retry Section */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <ShareSection
        solved={result.solved}
        onShare={shareHandlers.handleNativeShare}
        onChallengeShare={shareHandlers.handleChallengeShare}
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
        onSpendStart={onSpendStart}
        t={t}
      />
    </motion.div>

    {/* Inline signup for guests */}
    {!isAuthenticated && !inlineSignupDismissed && (
      <DailyChallengeInlineSignup
        pendingResult={{ result, puzzleNumber, puzzleDate, language }}
        onDismiss={onInlineSignupDismiss}
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
          <div className="max-w-btn">
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
          </div>
        )}

        {/* Watch Ad for Coins */}
        {!coinActions.canAffordRetry && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex-1 h-px bg-slate-700" />
              <span>{t('wordHunt.ad.needMoreCoins')}</span>
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
      onCreatePuzzle={onShowCreatePuzzle}
      onGameLanguageChange={onGameLanguageChange}
      t={t}
    />
  </div>
);
