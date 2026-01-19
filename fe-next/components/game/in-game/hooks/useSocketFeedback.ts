'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { WordFeedback } from '../../WordFormingArea';
import type { TranslationFn } from '../types';

interface UseSocketFeedbackOptions {
  socket: Socket | null;
  isPlaying: boolean;
  t: TranslationFn;
  setCurrentFeedback: (feedback: WordFeedback | null) => void;
  setLastWordFoundTime: (time: number) => void;
}

/**
 * Hook for handling socket word feedback events
 */
export function useSocketFeedback(options: UseSocketFeedbackOptions): void {
  const { socket, isPlaying, t, setCurrentFeedback, setLastWordFoundTime } = options;

  useEffect(() => {
    if (!socket || !isPlaying) return;

    const handleWordAccepted = (data: {
      word: string;
      score: number;
      comboLevel?: number;
      fireRoundActive?: boolean;
      fireRoundBonus?: number;
    }): void => {
      // Track when the last word was found for inactivity-based trail visibility
      setLastWordFoundTime(Date.now());
      setCurrentFeedback({
        id: `accepted-${Date.now()}`,
        type: 'accepted',
        word: data.word,
        score: data.score,
        fireRoundActive: data.fireRoundActive,
        fireRoundBonus: data.fireRoundBonus,
        timestamp: Date.now(),
      });
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

    const handleWordNeedsValidation = (data: { word: string; message?: string }): void => {
      setCurrentFeedback({
        id: `pending-${Date.now()}`,
        type: 'pending',
        word: data.word,
        message: data.message || t('playerView.pendingValidation') || 'Pending validation',
        timestamp: Date.now(),
      });
    };

    const handleWordRejected = (data: { word: string; reason?: string }): void => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: data.reason || t('playerView.invalidWord') || 'Invalid word',
        timestamp: Date.now(),
      });
    };

    const handleWordNotOnBoard = (data: { word: string }): void => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t('playerView.wordNotOnBoard') || 'Not on board',
        timestamp: Date.now(),
      });
    };

    const handleWordTooShort = (data: { word: string; minLength?: number }): void => {
      setCurrentFeedback({
        id: `rejected-${Date.now()}`,
        type: 'rejected',
        word: data.word,
        message: t('playerView.wordTooShort') || 'Too short',
        timestamp: Date.now(),
      });
    };

    const handleWordAlreadyFoundByOther = (data: {
      word: string;
      foundBy: string;
      foundByAvatar?: { emoji?: string; color?: string; avatarImage?: string } | null;
    }): void => {
      setCurrentFeedback({
        id: `foundByOther-${Date.now()}`,
        type: 'foundByOther',
        word: data.word,
        message:
          t('playerView.foundByOther')?.replace('${player}', data.foundBy) ||
          `Found by ${data.foundBy}`,
        foundBy: data.foundBy,
        foundByAvatar: data.foundByAvatar,
        timestamp: Date.now(),
      });
    };

    socket.on('wordAccepted', handleWordAccepted);
    socket.on('wordAlreadyFound', handleWordAlreadyFound);
    socket.on('wordAlreadyFoundByOther', handleWordAlreadyFoundByOther);
    socket.on('wordNeedsValidation', handleWordNeedsValidation);
    socket.on('wordRejected', handleWordRejected);
    socket.on('wordNotOnBoard', handleWordNotOnBoard);
    socket.on('wordTooShort', handleWordTooShort);

    return () => {
      socket.off('wordAccepted', handleWordAccepted);
      socket.off('wordAlreadyFound', handleWordAlreadyFound);
      socket.off('wordAlreadyFoundByOther', handleWordAlreadyFoundByOther);
      socket.off('wordNeedsValidation', handleWordNeedsValidation);
      socket.off('wordRejected', handleWordRejected);
      socket.off('wordNotOnBoard', handleWordNotOnBoard);
      socket.off('wordTooShort', handleWordTooShort);
    };
  }, [socket, isPlaying, t, setCurrentFeedback, setLastWordFoundTime]);
}
