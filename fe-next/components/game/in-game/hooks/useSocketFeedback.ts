'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { WordFeedback } from '../../WordFormingArea';
import type { TranslationFn } from '../types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { hapticError, hapticWordAccepted } from '@/utils/haptics';

interface UseSocketFeedbackOptions {
  socket: Socket | null;
  isPlaying: boolean;
  t: TranslationFn;
  setCurrentFeedback: (feedback: WordFeedback | null) => void;
  setLastWordFoundTime: (time: number) => void;
  /** Plays on server's wordAccepted event (server-truth audio, prevents audio-lie). */
  playWordAcceptedSound: () => void;
  /** Plays on server rejection events (wordRejected/wordNotOnBoard/wordTooShort). */
  playWordRejectedSound: () => void;
  /** Optional bespoke per-length flavor sound, fired in addition to the accept chime. */
  playWordLengthSound?: (length: number) => void;
  /** Fired when the server confirms a valid word — used by the stuck-player coach. */
  onWordAccepted?: () => void;
}

/**
 * Hook for handling socket word feedback events
 */
export function useSocketFeedback(options: UseSocketFeedbackOptions): void {
  const {
    socket,
    isPlaying,
    t,
    setCurrentFeedback,
    setLastWordFoundTime,
    playWordAcceptedSound,
    playWordRejectedSound,
    playWordLengthSound,
    onWordAccepted,
  } = options;

  useEffect(() => {
    if (!socket || !isPlaying) return;

    const handleWordAccepted = (data: {
      word: string;
      score: number;
      comboLevel?: number;
      fireRoundActive?: boolean;
      fireRoundBonus?: number;
      goldenBonus?: number;
      rushBonus?: number;
      fromLesson?: boolean;
    }): void => {
      // Track when the last word was found for inactivity-based trail visibility
      setLastWordFoundTime(Date.now());
      // A valid word landed — let the stuck-player coach mark success / "helped".
      onWordAccepted?.();
      const wordLen = data.word.length;
      const longWordLabel = wordLen >= 8 ? 'LEGENDARY!' : wordLen >= 7 ? 'INCREDIBLE!' : wordLen >= 6 ? 'AMAZING!' : undefined;
      setCurrentFeedback({
        id: `accepted-${Date.now()}`,
        type: 'accepted',
        word: data.word,
        score: data.score,
        fireRoundActive: data.fireRoundActive,
        fireRoundBonus: data.fireRoundBonus,
        goldenBonus: data.goldenBonus,
        rushBonus: data.rushBonus,
        fromLesson: data.fromLesson,
        longWordLabel,
        timestamp: Date.now(),
      });
      // Server-truth accept sound + haptic: both fire only after server confirms,
      // mirroring the audio-lie protection — no fake success buzz on client.
      playWordAcceptedSound();
      hapticWordAccepted();
      // Layered per-length flavor — short words still get just the accept chime,
      // longer words get a richer reward via wordLengthSrc tiers (3..7, 8+).
      if (wordLen >= 5) {
        playWordLengthSound?.(wordLen);
      }
    };

    const handleWordAlreadyFound = (data: { word: string }): void => {
      setCurrentFeedback({
        id: `duplicate-${Date.now()}`,
        type: 'duplicate',
        word: data.word,
        message: t('playerView.alreadyFound') || 'Already found',
        timestamp: Date.now(),
      });
    };

    const handleWordRejected = (data: { word: string; reason?: string }): void => {
      const reasonKeyMap: Record<string, string> = {
        not_in_dictionary: 'playerView.notInDictionary',
        not_on_board: 'playerView.wordNotOnBoard',
        too_short: 'playerView.wordTooShort',
        duplicate: 'playerView.alreadyFound',
      };
      const messageKey = data.reason && reasonKeyMap[data.reason]
        ? reasonKeyMap[data.reason]
        : 'playerView.invalidWord';
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t(messageKey) || 'Invalid word',
        timestamp: Date.now(),
      });
      playWordRejectedSound();
      hapticError();
    };

    const handleWordNotOnBoard = (data: { word: string }): void => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t('playerView.invalidWord') || 'Invalid word',
        timestamp: Date.now(),
      });
      playWordRejectedSound();
      hapticError();
    };

    const handleWordTooShort = (data: { word: string; minLength?: number }): void => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t('playerView.wordTooShort') || 'Too short',
        timestamp: Date.now(),
      });
      playWordRejectedSound();
      hapticError();
    };

    const handleWordAlreadyFoundByOther = (data: {
      word: string;
      foundBy: string;
      foundByAvatar?: { customAvatar?: CustomAvatarConfig; avatarImage?: string } | null;
      confirmationScore?: number;
    }): void => {
      const hasPartialCredit = data.confirmationScore && data.confirmationScore > 0;
      setCurrentFeedback({
        id: `foundByOther-${Date.now()}`,
        type: 'foundByOther',
        word: data.word,
        score: hasPartialCredit ? data.confirmationScore : undefined,
        message: t('playerView.foundByOther', { player: data.foundBy }) || `Found by ${data.foundBy}`,
        foundBy: data.foundBy,
        foundByAvatar: data.foundByAvatar as WordFeedback['foundByAvatar'],
        timestamp: Date.now(),
      });
      // Update last word found time for partial credit (keeps combo alive)
      if (hasPartialCredit) {
        setLastWordFoundTime(Date.now());
      }
    };

    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordAlreadyFoundByOther', handleWordAlreadyFoundByOther);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordTooShort', handleWordTooShort);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordAlreadyFoundByOther', handleWordAlreadyFoundByOther);
      socket.off('wordRejected', handleWordRejected);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordTooShort', handleWordTooShort);
    };
  }, [socket, isPlaying, t, setCurrentFeedback, setLastWordFoundTime, playWordAcceptedSound, playWordRejectedSound, playWordLengthSound, onWordAccepted]);
}
