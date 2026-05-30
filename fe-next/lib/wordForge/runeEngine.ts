/**
 * Rune Engine — Evaluates individual rune effects against a word + context.
 *
 * Each rune has an evaluator function that returns a RuneEffect or null.
 * The scoring engine calls evaluateRune() for each equipped rune on each word.
 */

import type { RuneCardDef, RuneEffect, ScoringContext } from '@/types/wordForge';
import {
  LETTER_POINTS,
  isAlphaLetter,
  VOWELS,
  RARE_LETTERS,
} from './letterValues';

/** Registry of rune evaluator functions keyed by rune ID */
type RuneEvaluator = (context: ScoringContext) => RuneEffect | null;

const evaluators: Record<string, RuneEvaluator> = {};

/** Register a rune evaluator */
export function registerRune(runeId: string, evaluator: RuneEvaluator): void {
  evaluators[runeId] = evaluator;
}

/** Test helper — reports whether an evaluator is registered for this rune id. */
export function hasEvaluator(runeId: string): boolean {
  return runeId in evaluators;
}

/** Evaluate a rune against a scoring context. Returns effect or null if not triggered. */
export function evaluateRune(
  def: RuneCardDef,
  context: ScoringContext,
): RuneEffect | null {
  const evaluator = evaluators[def.id];
  if (!evaluator) {
    console.warn(`[RuneEngine] No evaluator registered for rune "${def.id}" — effect skipped`);
    return null;
  }
  return evaluator(context);
}

// ─── Helper Utils ──────────────────────────────────────────

// Letter points + vowel/rare sets come from the shared letterValues module so
// English and Hebrew score consistently (the inline English-only tables here
// were the cause of Hebrew words scoring 0). ECHO_LETTER_POINTS now aliases the
// shared (English u Hebrew) table; existing direct lookups keep working.
const ECHO_LETTER_POINTS = LETTER_POINTS;

export function countVowels(word: string): number {
  return word.toUpperCase().split('').filter(ch => VOWELS.has(ch)).length;
}

export function countConsonants(word: string): number {
  // A letter that is alphabetic (English or Hebrew) but not a vowel.
  return word
    .toUpperCase()
    .split('')
    .filter(ch => !VOWELS.has(ch) && isAlphaLetter(ch)).length;
}

export function countRareLetters(word: string): number {
  return word.toUpperCase().split('').filter(ch => RARE_LETTERS.has(ch)).length;
}

export function hasDoubleLetters(word: string): boolean {
  const upper = word.toUpperCase();
  for (let i = 0; i < upper.length - 1; i++) {
    if (upper[i] === upper[i + 1]) return true;
  }
  return false;
}

export function hasAllUniqueLetters(word: string): boolean {
  const upper = word.toUpperCase();
  return new Set(upper.split('')).size === upper.length;
}

export function isPalindrome(word: string): boolean {
  if (word.length < 3) return false;
  const upper = word.toUpperCase();
  const reversed = upper.split('').reverse().join('');
  return upper === reversed;
}

export function startsWithSameAs(word: string, previousWord: string | null): boolean {
  if (!previousWord) return false;
  return word[0].toUpperCase() === previousWord[0].toUpperCase();
}

export function isChainWord(word: string, previousWord: string | null): boolean {
  if (!previousWord) return false;
  const lastChar = previousWord[previousWord.length - 1].toUpperCase();
  return word[0].toUpperCase() === lastChar;
}

function getBaseLetterPoints(word: string): number {
  return word.toUpperCase().split('').reduce((sum, ch) => sum + (ECHO_LETTER_POINTS[ch] ?? 0), 0);
}

// ─── Register All 60 Runes ────────────────────────────────

// === CHIP RUNES ===

registerRune('vowelMiner', (ctx) => {
  const count = countVowels(ctx.word);
  if (count === 0) return null;
  return {
    runeId: 'vowelMiner',
    runeName: 'Vowel Miner',
    description: `+${count * 3} (${count} vowels)`,
    type: 'addPoints',
    value: count * 3,
  };
});

registerRune('longHaul', (ctx) => {
  const extra = ctx.word.length - 4;
  if (extra <= 0) return null;
  return {
    runeId: 'longHaul',
    runeName: 'Long Haul',
    description: `+${extra * 3} (${extra} letters beyond 4th)`,
    type: 'addPoints',
    value: extra * 3,
  };
});

