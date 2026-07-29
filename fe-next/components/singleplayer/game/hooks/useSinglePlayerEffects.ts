'use client';

import { useState, useEffect, useRef } from 'react';
import type { LetterGrid } from '@/shared/types/game';
import type { FoundWord } from '../types';
import { trackGameStart } from '@/utils/growthTracking';
import { useAuth } from '@/contexts/AuthContext';

interface UseSinglePlayerEffectsOptions {
  grid: LetterGrid | null;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  language: string;
  mode: string;
  isLandscape: boolean;
  isDesktop: boolean;
  isTv: boolean;
  remainingTime: number;
  gameActive: boolean;
  foundWords: FoundWord[];
  timerSeconds: number;
  trainingCompletedSkillsRef: React.RefObject<Set<string> | null>;
  trainingUpdateProgress: (data: {
    score: number;
    wordsFound: number;
    hasDiagonal: boolean;
    hasDirectionChange: boolean;
  }) => void;
  announceTimer: (time: number) => void;
  setGameActive: (active: boolean) => void;
  onQuit: () => void;
  t: (key: string) => string | undefined;
  isTypingModeRef: React.RefObject<boolean>;
  showHintPromptRef: React.RefObject<boolean>;
  setShowHintPrompt: (show: boolean) => void;
  setShowQuitConfirm: (show: boolean) => void;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
}

interface UseSinglePlayerEffectsReturn {
  showLandscapeTutorial: boolean;
  dismissLandscapeTutorial: () => void;
  lastWordFoundTimeRef: React.RefObject<number>;
  gameStartTimeRef: React.RefObject<number>;
}

/**
 * Side effects for single player game: heartbeat, landscape tutorial,
 * hint prompts, timer announcements, training progress, keyboard shortcuts.
 */
export function useSinglePlayerEffects({
  grid,
  isPaused,
  isGameOver,
  score,
  language,
  mode,
  isLandscape,
  isDesktop,
  isTv,
  remainingTime,
  gameActive,
  foundWords,
  timerSeconds: _timerSeconds,
  trainingCompletedSkillsRef,
  trainingUpdateProgress,
  announceTimer,
  setGameActive,
  onQuit,
  t: _t,
  isTypingModeRef,
  showHintPromptRef,
  setShowHintPrompt,
  setShowQuitConfirm,
  setIsPaused,
}: UseSinglePlayerEffectsOptions): UseSinglePlayerEffectsReturn {
  const [showLandscapeTutorial, setShowLandscapeTutorial] = useState(false);
  const lastWordFoundTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);

  const { user, profile } = useAuth();

  // Latest score in a ref so heartbeat can include it without re-running the
  // effect every score change.
  const heartbeatScoreRef = useRef(score);
  heartbeatScoreRef.current = score;

  // Game start time + analytics
  useEffect(() => {
    gameStartTimeRef.current = Date.now();
    trackGameStart('singleplayer', { subMode: mode, boardSize: grid?.length ?? 0 });
    // Mount-only — one event per game instance; remount = new game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set game active for sound context
  useEffect(() => {
    setGameActive(true);
    return () => setGameActive(false);
  }, [setGameActive]);

  // Heartbeat — includes identity so admins can see who is playing live.
  // Guests are tracked anonymously by sessionId; authed users include playerId
  // so the admin live view can deep-link to their profile.
  useEffect(() => {
    const sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
    const sendHeartbeat = async () => {
      try {
        const username = profile?.display_name || profile?.username || (typeof window !== 'undefined' ? window.localStorage?.getItem('guestUsername') ?? undefined : undefined);
        const avatar = profile
          ? {
              avatarImage: profile.avatar_image,
              customAvatar: profile.avatar_config ?? undefined,
              emoji: profile.avatar_emoji,
              color: profile.avatar_color,
            }
          : null;
        await fetch('/api/single-player/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            language,
            mode,
            username: username || 'Guest',
            avatar,
            playerId: user?.id ?? null,
            isAuthenticated: !!user,
            score: heartbeatScoreRef.current,
          }),
        });
      } catch {
        /* ignore */
      }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => {
      clearInterval(interval);
      fetch('/api/single-player/heartbeat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };
  }, [language, mode, user, profile]);

  // Landscape tutorial
  useEffect(() => {
    if (isLandscape && !isGameOver) {
      const hasSeenTutorial = localStorage.getItem('landscape-tutorial-seen');
      if (!hasSeenTutorial) setShowLandscapeTutorial(true);
    }
  }, [isLandscape, isGameOver]);

  // Hint prompt timer
  useEffect(() => {
    if (isPaused || isGameOver || !grid) return;
    if (lastWordFoundTimeRef.current === 0) lastWordFoundTimeRef.current = Date.now();
    const checkInactivity = setInterval(() => {
      if (Date.now() - lastWordFoundTimeRef.current >= 15000 && !showHintPromptRef.current) {
        setShowHintPrompt(true);
      }
    }, 5000);
    return () => clearInterval(checkInactivity);
  }, [isPaused, isGameOver, grid, showHintPromptRef, setShowHintPrompt]);

  // Timer announcements
  useEffect(() => {
    if (gameActive) announceTimer(remainingTime);
  }, [remainingTime, gameActive, announceTimer]);

  // Training progress updates
  const validWordsCount = foundWords.filter((fw) => fw.isValid === true).length;
  useEffect(() => {
    if (mode !== 'practice' || score < 15) return;
    const skillsRef = trainingCompletedSkillsRef.current;
    trainingUpdateProgress({
      score,
      wordsFound: validWordsCount,
      hasDiagonal: skillsRef?.has('diagonal') ?? false,
      hasDirectionChange: skillsRef?.has('directionChange') ?? false,
    });
  }, [score, mode, validWordsCount, trainingUpdateProgress, trainingCompletedSkillsRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const hasKeyboardLayout = isLandscape || isDesktop || isTv;
    if (!hasKeyboardLayout || isGameOver) return;
    function handleKeyPress(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape' && isTypingModeRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (score > 0) {
          setShowQuitConfirm(true);
        } else {
          onQuit();
        }
      } else if (e.key === ' ' && mode !== 'practice') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLandscape, isDesktop, isTv, isGameOver, score, mode, onQuit, isTypingModeRef, setShowQuitConfirm, setIsPaused]);

  function dismissLandscapeTutorial(): void {
    setShowLandscapeTutorial(false);
    localStorage.setItem('landscape-tutorial-seen', 'true');
  }

  return {
    showLandscapeTutorial,
    dismissLandscapeTutorial,
    lastWordFoundTimeRef,
    gameStartTimeRef,
  };
}
