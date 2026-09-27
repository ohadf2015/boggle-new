'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * GameAnnouncer - Accessibility component for screen reader announcements
 *
 * Provides aria-live regions for announcing game events to screen readers:
 * - Word validation results ("Word validated: 8 points")
 * - Combo milestones ("Combo level 3!")
 * - Game state changes ("Game started", "Game ended")
 * - Connection status changes
 */

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  announceWordResult: (word: string, isValid: boolean, score?: number, reason?: string) => void;
  announceCombo: (level: number) => void;
  announceGameState: (state: 'started' | 'ended' | 'paused' | 'resumed') => void;
  announceConnection: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  announceLeaderboard: (playerName: string, position: number, score: number) => void;
  announcePlayerJoin: (playerName: string) => void;
  announcePlayerLeave: (playerName: string) => void;
  announceTimer: (secondsRemaining: number) => void;
  announceScoreUpdate: (newScore: number, delta: number) => void;
  announceRoundStart: (roundNumber: number, totalRounds: number) => void;
  announceRoundEnd: (roundNumber: number, playerRank: number) => void;
  announceFireRound: (isStart: boolean) => void;
  announceEarthquake: (phase: 'warning' | 'shaking' | 'complete') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

// No-op fallback for when hook is used outside provider
const noopAnnouncer: AnnouncerContextType = {
  announce: () => {},
  announceWordResult: () => {},
  announceCombo: () => {},
  announceGameState: () => {},
  announceConnection: () => {},
  announceLeaderboard: () => {},
  announcePlayerJoin: () => {},
  announcePlayerLeave: () => {},
  announceTimer: () => {},
  announceScoreUpdate: () => {},
  announceRoundStart: () => {},
  announceRoundEnd: () => {},
  announceFireRound: () => {},
  announceEarthquake: () => {},
};

export const useAnnouncer = (): AnnouncerContextType => {
  const context = useContext(AnnouncerContext);
  if (!context) {
    // Return no-op functions if not within provider
    return noopAnnouncer;
  }
  return context;
};

interface GameAnnouncerProviderProps {
  children: React.ReactNode;
}

export const GameAnnouncerProvider: React.FC<GameAnnouncerProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');

  // Ref to track last announced combo level to avoid duplicate announcements
  const lastComboRef = useRef<number>(0);

  // Clear messages after they've been announced
  useEffect(() => {
    if (politeMessage) {
      const timer = setTimeout(() => setPoliteMessage(''), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [politeMessage]);

  useEffect(() => {
    if (assertiveMessage) {
      const timer = setTimeout(() => setAssertiveMessage(''), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [assertiveMessage]);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage(message);
    } else {
      setPoliteMessage(message);
    }
  }, []);

  const announceWordResult = useCallback((
    word: string,
    isValid: boolean,
    score?: number,
    reason?: string
  ) => {
    if (isValid) {
      const scoreText = score ? `, ${score} points` : '';
      announce(`Word accepted: ${word}${scoreText}`);
    } else {
      const reasonText = reason ? `: ${reason}` : '';
      announce(`Word rejected: ${word}${reasonText}`, 'assertive');
    }
  }, [announce]);

  const announceCombo = useCallback((level: number) => {
    // Only announce at milestone levels (3, 5, 7, 10, etc.)
    const milestones = [3, 5, 7, 10, 15, 20, 25, 30];
    if (milestones.includes(level) && level > lastComboRef.current) {
      lastComboRef.current = level;
      const excitement = level >= 10 ? '!' : level >= 7 ? '!' : '';
      announce(`Combo level ${level}${excitement}`, level >= 10 ? 'assertive' : 'polite');
    } else if (level < lastComboRef.current) {
      // Reset tracking when combo drops
      lastComboRef.current = level;
    }
  }, [announce]);

  const announceGameState = useCallback((state: 'started' | 'ended' | 'paused' | 'resumed') => {
    const messages = {
      started: 'Game started! Find words in the grid.',
      ended: 'Game ended.',
      paused: 'Game paused.',
      resumed: 'Game resumed.',
    };
    announce(messages[state], state === 'started' || state === 'ended' ? 'assertive' : 'polite');
  }, [announce]);

  const announceConnection = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
    const messages = {
      connected: 'Connected to game server.',
      disconnected: 'Disconnected from game server.',
      reconnecting: 'Reconnecting to game server...',
    };
    announce(messages[status], status === 'disconnected' ? 'assertive' : 'polite');
  }, [announce]);

  const announceLeaderboard = useCallback((playerName: string, position: number, score: number) => {
    // Only announce significant position changes (top 3)
    if (position <= 3) {
      const ordinal = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd';
      announce(`${playerName} is now in ${ordinal} place with ${score} points`);
    }
  }, [announce]);

  const announcePlayerJoin = useCallback((playerName: string) => {
    announce(`${playerName} joined the game`);
  }, [announce]);

  const announcePlayerLeave = useCallback((playerName: string) => {
    announce(`${playerName} left the game`);
  }, [announce]);

  const announceTimer = useCallback((secondsRemaining: number) => {
    // Only announce at key intervals: 60, 30, 10, 5, 3, 2, 1
    const urgentTimes = [60, 30, 10, 5, 3, 2, 1];
    if (urgentTimes.includes(secondsRemaining)) {
      const priority = secondsRemaining <= 10 ? 'assertive' : 'polite';
      announce(`${secondsRemaining} seconds remaining`, priority);
    }
  }, [announce]);

  const announceScoreUpdate = useCallback((newScore: number, delta: number) => {
    if (delta > 0) {
      announce(`Plus ${delta} points. Total: ${newScore}`);
    }
  }, [announce]);

  const announceRoundStart = useCallback((roundNumber: number, totalRounds: number) => {
    announce(`Round ${roundNumber} of ${totalRounds} starting`, 'assertive');
  }, [announce]);

  const announceRoundEnd = useCallback((roundNumber: number, playerRank: number) => {
    announce(`Round ${roundNumber} complete. You finished in position ${playerRank}`);
  }, [announce]);

  const announceFireRound = useCallback((isStart: boolean) => {
    if (isStart) {
      announce('Fire round! Double points for 15 seconds!', 'assertive');
    } else {
      announce('Fire round ended');
    }
  }, [announce]);

  const announceEarthquake = useCallback((phase: 'warning' | 'shaking' | 'complete') => {
    const messages = {
      warning: 'Earthquake warning! Grid will shuffle in 3 seconds',
      shaking: 'Earthquake! Grid shuffling now',
      complete: 'Earthquake complete. New grid available',
    };
    announce(messages[phase], phase === 'warning' ? 'assertive' : 'polite');
  }, [announce]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue: AnnouncerContextType = useMemo(() => ({
    announce,
    announceWordResult,
    announceCombo,
    announceGameState,
    announceConnection,
    announceLeaderboard,
    announcePlayerJoin,
    announcePlayerLeave,
    announceTimer,
    announceScoreUpdate,
    announceRoundStart,
    announceRoundEnd,
    announceFireRound,
    announceEarthquake,
  }), [
    announce,
    announceWordResult,
    announceCombo,
    announceGameState,
    announceConnection,
    announceLeaderboard,
    announcePlayerJoin,
    announcePlayerLeave,
    announceTimer,
    announceScoreUpdate,
    announceRoundStart,
    announceRoundEnd,
    announceFireRound,
    announceEarthquake,
  ]);

  return (
    <AnnouncerContext.Provider value={contextValue}>
      {children}

      {/* Polite announcements - used for most updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements - used for important/urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
};

export default GameAnnouncerProvider;
