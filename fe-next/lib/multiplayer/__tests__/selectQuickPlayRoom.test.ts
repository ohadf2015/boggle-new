/**
 * selectQuickPlayRoom — single source of truth for "which existing public room
 * should Quick Play drop the player into before spawning a brand-new one".
 *
 * Root cause it fixes: Quick Play used to ALWAYS create a fresh public room, so
 * every solo player spawned their own 1/50 lobby and the arena filled with
 * ghost rooms that look like live battles but have nobody to play. This selector
 * lets Quick Play consolidate players into a compatible waiting room first.
 */

import { selectQuickPlayRoom } from '../selectQuickPlayRoom';
import type { ActiveRoom } from '@/shared/types/game';

const room = (overrides: Partial<ActiveRoom> = {}): ActiveRoom => ({
  gameCode: 'AAAAAA',
  roomName: 'Test Room',
  language: 'en',
  playerCount: 1,
  maxPlayers: 50,
  gameState: 'waiting',
  isRanked: false,
  createdAt: 1000,
  gameMode: 'classic',
  ...overrides,
});

describe('selectQuickPlayRoom', () => {
  it('returns null when there are no rooms', () => {
    expect(selectQuickPlayRoom([], { language: 'en' })).toBeNull();
  });

  it('joins a compatible waiting room (the fix: no longer always creates new)', () => {
    const r = room({ gameCode: 'JOINME' });
    expect(selectQuickPlayRoom([r], { language: 'en' })).toBe(r);
  });

  it('ignores rooms that are not waiting (in-progress / validating / finished)', () => {
    const rooms = [
      room({ gameCode: 'INPROG', gameState: 'in-progress' }),
      room({ gameCode: 'VALID', gameState: 'validating' }),
      room({ gameCode: 'DONE', gameState: 'finished' }),
    ];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })).toBeNull();
  });

  it('ignores rooms in a different language', () => {
    const rooms = [room({ gameCode: 'SPANISH', language: 'es' })];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })).toBeNull();
  });

  it('ignores rooms of a different game mode', () => {
    const rooms = [room({ gameCode: 'BLAST', gameMode: 'blast' })];
    expect(selectQuickPlayRoom(rooms, { language: 'en', gameMode: 'classic' })).toBeNull();
  });

  it('treats a room with undefined gameMode as classic', () => {
    const r = room({ gameCode: 'NOMODE', gameMode: undefined });
    expect(selectQuickPlayRoom([r], { language: 'en', gameMode: 'classic' })).toBe(r);
  });

  it('defaults the criteria gameMode to classic when omitted', () => {
    const r = room({ gameCode: 'CLASSIC', gameMode: 'classic' });
    const blast = room({ gameCode: 'BLAST', gameMode: 'blast' });
    expect(selectQuickPlayRoom([blast, r], { language: 'en' })).toBe(r);
  });

  it('skips full rooms', () => {
    const rooms = [room({ gameCode: 'FULL', playerCount: 50, maxPlayers: 50 })];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })).toBeNull();
  });

  it('skips rooms with zero connected players', () => {
    const rooms = [room({ gameCode: 'EMPTY', playerCount: 0 })];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })).toBeNull();
  });

  it('never hijacks ranked rooms (Quick Play is casual)', () => {
    const rooms = [room({ gameCode: 'RANKED', isRanked: true })];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })).toBeNull();
  });

  it('prefers the room with the most players (consolidate into fewest rooms)', () => {
    const rooms = [
      room({ gameCode: 'ONE', playerCount: 1 }),
      room({ gameCode: 'THREE', playerCount: 3 }),
      room({ gameCode: 'TWO', playerCount: 2 }),
    ];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })?.gameCode).toBe('THREE');
  });

  it('tie-breaks equal player counts by oldest room first', () => {
    const rooms = [
      room({ gameCode: 'NEW', playerCount: 2, createdAt: 5000 }),
      room({ gameCode: 'OLD', playerCount: 2, createdAt: 1000 }),
    ];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })?.gameCode).toBe('OLD');
  });

  it('tie-breaks identical players+age deterministically by gameCode', () => {
    const rooms = [
      room({ gameCode: 'ZZZ', playerCount: 2, createdAt: 1000 }),
      room({ gameCode: 'AAA', playerCount: 2, createdAt: 1000 }),
    ];
    expect(selectQuickPlayRoom(rooms, { language: 'en' })?.gameCode).toBe('AAA');
  });

  it('does not mutate the input array order', () => {
    const rooms = [
      room({ gameCode: 'ONE', playerCount: 1 }),
      room({ gameCode: 'THREE', playerCount: 3 }),
    ];
    const snapshot = rooms.map((r) => r.gameCode);
    selectQuickPlayRoom(rooms, { language: 'en' });
    expect(rooms.map((r) => r.gameCode)).toEqual(snapshot);
  });
});
