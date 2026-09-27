import Cookies from 'js-cookie';
import logger from '@/utils/logger';
import type { Session } from '@/types';
import { clearRejoinIntent } from '@/utils/socketRejoin';

const SESSION_COOKIE_NAME = 'boggle_session';
const SESSION_EXPIRY_HOURS = 2; // Session expires after 2 hours

// Storage helper for incognito mode support
function saveToStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Storage blocked
    }
  }
}

/**
 * Save the current game session to a cookie
 */
export const saveSession = (session: Omit<Session, 'timestamp'>): void => {
  const sessionData: Session = {
    gameCode: session.gameCode,
    username: session.username,
    isHost: session.isHost,
    roomName: session.roomName,
    hostUsername: session.hostUsername,
    language: session.language,
    timestamp: Date.now(),
  };

  const serialized = JSON.stringify(sessionData);

  Cookies.set(SESSION_COOKIE_NAME, serialized, {
    expires: SESSION_EXPIRY_HOURS / 24, // Convert hours to days
    sameSite: 'strict',
  });

  // Also save to sessionStorage as fallback for iframe contexts (e.g. CrazyGames)
  // where third-party cookies may be blocked
  saveToStorage(SESSION_COOKIE_NAME, serialized);
};

/**
 * Get the saved session from cookie
 * @returns Session data or null if not found/expired
 */
export const getSession = (): Session | null => {
  try {
    // Try cookie first, fall back to sessionStorage (for iframe contexts like CrazyGames)
    let sessionCookie = Cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      try {
        sessionCookie = sessionStorage.getItem(SESSION_COOKIE_NAME) || undefined;
      } catch {
        // sessionStorage blocked
      }
    }
    if (!sessionCookie) return null;

    const session = JSON.parse(sessionCookie) as Session;

    // Check if session has expired (2 hours)
    const sessionAge = Date.now() - session.timestamp;
    const maxAge = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

    if (sessionAge > maxAge) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    logger.error('Error reading session cookie:', error);
    return null;
  }
};

/**
 * Clear the session cookie
 */
export const clearSession = (): void => {
  Cookies.remove(SESSION_COOKIE_NAME);
  try {
    sessionStorage.removeItem(SESSION_COOKIE_NAME);
    localStorage.removeItem(SESSION_COOKIE_NAME);
  } catch {
    // Storage blocked
  }
  // Drop the socket reconnect intent too — leaving the session must prevent any
  // later reconnect from re-joining this game.
  clearRejoinIntent();
};

/**
 * Clear the session but preserve the username in storage for next join
 * This ensures smooth fallback to lobby with the username pre-filled
 * @param username - Optional username to preserve (will read from session if not provided)
 */
export const clearSessionPreservingUsername = (username?: string): void => {
  try {
    // Get the username from session if not provided
    const usernameToSave = username || getSession()?.username;

    // Save username to both storages before clearing session
    if (usernameToSave) {
      saveToStorage('boggle_username', usernameToSave);
    }
  } catch (error) {
    logger.error('Error preserving username:', error);
  }

  // Clear the session from cookie AND storage (prevents auto-rejoin on reconnect)
  Cookies.remove(SESSION_COOKIE_NAME);
  try {
    sessionStorage.removeItem(SESSION_COOKIE_NAME);
    localStorage.removeItem(SESSION_COOKIE_NAME);
  } catch {
    // Storage blocked
  }
  // Same anti-rejoin guarantee for the socket reconnect intent.
  clearRejoinIntent();
};

