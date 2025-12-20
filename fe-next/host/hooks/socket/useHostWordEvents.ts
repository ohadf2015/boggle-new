/**
 * Host Word Events Hook
 * Handles word submission socket events when host is playing: wordAccepted, wordRejected, etc.
 */
import { useEffect, useCallback, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { wordAcceptedToast, wordNeedsValidationToast, wordErrorToast } from '../../../components/NeoToast';
import { calculateComboChainWindow, calculateComboTimeout, resetComboState } from '@/shared/utils/comboUtils';
import type { WordAcceptedPayload } from '@/shared/types/socket';

interface UseHostWordEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  hostPlaying: boolean;
  playComboSound: (level: number) => void;

  // State setters
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setWordsForBoard: React.Dispatch<React.SetStateAction<string[]>>;

  // Combo refs and setters
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
}

/**
 * Hook for managing host word submission socket events
 */
export function useHostWordEvents({
  socket,
  t,
  hostPlaying,
  playComboSound,
  setHostFoundWords,
  setWordsForBoard,
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,
}: UseHostWordEventsProps): void {
  // Reset combo helper using shared utility
  const resetCombo = useCallback(() => {
    resetComboState(
      { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
      { setComboLevel, setLastWordTime }
    );
  }, [setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef]);

  // Handle word accepted (for host playing)
  const handleWordAccepted = useCallback((data: WordAcceptedPayload) => {
    if (!hostPlaying) return;

    const now = Date.now();
    let newComboLevel = 0;

    if (data.autoValidated) {
      // Word was in dictionary - combo can continue
      const currentComboLevel = comboLevelRef.current;
      const currentLastWordTime = lastWordTimeRef.current;

      const comboChainWindow = calculateComboChainWindow(currentComboLevel);
      if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
        newComboLevel = currentComboLevel + 1;
        setComboLevel(newComboLevel);
        comboLevelRef.current = newComboLevel;
        playComboSound(newComboLevel);
      } else {
        newComboLevel = 0;
        setComboLevel(0);
        comboLevelRef.current = 0;
      }
      setLastWordTime(now);
      lastWordTimeRef.current = now;

      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      const comboTimeout = calculateComboTimeout(newComboLevel);
      comboTimeoutRef.current = setTimeout(() => {
        setComboLevel(0);
        comboLevelRef.current = 0;
        setLastWordTime(null);
        lastWordTimeRef.current = null;
      }, comboTimeout);
    } else {
      // Word was NOT in dictionary - reset combo
      resetCombo();
    }

    // Show toast with score from server
    wordAcceptedToast(data.word, {
      score: data.score || (data.word.length - 1),
      comboBonus: data.comboBonus || 0,
      comboLevel: data.comboLevel || 0,
      comboBonusLabel: t('common.comboBonus'),
      duration: 2000
    });
  }, [hostPlaying, playComboSound, setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef, t, resetCombo]);

  useEffect(() => {
    if (!socket) return;

    const handleWordAlreadyFound = (data: any) => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordAlreadyFound'), { duration: 2000 });
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => {
            let foundFirst = false;
            return prev.filter(w => {
              if (w.toLowerCase() === wordLower) {
                if (!foundFirst) {
                  foundFirst = true;
                  return true;
                }
                return false;
              }
              return true;
            });
          });
        }
        resetCombo();
      }
    };

    const handleWordNotOnBoard = (data: any) => {
      if (hostPlaying) {
        wordErrorToast(t('playerView.wordNotOnBoard'), { duration: 3000 });
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordRejected = (data: any) => {
      if (hostPlaying) {
        const reason = data.reason === 'notInDictionary'
          ? (t('playerView.notInDictionary') || 'Not in dictionary')
          : (t('playerView.wordRejected') || 'Word rejected');
        wordErrorToast(`${data.word}: ${reason}`, { duration: 3000 });
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordNeedsValidation = (data: any) => {
      if (hostPlaying) {
        wordNeedsValidationToast(data.word, { pendingLabel: t('common.pending'), duration: 3000 });
        resetCombo();
      }
    };

    const handleWordTooShort = (data: any) => {
      if (hostPlaying) {
        const msg = t('playerView.wordTooShortMin')
          ? t('playerView.wordTooShortMin').replace('${min}', data.minLength)
          : `Word too short! (min ${data.minLength} letters)`;
        wordErrorToast(msg, { duration: 2000 });
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordsForBoard = (data: any) => {
      if (data?.words) {
        setWordsForBoard(data.words);
      }
    };

    // Register listeners
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordTooShort', handleWordTooShort);
    socket.on('wordsForBoard', handleWordsForBoard);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordRejected', handleWordRejected);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('wordTooShort', handleWordTooShort);
      socket.off('wordsForBoard', handleWordsForBoard);
    };
  }, [
    socket,
    t,
    hostPlaying,
    handleWordAccepted,
    resetCombo,
    setHostFoundWords,
    setWordsForBoard,
  ]);
}