registerRune('firstBlood', (ctx) => {
  if (ctx.wordsThisRound.length > 0) return null;
  return {
    runeId: 'firstBlood',
    runeName: 'First Blood',
    description: '+15 (first word)',
    type: 'addPoints',
    value: 15,
  };
});

registerRune('doubleDown', (ctx) => {
  if (!hasDoubleLetters(ctx.word)) return null;
  return {
    runeId: 'doubleDown',
    runeName: 'Double Down',
    description: '+8 (double letters)',
    type: 'addPoints',
    value: 8,
  };
});

registerRune('rareFinder', (ctx) => {
  const count = countRareLetters(ctx.word);
  if (count === 0) return null;
  return {
    runeId: 'rareFinder',
    runeName: 'Rare Finder',
    description: `+${count * 5} (${count} rare letters)`,
    type: 'addPoints',
    value: count * 5,
  };
});

registerRune('consonantClub', (ctx) => {
  const count = countConsonants(ctx.word);
  if (count === 0) return null;
  return {
    runeId: 'consonantClub',
    runeName: 'Consonant Club',
    description: `+${count * 2} (${count} consonants)`,
    type: 'addPoints',
    value: count * 2,
  };
});

registerRune('shortSprint', (ctx) => {
  if (ctx.word.length !== 3) return null;
  return {
    runeId: 'shortSprint',
    runeName: 'Short Sprint',
    description: '+6 (3-letter word)',
    type: 'addPoints',
    value: 6,
  };
});

registerRune('sweetSpot', (ctx) => {
  if (ctx.word.length !== 4) return null;
  return {
    runeId: 'sweetSpot',
    runeName: 'Sweet Spot',
    description: '+10 (4-letter word)',
    type: 'addPoints',
    value: 10,
  };
});

registerRune('cleanSlate', (ctx) => {
  if (!hasAllUniqueLetters(ctx.word)) return null;
  return {
    runeId: 'cleanSlate',
    runeName: 'Clean Slate',
    description: '+4 (all unique letters)',
    type: 'addPoints',
    value: 4,
  };
});

registerRune('perfectFive', (ctx) => {
  if (ctx.word.length !== 5) return null;
  return {
    runeId: 'perfectFive',
    runeName: 'Perfect Five',
    description: '+12 (5-letter word)',
    type: 'addPoints',
    value: 12,
  };
});

registerRune('palindromePrize', (ctx) => {
  if (!isPalindrome(ctx.word)) return null;
  return {
    runeId: 'palindromePrize',
    runeName: 'Palindrome Prize',
    description: '+25 (palindrome!)',
    type: 'addPoints',
    value: 25,
  };
});

registerRune('streakBonus', (ctx) => {
  // comboCount is used as the consecutive-word streak
  if (ctx.comboCount <= 0) return null;
  const bonus = ctx.comboCount * 5;
  return {
    runeId: 'streakBonus',
    runeName: 'Streak Bonus',
    description: `+${bonus} (${ctx.comboCount} streak)`,
    type: 'addPoints',
    value: bonus,
  };
});

registerRune('wordHoarder', (ctx) => {
  const uniqueCount = ctx.allWordsThisRun.length;
  if (uniqueCount === 0) return null;
  const bonus = Math.min(uniqueCount, 20) * 2;
  return {
    runeId: 'wordHoarder',
    runeName: 'Word Hoarder',
    description: `+${bonus} (${uniqueCount} unique words)`,
    type: 'addPoints',
    value: bonus,
  };
});

registerRune('sharpEdge', (ctx) => {
  const pts = getBaseLetterPoints(ctx.word);
  const avg = pts / ctx.word.length;
  let count = 0;
  for (const ch of ctx.word.toUpperCase()) {
    if ((ECHO_LETTER_POINTS[ch] ?? 0) > avg) count++;
  }
  if (count === 0) return null;
  const bonus = count * 5;
  return {
    runeId: 'sharpEdge',
    runeName: 'Sharp Edge',
    description: `+${bonus} (${count} above-avg letters)`,
    type: 'addPoints',
    value: bonus,
  };
});

// === MULT RUNES ===

