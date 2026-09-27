import type { ActiveRoom, GameMode, Language } from '@/shared/types/game';

/**
 * selectQuickPlayRoom — pick the best EXISTING public room for Quick Play to
 * drop a player into, or null if a fresh room should be created instead.
 *
 * Root cause this fixes: Quick Play used to ALWAYS generate a new gameCode and
 * host a brand-new public room. With no consolidation, every solo player spawned
 * their own 1/50 lobby, so the open-arenas list filled with ghost rooms that
 * look like live battles but have nobody to play against (bad join funnel).
 *
 * A room is a candidate when it is a casual, same-language, same-mode lobby that
 * is still WAITING and has room for one more. Among candidates we prefer the one
 * with the most players (consolidate into the fewest rooms → a real match starts
 * sooner), tie-broken by oldest-first (fill a long-waiting host before a fresh
 * one), then by gameCode for deterministic output.
 *
 * Pure + side-effect free: never mutates the input array (sorts a copy).
 */

const DEFAULT_MAX_PLAYERS = 50;

export interface QuickPlayCriteria {
  language: Language;
  /** Defaults to 'classic' — the mode Quick Play launches. */
  gameMode?: GameMode;
}

export function selectQuickPlayRoom(
  rooms: ActiveRoom[],
  criteria: QuickPlayCriteria,
): ActiveRoom | null {
  const targetMode: GameMode = criteria.gameMode ?? 'classic';

  const candidates = rooms.filter((room) => {
    if (room.gameState !== 'waiting') return false; // only joinable lobbies
    if (room.language !== criteria.language) return false; // same language
    if ((room.gameMode ?? 'classic') !== targetMode) return false; // same mode
    if (room.isRanked) return false; // Quick Play is casual — never hijack ranked
    if (room.playerCount <= 0) return false; // need a real host present
    if (room.playerCount >= (room.maxPlayers ?? DEFAULT_MAX_PLAYERS)) return false; // not full
    return true;
  });

  if (candidates.length === 0) return null;

  return [...candidates].sort((a, b) => {
    if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.gameCode.localeCompare(b.gameCode);
  })[0];
}

export default selectQuickPlayRoom;
