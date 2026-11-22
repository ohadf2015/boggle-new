import type { FinderQuery } from './matcher';

interface LengthBucket {
  words: string[];
  norms: string[];
  masks: Uint32Array;
}

export interface WordIndex {
  byLength: Map<number, LengthBucket>;
  bits: Map<string, number>;
}

function maskOf(chars: Iterable<string>, bits: Map<string, number>): number {
  let mask = 0;
  for (const ch of chars) {
    const bit = bits.get(ch);
    if (bit !== undefined) mask |= 1 << bit;
  }
  return mask >>> 0;
}

function popcount(n: number): number {
  n -= (n >>> 1) & 0x55555555;
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function buildWordIndex(words: Iterable<string>, normalize: (word: string) => string): WordIndex {
  const bits = new Map<string, number>();
  const grouped = new Map<number, { words: string[]; norms: string[]; chars: string[][] }>();
  for (const word of new Set(words)) {
    const norm = normalize(word);
    const chars = Array.from(norm);
    if (chars.length < 2) continue;
    // Letters past the 32nd share the top bit, which only weakens the prefilter.
    for (const ch of chars) if (!bits.has(ch)) bits.set(ch, Math.min(bits.size, 31));
    let group = grouped.get(chars.length);
    if (!group) grouped.set(chars.length, (group = { words: [], norms: [], chars: [] }));
    group.words.push(word);
    group.norms.push(norm === word ? word : norm);
    group.chars.push(chars);
  }
  const byLength = new Map<number, LengthBucket>();
  for (const [length, group] of grouped) {
    const masks = new Uint32Array(group.words.length);
    group.chars.forEach((chars, i) => (masks[i] = maskOf(chars, bits)));
    byLength.set(length, { words: group.words, norms: group.norms, masks });
  }
  return { byLength, bits };
}

/** Same words as testing `matches` on every dictionary entry; only skips entries that cannot match. */
export function searchWordIndex(
  index: WordIndex,
  query: FinderQuery,
  matches: (norm: string) => boolean,
  onMatch: (word: string) => void,
): void {
  const { rack, blanks, pattern, length } = query;
  const hasRack = rack.length + blanks > 0;
  const rackLength = rack.length + blanks;
  const rackMask = maskOf(rack, index.bits);
  const useMask = hasRack && !pattern;

  for (const [wordLength, bucket] of index.byLength) {
    if (pattern && wordLength !== pattern.length) continue;
    if (length !== null && wordLength !== length) continue;
    if (useMask && wordLength > rackLength) continue;
    const { words, norms, masks } = bucket;
    for (let i = 0; i < words.length; i++) {
      if (useMask && popcount(masks[i] & ~rackMask) > blanks) continue;
      if (matches(norms[i])) onMatch(words[i]);
    }
  }
}
