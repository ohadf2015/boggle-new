'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trophy, Flame, Target, Clock, BookOpen, ArrowLeft, MessageCircle, Copy, Check } from 'lucide-react';

// X/Twitter icon (no lucide equivalent)
const XTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import {
  generateShareableResult,
  getGuestFingerprint,
  getGuestDailyPlayer,
  type DailyChallengeResult,
  type DailyStreak,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';
import DailyLeaderboard from './DailyLeaderboard';
import { useAuth } from '@/contexts/AuthContext';

interface DailyChallengeResultsProps {
  result: DailyChallengeResult;
  streak: DailyStreak | null;
  streakMilestone: number | null;
  words: string[];
  longestWord: string;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
  t: (key: string) => string;
}

/**
 * DailyChallengeResults - Results screen with shareable emoji grid
 */
const DailyChallengeResults: React.FC<DailyChallengeResultsProps> = ({
  result,
  streak,
  streakMilestone,
  words,
  longestWord,
  countdown,
  isNewCompletion,
  onBack,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const { profile, isAuthenticated } = useAuth();

  // Get guest fingerprint and player info on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    // Get guest player info for display in leaderboard
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

  // Submit result to backend when completing a new challenge
  useEffect(() => {
    // For authenticated users, wait for profile. For guests, proceed without waiting for guestPlayer
    // We can use fallback values if guestPlayer hasn't loaded yet
    const canSubmit = isNewCompletion && result && guestFingerprint && (isAuthenticated ? !!profile : true);

    if (canSubmit) {
      const submitResult = async () => {
        try {
          // Get player display info with fallbacks for guests
          const displayName = isAuthenticated && profile
            ? profile.display_name || profile.username
            : guestPlayer?.displayName || 'Guest Player';
          const avatarEmoji = isAuthenticated && profile
            ? profile.avatar_emoji
            : guestPlayer?.avatarEmoji || '🎯';
          const avatarColor = isAuthenticated && profile
            ? profile.avatar_color
            : guestPlayer?.avatarColor || '#6366f1';

          const response = await fetch('/api/daily-challenge/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleDate: result.puzzleDate,
              puzzleNumber: result.puzzleNumber,
              language: result.language,
              playerId: isAuthenticated && profile ? profile.id : null,
              guestFingerprint: !isAuthenticated ? guestFingerprint : null,
              displayName,
              avatarEmoji,
              avatarColor,
              score: result.score,
              wordCount: result.wordCount,
              wordsByLength: result.wordsByLength,
              timeSeconds: result.timeSeconds,
              longestWord,
            }),
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to submit daily result:', errorText);
            console.error('Submission details:', {
              puzzleDate: result.puzzleDate,
              language: result.language,
              isAuthenticated,
              hasProfile: !!profile,
              hasGuestFingerprint: !!guestFingerprint,
              displayName,
            });
            return; // Don't refresh leaderboard if submission failed
          }

          const responseData = await response.json();
          console.log('Daily challenge submitted successfully:', responseData);

          // Refresh the leaderboard after successful submission
          setLeaderboardKey(prev => prev + 1);
        } catch (err) {
          console.error('Failed to submit daily result:', err);
        }
      };
      submitResult();
    }
  }, [isNewCompletion, result, guestFingerprint, longestWord, isAuthenticated, profile, guestPlayer]);

  // Fire confetti on new completion
  useEffect(() => {
    if (isNewCompletion && result.score > 0) {
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFE135', '#FF6B35', '#00D9FF'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFE135', '#FF6B35', '#00D9FF'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Extra burst for streak milestones
      if (streakMilestone) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FF6B35', '#FFE135', '#FF1493'],
          });
        }, 500);
      }
    }
  }, [isNewCompletion, result.score, streakMilestone]);

  // Generate shareable text
  const shareText = generateShareableResult(result);

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
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\nCan you beat my score?')}`;
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
          text: shareText + '\n\nCan you beat my score?',
        });
      } catch (err) {
        // User cancelled or error
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareText]);

  return (
    <motion.div
      key="results"
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
          <ArrowLeft className="w-4 h-4 mr-2" />
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
          {isNewCompletion ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neo-lime to-neo-cyan rounded-neo border-3 border-neo-black shadow-hard">
              <Trophy className="w-5 h-5 text-neo-black" />
              <span className="font-black text-neo-black uppercase">
                {t('daily.completed')}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-neo border-3 border-neo-black dark:border-gray-600">
              <Target className="w-5 h-5" />
              <span className="font-black uppercase">
                {t('daily.alreadyPlayed')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Puzzle number and score */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300 uppercase font-bold">
            {t('daily.puzzleNumber').replace('{number}', String(result.puzzleNumber))}
          </div>
          <div className="text-6xl md:text-7xl font-black text-neo-yellow mt-2">
            {result.score}
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            {t('common.points')}
          </div>
        </motion.div>

        {/* Streak milestone celebration */}
        {streakMilestone && isNewCompletion && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-block px-6 py-3 bg-gradient-to-r from-neo-orange to-neo-pink rounded-neo border-3 border-neo-black shadow-hard"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-white animate-pulse" />
              <span className="font-black text-white text-lg">
                {t('daily.streakDays').replace('{count}', String(streakMilestone))}
              </span>
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* Stats grid */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-white text-neo-black dark:bg-neo-navy-light dark:text-white rounded-neo border-3 border-neo-black dark:border-white/20 p-3 shadow-hard-sm">
            <BookOpen className="w-5 h-5 mx-auto mb-1 text-cyan-600 dark:text-neo-cyan" />
            <div className="text-xl font-black text-neo-black dark:text-white">
              {result.wordCount}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {t('common.words')}
            </div>
          </div>

          <div className="bg-white text-neo-black dark:bg-neo-navy-light dark:text-white rounded-neo border-3 border-neo-black dark:border-white/20 p-3 shadow-hard-sm">
            <Flame className="w-5 h-5 mx-auto mb-1 text-neo-orange" />
            <div className="text-xl font-black text-neo-black dark:text-white">
              {streak?.currentStreak ?? 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {t('daily.streak')}
            </div>
          </div>

          <div className="bg-white text-neo-black dark:bg-neo-navy-light dark:text-white rounded-neo border-3 border-neo-black dark:border-white/20 p-3 shadow-hard-sm">
            <Clock className="w-5 h-5 mx-auto mb-1 text-neo-purple" />
            <div className="text-xl font-black text-neo-black dark:text-white">
              {Math.floor(result.timeSeconds / 60)}<span className="text-sm font-bold text-gray-500">m</span> {(result.timeSeconds % 60).toString().padStart(2, '0')}<span className="text-sm font-bold text-gray-500">s</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {t('results.time')}
            </div>
          </div>
        </motion.div>

        {/* Shareable result preview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
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
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {/* Main share button */}
          <Button
            onClick={handleNativeShare}
            className="w-full py-4 text-lg font-black uppercase bg-gradient-to-r from-neo-yellow to-neo-orange text-neo-black border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
          >
            <Share2 className="mr-2 w-5 h-5" />
            {t('daily.shareScore')}
          </Button>

          {/* Platform-specific buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleWhatsApp}
              aria-label="Share on WhatsApp"
              className="py-3 min-h-[44px] bg-[#25D366] text-black border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all focus:ring-2 focus:ring-neo-yellow focus:ring-offset-2"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleTwitter}
              aria-label="Share on X (Twitter)"
              className="py-3 min-h-[44px] bg-black text-white border-3 border-gray-700 rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2"
            >
              <XTwitterIcon className="w-5 h-5" />
            </Button>

            <Button
              onClick={handleCopy}
              aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
              className="py-3 min-h-[44px] bg-gray-600 text-white border-3 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2"
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
        </motion.div>

        {/* Words found (if available) */}
        {words.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-left"
          >
            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase mb-2">
              {t('common.wordsFound')} ({words.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 text-xs font-bold rounded border-2 border-neo-black ${
                    word === longestWord
                      ? 'bg-neo-yellow text-neo-black'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {word}
                </span>
              ))}
            </div>
          </motion.div>
        )}

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
        </motion.div>

        {/* Today's Players Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6"
        >
          <DailyLeaderboard
            key={leaderboardKey}
            puzzleDate={result.puzzleDate}
            language={result.language}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            maxVisible={10}
            t={t}
          />
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
              <h3 className="text-xl font-black mb-4">{t('daily.shareScore')}</h3>

              <div className="space-y-3">
                <Button
                  onClick={handleWhatsApp}
                  className="w-full py-3 bg-[#25D366] text-black border-3 border-neo-black rounded-neo"
                >
                  <MessageCircle className="mr-2 w-5 h-5" />
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
    </motion.div>
  );
};

export default DailyChallengeResults;
