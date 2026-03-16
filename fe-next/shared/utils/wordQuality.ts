/**
 * Word Quality Framework for Word Hunt
 *
 * Filters out low-quality words from the fallback dictionary pool.
 * Used by both frontend (daily challenge) and backend (multiplayer).
 */

/**
 * Words that should NEVER appear as Word Hunt targets.
 * Categories: jargon, medical distress, violence-primary,
 * purely functional, adult concepts.
 */
const WORD_BLACKLIST = new Set([
  // Functional/jargon — zero imageability
  'admin', 'usage', 'prior', 'extra', 'total', 'basic', 'input', 'output',
  'setup', 'login', 'debug', 'error', 'added', 'array', 'bytes', 'cache',
  'clone', 'count', 'draft', 'email', 'event', 'flash', 'float', 'forum',
  'grant', 'index', 'inner', 'issue', 'layer', 'legal', 'level', 'limit',
  'links', 'logic', 'merge', 'modal', 'nodes', 'outer', 'panel', 'parse',
  'patch', 'phase', 'pixel', 'popup', 'print', 'proxy', 'query', 'queue',
  'range', 'ratio', 'route', 'scope', 'shift', 'slack', 'stack', 'state',
  'stats', 'strip', 'suite', 'super', 'token', 'valid', 'value',

  // Medical distress / unpleasant
  'acne', 'acids', 'aches', 'bleed', 'tumor', 'ulcer', 'vomit',
  'mucus', 'cough', 'fever', 'virus', 'toxic', 'germs', 'decay',

  // Violence-primary
  'abuse', 'stab', 'slash', 'maim', 'kills',

  // Adult concepts
  'drugs', 'drunk', 'vodka', 'booze',

  // Boring abstractions — no imagery at all
  'about', 'after', 'again', 'also', 'amid', 'among', 'apart', 'aside',
  'being', 'below', 'doing', 'doubt', 'early', 'eight', 'elect', 'equal',
  'every', 'exact', 'fifth', 'first', 'forth', 'given', 'hence', 'least',
  'often', 'ought', 'quite', 'shall', 'since', 'still', 'their', 'there',
  'these', 'those', 'three', 'under', 'until', 'upper', 'usual', 'which',
  'while', 'whose', 'would', 'above',
]);

/**
 * Check if a word passes quality filters for Word Hunt target selection.
 * Applied when falling back to non-curated dictionary words.
 */
export function isWordHuntQuality(word: string): boolean {
  const lower = word.toLowerCase();

  if (WORD_BLACKLIST.has(lower)) return false;
  if (lower.length < 4) return false;

  // Reject all-consonant or all-vowel words
  const vowels = lower.replace(/[^aeiou]/g, '').length;
  if (vowels === 0 || vowels === lower.length) return false;

  // Reject words starting with 3+ consonants (hard to spot)
  if (/^[^aeiou]{3,}/i.test(lower)) return false;

  return true;
}
