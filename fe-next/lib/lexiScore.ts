/**
 * LexiClash Score — a single braggable number.
 *
 * Computed from existing profile data, always grows, never decreases.
 * Designed to be shareable: "My LexiClash Score is 1,247!"
 *
 * Formula:
 *   base       = level * 10                    (max 1,000 at level 100)
 *   prestige   = prestige_level * 200          (max 1,000 at prestige 5)
 *   words      = floor(total_words / 50)       (20 pts per 1000 words)
 *   games      = floor(total_games / 5)        (2 pts per 10 games)
 *   streak     = longest_streak * 3            (reward consistency)
 *   daily      = unique_days_played * 2        (reward return visits)
 *   score      = floor(total_score / 500)      (skill signal)
 *
 * Total = base + prestige + words + games + streak + daily + score
 *
 * Tiers (for display):
 *   Newcomer    0-99
 *   Wordsmith   100-299
 *   Linguist    300-599
 *   Scholar     600-999
 *   Master      1000-1999
 *   Grandmaster 2000-3999
 *   Legend      4000+
 */

export interface LexiScoreInput {
  currentLevel: number;
  prestigeLevel: number;
  totalWords: number;
  totalGames: number;
  longestStreak: number;
  uniqueDaysPlayed: number;
  totalScore: number;
}

export interface LexiScoreResult {
  total: number;
  tier: LexiScoreTier;
  breakdown: LexiScoreBreakdown;
}

export interface LexiScoreBreakdown {
  base: number;
  prestige: number;
  words: number;
  games: number;
  streak: number;
  daily: number;
  score: number;
}

export type LexiScoreTier =
  | 'newcomer'
  | 'wordsmith'
  | 'linguist'
  | 'scholar'
  | 'master'
  | 'grandmaster'
  | 'legend';

const TIER_THRESHOLDS: { min: number; tier: LexiScoreTier }[] = [
  { min: 4000, tier: 'legend' },
  { min: 2000, tier: 'grandmaster' },
  { min: 1000, tier: 'master' },
  { min: 600, tier: 'scholar' },
  { min: 300, tier: 'linguist' },
  { min: 100, tier: 'wordsmith' },
  { min: 0, tier: 'newcomer' },
];

export function calculateLexiScore(input: LexiScoreInput): LexiScoreResult {
  const breakdown: LexiScoreBreakdown = {
    base: Math.min(input.currentLevel, 100) * 10,
    prestige: Math.min(input.prestigeLevel, 5) * 200,
    words: Math.floor(Math.max(input.totalWords, 0) / 50),
    games: Math.floor(Math.max(input.totalGames, 0) / 5),
    streak: Math.max(input.longestStreak, 0) * 3,
    daily: Math.max(input.uniqueDaysPlayed, 0) * 2,
    score: Math.floor(Math.max(input.totalScore, 0) / 500),
  };

  const total =
    breakdown.base +
    breakdown.prestige +
    breakdown.words +
    breakdown.games +
    breakdown.streak +
    breakdown.daily +
    breakdown.score;

  const tier = TIER_THRESHOLDS.find((t) => total >= t.min)?.tier ?? 'newcomer';

  return { total, tier, breakdown };
}

/** Display colors per tier (neo-brutalist palette) */
export const TIER_COLORS: Record<LexiScoreTier, { text: string; bg: string; border: string }> = {
  newcomer: { text: 'text-neo-cream/70', bg: 'bg-slate-700', border: 'border-slate-500' },
  wordsmith: { text: 'text-neo-cyan', bg: 'bg-neo-cyan/10', border: 'border-neo-cyan/40' },
  linguist: { text: 'text-neo-lime', bg: 'bg-neo-lime/10', border: 'border-neo-lime/40' },
  scholar: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-400/40' },
  master: { text: 'text-neo-purple', bg: 'bg-neo-purple/10', border: 'border-neo-purple/40' },
  grandmaster: { text: 'text-neo-pink', bg: 'bg-neo-pink/10', border: 'border-neo-pink/40' },
  legend: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-400/40' },
};
