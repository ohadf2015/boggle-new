'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trophy, Target, X, TrendingUp, ArrowLeft, Copy, Check, Send, Coins } from 'lucide-react';

// X/Twitter icon (no lucide equivalent)
const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// WhatsApp icon (official brand icon)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import {
  generateWordHuntShareableResult,
  getGuestFingerprint,
  getGuestDailyPlayer,
  getStreakMilestone,
  getStreakMilestoneMessage,
  findRarestWord,
  hasPlayedWordHuntToday,
  getConversionTrigger,
  recordSignupModalDismissed,
  type WordHuntResult,
  type GuestDailyPlayer,
  type ConversionTrigger,
} from '@/utils/dailyChallenge';
import DailyChallengeSignupModal from '@/components/auth/DailyChallengeSignupModal';
import StreakMilestoneCelebration from './StreakMilestoneCelebration';
import DailyLeaderboard from './DailyLeaderboard';
import { feedbackToEmoji, type LetterFeedback } from '@/utils/wordHuntFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { awardDailyCoins, spendCoins, canAfford, getCoins, COIN_COSTS } from '@/utils/coinManager';
import type { Language } from '@/types';

interface WordHuntStats {
  totalPlayers: number;
  solvedCount: number;
  solveRate: number;
  attemptDistribution: Record<string, number>;
  avgAttemptsSolved: number | null;
  // Survival mode stats
  avgLifeRemaining?: number | null;
  avgEfficiencyScore?: number | null;
  maxEfficiencyScore?: number | null;
  avgWordsDiscovered?: number | null;
  yourStats?: {
    solved: boolean;
    attemptsUsed: number;
    percentile: number;
    rank?: number; // Player's rank position (1 = best)
    efficiencyScore?: number;
    efficiencyPercentile?: number;
  };
}

interface DailyWordHuntResultsProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
}

// Language options for the "Try Another Language" section
const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
];

/**
 * TryAnotherLanguage - Shows available languages the player can still try today
 */
