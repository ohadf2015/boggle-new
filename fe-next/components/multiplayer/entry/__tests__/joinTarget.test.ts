/**
 * The join sheet's room, resolved ONE way for every path that opens it — a
 * typed code, a room card, an invite link (pitfall class 3). r4: the typed-code
 * sheet showed "0" players, the code as the title and the viewer's own flag for
 * a room the list showed as "Turbo Salmonʼs Room · 🇺🇸 · 1/50", because the code
 * path built a stand-in room object instead of reading the listing.
 */
import { describe, it, expect } from 'vitest';
import type { ArenaRoom } from '../ArenaRow';
import { codeTicket, resolveJoinTarget } from '../joinTarget';

const listed: ArenaRoom = {
  gameCode: 'CN2T8U',
  roomName: 'Turbo Salmonʼs Room',
  playerCount: 1,
  maxPlayers: 50,
  language: 'en',
  gameState: 'waiting',
  isRanked: false,
  createdAt: 1,
  gameMode: 'classic',
  hostUsername: 'Turbo Salmon',
};

describe('resolveJoinTarget', () => {
  it('a typed code for a listed room resolves to the live listing (name, seats, flag, mode, host)', () => {
    const target = resolveJoinTarget(codeTicket('cn2t8u', 'he'), [listed]);
    expect(target).toMatchObject({
      gameCode: 'CN2T8U',
      roomName: 'Turbo Salmonʼs Room',
      playerCount: 1,
      maxPlayers: 50,
      language: 'en',
      gameMode: 'classic',
      hostUsername: 'Turbo Salmon',
    });
    expect(target?.unlisted).toBeFalsy();
  });

  it('reads the listing at render time: seats that move while the sheet is open are the ones shown', () => {
    const opened = resolveJoinTarget(listed, [listed]);
    const later = resolveJoinTarget(listed, [{ ...listed, playerCount: 4 }]);
    expect(opened?.playerCount).toBe(1);
    expect(later?.playerCount).toBe(4);
  });

  it('a code nobody lists stays an honest code ticket', () => {
    const target = resolveJoinTarget(codeTicket('ZZ9QX2', 'en'), [listed]);
    expect(target?.unlisted).toBe(true);
    expect(target?.gameCode).toBe('ZZ9QX2');
  });

  it('a card whose room left the listing keeps the snapshot it was opened with', () => {
    expect(resolveJoinTarget(listed, [])).toBe(listed);
  });

  it('nothing selected → nothing to show', () => {
    expect(resolveJoinTarget(null, [listed])).toBeNull();
  });
});

describe('codeTicket', () => {
  it('guesses nothing about the room: no name, mode, seats or host', () => {
    const ticket = codeTicket('zz9qx2', 'he');
    expect(ticket).toMatchObject({ gameCode: 'ZZ9QX2', roomName: '', unlisted: true });
    expect(ticket.gameMode).toBeUndefined();
    expect(ticket.maxPlayers).toBeUndefined();
    expect(ticket.hostUsername).toBeUndefined();
  });
});
