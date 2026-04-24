'use client';

import { useCallback, useRef, useEffect, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { FoundWord } from '@/shared/types/view';
import type { WordFeedback } from '../../WordFormingArea';
import { validateWordLocally, couldBeOnBoard } from '@/utils/clientWordValidator';
import { hapticForWordScore, hapticError } from '@/utils/haptics';
import type { TranslationFn } from '../types';

interface UseWordSubmissionOptions {
  isPlaying: boolean;
  gameActive: boolean;
  gameLanguage: Language | null;
  minWordLength: number;
  normalizedFoundWords: FoundWord[];
  letterGrid: LetterGrid;
  socket: Socket | null;
  comboLevelRef: MutableRefObject<number>;
  t: TranslationFn;
  /** Plays on client-side rejection (too short, duplicate, not on board). Server-truth accept sound lives in useSocketFeedback. */
  playWordRejectedSound: () => void;
  announceWordResult: (word: string, isAccepted: boolean, score?: number, message?: string) => void;
  onWordSubmit?: (word: string) => void;
  onResetCombo?: () => void;
  setCurrentFeedback: (feedback: WordFeedback | null) => void;
  setLastWordFoundTime: (time: number) => void;
  /** Ref holding the detected combo type for current word path (blast multiplayer). */
  comboTypeRef?: MutableRefObject<string | null>;
}

interface UseWordSubmissionReturn {
  handleGridWordSubmit: (formedWord: string) => void;
  fireRoundActiveRef: MutableRefObject<boolean>;
}

/**
 * Hook for handling word submission with client-side validation
 */
export function useWordSubmission(
  options: UseWordSubmissionOptions
): UseWordSubmissionReturn {
  const {
    isPlaying,
    gameActive,
    gameLanguage,
    minWordLength,
    normalizedFoundWords,
    letterGrid,
    socket,
    comboLevelRef,
    t,
    playWordRejectedSound,
    announceWordResult,
    onWordSubmit,
    onResetCombo,
    setCurrentFeedback,
    setLastWordFoundTime,
    comboTypeRef,
  } = options;

  // Track current fireRoundActive value via ref for use in callbacks
  // This ensures the socket emit uses the latest value without waiting for re-render
  const fireRoundActiveRef = useRef(false);

  const handleGridWordSubmit = useCallback((formedWord: string): void => {
    if (!isPlaying) return;

    const currentLang = gameLanguage || 'en';

    // Client-side validation
    const validation = validateWordLocally(formedWord, currentLang, minWordLength, normalizedFoundWords);

    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WORD_SUBMIT] Client rejected word:', {
          word: formedWord,
          errorKey: validation.errorKey,
          foundWordsCount: normalizedFoundWords.length,
          foundWordsList: normalizedFoundWords.slice(0, 10).map(w => typeof w === 'string' ? w : w.word),
        });
      }
      let msg: string;
      const isDuplicate = validation.errorKey === 'playerView.wordAlreadyFound';

      if (validation.errorKey === 'playerView.wordTooShortMin') {
        msg = t('playerView.wordTooShortMin')
          ? t('playerView.wordTooShortMin').replace('${min}', String(validation.errorParams?.min || minWordLength))
          : `Word too short! (min ${validation.errorParams?.min || minWordLength} letters)`;
      } else if (validation.errorKey === 'playerView.wordTooShort') {
        msg = t('playerView.wordTooShort') || 'Word too short';
      } else if (isDuplicate) {
        msg = t('playerView.alreadyFound') || 'Already found';
      } else {
        const errorKey = validation.errorKey ?? 'Invalid word';
        msg = t(errorKey) || errorKey;
      }
      // Show feedback in WordFormingArea - use 'duplicate' type for already found words
      setCurrentFeedback({
        id: isDuplicate ? `duplicate-${Date.now()}` : `reject-${Date.now()}`,
        type: isDuplicate ? 'duplicate' : 'rejected',
        word: formedWord,
        message: msg,
        timestamp: Date.now(),
      });
      // Haptic feedback for error
      hapticError();
      playWordRejectedSound();
      // Announce rejection for screen readers
      announceWordResult(formedWord, false, undefined, msg);
      // Reset combo if duplicate word
      if (isDuplicate && onResetCombo) {
        onResetCombo();
      }
      return;
    }

    // Check if word can be on board
    if (!couldBeOnBoard(formedWord, letterGrid, currentLang)) {
      const notOnBoardMsg = t('playerView.wordNotOnBoard');
      // Show feedback in WordFormingArea
      setCurrentFeedback({
        id: `reject-${Date.now()}`,
        type: 'rejected',
        word: formedWord,
        message: notOnBoardMsg,
        timestamp: Date.now(),
      });
      hapticError();
      playWordRejectedSound();
      announceWordResult(formedWord, false, undefined, notOnBoardMsg);
      return;
    }

    // Haptic feedback fires optimistically (client-authoritative feel).
    // Accept SOUND is gated on the server's wordAccepted event — see
    // useSocketFeedback — to avoid audio-lie when server rejects.
    hapticForWordScore(formedWord.length);

    // Submit to server
    if (!socket || !gameActive) return;
    socket.emit('submitWord', {
      word: formedWord.toLowerCase(),
      comboLevel: comboLevelRef.current,
      fireRoundActive: fireRoundActiveRef.current,
      comboType: comboTypeRef?.current ?? null,
    });

    // Add to local found words
    onWordSubmit?.(formedWord);
  }, [
    isPlaying,
    gameLanguage,
    minWordLength,
    normalizedFoundWords,
    letterGrid,
    gameActive,
    socket,
    onWordSubmit,
    onResetCombo,
    t,
    playWordRejectedSound,
    announceWordResult,
    comboLevelRef,
    comboTypeRef,
    setCurrentFeedback,
  ]);

  return {
    handleGridWordSubmit,
    fireRoundActiveRef,
  };
}
