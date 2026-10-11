export type LiveVerdict = 'word' | 'no' | 'found' | null;

export function liveVerdict(
  word: string,
  centerLetter: string,
  found: readonly string[],
  quick?: (word: string) => boolean | null,
): LiveVerdict {
  if (word.length < 3) return null;
  const upper = word.toUpperCase();
  if (!upper.includes(centerLetter.toUpperCase())) return 'no';
  if (found.includes(upper)) return 'found';
  const known = quick?.(upper) ?? null;
  if (known === null) return null;
  return known ? 'word' : 'no';
}
