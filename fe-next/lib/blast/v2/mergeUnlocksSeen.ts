/**
 * Merge tutorial-seen flags additively. The client sends its full accumulated
 * set on each level clear; we union it onto whatever the server already has so
 * no "seen" flag is ever lost.
 *
 * `veteran_bonus_granted` is server-owned: it's written only by
 * grantVeteranBonus (worth 500 coins, gated on legacy play history). The client
 * must never be able to clear it, or a subsequent grant could re-fire — so we
 * always carry a truthy server value through regardless of the incoming payload.
 */
type Flags = Record<string, boolean> | null | undefined;

const SERVER_OWNED_KEYS = ['veteran_bonus_granted'] as const;

export function mergeUnlocksSeen(existing: Flags, incoming: Flags): Record<string, boolean> {
  const merged: Record<string, boolean> = { ...(existing ?? {}), ...(incoming ?? {}) };
  for (const key of SERVER_OWNED_KEYS) {
    if (existing?.[key]) merged[key] = true;
  }
  return merged;
}
