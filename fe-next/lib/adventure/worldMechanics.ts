/**
 * World Mechanics — evaluate whether a submitted word triggers
 * a world-specific bonus and return the scoring multiplier.
 *
 * Each world has a distinct mechanic that rewards a specific word property.
 * Mechanics should feel different to play — never just a word-length gate.
 */

// ==============================================
// WORD ANALYSIS HELPERS
// ==============================================

const LATIN_GREEK_ROOTS = [
  'aqu', 'aud', 'bene', 'bio', 'chron', 'dict', 'duc', 'fac',
  'gen', 'geo', 'graph', 'jur', 'log', 'luc', 'man', 'mit',
  'mor', 'path', 'phil', 'phon', 'port', 'scrib', 'sent',
  'spec', 'struct', 'tele', 'terr', 'tract', 'vert', 'vid',
  'voc', 'auto', 'micro', 'macro', 'poly', 'mono',
];

/** Common English suffixes that indicate related word families (synonym detection heuristic) */
const SYNONYM_SUFFIXES = ['ing', 'tion', 'ness', 'ment', 'able', 'ible', 'ous', 'ive', 'ful', 'less', 'ly'];

/** Common compound word fragments that appear in real compound words */
const COMPOUND_FRAGMENTS = [
  'sun', 'moon', 'star', 'fire', 'water', 'rain', 'snow', 'wind',
  'day', 'night', 'light', 'dark', 'land', 'sea', 'air', 'sky',
  'book', 'door', 'house', 'room', 'work', 'play', 'time', 'line',
  'head', 'hand', 'foot', 'eye', 'back', 'out', 'over', 'under',
  'bed', 'cup', 'pan', 'pot', 'top', 'base', 'ball', 'side',
];

/**
 * Uncommon letter combinations that indicate rare/unusual words.
 * Words with these bigrams are statistically less common in English.
 */
const RARE_BIGRAMS = [
  'xh', 'zz', 'qe', 'qi', 'xo', 'zy', 'zl', 'xw', 'kn',
  'gn', 'pn', 'wr', 'rh', 'ae', 'oe', 'ph', 'yx', 'yp',
];

function isPalindrome(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < 3) return false;
  return w === w.split('').reverse().join('');
}

function hasDoubleLetters(word: string): boolean {
  const w = word.toLowerCase();
  for (let i = 0; i < w.length - 1; i++) {
    if (w[i] === w[i + 1]) return true;
  }
  return false;
}

function containsLatinGreekRoot(word: string): boolean {
  const w = word.toLowerCase();
  return LATIN_GREEK_ROOTS.some(root => w.includes(root));
}

function isAnagramOfPrevious(word: string, previousWords: string[]): boolean {
  const sorted = word.toLowerCase().split('').sort().join('');
  return previousWords.some(prev => {
    if (prev.toLowerCase() === word.toLowerCase()) return false;
    return prev.toLowerCase().split('').sort().join('') === sorted;
  });
}

/**
 * Synonym Springs: bonus for finding words that share a root/suffix with
 * a previously found word. This creates a "word family" mechanic where
 * players seek related words (e.g., "play" then "playing", "run" then "runner").
 */
function sharesStemWithPrevious(word: string, previousWords: string[]): boolean {
  const w = word.toLowerCase();
  if (w.length < 4) return false;

  // Extract stem (remove common suffixes)
  let stem = w;
  for (const suffix of SYNONYM_SUFFIXES) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      stem = w.slice(0, -suffix.length);
      break;
    }
  }

  // Check if any previous word starts with the same stem (min 3 chars)
  if (stem.length < 3) return false;
  return previousWords.some(prev => {
    const p = prev.toLowerCase();
    if (p === w) return false;
    // Same stem root (e.g., "play" matches "playing")
    return (p.startsWith(stem) || stem.startsWith(p.slice(0, Math.max(3, p.length - 3))));
  });
}

/**
 * Idiom Archipelago: bonus for finding words that contain smaller words.
 * This creates a "word-within-a-word" mechanic (e.g., "together" contains "to", "get", "her").
 * Requires at least 2 embedded words of 3+ letters.
 */
function containsEmbeddedWords(word: string, previousWords: string[]): boolean {
  const w = word.toLowerCase();
  if (w.length < 5) return false;

  // Check how many previously found words appear inside this word
  let embeddedCount = 0;
  for (const prev of previousWords) {
    const p = prev.toLowerCase();
    if (p.length >= 3 && p.length < w.length && w.includes(p)) {
      embeddedCount++;
      if (embeddedCount >= 2) return true;
    }
  }
  return false;
}

/**
 * Neologism Nebula: bonus for rare/unusual words.
 * Detected via uncommon letter bigrams + high consonant density.
 */
