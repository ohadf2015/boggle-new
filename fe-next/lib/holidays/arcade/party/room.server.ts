import { randomBytes } from 'crypto';
import { catchSnapshot, newCatchParty, steerCatch, stepCatchParty, type CatchParty } from './catchParty';
import { dashSnapshot, holdParty, newDashParty, stepDashParty, type DashParty } from './dashParty';
import { newSplatParty, splatSnapshot, stepSplatParty, throwAtHole, type SplatParty } from './splatParty';

import { MAX_PARTY, PARTY_COLORS, type PartyGameId } from './games';

export { isPartyGame, MAX_PARTY, PARTY_GAMES, type PartyGameId } from './games';
const SECONDS: Record<PartyGameId, number> = { catch: 60, splat: 50, dash: 60 };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface PartyPlayer {
  id: string;
  name: string;
  color: (typeof PARTY_COLORS)[number];
  token: string;
  connected: boolean;
}

type Sim = CatchParty | SplatParty | DashParty;

export interface PartyRoom {
  code: string;
  game: PartyGameId;
  hostToken: string;
  players: PartyPlayer[];
  phase: 'lobby' | 'playing' | 'podium';
  seed: number;
  round: number;
  sim: Sim | null;
  touched: number;
  endedAt: number;
}

const secret = () => randomBytes(12).toString('base64url');

export function newCode(rng: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(rng() * CODE_CHARS.length)]).join('');
}

export function createRoom(game: PartyGameId, seed: number, rng: () => number = Math.random): PartyRoom {
  return { code: newCode(rng), game, hostToken: secret(), players: [], phase: 'lobby', seed, round: 0, sim: null, touched: Date.now(), endedAt: 0 };
}

export function sanitizeName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f<>"'`]/g, '')
    .trim()
    .slice(0, 14);
}

export type JoinResult = { ok: true; player: PartyPlayer; token: string } | { ok: false; reason: 'full' };

export function joinRoom(room: PartyRoom, name: unknown, playerId?: unknown, token?: unknown): JoinResult {
  room.touched = Date.now();
  const back = room.players.find((p) => p.id === playerId && p.token === token);
  if (back) {
    back.connected = true;
    return { ok: true, player: back, token: back.token };
  }
  if (room.players.length >= MAX_PARTY) return { ok: false, reason: 'full' };
  const used = new Set(room.players.map((p) => p.color));
  const player: PartyPlayer = {
    id: secret().slice(0, 8),
    name: sanitizeName(name),
    color: PARTY_COLORS.find((c) => !used.has(c)) ?? PARTY_COLORS[0],
    token: secret(),
    connected: true,
  };
  room.players.push(player);
  return { ok: true, player, token: player.token };
}

export const PODIUM_MIN_MS = 3000;

export function startRoom(room: PartyRoom, hostToken: unknown, now = Date.now()): boolean {
  if (hostToken !== room.hostToken || room.phase === 'playing' || room.players.length === 0) return false;
  if (room.phase === 'podium' && now - room.endedAt < PODIUM_MIN_MS) return false;
  room.round += 1;
  const seed = room.seed + room.round * 7919;
  const ids = room.players.map((p) => p.id);
  const secs = SECONDS[room.game];
  room.sim = room.game === 'catch' ? newCatchParty(seed, secs, ids) : room.game === 'splat' ? newSplatParty(seed, secs, ids) : newDashParty(seed, secs, ids);
  room.phase = 'playing';
  room.touched = Date.now();
  return true;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function partyInput(room: PartyRoom, playerId: string, data: unknown): void {
  if (room.phase !== 'playing' || !room.sim || !data || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  if (room.game === 'catch') {
    const x = num(d.x);
    if (x !== null) steerCatch(room.sim as CatchParty, playerId, x);
  } else if (room.game === 'splat') {
    const hole = num(d.hole);
    if (hole !== null) throwAtHole(room.sim as SplatParty, playerId, Math.floor(hole));
  } else if (typeof d.hold === 'boolean') holdParty(room.sim as DashParty, playerId, d.hold);
}

export function snapshotOf(room: PartyRoom) {
  if (!room.sim) return null;
  if (room.game === 'catch') return catchSnapshot(room.sim as CatchParty);
  if (room.game === 'splat') return splatSnapshot(room.sim as SplatParty);
  return dashSnapshot(room.sim as DashParty);
}

export function tickRoom(room: PartyRoom, dt: number) {
  const sim = room.sim;
  if (room.phase !== 'playing' || !sim) return { ended: false, events: [] as unknown[] };
  if (room.game === 'catch') stepCatchParty(sim as CatchParty, dt);
  else if (room.game === 'splat') stepSplatParty(sim as SplatParty, dt);
  else stepDashParty(sim as DashParty, dt);
  const events = sim.events.splice(0);
  if (sim.over) {
    room.phase = 'podium';
    room.endedAt = Date.now();
  }
  return { ended: sim.over, events };
}

export function scoresOf(room: PartyRoom): Record<string, number> {
  const sim = room.sim;
  if (!sim) return {};
  const rows = 'plates' in sim ? sim.plates : 'sleighs' in sim ? sim.sleighs : sim.players;
  return Object.fromEntries(rows.map((r) => [r.id, r.score]));
}

export function podiumOf(room: PartyRoom) {
  const scores = scoresOf(room);
  const rows = room.players
    .filter((p) => p.id in scores)
    .map((p) => ({ id: p.id, name: p.name, color: p.color, score: scores[p.id] }))
    .sort((a, b) => b.score - a.score);
  return rows.map((r) => ({ ...r, place: rows.findIndex((o) => o.score === r.score) + 1 }));
}

export const publicPlayers = (room: PartyRoom) => room.players.map(({ id, name, color, connected }) => ({ id, name, color, connected }));
