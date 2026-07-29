'use client';

import { useState, useCallback } from 'react';
import { getPuzzleNumber } from '@/utils/dailyChallenge';
import type { DailyParticipant } from './DailyLeaderboard';
import type { Language } from '@/types';

interface UseShareRankOptions {
  currentUserData: DailyParticipant | null;
  puzzleDate: string;
  language: Language;
  gameType: 'puzzle' | 'wordHunt';
}

interface UseShareRankResult {
  copied: boolean;
  handleShareRank: () => Promise<void>;
}

/**
 * Hook that builds a shareable rank URL and handles native share / clipboard fallback.
 */
export function useShareRank({
  currentUserData,
  puzzleDate,
  language,
  gameType,
}: UseShareRankOptions): UseShareRankResult {
  const [copied, setCopied] = useState(false);

  const handleShareRank = useCallback(async () => {
    if (!currentUserData) return;

    const puzzleNumber = getPuzzleNumber(puzzleDate);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const ogParams = new URLSearchParams({
      rank: String(currentUserData.rank_position ?? 0),
      displayName: currentUserData.display_name || 'Player',
      avatarEmoji: currentUserData.avatar_emoji || '🎯',
      puzzleNumber: String(puzzleNumber),
    });

    if (currentUserData.avatar_image) {
      const avatarFilename = currentUserData.avatar_image.endsWith('.png')
        ? currentUserData.avatar_image
        : `${currentUserData.avatar_image}.png`;
      ogParams.set('avatarImage', avatarFilename);
    }

    if (gameType === 'wordHunt') {
      ogParams.set('solved', String(currentUserData.solved ?? false));
      ogParams.set('attemptsUsed', String(currentUserData.attempts_used ?? 0));
    } else {
      ogParams.set('score', String(currentUserData.score ?? 0));
      ogParams.set('wordCount', String(currentUserData.word_count ?? 0));
    }

    const shareUrl = `${origin}/${language}/daily?share=${encodeURIComponent(ogParams.toString())}`;

    const shareText = gameType === 'wordHunt'
      ? `🎯 I ranked #${currentUserData.rank_position} on LexiClash Word Hunt #${puzzleNumber}! ${currentUserData.solved ? `Solved in ${currentUserData.attempts_used}/10` : 'X/10'}\n\n`
      : `🎯 I ranked #${currentUserData.rank_position} on LexiClash Daily #${puzzleNumber}! ${currentUserData.score ?? 0} pts | ${currentUserData.word_count ?? 0} words\n\n`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `LexiClash Daily #${puzzleNumber}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or error — fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') return;
      console.error('Failed to copy:', err);
    }
  }, [currentUserData, puzzleDate, language, gameType]);

  return { copied, handleShareRank };
}
