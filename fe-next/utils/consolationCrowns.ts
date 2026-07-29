/**
 * Consolation Crowns System
 *
 * Assigns fun titles to 4th+ place players based on their game stats.
 * Each crown has a dedicated generated image in /images/crowns/.
 * Separate from the archetype system — crowns are results-only consolation prizes.
 */

export interface ConsolationCrown {
  id: string;
  name: string;
  descriptionKey: string; // i18n key for explanation of how the crown was earned
  image: string; // Path to crown image
  color: string; // Neo accent text color
  bg: string; // Tinted background
  border: string; // Border accent
}

/** Minimum score required to earn any consolation crown */
const MIN_CROWN_SCORE = 1;

export const CROWNS: Record<string, ConsolationCrown> = {
  sniper: {
    id: 'sniper',
    name: 'The Sniper',
    descriptionKey: 'results.crownDesc.sniper',
    image: '/images/crowns/sniper.png',
    color: 'text-neo-cyan',
    bg: 'bg-neo-cyan/10',
    border: 'border-neo-cyan/20',
  },
  speedDemon: {
    id: 'speedDemon',
    name: 'Speed Demon',
    descriptionKey: 'results.crownDesc.speedDemon',
    image: '/images/crowns/speed-demon.png',
    color: 'text-neo-orange',
    bg: 'bg-neo-orange/10',
    border: 'border-neo-orange/20',
  },
  explorer: {
    id: 'explorer',
    name: 'The Explorer',
    descriptionKey: 'results.crownDesc.explorer',
    image: '/images/crowns/explorer.png',
    color: 'text-neo-purple',
    bg: 'bg-neo-purple/10',
    border: 'border-neo-purple/20',
  },
  scholar: {
    id: 'scholar',
    name: 'The Scholar',
    descriptionKey: 'results.crownDesc.scholar',
    image: '/images/crowns/scholar.png',
    color: 'text-neo-lime',
    bg: 'bg-neo-lime/10',
    border: 'border-neo-lime/20',
  },
  clutch: {
    id: 'clutch',
    name: 'Clutch Player',
    descriptionKey: 'results.crownDesc.clutch',
    image: '/images/crowns/clutch.png',
    color: 'text-neo-pink',
    bg: 'bg-neo-pink/10',
    border: 'border-neo-pink/20',
  },
  tank: {
    id: 'tank',
    name: 'The Tank',
    descriptionKey: 'results.crownDesc.tank',
    image: '/images/crowns/tank.png',
    color: 'text-neo-cyan',
    bg: 'bg-neo-cyan/10',
    border: 'border-neo-cyan/20',
  },
};

/** All crown IDs in priority order for assignment */
const CROWN_PRIORITY: string[] = [
  'sniper',
  'speedDemon',
  'explorer',
  'scholar',
  'clutch',
  'tank',
];

interface PlayerCrownStats {
  username: string;
  score: number;
  wordsFoundCount?: number;
  averageWordLength?: number;
  longestWordLength?: number;
  uniqueWordsCount?: number;
  allWords?: Array<{ word: string; score: number }>;
}

/**
 * Assign consolation crowns to 4th+ players.
 * Each player gets exactly one crown. No crown is assigned twice.
 *
 * Assignment logic (each crown goes to the player who best fits):
 * - Sniper: Highest avg score per word (quality over quantity)
 * - Speed Demon: Most words found (fast submitter)
 * - Explorer: Most unique/rare words (words nobody in top 3 found)
 * - Scholar: Longest average word length
 * - Clutch: Highest single-word score
 * - Tank: Most consistent (lowest score variance across words)
 */
export function assignConsolationCrowns(
  players: PlayerCrownStats[],
  topThreeUsernames: string[]
): Map<string, ConsolationCrown> {
  const consolationPlayers = players.filter(
    p => !topThreeUsernames.includes(p.username) && p.score >= MIN_CROWN_SCORE
  );

  if (consolationPlayers.length === 0) return new Map();

  const assigned = new Map<string, ConsolationCrown>();
  const usedCrowns = new Set<string>();
  const assignedPlayers = new Set<string>();

  /** Helper: count words a player found */
  const wordCount = (p: PlayerCrownStats) => p.allWords?.length || p.wordsFoundCount || 0;

  // Scoring functions for each crown — return -1 to disqualify
  const crownScorers: Record<string, (p: PlayerCrownStats) => number> = {
    sniper: (p) => {
      const wc = wordCount(p);
      if (wc < 3) return -1; // Need at least 3 words to prove consistency
      return p.score / wc; // Avg score per word
    },
    speedDemon: (p) => {
      const wc = wordCount(p);
      if (wc < 2) return -1; // Need at least 2 words
      return wc;
    },
    explorer: (p) => {
      // uniqueWordsCount may not be populated — fall back to word count if absent
      const unique = p.uniqueWordsCount || 0;
      if (unique < 1) return -1;
      return unique;
    },
    scholar: (p) => {
      const wc = wordCount(p);
      if (wc < 1) return -1;
      const avg = p.averageWordLength || (p.allWords
        ? p.allWords.reduce((sum, w) => sum + w.word.length, 0) / Math.max(p.allWords.length, 1)
        : 0);
      if (avg < 3) return -1; // Must average at least 3-letter words
      return avg;
    },
    clutch: (p) => {
      if (p.allWords && p.allWords.length > 0) {
        const best = Math.max(...p.allWords.map(w => w.score));
        if (best <= 0) return -1;
        return best;
      }
      const longest = p.longestWordLength || 0;
      if (longest < 4) return -1; // Need at least a 4-letter word
      return longest;
    },
    tank: (p) => {
      const words = p.allWords;
      if (!words || words.length < 3) return -1; // Need 3+ words to measure consistency
      const scores = words.map(w => w.score);
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (mean === 0) return -1;
      const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
      const cv = Math.sqrt(variance) / mean;
      // Lower CV = more consistent. Invert so higher = better for ranking
      return 1 / (cv + 0.01);
    },
  };

  // Assign crowns in priority order — each crown to the best-fitting unassigned player
  for (const crownId of CROWN_PRIORITY) {
    if (usedCrowns.has(crownId)) continue;

    const scorer = crownScorers[crownId];
    if (!scorer) continue;

    // Find best unassigned player for this crown (score must be > -1 to qualify)
    let bestPlayer: PlayerCrownStats | null = null;
    let bestScore = -1; // -1 means disqualified — must beat this to earn the crown

    for (const player of consolationPlayers) {
      if (assignedPlayers.has(player.username)) continue;
      const score = scorer(player);
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = player;
      }
    }

    if (bestPlayer) {
      assigned.set(bestPlayer.username, CROWNS[crownId]);
      usedCrowns.add(crownId);
      assignedPlayers.add(bestPlayer.username);
    }

    // Stop if all players have crowns
    if (assignedPlayers.size >= consolationPlayers.length) break;
  }

  // Remaining players without a crown — only assign if they have meaningful stats
  for (const player of consolationPlayers) {
    if (assignedPlayers.has(player.username)) continue;
    const wc = wordCount(player);
    // Skip players with very poor performance (< 2 words found)
    if (wc < 2) continue;
    const unusedCrown = CROWN_PRIORITY.find(id => !usedCrowns.has(id));
    if (!unusedCrown) break; // No more crowns to give
    assigned.set(player.username, CROWNS[unusedCrown]);
    usedCrowns.add(unusedCrown);
  }

  return assigned;
}
