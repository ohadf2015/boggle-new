/**
 * Cross-tab authentication synchronization utility
 *
 * Uses BroadcastChannel for immediate cross-tab communication with localStorage fallback
 * for browsers that don't support BroadcastChannel or when running in same tab.
 */

import logger from '@/utils/logger';

// Channel name for auth-related broadcasts
const AUTH_CHANNEL_NAME = 'lexiclash_auth_sync';

// Storage key for fallback mechanism
const AUTH_SYNC_STORAGE_KEY = 'lexiclash_auth_sync_event';

// Auth sync message types
export type AuthSyncMessageType =
  | 'AUTH_SUCCESS'      // Authentication completed successfully
  | 'AUTH_FAILED'       // Authentication failed
  | 'SIGNED_OUT'        // User signed out
  | 'SESSION_REFRESHED' // Session was refreshed
  | 'CODE_LOCK_ACQUIRED' // Auth code lock acquired by this tab
  | 'CODE_LOCK_RELEASED'; // Auth code lock released

export interface AuthSyncMessage {
  type: AuthSyncMessageType;
  timestamp: number;
  tabId: string;
  payload?: {
    userId?: string;
    error?: string;
    code?: string;
  };
}

// Generate a unique tab ID
const TAB_ID = typeof window !== 'undefined'
  ? `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  : 'server';

// BroadcastChannel instance (created lazily)
let broadcastChannel: BroadcastChannel | null = null;

// Message handlers
const messageHandlers: Set<(message: AuthSyncMessage) => void> = new Set();

// Track if we've initialized
let isInitialized = false;

/**
 * Initialize the cross-tab sync system
 */
export function initCrossTabAuthSync(): void {
  if (typeof window === 'undefined' || isInitialized) return;

  isInitialized = true;

  // Try to create BroadcastChannel
  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);

      broadcastChannel.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
        handleIncomingMessage(event.data);
      };

      broadcastChannel.onmessageerror = () => {
        logger.warn('CrossTabAuthSync: Message error on BroadcastChannel');
      };

      logger.debug('CrossTabAuthSync: Initialized with BroadcastChannel');
    }
  } catch (err) {
    logger.warn('CrossTabAuthSync: BroadcastChannel not available, using storage fallback');
  }

  // Always set up storage event listener as fallback
  window.addEventListener('storage', handleStorageEvent);
}

/**
 * Clean up the cross-tab sync system
 */
export function destroyCrossTabAuthSync(): void {
  if (typeof window === 'undefined') return;

  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }

  window.removeEventListener('storage', handleStorageEvent);
  messageHandlers.clear();
  isInitialized = false;
}

/**
 * Handle incoming BroadcastChannel messages
 */
function handleIncomingMessage(message: AuthSyncMessage): void {
  // Ignore messages from this tab
  if (message.tabId === TAB_ID) return;

  logger.debug(`CrossTabAuthSync: Received ${message.type} from ${message.tabId}`);

  // Notify all handlers
  messageHandlers.forEach(handler => {
    try {
      handler(message);
    } catch (err) {
      logger.error('CrossTabAuthSync: Handler error:', err);
    }
  });
}

/**
 * Handle storage events (fallback for BroadcastChannel)
 */
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== AUTH_SYNC_STORAGE_KEY || !event.newValue) return;

  try {
    const message: AuthSyncMessage = JSON.parse(event.newValue);
    handleIncomingMessage(message);
  } catch (err) {
    logger.warn('CrossTabAuthSync: Failed to parse storage event:', err);
  }
}

/**
 * Broadcast a message to other tabs
 */
export function broadcastAuthMessage(
  type: AuthSyncMessageType,
  payload?: AuthSyncMessage['payload']
): void {
  if (typeof window === 'undefined') return;

  const message: AuthSyncMessage = {
    type,
    timestamp: Date.now(),
    tabId: TAB_ID,
    payload,
  };

  logger.debug(`CrossTabAuthSync: Broadcasting ${type}`);

  // Send via BroadcastChannel if available
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (err) {
      logger.warn('CrossTabAuthSync: BroadcastChannel send failed:', err);
    }
  }

  // Also write to localStorage for fallback (triggers storage event in other tabs)
  try {
    localStorage.setItem(AUTH_SYNC_STORAGE_KEY, JSON.stringify(message));
    // Clear immediately to allow subsequent events
    localStorage.removeItem(AUTH_SYNC_STORAGE_KEY);
  } catch (err) {
    // localStorage might not be available in some contexts
    logger.debug('CrossTabAuthSync: localStorage fallback failed:', err);
  }
}

/**
 * Subscribe to auth sync messages
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToAuthSync(
  handler: (message: AuthSyncMessage) => void
): () => void {
  messageHandlers.add(handler);

  // Ensure sync is initialized
  initCrossTabAuthSync();

  return () => {
    messageHandlers.delete(handler);
  };
}

/**
 * Get the current tab ID
 */
export function getCurrentTabId(): string {
  return TAB_ID;
}

/**
 * Broadcast that auth was successful
 */
export function broadcastAuthSuccess(userId: string): void {
  broadcastAuthMessage('AUTH_SUCCESS', { userId });
}

/**
 * Broadcast that auth failed
 */
export function broadcastAuthFailed(error?: string): void {
  broadcastAuthMessage('AUTH_FAILED', { error });
}

/**
 * Broadcast that user signed out
 */
export function broadcastSignedOut(): void {
  broadcastAuthMessage('SIGNED_OUT');
}

/**
 * Broadcast that session was refreshed
 */
export function broadcastSessionRefreshed(userId: string): void {
  broadcastAuthMessage('SESSION_REFRESHED', { userId });
}

// --- Auth Code Lock with Cross-Tab Coordination ---

const AUTH_CODE_LOCK_KEY = 'boggle_auth_code_lock';
const AUTH_CODE_LOCK_TIMEOUT = 15000; // 15 seconds

interface CodeLock {
  code: string;
  tabId: string;
  timestamp: number;
}

/**
 * Try to acquire lock for an auth code
 * Uses atomic check-and-set pattern to prevent race conditions
 * @returns true if lock was acquired, false if another tab has the lock
 */
export function tryAcquireCodeLock(code: string): boolean {
  try {
    const now = Date.now();
    const existingLockData = localStorage.getItem(AUTH_CODE_LOCK_KEY);

    if (existingLockData) {
      const existingLock: CodeLock = JSON.parse(existingLockData);

      // Check if existing lock is for this code and still valid
      if (existingLock.code === code && now - existingLock.timestamp < AUTH_CODE_LOCK_TIMEOUT) {
        // Lock exists and is valid
        if (existingLock.tabId === TAB_ID) {
          // We already have the lock
          return true;
        }
        // Another tab has the lock
        return false;
      }
      // Lock is stale or for different code, clear it
    }

    // Attempt to acquire lock
    const newLock: CodeLock = {
      code,
      tabId: TAB_ID,
      timestamp: now,
    };
    localStorage.setItem(AUTH_CODE_LOCK_KEY, JSON.stringify(newLock));

    // Double-check to handle race condition:
    // Read back immediately to verify we actually got the lock
    // (another tab might have written in the microseconds between)
    const verifyData = localStorage.getItem(AUTH_CODE_LOCK_KEY);
    if (verifyData) {
      const verifyLock: CodeLock = JSON.parse(verifyData);
      if (verifyLock.tabId === TAB_ID) {
        // We got the lock
        broadcastAuthMessage('CODE_LOCK_ACQUIRED', { code });
        return true;
      }
      // Another tab won the race
      return false;
    }

    // Lock was removed (shouldn't happen), try again
    return false;
  } catch (err) {
    logger.debug('CrossTabAuthSync: Failed to acquire code lock:', err);
    // On error, proceed (better UX than blocking)
    return true;
  }
}

/**
 * Check if a code is locked by another tab
 */
export function isCodeLockedByOther(code: string): boolean {
  try {
    const lockData = localStorage.getItem(AUTH_CODE_LOCK_KEY);
    if (!lockData) return false;

    const lock: CodeLock = JSON.parse(lockData);
    const now = Date.now();

    // Check if lock is for this code, still valid, and owned by another tab
    return (
      lock.code === code &&
      now - lock.timestamp < AUTH_CODE_LOCK_TIMEOUT &&
      lock.tabId !== TAB_ID
    );
  } catch {
    return false;
  }
}

/**
 * Release the auth code lock
 */
export function releaseCodeLock(): void {
  try {
    const lockData = localStorage.getItem(AUTH_CODE_LOCK_KEY);
    if (lockData) {
      const lock: CodeLock = JSON.parse(lockData);
      // Only release if we own the lock
      if (lock.tabId === TAB_ID) {
        localStorage.removeItem(AUTH_CODE_LOCK_KEY);
        broadcastAuthMessage('CODE_LOCK_RELEASED', { code: lock.code });
      }
    }
  } catch (err) {
    logger.debug('CrossTabAuthSync: Failed to release code lock:', err);
    // Try to remove anyway
    try {
      localStorage.removeItem(AUTH_CODE_LOCK_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Get info about the current lock holder (if any)
 */
export function getCodeLockInfo(code: string): { isLocked: boolean; isOwnedByUs: boolean; tabId: string | null } {
  try {
    const lockData = localStorage.getItem(AUTH_CODE_LOCK_KEY);
    if (!lockData) return { isLocked: false, isOwnedByUs: false, tabId: null };

    const lock: CodeLock = JSON.parse(lockData);
    const now = Date.now();

    if (lock.code !== code || now - lock.timestamp >= AUTH_CODE_LOCK_TIMEOUT) {
      return { isLocked: false, isOwnedByUs: false, tabId: null };
    }

    return {
      isLocked: true,
      isOwnedByUs: lock.tabId === TAB_ID,
      tabId: lock.tabId,
    };
  } catch {
    return { isLocked: false, isOwnedByUs: false, tabId: null };
  }
}
