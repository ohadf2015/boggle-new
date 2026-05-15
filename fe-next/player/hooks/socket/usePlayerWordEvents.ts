/**
 * Player Word Events Hook
 * Handles word submission socket events and combo system
 *
 * REFACTORED: Now uses GameStateContext for state management and useSafeSocketEvents
 * NOTE: Combo refs still passed as props for performance (to be refactored later)
 */
import { useCallback, MutableRefObject, RefObject, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  wordErrorToast,
  neoSuccessToast,
  neoInfoToast,
  neoWarningToast,
  TOAST_ICONS,
} from '../../../components/NeoToast';
import { calculateComboChainWindow, calculateComboTimeout, resetComboState } from '@/shared/utils/comboUtils';
import { useFoundWords, useGameActions, useGameStore } from '@/hooks/gameState';
import { useSafeSocketEvents } from '@/hooks/useSafeSocketEvent';
import { useHapticFeedback, GAME_HAPTICS } from '@/hooks/useHapticFeedback';
import logger from '@/utils/logger';
import type { WordAcceptedPayload } from '@/shared/types/socket';
import type {
  SpamWarningPayload,
  SpamPenaltyPayload,
  SpamCooldownPayload,
  SpamCooldownEndPayload,
  WordBlockedByCooldownPayload
} from '@/shared/types/spam';

import type { WordToVote } from '@/player/types';

interface WordLifecyclePayload { word: string }
interface WordFeedbackRequestPayload {
  word: string;
  submittedBy: string;
  submitterAvatar?: { emoji?: string; color?: string };
  timeoutSeconds?: number;
  gameCode: string;
  language: string;
}
interface VoteRecordedPayload { success?: boolean }

interface UsePlayerWordEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  inputRef: RefObject<HTMLInputElement | null>;
  playComboSound: (level: number) => void;
  fireRoundActive?: boolean;

  // Word feedback state (local to PlayerView, not in GameState)
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<WordToVote | null>>;

  // Combo refs and setters
  comboLevelRef: MutableRefObject<number>;
  lastWordTimeRef: MutableRefObject<number | null>;
  setComboLevel: React.Dispatch<React.SetStateAction<number>>;
  setLastWordTime: React.Dispatch<React.SetStateAction<number | null>>;
  comboTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
  comboShieldsUsedRef: MutableRefObject<number>;
}

// Constants
const VALID_WORDS_PER_SHIELD = 10;

/**
 * Hook for managing player word submission socket events
 */
