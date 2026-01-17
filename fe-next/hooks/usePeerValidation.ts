'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../utils/SocketContext';
import type {
  PeerValidationRequestPayload,
  PeerVoteRecordedPayload,
  PeerValidationResultPayload,
} from '@/shared/types/socket';

export interface PeerValidationState {
  /** Current word being validated (null if no active validation) */
  currentWord: PeerValidationRequestPayload | null;
  /** Whether the user has already voted */
  hasVoted: boolean;
  /** Recent validation results (word rejections) */
  recentResults: PeerValidationResultPayload[];
  /** Whether the current user's word was rejected */
  myWordRejected: PeerValidationResultPayload | null;
  /** Time remaining for voting (seconds) */
  timeRemaining: number | null;
}

export interface UsePeerValidationReturn extends PeerValidationState {
  /** Submit a vote for the current word */
  submitVote: (isValid: boolean) => void;
  /** Clear the current validation request */
  clearCurrentWord: () => void;
  /** Dismiss a result notification */
  dismissResult: (word: string) => void;
  /** Clear my word rejected notification */
  clearMyWordRejected: () => void;
}

/**
 * Hook to handle peer validation events in multiplayer games.
 * Listens for validation requests, records votes, and shows results.
 *
 * @param username - Current user's username (to detect if their word was rejected)
 * @param gameCode - Current game code
 */
export function usePeerValidation(
  username: string | null,
  gameCode: string | null
): UsePeerValidationReturn {
  const { socket } = useSocket();
  const [currentWord, setCurrentWord] = useState<PeerValidationRequestPayload | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [recentResults, setRecentResults] = useState<PeerValidationResultPayload[]>([]);
  const [myWordRejected, setMyWordRejected] = useState<PeerValidationResultPayload | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle peer validation request
  useEffect(() => {
    if (!socket) return;

    const handleValidationRequest = (data: PeerValidationRequestPayload) => {
      // Only show if for current game and not our own word
      if (data.gameCode !== gameCode) return;
      if (data.submittedBy === username) return;

      setCurrentWord(data);
      setHasVoted(false);
      setTimeRemaining(data.timeoutSeconds);

      // Start countdown timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setCurrentWord(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleVoteRecorded = (data: PeerVoteRecordedPayload) => {
      if (data.success) {
        setHasVoted(true);
      }
    };

    const handleValidationResult = (data: PeerValidationResultPayload) => {
      // Clear current word if it matches
      if (currentWord?.word === data.word) {
        setCurrentWord(null);
        setTimeRemaining(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }

      // Check if it's the current user's word that was rejected
      if (data.rejected && data.submitter === username) {
        setMyWordRejected(data);
      }

      // Add to recent results (keep last 5)
      setRecentResults((prev) => {
        const newResults = [data, ...prev].slice(0, 5);
        return newResults;
      });
    };

    socket.on('peerValidationRequest', handleValidationRequest);
    socket.on('peerVoteRecorded', handleVoteRecorded);
    socket.on('peerValidationResult', handleValidationResult);

    return () => {
      socket.off('peerValidationRequest', handleValidationRequest);
      socket.off('peerVoteRecorded', handleVoteRecorded);
      socket.off('peerValidationResult', handleValidationResult);
    };
  }, [socket, username, gameCode, currentWord?.word]);

  const submitVote = useCallback(
    (isValid: boolean) => {
      if (!socket || !currentWord || hasVoted) return;

      socket.emit('submitPeerValidationVote', {
        word: currentWord.word,
        isValid,
        gameCode: currentWord.gameCode,
      });
    },
    [socket, currentWord, hasVoted]
  );

  const clearCurrentWord = useCallback(() => {
    setCurrentWord(null);
    setTimeRemaining(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const dismissResult = useCallback((word: string) => {
    setRecentResults((prev) => prev.filter((r) => r.word !== word));
  }, []);

  const clearMyWordRejected = useCallback(() => {
    setMyWordRejected(null);
  }, []);

  return {
    currentWord,
    hasVoted,
    recentResults,
    myWordRejected,
    timeRemaining,
    submitVote,
    clearCurrentWord,
    dismissResult,
    clearMyWordRejected,
  };
}
