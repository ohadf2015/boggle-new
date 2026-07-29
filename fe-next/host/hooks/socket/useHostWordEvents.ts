/**
 * Host Word Events Hook
 * Handles word submission socket events when host is playing: wordAccepted, wordRejected, etc.
 */
import { useEffect, useCallback, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
// Note: Word feedback toasts removed - WordFormingArea now handles visual feedback
import { calculateComboChainWindow, calculateComboTimeout, resetComboState } from '@/shared/utils/comboUtils';
import type { WordAcceptedPayload, WordsForBoardPayload, BoardTheme } from '@/shared/types/socket';

type WordRejectedPayload = { word: string; reason: string };
type WordTooShortPayload = { word: string; minLength: number };
type WordAlreadyFoundPayload = { word: string };
type WordNotOnBoardPayload = { word: string };
import { useGameStore } from '@/hooks/gameState/store';

interface UseHostWordEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  hostPlaying: boolean;
  playComboSound: (level: number) => void;
  fireRoundActive?: boolean;

  // State setters
  setHostFoundWords: React.Dispatch<React.SetStateAction<string[]>>;
  setWordsForBoard: React.Dispatch<React.SetStateAction<string[]>>;
  setBoardTheme: React.Dispatch<React.SetStateAction<BoardTheme | null>>;

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
  fireRoundActive = false,
  setHostFoundWords,
  setWordsForBoard,
  setBoardTheme,
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

    // Handle merged blast data (Fix 2) — extract from wordAccepted instead of separate blastWordAccepted
    if (data.blast) {
      const store = useGameStore.getState();
      // Note: blastMovesUsed removed (timer-era Blast tracks boardClears server-side)
      store.setBlastTotalTileBonus((prev: number) => prev + (data.blast!.tileBonus || 0));
      store.setBlastTotalTilesCleared((prev: number) => prev + (data.blast!.tilesCleared?.length || 0));
    }

    // Note: WordFormingArea now handles accepted feedback visually
  }, [hostPlaying, playComboSound, setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef, resetCombo]);

  useEffect(() => {
    if (!socket) return;

    // Note: WordFormingArea now handles all word feedback visually
    // These handlers only update state, no toasts

    const handleWordAlreadyFound = (data: WordAlreadyFoundPayload) => {
      if (hostPlaying) {
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

    const handleWordNotOnBoard = (data: WordNotOnBoardPayload) => {
      if (hostPlaying) {
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordRejected = (data: WordRejectedPayload) => {
      if (hostPlaying) {
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    const handleWordTooShort = (data: WordTooShortPayload) => {
      if (hostPlaying) {
        if (data?.word) {
          const wordLower = data.word.toLowerCase();
          setHostFoundWords(prev => prev.filter(w => w.toLowerCase() !== wordLower));
        }
        resetCombo();
      }
    };

    // Handle blast word accepted (update moves counter and accumulated stats for host)
    const handleWordsForBoard = (data: WordsForBoardPayload) => {
      if (data?.words) {
        setWordsForBoard(data.words);
      }
      // Set the board theme if provided
      if (data?.theme) {
        setBoardTheme(data.theme);
      }
    };

    // Register listeners
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordTooShort', handleWordTooShort);
    socket.on('wordsForBoard', handleWordsForBoard);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordRejected', handleWordRejected);
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
    setBoardTheme,
  ]);
}
