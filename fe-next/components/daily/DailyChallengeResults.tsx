'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trophy, Flame, Target, BookOpen, ArrowLeft, Copy, Check, Image as ImageIcon, ImageDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { Loader } from '@/components/ui/Loader';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';

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
import NextStepPrompt from '@/components/results/NextStepPrompt';
import { hasPlayedToday } from '@/utils/dailyChallenge/storage';
import { LANGUAGE_OPTIONS } from './results/constants';
import type { Language } from '@/types';
import { fireConfetti } from '@/utils/confettiUtils';
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
import {
  shareImageWithNativeShare,
  type ShareImageResult,
} from '@/utils/shareImageGenerator';
import {
  generateDailyShareImage,
  downloadDailyShareImage,
} from '@/utils/dailyShareImage';

interface DailyChallengeResultsProps {
  result: DailyChallengeResult;
  streak: DailyStreak | null;
  streakMilestone: number | null;
  words: string[];
  longestWord: string;
  countdown: string;
  isNewCompletion: boolean;
  onBack: () => void;
  onGameLanguageChange?: (lang: Language) => void;
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
  onGameLanguageChange,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [guestFingerprint, setGuestFingerprint] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<GuestDailyPlayer | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [shareImage, setShareImage] = useState<ShareImageResult | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const { profile, isAuthenticated } = useAuth();

  // Get languages that haven't been played today
  const availableLanguages = useMemo(() =>
    LANGUAGE_OPTIONS.filter(
      (option) => option.code !== result.language && !hasPlayedToday(option.code as Language)
    ),
    [result.language]
  );

  // Performance optimization for low-end devices
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipConfetti = useMemo(() => isLowEnd || !enableComplexAnimations, [isLowEnd, enableComplexAnimations]);

  // Fire confetti burst for a specific rank (top 3 celebration) - skip on low-end devices
  const fireRankConfettiLocal = useCallback((rank: number): void => {
    if (skipConfetti) return;

    // Confetti colors for each rank (matching Top3Leaderboard)
    const RANK_CONFETTI_COLORS: Record<number, string[]> = {
      1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
      2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
      3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
    };

    const count = Math.floor(60 * (1.2 - rank * 0.15)); // Reduced: 1st = 60, 2nd = 51, 3rd = 42
    const colors = RANK_CONFETTI_COLORS[rank] || RANK_CONFETTI_COLORS[1];

    const defaults = {
      origin: { y: 0.6 },
      colors,
    };

    fireConfetti({
      ...defaults,
      particleCount: Math.floor(count * 0.35),
      spread: 26,
      startVelocity: 55,
    });
    fireConfetti({
      ...defaults,
      particleCount: Math.floor(count * 0.25),
      spread: 60,
    });
    fireConfetti({
      ...defaults,
      particleCount: Math.floor(count * 0.4),
      spread: 100,
      decay: 0.91,
      scalar: 0.9,
    });
  }, [skipConfetti]);

  // Handle rank change from leaderboard and fire top 3 confetti
  const handleCurrentUserRankChange = useCallback((rank: number | null) => {
    setCurrentUserRank(rank);
    // Fire rank-specific confetti for top 3 on new completion
    if (isNewCompletion && rank !== null && rank <= 3) {
      // Delay to let initial confetti finish
      setTimeout(() => fireRankConfettiLocal(rank), 2500);
    }
  }, [isNewCompletion, fireRankConfettiLocal]);

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
    // For authenticated users: only need profile (NOT guestFingerprint)
    // For guests: need guestFingerprint (but not guestPlayer - we use fallback values)
    // BUG FIX: Previously required guestFingerprint for ALL users, blocking authenticated submissions
    const canSubmit = isNewCompletion && result && (
      isAuthenticated
        ? !!profile  // Authenticated: just need profile
        : !!guestFingerprint  // Guest: need fingerprint
    );

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
          const avatarImage = isAuthenticated && profile
            ? profile.avatar_image
            : undefined;
          const profilePictureUrl = isAuthenticated && profile
            ? profile.profile_picture_url
            : undefined;

