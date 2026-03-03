/**
 * playerSpotlightEngine — Pure logic for assigning fun archetype labels to every player.
 * No React. Deterministic (seeded RNG). Greedy priority-based assignment.
 */

// --- Types ---

export interface SpotlightWord {
  word: string;
  score: number;
  validated: boolean;
  isDuplicate: boolean;
  comboBonus?: number;
  comboLevel?: number;
  fireRoundBonus?: number;
  fireRoundMultiplier?: number;
  timeSinceStart?: number;
  timestamp?: number;
}

export interface SpotlightPlayer {
  username: string;
  score: number;
  allWords?: SpotlightWord[];
  avatar?: unknown;
}

export interface Archetype {
  id: string;
  titleKey: string;
  quipKeys: string[];
  statLabelKey: string;
  color: string;
}

export interface KeyStat {
  value: number;
  labelKey: string;
  formatted: string;
}

export interface ArchetypeAssignment {
  player: SpotlightPlayer;
  archetype: Archetype;
  quip: string;
  quipIndex: number;
  keyStat: KeyStat;
}

// --- Seeded RNG (LCG — same as TvResultsAwards) ---

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// --- Archetype Definitions ---

const QUIPS_PER_ARCHETYPE = 4;

function makeArchetype(
  id: string,
  color: string,
): Archetype {
  const base = `tvResults.spotlight.archetypes.${id}`;
  return {
    id,
    titleKey: `${base}.title`,
    quipKeys: Array.from({ length: QUIPS_PER_ARCHETYPE }, (_, i) => `${base}.quip${i + 1}`),
    statLabelKey: `${base}.stat`,
    color,
  };
}

export const ARCHETYPES: Archetype[] = [
  makeArchetype('the-ghost', 'bg-neo-purple'),
  makeArchetype('the-sniper', 'bg-neo-lime'),
  makeArchetype('the-philosopher', 'bg-neo-cyan'),
  makeArchetype('the-one-hit-wonder', 'bg-neo-orange'),
  makeArchetype('the-silent-assassin', 'bg-neo-pink'),
  makeArchetype('the-sleeping-giant', 'bg-neo-yellow'),
  makeArchetype('the-frontrunner', 'bg-neo-orange'),
  makeArchetype('the-speed-runner', 'bg-neo-lime'),
  makeArchetype('the-machine-gun', 'bg-neo-cyan'),
  makeArchetype('the-metronome', 'bg-neo-purple'),
  makeArchetype('the-wildcard', 'bg-neo-pink'),
  makeArchetype('the-marathon-runner', 'bg-neo-yellow'),
  makeArchetype('the-combo-master', 'bg-neo-orange'),
  makeArchetype('the-fire-walker', 'bg-neo-pink'),
  makeArchetype('the-social-butterfly', 'bg-neo-lime'),
  makeArchetype('the-underdog', 'bg-neo-cyan'),
  makeArchetype('the-participant', 'bg-neo-cream'),
];

// --- Stat helpers ---

function getValidWords(player: SpotlightPlayer): SpotlightWord[] {
  return player.allWords?.filter(w => w.validated) ?? [];
}

function getAllWords(player: SpotlightPlayer): SpotlightWord[] {
  return player.allWords ?? [];
}

// --- Archetype matchers ---
// Each returns { player, value } or null. Higher value = better fit.

type MatchResult = { player: SpotlightPlayer; value: number } | null;
type Matcher = (
  players: SpotlightPlayer[],
  assigned: Set<string>,
  ctx: MatchContext,
) => MatchResult;

interface MatchContext {
  gameDuration: number;
  wordFreq: Map<string, number>;
  minWordThreshold: number; // 1.0 for normal, 0.5 for small games
  sortedByScore: SpotlightPlayer[];
}

function bestUnassigned(
  candidates: { player: SpotlightPlayer; value: number }[],
  assigned: Set<string>,
): MatchResult {
  const sorted = [...candidates].sort((a, b) => b.value - a.value);
  return sorted.find(c => !assigned.has(c.player.username)) ?? null;
}

