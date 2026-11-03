export const BLANK_CHARS = /[?*]/g;
const PATTERN_WILDCARDS = new Set(['_', '?', '.', '*', '-', ' ']);
export const MAX_BLANKS = 3;

export interface FinderQuery {
  /** Rack letters (already normalized, blanks removed); empty = no rack limit. */
  rack: string;
  blanks: number;
  /** One entry per position: a fixed letter, or null for an open slot. */
  pattern: (string | null)[] | null;
  startsWith: string;
  endsWith: string;
  contains: string;
  length: number | null;
}

export function letterCounts(str: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of str) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

function fitsRack(letters: string[], available: Record<string, number>, blanks: number): boolean {
  let missing = 0;
  for (const [letter, count] of Object.entries(letterCounts(letters.join('')))) {
    missing += Math.max(0, count - (available[letter] || 0));
    if (missing > blanks) return false;
  }
  return true;
}

/**
 * Splits a raw pattern into positions. Returns null when a character is
 * neither a wildcard nor a letter the language normalizer keeps.
 */
export function parsePattern(
  raw: string,
  normalizeLetter: (ch: string) => string,
): (string | null)[] | null {
  const slots: (string | null)[] = [];
  for (const ch of raw.trim()) {
    if (PATTERN_WILDCARDS.has(ch)) {
      slots.push(null);
      continue;
    }
    const letter = normalizeLetter(ch);
    if (letter.length !== 1) return null;
    slots.push(letter);
  }
  return slots;
}

/**
 * Builds a predicate over normalized dictionary words. Letters fixed by the
 * pattern are on the board, so only the open slots draw on the rack.
 */
export function buildMatcher(query: FinderQuery): (word: string) => boolean {
  const { rack, blanks, pattern, startsWith, endsWith, contains, length } = query;
  const available = letterCounts(rack);
  const hasRack = rack.length + blanks > 0;
  const maxLen = rack.length + blanks;

  return (word: string) => {
    const chars = Array.from(word);
    if (chars.length < 2) return false;
    if (length !== null && chars.length !== length) return false;
    if (startsWith && !word.startsWith(startsWith)) return false;
    if (endsWith && !word.endsWith(endsWith)) return false;
    if (contains && !word.includes(contains)) return false;

    if (pattern) {
      if (chars.length !== pattern.length) return false;
      const open: string[] = [];
      for (let i = 0; i < pattern.length; i++) {
        const fixed = pattern[i];
        if (fixed === null) open.push(chars[i]);
        else if (fixed !== chars[i]) return false;
      }
      return !hasRack || fitsRack(open, available, blanks);
    }

    if (!hasRack) return true;
    if (chars.length > maxLen) return false;
    return fitsRack(chars, available, blanks);
  };
}