          // Fetch country code from geolocation API (works for all languages)
          let countryCode: string | null = null;
          try {
            const geoResponse = await fetch('/api/geolocation');
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              countryCode = geoData.countryCode || null;
            }
          } catch (geoError) {
            console.warn('Failed to fetch country code:', geoError);
            // Continue without country code - it's optional
          }

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
              avatarImage,
              profilePictureUrl,
              countryCode,
              score: Math.round(result.score),
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
          // BUG-007: Wrap debug logs in dev check
          if (process.env.NODE_ENV === 'development') {
            console.log('Daily challenge submitted successfully:', responseData);
          }

          // Refresh the leaderboard after successful submission
          setLeaderboardKey(prev => prev + 1);
        } catch (err) {
          console.error('Failed to submit daily result:', err);
        }
      };
      submitResult();
    }
  }, [isNewCompletion, result, guestFingerprint, longestWord, isAuthenticated, profile, guestPlayer]);

  // Fire confetti on new completion - skip on low-end devices
  useEffect(() => {
    if (skipConfetti || !isNewCompletion || result.score <= 0) return;

    const duration = 1500; // Reduced from 2000 for better performance
    const end = Date.now() + duration;

    const frame = () => {
      fireConfetti({
        particleCount: 2, // Reduced from 3
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFE135', '#FF6B35', '#00D9FF'],
      });
      fireConfetti({
        particleCount: 2, // Reduced from 3
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

    // Extra burst for streak milestones (reduced particle count)
    if (streakMilestone) {
      setTimeout(() => {
        fireConfetti({
          particleCount: 60, // Reduced from 100
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#FF6B35', '#FFE135', '#FF1493'],
        });
      }, 500);
    }
  }, [isNewCompletion, result.score, streakMilestone, skipConfetti]);

  // Generate shareable text with translations
  const shareText = generateShareableResult(result, undefined, t);

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
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n\n' + t('daily.canYouBeatMyScore'))}`;
    window.open(url, '_blank');
  }, [shareText, t]);

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
          text: shareText + '\n\n' + t('daily.canYouBeatMyScore'),
        });
      } catch (err) {
        // User cancelled or error
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareText, t]);

  // Generate personalized share image with funny sentences
  const handleGenerateImage = useCallback(async () => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      const imageResult = await generateDailyShareImage({
        gameType: 'puzzle',
        rank: currentUserRank,
        totalPlayers,
        puzzleNumber: result.puzzleNumber,
        language: result.language,
        score: Math.round(result.score),
        wordCount: result.wordCount,
        displayName: isAuthenticated && profile
          ? profile.display_name || profile.username
          : guestPlayer?.displayName,
        avatarEmoji: isAuthenticated && profile
          ? profile.avatar_emoji
          : guestPlayer?.avatarEmoji,
        avatarImage: isAuthenticated && profile
          ? profile.avatar_image
          : undefined,
      });
      setShareImage(imageResult);
      setShowImagePreview(true);
    } catch (err) {
      console.error('Failed to generate share image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [result, currentUserRank, totalPlayers, isAuthenticated, profile, guestPlayer, isGeneratingImage]);

  // Share image via native share
  const handleShareImage = useCallback(async () => {
    if (!shareImage) {
      await handleGenerateImage();
      return;
    }

    const success = await shareImageWithNativeShare(
      shareImage,
      shareText + '\n\n' + t('daily.canYouBeatMyScore')
    );

    if (!success) {
      // Fallback: show image preview for manual download/share
      setShowImagePreview(true);
    }
  }, [shareImage, shareText, handleGenerateImage, t]);

  // Download share image
  const handleDownloadImage = useCallback(() => {
    if (shareImage) {
      downloadDailyShareImage(shareImage, 'puzzle', result.puzzleNumber);
    }
  }, [shareImage, result.puzzleNumber]);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 min-h-0 flex flex-col items-center justify-start p-4 page-content-safe overflow-y-auto overscroll-contain scrollable-area"
    >
      {/* Back button */}
      <motion.div className="absolute top-24 sm:top-28 start-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Main content - Cleaner design */}
      <div className="max-w-md w-full text-center space-y-5 py-6">

        {/* Completion badge - Simplified */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          {isNewCompletion ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neo-cyan/20 rounded-full border border-neo-cyan/40">
              <Trophy className="w-4 h-4 text-neo-cyan" />
              <span className="font-bold text-neo-cyan text-sm uppercase tracking-wide">
                {t('daily.completed')}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-700/50 rounded-full border border-slate-600">
              <Target className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-400 text-sm uppercase tracking-wide">
                {t('daily.alreadyPlayed')}
              </span>
            </div>
          )}
        </motion.div>

        {/* Score - Clear focal point */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => result.score > 0 && fireRankConfettiLocal(currentUserRank && currentUserRank <= 3 ? currentUserRank : 1)}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] py-2 relative"
        >
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            {t('daily.puzzleNumber').replace('{number}', String(result.puzzleNumber))}
          </div>
          <div className="text-7xl md:text-8xl font-black text-neo-lime drop-shadow-[0_0_20px_rgba(255,225,53,0.3)] my-1">
            {Math.round(result.score)}
          </div>
          <div className="text-slate-400 text-sm font-medium">
            {t('common.points')}
          </div>

          {/* Trophy mascot for top 3 finishers */}
          {currentUserRank !== null && currentUserRank <= 3 && isNewCompletion && (
            <div className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 pointer-events-none">
              <CelebrationMascotWithEntrance
                variant="trophy"
                size="sm"
                delay={0.5}
                className="drop-shadow-lg"
              />
            </div>
          )}
        </motion.div>

        {/* Streak milestone - Simplified */}
        {streakMilestone && isNewCompletion && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/40"
          >
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="font-black text-amber-400">
              {t('daily.streakDays').replace('{count}', String(streakMilestone))}
            </span>
          </motion.div>
        )}

        {/* Stats - Unified row design */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3"
        >
          <div className="flex items-center justify-around">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">{result.wordCount}</div>
              <div className="text-xs text-slate-400 font-medium">{t('common.words')}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-black text-white">{streak?.currentStreak ?? 0}</span>
              </div>
              <div className="text-xs text-slate-400 font-medium">{t('daily.streak')}</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">
                {Math.floor((result.timeSeconds ?? 0) / 60)}:{((result.timeSeconds ?? 0) % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-400 font-medium">{t('results.time')}</div>
            </div>
          </div>
        </motion.div>

        {/* Share Section - Streamlined */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {/* Primary CTA */}
          <Button
            onClick={handleNativeShare}
            className="w-full max-w-btn py-4 text-base font-black uppercase bg-neo-cyan text-neo-black border-3 border-neo-black rounded-xl shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all duration-150"
          >
            <Share2 className="me-2 w-5 h-5" />
            {t('daily.shareScore')}
          </Button>

          {/* Secondary share options - Cleaner row */}
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={handleWhatsApp}
              aria-label="Share on WhatsApp"
              size="sm"
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleTwitter}
              aria-label="Share on X"
              size="sm"
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all"
            >
              <XTwitterIcon className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage}
              aria-label={t('daily.shareImage')}
              size="sm"
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <Loader size="sm" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={handleCopy}
              aria-label={copied ? t('common.copied') : t('daily.copyToClipboard')}
              size="sm"
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 rounded-lg transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-neo-cyan" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {copied && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-neo-cyan font-medium"
            >
              {t('daily.copiedToClipboard')}
            </motion.p>
          )}

          {/* Collapsible share preview */}
          <button
            onClick={() => setShowSharePreview(!showSharePreview)}
            className="flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors mx-auto"
          >
            {showSharePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showSharePreview ? t('common.hidePreview') : t('common.showPreview')}
          </button>

          <AnimatePresence>
            {showSharePreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-3 text-left">
                  <pre className="text-white text-xs font-mono whitespace-pre-wrap leading-relaxed">
                    {shareText}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Next Step - Suggest Multiplayer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="pt-4"
        >
          <NextStepPrompt
            currentMode="daily"
            onBackToLobby={onBack}
            variant="mobile"
          />
        </motion.div>

        {/* Try Another Language */}
        {availableLanguages.length > 0 && onGameLanguageChange && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="pt-4 border-t border-slate-700/50"
          >
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">
              {t('wordHunt.results.tryAnotherLanguage')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {availableLanguages.map((option) => (
                <Button
                  key={option.code}
                  onClick={() => onGameLanguageChange(option.code as Language)}
                  size="sm"
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <span className="text-base">{option.flag}</span>
                  <span className="font-medium text-xs">{option.name}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Next puzzle countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="py-3"
        >
          <p className="text-xs text-slate-500">
            {t('daily.nextPuzzleIn')} <span className="font-bold text-neo-cyan">{countdown}</span>
          </p>
        </motion.div>

        {/* Today's Players Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <DailyLeaderboard
            key={leaderboardKey}
            puzzleDate={result.puzzleDate}
            language={result.language}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            onCurrentUserRankChange={handleCurrentUserRankChange}
            onParticipantCountChange={setTotalPlayers}
            maxVisible={10}
            t={t}
            gameType="puzzle"
          />
        </motion.div>

        {/* Words found - Collapsible */}
        {words.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => setShowWords(!showWords)}
              className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors mx-auto py-2"
            >
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">{t('common.wordsFound')} ({words.length})</span>
              {showWords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showWords && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1 justify-center pt-2">
                    {words.map((word, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 text-xs font-medium rounded-md ${
                          word === longestWord
                            ? 'bg-neo-lime/20 text-neo-lime border border-neo-lime/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
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
                  className="w-full py-3 bg-brand-whatsapp text-white border-3 border-neo-black rounded-neo"
                >
                  <WhatsAppIcon className="me-2 w-5 h-5" />
                  WhatsApp
                </Button>

                <Button
                  onClick={handleTwitter}
                  className="w-full py-3 bg-black text-white border-3 border-gray-700 rounded-neo"
                >
                  <XTwitterIcon className="me-2 w-5 h-5" />
                  X / Twitter
                </Button>

                <Button
                  onClick={handleCopy}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white border-3 border-neo-black rounded-neo"
                >
                  {copied ? (
                    <>
                      <Check className="me-2 w-5 h-5 text-neo-lime" />
                      {t('common.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="me-2 w-5 h-5" />
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

      {/* Image preview modal */}
      <AnimatePresence>
        {showImagePreview && shareImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowImagePreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-900 rounded-xl border-2 border-slate-700 p-5 max-w-lg w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-neo-cyan/10 rounded-full border border-neo-cyan/30 mb-2">
                  <ImageIcon className="w-4 h-4 text-neo-cyan" />
                  <span className="text-xs font-bold text-neo-cyan uppercase tracking-wide">
                    {t('daily.shareImage')}
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  {t('daily.shareImageHint')}
                </p>
              </div>

              {/* Image preview - using <img> intentionally for data URL which Next.js Image doesn't optimize */}
              <div className="relative rounded-lg overflow-hidden border border-slate-600 mb-4 bg-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-neo-cyan/5 via-transparent to-neo-pink/5 pointer-events-none" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shareImage.dataUrl}
                  alt={`LexiClash Daily Challenge #${result.puzzleNumber} - Score: ${Math.round(result.score)}`}
                  className="w-full h-auto relative"
                  style={{ maxHeight: '50vh', objectFit: 'contain' }}
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                {/* Primary CTA - Share */}
                <Button
                  onClick={handleShareImage}
                  className="w-full py-3.5 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-lg shadow-hard font-bold text-sm hover:shadow-hard-lg hover:-translate-y-0.5 transition-all"
                >
                  <Share2 className="me-2 w-4 h-4" />
                  {t('daily.shareScore')}
                </Button>

                {/* Secondary - Download */}
                <Button
                  onClick={handleDownloadImage}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-lg font-medium text-sm transition-all"
                >
                  <ImageDown className="me-2 w-4 h-4" />
                  {t('daily.download')}
                </Button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setShowImagePreview(false)}
                className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('daily.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyChallengeResults;