registerRune('wordSmith', (ctx) => {
  if (ctx.word.length < 5) return null;
  return {
    runeId: 'wordSmith',
    runeName: 'Word Smith',
    description: '×1.5 (5+ letters)',
    type: 'multiply',
    value: 1.5,
  };
});

registerRune('comboFire', (ctx) => {
  const streak = Math.min(ctx.comboCount, 10);
  if (streak <= 0) return null;
  const mult = 1.0 + (streak * 0.1);
  return {
    runeId: 'comboFire',
    runeName: 'Combo Fire',
    description: `×${mult.toFixed(1)} (${streak} combo)`,
    type: 'multiply',
    value: mult,
  };
});

registerRune('alliteration', (ctx) => {
  if (!startsWithSameAs(ctx.word, ctx.previousWord)) return null;
  return {
    runeId: 'alliteration',
    runeName: 'Alliteration',
    description: '×2 (same start letter)',
    type: 'multiply',
    value: 2,
  };
});

registerRune('chainLink', (ctx) => {
  if (!isChainWord(ctx.word, ctx.previousWord)) return null;
  return {
    runeId: 'chainLink',
    runeName: 'Chain Link',
    description: '×2 (word chain!)',
    type: 'multiply',
    value: 2,
  };
});

registerRune('speedDemon', (ctx) => {
  if (ctx.wordFindTime > 3) return null;
  return {
    runeId: 'speedDemon',
    runeName: 'Speed Demon',
    description: '×2 (found in <3s)',
    type: 'multiply',
    value: 2,
  };
});

registerRune('criticalHit', (ctx) => {
  const hash = simpleHash(ctx.word + ctx.round);
  if (hash % 5 !== 0) return null;
  return {
    runeId: 'criticalHit',
    runeName: 'Critical Hit',
    description: '×3 CRIT!',
    type: 'multiply',
    value: 3,
  };
});

registerRune('palindromePower', (ctx) => {
  if (!isPalindrome(ctx.word)) return null;
  return {
    runeId: 'palindromePower',
    runeName: 'Palindrome Power',
    description: '×4 (palindrome!)',
    type: 'multiply',
    value: 4,
  };
});

registerRune('crescendo', (ctx) => {
  const wordsSubmitted = ctx.wordsThisRound.length;
  if (wordsSubmitted === 0) return null;
  const mult = 1.0 + (0.15 * Math.min(wordsSubmitted, 15));
  return {
    runeId: 'crescendo',
    runeName: 'Crescendo',
    description: `×${mult.toFixed(2)} (word #${wordsSubmitted + 1})`,
    type: 'multiply',
    value: mult,
  };
});

registerRune('frontLoad', (ctx) => {
  if (ctx.wordsThisRound.length >= 3) return null;
  return {
    runeId: 'frontLoad',
    runeName: 'Front Load',
    description: '×3 (first 3 words)',
    type: 'multiply',
    value: 3,
  };
});

registerRune('vowelPower', (ctx) => {
  const vowelCount = countVowels(ctx.word);
  if ((vowelCount / ctx.word.length) < 0.5) return null;
  return {
    runeId: 'vowelPower',
    runeName: 'Vowel Power',
    description: '×2.5 (50%+ vowels)',
    type: 'multiply',
    value: 2.5,
  };
});

registerRune('weightedWords', (ctx) => {
  const basePts = getBaseLetterPoints(ctx.word);
  if (basePts <= 15) return null;
  return {
    runeId: 'weightedWords',
    runeName: 'Weighted Words',
    description: `×2 (${basePts} letter pts > 15)`,
    type: 'multiply',
    value: 2,
  };
});

registerRune('grandMaster', (_ctx) => {
  return {
    runeId: 'grandMaster',
    runeName: 'Grand Master',
    description: '×2.5 (always)',
    type: 'multiply',
    value: 2.5,
  };
});

// === SPECIAL RUNES ===

registerRune('echo', (ctx) => {
  const lastChar = ctx.word[ctx.word.length - 1].toUpperCase();
  const points = ECHO_LETTER_POINTS[lastChar] ?? 0;
  if (points === 0) return null;
  return {
    runeId: 'echo',
    runeName: 'Echo',
    description: `+${points} (${lastChar} echoed)`,
    type: 'addPoints',
    value: points,
  };
});

registerRune('timeWarp', (_ctx) => {
  // Handled by run manager (+10s timer), no score effect
  return null;
});

