/**
 * Daily Challenge Date Utilities
 *
 * All date-related calculations for daily challenges
 */

import { formatTimeHHMMSS } from '@/shared/utils';
import { DAILY_CHALLENGE_EPOCH } from './constants';

/**
 * Get today's date in UTC as YYYY-MM-DD string
 * Daily challenges reset at midnight UTC for all users globally
 */
export function getDailyChallengeDate(): string {
  return new Date().toISOString().split('T')[0];
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
 * Format countdown as HH:MM:SS
 * @deprecated Use formatTimeHHMMSS from '@/shared/utils' directly
 */
export const formatCountdown = formatTimeHHMMSS;
