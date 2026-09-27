/**
 * Guest Player Utilities
 *
 * Guest player info management and browser fingerprinting
 */

import type { GuestDailyPlayer } from './types';
import { GUEST_DAILY_PLAYER_KEY, GUEST_FINGERPRINT_KEY } from './constants';
import { hashString } from './prng';
import {
  getJsonFromLocalStorage,
  saveJsonToLocalStorage,
  getFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/storageHelpers';

/**
 * Get or generate guest daily player info
 * This is stored in localStorage so the same guest always appears with the same name/avatar
 */
export async function getGuestDailyPlayer(): Promise<GuestDailyPlayer> {
  if (typeof window === 'undefined') {
    return { displayName: 'Guest', avatarEmoji: '🎯', avatarColor: '#6366f1' };
  }

  // Check if we already have stored guest player info
  const stored = getJsonFromLocalStorage<GuestDailyPlayer | null>(GUEST_DAILY_PLAYER_KEY, null);
  if (stored) {
    return stored;
  }

  // Generate new guest player info
  try {
    const response = await fetch('/api/random-name?language=en', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      const guestPlayer: GuestDailyPlayer = {
        displayName: data.name,
        avatarEmoji: data.avatar.emoji,
        avatarColor: data.avatar.color,
      };
      saveJsonToLocalStorage(GUEST_DAILY_PLAYER_KEY, guestPlayer);
      return guestPlayer;
    }
  } catch {
    // Fall through to default
  }

  // Fallback
  const fallback: GuestDailyPlayer = {
    displayName: ['WordNinja', 'LetterWizard', 'VowelViking', 'SyllableStar', 'GrammarGhost', 'SpellingBee', 'AlphabetAce', 'LexiconLion'][Math.floor(Math.random() * 8)],
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  };
  saveJsonToLocalStorage(GUEST_DAILY_PLAYER_KEY, fallback);
  return fallback;
}

/**
 * Update guest daily player info (for name editing)
 * Allows guests to customize their display name
 */
export function updateGuestDailyPlayer(updates: Partial<GuestDailyPlayer>): GuestDailyPlayer | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const current = getJsonFromLocalStorage<GuestDailyPlayer>(
    GUEST_DAILY_PLAYER_KEY,
    {
      displayName: 'Guest',
      avatarEmoji: '🎯',
      avatarColor: '#6366f1',
    }
  );

  const updated: GuestDailyPlayer = {
    ...current,
    ...updates,
  };

  saveJsonToLocalStorage(GUEST_DAILY_PLAYER_KEY, updated);
  return updated;
}

/**
 * Generate or retrieve a stable guest fingerprint for tracking
 * Uses browser fingerprinting with UUID fallback to ensure we always have a valid ID
 * This is NOT for security - just to identify repeat guest plays
 */
export async function getGuestFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  try {
    // First, check if we already have a stored fingerprint (for consistency across sessions)
    const storedFingerprint = getFromLocalStorage(GUEST_FINGERPRINT_KEY);
    if (storedFingerprint && storedFingerprint.length > 0) {
      return storedFingerprint;
    }

    // Generate new fingerprint from browser components
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '',
      // Canvas fingerprint (simple version)
      await getCanvasFingerprint(),
    ];

    const fingerprintData = components.filter(Boolean).join('|');
    let fingerprint = hashString(fingerprintData).toString(36);

    // Ensure fingerprint is always valid (fallback to UUID if empty/falsy)
    if (!fingerprint || fingerprint === '0') {
      fingerprint = generateGuestUUID();
    }

    // Store for consistency
    saveToLocalStorage(GUEST_FINGERPRINT_KEY, fingerprint);

    return fingerprint;
  } catch {
    // Fallback to UUID if anything fails
    const fallbackId = generateGuestUUID();
    try {
      saveToLocalStorage(GUEST_FINGERPRINT_KEY, fallbackId);
    } catch {
      // localStorage might be disabled - that's ok, just return the UUID
    }
    return fallbackId;
  }
}

/**
 * Generate a simple UUID v4 for guest identification fallback
 */
function generateGuestUUID(): string {
  // Use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }
  // Fallback for older browsers
  return 'xxxxxxxxxxxxxxxx'.replace(/x/g, () => {
    return Math.floor(Math.random() * 16).toString(16);
  });
}

/**
 * Simple canvas fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('LexiClash Daily', 2, 2);

    return canvas.toDataURL().slice(-50);
  } catch {
    return '';
  }
}
