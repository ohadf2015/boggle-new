/**
 * Shiritori (しりとり) bot move selection — pure, dictionary-injected so it
 * unit-tests without the trie. Used to fill solo/short rooms.
 *
 * Strategy: among unused words that chain from the required head, prefer ones
 * that do NOT end in ん (so the bot doesn't lose on its own turn); fall back to a
 * ん-ending word only when nothing else chains; return null when stuck (the bot
 * then loses, like a human who can't answer). Spec:
 * docs/2026-05-21-shiritori-mode-spec.md.
 */
import { shiritoriHead, endsInN } from '@/shared/utils/shiritori';

/**
 * @param requiredHead kana the word must start with, or null on the opening move.
 * @param used         words already played this round (Set or array).
 * @param words        candidate dictionary (hiragana words).
 * @param rng          injectable RNG for deterministic tests.
 * @returns a valid word to play, or null if the bot has no legal move.
 */
export function pickShiritoriWord(
  requiredHead: string | null,
  used: Set<string> | string[],
  words: string[],
  rng: () => number = Math.random,
): string | null {
  const usedSet = used instanceof Set ? used : new Set(used);
  const safe: string[] = [];
  const risky: string[] = []; // ends in ん — last resort only

  for (const w of words) {
    if (usedSet.has(w)) continue;
    if (requiredHead !== null && shiritoriHead(w) !== requiredHead) continue;
    (endsInN(w) ? risky : safe).push(w);
  }

  const pool = safe.length > 0 ? safe : risky;
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}
