/**
 * Custom Puzzle Utilities
 *
 * Helpers for generating puzzle codes and building share URLs
 */

/**
 * Generate a unique 8-character puzzle code
 * Uses alphanumeric characters (lowercase + digits) for easy sharing
 */
export function generatePuzzleCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate a puzzle code format
 */
export function isValidPuzzleCode(code: string): boolean {
  return /^[a-z0-9]{8}$/.test(code);
}

/**
 * Build a share URL for a custom puzzle
 */
export function buildPuzzleShareUrl(puzzleCode: string, locale: string = 'en'): string {
  if (typeof window === 'undefined') {
    return `/${locale}/custom/${puzzleCode}`;
  }
  const baseUrl = window.location.origin;
  return `${baseUrl}/${locale}/custom/${puzzleCode}`;
}

/**
 * Extract puzzle code from a URL or path
 */
export function extractPuzzleCode(urlOrPath: string): string | null {
  // Match /custom/{code} pattern
  const match = urlOrPath.match(/\/custom\/([a-z0-9]{8})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Calculate efficiency score for custom puzzle attempts
 * Same formula as daily challenge for consistency
 */
export function calculateCustomPuzzleScore(
  solved: boolean,
  attemptsUsed: number,
  wordsDiscovered: number,
  lifeRemaining: number
): number {
  if (!solved) return 0;

  // Base score for solving
  let score = 100;

  // Bonus for fewer attempts (max 50 bonus points)
  const attemptBonus = Math.max(0, 50 - (attemptsUsed - 1) * 5);
  score += attemptBonus;

  // Bonus for words discovered (2 points each, max 30)
  const wordBonus = Math.min(30, wordsDiscovered * 2);
  score += wordBonus;

  // Bonus for remaining life (max 20 points)
  const lifeBonus = Math.floor(lifeRemaining / 5);
  score += Math.min(20, lifeBonus);

  return score;
}

/**
 * Check if a player beat the creator's score
 */
export function didBeatCreator(
  playerScore: number,
  creatorScore: number
): boolean {
  return playerScore > creatorScore;
}

/**
 * Format leaderboard entry for display
 */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  solved: boolean;
  attemptsUsed: number;
  efficiencyScore: number;
  beatCreator: boolean;
  isCreator: boolean;
  completedAt: string;
}

/**
 * Sort and rank leaderboard entries
 */
export function rankLeaderboard(
  entries: Omit<LeaderboardEntry, 'rank'>[]
): LeaderboardEntry[] {
  // Sort by: solved first, then by efficiency score descending, then by attempts ascending
  const sorted = [...entries].sort((a, b) => {
    if (a.solved !== b.solved) return a.solved ? -1 : 1;
    if (a.efficiencyScore !== b.efficiencyScore) return b.efficiencyScore - a.efficiencyScore;
    return a.attemptsUsed - b.attemptsUsed;
  });

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
