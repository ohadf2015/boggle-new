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

import type { WordHuntResult } from '@/utils/dailyChallenge';
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
  | 'eliteClub'
  | 'palindrome'
  | 'rareLetter'
  | 'longWord'
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
    "One shot. One kill. The dictionary is scared of you.",
    "First try?! Either clairvoyant or wildly lucky. We'll take both.",
    "Nailed it before coffee kicked in. Flawless opener.",
  ];
  const fallback = pickVariant(variants, result);

  if (stats.totalPlayers < MIN_PLAYERS_FOR_STATS) {
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
    `Stuck? Next time, build 2-3 short survival words FIRST. Each reveals a letter AND banks life — guesses get cheaper.`,
    `Tip: survival words (3-4 letters) are free intel. They show which letters the grid even contains before you spend a guess.`,
    `Lost? Hunt short side-words early. 3 survival words ≈ 30 life + letter hints. Target guesses land way better.`,
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
    `Only ${words} survival words found. Each non-target word = +10 score (cap 20). Easy +${potentialGain} pts next time — scan for 3-4 letter words hiding between grid letters.`,
    `Biggest leak: exploration. You left ~${potentialGain} pts on the board. Short words count the same as long ones for Exploration — speed-tap them.`,
    `${words} side-words. Pros find 15-20. Any valid word that isn't the target still scores. Swipe aggressively on short combos.`,
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

  const variants = [
    `Life bottomed at ${life}. Speed pillar = life × 4. Fix: long survival words regen life — 7+ letters = 25 life. One fat word ≈ +100 score.`,
    `${life} life left — Speed score suffered. Longer survival words refill faster (5 letters = 15 life, 7+ = 25). Prioritize length over quantity.`,
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
    `${result.attemptsUsed} guesses cost you ${lost} Accuracy pts (-40 each). Rule: never reuse a grey letter, always reposition yellows. Solve in ≤3 for +${lost} pts.`,
    `Accuracy pillar dropped ${lost} pts. Before guessing, list the letters you KNOW are wrong — force each new guess to exclude them all.`,
    `${result.attemptsUsed} tries = -${lost} score. The fix isn't speed, it's patience: treat every yellow like a puzzle clue before firing your next word.`,
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
    `${result.targetWord.length}-letter targets have fewer anchors. Open with vowel-heavy words (ADIEU, AUDIO) to map possible letters in one shot.`,
    `Short target = trickier. First-guess strategy: pack 3-4 common vowels. You'll know the vowel set before spending a real guess.`,
    `Short words hide better. Use your first guess as a scan, not a shot — pick a word with 4 distinct vowels.`,
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
