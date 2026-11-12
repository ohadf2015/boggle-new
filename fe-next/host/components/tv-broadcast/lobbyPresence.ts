import { useEffect, useMemo, useState } from 'react';
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

export function useLobbyRoster(players: ReadonlyArray<LobbyPlayer | string>, hostName: string): LobbyStudent[] {
  const [drops, setDrops] = useState<DropStamps>({});
  const [now, setNow] = useState(() => Date.now());

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

  return useMemo(() => lobbyRoster(players, drops, now, hostName), [players, drops, now, hostName]);
}
