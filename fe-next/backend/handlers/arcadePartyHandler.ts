import type { Server, Socket } from 'socket.io';
import {
  createRoom, isPartyGame, joinRoom, partyInput, podiumOf, publicPlayers, scoresOf, snapshotOf, startRoom, tickRoom, type PartyRoom,
} from '@/lib/holidays/arcade/party/room.server';
import { checkRateLimit } from '../utils/rateLimiter';
import { isSocketMigrating } from './shared';

const TICK_MS = 50;
const IDLE_MS = 30 * 60 * 1000;
const INPUTS_PER_S = 30;

const rooms = new Map<string, PartyRoom>();
const loops = new Map<string, ReturnType<typeof setInterval>>();
const seats = new Map<string, { code: string; playerId: string | null }>();
const budget = new Map<string, { at: number; n: number }>();

const tvRoom = (code: string) => `party:${code}:tv`;
const allRoom = (code: string) => `party:${code}`;
type Ack = (r: Record<string, unknown>) => void;
const ackOf = (cb: unknown): Ack => (typeof cb === 'function' ? (cb as Ack) : () => {});

function roster(io: Server, room: PartyRoom) {
  io.to(allRoom(room.code)).emit('party:roster', { phase: room.phase, game: room.game, players: publicPlayers(room) });
}

function stopLoop(code: string) {
  const loop = loops.get(code);
  if (loop) clearInterval(loop);
  loops.delete(code);
}

function runLoop(io: Server, room: PartyRoom) {
  stopLoop(room.code);
  let tick = 0;
  loops.set(
    room.code,
    setInterval(() => {
      const { ended, events } = tickRoom(room, TICK_MS / 1000);
      io.to(tvRoom(room.code)).emit('party:state', snapshotOf(room));
      if (++tick % 5 === 0) io.to(allRoom(room.code)).emit('party:scores', scoresOf(room));
      if (events.length) io.to(allRoom(room.code)).emit('party:events', events);
      if (ended) {
        stopLoop(room.code);
        io.to(allRoom(room.code)).emit('party:end', { podium: podiumOf(room) });
        roster(io, room);
      }
    }, TICK_MS),
  );
}

function sweep() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.touched < IDLE_MS) continue;
    stopLoop(code);
    rooms.delete(code);
  }
}

function allowInput(socketId: string): boolean {
  const now = Date.now();
  const b = budget.get(socketId);
  if (!b || now - b.at >= 1000) {
    budget.set(socketId, { at: now, n: 1 });
    return true;
  }
  b.n += 1;
  return b.n <= INPUTS_PER_S;
}

export function registerArcadePartyHandlers(io: Server, socket: Socket): void {
  socket.on('party:host', (data: { game?: unknown; code?: unknown; hostToken?: unknown }, cb: unknown) => {
    const ack = ackOf(cb);
    if (isSocketMigrating(socket) || !checkRateLimit(socket.id, 2)) return ack({ ok: false, reason: 'busy' });
    const back = typeof data?.code === 'string' ? rooms.get(data.code) : undefined;
    let room: PartyRoom;
    if (back && back.hostToken === data.hostToken) room = back;
    else {
      if (!isPartyGame(data?.game)) return ack({ ok: false, reason: 'game' });
      sweep();
      room = createRoom(data.game, 1 + Math.floor(Math.random() * 2 ** 30));
      while (rooms.has(room.code)) room = { ...room, code: createRoom(data.game, room.seed).code };
      rooms.set(room.code, room);
    }
    room.touched = Date.now();
    seats.set(socket.id, { code: room.code, playerId: null });
    void socket.join([tvRoom(room.code), allRoom(room.code)]);
    ack({ ok: true, code: room.code, hostToken: room.hostToken, phase: room.phase, players: publicPlayers(room) });
    if (room.phase === 'podium') socket.emit('party:end', { podium: podiumOf(room) });
  });

  socket.on('party:join', (data: { code?: unknown; name?: unknown; playerId?: unknown; token?: unknown }, cb: unknown) => {
    const ack = ackOf(cb);
    if (isSocketMigrating(socket) || !checkRateLimit(socket.id, 2)) return ack({ ok: false, reason: 'busy' });
    const code = typeof data?.code === 'string' ? data.code.trim().toUpperCase() : '';
    const room = rooms.get(code);
    if (!room) return ack({ ok: false, reason: 'missing' });
    const res = joinRoom(room, data?.name, data?.playerId, data?.token);
    if (!res.ok) return ack({ ok: false, reason: res.reason });
    seats.set(socket.id, { code, playerId: res.player.id });
    void socket.join(allRoom(code));
    ack({ ok: true, code, game: room.game, phase: room.phase, player: { id: res.player.id, name: res.player.name, color: res.player.color }, token: res.token });
    roster(io, room);
  });

  socket.on('party:input', (data: unknown) => {
    const seat = seats.get(socket.id);
    if (!seat?.playerId || !allowInput(socket.id)) return;
    const room = rooms.get(seat.code);
    if (room) partyInput(room, seat.playerId, data);
  });

  socket.on('party:start', (data: { hostToken?: unknown } | undefined) => {
    const seat = seats.get(socket.id);
    const room = seat && rooms.get(seat.code);
    if (!room || !checkRateLimit(socket.id, 2)) return;
    const asHost = seat.playerId === null ? data?.hostToken : room.phase === 'podium' ? room.hostToken : null;
    if (!startRoom(room, asHost)) return;
    io.to(allRoom(room.code)).emit('party:go', { round: room.round, players: publicPlayers(room) });
    runLoop(io, room);
  });

  socket.on('disconnect', () => {
    budget.delete(socket.id);
    const seat = seats.get(socket.id);
    seats.delete(socket.id);
    const room = seat && rooms.get(seat.code);
    if (!room || !seat.playerId) return;
    const p = room.players.find((x) => x.id === seat.playerId);
    if (p) p.connected = false;
    roster(io, room);
  });
}
