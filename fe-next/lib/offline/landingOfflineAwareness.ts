/**
 * Which landing mode-select cards need a live network connection to play.
 *
 * Used to give the home page an offline-aware treatment: when the device is
 * offline, network-only cards are shown locked (with a "needs internet" badge)
 * so a player on a flight doesn't tap into a dead multiplayer lobby. Every other
 * landing mode is solo / offline-capable (see lib/offline/offlineCapableModes).
 *
 * This is a deliberate DENYLIST: only modes that genuinely require live
 * opponents are listed. Unknown keys default to NOT network-only so a new solo
 * mode is never accidentally locked offline (a false lock is worse than a false
 * unlock — the latter just shows the existing offline indicator on entry).
 */
const NETWORK_ONLY_LANDING_MODES: ReadonlySet<string> = new Set([
  'arena', // real-time multiplayer rooms
  'party', // socket-driven party games (Pixel/Caption/Shadow Clash)
]);

export function requiresNetworkToPlay(landingCardKey: string): boolean {
  return NETWORK_ONLY_LANDING_MODES.has(landingCardKey);
}
