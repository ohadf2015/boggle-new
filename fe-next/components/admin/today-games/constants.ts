import React from 'react';
import {
  Trophy,
  Gamepad2,
  Target,
  Brain,
  Puzzle,
  Bomb,
  CircleDot,
  GraduationCap,
} from 'lucide-react';

// Language flag mappings
export const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇺🇸',
  he: '🇮🇱',
  sv: '🇸🇪',
  ja: '🇯🇵',
  es: '🇪🇸',
};

// Game type icon mappings
export const GAME_TYPE_ICONS: Record<string, React.ReactNode> = {
  ranked: React.createElement(Trophy, { className: 'w-4 h-4 text-neo-lime' }),
  casual: React.createElement(Gamepad2, { className: 'w-4 h-4 text-blue-400' }),
  word_hunt: React.createElement(Target, { className: 'w-4 h-4 text-green-400' }),
  daily_word: React.createElement(Target, { className: 'w-4 h-4 text-green-400' }),
  daily_challenge: React.createElement(Puzzle, { className: 'w-4 h-4 text-purple-400' }),
  drill: React.createElement(Brain, { className: 'w-4 h-4 text-amber-400' }),
  'brain-drill': React.createElement(Brain, { className: 'w-4 h-4 text-amber-400' }),
  blast: React.createElement(Bomb, { className: 'w-4 h-4 text-neo-pink' }),
  word_wheel: React.createElement(CircleDot, { className: 'w-4 h-4 text-neo-cyan' }),
  crossword: React.createElement(Puzzle, { className: 'w-4 h-4 text-neo-purple' }),
  'word-craft': React.createElement(Gamepad2, { className: 'w-4 h-4 text-neo-lime' }),
  practice: React.createElement(GraduationCap, { className: 'w-4 h-4 text-sky-400' }),
};

// Date range options for filtering
export const DATE_RANGES = ['today', '7d', '30d', '90d', 'all'] as const;
export type DateRange = typeof DATE_RANGES[number];

/**
 * Compute the start-date (YYYY-MM-DD) for a given range relative to `now`.
 * `now` is injectable so tests are deterministic.
 * Returns `null` for `all` so the API leaves startDate unbounded.
 */
export function getDateRangeStart(range: DateRange, now: Date = new Date()): string | null {
  if (range === 'all') return null;
  if (range === 'today') {
    return now.toISOString().split('T')[0];
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return start.toISOString().split('T')[0];
}

// Default page size for pagination
export const DEFAULT_PAGE_SIZE = 50;

// Auto-refresh interval in milliseconds (30 seconds)
export const AUTO_REFRESH_INTERVAL = 30000;

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "45s" or "2:30")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format date string to time-only display
 * @param dateString - ISO date string
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns Today's date string
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}
