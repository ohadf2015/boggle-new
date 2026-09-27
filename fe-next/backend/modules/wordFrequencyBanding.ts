/**
 * Pure frequency-banding for bot word selection — no game/IO/dictionary deps, so
 * any bot driver (classic, blast, wheel-rush) can reuse it without importing the
 * heavy botBehavior module. botBehavior re-exports these for backward compatibility.
 */

export type BotDifficulty = 'easy' | 'medium' | 'hard';

// Below this many words in the player-frequency corpus, the distribution is too
// thin to band meaningfully — callers should fall back to a plain shuffle.
// Self-adjusting on corpus size (auto-includes a language once it grows) rather
// than a hardcoded language list. ponytail: count-gate, raise if banding feels noisy.
export const MIN_CORPUS_FOR_BANDING = 200;

/**
 * Reorder a bot's candidate words by REAL player-frequency, banded by difficulty.
 *
 * `rankByWord` maps a word to its 0-based frequency rank (0 = most-submitted), so a
 * word's rankRatio ∈ [0,1] is 0 for the commonest word and ~1 for the rarest. Each
 * word gets a difficulty-dependent weight (easy → favour common, hard → favour rare
 * real words, medium → mild common lean); words absent from the corpus get a small
 * base weight so they still appear (more tolerated for hard bots). Final ordering is
 * weighted-random without replacement (Efraimidis–Spirakis: key = rand^(1/weight),
 * sort desc) — so two bots on the same board don't reveal an identical sequence.
 *
 * `rand` is injectable for deterministic tests.
 */
export function orderWordPoolByFrequencyBand(
  wordPool: string[],
  rankByWord: Map<string, number>,
  corpusSize: number,
  difficulty: BotDifficulty,
  rand: () => number = Math.random,
): string[] {
  const weightFor = (word: string): number => {
    const rank = rankByWord.get(word);
    if (rank === undefined) {
      // Not a known player word — keep it possible, more so for harder bots.
      return difficulty === 'hard' ? 0.5 : difficulty === 'medium' ? 0.3 : 0.05;
    }
    const rankRatio = corpusSize > 1 ? rank / (corpusSize - 1) : 0;
    if (difficulty === 'easy') return Math.pow(1 - rankRatio, 2) + 0.05; // common-heavy
    if (difficulty === 'hard') return 0.25 + rankRatio;                  // rare-leaning
    return 1.1 - rankRatio;                                              // medium: mild common lean
  };

  return [...wordPool]
    .map((word) => {
      const w = Math.max(weightFor(word), 1e-6);
      const u = Math.min(Math.max(rand(), 1e-9), 1); // guard log(0)
      return { word, key: Math.pow(u, 1 / w) };
    })
    .sort((a, b) => b.key - a.key)
    .map((e) => e.word);
}