function isRareWord(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < 4) return false;

  // Check for rare bigrams
  for (const bigram of RARE_BIGRAMS) {
    if (w.includes(bigram)) return true;
  }

  // High consonant-to-vowel ratio (≥3:1) indicates unusual words
  const vowels = w.replace(/[^aeiou]/g, '').length;
  const consonants = w.length - vowels;
  if (vowels > 0 && consonants / vowels >= 3) return true;

  // Words with uncommon starting letters
  if ('xzqj'.includes(w[0])) return true;

  return false;
}

/**
 * Polyglot Peaks: bonus for words that use all 5 vowels,
 * or words that use no repeated letters (pangram-like).
 * In a 4-language game, this tests vocabulary breadth.
 */
function isPolyglotWord(word: string): boolean {
  const w = word.toLowerCase();
  if (w.length < 4) return false;

  // All unique letters (no repeats) in a word of 5+ letters
  const uniqueLetters = new Set(w.split(''));
  if (w.length >= 5 && uniqueLetters.size === w.length) return true;

  // Contains 4+ distinct vowels
  const vowelSet = new Set(w.split('').filter(c => 'aeiou'.includes(c)));
  if (vowelSet.size >= 4) return true;

  return false;
}

// ==============================================
// MECHANIC EVALUATION
// ==============================================

export interface MechanicResult {
  bonus: boolean;
  multiplier: number;
  feedbackKey?: string;
}

/**
 * Check if a word matches the current world's mechanic.
 * Returns bonus flag, score multiplier, and optional i18n feedback key.
 */
export function evaluateWorldMechanic(
  word: string,
  mechanic: string | null,
  previousWords: string[]
): MechanicResult {
  const none: MechanicResult = { bonus: false, multiplier: 1.0 };
  if (!mechanic) return none;

  switch (mechanic) {
    case 'synonymPairs':
      // World 2 — Synonym Springs: bonus for words sharing a root with previous words
      if (sharesStemWithPrevious(word, previousWords)) {
        return { bonus: true, multiplier: 1.25, feedbackKey: 'adventure.mechanics.synonymPairs' };
      }
      return none;

    case 'etymologyRoots':
      // World 3 — Root Caverns: bonus for Latin/Greek root fragments
      if (containsLatinGreekRoot(word)) {
        return { bonus: true, multiplier: 1.3, feedbackKey: 'adventure.mechanics.etymologyRoots' };
      }
      return none;

    case 'idioms':
      // World 4 — Idiom Archipelago: bonus for words containing 2+ previously found words
      if (containsEmbeddedWords(word, previousWords)) {
        return { bonus: true, multiplier: 1.35, feedbackKey: 'adventure.mechanics.idioms' };
      }
      return none;

    case 'compounds':
      // World 5 — Compound Canyon: bonus for words with compound-word fragments
      if (word.length >= 5 && hasCompoundFragment(word)) {
        return { bonus: true, multiplier: 1.3, feedbackKey: 'adventure.mechanics.compounds' };
      }
      return none;

    case 'anagrams':
      // World 6 — Anagram Labyrinth: bonus for anagrams of previous words
      if (isAnagramOfPrevious(word, previousWords)) {
        return { bonus: true, multiplier: 1.5, feedbackKey: 'adventure.mechanics.anagrams' };
      }
      return none;

    case 'palindromes':
      // World 7 — Mirror Palace: bonus for palindromes
      if (isPalindrome(word)) {
        return { bonus: true, multiplier: 1.5, feedbackKey: 'adventure.mechanics.palindromes' };
      }
      return none;

    case 'rareWords':
      // World 8 — Neologism Nebula: bonus for rare/unusual words
      if (isRareWord(word)) {
        return { bonus: true, multiplier: 1.4, feedbackKey: 'adventure.mechanics.rareWords' };
      }
      return none;

    case 'multilingual':
      // World 9 — Polyglot Peaks: bonus for all-unique-letter or multi-vowel words
      if (isPolyglotWord(word)) {
        return { bonus: true, multiplier: 1.35, feedbackKey: 'adventure.mechanics.multilingual' };
      }
      return none;

    case 'allMechanics': {
      // World 10 — Lexicon Throne: try all mechanics, return the best
      const mechanics = [
        'synonymPairs', 'etymologyRoots', 'idioms', 'compounds',
        'anagrams', 'palindromes', 'rareWords', 'multilingual',
      ];
      let best: MechanicResult = none;
      for (const m of mechanics) {
        const result = evaluateWorldMechanic(word, m, previousWords);
        if (result.multiplier > best.multiplier) {
          best = result;
        }
      }
      return best;
    }

    default:
      return none;
  }
}

/**
 * Check if a word contains a common compound-word fragment.
 * More meaningful than just checking double letters.
 */
function hasCompoundFragment(word: string): boolean {
  const w = word.toLowerCase();
  return COMPOUND_FRAGMENTS.some(frag => {
    const idx = w.indexOf(frag);
    // Fragment must not be the entire word, and word must have content on the other side
    return idx >= 0 && w.length > frag.length + 1;
  });
}
