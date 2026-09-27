/**
 * Lobby seat model. Host, joiner and TV lobbies all seat players from the same
 * `toMpRoster` output, so the three screens can never disagree about who is in
 * the room (the joiner once read "PLAYERS 0" in a room of four — pitfall 3).
 */
import { toMpRoster, type MpRosterPlayer, type MpRosterUserLike } from '@/lib/multiplayer/roster';
import type { Avatar } from '@/shared/types/game';

export const LOBBY_SEATS = 8;

/** A `playersReady` entry as the server sends it: a bare name or a record. */
export type LobbyPlayerInput =
  | string
  | {
      username: string;
      avatar?: Avatar | null;
      isHost?: boolean;
      isBot?: boolean;
      presenceStatus?: string;
    };

export type LobbySeat = MpRosterPlayer;

function toUser(p: LobbyPlayerInput): MpRosterUserLike {
  if (typeof p === 'string') return { username: p };
  return {
    username: p.username,
    avatar: p.avatar ?? undefined,
    isHost: p.isHost,
    isBot: p.isBot,
    presenceStatus: p.presenceStatus,
  };
}

/**
 * Seat the room. Order is the server's seat order (no scores in the lobby, so
 * `toMpRoster`'s stable sort keeps it). Ready follows the server's
 * `getPlayersReadyCount`: humans only — the host starts, bots are always set.
 */
export function lobbySeats(
  players: readonly LobbyPlayerInput[],
  meId: string,
  readyUsernames: readonly string[],
): LobbySeat[] {
  const roster = toMpRoster([], players.map(toUser), meId, { readyUsernames });
  for (const seat of roster) {
    if (seat.isHost || seat.isBot) seat.isReady = false;
  }
  return roster.slice(0, LOBBY_SEATS);
}

export function readyTally(seats: readonly LobbySeat[]): { ready: number; total: number; allReady: boolean } {
  const eligible = seats.filter((s) => !s.isHost && !s.isBot);
  const ready = eligible.filter((s) => s.isReady).length;
  return { ready, total: eligible.length, allReady: eligible.length > 0 && ready === eligible.length };
}

type T = (key: string, params?: Record<string, string | number>) => string;

/** START's second line: who you are about to play. */
export function startSublabel({ seated, humanGuests, t }: { seated: number; humanGuests: number; t: T }): string {
  const params = { count: seated, max: LOBBY_SEATS };
  return humanGuests === 0 ? t('mpUi.lobby.startVsBots', params) : t('mpUi.lobby.seatsTaken', params);
}
