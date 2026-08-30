/**
 * Session management for multiplayer games
 * Handles state restoration, auto-reconnect, and URL parameter parsing
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { getSession, clearSession, saveSession } from '@/utils/session';
import { getStoredUsername } from '@/utils/profileStorage';
import { getAvatarForName, getRandomDefaultNameWithAvatar } from '@/utils/defaultNames';
import logger from '@/utils/logger';
import { sanitizeGameCode } from '@/lib/multiplayer/sanitizeGameCode';
import { shouldLoadLessonData } from '@/lib/education/classroomGameHandoff';
import type { Language, GameMode } from '@/shared/types/game';

interface LessonData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: Language;
  gameMode?: GameMode;
  templateSettings?: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  } | null;
}

interface UseMultiplayerSessionOptions {
  language: Language;
  socket: Socket | null;
  isConnected: boolean;
  isActive: boolean;
  attemptingReconnect: boolean;
  username: string;
  profile: any;
  usernameManuallySetRef: React.MutableRefObject<boolean>;
  hasSetRandomNameRef: React.MutableRefObject<boolean>;
  onSetGameCode: (code: string) => void;
  onSetUsername: (name: string) => void;
  onSetRoomName: (name: string) => void;
  onSetGuestAvatar: (avatar: { emoji: string; color: string }) => void;
  onSetAttemptingReconnect: (value: boolean) => void;
  onSetRoomLanguage: (lang: Language | null) => void;
  onSetLessonData: (data: LessonData | null) => void;
  t: (key: string) => string;
}

interface UseMultiplayerSessionReturn {
  shouldAutoJoin: boolean;
  setShouldAutoJoin: (value: boolean) => void;
  prefilledRoomCode: string;
  setPrefilledRoomCode: (value: string) => void;
  lessonData: LessonData | null;
}

/**
 * Manages session restoration and auto-join from URL parameters
 */
