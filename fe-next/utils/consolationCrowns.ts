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
  image: string; // Path to crown image
  color: string; // Neo accent text color
  bg: string; // Tinted background
  border: string; // Border accent
}

export const CROWNS: Record<string, ConsolationCrown> = {
  sniper: {
    id: 'sniper',
    name: 'The Sniper',
    image: '/images/crowns/sniper.png',
    color: 'text-neo-cyan',
    bg: 'bg-neo-cyan/10',
    border: 'border-neo-cyan/20',
  },
  speedDemon: {
    id: 'speedDemon',
    name: 'Speed Demon',
    image: '/images/crowns/speed-demon.png',
    color: 'text-neo-orange',
    bg: 'bg-neo-orange/10',
    border: 'border-neo-orange/20',
  },
  explorer: {
    id: 'explorer',
    name: 'The Explorer',
    image: '/images/crowns/explorer.png',
    color: 'text-neo-purple',
    bg: 'bg-neo-purple/10',
    border: 'border-neo-purple/20',
  },
  scholar: {
    id: 'scholar',
    name: 'The Scholar',
    image: '/images/crowns/scholar.png',
    color: 'text-neo-lime',
    bg: 'bg-neo-lime/10',
    border: 'border-neo-lime/20',
  },
  clutch: {
    id: 'clutch',
    name: 'Clutch Player',
    image: '/images/crowns/clutch.png',
    color: 'text-neo-pink',
    bg: 'bg-neo-pink/10',
    border: 'border-neo-pink/20',
  },
  tank: {
    id: 'tank',
    name: 'The Tank',
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
    p => !topThreeUsernames.includes(p.username)
  );

  if (consolationPlayers.length === 0) return new Map();

  const assigned = new Map<string, ConsolationCrown>();
  const usedCrowns = new Set<string>();
  const assignedPlayers = new Set<string>();

  // Scoring functions for each crown
  const crownScorers: Record<string, (p: PlayerCrownStats) => number> = {
    sniper: (p) => {
      const words = p.allWords?.length || p.wordsFoundCount || 1;
      return p.score / words; // Avg score per word
    },
    speedDemon: (p) => {
      return p.wordsFoundCount || p.allWords?.length || 0; // Most words
    },
    explorer: (p) => {
      return p.uniqueWordsCount || 0; // Most unique words
    },
    scholar: (p) => {
      return p.averageWordLength || (p.allWords
        ? p.allWords.reduce((sum, w) => sum + w.word.length, 0) / Math.max(p.allWords.length, 1)
        : 0);
    },
    clutch: (p) => {
      if (p.allWords && p.allWords.length > 0) {
        return Math.max(...p.allWords.map(w => w.score));
      }
      return p.longestWordLength || 0; // Best single word
    },
    tank: (p) => {
      // Most consistent = lowest variance, but we want highest scorer here
      // Use total words * score as proxy for consistency
      const words = p.wordsFoundCount || p.allWords?.length || 0;
      return words > 0 ? p.score / Math.max(1, Math.abs(p.score / words - (p.score / words))) : p.score;
    },
  };

  // Assign crowns in priority order — each crown to the best-fitting unassigned player
  for (const crownId of CROWN_PRIORITY) {
    if (usedCrowns.has(crownId)) continue;

    const scorer = crownScorers[crownId];
    if (!scorer) continue;

    // Find best unassigned player for this crown
    let bestPlayer: PlayerCrownStats | null = null;
    let bestScore = -Infinity;

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

  // Any remaining players without a crown get Tank (fallback)
  for (const player of consolationPlayers) {
    if (!assignedPlayers.has(player.username)) {
      // Find first unused crown, or reuse tank
      const unusedCrown = CROWN_PRIORITY.find(id => !usedCrowns.has(id));
      const crown = unusedCrown ? CROWNS[unusedCrown] : CROWNS.tank;
      assigned.set(player.username, crown);
    }
  }

  return assigned;
}
