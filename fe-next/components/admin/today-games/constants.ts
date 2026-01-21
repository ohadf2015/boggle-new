import React from 'react';
import {
  Trophy,
  Gamepad2,
  Target,
  Brain,
  Puzzle,
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
  daily_challenge: React.createElement(Puzzle, { className: 'w-4 h-4 text-purple-400' }),
  drill: React.createElement(Brain, { className: 'w-4 h-4 text-amber-400' }),
};

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
