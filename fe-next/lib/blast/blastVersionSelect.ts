export type BlastVersion = 'v1' | 'v2';

/**
 * Decides which Blast implementation `/[locale]/blast` serves.
 *
 * V1 (legacy) is the ONLY version shown to players — it is the version used in
 * multiplayer too, so single-player and multiplayer stay in parity. V2 is an
 * opt-in single-player preview reachable only via the explicit `?v2=on` flag.
 */
export function resolveBlastVersion(searchParams?: { v2?: string }): BlastVersion {
  return searchParams?.v2 === 'on' ? 'v2' : 'v1';
}
