/**
 * Who finished the homework, without asking anyone to sign up.
 *
 * A homework link is opened by students with no account. To show the teacher
 * "Maya finished, Noah is still out" we need a key that is stable for one
 * device and means nothing anywhere else: not an email, not a fingerprint of
 * the browser, just a random id this device minted for itself and stores. The
 * student's typed first name travels next to it as the display label.
 *
 * Signed-in students never use this — the API replaces it with their user id.
 */

import { getFromLocalStorage, saveToLocalStorage } from '@/utils/storageHelpers';

const DEVICE_KEY = 'lexiclash_miss_gap_device';
const NAME_KEY = 'lexiclash_miss_gap_name';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const MAX_NAME = 24;

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    }
  } catch {
    /* fall through to Math.random */
  }
  return `d${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

/** Stable per-device id, minted on first use. */
export function getMissGapDeviceKey(): string {
  const existing = getFromLocalStorage(DEVICE_KEY);
  if (existing) return existing;
  const minted = randomId();
  saveToLocalStorage(DEVICE_KEY, minted);
  return minted;
}

export function sanitizeStudentName(raw: string): string {
  return String(raw || '')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
}

/** Remembered first name so a student types it once per device, not per assignment. */
export function getRememberedStudentName(): string {
  return sanitizeStudentName(getFromLocalStorage(NAME_KEY) || '');
}

export function rememberStudentName(name: string): string {
  const clean = sanitizeStudentName(name);
  if (clean) saveToLocalStorage(NAME_KEY, clean);
  return clean;
}
