import Cookies from 'js-cookie';
import logger from '@/utils/logger';
import type { Session } from '@/types';

const SESSION_COOKIE_NAME = 'boggle_session';
const SESSION_EXPIRY_HOURS = 2; // Session expires after 2 hours

/**
 * Save the current game session to a cookie
 */
export const saveSession = (session: Omit<Session, 'timestamp'>): void => {
  const sessionData: Session = {
    gameCode: session.gameCode,
    username: session.username,
    isHost: session.isHost,
    roomName: session.roomName,
    language: session.language,
    timestamp: Date.now(),
  };

  Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    expires: SESSION_EXPIRY_HOURS / 24, // Convert hours to days
    sameSite: 'strict',
  });
};

/**
 * Get the saved session from cookie
 * @returns Session data or null if not found/expired
 */
export const getSession = (): Session | null => {
  try {
    const sessionCookie = Cookies.get(SESSION_COOKIE_NAME);
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
};

/**
 * Clear the session but preserve the username in localStorage for next join
 * This ensures smooth fallback to lobby with the username pre-filled
 * @param username - Optional username to preserve (will read from session if not provided)
 */
export const clearSessionPreservingUsername = (username?: string): void => {
  try {
    // Get the username from session if not provided
    const usernameToSave = username || getSession()?.username;

    // Save username to localStorage before clearing session
    if (usernameToSave && typeof window !== 'undefined') {
      localStorage.setItem('boggle_username', usernameToSave);
    }
  } catch (error) {
    logger.error('Error preserving username:', error);
  }

  // Clear the session cookie
  Cookies.remove(SESSION_COOKIE_NAME);
};

/**
 * Check if a valid session exists
 */
export const hasValidSession = (): boolean => {
  return getSession() !== null;
};
