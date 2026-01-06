/**
 * Share Handlers Hook
 * Handles sharing results to various platforms
 */

import { useState, useCallback, useMemo } from 'react';
import { generateWordHuntShareableResult } from '@/utils/dailyChallenge';
import {
  generateDailyShareImage,
  downloadDailyShareImage,
} from '@/utils/dailyShareImage';
import type { WordHuntResult, GuestDailyPlayer } from '@/utils/dailyChallenge';
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
  profile: { display_name?: string | null; username?: string; avatar_emoji?: string | null } | null;
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

  // Handle native share
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
    shareText,
    shareTextWithUrl,
    handleCopy,
    handleWhatsApp,
    handleTwitter,
    handleTelegram,
    handleNativeShare,
    handleDownloadShareImage,
  };
}
