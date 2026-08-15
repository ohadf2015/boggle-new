'use client';

import { useCallback, useRef, useEffect, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { FoundWord } from '@/shared/types/view';
import type { WordFeedback } from '../../WordFormingArea';
import { validateWordLocally, couldBeOnBoard, normalizeWord } from '@/utils/clientWordValidator';
import { reportUnresolvedGameLanguage } from '@/utils/languageTelemetry';
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
  onWordSubmit?: (word: string, meta?: { inputMethod: 'kb' | 'drag' }) => void;
  onResetCombo?: () => void;
  setCurrentFeedback: (feedback: WordFeedback | null) => void;
  setLastWordFoundTime: (time: number) => void;
  /** Ref holding the detected combo type for current word path (blast multiplayer). */
  comboTypeRef?: MutableRefObject<string | null>;
  /**
   * The CLIENT owns word truth for this board — no server will ever answer.
   * Quick Play runs this multiplayer board solo (QuickClassicBoard, socket=null)
   * with `useSinglePlayerCore` as the engine behind `onWordSubmit`.
   *
   * Must be explicit rather than inferred from `socket == null`: the MP views
   * type socket as `Socket | null` too, so a reconnect gap looks identical to a
   * solo board. Committing locally there would add words the server never sees
   * — the client/server score divergence in Class 3 of 60-recurring-pitfalls.
   */
  clientAuthoritative?: boolean;
}

interface UseWordSubmissionReturn {
  handleGridWordSubmit: (formedWord: string, meta?: { inputMethod: 'kb' | 'drag' }) => void;
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
    clientAuthoritative = false,
    comboTypeRef,
  } = options;

  // Track current fireRoundActive value via ref for use in callbacks
  // This ensures the socket emit uses the latest value without waiting for re-render
  const fireRoundActiveRef = useRef(false);

  // Keep the latest foundWords as a normalized Set behind a ref so
  // `handleGridWordSubmit` doesn't have to depend on `normalizedFoundWords`
  // identity. Without this, the array reference flipping on every word
  // submission rebuilt the callback → broke GridComponent memo via the
  // onWordSubmit prop → forced 16 GridCell equality re-checks per accept.
  // The Set also gives O(1) duplicate lookup vs the array.some() + per-element
  // normalizeWord() scan validateWordLocally falls back to.
  const foundWordsSetRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const lang = (gameLanguage || 'en') as Language;
    const next = new Set<string>();
    for (const fw of normalizedFoundWords) {
      const w = typeof fw === 'string' ? fw : fw.word;
      if (w) next.add(normalizeWord(w, lang));
    }
    foundWordsSetRef.current = next;
  }, [normalizedFoundWords, gameLanguage]);

  const handleGridWordSubmit = useCallback((formedWord: string, meta?: { inputMethod: 'kb' | 'drag' }): void => {
    if (!isPlaying) return;

    // Tripwire: a live submission with no resolved language means the language
    // wasn't threaded here → the `|| 'en'` fallback would reject valid accented
    // words. Healthy games always have a language, so report a recurrence.
    if (!gameLanguage) {
      reportUnresolvedGameLanguage({
        where: 'mp-word-submit',
        hasBoard: Array.isArray(letterGrid) && letterGrid.length > 0,
      });
    }

    const currentLang = gameLanguage || 'en';

    // Client-side validation — pass the pre-normalized Set so the lookup is
    // O(1) and doesn't have to re-normalize every previously-found word per
    // submit.
    const validation = validateWordLocally(formedWord, currentLang, minWordLength, foundWordsSetRef.current);

    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[WORD_SUBMIT] Client rejected word:', {
          word: formedWord,
          errorKey: validation.errorKey,
          foundWordsCount: foundWordsSetRef.current.size,
        });
      }
      let msg: string;
      const isDuplicate = validation.errorKey === 'playerView.wordAlreadyFound';

      if (validation.errorKey === 'playerView.wordTooShortMin') {
        const minVal = String(validation.errorParams?.min || minWordLength);
        msg = t('playerView.wordTooShortMin', { min: minVal })
          || `Word too short! (min ${minVal} letters)`;
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

    if (!gameActive) return;

    // Submit to server. Optional-chained, NOT an early return: this board also
    // runs solo with socket=null (Quick Play classic — QuickClassicBoard), where
    // `onWordSubmit` IS the game engine. Gating the local commit on having a
    // socket made every valid word in a solo round a silent no-op.
    socket?.emit('submitWord', {
      word: formedWord.toLowerCase(),
      comboLevel: comboLevelRef.current,
      fireRoundActive: fireRoundActiveRef.current,
      comboType: comboTypeRef?.current ?? null,
      inputMethod: meta?.inputMethod ?? 'drag',
    });

    // Add to local found words. In MP the server is the authority and this is
    // the optimistic local echo of what we just emitted; with no socket AND no
    // client authority (a reconnect gap) we commit nothing, exactly as before.
    if (socket || clientAuthoritative) onWordSubmit?.(formedWord, meta);
    // Intentionally NOT depending on `normalizedFoundWords`: we read the
    // already-normalized Set through `foundWordsSetRef` which is refreshed by
    // the effect above. Putting the array here would force a new callback
    // identity per word found and re-break the GridComponent memo we just
    // stabilised — defeating the purpose of this hook's perf shape.
  }, [
    isPlaying,
    gameLanguage,
    minWordLength,
    letterGrid,
    gameActive,
    socket,
    onWordSubmit,
    onResetCombo,
    clientAuthoritative,
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
