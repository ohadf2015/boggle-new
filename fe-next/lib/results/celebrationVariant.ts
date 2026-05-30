/**
 * Random-but-stable celebration clip selection.
 *
 * Each celebration `kind` can ship MULTIPLE video clips (e.g. several distinct
 * "champion" renders). We pick one per mount so the result screen feels fresh
 * on repeat plays instead of replaying the same loop every game. The choice is
 * seeded so a single mount never reshuffles across re-renders (the results page
 * re-renders often — countdowns, score reveals).
 *
 * NOTE: variety is only visible once a kind has more than one clip. Until more
 * clips are generated per kind, every kind has a 1-element list and this is a
 * stable no-op.
 */
export function pickCelebrationSrc(srcs: string[], seed: number): string {
  if (!srcs || srcs.length === 0) return '';
  const idx = Math.abs(Math.trunc(seed)) % srcs.length;
  return srcs[idx];
}