const TryAnotherLanguage: React.FC<{ currentLanguage: Language }> = ({ currentLanguage }) => {
  const { t, setLanguage } = useLanguage();

  // Get languages that haven't been played today
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    (option) => option.code !== currentLanguage && !hasPlayedWordHuntToday(option.code)
  );

  // If no other languages available, don't show this section
  if (availableLanguages.length === 0) {
    return null;
  }

  const handleLanguageClick = (langCode: Language) => {
    setLanguage(langCode);
    // Force reload to start fresh with new language
    // Using assign() method to avoid React Compiler issues with property assignment
    window.location.assign(`/${langCode}/daily`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9 }}
      className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700"
    >
      <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase mb-3 flex items-center gap-2">
        🌍 {t('wordHunt.results.tryAnotherLanguage')}
      </h3>
      <div className="flex flex-wrap justify-center gap-2">
        {availableLanguages.map((option) => (
          <Button
            key={option.code}
            onClick={() => handleLanguageClick(option.code)}
            className="px-4 py-2 bg-gradient-to-r from-neo-cyan to-neo-blue text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all flex items-center gap-2"
          >
            <span className="text-lg">{option.flag}</span>
            <span className="font-bold text-sm">{option.name}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {t('wordHunt.results.playDifferentLanguage')}
      </p>
    </motion.div>
  );
};

/**
 * DailyWordHuntResults - Results screen for Word Hunt with Wordle-style sharing
 */
const DailyWordHuntResults: React.FC<DailyWordHuntResultsProps> = ({
  result,
  puzzleNumber,
  puzzleDate,
  language,
  countdown,
  isNewCompletion,
  onBack,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [stats, setStats] = useState<WordHuntStats | null>(null);
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
  const [coinReward, setCoinReward] = useState<{
    awarded: number;
    breakdown: { base: number; efficiency: number; streak: number };
  } | null>(null);
  const [targetWordRevealed, setTargetWordRevealed] = useState(false);
  const [currentCoins, setCurrentCoins] = useState(() => getCoins());
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupTrigger, setSignupTrigger] = useState<ConversionTrigger | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const { profile, isAuthenticated } = useAuth();

  // Check for streak milestone
  const streakMilestone = getStreakMilestone(result.streakDays);
  const milestoneMessage = streakMilestone ? getStreakMilestoneMessage(result.streakDays) : null;

  // Find rarest word discovered
  const rarestWord = result.wordsDiscovered ? findRarestWord(result.wordsDiscovered, language) : null;

  // Get guest fingerprint and player info on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

  // Fetch aggregate stats - declared before the submit effect that uses it
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (isAuthenticated && profile) {
        params.append('playerId', profile.id);
      } else if (guestFingerprint) {
        params.append('guestFingerprint', guestFingerprint);
      }

      const response = await fetch(
        `/api/daily-challenge/word-hunt/stats/${puzzleDate}/${language}?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch Word Hunt stats:', err);
    }
  }, [puzzleDate, language, isAuthenticated, profile, guestFingerprint]);

  // Submit result to backend when completing a new challenge
  useEffect(() => {
    const canSubmit = isNewCompletion && result && guestFingerprint && (isAuthenticated ? !!profile : true);

    if (canSubmit) {
      const submitResult = async () => {
        try {
          const displayName = isAuthenticated && profile
            ? profile.display_name || profile.username
            : guestPlayer?.displayName || 'Guest Player';
          const avatarEmoji = isAuthenticated && profile
            ? profile.avatar_emoji
            : guestPlayer?.avatarEmoji || '🎯';
          const avatarColor = isAuthenticated && profile
            ? profile.avatar_color
            : guestPlayer?.avatarColor || '#6366f1';

          const bodyData: Record<string, unknown> = {
            puzzleDate,
            puzzleNumber,
            language,
            playerId: isAuthenticated && profile ? profile.id : null,
            guestFingerprint: !isAuthenticated ? guestFingerprint : null,
            displayName,
            avatarEmoji,
            avatarColor,
            solved: result.solved,
            attemptsUsed: result.attemptsUsed,
            targetWord: result.targetWord,
            attemptWords: result.attempts.map(a => ({
              word: a.word,
              feedback: a.feedback.map(f => ({
                letter: f.letter,
                feedback: f.feedback,
                position: f.position,
              })),
              timestamp: a.timestamp,
            })),
          };

          // Debug logging for submission
          console.log('[WordHunt Submit] Preparing submission:', {
            isAuthenticated,
            hasProfile: !!profile,
            playerId: bodyData.playerId,
            guestFingerprint: bodyData.guestFingerprint,
            displayName: bodyData.displayName,
            avatarEmoji: bodyData.avatarEmoji,
            solved: bodyData.solved,
            attemptsUsed: bodyData.attemptsUsed,
          });

          // Add survival mode fields if present
          if (result.wordsDiscovered) bodyData.wordsDiscovered = result.wordsDiscovered;
          if (result.lifeRemaining !== undefined) bodyData.lifeRemaining = result.lifeRemaining;
          if (result.clueTokensEarned !== undefined) bodyData.clueTokensEarned = result.clueTokensEarned;
          if (result.clueTokensSpent !== undefined) bodyData.clueTokensSpent = result.clueTokensSpent;
          if (result.hintsUnlocked !== undefined) bodyData.hintsUnlocked = result.hintsUnlocked;
          if (result.efficiencyScore !== undefined) bodyData.efficiencyScore = result.efficiencyScore;

          const response = await fetch('/api/daily-challenge/word-hunt/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to submit Word Hunt result:', errorText);
            return;
          }

          const responseData = await response.json();
          console.log('[WordHunt Submit] Response:', {
            success: responseData.success,
            alreadySubmitted: responseData.alreadySubmitted,
            dataId: responseData.data?.id,
            playerType: bodyData.playerId ? 'authenticated' : 'guest',
          });

          // Refresh the leaderboard and fetch stats after successful submission
          setLeaderboardKey(prev => prev + 1);
          fetchStats();
        } catch (err) {
          console.error('Failed to submit Word Hunt result:', err);
        }
      };
      submitResult();
    } else if (!isNewCompletion) {
      // Even if not new completion, fetch stats to show
      fetchStats();
    }
  }, [isNewCompletion, result, guestFingerprint, puzzleDate, puzzleNumber, language, isAuthenticated, profile, guestPlayer, fetchStats]);

  // Fire confetti on victory
  useEffect(() => {
    if (isNewCompletion && result.solved) {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10B981', '#FFE135', '#00D9FF'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10B981', '#FFE135', '#00D9FF'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Extra burst for quick solve (3 attempts or less)
      if (result.attemptsUsed <= 3) {
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 120,
            origin: { y: 0.6 },
            colors: ['#10B981', '#FFE135', '#FF1493'],
          });
        }, 500);
      }
    }
  }, [isNewCompletion, result.solved, result.attemptsUsed]);

  // Show streak milestone celebration for new completions
  useEffect(() => {
    if (isNewCompletion && milestoneMessage) {
      // Delay slightly to let the main confetti start first
      const timer = setTimeout(() => {
        setShowMilestoneCelebration(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, milestoneMessage]);

  // Award coins for completing the daily challenge
  useEffect(() => {
    if (isNewCompletion) {
      const reward = awardDailyCoins(
        puzzleDate,
        language,
        result.solved,
        result.efficiencyScore || 0,
        result.streakDays || 0
      );
      if (reward) {
        setCoinReward(reward);
      }
    }
  }, [isNewCompletion, puzzleDate, language, result.solved, result.efficiencyScore, result.streakDays]);

  // Show signup modal for unauthenticated users based on smart triggers
  useEffect(() => {
    // Only show for new completions and unauthenticated users
    if (!isNewCompletion || isAuthenticated) {
      return;
    }

    // Delay to let celebration animations play first
    const timer = setTimeout(() => {
      const percentile = stats?.yourStats?.percentile;
      const trigger = getConversionTrigger(result, percentile);

      if (trigger) {
        setSignupTrigger(trigger);
        setShowSignupModal(true);
      }
    }, 3000); // 3 second delay for better UX

    return () => clearTimeout(timer);
  }, [isNewCompletion, isAuthenticated, result, stats?.yourStats?.percentile]);

  // Handle signup modal dismiss
  const handleSignupModalClose = useCallback(() => {
    setShowSignupModal(false);
    recordSignupModalDismissed();
  }, []);

  // Generate shareable text (use streak from result, which is now properly tracked)
  const shareText = generateWordHuntShareableResult({
    ...result,
    puzzleNumber,
    puzzleDate,
    language,
    streakDays: result.streakDays || 0,
    completedAt: result.completedAt || new Date().toISOString(),
  });

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareText]);

  // Handle share to WhatsApp
  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText]);

  // Handle share to Twitter/X
  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText]);

  // Handle share to Telegram
  const handleTelegram = useCallback(() => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(`https://lexiclash.live/${language}/daily`)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText, language]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareText]);

  // Handle reveal target word (costs coins)
  const handleRevealTargetWord = useCallback(() => {
    const cost = COIN_COSTS.REVEAL_TARGET_WORD;
    if (!canAfford(cost)) {
      return; // Not enough coins
    }

    const spent = spendCoins(cost, 'Reveal Target Word', {
      puzzleDate,
      language,
    });

    if (spent) {
      setTargetWordRevealed(true);
      setCurrentCoins(getCoins());
    }
  }, [puzzleDate, language]);

  return (
    <motion.div
      key="word-hunt-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto"
    >
      {/* Back button */}
      <motion.div className="absolute top-24 sm:top-28 start-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-md w-full text-center space-y-6 py-8">
        {/* Completion badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          {result.solved ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-neo border-3 border-neo-black shadow-hard">
              <Trophy className="w-5 h-5 text-white" />
              <span className="font-black text-white uppercase">
                {t('wordHunt.victory')}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 rounded-neo border-3 border-neo-black shadow-hard">
              <X className="w-5 h-5 text-white" />
              <span className="font-black text-white uppercase">
                {t('wordHunt.stats.youFailed')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Puzzle number and attempts */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300 uppercase font-bold">
            🎯 {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
          </div>

          {/* Success: Show attempts used */}
          {result.solved ? (
            <>
              <div className="text-6xl md:text-7xl font-black mt-2 text-green-500">
                {result.attemptsUsed}/10
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                {t('wordHunt.stats.attemptsUsed').replace('{count}', String(result.attemptsUsed))}
              </div>

              {/* Show target word for successful players */}
              <div className="mt-3 space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('wordHunt.results.targetWord')}:
                </div>
                <div className="text-2xl font-black text-neo-yellow tracking-wider">
                  {result.targetWord.toUpperCase()}
                </div>
              </div>

              {/* Show coins earned (net tokens) for successful players */}
              {result.clueTokensEarned !== undefined && result.clueTokensSpent !== undefined && (
                <div className="mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-neo border-2 border-neo-black">
                  <span className="text-2xl">🪙</span>
                  <div className="text-sm">
                    <span className="font-black text-xl">{result.clueTokensEarned - result.clueTokensSpent}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">{t('wordHunt.results.tokensEarned')}</span>
                  </div>
                </div>
              )}

              {/* Coin reward for word reveals */}
              {coinReward && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="mt-3 px-4 py-3 bg-gradient-to-r from-neo-yellow to-amber-400 rounded-neo border-3 border-neo-black shadow-hard"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Coins className="w-5 h-5 text-neo-black" />
                    <span className="font-black text-xl text-neo-black">+{coinReward.awarded}</span>
                    <span className="text-sm font-bold text-neo-black/70">{t('reveal.coins') || 'Coins'}</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-xs text-neo-black/70 font-medium">
                    {coinReward.breakdown.base > 0 && (
                      <span>{t('reveal.base') || 'Base'}: +{coinReward.breakdown.base}</span>
                    )}
                    {coinReward.breakdown.efficiency > 0 && (
                      <span>{t('reveal.efficiency') || 'Efficiency'}: +{coinReward.breakdown.efficiency}</span>
                    )}
                    {coinReward.breakdown.streak > 0 && (
                      <span>🔥 {t('reveal.streak') || 'Streak'}: +{coinReward.breakdown.streak}</span>
                    )}
                  </div>
                  <p className="text-xs text-neo-black/60 mt-1">
                    {t('reveal.usedForReveals') || 'Use coins to reveal words in single player games!'}
                  </p>
                </motion.div>
              )}
            </>
          ) : (
            /* Failed: Show encouraging message and countdown */
            <div className="mt-4 space-y-4">
              <div className="text-lg text-gray-600 dark:text-gray-300">
                {t('wordHunt.results.betterLuckNextTime')}
              </div>

              {/* Next challenge countdown - prominent for failed players */}
              <div className="inline-block px-6 py-4 bg-gradient-to-r from-neo-cyan to-neo-blue rounded-neo border-3 border-neo-black shadow-hard">
                <div className="text-sm text-white/80 uppercase font-bold mb-1">
                  {t('wordHunt.results.nextChallengeIn')}
                </div>
                <div className="text-3xl font-black text-white">
                  {countdown}
                </div>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('wordHunt.results.tryAgainTomorrow')}
              </div>

              {/* Reveal Target Word Option */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                {targetWordRevealed ? (
                  // Show the revealed target word
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('wordHunt.results.theTargetWordWas') || 'The target word was:'}
                    </div>
                    <div className="text-3xl font-black text-neo-yellow tracking-wider">
                      {result.targetWord.toUpperCase()}
                    </div>
                  </div>
                ) : (
                  // Show the reveal button
                  <div className="space-y-2">
                    <Button
                      onClick={handleRevealTargetWord}
                      disabled={!canAfford(COIN_COSTS.REVEAL_TARGET_WORD)}
                      className={cn(
                        "px-6 py-3 font-bold border-3 border-neo-black rounded-neo shadow-hard transition-all",
                        canAfford(COIN_COSTS.REVEAL_TARGET_WORD)
                          ? "bg-neo-purple hover:bg-neo-pink text-white hover:-translate-y-0.5"
                          : "bg-gray-300 text-gray-600 cursor-not-allowed"
                      )}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      {t('wordHunt.results.revealTargetWord') || 'Reveal Target Word'}
                      <span className="ml-2 px-2 py-0.5 bg-neo-yellow text-neo-black text-xs rounded-full font-black">
                        {COIN_COSTS.REVEAL_TARGET_WORD}
                      </span>
                    </Button>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t('wordHunt.results.yourCoins') || 'Your coins:'}{' '}
                      <span className="font-bold text-neo-yellow">{currentCoins}</span>
                      {!canAfford(COIN_COSTS.REVEAL_TARGET_WORD) && (
                        <span className="text-red-500 ml-2">
                          ({t('wordHunt.results.notEnoughCoins') || 'not enough coins'})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Streak display */}
          {result.streakDays > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.25 }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-neo border-3 border-neo-black shadow-hard"
            >
              <span className="text-2xl">🔥</span>
              <span className="font-black text-white">
                {result.streakDays} {result.streakDays === 1 ? t('daily.dayStreak') : t('daily.daysStreak')}
              </span>
              {milestoneMessage && (
                <span className="text-lg ml-1">{milestoneMessage.emoji}</span>
              )}
            </motion.div>
          )}

          {/* Rarest word highlight */}
          {rarestWord && rarestWord.rarity >= 4 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.3 }}
              className="mt-3 inline-flex flex-col items-center gap-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-neo border-3 border-neo-black shadow-hard"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{rarestWord.emoji}</span>
                <span className="font-black text-white text-sm uppercase">{rarestWord.label} FIND</span>
              </div>
              <span className="font-black text-white text-xl tracking-wider">
                {rarestWord.word.toUpperCase()}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Ranking badges */}
        {stats?.yourStats && stats.yourStats.solved && (
          <div className="space-y-3">
            {/* Rank position */}
            {stats.yourStats.rank !== undefined && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.3 }}
                className="inline-block px-6 py-3 bg-gradient-to-r from-neo-orange to-neo-yellow rounded-neo border-3 border-neo-black shadow-hard"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-neo-black" />
                  <span className="font-black text-neo-black text-sm">
                    {t('wordHunt.results.rankOutOf').replace('{rank}', String(stats.yourStats.rank)).replace('{total}', String(stats.totalPlayers))}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Percentile badge */}
            {stats.yourStats.percentile !== undefined && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', delay: 0.35 }}
                className="inline-block px-6 py-3 bg-gradient-to-r from-neo-purple to-neo-blue rounded-neo border-3 border-neo-black shadow-hard"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <span className="font-bold text-white text-sm">
                    {t('wordHunt.stats.yourPercentile').replace('{percentile}', String(stats.yourStats.percentile))}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Language note */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('wordHunt.results.rankingsFor').replace('{language}', language.toUpperCase())}
            </div>
          </div>
        )}

        {/* Share Section - Moved above statistics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Shareable result preview - Enhanced UI */}
          <div className={cn(
            "relative rounded-neo border-3 overflow-hidden",
            result.solved
              ? "bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 border-emerald-600"
              : "bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 border-gray-600"
          )}>
            {/* Decorative corner accents */}
            <div className={cn(
              "absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 rounded-tl",
              result.solved ? "border-emerald-400/50" : "border-gray-500/50"
            )} />
            <div className={cn(
              "absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 rounded-tr",
              result.solved ? "border-emerald-400/50" : "border-gray-500/50"
            )} />
            <div className={cn(
              "absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 rounded-bl",
              result.solved ? "border-emerald-400/50" : "border-gray-500/50"
            )} />
            <div className={cn(
              "absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 rounded-br",
              result.solved ? "border-emerald-400/50" : "border-gray-500/50"
            )} />

            {/* Header bar */}
            <div className={cn(
              "px-4 py-2 flex items-center justify-between border-b",
              result.solved
                ? "bg-emerald-900/50 border-emerald-700/50"
                : "bg-gray-800/50 border-gray-700/50"
            )}>
              <div className="flex items-center gap-2">
                <Share2 className={cn(
                  "w-4 h-4",
                  result.solved ? "text-emerald-400" : "text-gray-400"
                )} />
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  result.solved ? "text-emerald-400" : "text-gray-400"
                )}>
                  {t('wordHunt.shareResult')}
                </span>
              </div>
              <span className="text-lg">{result.solved ? '✨' : '💪'}</span>
            </div>

            {/* Share text content */}
            <div className="p-4">
              <pre className="text-white text-sm font-mono whitespace-pre-wrap leading-relaxed break-words overflow-hidden max-w-full">
                {shareText}
              </pre>
            </div>
          </div>

          {/* Share buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleNativeShare}
              className={cn(
                "w-full py-4 text-lg font-black uppercase border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all",
                result.solved
                  ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
                  : "bg-gradient-to-r from-neo-cyan to-neo-blue text-white"
              )}
            >
              <Share2 className="mr-2 w-5 h-5" />
              {result.solved ? t('wordHunt.shareResult') : t('wordHunt.shareAttempt')}
            </Button>

            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={handleWhatsApp}
                aria-label="Share on WhatsApp"
                className="py-3 min-h-[44px] bg-[#25D366] text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
              >
                <WhatsAppIcon className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleTwitter}
                aria-label="Share on X (Twitter)"
                className="py-3 min-h-[44px] bg-black text-white border-3 border-gray-700 rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
              >
                <XTwitterIcon className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleTelegram}
                aria-label="Share on Telegram"
                className="py-3 min-h-[44px] bg-[#0088cc] text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
              >
                <Send className="w-5 h-5" />
              </Button>

              <Button
                onClick={handleCopy}
                aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
                className="py-3 min-h-[44px] bg-gray-600 text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-neo-lime" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </Button>
            </div>

            {copied && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-neo-lime font-bold"
              >
                {t('daily.copiedToClipboard')}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Attempt history with feedback */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase">
            {t('wordHunt.title')} - {t('common.attempts')}
          </h3>
          <div className="space-y-1">
            {result.attempts.map((attempt, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-6">
                  {idx + 1}.
                </span>
                <div className="flex gap-1">
                  {attempt.feedback.map((letterFb, letterIdx) => (
                    <div
                      key={letterIdx}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center font-bold text-white rounded border-2 border-neo-black text-lg",
                        letterFb.feedback === 'green' && "bg-green-500",
                        letterFb.feedback === 'yellow' && "bg-yellow-500",
                        letterFb.feedback === 'gray' && "bg-gray-400"
                      )}
                    >
                      {letterFb.letter}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats grid */}
        {stats && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-neo-navy-light rounded-neo border-3 border-neo-black p-4 space-y-4"
          >
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase flex items-center gap-2">
              📊 {t('wordHunt.stats.title')}
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="text-lg mb-1">👥</div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {stats.totalPlayers}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('wordHunt.stats.totalPlayers')}
                </div>
              </motion.div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border-2 border-green-200 dark:border-green-800"
              >
                <div className="text-lg mb-1">✅</div>
                <div className="text-2xl font-black text-green-600 dark:text-green-400">
                  {stats.solveRate}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('wordHunt.stats.solveRate')}
                </div>
              </motion.div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border-2 border-purple-200 dark:border-purple-800"
              >
                <div className="text-lg mb-1">🎯</div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {stats.avgAttemptsSolved?.toFixed(1) ?? 'N/A'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('wordHunt.stats.avgAttempts')}
                </div>
              </motion.div>
            </div>

            {/* Attempt distribution histogram */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-2">
                📈 {t('wordHunt.stats.distribution')}
              </div>
              {[...Array(10)].map((_, i) => {
                const attemptNum = i + 1;
                const count = stats.attemptDistribution[attemptNum] || 0;
                const maxCount = Math.max(...Object.values(stats.attemptDistribution));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const isYourAttempt = result.solved && result.attemptsUsed === attemptNum;

                return (
                  <motion.div
                    key={attemptNum}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <span className={cn(
                      "text-xs font-bold w-6",
                      isYourAttempt ? "text-neo-yellow" : "text-gray-600 dark:text-gray-400"
                    )}>
                      {attemptNum}
                    </span>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                        className={cn(
                          "h-full flex items-center justify-end px-2 text-xs font-bold text-white",
                          isYourAttempt
                            ? "bg-gradient-to-r from-neo-yellow to-neo-orange"
                            : "bg-gradient-to-r from-green-500 to-emerald-500"
                        )}
                      >
                        {count > 0 && <span>{count}</span>}
                      </motion.div>
                    </div>
                    {isYourAttempt && (
                      <span className="text-xs font-bold text-neo-yellow">← YOU</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Survival mode stats - show when available */}
            {(stats.avgLifeRemaining != null || stats.avgEfficiencyScore != null || stats.avgWordsDiscovered != null) && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700 space-y-2">
                <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                  {t('wordHunt.results.survivalMetrics')}
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {stats.avgLifeRemaining != null && (
                    <div>
                      <div className="text-xl font-black text-red-500">
                        {stats.avgLifeRemaining.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.avgLifeLeft')}
                      </div>
                    </div>
                  )}
                  {stats.avgWordsDiscovered != null && (
                    <div>
                      <div className="text-xl font-black text-blue-500">
                        {stats.avgWordsDiscovered.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.avgWordsFound')}
                      </div>
                    </div>
                  )}
                  {stats.avgEfficiencyScore != null && (
                    <div>
                      <div className="text-xl font-black text-purple-500">
                        {stats.avgEfficiencyScore.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.avgEfficiency')}
                      </div>
                    </div>
                  )}
                  {stats.maxEfficiencyScore != null && (
                    <div>
                      <div className="text-xl font-black text-yellow-500">
                        {stats.maxEfficiencyScore}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('wordHunt.results.bestEfficiency')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Your efficiency percentile */}
                {stats.yourStats?.efficiencyScore !== undefined && stats.yourStats?.efficiencyPercentile !== undefined && (
                  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                    <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      {t('wordHunt.results.yourEfficiency').replace('{score}', String(stats.yourStats.efficiencyScore))}
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {t('wordHunt.results.efficiencyPercentile').replace('{percentile}', String(stats.yourStats.efficiencyPercentile))} 🎯
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Today's Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-6"
        >
          <DailyLeaderboard
            key={leaderboardKey}
            puzzleDate={puzzleDate}
            language={language}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            maxVisible={10}
            t={t}
            gameType="wordHunt"
          />
        </motion.div>

        {/* Next puzzle countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('daily.nextPuzzleIn')} <span className="font-bold text-neo-cyan">{countdown}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('wordHunt.playAgainTomorrow')}
          </p>
        </motion.div>

        {/* Try Another Language Section */}
        <TryAnotherLanguage currentLanguage={language} />
      </div>

      {/* Share panel for browsers without native share */}
      <AnimatePresence>
        {showSharePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSharePanel(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-black mb-4">{t('wordHunt.shareResult')}</h3>

              <div className="space-y-3">
                <Button
                  onClick={handleWhatsApp}
                  className="w-full py-3 bg-[#25D366] text-white border-3 border-neo-black rounded-neo"
                >
                  <WhatsAppIcon className="mr-2 w-5 h-5" />
                  WhatsApp
                </Button>

                <Button
                  onClick={handleTwitter}
                  className="w-full py-3 bg-black text-white border-3 border-gray-700 rounded-neo"
                >
                  <XTwitterIcon className="mr-2 w-5 h-5" />
                  X / Twitter
                </Button>

                <Button
                  onClick={handleTelegram}
                  className="w-full py-3 bg-[#0088cc] text-white border-3 border-neo-black rounded-neo"
                >
                  <Send className="mr-2 w-5 h-5" />
                  Telegram
                </Button>

                <Button
                  onClick={handleCopy}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-3 border-neo-black rounded-neo"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 w-5 h-5 text-neo-lime" />
                      {t('common.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 w-5 h-5" />
                      {t('daily.copyToClipboard')}
                    </>
                  )}
                </Button>
              </div>

              <Button
                onClick={() => setShowSharePanel(false)}
                variant="ghost"
                className="w-full mt-4"
              >
                {t('daily.close')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Daily Challenge Signup Conversion Modal */}
      {signupTrigger && (
        <DailyChallengeSignupModal
          isOpen={showSignupModal}
          onClose={handleSignupModalClose}
          trigger={signupTrigger}
          streakDays={result.streakDays}
          percentile={stats?.yourStats?.percentile}
          attemptsUsed={result.attemptsUsed}
          solved={result.solved}
          pendingResult={{
            result,
            puzzleNumber,
            puzzleDate,
            language,
          }}
        />
      )}
    </motion.div>
  );
};

export default DailyWordHuntResults;
