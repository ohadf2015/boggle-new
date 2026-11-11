import { LOBBY_RECONNECT_SHOW_MS, lobbyRoster, trackDrops } from '../lobbyPresence';

const ana = { username: 'Ana' };
const ben = { username: 'Ben', disconnected: true };
const host = { username: 'Teach', isHost: true };

describe('trackDrops', () => {
  it('stamps a student the first time the lobby sees them dropped, and keeps that stamp', () => {
    const first = trackDrops({}, [ana, ben], 1000);
    expect(first).toEqual({ Ben: 1000 });
    expect(trackDrops(first, [ana, ben], 5000)).toBe(first);
  });

  it('forgets the stamp once the student is back or gone', () => {
    expect(trackDrops({ Ben: 1000 }, [ana, { username: 'Ben' }], 5000)).toEqual({});
    expect(trackDrops({ Ben: 1000 }, [ana], 5000)).toEqual({});
  });
});

describe('lobbyRoster', () => {
  it('keeps a dropped student on the wall as reconnecting, without the host', () => {
    expect(lobbyRoster([host, ana, ben], { Ben: 1000 }, 2000, 'Teach')).toEqual([
      { username: 'Ana' },
      { username: 'Ben', reconnecting: true },
    ]);
  });

  it('takes them off the wall after the lobby timeout', () => {
    expect(lobbyRoster([ana, ben], { Ben: 1000 }, 1000 + LOBBY_RECONNECT_SHOW_MS, 'Teach')).toEqual([{ username: 'Ana' }]);
  });

  it('accepts bare-name rosters and carries bot and avatar fields', () => {
    const bot = { username: 'Bot', isBot: true, avatar: null };
    expect(lobbyRoster(['Ana', bot], {}, 0, 'Teach')).toEqual([{ username: 'Ana' }, { username: 'Bot', isBot: true, avatar: null }]);
  });
});
