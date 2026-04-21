/**
 * Daily Word Hunt Facts Calculator
 *
 * Produces a single high-impact insight for the Word Hunt results page.
 * Priority chain:
 *  1. Rare brag-worthy achievements (firstTry, perfect 1000, top 1%, huge streak)
 *  2. Actionable coach tip that targets the player's weakest score pillar
 *  3. Witty observation fallback (palindrome, rare letter, long word, elite club)
 *
 * Score pillars (see aiHintScoring.ts):
 *   Speed       = min(life, 100) x 4       (max 400)
 *   Accuracy    = max(0, 400 - (guesses-1) * 40)  (max 400)
 *   Exploration = min(words, 20) x 10      (max 200)
 */

import type { WordHuntResult, StoredWordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from '@/components/daily/results/types';
import { sanitizeWord } from '@/shared/utils/wordNormalization';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WordHuntFactType =
  | 'firstTry'
  | 'perfectScore'
  | 'topPerformer'
  | 'streakLegend'
  | 'tipExploration'
  | 'tipSpeed'
  | 'tipAccuracy'
  | 'tipShortTarget'
  | 'tipLoss'
  | 'lossEffort'
  | 'eliteClub'
  | 'palindrome'
  | 'rareLetter'
  | 'longWord'
  // Personal progression + research-backed encouragement.
  | 'personalBest'
  | 'personalMilestone'
  | 'personalImprovement'
  | 'personalConsistency'
  | 'researchFact'
  // Legacy types retained for back-compat with existing tests and callers.
  | 'speedSolver'
  | 'efficiencyMachine'
  | 'letterDetective'
  | 'closeCall'
  | 'lifeSaver'
  | 'wordExplorer'
  | 'fewerGuesses';

export interface WordHuntFact {
  type: WordHuntFactType;
  translationKey: string;
  translationFallback?: string;
  translationParams: Record<string, string | number>;
  icon: string;
  color: 'neo-lime' | 'neo-cyan' | 'neo-orange' | 'neo-pink' | 'neo-yellow';
  value?: number | string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOP_PERFORMER_THRESHOLD = 1;       // top 1% only — true brag territory
const STREAK_LEGEND_DAYS = 30;           // 30+ days — rare
const ELITE_SOLVE_RATE_THRESHOLD = 20;   // <20% solve rate
const RARE_FIRST_TRY_THRESHOLD = 50;     // <50% first-try solve rate — "Only X%" wording only makes sense when X is low
const LOW_LIFE_THRESHOLD = 50;           // speed pillar weak
const LOW_EXPLORATION_THRESHOLD = 5;     // < 5 survival words
const MANY_GUESSES_THRESHOLD = 5;        // 5+ guesses — accuracy pillar weak
const SHORT_TARGET_MAX = 4;
const LONG_WORD_MIN_LENGTH = 7;
const RARE_LETTERS = ['Q', 'X', 'Z', 'J'];
const MIN_PLAYERS_FOR_STATS = 5;
const MAX_FACTS = 1;

// ---------------------------------------------------------------------------
// Variant picker — deterministic per puzzle (same puzzle = same tip)
// ---------------------------------------------------------------------------

function pickVariant<T>(variants: T[], result: WordHuntResult): T {
  const seed = (result.puzzleNumber || 0) + (result.targetWord?.length || 0);
  return variants[seed % variants.length];
}

// ---------------------------------------------------------------------------
// Brag-worthy facts (rare + truly impressive — take precedence over tips)
// ---------------------------------------------------------------------------

function getFirstTryFact(result: WordHuntResult, stats: WordHuntStats): WordHuntFact | null {
  if (!result.solved || result.attemptsUsed !== 1) return null;

  const variants = [
    "One shot. Bullseye. Dictionary's shaking.",
    "First-guess magic. Either psychic or scary good.",
    "Nailed it before your coffee cooled. Showoff.",
  ];
  const fallback = pickVariant(variants, result);

  if (
    stats.totalPlayers < MIN_PLAYERS_FOR_STATS ||
    stats.solveRate >= RARE_FIRST_TRY_THRESHOLD
  ) {
    return {
      type: 'firstTry',
      translationKey: 'wordHunt.facts.firstTryPersonal',
      translationFallback: fallback,
      translationParams: {},
      icon: 'Sparkles',
      color: 'neo-yellow',
      value: 1,
    };
  }

  return {
    type: 'firstTry',
    translationKey: 'wordHunt.facts.firstTryRare',
    translationFallback: `${fallback} Only ${stats.solveRate}% of players solve in 1.`,
    translationParams: { solveRate: stats.solveRate },
    icon: 'Sparkles',
    color: 'neo-yellow',
    value: 1,
  };
}

function getPerfectScoreFact(result: WordHuntResult): WordHuntFact | null {
  if (!result.solved) return null;
  if ((result.efficiencyScore ?? 0) < 1000) return null;

  const variants = [
    "1000/1000. Flawless victory. We'd print a certificate but you'd just frame it twice.",
    "Perfect score. Speed, accuracy, exploration — all maxed. Hang up your keyboard, champion.",
    "A clean 1000. Somewhere, a thesaurus just bowed.",
  ];

  return {
    type: 'perfectScore',
    translationKey: 'wordHunt.facts.perfectScore',
    translationFallback: pickVariant(variants, result),
    translationParams: {},
    icon: 'Crown',
    color: 'neo-yellow',
    value: 1000,
  };
}

function getTopPerformerFact(result: WordHuntResult, stats: WordHuntStats): WordHuntFact | null {
  if (stats.totalPlayers < MIN_PLAYERS_FOR_STATS) return null;
  const pct = stats.yourStats?.percentile;
  if (!pct || pct > TOP_PERFORMER_THRESHOLD) return null;

  const variants = [
    `Top ${pct}%. You didn't play the puzzle — you bullied it.`,
    `Top ${pct}% today. The leaderboard just filed a complaint.`,
    `${pct}%? That's not a percentile, that's a flex.`,
  ];

  return {
    type: 'topPerformer',
    translationKey: 'wordHunt.facts.topPerformerElite',
    translationFallback: pickVariant(variants, result),
    translationParams: { percentile: pct },
    icon: 'Crown',
    color: 'neo-yellow',
    value: `${pct}%`,
  };
}

function getStreakLegendFact(result: WordHuntResult): WordHuntFact | null {
  if (result.streakDays < STREAK_LEGEND_DAYS) return null;

  const variants = [
    `${result.streakDays}-day streak. More consistent than your morning alarm.`,
    `${result.streakDays} days straight. Archaeologists will study this one day.`,
    `${result.streakDays}-day streak — you've outlasted three JavaScript frameworks.`,
  ];

  return {
    type: 'streakLegend',
    translationKey: 'wordHunt.facts.streakLegendBig',
    translationFallback: pickVariant(variants, result),
    translationParams: { days: result.streakDays },
    icon: 'Flame',
    color: 'neo-orange',
    value: result.streakDays,
  };
}

// ---------------------------------------------------------------------------
// Coach tips — concrete, actionable advice based on weakest score pillar
// ---------------------------------------------------------------------------

function getLossTip(result: WordHuntResult): WordHuntFact | null {
  if (result.solved) return null;

  const wordsFound = result.wordsDiscovered?.length ?? 0;
  const variants = [
    `Try this next round: scout 2–3 short side-words FIRST. Free letters, free life, cheaper guesses.`,
    `Secret weapon: side-words. 3–4 letter combos spill intel before you risk a real guess.`,
    `Pro move: hunt short words early. Three tiny wins = ~30 life + hints. Your guesses land sharper.`,
  ];

  return {
    type: 'tipLoss',
    translationKey: 'wordHunt.facts.tipLoss',
    translationFallback: pickVariant(variants, result),
    translationParams: { words: wordsFound },
    icon: 'Compass',
    color: 'neo-pink',
  };
}

function getExplorationTip(result: WordHuntResult): WordHuntFact | null {
  if (!result.solved) return null;
  const words = result.wordsDiscovered?.length ?? 0;
  if (words >= LOW_EXPLORATION_THRESHOLD) return null;

  const potentialGain = Math.min(20, 10) * 10 - words * 10; // up to +100 easy pts
  const variants = [
    `${words} side-words. Every extra one = +10 pts, up to 20. Easy +${potentialGain} waiting for you next time.`,
    `Biggest leak: exploration. Roughly +${potentialGain} pts just sitting there — short words score the same as long ones.`,
    `Pros scoop 15–20 side-words. You grabbed ${words}. Swipe every 3–4 letter combo you spot — the grid's a buffet.`,
  ];

  return {
    type: 'tipExploration',
    translationKey: 'wordHunt.facts.tipExploration',
    translationFallback: pickVariant(variants, result),
    translationParams: { words, gain: potentialGain },
    icon: 'Compass',
    color: 'neo-cyan',
    value: words,
  };
}

function getSpeedTip(result: WordHuntResult): WordHuntFact | null {
  if (!result.solved) return null;
  const life = result.lifeRemaining;
  if (life == null || life >= LOW_LIFE_THRESHOLD) return null;

  const lifeRounded = Math.round(life);
  const variants = [
    `Life crashed to ${lifeRounded}. Longer side-words heal faster — 7+ letters = +25 life. One chunky word ≈ +100 score.`,
    `${lifeRounded} life at the end. Trade quantity for length: 5-letter = +15, 7+ = +25. Your health bar will thank you.`,
    `Low life = low Speed score. Every 7-letter side-word banks 25 life AND 4 clue tokens. Hunt long BEFORE guessing.`,
  ];

  return {
    type: 'tipSpeed',
    translationKey: 'wordHunt.facts.tipSpeed',
    translationFallback: pickVariant(variants, result),
    translationParams: { life: Math.round(life) },
    icon: 'HeartPulse',
    color: 'neo-pink',
    value: Math.round(life),
  };
}

function getAccuracyTip(result: WordHuntResult): WordHuntFact | null {
  if (!result.solved) return null;
  if (result.attemptsUsed < MANY_GUESSES_THRESHOLD) return null;

  const lost = (result.attemptsUsed - 1) * 40;
  const variants = [
    `${result.attemptsUsed} guesses = −${lost} Accuracy pts. Sniper rule: never reuse a grey letter, always shuffle yellows. Solve in ≤3 to keep all ${lost} next time.`,
    `Lost ${lost} pts to extra tries. Before guessing, mentally list the letters you KNOW are wrong — then force every new word to exclude them.`,
    `${result.attemptsUsed} tries stings (−${lost}). The fix isn't speed, it's patience: treat every yellow like a clue, not a suggestion.`,
  ];

  return {
    type: 'tipAccuracy',
    translationKey: 'wordHunt.facts.tipAccuracy',
    translationFallback: pickVariant(variants, result),
    translationParams: { attempts: result.attemptsUsed, lost },
    icon: 'Target',
    color: 'neo-orange',
    value: result.attemptsUsed,
  };
}

function getShortTargetTip(result: WordHuntResult): WordHuntFact | null {
  if (!result.solved) return null;
  if (result.targetWord.length > SHORT_TARGET_MAX) return null;
  if (result.attemptsUsed <= 2) return null;

  const variants = [
    `Short targets bite. Open with 4-vowel words like ADIEU or AUDIO — first guess becomes a vowel scan.`,
    `${result.targetWord.length}-letter target? Tricky. Pack your opener with vowels so you map the whole set in one move.`,
    `Little words hide the best. Use guess #1 as recon, not a shot — load it with distinct vowels.`,
  ];

  return {
    type: 'tipShortTarget',
    translationKey: 'wordHunt.facts.tipShortTarget',
    translationFallback: pickVariant(variants, result),
    translationParams: { length: result.targetWord.length },
    icon: 'Search',
    color: 'neo-cyan',
    value: result.targetWord.length,
  };
}

// ---------------------------------------------------------------------------
// Witty observation fallbacks
// ---------------------------------------------------------------------------

function getEliteClubFact(result: WordHuntResult, stats: WordHuntStats): WordHuntFact | null {
  if (!result.solved) return null;
  if (stats.totalPlayers < MIN_PLAYERS_FOR_STATS) return null;
  if (stats.solveRate >= ELITE_SOLVE_RATE_THRESHOLD) return null;

  const variants = [
    `Only ${stats.solveRate}% solved today. You're in rarefied air.`,
    `${stats.solveRate}% solve rate — most players rage-quit this one. You didn't.`,
    `Today's puzzle ate ${100 - stats.solveRate}% of players. You ate the puzzle.`,
  ];

  return {
    type: 'eliteClub',
    translationKey: 'wordHunt.facts.eliteClubRare',
    translationFallback: pickVariant(variants, result),
    translationParams: { solveRate: stats.solveRate },
    icon: 'Shield',
    color: 'neo-pink',
  };
}

function getPalindromeFact(result: WordHuntResult): WordHuntFact | null {
  const word = sanitizeWord(result.targetWord, result.language).toLowerCase();
  if (word.length < 2) return null;
  const reversed = word.split('').reverse().join('');
  if (word !== reversed) return null;

  const variants = [
    `Palindrome alert — reads the same both ways. Mirror-proof vocabulary.`,
    `A palindrome. Half the work, double the flex.`,
    `Flip it, spin it, same word. Palindromes are built different.`,
  ];

  return {
    type: 'palindrome',
    translationKey: 'wordHunt.facts.palindrome',
    translationFallback: pickVariant(variants, result),
    translationParams: {},
    icon: 'RotateCcw',
    color: 'neo-yellow',
  };
}

function getRareLetterFact(result: WordHuntResult): WordHuntFact | null {
  if (result.language !== 'en') return null;
  const upper = result.targetWord.toUpperCase();
  const found = RARE_LETTERS.find((letter) => upper.includes(letter));
  if (!found) return null;

  const variants = [
    `A word with '${found}'? Scrabble players just perked up.`,
    `'${found}' in the target — rare letters, rarer skill.`,
    `'${found}' spotted. Today's puzzle pulled out the big bag of letters.`,
  ];

  return {
    type: 'rareLetter',
    translationKey: 'wordHunt.facts.rareLetter',
    translationFallback: pickVariant(variants, result),
    translationParams: { letter: found },
    icon: 'Gem',
    color: 'neo-pink',
  };
}

function getLossEffortFact(result: WordHuntResult): WordHuntFact | null {
  if (result.solved) return null;
  const words = result.wordsDiscovered?.length ?? 0;

  const variants = [
    `${words} side-words found. Puzzle won this round — your grid-scanning still showed up.`,
    `Not today. But ${words} discoveries is nothing to sneeze at. Come back tomorrow and flip it.`,
    `Missed the target, still pulled ${words} words out of the chaos. Next run, you crack it.`,
  ];

  return {
    type: 'lossEffort',
    translationKey: 'wordHunt.facts.lossEffort',
    translationFallback: pickVariant(variants, result),
    translationParams: { words },
    icon: 'Sparkles',
    color: 'neo-cyan',
    value: words,
  };
}

function getLongWordFact(result: WordHuntResult): WordHuntFact | null {
  if (result.targetWord.length < LONG_WORD_MIN_LENGTH) return null;

  const variants = [
    `A ${result.targetWord.length}-letter target. That's a proper word-marathon.`,
    `${result.targetWord.length} letters. Short on vowels? We hope not.`,
    `${result.targetWord.length}-letter target. Your eyes did push-ups today.`,
  ];

  return {
    type: 'longWord',
    translationKey: 'wordHunt.facts.longWord',
    translationFallback: pickVariant(variants, result),
    translationParams: { length: result.targetWord.length },
    icon: 'Ruler',
    color: 'neo-orange',
  };
}

// ---------------------------------------------------------------------------
// Aggregator — priority chain, returns top MAX_FACTS
// ---------------------------------------------------------------------------

export function getWordHuntFacts(
  result: WordHuntResult,
  stats: WordHuntStats
): WordHuntFact[] {
  // Priority order: rare brags → actionable coach tips → witty fallback observations.
  // First non-null wins (we show only 1 insight).
  const generators = [
    // 1. Rare brag-worthy (truly impressive)
    () => getFirstTryFact(result, stats),
    () => getPerfectScoreFact(result),
    () => getTopPerformerFact(result, stats),
    () => getStreakLegendFact(result),

    // 2. Coach tips (actionable — help them get a better score next time)
    () => getLossTip(result),
    () => getExplorationTip(result),
    () => getAccuracyTip(result),
    () => getSpeedTip(result),
    () => getShortTargetTip(result),

    // 3. Witty fallback observations
    () => getEliteClubFact(result, stats),
    () => getPalindromeFact(result),
    () => getRareLetterFact(result),
    () => getLongWordFact(result),
  ];

  const facts: WordHuntFact[] = [];
  for (const gen of generators) {
    const f = gen();
    if (f) {
      facts.push(f);
      if (facts.length >= MAX_FACTS) break;
    }
  }
  return facts;
}

// ---------------------------------------------------------------------------
// New API — encouragement + coach tip pair (distinct UI surfaces)
// ---------------------------------------------------------------------------

export interface WordHuntInsights {
  encouragement: WordHuntFact | null;
  tip: WordHuntFact | null;
  /**
   * Optional third slot — personal progression fact sourced from history,
   * with a research-backed "did you know" as a guaranteed fallback so the
   * result page always has something warm + educational to show.
   */
  insight: WordHuntFact | null;
}

// ---------------------------------------------------------------------------
// Personal progression facts (require history)
// ---------------------------------------------------------------------------

const MILESTONE_COMPLETIONS = [10, 25, 50, 100, 200, 365];
const IMPROVEMENT_WINDOW = 7;         // last N days
const MIN_HISTORY_FOR_TREND = 6;      // need at least 6 past results to compare
const IMPROVEMENT_MIN_DELTA = 0.5;    // at least half-a-guess better to celebrate

function excludeToday(
  history: StoredWordHuntResult[],
  result: WordHuntResult
): StoredWordHuntResult[] {
  return history.filter((h) => h.date !== result.puzzleDate);
}

function getPersonalBestFact(
  result: WordHuntResult,
  history: StoredWordHuntResult[]
): WordHuntFact | null {
  if (!result.solved) return null;
  const today = result.efficiencyScore ?? 0;
  if (today <= 0) return null;

  const past = excludeToday(history, result)
    .map((h) => h.result.efficiencyScore ?? 0)
    .filter((s) => s > 0);
  if (past.length < 3) return null; // need some baseline to claim a "best"

  const prevBest = Math.max(...past);
  if (today <= prevBest) return null;

  const delta = today - prevBest;
  const variants = [
    `New personal best! ${today} pts — beat your old record by ${delta}.`,
    `Record smashed. ${today} tops your previous high of ${prevBest}.`,
    `You just set a new PB: ${today} pts. Old king: ${prevBest}.`,
  ];

  return {
    type: 'personalBest',
    translationKey: 'wordHunt.facts.personalBest',
    translationFallback: pickVariant(variants, result),
    translationParams: { score: today, prev: prevBest, delta },
    icon: 'Crown',
    color: 'neo-yellow',
    value: today,
  };
}

function getPersonalMilestoneFact(
  result: WordHuntResult,
  history: StoredWordHuntResult[]
): WordHuntFact | null {
  // Include today because the save happens before the results render.
  const hasToday = history.some((h) => h.date === result.puzzleDate);
  const count = hasToday ? history.length : history.length + 1;
  if (!MILESTONE_COMPLETIONS.includes(count)) return null;

  const variants = [
    `${count} puzzles done. Research links daily word-play to sharper verbal recall with age.`,
    `Milestone: ${count} hunts completed. Consistency is the single strongest predictor of vocab growth.`,
    `${count} in the books. Regular word puzzles are associated with slower cognitive decline in adults 50+.`,
  ];

  return {
    type: 'personalMilestone',
    translationKey: 'wordHunt.facts.personalMilestone',
    translationFallback: pickVariant(variants, result),
    translationParams: { count },
    icon: 'Flame',
    color: 'neo-orange',
    value: count,
  };
}

function getPersonalImprovementFact(
  result: WordHuntResult,
  history: StoredWordHuntResult[]
): WordHuntFact | null {
  if (!result.solved) return null;
  const past = excludeToday(history, result).filter((h) => h.result.solved);
  if (past.length < MIN_HISTORY_FOR_TREND) return null;

  // Sorted desc by date already (storage.ts). Compare recent window to older.
  const recent = past.slice(0, IMPROVEMENT_WINDOW);
  const older = past.slice(IMPROVEMENT_WINDOW, IMPROVEMENT_WINDOW * 2);
  if (older.length < 3) return null;

  const avg = (xs: StoredWordHuntResult[]) =>
    xs.reduce((s, h) => s + h.result.attemptsUsed, 0) / xs.length;

  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const delta = olderAvg - recentAvg; // positive = improving (fewer guesses now)
  if (delta < IMPROVEMENT_MIN_DELTA) return null;

  const deltaRounded = Math.round(delta * 10) / 10;
  const variants = [
    `You're solving ~${deltaRounded} guesses faster than two weeks ago. Spacing effect at work.`,
    `Recent runs: ${recentAvg.toFixed(1)} avg guesses vs ${olderAvg.toFixed(1)} before. Measurable progress.`,
    `Trend: ${deltaRounded} fewer guesses per solve than your earlier pace. Pattern recognition kicking in.`,
  ];

  return {
    type: 'personalImprovement',
    translationKey: 'wordHunt.facts.personalImprovement',
    translationFallback: pickVariant(variants, result),
    translationParams: {
      delta: deltaRounded,
      recent: recentAvg.toFixed(1),
      older: olderAvg.toFixed(1),
    },
    icon: 'Zap',
    color: 'neo-lime',
    value: `-${deltaRounded}`,
  };
}

function getPersonalConsistencyFact(
  result: WordHuntResult,
  history: StoredWordHuntResult[]
): WordHuntFact | null {
  const past = excludeToday(history, result);
  if (past.length < 5) return null;

  const solved = past.filter((h) => h.result.solved).length;
  const rate = Math.round((solved / past.length) * 100);
  if (rate < 70) return null; // only celebrate high consistency

  const variants = [
    `Your solve rate across ${past.length} runs: ${rate}%. Deliberate practice beats talent.`,
    `${rate}% personal solve rate. Studies show daily retrieval practice compounds faster than cramming.`,
    `${solved}/${past.length} solved. That consistency is what rewires the lexical loop.`,
  ];

  return {
    type: 'personalConsistency',
    translationKey: 'wordHunt.facts.personalConsistency',
    translationFallback: pickVariant(variants, result),
    translationParams: { rate, solved, total: past.length },
    icon: 'Shield',
    color: 'neo-cyan',
    value: `${rate}%`,
  };
}

// ---------------------------------------------------------------------------
// Research-backed facts (always available fallback)
// ---------------------------------------------------------------------------
//
// All sourced from published findings, paraphrased concisely:
//  - Brooker et al. (2019), Int. J. Geriatric Psych — PROTECT study: frequent
//    word-puzzle play correlates with better executive function & vocabulary
//    equivalent to ~10 years younger in adults 50+.
//  - Pillai et al. (2011), Neurology — crossword habits associated with
//    delayed onset of accelerated memory decline (~2.5 years).
//  - Cepeda et al. (2006), Psych. Bulletin — the spacing effect: distributed
//    practice (e.g. one short session daily) produces ~2x retention vs massed.
//  - Nation (2001), Learning Vocabulary in Another Language — 10–20 meaningful
//    exposures are typical to fully acquire a new word.
//  - Bialystok (2017), Psych. Bulletin — frequent lexical retrieval is linked
//    to stronger working-memory performance across the lifespan.
//  - Karpicke & Roediger (2008), Science — the testing effect: active recall
//    (guessing a word from clues) retains ~50% more than passive review.

const RESEARCH_FACTS: Array<{
  key: string;
  fallback: string;
  icon: string;
  color: WordHuntFact['color'];
}> = [
  {
    key: 'wordHunt.facts.researchProtect',
    fallback:
      "Did you know? Adults who play word puzzles daily score as if ~10 years younger on verbal reasoning tests (PROTECT study, 2019).",
    icon: 'Sparkles',
    color: 'neo-cyan',
  },
  {
    key: 'wordHunt.facts.researchSpacing',
    fallback:
      "Spacing effect: one short daily session produces ~2× the retention of a long cram (Cepeda et al., 2006).",
    icon: 'Zap',
    color: 'neo-lime',
  },
  {
    key: 'wordHunt.facts.researchCrossword',
    fallback:
      "Regular crossword-style play is associated with a ~2.5 year delay in accelerated memory decline (Pillai et al., 2011).",
    icon: 'Shield',
    color: 'neo-pink',
  },
  {
    key: 'wordHunt.facts.researchRecall',
    fallback:
      "Testing effect: guessing a word from partial clues retains it ~50% better than just reading it (Karpicke & Roediger, 2008).",
    icon: 'Target',
    color: 'neo-orange',
  },
  {
    key: 'wordHunt.facts.researchExposures',
    fallback:
      "Most new words need 10–20 meaningful encounters before they stick. Each puzzle is one of those encounters.",
    icon: 'Compass',
    color: 'neo-cyan',
  },
  {
    key: 'wordHunt.facts.researchBilingual',
    fallback:
      "Frequent lexical retrieval is linked to stronger working memory across the lifespan (Bialystok, 2017).",
    icon: 'Gem',
    color: 'neo-purple' as unknown as WordHuntFact['color'],
  },
];

function getResearchFact(result: WordHuntResult): WordHuntFact {
  const idx = (result.puzzleNumber || 0) % RESEARCH_FACTS.length;
  const f = RESEARCH_FACTS[idx];
  // Coerce to a supported colour (no neo-purple in COLOR_STYLES map).
  const color: WordHuntFact['color'] =
    (['neo-lime', 'neo-cyan', 'neo-orange', 'neo-pink', 'neo-yellow'] as const).includes(
      f.color as 'neo-lime',
    )
      ? f.color
      : 'neo-cyan';

  return {
    type: 'researchFact',
    translationKey: f.key,
    translationFallback: f.fallback,
    translationParams: {},
    icon: f.icon,
    color,
  };
}

// ---------------------------------------------------------------------------

export function getWordHuntInsights(
  result: WordHuntResult,
  stats: WordHuntStats,
  personalHistory: StoredWordHuntResult[] = []
): WordHuntInsights {
  // Encouragement: brag-worthy first, witty observation, then a loss-safe fallback
  // so losers always receive an encouragement card alongside their coach tip.
  const encouragementChain = [
    () => getFirstTryFact(result, stats),
    () => getPerfectScoreFact(result),
    () => getTopPerformerFact(result, stats),
    () => getStreakLegendFact(result),
    () => getEliteClubFact(result, stats),
    () => getPalindromeFact(result),
    () => getRareLetterFact(result),
    () => getLongWordFact(result),
    () => getLossEffortFact(result),
  ];

  // Coach tip: the single highest-leverage actionable suggestion.
  const tipChain = [
    () => getLossTip(result),
    () => getExplorationTip(result),
    () => getAccuracyTip(result),
    () => getSpeedTip(result),
    () => getShortTargetTip(result),
  ];

  let encouragement: WordHuntFact | null = null;
  for (const gen of encouragementChain) {
    const f = gen();
    if (f) { encouragement = f; break; }
  }

  let tip: WordHuntFact | null = null;
  for (const gen of tipChain) {
    const f = gen();
    if (f) { tip = f; break; }
  }

  // Insight: personal progression > research fallback (always returns something).
  const insightChain: Array<() => WordHuntFact | null> = [
    () => getPersonalBestFact(result, personalHistory),
    () => getPersonalMilestoneFact(result, personalHistory),
    () => getPersonalImprovementFact(result, personalHistory),
    () => getPersonalConsistencyFact(result, personalHistory),
    () => getResearchFact(result),
  ];

  let insight: WordHuntFact | null = null;
  for (const gen of insightChain) {
    const f = gen();
    if (f) { insight = f; break; }
  }

  return { encouragement, tip, insight };
}
