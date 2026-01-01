'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Trophy, Target, X, ArrowLeft, Copy, Check, Send, Coins, RotateCcw, ImageDown, ChevronDown, Settings, Eye, BarChart3, Medal, Timer, Sparkles } from 'lucide-react';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

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
import { fireConfetti } from '@/utils/confettiUtils';
import { cn } from '@/lib/utils';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
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
import DailyChallengeInlineSignup from '@/components/auth/DailyChallengeInlineSignup';
import StreakMilestoneCelebration from './StreakMilestoneCelebration';
import ConfettiRetrigger from '@/components/results/ConfettiRetrigger';
import TabbedDailyLeaderboard from './TabbedDailyLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGeolocation } from '@/contexts/auth/authUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { awardDailyCoins, spendCoins, canAfford, getCoins, COIN_COSTS } from '@/utils/coinManager';
import { syncCoinsToDatabase } from '@/lib/supabase';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import {
  generateDailyShareImage,
  downloadDailyShareImage,
  type ShareImageResult,
} from '@/utils/dailyShareImage';
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
  onRetry: () => void;
  onGameLanguageChange?: (lang: Language) => void;
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
const TryAnotherLanguage: React.FC<{
  currentLanguage: Language;
  onGameLanguageChange?: (lang: Language) => void;
}> = ({ currentLanguage, onGameLanguageChange }) => {
  const { t } = useLanguage();

  // Get languages that haven't been played today
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    (option) => option.code !== currentLanguage && !hasPlayedWordHuntToday(option.code)
  );

  // If no other languages available, don't show this section
  if (availableLanguages.length === 0) {
    return null;
  }

  const handleLanguageClick = (langCode: Language) => {
    // Use the callback to change game language without navigating
    if (onGameLanguageChange) {
      onGameLanguageChange(langCode);
    }
  };

  return (
    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-2 flex items-center gap-1.5">
        🌍 {t('wordHunt.results.tryAnotherLanguage')}
      </h3>
      <div className="flex flex-wrap justify-center gap-2">
        {availableLanguages.map((option) => (
          <Button
            key={option.code}
            onClick={() => handleLanguageClick(option.code)}
            className="px-3 py-2 bg-slate-600 text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <span className="text-base">{option.flag}</span>
            <span className="font-bold text-xs">{option.name}</span>
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
        {t('wordHunt.results.playDifferentLanguage')}
      </p>
    </div>
  );
};

/**
 * DailyWordHuntResults - Results screen for Word Hunt with Wordle-style sharing
 */
// Confetti colors for each rank (matching Top3Leaderboard)
const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
};

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
  const [showFullShareText, setShowFullShareText] = useState(false);
  const [showSharePlatforms, setShowSharePlatforms] = useState(false);
  // Bottom tab navigation for mobile
  type ResultTab = 'results' | 'stats' | 'ranks';
  const [activeTab, setActiveTab] = useState<ResultTab>('results');
  // Legacy expanded states (used in stats tab)
  const [statsExpanded, setStatsExpanded] = useState(true); // Default open in stats tab
  const [attemptsExpanded, setAttemptsExpanded] = useState(true); // Default open in stats tab
  const [secondaryActionsExpanded, setSecondaryActionsExpanded] = useState(false);
  const [shareImage, setShareImage] = useState<ShareImageResult | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryCodeReady, setCountryCodeReady] = useState(false);
  const [inlineSignupDismissed, setInlineSignupDismissed] = useState(false);
  const hasSubmittedRef = useRef(false);
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();

  // Screenshot protection - blur sensitive content when tab/window loses focus
  const { isProtected } = useScreenshotProtection();

  // Check for streak milestone
  const streakMilestone = getStreakMilestone(result.streakDays);
  const milestoneMessage = streakMilestone ? getStreakMilestoneMessage(result.streakDays) : null;

  // Find rarest word discovered
  const rarestWord = result.wordsDiscovered ? findRarestWord(result.wordsDiscovered, language) : null;

  // Calculate survival bonus time (extra seconds survived beyond base 100 seconds)
  // Each life point gained = 1 extra second of survival time
  const survivalBonusTime = useMemo(() => {
    if (!result.wordsDiscovered || result.wordsDiscovered.length === 0) return 0;
    return result.wordsDiscovered.reduce((total, word) => total + (word.lifeGained || 0), 0);
  }, [result.wordsDiscovered]);

  // Get encouraging message based on survival bonus performance
  const getSurvivalBonusMessage = (bonusSeconds: number): { emoji: string; tier: string } => {
    if (bonusSeconds >= 120) return { emoji: '🏆', tier: 'legendary' };
    if (bonusSeconds >= 60) return { emoji: '⭐', tier: 'excellent' };
    if (bonusSeconds >= 30) return { emoji: '💪', tier: 'good' };
    if (bonusSeconds >= 10) return { emoji: '👍', tier: 'nice' };
    return { emoji: '🌱', tier: 'start' };
  };

  // Get guest fingerprint and player info on mount
  useEffect(() => {
    getGuestFingerprint().then(setGuestFingerprint);
    if (!isAuthenticated) {
      getGuestDailyPlayer().then(setGuestPlayer);
    }
  }, [isAuthenticated]);

  // Fetch country code on mount for leaderboard display
  useEffect(() => {
    // For authenticated users, use profile country_code if available
    if (isAuthenticated && profile?.country_code) {
      setCountryCode(profile.country_code);
      setCountryCodeReady(true);
      return;
    }

    // Fetch from geolocation API for guests or users without country_code
    fetchGeolocation()
      .then((geo) => {
        setCountryCode(geo.countryCode || null);
        setCountryCodeReady(true);
      })
      .catch(() => {
        setCountryCodeReady(true); // Mark ready even on failure
      });

    // Timeout fallback - don't block submission forever if geolocation is slow
    const timeout = setTimeout(() => setCountryCodeReady(true), 2000);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, profile?.country_code]);

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
    // Wait for country code to be fetched (with timeout fallback)
    const canSubmit = isNewCompletion && result && guestFingerprint && countryCodeReady && (isAuthenticated ? !!profile : true);

    // Debug logging for submission conditions
    console.log('[WordHunt Submit Check]', {
      isNewCompletion,
      hasResult: !!result,
      guestFingerprint: guestFingerprint ? guestFingerprint.substring(0, 8) + '...' : 'null',
      countryCodeReady,
      isAuthenticated,
      hasProfile: !!profile,
      canSubmit,
      alreadySubmitted: hasSubmittedRef.current,
    });

    // Prevent double submission
    if (canSubmit && !hasSubmittedRef.current) {
      hasSubmittedRef.current = true;
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

          const bodyData: Record<string, unknown> = {
            puzzleDate,
            puzzleNumber,
            language,
            playerId: isAuthenticated && profile ? profile.id : null,
            guestFingerprint: !isAuthenticated ? guestFingerprint : null,
            displayName,
            avatarEmoji,
            avatarColor,
            countryCode: countryCode || null,
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
            countryCode: bodyData.countryCode,
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
  }, [isNewCompletion, result, guestFingerprint, puzzleDate, puzzleNumber, language, isAuthenticated, profile, guestPlayer, countryCode, countryCodeReady, fetchStats]);

  // Fire confetti on victory
  useEffect(() => {
    if (isNewCompletion && result.solved) {
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        fireConfetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10B981', '#FFE135', '#00D9FF'],
        });
        fireConfetti({
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
          fireConfetti({
            particleCount: 150,
            spread: 120,
            origin: { y: 0.6 },
            colors: ['#10B981', '#FFE135', '#FF1493'],
          });
        }, 500);
      }
    }
  }, [isNewCompletion, result.solved, result.attemptsUsed]);

  // Fire confetti burst for a specific rank (top 3 celebration)
  const fireRankConfettiLocal = useCallback((rank: number): void => {
    const count = Math.floor(100 * (1.2 - rank * 0.15)); // 1st = 100, 2nd = 85, 3rd = 70
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
  }, []);

  // Fire top 3 celebration confetti when stats load and player is in top 3
  useEffect(() => {
    if (isNewCompletion && stats?.yourStats?.solved && stats.yourStats.rank !== undefined && stats.yourStats.rank <= 3) {
      // Delay to let initial confetti finish, then fire rank-specific celebration
      const timer = setTimeout(() => {
        fireRankConfettiLocal(stats.yourStats!.rank!);
      }, 2800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isNewCompletion, stats?.yourStats, fireRankConfettiLocal]);

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

        // Sync coins to database for authenticated users
        if (user?.id && reward.awarded > 0) {
          syncCoinsToDatabase(
            user.id,
            reward.awarded,
            'Daily Challenge',
            {
              puzzleDate,
              language,
              solved: result.solved ? 1 : 0,
              efficiencyScore: result.efficiencyScore || 0,
              streakDays: result.streakDays || 0
            }
          );
        }
      }
    }
  }, [isNewCompletion, puzzleDate, language, result.solved, result.efficiencyScore, result.streakDays, user?.id]);

  // Show signup modal for unauthenticated users who FAILED (winners get inline signup instead)
  useEffect(() => {
    // Only show modal for guests who failed - winners get inline signup on page
    // Also skip if user has a session (profile may still be loading) or auth is still loading
    if (!isNewCompletion || isAuthenticated || user || authLoading || result.solved) {
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
  }, [isNewCompletion, isAuthenticated, user, authLoading, result, stats?.yourStats?.percentile]);

  // Handle signup modal dismiss
  const handleSignupModalClose = useCallback(() => {
    setShowSignupModal(false);
    recordSignupModalDismissed();
  }, []);

  // Get display info for sharing
  const displayName = isAuthenticated && profile
    ? profile.display_name || profile.username || 'Player'
    : guestPlayer?.displayName || 'Player';
  const avatarEmoji = isAuthenticated && profile
    ? profile.avatar_emoji || '🎯'
    : guestPlayer?.avatarEmoji || '🎯';

  // Build share URL with OG parameters for rich previews on WhatsApp/social
  // Using simple query params for better WhatsApp compatibility
  const shareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';
    const params = new URLSearchParams({
      whSolved: String(result.solved),
      whAttempts: String(result.attemptsUsed),
      whPuzzle: String(puzzleNumber),
      whName: displayName,
      whEmoji: avatarEmoji,
    });
    return `${origin}/${language}/daily?${params.toString()}`;
  }, [result.solved, result.attemptsUsed, puzzleNumber, displayName, avatarEmoji, language]);

  // Generate shareable text (use streak from result, which is now properly tracked)
  // Pass the translation function so the share message is in the current language
  const shareText = generateWordHuntShareableResult(
    {
      ...result,
      puzzleNumber,
      puzzleDate,
      language,
      streakDays: result.streakDays || 0,
      completedAt: result.completedAt || new Date().toISOString(),
    },
    t
  );

  // Combine share text with share URL for rich previews
  const shareTextWithUrl = useMemo(() => {
    // Simply append the URL to the share text (URL is no longer included in shareText)
    return `${shareText}\n${shareUrl}`;
  }, [shareText, shareUrl]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareTextWithUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareTextWithUrl]);

  // Handle share to WhatsApp - includes OG-enabled URL for rich preview
  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareTextWithUrl)}`;
    window.open(url, '_blank');
  }, [shareTextWithUrl]);

  // Handle share to Twitter/X
  const handleTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextWithUrl)}`;
    window.open(url, '_blank');
  }, [shareTextWithUrl]);

  // Handle share to Telegram
  const handleTelegram = useCallback(() => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText, shareUrl]);

  // Handle native share - URL is included in text to avoid duplication
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareTextWithUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareTextWithUrl]);

  // Handle download personalized share image
  const handleDownloadShareImage = useCallback(async () => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      const imageResult = await generateDailyShareImage({
        gameType: 'wordHunt',
        rank: stats?.yourStats?.rank || null,
        totalPlayers: stats?.totalPlayers || 0,
        puzzleNumber,
        language,
        solved: result.solved,
        attemptsUsed: result.attemptsUsed,
        displayName: isAuthenticated && profile
          ? profile.display_name || profile.username
          : guestPlayer?.displayName,
        avatarEmoji: isAuthenticated && profile
          ? profile.avatar_emoji
          : guestPlayer?.avatarEmoji,
      });

      setShareImage(imageResult);
      downloadDailyShareImage(imageResult, 'wordHunt', puzzleNumber);
    } catch (err) {
      console.error('Failed to generate share image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [isGeneratingImage, stats, puzzleNumber, language, result.solved, result.attemptsUsed, isAuthenticated, profile, guestPlayer]);

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

  // Handle retry challenge (costs coins)
  const handleRetryChallenge = useCallback(() => {
    const cost = COIN_COSTS.DAILY_RETRY;
    if (!canAfford(cost)) {
      return; // Not enough coins
    }

    const spent = spendCoins(cost, 'Daily Challenge Retry', {
      puzzleDate,
      language,
      puzzleNumber: String(puzzleNumber),
    });

    if (spent) {
      setCurrentCoins(getCoins());
      onRetry();
    }
  }, [puzzleDate, language, puzzleNumber, onRetry]);

  return (
    <motion.div
      key="word-hunt-results"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      {/* Fixed Header - Compact score summary */}
      <div className="flex-shrink-0 px-3 pt-1 pb-2 border-b border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-neo-navy">
        <div className="max-w-md mx-auto">
          {/* Back + Score row */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white -ms-2 py-1"
            >
              <ArrowLeft className="w-4 h-4 me-1 rtl:rotate-180" />
              {t('daily.home')}
            </Button>

            {/* Compact score display */}
            <div className="flex items-center gap-2">
              {result.solved ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-neo border-2 border-neo-black">
                  <Trophy className="w-4 h-4 text-white" />
                  <span className="font-black text-white text-sm">{result.attemptsUsed}/10</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500 rounded-neo border-2 border-neo-black">
                  <X className="w-4 h-4 text-white" />
                  <span className="font-black text-white text-sm">X/10</span>
                </div>
              )}
              {result.solved && (
                <span className="font-black text-neo-yellow text-sm">
                  {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
                </span>
              )}
              {result.streakDays > 0 && (
                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">
                  🔥{result.streakDays}
                </span>
              )}
              {result.solved && (
                <ConfettiRetrigger
                  variant={stats?.yourStats?.rank && stats.yourStats.rank <= 3 ? 'rank' : 'victory'}
                  rank={stats?.yourStats?.rank}
                  compact
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Tab Content - with bottom padding for tab bar */}
      <div className="flex-1 overflow-y-auto px-3 pb-20 relative">
        {/* Screenshot protection overlay */}
        {isProtected && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40">
            <div className="bg-neo-black/80 text-white px-6 py-4 rounded-neo border-3 border-neo-yellow shadow-hard text-center">
              <div className="text-2xl mb-2">👀</div>
              <div className="font-bold text-sm">
                {t('daily.screenshotProtection') || 'Click here to continue'}
              </div>
            </div>
          </div>
        )}
        <div className={cn(
          "max-w-md mx-auto text-center space-y-3 pt-3 transition-all duration-200",
          isProtected && "blur-xl pointer-events-none select-none"
        )}>

        {/* ===== RESULTS TAB - Full details ===== */}
        {activeTab === 'results' && (
        <>
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
              <div className="text-3xl sm:text-4xl font-black mt-1 text-green-500">
                {result.attemptsUsed}/10
              </div>

              {/* Target word - inline with label */}
              <div className="mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('wordHunt.results.targetWord')}: </span>
                <span className="text-lg sm:text-xl font-black text-neo-yellow">
                  {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
                </span>
              </div>

              {/* Rewards row - compact horizontal layout */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {/* Coins earned */}
                {result.clueTokensEarned !== undefined && result.clueTokensSpent !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-neo border-2 border-neo-black">
                    <span className="text-base">🪙</span>
                    <span className="font-black text-sm">{result.clueTokensEarned - result.clueTokensSpent}</span>
                  </div>
                )}
                {/* Coin reward */}
                {coinReward && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-400 rounded-neo border-2 border-neo-black">
                    <Coins className="w-3.5 h-3.5 text-neo-black" />
                    <span className="font-black text-sm text-neo-black">+{coinReward.awarded}</span>
                    {coinReward.breakdown.streak > 0 && (
                      <span className="text-xs text-neo-black/70">🔥</span>
                    )}
                  </div>
                )}

                {/* Survival Bonus - for winners */}
                {survivalBonusTime > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 rounded-neo border-2 border-neo-black">
                    <Timer className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-black text-sm text-cyan-700 dark:text-cyan-300">+{survivalBonusTime}s</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Failed: Show encouraging message and countdown */
            <div className="mt-4 space-y-4">
              {/* Survival Bonus Achievement - show first for encouragement! */}
              {survivalBonusTime > 0 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="inline-block px-4 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-neo border-3 border-neo-black shadow-hard"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <Timer className="w-5 h-5 text-white" />
                      <span className="text-2xl font-black text-white">
                        +{survivalBonusTime}s
                      </span>
                      <Sparkles className="w-5 h-5 text-neo-yellow" />
                    </div>
                    <span className="text-xs font-bold text-white/90 uppercase">
                      {t('wordHunt.results.survivalBonus')}
                    </span>
                    <span className="text-[10px] text-white/70">
                      {getSurvivalBonusMessage(survivalBonusTime).emoji} {t(`wordHunt.results.survivalTier.${getSurvivalBonusMessage(survivalBonusTime).tier}`)}
                    </span>
                  </div>
                </motion.div>
              )}

              <div className="text-lg text-gray-600 dark:text-gray-300">
                {t('wordHunt.results.betterLuckNextTime')}
              </div>

              {/* Next challenge countdown - prominent for failed players */}
              <div className="inline-block px-6 py-4 bg-slate-600 rounded-neo border-3 border-neo-black shadow-hard">
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
            </div>
          )}

          {/* Streak display */}
          {result.streakDays > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.25 }}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 rounded-neo border-2 border-neo-black shadow-hard-sm"
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
              className="mt-2 inline-flex flex-col items-center gap-0.5 px-3 py-2 bg-indigo-600 rounded-neo border-2 border-neo-black shadow-hard-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{rarestWord.emoji}</span>
                <span className="font-black text-white text-sm uppercase">{rarestWord.label} {t('wordHunt.results.find')}</span>
              </div>
              <span className="font-black text-white text-xl tracking-wider">
                {rarestWord.word.toUpperCase()}
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* Rank badge - Single consolidated badge (percentile shown in stats section) */}
        {stats?.yourStats && stats.yourStats.solved && stats.yourStats.rank !== undefined && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-block px-4 py-2 bg-amber-400 rounded-neo border-2 border-neo-black shadow-hard-sm"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-neo-black" />
              <span className="font-black text-neo-black text-sm">
                {t('wordHunt.results.rankOutOf').replace('{rank}', String(stats.yourStats.rank)).replace('{total}', String(stats.totalPlayers))}
              </span>
            </div>
          </motion.div>
        )}

        {/* Share & Retry Section - Compact */}
        <motion.div
          layout
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {/* Primary actions - Share + Retry side by side */}
          <div className="flex gap-2">
            {/* Share button */}
            <Button
              onClick={handleNativeShare}
              className={cn(
                "flex-1 py-3 text-base font-black uppercase border-2 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all",
                result.solved
                  ? "bg-gradient-to-r from-neo-yellow via-neo-orange to-neo-pink text-neo-black"
                  : "bg-gradient-to-r from-neo-cyan via-neo-purple to-neo-pink text-white"
              )}
            >
              <Share2 className="mr-1.5 w-4 h-4" />
              {t('wordHunt.results.share') || 'Share'}
            </Button>

            {/* Play Again button */}
            <Button
              onClick={handleRetryChallenge}
              disabled={!canAfford(COIN_COSTS.DAILY_RETRY)}
              className={cn(
                "flex-1 py-3 text-base font-black uppercase border-2 border-neo-black rounded-neo shadow-hard transition-all",
                canAfford(COIN_COSTS.DAILY_RETRY)
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-neo-black hover:shadow-hard-lg hover:-translate-y-0.5"
                  : "bg-gray-400 text-gray-600 cursor-not-allowed"
              )}
            >
              <RotateCcw className="mr-1.5 w-4 h-4" />
              <span className="flex items-center gap-1">
                {t('wordHunt.results.retry') || 'Retry'}
                <span className="text-xs opacity-70">({COIN_COSTS.DAILY_RETRY}🪙)</span>
              </span>
            </Button>
          </div>

            {/* Toggle for more share options - Clear labeling */}
            <button
              onClick={() => setShowSharePlatforms(!showSharePlatforms)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-neo-cyan transition-colors group"
            >
              <Share2 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              <span className="underline underline-offset-2 decoration-dotted group-hover:decoration-solid">
                {showSharePlatforms ? t('common.showLess') : t('common.moreShareOptions')}
              </span>
              <motion.div
                animate={{ rotate: showSharePlatforms ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {/* Platform buttons - revealed on demand */}
            <AnimatePresence>
              {showSharePlatforms && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      onClick={handleWhatsApp}
                      className="py-2.5 min-h-[44px] bg-[#25D366] text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span className="text-sm font-bold">WhatsApp</span>
                    </Button>

                    <Button
                      onClick={handleTwitter}
                      className="py-2.5 min-h-[44px] bg-black text-white border-2 border-gray-700 rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <XTwitterIcon className="w-4 h-4" />
                      <span className="text-sm font-bold">X / Twitter</span>
                    </Button>

                    <Button
                      onClick={handleTelegram}
                      className="py-2.5 min-h-[44px] bg-[#0088cc] text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-sm font-bold">Telegram</span>
                    </Button>

                    <Button
                      onClick={handleCopy}
                      className="py-2.5 min-h-[44px] bg-gray-600 text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-neo-lime" />
                          <span className="text-sm font-bold">{t('common.copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm font-bold">{t('daily.copyToClipboard')}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Download image button - full width */}
                  <Button
                    onClick={handleDownloadShareImage}
                    disabled={isGeneratingImage}
                    className="w-full mt-2 py-2 min-h-[44px] bg-neo-purple text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGeneratingImage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ImageDown className="w-4 h-4" />
                        <span className="text-sm font-bold">{t('daily.downloadImage')}</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {copied && !showSharePlatforms && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-neo-lime font-bold"
              >
                {t('daily.copiedToClipboard')}
              </motion.p>
            )}
        </motion.div>

        {/* Reveal Target Word Option - Only for failed players, after share section */}
        {!result.solved && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {targetWordRevealed ? (
              // Show the revealed target word
              <div className="space-y-2 text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('wordHunt.results.theTargetWordWas')}
                </div>
                <div className="text-3xl font-black text-neo-yellow tracking-wider">
                  {language === 'he' ? applyHebrewFinalLetters(result.targetWord) : result.targetWord.toUpperCase()}
                </div>
              </div>
            ) : (
              // Show the reveal button - premium unlock card design
              <div className="max-w-xs mx-auto">
                <motion.div
                  whileHover={canAfford(COIN_COSTS.REVEAL_TARGET_WORD) ? { scale: 1.02, y: -2 } : {}}
                  whileTap={canAfford(COIN_COSTS.REVEAL_TARGET_WORD) ? { scale: 0.98 } : {}}
                  className={cn(
                    "relative overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard transition-all",
                    canAfford(COIN_COSTS.REVEAL_TARGET_WORD)
                      ? "bg-gradient-to-br from-neo-purple to-neo-pink cursor-pointer hover:shadow-hard-lg"
                      : "bg-gradient-to-br from-slate-600 to-slate-700"
                  )}
                  onClick={canAfford(COIN_COSTS.REVEAL_TARGET_WORD) ? handleRevealTargetWord : undefined}
                >
                  {/* Cost badge - top corner */}
                  <div className="absolute top-2 end-2 flex items-center gap-1 px-2.5 py-1 bg-neo-yellow rounded-full border-2 border-neo-black shadow-hard-sm">
                    <Coins className="w-4 h-4 text-neo-black" />
                    <span className="font-black text-sm text-neo-black">{COIN_COSTS.REVEAL_TARGET_WORD}</span>
                  </div>

                  {/* Main content */}
                  <div className="px-4 py-4 pt-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex-shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-2 border-neo-black",
                        canAfford(COIN_COSTS.REVEAL_TARGET_WORD)
                          ? "bg-white/20"
                          : "bg-white/10"
                      )}>
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-start">
                        <div className="font-black text-white text-sm uppercase tracking-wide">
                          {t('wordHunt.results.revealTargetWord')}
                        </div>
                        <div className="text-xs text-white/70 mt-0.5">
                          {t('wordHunt.results.seeTheAnswer') || 'See what you were looking for'}
                        </div>
                      </div>
                    </div>

                    {/* Progress section */}
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-white/80 font-medium">
                          {t('wordHunt.results.yourCoins')}
                        </span>
                        <span className={cn(
                          "font-black",
                          canAfford(COIN_COSTS.REVEAL_TARGET_WORD)
                            ? "text-neo-yellow"
                            : "text-white"
                        )}>
                          {currentCoins} / {COIN_COSTS.REVEAL_TARGET_WORD}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((currentCoins / COIN_COSTS.REVEAL_TARGET_WORD) * 100, 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            canAfford(COIN_COSTS.REVEAL_TARGET_WORD)
                              ? "bg-neo-yellow"
                              : "bg-gradient-to-r from-neo-yellow/70 to-neo-orange/70"
                          )}
                        />
                      </div>
                      {/* Helpful hint when can't afford */}
                      {!canAfford(COIN_COSTS.REVEAL_TARGET_WORD) && (
                        <div className="mt-2 text-[10px] text-white/60 text-center">
                          {t('wordHunt.results.earnMoreHint') || 'Win challenges to earn more coins!'}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* Inline Signup for Guest Winners */}
        {!isAuthenticated && result.solved && !inlineSignupDismissed && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <DailyChallengeInlineSignup
              pendingResult={{
                result,
                puzzleNumber,
                puzzleDate,
                language,
              }}
              onDismiss={() => setInlineSignupDismissed(true)}
            />
          </motion.div>
        )}
        </>
        )}

        {/* ===== STATS TAB ===== */}
        {activeTab === 'stats' && (
        <>
        {/* Attempt history - Collapsible (only show if there are attempts) */}
        {result.attempts.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-neo border-2 border-neo-black overflow-hidden"
        >
          {/* Collapsible header */}
          <button
            onClick={() => setAttemptsExpanded(!attemptsExpanded)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                {t('wordHunt.title')} - {result.attemptsUsed} {t('common.attempts')}
              </span>
            </div>
            <motion.div
              animate={{ rotate: attemptsExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </motion.div>
          </button>

          {/* Collapsible content */}
          <AnimatePresence>
            {attemptsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2.5 space-y-0.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                  {result.attempts.map((attempt, idx) => (
                    <div key={idx} className="flex items-center justify-center gap-1.5">
                      <span className="text-[10px] text-gray-700 dark:text-gray-400 w-5">
                        {idx + 1}.
                      </span>
                      <div className="flex gap-0.5">
                        {attempt.feedback.map((letterFb, letterIdx) => (
                          <div
                            key={letterIdx}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center font-bold text-white rounded border border-neo-black text-sm",
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
            )}
          </AnimatePresence>
        </motion.div>
        )}

        {/* Stats grid - Collapsible */}
        {stats && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-neo border-2 border-neo-black overflow-hidden"
          >
            {/* Collapsible header with summary */}
            <button
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="w-full flex items-center justify-between p-3 bg-white dark:bg-neo-navy-light hover:bg-gray-50 dark:hover:bg-neo-navy transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📊</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  {t('wordHunt.stats.title')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Summary badges shown when collapsed */}
                <div className="flex items-center gap-2 text-xs">
                  {stats.yourStats?.solved && stats.yourStats.percentile !== undefined && (
                    <span className="px-2 py-0.5 bg-neo-purple/20 text-neo-purple dark:text-purple-300 rounded-full font-bold">
                      {t('wordHunt.stats.top')} {stats.yourStats.percentile}%
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-bold">
                    {stats.solveRate}% {t('wordHunt.stats.solved')}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: statsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </motion.div>
              </div>
            </button>

            {/* Collapsible content */}
            <AnimatePresence>
              {statsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-2 bg-white dark:bg-neo-navy-light text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* Stats summary grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                          {stats.totalPlayers}
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">
                          {t('wordHunt.stats.totalPlayers')}
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                        <div className="text-lg font-black text-green-600 dark:text-green-400">
                          {stats.solveRate}%
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">
                          {t('wordHunt.stats.solveRate')}
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                        <div className="text-lg font-black text-purple-600 dark:text-purple-400">
                          {stats.avgAttemptsSolved?.toFixed(1) ?? 'N/A'}
                        </div>
                        <div className="text-[10px] text-gray-600 dark:text-gray-400">
                          {t('wordHunt.stats.avgAttempts')}
                        </div>
                      </div>
                    </div>

                    {/* Attempt distribution histogram */}
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                        📈 {t('wordHunt.stats.distribution')}
                      </div>
                      {[...Array(10)].map((_, i) => {
                        const attemptNum = i + 1;
                        const count = stats.attemptDistribution[attemptNum] || 0;
                        const maxCount = Math.max(...Object.values(stats.attemptDistribution));
                        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        const isYourAttempt = result.solved && result.attemptsUsed === attemptNum;

                        return (
                          <div
                            key={attemptNum}
                            className="flex items-center gap-1.5"
                          >
                            <span className={cn(
                              "text-[10px] font-bold w-4",
                              isYourAttempt ? "text-neo-yellow" : "text-gray-600 dark:text-gray-400"
                            )}>
                              {attemptNum}
                            </span>
                            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-sm overflow-hidden">
                              <div
                                style={{ width: `${percentage}%` }}
                                className={cn(
                                  "h-full flex items-center justify-end px-1 text-[10px] font-bold text-white transition-all duration-300",
                                  isYourAttempt
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                )}
                              >
                                {count > 0 && <span>{count}</span>}
                              </div>
                            </div>
                            {isYourAttempt && (
                              <span className="text-[10px] font-bold text-neo-yellow">{t('common.you').toUpperCase()}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Survival mode stats - show when available */}
                    {(stats.avgLifeRemaining != null || stats.avgEfficiencyScore != null || stats.avgWordsDiscovered != null) && (
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                          {t('wordHunt.results.survivalMetrics')}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          {stats.avgLifeRemaining != null && (
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <div className="text-lg font-black text-red-500">
                                {stats.avgLifeRemaining.toFixed(0)}
                              </div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                {t('wordHunt.results.avgLifeLeft')}
                              </div>
                            </div>
                          )}
                          {stats.avgWordsDiscovered != null && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="text-lg font-black text-blue-500">
                                {stats.avgWordsDiscovered.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                {t('wordHunt.results.avgWordsFound')}
                              </div>
                            </div>
                          )}
                          {stats.avgEfficiencyScore != null && (
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="text-lg font-black text-purple-500">
                                {stats.avgEfficiencyScore.toFixed(0)}
                              </div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                {t('wordHunt.results.avgEfficiency')}
                              </div>
                            </div>
                          )}
                          {stats.maxEfficiencyScore != null && (
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <div className="text-lg font-black text-yellow-500">
                                {stats.maxEfficiencyScore}
                              </div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                {t('wordHunt.results.bestEfficiency')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        </>
        )}

        {/* ===== RANKS TAB ===== */}
        {activeTab === 'ranks' && (
        <>
        {/* Today's Leaderboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <TabbedDailyLeaderboard
            key={leaderboardKey}
            puzzleDate={puzzleDate}
            language={language}
            currentPlayerId={isAuthenticated && profile ? profile.id : null}
            currentGuestFingerprint={!isAuthenticated ? guestFingerprint : null}
            maxVisible={5}
            t={t}
            defaultTab="today"
          />
        </motion.div>

        {/* Secondary Actions - Collapsible */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-neo border-2 border-gray-300 dark:border-gray-600 overflow-hidden"
        >
          {/* Collapsible header */}
          <button
            onClick={() => setSecondaryActionsExpanded(!secondaryActionsExpanded)}
            className="w-full flex items-center justify-between p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                {t('common.moreOptions')}
              </span>
            </div>
            <motion.div
              animate={{ rotate: secondaryActionsExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </motion.div>
          </button>

          {/* Collapsible content */}
          <AnimatePresence>
            {secondaryActionsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white space-y-4">
                  {/* Retry Challenge - premium unlock card design */}
                  <motion.div
                    whileHover={canAfford(COIN_COSTS.DAILY_RETRY) ? { scale: 1.02, y: -2 } : {}}
                    whileTap={canAfford(COIN_COSTS.DAILY_RETRY) ? { scale: 0.98 } : {}}
                    className={cn(
                      "relative overflow-hidden rounded-neo-lg border-3 border-neo-black shadow-hard transition-all",
                      canAfford(COIN_COSTS.DAILY_RETRY)
                        ? "bg-gradient-to-br from-amber-400 to-orange-500 cursor-pointer hover:shadow-hard-lg"
                        : "bg-gradient-to-br from-slate-600 to-slate-700"
                    )}
                    onClick={canAfford(COIN_COSTS.DAILY_RETRY) ? handleRetryChallenge : undefined}
                  >
                    {/* Cost badge - top corner */}
                    <div className="absolute top-2 end-2 flex items-center gap-1 px-2.5 py-1 bg-neo-yellow rounded-full border-2 border-neo-black shadow-hard-sm">
                      <Coins className="w-4 h-4 text-neo-black" />
                      <span className="font-black text-sm text-neo-black">{COIN_COSTS.DAILY_RETRY}</span>
                    </div>

                    {/* Main content */}
                    <div className="px-4 py-4 pt-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex-shrink-0 w-12 h-12 rounded-neo flex items-center justify-center border-2 border-neo-black",
                          canAfford(COIN_COSTS.DAILY_RETRY)
                            ? "bg-white/20"
                            : "bg-white/10"
                        )}>
                          <RotateCcw className={cn(
                            "w-6 h-6",
                            canAfford(COIN_COSTS.DAILY_RETRY) ? "text-neo-black" : "text-white"
                          )} />
                        </div>
                        <div className="flex-1 text-start">
                          <div className={cn(
                            "font-black text-sm uppercase tracking-wide",
                            canAfford(COIN_COSTS.DAILY_RETRY) ? "text-neo-black" : "text-white"
                          )}>
                            {t('wordHunt.results.retryChallenge')}
                          </div>
                          <div className={cn(
                            "text-xs mt-0.5",
                            canAfford(COIN_COSTS.DAILY_RETRY) ? "text-neo-black/70" : "text-white/70"
                          )}>
                            {t('wordHunt.results.retryExplanation')}
                          </div>
                        </div>
                      </div>

                      {/* Progress section */}
                      <div className={cn(
                        "mt-3 pt-3 border-t",
                        canAfford(COIN_COSTS.DAILY_RETRY) ? "border-neo-black/20" : "border-white/20"
                      )}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={cn(
                            "font-medium",
                            canAfford(COIN_COSTS.DAILY_RETRY) ? "text-neo-black/80" : "text-white/80"
                          )}>
                            {t('wordHunt.results.yourCoins')}
                          </span>
                          <span className={cn(
                            "font-black",
                            canAfford(COIN_COSTS.DAILY_RETRY)
                              ? "text-neo-black"
                              : "text-white"
                          )}>
                            {currentCoins} / {COIN_COSTS.DAILY_RETRY}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((currentCoins / COIN_COSTS.DAILY_RETRY) * 100, 100)}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full",
                              canAfford(COIN_COSTS.DAILY_RETRY)
                                ? "bg-neo-black/50"
                                : "bg-gradient-to-r from-neo-yellow/70 to-neo-orange/70"
                            )}
                          />
                        </div>
                        {/* Helpful hint when can't afford */}
                        {!canAfford(COIN_COSTS.DAILY_RETRY) && (
                          <div className="mt-2 text-[10px] text-white/60 text-center">
                            {t('wordHunt.results.earnMoreHint')}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Try Another Language - inline version */}
                  <TryAnotherLanguage currentLanguage={language} onGameLanguageChange={onGameLanguageChange} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </>
        )}
        </div>
      </div>

      {/* Bottom Tab Bar - Fixed (using reusable MobileTabBar component) */}
      <div className="flex-shrink-0 fixed bottom-0 inset-x-0 z-50 bg-neo-navy border-t-4 border-neo-black safe-area-bottom">
        <MobileTabBar
          tabs={[
            { id: 'results', icon: <Share2 className="w-5 h-5" />, label: t('wordHunt.results.share') || 'Share' },
            { id: 'stats', icon: <BarChart3 className="w-5 h-5" />, label: t('wordHunt.stats.title') || 'Stats' },
            { id: 'ranks', icon: <Medal className="w-5 h-5" />, label: t('daily.leaderboard') || 'Ranks' },
          ]}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ResultTab)}
        />
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
