import { useEffect, useMemo, useState } from 'react';
import { useSocketOptional } from '@/utils/SocketContext';
import type { Avatar as AvatarType } from '@/shared/types/game';

export const LOBBY_RECONNECT_SHOW_MS = 30_000;

interface LobbyPlayer {
  username: string;
  isHost?: boolean;
  isBot?: boolean;
  isPractice?: boolean;
  disconnected?: boolean;
  avatar?: AvatarType | null;
}

export interface LobbyStudent {
  username: string;
  isBot?: boolean;
  isPractice?: boolean;
  avatar?: AvatarType | null;
  reconnecting?: true;
}

/** The wire shape of the server's `classroomRosterUpdate` push (classroom rooms only). */
export interface ClassroomRosterWire {
  gameCode: string;
  students: Array<{
    username: string;
    /** Server-truth snapshot at send time; the hook re-derives connection live. */
    connected: boolean;
    isBot?: boolean;
    isPractice?: boolean;
    avatar?: AvatarType | null;
  }>;
}

type DropStamps = Record<string, number>;

const asPlayer = (p: LobbyPlayer | string): LobbyPlayer => (typeof p === 'string' ? { username: p } : p);

export function trackDrops(prev: DropStamps, players: ReadonlyArray<LobbyPlayer | string>, now: number): DropStamps {
  const next: DropStamps = {};
  for (const p of players.map(asPlayer)) {
    if (p.disconnected === true) next[p.username] = prev[p.username] ?? now;
  }
  const same = Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((k) => prev[k] === next[k]);
  return same ? prev : next;
}

export function lobbyRoster(players: ReadonlyArray<LobbyPlayer | string>, drops: DropStamps, now: number, hostName: string): LobbyStudent[] {
  const out: LobbyStudent[] = [];
  for (const raw of players) {
    const p = asPlayer(raw);
    if (p.isHost || p.username === hostName) continue;
    const student: LobbyStudent = typeof raw === 'string' ? { username: p.username } : { username: p.username, isBot: p.isBot, avatar: p.avatar, ...(p.isPractice ? { isPractice: true } : {}) };
    if (p.disconnected === true) {
      if (now - (drops[p.username] ?? now) >= LOBBY_RECONNECT_SHOW_MS) continue;
      student.reconnecting = true;
    }
    out.push(student);
  }
  return out;
}

/**
 * Roster from the server's joined-roster push, with the connection state read
 * LIVE from the socket roster the lobby already receives — the push answers
 * "who joined" (it survives socket drops; the plain lobby roster drops a
 * disconnected phone after 30s), while `players` answers "who is online"
 * fresher than any single snapshot could.
 *
 * Seats that exist only on the socket roster (bots, the teacher's practice
 * seat, a connected seat the next push hasn't re-sent yet) merge in; a
 * disconnected seat the roster does not name was never joined, so it stays off.
 */
export function classroomLobbyRoster(
  players: ReadonlyArray<LobbyPlayer | string>,
  roster: ClassroomRosterWire,
  hostName: string,
): LobbyStudent[] {
  const live = new Map(players.map(asPlayer).map((p) => [p.username, p]));
  const out: LobbyStudent[] = [];
  const seen = new Set<string>();

  for (const s of roster.students) {
    if (!s.username || s.username === hostName || seen.has(s.username)) continue;
    seen.add(s.username);
    const p = live.get(s.username);
    const connected = !!p && !p.disconnected;
    out.push({
      username: s.username,
      ...(s.isBot || p?.isBot ? { isBot: true } : {}),
      ...(s.isPractice || p?.isPractice ? { isPractice: true } : {}),
      ...(s.avatar ?? p?.avatar ? { avatar: s.avatar ?? p?.avatar } : {}),
      ...(connected ? {} : { reconnecting: true }),
    });
  }

  for (const raw of players) {
    const p = asPlayer(raw);
    if (p.isHost || p.username === hostName || seen.has(p.username)) continue;
    // A connected real student/bot/practice seat the push has not listed yet
    // (join racing the coalesced push): show them now. A disconnected one the
    // roster does not name was never joined — leave them off.
    if (p.disconnected && !p.isBot && !p.isPractice) continue;
    seen.add(p.username);
    out.push({
      username: p.username,
      ...(p.isBot ? { isBot: true } : {}),
      ...(p.isPractice ? { isPractice: true } : {}),
      ...(p.avatar ? { avatar: p.avatar } : {}),
      ...(p.disconnected ? { reconnecting: true } : {}),
    });
  }

  return out;
}

export function useLobbyRoster(players: ReadonlyArray<LobbyPlayer | string>, hostName: string, gameCode?: string): LobbyStudent[] {
  const socket = useSocketOptional()?.socket ?? null;
  const [joinedRoster, setJoinedRoster] = useState<ClassroomRosterWire | null>(null);
  const [drops, setDrops] = useState<DropStamps>({});
  const [now, setNow] = useState(() => Date.now());

  // A new room code invalidates the previous room's roster (one room per page,
  // but the lobby can remount across rounds on the same code — that is fine).
  useEffect(() => {
    setJoinedRoster(null);
  }, [gameCode]);

  useEffect(() => {
    if (!socket || !gameCode) return;
    const handler = (data: ClassroomRosterWire) => {
      if (data?.gameCode === gameCode && Array.isArray(data.students)) setJoinedRoster(data);
    };
    socket.on('classroomRosterUpdate', handler);
    return () => {
      socket.off('classroomRosterUpdate', handler);
    };
  }, [socket, gameCode]);

  useEffect(() => {
    const at = Date.now();
    setDrops((prev) => trackDrops(prev, players, at));
    setNow(at);
  }, [players]);

  useEffect(() => {
    const pending = Object.values(drops).map((t) => t + LOBBY_RECONNECT_SHOW_MS - Date.now()).filter((ms) => ms > 0);
    if (pending.length === 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(...pending));
    return () => clearTimeout(timer);
  }, [drops, now]);

  return useMemo(
    () => (joinedRoster ? classroomLobbyRoster(players, joinedRoster, hostName) : lobbyRoster(players, drops, now, hostName)),
    [joinedRoster, players, drops, now, hostName],
  );
}