// #1 THE GHOST — Most unique words (found by nobody else) ≥5
const matchGhost: Matcher = (players, assigned, ctx) => {
  const threshold = Math.ceil(5 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const uniqueCount = getValidWords(p).filter(w =>
      ctx.wordFreq.get(w.word.toLowerCase()) === 1
    ).length;
    return { player: p, value: uniqueCount };
  }).filter(c => c.value >= threshold);
  return bestUnassigned(candidates, assigned);
};

// #2 THE SNIPER — Accuracy ≥80%, min 8 words
const matchSniper: Matcher = (players, assigned, ctx) => {
  const minWords = Math.ceil(8 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const total = getAllWords(p).length;
    const valid = getValidWords(p).length;
    if (total < minWords) return { player: p, value: 0 };
    const accuracy = (valid / total) * 100;
    return { player: p, value: accuracy >= 80 ? accuracy : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #3 THE PHILOSOPHER — Avg word length ≥5.5, min 5 words
const matchPhilosopher: Matcher = (players, assigned, ctx) => {
  const minWords = Math.ceil(5 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const words = getValidWords(p);
    if (words.length < minWords) return { player: p, value: 0 };
    const avg = words.reduce((s, w) => s + w.word.length, 0) / words.length;
    return { player: p, value: avg >= 5.5 ? avg : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #4 THE ONE-HIT WONDER — Top word ≥30% of total score, max 8 words
const matchOneHitWonder: Matcher = (players, assigned, ctx) => {
  const maxWords = Math.ceil(8 / ctx.minWordThreshold); // inverse — allow more in small games
  const candidates = players.map(p => {
    const words = getValidWords(p);
    if (words.length > maxWords || words.length === 0) return { player: p, value: 0 };
    const topWord = Math.max(...words.map(w => w.score));
    const totalScore = p.score || 1;
    const ratio = topWord / totalScore;
    return { player: p, value: ratio >= 0.3 ? topWord : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #5 THE SILENT ASSASSIN — Top quartile score, bottom half word count
const matchSilentAssassin: Matcher = (players, assigned, ctx) => {
  if (players.length < 4) return null;
  const sorted = ctx.sortedByScore;
  const q1Threshold = sorted[Math.floor(sorted.length * 0.25)]?.score ?? Infinity;
  const wordCounts = players.map(p => getValidWords(p).length).sort((a, b) => a - b);
  const medianWords = wordCounts[Math.floor(wordCounts.length / 2)] ?? 0;

  const candidates = players.map(p => {
    const wordCount = getValidWords(p).length;
    if (p.score < q1Threshold || wordCount > medianWords) return { player: p, value: 0 };
    const scorePerWord = wordCount > 0 ? p.score / wordCount : 0;
    return { player: p, value: scorePerWord };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #6 THE SLEEPING GIANT — 2nd half score ≥2x first half
const matchSleepingGiant: Matcher = (players, assigned, ctx) => {
  const halfTime = ctx.gameDuration / 2;
  const candidates = players.map(p => {
    const words = getValidWords(p).filter(w => w.timeSinceStart !== undefined);
    const firstHalf = words.filter(w => w.timeSinceStart! < halfTime).reduce((s, w) => s + w.score, 0);
    const secondHalf = words.filter(w => w.timeSinceStart! >= halfTime).reduce((s, w) => s + w.score, 0);
    if (firstHalf === 0 && secondHalf > 0) return { player: p, value: secondHalf };
    const ratio = firstHalf > 0 ? secondHalf / firstHalf : 0;
    return { player: p, value: ratio >= 2 ? secondHalf : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #7 THE FRONTRUNNER — 1st half score ≥2x second half
const matchFrontrunner: Matcher = (players, assigned, ctx) => {
  const halfTime = ctx.gameDuration / 2;
  const candidates = players.map(p => {
    const words = getValidWords(p).filter(w => w.timeSinceStart !== undefined);
    const firstHalf = words.filter(w => w.timeSinceStart! < halfTime).reduce((s, w) => s + w.score, 0);
    const secondHalf = words.filter(w => w.timeSinceStart! >= halfTime).reduce((s, w) => s + w.score, 0);
    if (secondHalf === 0 && firstHalf > 0) return { player: p, value: firstHalf };
    const ratio = secondHalf > 0 ? firstHalf / secondHalf : 0;
    return { player: p, value: ratio >= 2 ? firstHalf : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #8 THE SPEED RUNNER — Top WPM + avg word length ≤4
const matchSpeedRunner: Matcher = (players, assigned, ctx) => {
  if (ctx.gameDuration === 0) return null;
  const candidates = players.map(p => {
    const valid = getValidWords(p);
    const avgLen = valid.length > 0 ? valid.reduce((s, w) => s + w.word.length, 0) / valid.length : 99;
    if (avgLen > 4) return { player: p, value: 0 };
    const wpm = (valid.length / ctx.gameDuration) * 60;
    return { player: p, value: wpm > 0 ? wpm : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #9 THE MACHINE GUN — Most words submitted ≥15
const matchMachineGun: Matcher = (players, assigned, ctx) => {
  const threshold = Math.ceil(15 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const count = getValidWords(p).length;
    return { player: p, value: count >= threshold ? count : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #10 THE METRONOME — Lowest pace stddev, min 8 words
const matchMetronome: Matcher = (players, assigned, ctx) => {
  const minWords = Math.ceil(8 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const times = getValidWords(p)
      .filter(w => w.timeSinceStart !== undefined)
      .map(w => w.timeSinceStart!)
      .sort((a, b) => a - b);
    if (times.length < minWords) return { player: p, value: 0 };
    const gaps: number[] = [];
    for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    return { player: p, value: stdDev > 0 ? 1 / stdDev : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #11 THE WILDCARD — ≥5 different word lengths
const matchWildcard: Matcher = (players, assigned, ctx) => {
  const threshold = Math.ceil(5 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const lengths = new Set(getValidWords(p).map(w => w.word.length));
    return { player: p, value: lengths.size >= threshold ? lengths.size : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #12 THE MARATHON RUNNER — Active >80% of game duration
const matchMarathonRunner: Matcher = (players, assigned, ctx) => {
  if (ctx.gameDuration === 0) return null;
  const candidates = players.map(p => {
    const times = getValidWords(p)
      .filter(w => w.timeSinceStart !== undefined)
      .map(w => w.timeSinceStart!);
    if (times.length < 2) return { player: p, value: 0 };
    const firstWord = Math.min(...times);
    const lastWord = Math.max(...times);
    const span = lastWord - firstWord;
    const coverage = span / ctx.gameDuration;
    return { player: p, value: coverage > 0.8 ? coverage : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #13 THE COMBO MASTER — Max combo ≥6
const matchComboMaster: Matcher = (players, assigned, ctx) => {
  const threshold = Math.ceil(6 * ctx.minWordThreshold);
  const candidates = players.map(p => {
    const maxCombo = getAllWords(p).reduce((max, w) => Math.max(max, w.comboLevel ?? 0), 0);
    return { player: p, value: maxCombo >= threshold ? maxCombo : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #14 THE FIRE WALKER — Fire round bonus >0
const matchFireWalker: Matcher = (players, assigned) => {
  const candidates = players.map(p => {
    const fireBonus = getAllWords(p).reduce((s, w) => s + (w.fireRoundBonus ?? 0), 0);
    return { player: p, value: fireBonus > 0 ? fireBonus : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #15 THE SOCIAL BUTTERFLY — Most words found by 3+ others
const matchSocialButterfly: Matcher = (players, assigned, ctx) => {
  const candidates = players.map(p => {
    const socialCount = getValidWords(p).filter(w =>
      (ctx.wordFreq.get(w.word.toLowerCase()) ?? 0) >= 4 // 3+ others = 4+ total
    ).length;
    return { player: p, value: socialCount >= 3 ? socialCount : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// #16 THE UNDERDOG — Lowest ranked but top-half accuracy
const matchUnderdog: Matcher = (players, assigned, ctx) => {
  if (players.length < 2) return null;
  const sorted = ctx.sortedByScore;
  const bottomHalf = sorted.slice(Math.floor(sorted.length / 2));
  const medianAccuracy = (() => {
    const accs = players.map(p => {
      const total = getAllWords(p).length;
      const valid = getValidWords(p).length;
      return total > 0 ? (valid / total) * 100 : 0;
    }).sort((a, b) => a - b);
    return accs[Math.floor(accs.length / 2)] ?? 50;
  })();

  const candidates = bottomHalf.map(p => {
    const total = getAllWords(p).length;
    const valid = getValidWords(p).length;
    if (total === 0) return { player: p, value: 0 };
    const accuracy = (valid / total) * 100;
    return { player: p, value: accuracy >= medianAccuracy ? accuracy : 0 };
  }).filter(c => c.value > 0);
  return bestUnassigned(candidates, assigned);
};

// --- Matchers in priority order (matches ARCHETYPES order) ---

const MATCHERS: Matcher[] = [
  matchGhost,
  matchSniper,
  matchPhilosopher,
  matchOneHitWonder,
  matchSilentAssassin,
  matchSleepingGiant,
  matchFrontrunner,
  matchSpeedRunner,
  matchMachineGun,
  matchMetronome,
  matchWildcard,
  matchMarathonRunner,
  matchComboMaster,
  matchFireWalker,
  matchSocialButterfly,
  matchUnderdog,
];

// --- Key stat formatters per archetype ---

function getKeyStat(archetypeId: string, player: SpotlightPlayer, ctx: MatchContext): KeyStat {
  const valid = getValidWords(player);
  const all = getAllWords(player);
  const base = `tvResults.spotlight.archetypes.${archetypeId}.stat`;

  switch (archetypeId) {
    case 'the-ghost': {
      const count = valid.filter(w => ctx.wordFreq.get(w.word.toLowerCase()) === 1).length;
      return { value: count, labelKey: base, formatted: `${count}` };
    }
    case 'the-sniper': {
      const accuracy = all.length > 0 ? Math.round((valid.length / all.length) * 100) : 0;
      return { value: accuracy, labelKey: base, formatted: `${accuracy}%` };
    }
    case 'the-philosopher': {
      const avg = valid.length > 0 ? valid.reduce((s, w) => s + w.word.length, 0) / valid.length : 0;
      return { value: avg, labelKey: base, formatted: avg.toFixed(1) };
    }
    case 'the-one-hit-wonder': {
      const topScore = valid.length > 0 ? Math.max(...valid.map(w => w.score)) : 0;
      const topWord = valid.find(w => w.score === topScore)?.word ?? '';
      return { value: topScore, labelKey: base, formatted: topWord.toUpperCase() };
    }
    case 'the-silent-assassin': {
      const spw = valid.length > 0 ? Math.round(player.score / valid.length) : 0;
      return { value: spw, labelKey: base, formatted: `${spw}` };
    }
    case 'the-sleeping-giant': {
      const halfTime = ctx.gameDuration / 2;
      const secondHalf = valid
        .filter(w => w.timeSinceStart !== undefined && w.timeSinceStart >= halfTime)
        .reduce((s, w) => s + w.score, 0);
      return { value: secondHalf, labelKey: base, formatted: `+${secondHalf}` };
    }
    case 'the-frontrunner': {
      const halfTime = ctx.gameDuration / 2;
      const firstHalf = valid
        .filter(w => w.timeSinceStart !== undefined && w.timeSinceStart < halfTime)
        .reduce((s, w) => s + w.score, 0);
      return { value: firstHalf, labelKey: base, formatted: `${firstHalf}` };
    }
    case 'the-speed-runner': {
      const wpm = ctx.gameDuration > 0 ? (valid.length / ctx.gameDuration) * 60 : 0;
      return { value: wpm, labelKey: base, formatted: `${wpm.toFixed(1)}` };
    }
    case 'the-machine-gun': {
      return { value: valid.length, labelKey: base, formatted: `${valid.length}` };
    }
    case 'the-metronome': {
      const times = valid.filter(w => w.timeSinceStart !== undefined).map(w => w.timeSinceStart!).sort((a, b) => a - b);
      const gaps: number[] = [];
      for (let i = 1; i < times.length; i++) gaps.push(times[i] - times[i - 1]);
      const mean = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
      const variance = gaps.length > 0 ? gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length : 0;
      const stdDev = Math.sqrt(variance);
      return { value: stdDev, labelKey: base, formatted: `${stdDev.toFixed(1)}s` };
    }
    case 'the-wildcard': {
      const lengths = new Set(valid.map(w => w.word.length));
      return { value: lengths.size, labelKey: base, formatted: `${lengths.size}` };
    }
    case 'the-marathon-runner': {
      const times = valid.filter(w => w.timeSinceStart !== undefined).map(w => w.timeSinceStart!);
      const coverage = times.length >= 2
        ? Math.round(((Math.max(...times) - Math.min(...times)) / ctx.gameDuration) * 100)
        : 0;
      return { value: coverage, labelKey: base, formatted: `${coverage}%` };
    }
    case 'the-combo-master': {
      const maxCombo = all.reduce((max, w) => Math.max(max, w.comboLevel ?? 0), 0);
      return { value: maxCombo, labelKey: base, formatted: `${maxCombo}x` };
    }
    case 'the-fire-walker': {
      const fireBonus = all.reduce((s, w) => s + (w.fireRoundBonus ?? 0), 0);
      return { value: fireBonus, labelKey: base, formatted: `+${fireBonus}` };
    }
    case 'the-social-butterfly': {
      const count = valid.filter(w => (ctx.wordFreq.get(w.word.toLowerCase()) ?? 0) >= 4).length;
      return { value: count, labelKey: base, formatted: `${count}` };
    }
    case 'the-underdog': {
      const accuracy = all.length > 0 ? Math.round((valid.length / all.length) * 100) : 0;
      return { value: accuracy, labelKey: base, formatted: `${accuracy}%` };
    }
    default: {
      return { value: valid.length, labelKey: base, formatted: `${valid.length}` };
    }
  }
}

// --- Main assignment function ---

export function assignArchetypes(
  players: SpotlightPlayer[],
  gameDuration: number,
  seed: number,
): ArchetypeAssignment[] {
  if (players.length === 0) return [];

  const rng = seededRandom(seed);

  // Build shared word frequency map
  const wordFreq = new Map<string, number>();
  players.forEach(p => {
    (p.allWords ?? []).forEach(w => {
      if (w.validated) {
        const word = w.word.toLowerCase();
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    });
  });

  const sortedByScore = [...players].sort((a, b) => b.score - a.score);
  const minWordThreshold = players.length <= 3 ? 0.5 : 1.0;

  const ctx: MatchContext = { gameDuration, wordFreq, minWordThreshold, sortedByScore };

  const assigned = new Set<string>();
  const assignments = new Map<string, { archetype: Archetype; keyStat: KeyStat }>();

  // Greedy priority assignment
  for (let i = 0; i < MATCHERS.length; i++) {
    const match = MATCHERS[i](players, assigned, ctx);
    if (match && !assigned.has(match.player.username)) {
      const archetype = ARCHETYPES[i];
      assigned.add(match.player.username);
      assignments.set(match.player.username, {
        archetype,
        keyStat: getKeyStat(archetype.id, match.player, ctx),
      });
    }
  }

  // Fallback: assign "the-participant" to unmatched players
  const fallback = ARCHETYPES[ARCHETYPES.length - 1];
  players.forEach(p => {
    if (!assigned.has(p.username)) {
      assignments.set(p.username, {
        archetype: fallback,
        keyStat: getKeyStat(fallback.id, p, ctx),
      });
    }
  });

  // Build final result with quips
  return players.map(player => {
    const assignment = assignments.get(player.username)!;
    const quipIndex = Math.floor(rng() * QUIPS_PER_ARCHETYPE);
    return {
      player,
      archetype: assignment.archetype,
      quip: assignment.archetype.quipKeys[quipIndex],
      quipIndex,
      keyStat: assignment.keyStat,
    };
  });
}
