/**
 * Player Word Events Hook
 * Handles word submission socket events and combo system
 *
 * REFACTORED: Now uses GameStateContext for state management
 * NOTE: Combo refs still passed as props for performance (to be refactored later)
 */
import { useEffect, useCallback, MutableRefObject, RefObject } from 'react';
import { Socket } from 'socket.io-client';
import gsap from 'gsap';
import toast from 'react-hot-toast';
import {
  wordAIValidatingToast,
  wordErrorToast,
  neoSuccessToast,
  neoInfoToast,
  neoWarningToast,
} from '../../../components/NeoToast';
import { calculateComboChainWindow, calculateComboTimeout, resetComboState } from '@/shared/utils/comboUtils';
import { useGameStateContext } from '@/contexts/GameStateContext';
import logger from '@/utils/logger';
import type { WordAcceptedPayload } from '@/shared/types/socket';
import type {
  SpamWarningPayload,
  SpamPenaltyPayload,
  SpamCooldownPayload,
  SpamCooldownEndPayload,
  WordBlockedByCooldownPayload
} from '@/shared/types/spam';

interface UsePlayerWordEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
  inputRef: RefObject<HTMLInputElement | null>;
  playComboSound: (level: number) => void;
  fireRoundActive?: boolean;

  // Word feedback state (local to PlayerView, not in GameState)
  setShowWordFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  setWordToVote: React.Dispatch<React.SetStateAction<any>>;

  // Combo refs and setters (TODO: refactor to use context actions)
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
  // Get foundWords state from context (no more prop drilling!)
  const { foundWords, setFoundWords } = useGameStateContext();
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

  useEffect(() => {
    if (!socket) return;

    const handleWordAccepted = (data: WordAcceptedPayload) => {
      // Dismiss any AI validation toast
      toast.dismiss(`ai-validating-${data.word.toLowerCase()}`);

      if (inputRef.current) {
        gsap.fromTo(inputRef.current,
          { scale: 1.1, borderColor: '#4ade80' },
          { scale: 1, borderColor: '', duration: 0.3 }
        );
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
          resetComboState(
            { comboLevelRef, lastWordTimeRef, comboTimeoutRef },
            { setComboLevel, setLastWordTime }
          );
        }, comboTimeout);
      } else {
        resetCombo();
      }

      // Note: WordFormingArea now handles word accepted feedback visually
      // Toast removed to avoid duplicate notifications
    };

    const handleWordNeedsValidation = (data: any) => {
      // Note: WordFormingArea now handles pending feedback visually
      resetCombo();
    };

    const handleWordValidatingWithAI = (data: any) => {
      wordAIValidatingToast(data.word, {
        aiValidatingLabel: t('playerView.aiValidating') || 'AI checking...',
        duration: 15000
      });
      logger.log('[PLAYER] AI is validating word:', data.word);
    };

    const handleWordAlreadyFound = (data: any) => {
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
    };

    const handleWordNotOnBoard = (data: any) => {
      // Note: WordFormingArea now handles rejected feedback visually
      setFoundWords(prev => prev.map(fw =>
        fw.word.toLowerCase() === data.word.toLowerCase()
          ? { ...fw, validated: false }
          : fw
      ));
      resetCombo();
    };

    const handleWordTooShort = (data: any) => {
      // Note: WordFormingArea now handles rejected feedback visually
      setFoundWords(prev => prev.filter(fw =>
        fw.word.toLowerCase() !== data.word.toLowerCase()
      ));
      resetCombo();
    };

    const handleWordRejected = (data: any) => {
      toast.dismiss(`ai-validating-${data.word.toLowerCase()}`);
      // Note: WordFormingArea now handles rejected feedback visually
      setFoundWords(prev => prev.filter(fw =>
        fw.word.toLowerCase() !== data.word.toLowerCase()
      ));
      resetCombo();
    };

    // Word feedback handlers
    const handleShowWordFeedback = (data: any) => {
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
    };

    const handleNoWordFeedback = () => {
      logger.log('[PLAYER] No word feedback needed');
      setShowWordFeedback(false);
      setWordToVote(null);
    };

    const handleVoteRecorded = (data: any) => {
      logger.log('[PLAYER] Vote recorded:', data);
      if (data.success) {
        neoSuccessToast(t('wordFeedback.thankYou') || 'Thanks for voting!', { icon: '✓', duration: 2000 });
      }
    };

    const handleWordBecameValid = (data: any) => {
      logger.log('[PLAYER] Word became valid:', data);
      neoInfoToast(`"${data.word}" ${t('wordFeedback.nowValid') || 'is now a valid word!'}`, { icon: '📖', duration: 3000 });
    };

    // Spam detection handlers
    const handleSpamWarning = (data: SpamWarningPayload) => {
      logger.warn('[SPAM] Warning received:', data);
      neoWarningToast(t('spam.warning') || 'Slow down! Too many invalid words', {
        icon: '⚠️',
        duration: 4000
      });
    };

    const handleSpamPenalty = (data: SpamPenaltyPayload) => {
      logger.warn('[SPAM] Penalty applied:', data);
      wordErrorToast(
        (t('spam.penalty') || 'Points deducted: -${points}').replace('${points}', String(data.pointsDeducted)),
        { duration: 4000 }
      );
      resetCombo();
    };

    const handleSpamCooldown = (data: SpamCooldownPayload) => {
      logger.warn('[SPAM] Cooldown started:', data);
      const seconds = Math.ceil(data.duration / 1000);
      wordErrorToast(
        (t('spam.cooldown') || 'Blocked for ${seconds}s - slow down!').replace('${seconds}', String(seconds)),
        { duration: data.duration }
      );
      resetCombo();
    };

    const handleSpamCooldownEnd = (data: SpamCooldownEndPayload) => {
      logger.log('[SPAM] Cooldown ended:', data);
      neoInfoToast(t('spam.cooldownEnd') || 'You can submit words again', {
        icon: '✓',
        duration: 2000
      });
    };

    const handleWordBlockedByCooldown = (data: WordBlockedByCooldownPayload) => {
      const seconds = Math.ceil(data.remainingMs / 1000);
      wordErrorToast(
        (t('spam.blockedWord') || 'Wait ${seconds}s before submitting').replace('${seconds}', String(seconds)),
        { duration: 2000 }
      );
    };

    // Register listeners
    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordValidatingWithAI', handleWordValidatingWithAI);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordTooShort', handleWordTooShort);
    socket.on('wordRejected', handleWordRejected);
    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('noWordFeedback', handleNoWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('wordBecameValid', handleWordBecameValid);

    // Spam detection listeners
    socket.on('spamWarning', handleSpamWarning);
    socket.on('spamPenalty', handleSpamPenalty);
    socket.on('spamCooldown', handleSpamCooldown);
    socket.on('spamCooldownEnd', handleSpamCooldownEnd);
    socket.on('wordBlockedByCooldown', handleWordBlockedByCooldown);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('wordValidatingWithAI', handleWordValidatingWithAI);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordTooShort', handleWordTooShort);
      socket.off('wordRejected', handleWordRejected);
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('noWordFeedback', handleNoWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('wordBecameValid', handleWordBecameValid);

      // Spam detection cleanup
      socket.off('spamWarning', handleSpamWarning);
      socket.off('spamPenalty', handleSpamPenalty);
      socket.off('spamCooldown', handleSpamCooldown);
      socket.off('spamCooldownEnd', handleSpamCooldownEnd);
      socket.off('wordBlockedByCooldown', handleWordBlockedByCooldown);
    };
    // setFoundWords is stable from context (wrapped in useCallback)
  }, [
    socket,
    t,
    inputRef,
    playComboSound,
    resetCombo,
    setFoundWords,
    setShowWordFeedback,
    setWordToVote,
    comboLevelRef,
    lastWordTimeRef,
    setComboLevel,
    setLastWordTime,
    comboTimeoutRef,
  ]);
}
