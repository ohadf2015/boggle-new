/**
 * Share Handlers Hook
 * Handles sharing results to various platforms
 */

import { useState, useCallback, useMemo } from 'react';
import {
  generateWordHuntShareableResult,
  type WordHuntResult,
  type GuestDailyPlayer,
} from '@/utils/dailyChallenge';
// dailyShareImage (620 LOC + canvas rendering) is dynamically imported inside the
// share handler so it stays out of the results-screen chunk — it only runs on share-tap.
import type { Language } from '@/types';
import type { WordHuntStats } from './types';

interface UseShareHandlersProps {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  displayName: string;
  avatarEmoji: string;
  stats: WordHuntStats | null;
  isAuthenticated: boolean;
  profile: { display_name?: string | null; username?: string; avatar_emoji?: string | null; avatar_image?: string | null } | null;
  guestPlayer: GuestDailyPlayer | null;
  t: (key: string) => string;
}

export function useShareHandlers({
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
}: UseShareHandlersProps) {
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Build share URL with OG parameters for rich previews
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

  // Build OG image URL for preview
  const ogImageUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';
    const params = new URLSearchParams({
      solved: String(result.solved),
      attempts: String(result.attemptsUsed),
      puzzleNumber: String(puzzleNumber),
      displayName,
      avatarEmoji,
      locale: language,
    });
    // Add custom avatar image if available (authenticated users)
    if (isAuthenticated && profile?.avatar_image) {
      params.set('avatarImage', profile.avatar_image);
    }
    return `${origin}/api/og/word-hunt?${params.toString()}`;
  }, [result.solved, result.attemptsUsed, puzzleNumber, displayName, avatarEmoji, language, isAuthenticated, profile?.avatar_image]);

  // Generate shareable text
  const shareText = useMemo(() => {
    return generateWordHuntShareableResult(
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
  }, [result, puzzleNumber, puzzleDate, language, t]);

  // Combine share text with URL
  const shareTextWithUrl = useMemo(() => {
    return `${shareText}\n${shareUrl}`;
  }, [shareText, shareUrl]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareTextWithUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      console.error('Failed to copy:', err);
    }
  }, [shareTextWithUrl]);

  // Handle share to WhatsApp
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

  // Handle share to LinkedIn
  const handleLinkedIn = useCallback(() => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  }, [shareUrl]);

  // Handle share to Facebook
  const handleFacebook = useCallback(() => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  }, [shareText, shareUrl]);

  // Handle share via Email
  const handleEmail = useCallback(() => {
    const subject = `LexiClash Word Hunt #${puzzleNumber}`;
    const body = shareTextWithUrl;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }, [puzzleNumber, shareTextWithUrl]);

  // Handle share via SMS
  const handleSMS = useCallback(() => {
    const url = `sms:?body=${encodeURIComponent(shareTextWithUrl)}`;
    window.location.href = url;
  }, [shareTextWithUrl]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareTextWithUrl,
        });
      } catch (err) {
        // AbortError means user cancelled the share dialog - this is normal behavior
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error('Share failed:', err);
      }
    } else {
      setShowSharePanel(true);
    }
  }, [shareTextWithUrl]);

  // Build challenge URL with gauntlet params so recipients see the challenger's score
  const challengeUrl = useMemo(() => {
    const origin = typeof window !== 'undefined'
      ? window.location.origin
      : 'https://www.lexiclash.live';
    const score = result.efficiencyScore ?? 0;
    const params = new URLSearchParams({
      whChallenger: displayName,
      whChallengeScore: String(score),
      whChallengeEmoji: avatarEmoji,
      whChallengeDate: puzzleDate,
    });
    return `${origin}/${language}/daily?${params.toString()}`;
  }, [displayName, avatarEmoji, puzzleDate, language, result.efficiencyScore]);

  // Handle challenge (gauntlet) share via native share or panel fallback
  const handleChallengeShare = useCallback(async () => {
    const score = result.efficiencyScore ?? 0;
    const text = t('wordHunt.gauntlet.shareText')
      .replace('{score}', String(score))
      .replace('{name}', displayName);

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: t('wordHunt.title'),
          text,
          url: challengeUrl,
        });
      } catch {
        // User cancelled or share failed — no-op
      }
    } else {
      setShowSharePanel(true);
    }
  }, [challengeUrl, displayName, result.efficiencyScore, t]);

  // Handle download personalized share image
  const handleDownloadShareImage = useCallback(async () => {
    if (isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      const { generateDailyShareImage, downloadDailyShareImage } = await import('@/utils/dailyShareImage');
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
          ? profile.avatar_emoji || undefined
          : guestPlayer?.avatarEmoji,
      });

      downloadDailyShareImage(imageResult, 'wordHunt', puzzleNumber);
    } catch (err) {
      console.error('Failed to generate share image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [isGeneratingImage, stats, puzzleNumber, language, result.solved, result.attemptsUsed, isAuthenticated, profile, guestPlayer]);

  return {
    copied,
    showSharePanel,
    setShowSharePanel,
    isGeneratingImage,
    shareUrl,
    ogImageUrl,
    shareText,
    shareTextWithUrl,
    handleCopy,
    handleWhatsApp,
    handleTwitter,
    handleTelegram,
    handleLinkedIn,
    handleFacebook,
    handleEmail,
    handleSMS,
    handleNativeShare,
    handleDownloadShareImage,
    challengeUrl,
    handleChallengeShare,
  };
}
