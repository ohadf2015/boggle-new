import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../classroomLevelCache.js', () => ({
  classroomTeamAbilities: () => ({ ana: 3, bo: 3, cy: 1, di: 1 }),
}));

import {
  setRivalIo,
  startRivalRound,
  notifyRivalScore,
  notifyRivalLeft,
  rivalPayloadFor,
  rivalPayloadField,
} from '../rivalSocket';
import type { RivalRoom } from '../rivalPairs';

type Sent = { to: string; event: string; data: unknown };

function fakeIo() {
  const sent: Sent[] = [];
  const io = { to: (to: string) => ({ emit: (event: string, data: unknown) => sent.push({ to, event, data }) }) };
  return { io: io as never, sent };
}

function game(names: string[], extra: Record<string, object> = {}): RivalRoom & { gameMode: string } {
  const users: RivalRoom['users'] = {};
  const playerScores: Record<string, number> = {};
  for (const n of names) {
    users[n] = { socketId: `s-${n}`, avatar: null, isHost: false, authUserId: `u-${n}`, ...(extra[n] ?? {}) } as never;
    playerScores[n] = 0;
  }
  return { users, playerScores, gameSessionId: 3, rivalry: null, gameMode: 'classic' };
}

const classroom = (rivalry?: boolean) => ({ classroomId: 'c1', settings: rivalry === undefined ? {} : { rivalry } }) as never;

describe('rivalSocket glue', () => {
  let sent: Sent[];
  let io: never;
  beforeEach(() => {
    ({ io, sent } = fakeIo());
    setRivalIo(io);
  });

  it('Given a classroom round, When it starts, Then each student gets a private rivalUpdate on their own socket', () => {
    const g = game(['ana', 'bo', 'cy', 'di', 'teach'], { teach: { isHost: true } });
    startRivalRound(io, 'ROOM', g as never, classroom(), {});
    const targets = sent.filter((s) => s.event === 'rivalUpdate').map((s) => s.to).sort();
    expect(targets).toEqual(['s-ana', 's-bo', 's-cy', 's-di']);
    expect(rivalPayloadFor('ROOM', g as never, 'ana')?.rivalName).toBe('bo');
  });

  it('Given a casual (non-classroom) room, When it starts, Then rivalry stays off', () => {
    const g = game(['ana', 'bo']);
    startRivalRound(io, 'ROOM', g as never, null, {});
    expect(sent).toEqual([]);
    expect(rivalPayloadFor('ROOM', g as never, 'ana')).toBeNull();
  });

  it('Given the teacher turned rivalry off, When the round starts, Then nothing is sent', () => {
    const g = game(['ana', 'bo']);
    startRivalRound(io, 'ROOM', g as never, classroom(false), {});
    expect(sent).toEqual([]);
  });

  it('Given the pressure dial hides the leaderboard, When the round starts, Then nothing is sent', () => {
    const g = game(['ana', 'bo']) as never as { classroomPressure: { leaderboard: string } };
    g.classroomPressure = { leaderboard: 'hidden' };
    startRivalRound(io, 'ROOM', g as never, classroom(), {});
    expect(sent).toEqual([]);
  });

  it('Given team rosters in the start extras, When paired, Then rivals cross teams', () => {
    const g = game(['ana', 'bo', 'cy', 'di']);
    const teams = [{ id: 0, memberNames: ['ana', 'cy'] }, { id: 1, memberNames: ['bo', 'di'] }];
    startRivalRound(io, 'ROOM', g as never, classroom(true), { classroom: { teams } });
    expect(rivalPayloadFor('ROOM', g as never, 'ana')?.rivalName).toBe('bo');
  });

  it('Given a pass, When the score is reported, Then the flip goes to the game room', () => {
    const g = game(['ana', 'bo']);
    startRivalRound(io, 'ROOM', g as never, classroom(), {});
    sent.length = 0;
    g.playerScores.ana = 2;
    notifyRivalScore('ROOM', g as never, 'ana');
    g.playerScores.bo = 5;
    notifyRivalScore('ROOM', g as never, 'bo');
    expect(sent.filter((s) => s.event === 'rivalFlip')).toEqual([
      { to: 'game:ROOM', event: 'rivalFlip', data: { gameSessionId: 3, winnerName: 'bo', winnerAvatar: null } },
    ]);
  });

  it('Given no rivalry state (casual room, bot score), When a score is reported, Then nothing is sent and nothing throws', () => {
    expect(() => notifyRivalScore('ROOM', undefined as never, 'ana')).not.toThrow();
    notifyRivalScore('ROOM', game(['ana']) as never, 'ana');
    expect(sent).toEqual([]);
  });

  it('Given a leaver, When reported, Then the orphan is told on their socket', () => {
    const g = game(['ana', 'bo']);
    startRivalRound(io, 'ROOM', g as never, classroom(), {});
    sent.length = 0;
    notifyRivalLeft('ROOM', g as never, 'ana');
    expect(sent).toEqual([{ to: 's-bo', event: 'rivalUpdate', data: { gameSessionId: 3, rival: null } }]);
  });

  it('Given the leaver returns, When their reconnect payload is built, Then the old rival is back and the rival is told', () => {
    const g = game(['ana', 'bo']);
    startRivalRound(io, 'ROOM', g as never, classroom(), {});
    notifyRivalLeft('ROOM', g as never, 'ana');
    sent.length = 0;
    expect(rivalPayloadFor('ROOM', g as never, 'ana')?.rivalName).toBe('bo');
    expect(sent.map((s) => s.to)).toContain('s-bo');
  });

  it('Given a casual room, When a per-player payload is built, Then it carries no rival field at all', () => {
    expect(rivalPayloadField('ROOM', game(['ana', 'bo']) as never, 'ana')).toEqual({});
  });

  it('Given a classroom round, When a per-player payload is built, Then it carries the rival (null for an unpaired student)', () => {
    const g = game(['ana', 'bo', 'teach'], { teach: { isHost: true } });
    startRivalRound(io, 'ROOM', g as never, classroom(), {});
    expect(rivalPayloadField('ROOM', g as never, 'ana')).toEqual({ rival: { rivalName: 'bo', rivalAvatar: null, myScore: 0, rivalScore: 0 } });
    expect(rivalPayloadField('ROOM', g as never, 'teach')).toEqual({ rival: null });
  });
});
