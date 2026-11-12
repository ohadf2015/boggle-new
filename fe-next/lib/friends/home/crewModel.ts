import type { FriendPresence } from '@/shared/types/friends';

export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
/** Below this many friends the crew card suggests recent opponents. */
export const SUGGEST_BELOW = 3;

export type CrewStatus = 'in_lobby' | 'playing' | 'online' | 'offline';
export type CrewAction = { kind: 'join'; code: string } | { kind: 'invite' } | null;
export interface Line {
  key: string;
  params: Record<string, string | number>;
  when?: { key: string; params: Record<string, string | number> };
}

interface Seen {
  userId: string;
  lastSeenAt: string | null;
}

const seenMs = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

export function crewStatus(person: Seen, presence: FriendPresence | undefined, now: number): CrewStatus {
  if (presence?.status === 'in_lobby') return 'in_lobby';
  if (presence?.status === 'playing' || presence?.status === 'private') return 'playing';
  return now - seenMs(person.lastSeenAt) < ONLINE_WINDOW_MS ? 'online' : 'offline';
}

export function crewAction(status: CrewStatus, presence: FriendPresence | undefined): CrewAction {
  if ((status === 'in_lobby' || status === 'playing') && presence?.gameCode) return { kind: 'join', code: presence.gameCode };
  if (status === 'online') return { kind: 'invite' };
  return null;
}

const RANK: Record<CrewStatus, number> = { in_lobby: 0, playing: 0, online: 1, offline: 2 };

export function sortCrew<T extends Seen>(people: readonly T[], presence: ReadonlyMap<string, FriendPresence>, now: number): T[] {
  return [...people].sort((a, b) => {
    const r = RANK[crewStatus(a, presence.get(a.userId), now)] - RANK[crewStatus(b, presence.get(b.userId), now)];
    return r !== 0 ? r : seenMs(b.lastSeenAt) - seenMs(a.lastSeenAt);
  });
}

// LRI…PDI keeps "3–1" in reading order inside RTL sentences.
const score = (a: number, b: number) => `\u2066${a}–${b}\u2069`;

export function h2hLine(wins: number, losses: number): Line {
  if (wins === 0 && losses === 0) return { key: 'homePlay.crew.firstMatch', params: {} };
  if (wins > losses) return { key: 'homePlay.crew.youLead', params: { score: score(wins, losses) } };
  if (losses > wins) return { key: 'homePlay.crew.theyLead', params: { score: score(losses, wins) } };
  return { key: 'homePlay.crew.tied', params: { score: score(wins, losses) } };
}

function ago(iso: string, now: number): Line['when'] {
  const mins = Math.floor((now - seenMs(iso)) / 60_000);
  if (mins < 1) return { key: 'friends.status.justNow', params: {} };
  if (mins < 60) return { key: 'friends.status.minutesAgo', params: { count: mins } };
  const hours = Math.floor(mins / 60);
  if (hours < 24) return { key: 'friends.status.hoursAgo', params: { count: hours } };
  const days = Math.floor(hours / 24);
  if (days < 7) return { key: 'friends.status.daysAgo', params: { count: days } };
  return { key: 'friends.status.longAgo', params: {} };
}

export function statusLine(status: CrewStatus, lastSeenAt: string | null, now: number): Line {
  if (status === 'in_lobby') return { key: 'homePlay.crew.inLobby', params: {} };
  if (status === 'playing') return { key: 'homePlay.crew.playingNow', params: {} };
  if (status === 'online') return { key: 'friends.status.online', params: {} };
  if (!lastSeenAt) return { key: 'friends.status.offline', params: {} };
  return { key: 'homePlay.crew.seen', params: {}, when: ago(lastSeenAt, now) };
}
