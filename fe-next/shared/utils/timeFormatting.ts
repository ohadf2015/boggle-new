/**
 * Time Formatting Utilities
 * Shared time formatting functions used across the application
 *
 * Consolidates duplicated code from:
 * - fe-next/utils/dailyChallenge.ts (formatCountdown)
 * - fe-next/hooks/useNewYearDetection.ts (formatTimeRemaining)
 * - fe-next/components/CircularTimer.tsx (formatTime)
 * - fe-next/components/LateJoinerWelcome.tsx (formatTime)
 * - fe-next/components/daily/DailyLeaderboard.tsx (formatDistanceToNow)
 * - fe-next/components/daily/TabbedDailyLeaderboard.tsx (formatDistanceToNow)
 */

/**
 * Format seconds as MM:SS (e.g., "2:05" for 125 seconds)
 * Used for game timers and short durations
 */
export function formatTimeMMSS(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds as HH:MM:SS (e.g., "01:02:05" for 3725 seconds)
 * Used for countdowns and longer durations
 */
export function formatTimeHHMMSS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds as H:MM:SS, clamped to 0 when non-positive.
 * Used for countdowns that carry millisecond precision (vault, events).
 */
export function formatCountdownFromMs(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format seconds intelligently - shows HH:MM:SS if hours > 0, else MM:SS
 * Adapts based on duration length
 */
export function formatTimeAdaptive(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format a date string as relative time (e.g., "5 minutes ago", "2 hours ago")
 * @param dateString - ISO date string
 * @param t - Translation function
 * @returns Localized relative time string
 */
export function formatDistanceToNow(
  dateString: string,
  t: (key: string) => string
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return t('wordHunt.leaderboard.justNow');
  if (diffMins < 60) return t('wordHunt.leaderboard.minutesAgo').replace('{count}', String(diffMins));
  if (diffHours < 24) return t('wordHunt.leaderboard.hoursAgo').replace('{count}', String(diffHours));
  if (diffDays < 7) return t('wordHunt.leaderboard.daysAgo').replace('{count}', String(diffDays));
  return date.toLocaleDateString();
}

/**
 * Format duration in seconds to a human-readable string
 * For displaying time played (e.g., "1h 23m" or "45m 30s")
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
