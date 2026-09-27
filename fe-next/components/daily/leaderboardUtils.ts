// Shared rank color utilities for daily leaderboard rows

/**
 * Get row background/border colors based on rank and current user status.
 * Used by both TodayParticipantRow and AllTimeParticipantRow.
 */
export function getRankColors(rank: number, isCurrentUser: boolean): string {
  if (isCurrentUser) {
    return 'bg-linear-to-r from-neo-cyan/40 to-neo-cyan/20 border-neo-cyan shadow-[0_0_12px_rgba(0,255,255,0.3)] ring-2 ring-neo-cyan/60';
  }
  if (rank === 1) {
    return 'bg-linear-to-r from-amber-100 to-yellow-50 dark:from-amber-900/40 dark:to-yellow-900/20 border-amber-400 dark:border-amber-400';
  }
  if (rank === 2) {
    return 'bg-linear-to-r from-slate-100 to-gray-50 dark:from-slate-700/60 dark:to-slate-800/40 border-slate-400 dark:border-slate-400';
  }
  if (rank === 3) {
    return 'bg-linear-to-r from-orange-100 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/20 border-orange-400 dark:border-orange-500';
  }
  return 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500';
}

/**
 * Get rank badge colors for the rank number display.
 * High contrast for WCAG AA compliance.
 */
export function getRankBadgeColors(rank: number): string {
  if (rank === 1) return 'bg-linear-to-br from-amber-400 to-yellow-400 text-amber-900 border-amber-500';
  if (rank === 2) return 'bg-linear-to-br from-slate-400 to-slate-500 text-white border-slate-600';
  if (rank === 3) return 'bg-linear-to-br from-orange-400 to-amber-500 text-orange-900 border-orange-600';
  return 'bg-slate-600 dark:bg-slate-600 text-white dark:text-slate-100 border-slate-500 dark:border-slate-500';
}
