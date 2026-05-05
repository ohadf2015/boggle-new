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
  'radii', 'octet', 'regex', 'axiom', 'idiom', 'nadir', 'tropes',
  'bylaw', 'quota', 'caveat', 'clause', 'tally', 'tariff',

  // Medical distress / unpleasant
  'acne', 'acids', 'aches', 'bleed', 'tumor', 'ulcer', 'vomit',
  'mucus', 'cough', 'fever', 'virus', 'toxic', 'germs', 'decay',
  'serum', 'polyp', 'lipid', 'gland', 'larva', 'tibia', 'aorta',
  'bowel', 'spasm', 'rabies', 'sepsis', 'edema',

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
 * Hebrew words that should NEVER appear as Word Hunt targets.
 * Rare/obscure words that most players won't recognize.
 */
const HEBREW_WORD_BLACKLIST = new Set([
  'רומבולה',    // Rombula - obscure Italian lottery game
  'פיליבסטר',  // Filibuster - political jargon, too niche
]);

/**
 * Latin-script vowel set including Swedish å/ä/ö and Spanish accented vowels.
 * Used by the vowel-balance heuristic — only meaningful for languages whose
 * script encodes vowels as letters. Hebrew (abjad) and Japanese (logographic)
 * skip this check entirely because vowel-counting is script-incompatible.
 */
const LATIN_VOWELS_RE = /[aeiouyáéíóúåäöü]/i;
const LATIN_NON_VOWEL_LEAD_RE = /^[^aeiouyáéíóúåäöü]{3,}/i;

/**
 * Check if a word passes quality filters for Word Hunt target selection.
 * Applied when falling back to non-curated dictionary words.
 *
 * Script-aware: vowel/consonant heuristics run only for Latin-script
 * languages (en/sv/es). Hebrew and Japanese pass these structural checks
 * automatically — the daily pipeline (Wikipedia + dict-loader) is the
 * primary noun source for those languages and would be wholly blocked
 * by Latin-only vowel counting.
 */
export function isWordHuntQuality(word: string, language?: string): boolean {
  const lower = word.toLowerCase();

  // Language-specific blacklists
  if (language === 'he' && HEBREW_WORD_BLACKLIST.has(word)) return false;

  if (WORD_BLACKLIST.has(lower)) return false;
  if ([...lower].length < 5) return false;

  // Vowel/consonant shape heuristics only apply to Latin-script languages.
  const isLatinScript = !language || language === 'en' || language === 'sv' || language === 'es';
  if (isLatinScript) {
    const vowels = (lower.match(new RegExp(LATIN_VOWELS_RE.source, 'gi')) || []).length;
    if (vowels === 0 || vowels === lower.length) return false;
    if (LATIN_NON_VOWEL_LEAD_RE.test(lower)) return false;
  }

  return true;
}
