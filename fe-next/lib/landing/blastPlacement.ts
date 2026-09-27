/**
 * Move the `blast` card so it sits immediately after the multiplayer (`arena`)
 * card in a landing order. Pure + generic so it composes with the layered
 * ordering in LandingChallengeCards regardless of popularity ranking.
 */
export function placeBlastAfterArena<T extends string>(order: readonly T[]): T[] {
  const out = [...order];
  const blastIdx = out.indexOf('blast' as T);
  const arenaIdx = out.indexOf('arena' as T);
  if (blastIdx < 0 || arenaIdx < 0) return out;
  if (blastIdx === arenaIdx + 1) return out; // already directly after arena
  out.splice(blastIdx, 1);
  const newArenaIdx = out.indexOf('arena' as T);
  out.splice(newArenaIdx + 1, 0, 'blast' as T);
  return out;
}
