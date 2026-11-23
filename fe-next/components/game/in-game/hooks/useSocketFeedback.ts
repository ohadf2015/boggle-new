'use client';

import { emitMascotEvent } from '@/lib/blast/mascotBus';
import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { WordFeedback } from '../../WordFormingArea';
import type { TranslationFn } from '../types';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { hapticWordAccepted } from '@/utils/haptics';
import { MIN_WORD_LENGTH } from '@/shared/constants/gameConstants';
import { useWordVerdict } from '@/lib/wordVerdict/useWordVerdict';
import { reasonFromCode, type VerdictParams, type WordVerdictReason } from '@/lib/wordVerdict/wordVerdict';
import { countActiveGameWord } from '@/utils/abandonOnPagehide';

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
  /** The room's minimum, for a too-short reason that arrives without one. */
  minWordLength?: number;
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
    minWordLength = MIN_WORD_LENGTH,
  } = options;
  const verdicts = useWordVerdict({ t, playRejectedSound: playWordRejectedSound });

  useEffect(() => {
    if (!socket || !isPlaying) return;

    const showVerdict = (word: string, reason: WordVerdictReason, params?: VerdictParams): void => {
      emitMascotEvent({ kind: reason === 'already-found' ? 'duplicate-word' : 'word-rejected' });
      const v = verdicts.reject(word, reason, params);
      setCurrentFeedback({
        id: `${v.tone === 'error' ? 'rejected' : 'duplicate'}-${Date.now()}`,
        type: v.tone === 'error' ? 'rejected' : 'duplicate',
        word,
        message: v.message,
        durationMs: v.durationMs,
        timestamp: Date.now(),
      });
    };

    const handleWordAccepted = (data: {
      word: string;
      score: number;
      comboLevel?: number;
      fireRoundActive?: boolean;
      fireRoundBonus?: number;
      goldenBonus?: number;
      rushBonus?: number;
      fromLesson?: boolean;
      /** Flat points added because this was one of the teacher's lesson words. */
      lessonBonus?: number;
    }): void => {
      // Track when the last word was found for inactivity-based trail visibility
      setLastWordFoundTime(Date.now());
      verdicts.clearRepeat();
      // A valid word landed — let the stuck-player coach mark success / "helped".
      onWordAccepted?.();
      countActiveGameWord();
      const wordLen = data.word.length;
      emitMascotEvent({ kind: 'word-submitted', wordLength: wordLen, gemLetterUsed: false, word: data.word });
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
        lessonBonus: data.lessonBonus,
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

    const handleWordAlreadyFound = (data: { word: string }): void => showVerdict(data.word, 'already-found');

    const handleWordRejected = (data: { word: string; reason?: string }): void => {
      if (data.reason === 'boss_frozen') {
        emitMascotEvent({ kind: 'word-rejected' });
        setCurrentFeedback({
          id: `rejected-${Date.now()}`,
          type: 'rejected',
          word: data.word,
          message: t('classroomBoss.frozenRejected'),
          timestamp: Date.now(),
        });
        playWordRejectedSound();
        return;
      }
      showVerdict(data.word, reasonFromCode(data.reason) ?? 'not-a-word', { min: minWordLength });
    };

    const handleWordNotOnBoard = (data: { word: string }): void => showVerdict(data.word, 'not-on-board');

    const handleWordTooShort = (data: { word: string; minLength?: number }): void =>
      showVerdict(data.word, 'too-short', { min: data.minLength ?? minWordLength });

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
  }, [socket, isPlaying, t, verdicts, minWordLength, setCurrentFeedback, setLastWordFoundTime, playWordAcceptedSound, playWordRejectedSound, playWordLengthSound, onWordAccepted]);
}