export function useMultiplayerSession(
  options: UseMultiplayerSessionOptions
): UseMultiplayerSessionReturn {
  const {
    language,
    socket,
    isConnected,
    isActive,
    attemptingReconnect,
    username,
    profile,
    usernameManuallySetRef,
    hasSetRandomNameRef,
    onSetGameCode,
    onSetUsername,
    onSetRoomName,
    onSetGuestAvatar,
    onSetAttemptingReconnect,
    onSetRoomLanguage,
    onSetLessonData,
    t,
  } = options;

  const [shouldAutoJoin, setShouldAutoJoin] = useState(false);
  const [prefilledRoomCode, setPrefilledRoomCode] = useState('');
  const [lessonData, setLessonData] = useState<LessonData | null>(null);

  // Sync lesson data with parent
  useEffect(() => {
    onSetLessonData(lessonData);
  }, [lessonData, onSetLessonData]);

  // Initialize state from URL and session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      // Share-links/deeplinks can carry a stray char (?room=JPX9SL\) that
      // would fail the backend's alphanumeric GameCodeSchema — strip it at the
      // source so the prefilled code displays and joins cleanly (Sentry 1NE).
      const rawRoomFromUrl = urlParams.get('room');
      const roomFromUrl = rawRoomFromUrl ? sanitizeGameCode(rawRoomFromUrl) : rawRoomFromUrl;
      // A teacher-launched classroom room arrives as `?classroom=true`; the
      // legacy lesson deeplink used `?fromLesson=true`. Gating on fromLesson
      // alone silently dropped every classroom game's vocabulary and mode.
      const fromLesson = shouldLoadLessonData(window.location.search);
      logger.log(
        '[Init] URL search:',
        window.location.search,
        '| roomFromUrl:',
        roomFromUrl,
        '| fromLesson:',
        fromLesson
      );
      const savedUsername = getStoredUsername() || '';
      const savedSession = getSession();

      // Check for lesson data from teacher dashboard
      if (fromLesson) {
        try {
          const storedLessonData = sessionStorage.getItem('lessonGameData');
          if (storedLessonData) {
            const parsed = JSON.parse(storedLessonData);

            // Validate that parsed data has required fields
            // Fixes JAVASCRIPT-NEXTJS-ET: Failed to parse lesson data: {}
            if (!parsed || typeof parsed !== 'object') {
              logger.warn('[LESSON] Lesson data is not an object:', typeof parsed);
              sessionStorage.removeItem('lessonGameData');
            } else if (!parsed.lessonId || !parsed.lessonName || !Array.isArray(parsed.vocabularyWords)) {
              logger.warn('[LESSON] Lesson data missing required fields:', {
                hasLessonId: !!parsed.lessonId,
                hasLessonName: !!parsed.lessonName,
                hasVocabularyWords: Array.isArray(parsed.vocabularyWords),
              });
              sessionStorage.removeItem('lessonGameData');
            } else {
              logger.log(
                '[LESSON] Loaded lesson data:',
                parsed.lessonName,
                'with',
                parsed.vocabularyWords?.length,
                'words'
              );
              setLessonData(parsed);
              if (parsed.language) {
                onSetRoomLanguage(parsed.language as Language);
              }
            }
          }
        } catch (err) {
          logger.error('[LESSON] Failed to parse lesson data:', err instanceof Error ? err.message : String(err));
          // Clean up invalid data to prevent repeated errors
          try {
            sessionStorage.removeItem('lessonGameData');
          } catch {
            // Ignore sessionStorage errors
          }
        }
      }

      // Skip auto-join if the player just intentionally exited
      let intentionalExit = false;
      try {
        intentionalExit = !!sessionStorage.getItem('boggle_intentional_exit');
      } catch { /* storage blocked */ }

      let joiningNewRoomViaInvitation = false;
      const hasSession = savedSession && savedSession.gameCode;

      if (roomFromUrl && !intentionalExit) {
        logger.log('[Init] Setting prefilledRoomCode to:', roomFromUrl);
        onSetGameCode(roomFromUrl);
        setPrefilledRoomCode(roomFromUrl);
        if (savedSession?.gameCode && savedSession.gameCode !== roomFromUrl) {
          clearSession();
          joiningNewRoomViaInvitation = true;
        }
        if (savedUsername && savedUsername.trim()) {
          onSetUsername(savedUsername);
          setShouldAutoJoin(true);
        }
      } else if (hasSession && !intentionalExit) {
        // Only auto-reconnect if this is a page refresh
        const isPageRefresh = (() => {
          try {
            const navEntries = performance.getEntriesByType(
              'navigation'
            ) as PerformanceNavigationTiming[];
            const firstEntry = navEntries[0];
            if (firstEntry) {
              return firstEntry.type === 'reload';
            }
            return performance.navigation?.type === 1;
          } catch {
            return false;
          }
        })();

        // Tight freshness window: only silent-rejoin if the saved session
        // was active in the last 5 minutes. Outside that window we treat
        // the user as having "moved on" — the session expiry is 2h, but
        // 2h is way too long to dump someone back into a game they forgot
        // about. Stale sessions just get cleared; if they want to rejoin
        // they'll see the room list.
        const FRESH_REJOIN_WINDOW_MS = 5 * 60 * 1000;
        const sessionAgeMs = savedSession.timestamp
          ? Date.now() - savedSession.timestamp
          : Number.POSITIVE_INFINITY;
        const isFresh = sessionAgeMs < FRESH_REJOIN_WINDOW_MS;

        if (isPageRefresh && isFresh) {
          onSetGameCode(savedSession.gameCode);
          onSetAttemptingReconnect(true);
        } else {
          logger.log('[Init] Skipping auto-rejoin — refresh:', isPageRefresh, 'fresh:', isFresh);
          clearSession();
        }
      } else if (hasSession && intentionalExit) {
        logger.log('[Init] Intentional exit detected, clearing session');
        clearSession();
      }

      if (intentionalExit) {
        try {
          sessionStorage.removeItem('boggle_intentional_exit');
        } catch { /* storage blocked */ }
      }

      if (roomFromUrl && savedUsername) {
        onSetGuestAvatar(getAvatarForName(savedUsername));
        usernameManuallySetRef.current = true;
      } else if (joiningNewRoomViaInvitation) {
        if (savedUsername) {
          onSetUsername(savedUsername);
          onSetGuestAvatar(getAvatarForName(savedUsername));
          usernameManuallySetRef.current = true;
        } else {
          const { name, avatar } = getRandomDefaultNameWithAvatar(language);
          onSetUsername(name);
          onSetGuestAvatar(avatar);
        }
      } else if (savedSession?.username) {
        onSetUsername(savedSession.username);
        onSetGuestAvatar(getAvatarForName(savedSession.username));
        usernameManuallySetRef.current = true;
      } else if (savedUsername) {
        onSetUsername(savedUsername);
        onSetGuestAvatar(getAvatarForName(savedUsername));
        usernameManuallySetRef.current = true;
      }

      if (!joiningNewRoomViaInvitation && savedSession?.roomName) {
        onSetRoomName(savedSession.roomName);
      }
    };

    Promise.resolve().then(initializeState);
  }, [
    language,
    onSetGameCode,
    onSetUsername,
    onSetRoomName,
    onSetGuestAvatar,
    onSetAttemptingReconnect,
    onSetRoomLanguage,
    usernameManuallySetRef,
    hasSetRandomNameRef,
  ]);

  // Auto-join effect
  useEffect(() => {
    if (!shouldAutoJoin || !socket || !isConnected || isActive || attemptingReconnect) {
      return;
    }

    if (prefilledRoomCode && username && username.trim()) {
      const autoJoinTimeout = setTimeout(() => {
        if (socket && socket.connected && !isActive) {
          logger.log('[AUTO-JOIN] Auto-joining room:', prefilledRoomCode);
          // Note: Actual join emission is handled by parent component's handleJoin
          setShouldAutoJoin(false);
        }
      }, 200);
      return () => clearTimeout(autoJoinTimeout);
    }
    return undefined;
  }, [shouldAutoJoin, prefilledRoomCode, username, isActive, attemptingReconnect, socket, isConnected]);

  // Session reconnection
  useEffect(() => {
    if (!attemptingReconnect || !socket || !isConnected || isActive) {
      return;
    }

    const savedSession = getSession();
    if (!savedSession?.gameCode) {
      Promise.resolve().then(() => onSetAttemptingReconnect(false));
      return;
    }

    // Check if session is too old — align with server's PLAYER_RECONNECTION_GRACE_PERIOD (120s)
    const sessionAge = Date.now() - savedSession.timestamp;
    const maxInactivity = 2 * 60 * 1000; // 2 minutes (matches server grace period)

    if (sessionAge > maxInactivity) {
      logger.log('[SESSION] Session too old for auto-reconnect, clearing session');
      clearSession();
      Promise.resolve().then(() => onSetAttemptingReconnect(false));
      return;
    }

    const reconnectTimeout = setTimeout(() => {
      logger.log('[SESSION] Auto-reconnecting to saved session:', savedSession.gameCode);
      // Note: Actual reconnection emission is handled by socket hook's connect event
    }, 500);

    return () => clearTimeout(reconnectTimeout);
  }, [attemptingReconnect, isActive, socket, isConnected, language, onSetAttemptingReconnect]);

  return {
    shouldAutoJoin,
    setShouldAutoJoin,
    prefilledRoomCode,
    setPrefilledRoomCode,
    lessonData,
  };
}
