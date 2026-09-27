/**
 * Display helpers for grouped games (GameGroup + GamePlayer).
 * Pure functions for rendering group/player metadata.
 */

type T = (key: string, fallback?: string) => string;

/**
 * Convert ISO-2 country code to regional indicator flag emoji.
 * Handles null/undefined gracefully.
 * Uses ES6 codePointAt to properly handle surrogate pairs.
 */
export function countryFlag(iso: string | null | undefined): string {
  if (!iso) return '';
  const upper = iso.toUpperCase();
  if (upper.length !== 2) return '';

  // Regional indicator symbols use surrogate pairs in JavaScript.
  // U+1F1E6 (start of regional indicators) is represented as a surrogate pair.
  // We use String.fromCodePoint with the actual Unicode code points.
  const REGIONAL_INDICATOR_START = 0x1F1E6;
  const codeA = 'A'.charCodeAt(0);
  const first = String.fromCodePoint(REGIONAL_INDICATOR_START + (upper.charCodeAt(0) - codeA));
  const second = String.fromCodePoint(REGIONAL_INDICATOR_START + (upper.charCodeAt(1) - codeA));
  return first + second;
}

export interface PlatformLabel {
  icon: string;
  label: string;
}

/**
 * Convert platform string to icon + label.
 * Returns { icon: '🌐', label: 'Web' } for web,
 * { icon: '📱', label: 'Native' } for ios/android,
 * { icon: '', label: '—' } otherwise.
 */
export function platformLabel(platform: string | null | undefined, _t: T): PlatformLabel {
  if (!platform) return { icon: '', label: '—' };
  const lower = platform.toLowerCase();
  if (lower === 'web') return { icon: '🌐', label: 'Web' };
  if (lower === 'ios' || lower === 'android') return { icon: '📱', label: 'Native' };
  return { icon: '', label: '—' };
}

/**
 * Format per-player device: deviceType · os · browser.
 * Filters nulls; returns "Unknown device" if all null.
 */
export function playerDeviceLabel(
  deviceType: string | null | undefined,
  os: string | null | undefined,
  browser: string | null | undefined,
): string {
  const parts = [deviceType, os, browser].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(' · ') : 'Unknown device';
}