export function usePlayerWordEvents({
  socket,
  t,
  inputRef,
  playComboSound,
  fireRoundActive = false,
  setShowWordFeedback,
  setWordToVote,
  comboLevelRef,
  lastWordTimeRef,
  setComboLevel,
  setLastWordTime,
  comboTimeoutRef,
  comboShieldsUsedRef,
}: UsePlayerWordEventsProps): void {
  // Get foundWords state from Zustand store (selective subscription for performance)
  const foundWords = useFoundWords();
  const { setFoundWords } = useGameActions();

  // Haptic feedback for word events
  const { customHaptic } = useHapticFeedback();
  // Calculate available shields
  const getAvailableShields = useCallback(() => {
    const validWordCount = foundWords.filter(w => w.validated === true).length;
    const totalShields = Math.floor(validWordCount / VALID_WORDS_PER_SHIELD);
    return Math.max(0, totalShields - comboShieldsUsedRef.current);
  }, [foundWords, comboShieldsUsedRef]);

  // Reset combo with shield protection
  const resetCombo = useCallback(() => {
    const currentCombo = comboLevelRef.current;

    if (currentCombo > 0) {
      const availableShields = getAvailableShields();

      if (availableShields > 0) {
        comboShieldsUsedRef.current += 1;
        neoInfoToast(t('combo.shieldUsed') || '🛡️ Combo Shield Used!', {
          duration: 2000,
        });
        logger.log('[COMBO] Shield used, combo preserved at level', currentCombo);
        return;
      }
    }

    resetComboState(
      { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
      { setComboLevel, setLastWordTime }
    );
  }, [setComboLevel, setLastWordTime, comboLevelRef, lastWordTimeRef, comboTimeoutRef, getAvailableShields, comboShieldsUsedRef, t]);

  // Define all event handlers as stable callbacks
  const handleWordAccepted = useCallback((data: WordAcceptedPayload) => {
      // Haptic feedback for accepted word
      customHaptic(GAME_HAPTICS.validWord);

      // Dismiss any AI validation toast
      toast.dismiss(`ai-validating-${data.word.toLowerCase()}`);

      // Animate input on word accepted using CSS transitions
      if (inputRef.current) {
        const input = inputRef.current;
        input.style.transform = 'scale(1.1)';
        input.style.borderColor = '#4ade80';
        input.style.transition = 'transform 0.3s ease-out, border-color 0.3s ease-out';
        requestAnimationFrame(() => {
          setTimeout(() => {
            input.style.transform = 'scale(1)';
            input.style.borderColor = '';
          }, 50);
        });
      }

      // Update found words - mark as valid and store score/bonus data from server
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? {
              ...fw,
              validated: true,
              score: data.score ?? fw.score,
              comboBonus: data.comboBonus ?? 0,
              fireRoundBonus: data.fireRoundBonus ?? 0,
              fireRoundMultiplier: data.fireRoundMultiplier ?? 1,
              inputMethod: data.inputMethod ?? fw.inputMethod,
            }
          : fw
      ));

      const now = Date.now();
      let newComboLevel = 0;

      if (data.autoValidated) {
        const currentComboLevel = comboLevelRef.current;
        const currentLastWordTime = lastWordTimeRef.current;

        const comboChainWindow = calculateComboChainWindow(currentComboLevel);
        if (currentLastWordTime && (now - currentLastWordTime) < comboChainWindow) {
          newComboLevel = currentComboLevel + 1;
          setComboLevel(newComboLevel);
          comboLevelRef.current = newComboLevel;
          playComboSound(newComboLevel);
          // Haptic feedback for combo level up
          customHaptic(GAME_HAPTICS.comboLevelUp);
        } else {
          newComboLevel = 0;
          // Guard: avoid re-rendering ComboDisplay when already at 0.
          // Without this, every non-chained word triggers setComboLevel(0)
          // and re-paints the combo subtree mid-game.
          if (currentComboLevel !== 0) {
            setComboLevel(0);
            comboLevelRef.current = 0;
          }
        }
        setLastWordTime(now);
        lastWordTimeRef.current = now;

        if (comboTimeoutRef.current) {
          clearTimeout(comboTimeoutRef.current);
        }

        const comboTimeout = calculateComboTimeout(newComboLevel);
        comboTimeoutRef.current = setTimeout(() => {
          resetComboState(
            { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
            { setComboLevel, setLastWordTime }
          );
        }, comboTimeout);
      } else {
        resetCombo();
      }

      // Handle merged blast data (Fix 2) — extract from wordAccepted instead of separate blastWordAccepted
      if (data.blast) {
        const store = useGameStore.getState();
        // Note: blastMovesUsed removed (timer-era Blast tracks boardClears server-side)
        store.setBlastTotalTileBonus((prev: number) => prev + (data.blast!.tileBonus || 0));
        store.setBlastTotalTilesCleared((prev: number) => prev + (data.blast!.tilesCleared?.length || 0));
      }

      // Note: WordFormingArea now handles word accepted feedback visually
      // Toast removed to avoid duplicate notifications
    }, [inputRef, setFoundWords, comboLevelRef, lastWordTimeRef, setComboLevel, setLastWordTime, comboTimeoutRef, playComboSound, resetCombo, customHaptic]);

  const handleWordAlreadyFound = useCallback((data: WordLifecyclePayload) => {
    // Haptic feedback for duplicate word (warning pattern)
    customHaptic(GAME_HAPTICS.invalidWord);

    // Note: WordFormingArea now handles duplicate feedback visually
    if (data?.word) {
      setFoundWords(prev => prev.filter(fw => {
        if (fw.word.toLowerCase() === data.word.toLowerCase() && !fw.validated) {
          return false;
        }
        return true;
      }));
    }
    resetCombo();
  }, [setFoundWords, resetCombo, customHaptic]);

  const handleWordAlreadyFoundByOther = useCallback((data: { word: string; foundBy: string; foundByAvatar?: unknown; confirmationScore?: number }) => {
    // Haptic feedback - use info pattern (not error) since player gets partial credit
    customHaptic(GAME_HAPTICS.invalidWord);

    // Keep the word in found words with partial credit score (don't remove it)
    if (data?.word) {
      const hasPartialCredit = data.confirmationScore && data.confirmationScore > 0;
      setFoundWords(prev => prev.map(fw => {
        if (fw.word.toLowerCase() === data.word.toLowerCase() && !fw.validated) {
          return {
            ...fw,
            validated: true,
            score: hasPartialCredit ? data.confirmationScore! : 0,
            foundBy: data.foundBy,
          };
        }
        return fw;
      }));
    }
    // Don't reset combo — player found a valid word, just not first
    logger.log('[PLAYER] Word already found by another player:', data.foundBy);
  }, [setFoundWords, customHaptic]);

  const handleWordNotOnBoard = useCallback((data: WordLifecyclePayload) => {
    // Haptic feedback for invalid word
    customHaptic(GAME_HAPTICS.invalidWord);

    // Note: WordFormingArea now handles rejected feedback visually
    setFoundWords(prev => prev.map(fw =>
      fw.word.toLowerCase() === data.word.toLowerCase()
        ? { ...fw, validated: false }
        : fw
    ));
    resetCombo();
  }, [setFoundWords, resetCombo, customHaptic]);

  const handleWordTooShort = useCallback((data: WordLifecyclePayload) => {
    // Haptic feedback for too short word
    customHaptic(GAME_HAPTICS.invalidWord);

    // Note: WordFormingArea now handles rejected feedback visually
    setFoundWords(prev => prev.filter(fw =>
      fw.word.toLowerCase() !== data.word.toLowerCase()
    ));
    resetCombo();
  }, [setFoundWords, resetCombo, customHaptic]);

  const handleWordRejected = useCallback((data: WordLifecyclePayload) => {
    // Haptic feedback for rejected word
    customHaptic(GAME_HAPTICS.invalidWord);

    toast.dismiss(`ai-validating-${data.word.toLowerCase()}`);
    // Note: WordFormingArea now handles rejected feedback visually
    setFoundWords(prev => prev.filter(fw =>
      fw.word.toLowerCase() !== data.word.toLowerCase()
    ));
    resetCombo();
  }, [setFoundWords, resetCombo, customHaptic]);

  // Word feedback handlers
  const handleShowWordFeedback = useCallback((data: WordFeedbackRequestPayload) => {
    logger.log('[PLAYER] Received word feedback request:', data);
    setWordToVote({
      word: data.word,
      submittedBy: data.submittedBy,
      submitterAvatar: data.submitterAvatar,
      timeoutSeconds: data.timeoutSeconds || 10,
      gameCode: data.gameCode,
      language: data.language
    });
    setShowWordFeedback(true);
  }, [setWordToVote, setShowWordFeedback]);

  const handleNoWordFeedback = useCallback(() => {
    logger.log('[PLAYER] No word feedback needed');
    setShowWordFeedback(false);
    setWordToVote(null);
  }, [setShowWordFeedback, setWordToVote]);

  const handleVoteRecorded = useCallback((data: VoteRecordedPayload) => {
    logger.log('[PLAYER] Vote recorded:', data);
    if (data.success) {
      neoSuccessToast(t('wordFeedback.thankYou') || 'Thanks for voting!', { icon: TOAST_ICONS.check, duration: 2000 });
    }
  }, [t]);

  const handleWordBecameValid = useCallback((data: WordLifecyclePayload) => {
    logger.log('[PLAYER] Word became valid:', data);
    neoInfoToast(`"${data.word}" ${t('wordFeedback.nowValid') || 'is now a valid word!'}`, { icon: TOAST_ICONS.bookOpen, duration: 3000 });
  }, [t]);

  // Spam detection handlers
  const handleSpamWarning = useCallback((data: SpamWarningPayload) => {
    logger.log('[SPAM] Warning received:', data);
    neoWarningToast(t('spam.warning') || 'Slow down! Too many invalid words', {
      icon: TOAST_ICONS.alertTriangle,
      duration: 4000
    });
  }, [t]);

  const handleSpamPenalty = useCallback((data: SpamPenaltyPayload) => {
    logger.log('[SPAM] Penalty applied:', data);
    wordErrorToast(
      (t('spam.penalty') || 'Points deducted: -${points}').replace('${points}', String(data.pointsDeducted)),
      { duration: 4000 }
    );
    resetCombo();
  }, [t, resetCombo]);

  const handleSpamCooldown = useCallback((data: SpamCooldownPayload) => {
    logger.log('[SPAM] Cooldown started:', data);
    const seconds = Math.ceil(data.duration / 1000);
    wordErrorToast(
      (t('spam.cooldown') || 'Blocked for ${seconds}s - slow down!').replace('${seconds}', String(seconds)),
      { duration: data.duration }
    );
    resetCombo();
  }, [t, resetCombo]);

  const handleSpamCooldownEnd = useCallback((data: SpamCooldownEndPayload) => {
    logger.log('[SPAM] Cooldown ended:', data);
    neoInfoToast(t('spam.cooldownEnd') || 'You can submit words again', {
      icon: TOAST_ICONS.check,
      duration: 2000
    });
  }, [t]);

  const handleWordBlockedByCooldown = useCallback((data: WordBlockedByCooldownPayload) => {
    const seconds = Math.ceil(data.remainingMs / 1000);
    wordErrorToast(
      (t('spam.blockedWord') || 'Wait ${seconds}s before submitting').replace('${seconds}', String(seconds)),
      { duration: 2000 }
    );
  }, [t]);

  // Use useSafeSocketEvents to register all events automatically
  const events = useMemo(() => [
    { event: 'wordAccepted', handler: handleWordAccepted as (data: unknown) => void },
    { event: 'wordAlreadyFound', handler: handleWordAlreadyFound as (data: unknown) => void },
    { event: 'wordAlreadyFoundByOther', handler: handleWordAlreadyFoundByOther as (data: unknown) => void },
    { event: 'wordNotOnBoard', handler: handleWordNotOnBoard as (data: unknown) => void },
    { event: 'wordTooShort', handler: handleWordTooShort as (data: unknown) => void },
    { event: 'wordRejected', handler: handleWordRejected as (data: unknown) => void },
    { event: 'showWordFeedback', handler: handleShowWordFeedback as (data: unknown) => void },
    { event: 'noWordFeedback', handler: handleNoWordFeedback as (data: unknown) => void },
    { event: 'voteRecorded', handler: handleVoteRecorded as (data: unknown) => void },
    { event: 'wordBecameValid', handler: handleWordBecameValid as (data: unknown) => void },
    { event: 'spamWarning', handler: handleSpamWarning as (data: unknown) => void },
    { event: 'spamPenalty', handler: handleSpamPenalty as (data: unknown) => void },
    { event: 'spamCooldown', handler: handleSpamCooldown as (data: unknown) => void },
    { event: 'spamCooldownEnd', handler: handleSpamCooldownEnd as (data: unknown) => void },
    { event: 'wordBlockedByCooldown', handler: handleWordBlockedByCooldown as (data: unknown) => void },
  ], [
    handleWordAccepted,
    handleWordAlreadyFound,
    handleWordAlreadyFoundByOther,
    handleWordNotOnBoard,
    handleWordTooShort,
    handleWordRejected,
    handleShowWordFeedback,
    handleNoWordFeedback,
    handleVoteRecorded,
    handleWordBecameValid,
    handleSpamWarning,
    handleSpamPenalty,
    handleSpamCooldown,
    handleSpamCooldownEnd,
    handleWordBlockedByCooldown,
  ]);

  useSafeSocketEvents({
    socket,
    events,
    onError: (event, error) => {
      logger.error(`[PLAYER] Socket event error on "${event}":`, error);
    },
  });
}
