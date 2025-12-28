'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { Share2, Trophy, Target, X, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';
import {
  generateWordHuntShareableResult,
  getGuestFingerprint,
  getGuestDailyPlayer,
  type WordHuntResult,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';
import { feedbackToEmoji, type LetterFeedback } from '@/utils/wordHuntFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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
    efficiencyScore?: number;
    efficiencyPercentile?: number;
  };
}

interface DailyWordHuntResultsProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: string;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
}

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
  const { profile, isAuthenticated } = useAuth();

  // Get guest fingerprint and player info on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

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
          console.log('Word Hunt submitted successfully:', responseData);

          // Fetch stats
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
  }, [isNewCompletion, result, guestFingerprint, puzzleDate, puzzleNumber, language, isAuthenticated, profile, guestPlayer]);

  // Fetch aggregate stats
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

  // Generate shareable text
  const shareText = generateWordHuntShareableResult({
    ...result,
    puzzleNumber,
    puzzleDate,
    language,
    streakDays: 0, // TODO: Add streak tracking
    completedAt: new Date().toISOString(),
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
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\nCan you solve it?')}`;
    window.open(url, '_blank');
  }, [shareText]);

  // Handle share to Twitter/X
  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText + '\n\nCan you solve it?',
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareText]);

  return (
    <motion.div
      key="word-hunt-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-start p-4 overflow-y-auto"
    >
      {/* Back button */}
      <motion.div className="absolute top-24 sm:top-28 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <FaArrowLeft className="mr-2" />
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
          <div className={cn(
            "text-6xl md:text-7xl font-black mt-2",
            result.solved ? "text-green-500" : "text-gray-400"
          )}>
            {result.solved ? result.attemptsUsed : 'X'}/10
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            {t('wordHunt.stats.attemptsUsed').replace('{count}', String(result.attemptsUsed))}
          </div>
          {!result.solved && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('wordHunt.defeat').replace('{word}', result.targetWord.toUpperCase())}
            </div>
          )}
        </motion.div>

        {/* Percentile badge */}
        {stats?.yourStats && stats.yourStats.solved && stats.yourStats.percentile !== undefined && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3 }}
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

        {/* Attempt history with feedback */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
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
            className="bg-white dark:bg-neo-navy-light rounded-neo border-3 border-neo-black p-4 space-y-3"
          >
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase">
              {t('wordHunt.stats.title')}
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-black text-neo-black dark:text-white">
                  {stats.totalPlayers}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('wordHunt.stats.totalPlayers')}
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-green-600">
                  {stats.solveRate}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('wordHunt.stats.solveRate')}
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-neo-purple">
                  {stats.avgAttemptsSolved?.toFixed(1) ?? 'N/A'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('wordHunt.stats.avgAttempts')}
                </div>
              </div>
            </div>

            {/* Attempt distribution histogram */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                {t('wordHunt.stats.distribution')}
              </div>
              {[...Array(10)].map((_, i) => {
                const attemptNum = i + 1;
                const count = stats.attemptDistribution[attemptNum] || 0;
                const maxCount = Math.max(...Object.values(stats.attemptDistribution));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const isYourAttempt = result.solved && result.attemptsUsed === attemptNum;

                return (
                  <div key={attemptNum} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-6 text-gray-600 dark:text-gray-400">
                      {attemptNum}
                    </span>
                    <div className="flex-1 h-5 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
                      <div
                        className={cn(
                          "h-full flex items-center justify-end px-1 text-xs font-bold text-white transition-all",
                          isYourAttempt ? "bg-neo-yellow" : "bg-green-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      >
                        {count > 0 && <span>{count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Survival mode stats - show when available */}
            {(stats.avgLifeRemaining !== null || stats.avgEfficiencyScore !== null || stats.avgWordsDiscovered !== null) && (
              <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700 space-y-2">
                <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                  Survival Mode Metrics
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {stats.avgLifeRemaining !== null && (
                    <div>
                      <div className="text-xl font-black text-red-500">
                        {stats.avgLifeRemaining.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Avg Life Left
                      </div>
                    </div>
                  )}
                  {stats.avgWordsDiscovered !== null && (
                    <div>
                      <div className="text-xl font-black text-blue-500">
                        {stats.avgWordsDiscovered.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Avg Words Found
                      </div>
                    </div>
                  )}
                  {stats.avgEfficiencyScore !== null && (
                    <div>
                      <div className="text-xl font-black text-purple-500">
                        {stats.avgEfficiencyScore.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Avg Efficiency
                      </div>
                    </div>
                  )}
                  {stats.maxEfficiencyScore !== null && (
                    <div>
                      <div className="text-xl font-black text-yellow-500">
                        {stats.maxEfficiencyScore}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Best Efficiency
                      </div>
                    </div>
                  )}
                </div>

                {/* Your efficiency percentile */}
                {stats.yourStats?.efficiencyScore !== undefined && stats.yourStats?.efficiencyPercentile !== undefined && (
                  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
                    <div className="text-xs font-bold text-purple-700 dark:text-purple-300">
                      Your Efficiency: {stats.yourStats.efficiencyScore} points
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      Better than {stats.yourStats.efficiencyPercentile}% of players! 🎯
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Shareable result preview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-900 dark:bg-black rounded-neo border-3 border-gray-700 p-4 text-left"
        >
          <pre className="text-white text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {shareText}
          </pre>
        </motion.div>

        {/* Share buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <Button
            onClick={handleNativeShare}
            className="w-full py-4 text-lg font-black uppercase bg-gradient-to-r from-green-400 to-emerald-500 text-white border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
          >
            <Share2 className="mr-2 w-5 h-5" />
            {t('wordHunt.shareResult')}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleWhatsApp}
              aria-label="Share on WhatsApp"
              className="py-3 min-h-[44px] bg-[#25D366] text-black border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
            >
              <FaWhatsapp className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleTwitter}
              aria-label="Share on X (Twitter)"
              className="py-3 min-h-[44px] bg-black text-white border-3 border-gray-700 rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
            >
              <FaXTwitter className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleCopy}
              aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
              className="py-3 min-h-[44px] bg-gray-600 text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all"
            >
              {copied ? (
                <FaCheck className="w-5 h-5 text-neo-lime" />
              ) : (
                <FaCopy className="w-5 h-5" />
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
        </motion.div>

        {/* Next puzzle countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="pt-4 border-t border-gray-200 dark:border-gray-700"
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('daily.nextPuzzleIn')} <span className="font-bold text-neo-cyan">{countdown}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('wordHunt.playAgainTomorrow')}
          </p>
        </motion.div>
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
                  className="w-full py-3 bg-[#25D366] text-black border-3 border-neo-black rounded-neo"
                >
                  <FaWhatsapp className="mr-2 w-5 h-5" />
                  WhatsApp
                </Button>

                <Button
                  onClick={handleTwitter}
                  className="w-full py-3 bg-black text-white border-3 border-gray-700 rounded-neo"
                >
                  <FaXTwitter className="mr-2 w-5 h-5" />
                  X / Twitter
                </Button>

                <Button
                  onClick={handleCopy}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-3 border-neo-black rounded-neo"
                >
                  {copied ? (
                    <>
                      <FaCheck className="mr-2 w-5 h-5 text-neo-lime" />
                      {t('common.copied')}
                    </>
                  ) : (
                    <>
                      <FaCopy className="mr-2 w-5 h-5" />
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
    </motion.div>
  );
};

export default DailyWordHuntResults;
