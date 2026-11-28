import { describe, it, expect } from 'vitest';
import { createRoom, joinRoom, partyInput, podiumOf, startRoom, tickRoom, MAX_PARTY, PARTY_GAMES, sanitizeName } from '../room.server';

const rng = () => 0.42;

describe('arcade party room', () => {
  it('Given a big screen, then a room gets a short code and a secret host token', () => {
    const room = createRoom('catch', 7, rng);
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(room.hostToken.length).toBeGreaterThan(10);
    expect(room.phase).toBe('lobby');
    expect(PARTY_GAMES).toEqual(['catch', 'splat', 'dash']);
  });

  it('Given phones join, then each gets its own colour, names are cleaned, and the ninth is turned away', () => {
    const room = createRoom('splat', 7, rng);
    const players = Array.from({ length: MAX_PARTY }, (_, i) => joinRoom(room, `  Kid ${i}  `));
    expect(players.every((p) => p.ok)).toBe(true);
    expect(new Set(room.players.map((p) => p.color)).size).toBe(MAX_PARTY);
    expect(room.players[0].name).toBe('Kid 0');
    expect(joinRoom(room, 'late')).toEqual({ ok: false, reason: 'full' });
    expect(sanitizeName('<b>Ana</b>\u0000')).toBe('bAna/b');
  });

  it('Given a phone reconnects with its token, then it gets the same player back instead of a new seat', () => {
    const room = createRoom('dash', 7, rng);
    const first = joinRoom(room, 'Ana');
    if (!first.ok) throw new Error('join');
    const again = joinRoom(room, 'Ana', first.player.id, first.token);
    expect(again.ok && again.player.id).toBe(first.player.id);
    expect(room.players).toHaveLength(1);
    const thief = joinRoom(room, 'Ana', first.player.id, 'wrong');
    expect(thief.ok && thief.player.id).not.toBe(first.player.id);
  });

  it('Given a running round, then inputs move only the sender, ticks advance it, and the podium ranks scores', () => {
    const room = createRoom('catch', 7, rng);
    const a = joinRoom(room, 'Ana');
    const b = joinRoom(room, 'Ben');
    if (!a.ok || !b.ok) throw new Error('join');
    expect(startRoom(room, 'nope')).toBe(false);
    expect(startRoom(room, room.hostToken)).toBe(true);
    partyInput(room, a.player.id, { x: 1 });
    partyInput(room, b.player.id, { x: 'bad' });
    let ended = false;
    for (let i = 0; i < 20 * 70 && !ended; i++) ended = tickRoom(room, 0.05).ended;
    expect(ended).toBe(true);
    expect(room.phase).toBe('podium');
    const rows = podiumOf(room);
    expect(rows).toHaveLength(2);
    expect(rows[0].score).toBeGreaterThanOrEqual(rows[1].score);
  });

  it('Given late joiners during a round, then they wait in the lobby for the next one', () => {
    const room = createRoom('splat', 7, rng);
    joinRoom(room, 'Ana');
    startRoom(room, room.hostToken);
    const late = joinRoom(room, 'Zoe');
    expect(late.ok).toBe(true);
    expect(room.sim && 'players' in room.sim ? room.sim.players.length : 0).toBe(1);
  });

  it('Given a round just ended, then nobody can restart it until the podium has been up for a few seconds', () => {
    const room = createRoom('dash', 7, rng);
    joinRoom(room, 'Ana');
    startRoom(room, room.hostToken);
    let ended = false;
    for (let i = 0; i < 20 * 70 && !ended; i++) ended = tickRoom(room, 0.05).ended;
    expect(startRoom(room, room.hostToken, room.endedAt + 500)).toBe(false);
    expect(startRoom(room, room.hostToken, room.endedAt + 3500)).toBe(true);
  });
});
