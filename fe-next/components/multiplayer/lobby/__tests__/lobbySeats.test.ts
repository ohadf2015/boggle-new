import { describe, it, expect } from 'vitest';
import { lobbySeats, readyTally, startSublabel, lobbyMax } from '../lobbySeats';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('lobbySeats — one roster source for host and joiner', () => {
  const room = [
    { username: 'Host', isHost: true },
    { username: 'Ada' },
    'Bo',
    { username: 'Bot Lexi', isBot: true },
  ];

  it('seats every player the server lists, host and bots included, in seat order', () => {
    // Given the updateUsers list as the joiner receives it (strings + records)
    const seats = lobbySeats(room, 'Ada', ['Ada', 'Host', 'Bot Lexi']);
    // Then all four are seated — a joiner can never read "PLAYERS 0"
    expect(seats.map((s) => s.id)).toEqual(['Host', 'Ada', 'Bo', 'Bot Lexi']);
    expect(seats[0].isHost).toBe(true);
    expect(seats[3].isBot).toBe(true);
  });

  it('marks ready only humans who are not the host (server semantics)', () => {
    const seats = lobbySeats(room, 'Ada', ['Ada', 'Host', 'Bot Lexi']);
    expect(seats.find((s) => s.id === 'Ada')?.isReady).toBe(true);
    expect(seats.find((s) => s.id === 'Host')?.isReady).toBe(false);
    expect(seats.find((s) => s.id === 'Bot Lexi')?.isReady).toBe(false);
    expect(seats.find((s) => s.id === 'Bo')?.isReady).toBe(false);
  });

  it('seats everyone the server lists, so the 9th joiner still sees their own seat', () => {
    const crowd = Array.from({ length: 27 }, (_, i) => `P${i}`);
    const seats = lobbySeats(crowd, 'P26', []);
    expect(seats).toHaveLength(27);
    expect(seats.some((s) => s.id === 'P26')).toBe(true);
  });

  it('counts ready over the whole room, not the first 8 seats', () => {
    const crowd = [{ username: 'Host', isHost: true }, ...Array.from({ length: 14 }, (_, i) => `P${i}`)];
    const ready = Array.from({ length: 14 }, (_, i) => `P${i}`);
    expect(readyTally(lobbySeats(crowd, 'P13', ready))).toEqual({ ready: 14, total: 14, allReady: true });
  });

  it('carries the seat avatar through to the tile', () => {
    const avatar = { customAvatar: { skin: 'a' } } as never;
    const seats = lobbySeats([{ username: 'Ada', avatar }], 'Ada', []);
    expect(seats[0].avatar).toBe(avatar);
  });
});

describe('readyTally', () => {
  it('counts ready humans over eligible humans (host and bots excluded)', () => {
    const seats = lobbySeats(
      [{ username: 'Host', isHost: true }, 'Ada', 'Bo', { username: 'B', isBot: true }],
      'Host',
      ['Ada', 'B'],
    );
    expect(readyTally(seats)).toEqual({ ready: 1, total: 2, allReady: false });
  });

  it('is allReady only when there is at least one eligible human and all are ready', () => {
    expect(readyTally(lobbySeats([{ username: 'Host', isHost: true }], 'Host', []))).toEqual({ ready: 0, total: 0, allReady: false });
    expect(readyTally(lobbySeats(['Ada'], 'Host', ['Ada'])).allReady).toBe(true);
  });
});

describe('startSublabel — the START CTA says who you will play', () => {
  it('says "vs bots" when no human opponent is seated (replaces the old pink banner)', () => {
    expect(startSublabel({ seated: 1, humanGuests: 0, t })).toBe('mpUi.lobby.startVsBots:{"count":1,"max":8}');
  });

  it('shows the seat count once a human is in', () => {
    expect(startSublabel({ seated: 3, humanGuests: 2, t })).toBe('mpUi.lobby.seatsTaken:{"count":3,"max":8}');
  });

  it('shows the real room cap once the room outgrows the 8 starter chairs', () => {
    expect(lobbyMax(8)).toBe(8);
    expect(lobbyMax(9)).toBe(MAX_PLAYERS_PER_ROOM);
    expect(startSublabel({ seated: 12, humanGuests: 11, t })).toBe(`mpUi.lobby.seatsTaken:{"count":12,"max":${MAX_PLAYERS_PER_ROOM}}`);
  });
});
