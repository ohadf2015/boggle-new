/**
 * Pure dedupe + grouping for the admin "On Other Pages" live view.
 *
 * Given raw page-presence beacons plus the identities already accounted for in
 * live multiplayer games and single-player sessions, produce per-page groups of
 * visitors who are NOT currently in a game. Dedupe is identity-based
 * (username / playerId, case-insensitive) so it is robust to route naming.
 * Anonymous visitors (no username) never collide and are always shown — this is
 * what "show players on other pages, even the landing page" requires.
 *
 * No React, no side effects.
 */

export interface PagePresenceEntry {
  sessionId: string;
  /** Already-normalized page path (see normalizePagePath). */
  path: string;
  username?: string | null;
  playerId?: string | null;
  isAuthenticated?: boolean;
  timestamp: number;
}

export interface OtherPageVisitor {
  sessionId: string;
  username: string | null;
  playerId: string | null;
  isAuthenticated: boolean;
}

export interface OtherPageGroup {
  path: string;
  count: number;
  visitors: OtherPageVisitor[];
}

export interface InGameIdentities {
  gameUsernames: string[];
  gamePlayerIds: string[];
  spUsernames: string[];
  spPlayerIds: string[];
}

/** Max identified visitors to keep per group (count is always the full total). */
const MAX_VISITORS_PER_GROUP = 12;

export function playersOnOtherPages(
  presence: PagePresenceEntry[],
  inGame: InGameIdentities
): OtherPageGroup[] {
  const takenNames = new Set(
    [...inGame.gameUsernames, ...inGame.spUsernames]
      .filter(Boolean)
      .map((n) => n.toLowerCase())
  );
  const takenIds = new Set(
    [...inGame.gamePlayerIds, ...inGame.spPlayerIds].filter(Boolean)
  );

  const groups = new Map<string, OtherPageGroup>();

  for (const entry of presence) {
    const name = entry.username?.toLowerCase();
    const id = entry.playerId ?? undefined;

    // Skip anyone already counted inside a game / SP session.
    if (name && takenNames.has(name)) continue;
    if (id && takenIds.has(id)) continue;

    let group = groups.get(entry.path);
    if (!group) {
      group = { path: entry.path, count: 0, visitors: [] };
      groups.set(entry.path, group);
    }
    group.count++;
    if (group.visitors.length < MAX_VISITORS_PER_GROUP) {
      group.visitors.push({
        sessionId: entry.sessionId,
        username: entry.username ?? null,
        playerId: entry.playerId ?? null,
        isAuthenticated: !!entry.isAuthenticated,
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.count - a.count);
}
