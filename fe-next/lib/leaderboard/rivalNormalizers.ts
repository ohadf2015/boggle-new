import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { RivalInput } from './selectClosestRivals';

/**
 * Structural shapes for the two leaderboard sources, kept minimal so the
 * normalizers are testable without importing the heavy game/roster types.
 */
interface RosterLike {
  userId: string;
  username: string;
  score: number;
  wordCount?: number;
  isYou?: boolean;
  customAvatar?: CustomAvatarConfig | null;
}

interface BlastEntryLike {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: { customAvatar?: CustomAvatarConfig | null } | null;
}

interface ResultsPlayerLike {
  username: string;
  score: number;
  allWords?: unknown[];
  avatar?: { customAvatar?: CustomAvatarConfig | null } | null;
}

/**
 * Classic desktop shell → RivalInput. Identity is triple-redundant because the
 * shell sometimes carries `isYou` on each roster entry and always passes `meId`
 * — and `meId` is the player's *username* (see MultiplayerInGameView), so both
 * `username === meId` and `userId === meId` are checked.
 */
export function rosterToRivals(players: RosterLike[], meId?: string): RivalInput[] {
  return players.map((p) => ({
    id: p.userId,
    name: p.username,
    score: p.score,
    isMe: p.isYou === true || (meId != null && (p.userId === meId || p.username === meId)),
    wordsFound: p.wordCount,
    customAvatar: p.customAvatar ?? null,
  }));
}

/**
 * Blast leaderboard entries → RivalInput. Blast keys players by `username`, so
 * "me" is a direct username match against the current player's `username` prop.
 */
export function blastEntriesToRivals(
  entries: BlastEntryLike[],
  username?: string,
): RivalInput[] {
  return entries.map((entry) => ({
    id: entry.username,
    name: entry.username,
    score: entry.score,
    isMe: username != null && entry.username === username,
    wordsFound: entry.wordCount,
    customAvatar: entry.avatar?.customAvatar ?? null,
  }));
}

/**
 * Results-page `Player[]` → RivalInput. Results key every player by `username`
 * (no stable userId on the results Player shape), so id === name === username and
 * "me" is a username match. wordsFound is derived from the player's word list.
 */
export function playersToRivals(
  players: ResultsPlayerLike[],
  username?: string,
): RivalInput[] {
  return players.map((p) => ({
    id: p.username,
    name: p.username,
    score: p.score,
    isMe: username != null && p.username === username,
    wordsFound: Array.isArray(p.allWords) ? p.allWords.length : 0,
    customAvatar: p.avatar?.customAvatar ?? null,
  }));
}