registerRune('hintWhisper', (_ctx) => {
  // Handled by game UI, no score effect
  return null;
});

registerRune('bigGrid', (_ctx) => {
  // Handled by grid manager (6x6 grid), no score effect
  return null;
});

// === CURSED RUNES ===

registerRune('tunnelVision', (ctx) => {
  if (ctx.word.length >= 7) {
    return {
      runeId: 'tunnelVision',
      runeName: 'Tunnel Vision',
      description: '×4 (7+ letters)',
      type: 'multiply',
      value: 4,
    };
  }
  if (ctx.word.length <= 4) {
    return {
      runeId: 'tunnelVision',
      runeName: 'Tunnel Vision',
      description: '×0 (CURSED: 3-4 letter = 0)',
      type: 'multiply',
      value: 0,
    };
  }
  return null;
});

registerRune('berserker', (_ctx) => {
  // Always ×3 (timer reduction to 40s handled by run manager)
  return {
    runeId: 'berserker',
    runeName: 'Berserker',
    description: '×3 (CURSED: 40s timer)',
    type: 'multiply',
    value: 3,
  };
});

registerRune('gamblerRune', (ctx) => {
  const hash = simpleHash(ctx.word + ctx.round + ctx.wordsThisRound.length);
  const wins = hash % 2 === 0;
  return {
    runeId: 'gamblerRune',
    runeName: 'Gambler',
    description: wins ? '×5 (JACKPOT!)' : '×0 (BUST)',
    type: 'multiply',
    value: wins ? 5 : 0,
  };
});

registerRune('glassCannon', (_ctx) => {
  // Always ×2 — miss = run over handled by run manager
  return {
    runeId: 'glassCannon',
    runeName: 'Glass Cannon',
    description: '×2 (CURSED: miss = death)',
    type: 'multiply',
    value: 2,
  };
});

registerRune('debtCollector', (_ctx) => {
  // ×1.8 on all words; the -30 round start debt is handled by run manager
  return {
    runeId: 'debtCollector',
    runeName: 'Debt Collector',
    description: '×1.8 (CURSED: -30 start)',
    type: 'multiply',
    value: 1.8,
  };
});

registerRune('noRepeat', (ctx) => {
  // ×2.5 on all words; duplicate rejection handled by run manager
  // Check if word was already used this run
  if (ctx.allWordsThisRun.includes(ctx.word.toUpperCase())) {
    return {
      runeId: 'noRepeat',
      runeName: 'No Repeat Policy',
      description: '×0 (CURSED: already used!)',
      type: 'multiply',
      value: 0,
    };
  }
  return {
    runeId: 'noRepeat',
    runeName: 'No Repeat Policy',
    description: '×2.5 (CURSED: no repeats)',
    type: 'multiply',
    value: 2.5,
  };
});

registerRune('timeStarved', (_ctx) => {
  // ×1.5 on all words; -3s timer per word handled by run manager
  return {
    runeId: 'timeStarved',
    runeName: 'Time Starved',
    description: '×1.5 (CURSED: -3s per word)',
    type: 'multiply',
    value: 1.5,
  };
});

registerRune('oathOfSilence', (_ctx) => {
  // ×4 on all words; letter ban from previous word handled by run manager
  // TODO: The letter-ban check should happen in run manager before scoring
  return {
    runeId: 'oathOfSilence',
    runeName: 'Oath of Silence',
    description: '×4 (CURSED: banned letters)',
    type: 'multiply',
    value: 4,
  };
});

registerRune('overload', (ctx) => {
  // ×max(1.5, 3.0 - 0.1 * roundsSincePickup); approximate with round number
  // TODO: Needs roundPickedUp from run state; using round as approximation
  const mult = Math.max(1.5, 3.0 - (0.1 * (ctx.round - 1)));
  return {
    runeId: 'overload',
    runeName: 'Overload',
    description: `×${mult.toFixed(1)} (CURSED: decaying)`,
    type: 'multiply',
    value: mult,
  };
});

registerRune('lastStand', (_ctx) => {
  // ×5 on all words; lose 2 rune slots on failure handled by run manager
  return {
    runeId: 'lastStand',
    runeName: 'Last Stand',
    description: '×5 (CURSED: fail = lose 2 slots)',
    type: 'multiply',
    value: 5,
  };
});

// ─── Utils ─────────────────────────────────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
