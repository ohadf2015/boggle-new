/**
 * World Mechanics — evaluate whether a submitted word triggers
 * a world-specific bonus and return the scoring multiplier.
 */

const LATIN_GREEK_ROOTS = [
  'aqu', 'aud', 'bene', 'bio', 'chron', 'dict', 'duc', 'fac',
  'gen', 'geo', 'graph', 'jur', 'log', 'luc', 'man', 'mit',
  'mor', 'path', 'phil', 'phon', 'port', 'scrib', 'sent',
  'spec', 'struct', 'tele', 'terr', 'tract', 'vert', 'vid',
  'voc', 'auto', 'micro', 'macro', 'poly', 'mono',
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
      if (word.length >= 5) {
        return { bonus: true, multiplier: 1.25, feedbackKey: 'adventure.mechanic.synonymPairs' };
      }
      return none;

    case 'etymologyRoots':
      if (containsLatinGreekRoot(word)) {
        return { bonus: true, multiplier: 1.3, feedbackKey: 'adventure.mechanic.etymologyRoots' };
      }
      return none;

    case 'idioms':
      if (word.length >= 6) {
        return { bonus: true, multiplier: 1.25, feedbackKey: 'adventure.mechanic.idioms' };
      }
      return none;

    case 'compounds':
      if (word.length >= 5 && hasDoubleLetters(word)) {
        return { bonus: true, multiplier: 1.3, feedbackKey: 'adventure.mechanic.compounds' };
      }
      return none;

    case 'anagrams':
      if (isAnagramOfPrevious(word, previousWords)) {
        return { bonus: true, multiplier: 1.5, feedbackKey: 'adventure.mechanic.anagrams' };
      }
      return none;

    case 'palindromes':
      if (isPalindrome(word)) {
        return { bonus: true, multiplier: 1.5, feedbackKey: 'adventure.mechanic.palindromes' };
      }
      return none;

    case 'rareWords':
      if (word.length >= 7) {
        return { bonus: true, multiplier: 1.4, feedbackKey: 'adventure.mechanic.rareWords' };
      }
      return none;

    case 'multilingual':
      if (word.length >= 6) {
        return { bonus: true, multiplier: 1.25, feedbackKey: 'adventure.mechanic.multilingual' };
      }
      return none;

    case 'allMechanics': {
      // Try all mechanics, return the best multiplier
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
