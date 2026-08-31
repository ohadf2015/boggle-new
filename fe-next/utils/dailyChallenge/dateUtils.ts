/**
 * Daily Challenge Date Utilities
 *
 * All date-related calculations for daily challenges.
 *
 * Calendar-day convention: UTC (YYYY-MM-DD). Puzzle identity, storage keys,
 * streaks, leaderboards, and server routes share one global midnight-UTC reset
 * so every player is on the same puzzle. Hub and game-screen labels must be
 * derived from this UTC key (getUTC* / timeZone: 'UTC') — never local
 * getDate() — or Asia/Jerusalem 00:00–02:59 and Americas evenings disagree.
 */

import { formatTimeHHMMSS } from '@/shared/utils';
import { DAILY_CHALLENGE_EPOCH } from './constants';

/**
 * Today's daily-puzzle date key in UTC as YYYY-MM-DD.
 * Daily challenges reset at midnight UTC for all users globally.
 */
export function getDailyChallengeDate(now: Date = new Date()): string {
  return now.toISOString().split('T')[0];
}

export interface DailyChallengeDisplayParts {
  /** Same value as getDailyChallengeDate(now). */
  iso: string;
  /** EN short month of the UTC calendar day, uppercased (e.g. "AUG"). */
  monthAbbr: string;
  /** UTC day-of-month (1–31). */
  dayNum: number;
}

/**
 * Display parts for the same UTC calendar day as getDailyChallengeDate.
 * Use this on the daily hub date card so it cannot drift from the puzzle key.
 */
export function getDailyChallengeDisplayParts(now: Date = new Date()): DailyChallengeDisplayParts {
  return {
    iso: getDailyChallengeDate(now),
    monthAbbr: now.toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    dayNum: now.getUTCDate(),
  };
}

/**
 * Format a YYYY-MM-DD puzzle key as a locale date string of that UTC day.
 * Passing timeZone UTC avoids `Date(iso + 'T00:00:00Z')` rendering as the
 * previous local day in UTC− zones.
 */
export function formatDailyPuzzleDate(
  isoDate: string,
  formatter: (date: Date, options: Intl.DateTimeFormatOptions) => string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return formatter(new Date(isoDate + 'T00:00:00Z'), { ...options, timeZone: 'UTC' });
}

/**
 * Get a specific date's string representation
 */
export function formatDateForDaily(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the puzzle number for a given date
 * Returns days since epoch + 1 (so puzzle #1 is 2024-01-01)
 */
export function getPuzzleNumber(dateString?: string): number {
  const date = dateString ? new Date(dateString + 'T00:00:00Z') : new Date();
  const daysSinceEpoch = Math.floor((date.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceEpoch + 1;
}

/**
 * Get the date string for a given puzzle number
 */
export function getDateForPuzzleNumber(puzzleNumber: number): string {
  const date = new Date(DAILY_CHALLENGE_EPOCH.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Get seconds until the next daily challenge resets (midnight UTC)
 */
export function getSecondsUntilNextDaily(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Get yesterday's date string
 */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get the date before the given date string
 */
export function getPreviousDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Format countdown as HH:MM:SS
 * @deprecated Use formatTimeHHMMSS from '@/shared/utils' directly
 */
export const formatCountdown = formatTimeHHMMSS;
