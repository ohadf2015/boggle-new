import { describe, it, expect } from 'vitest';
import {
  pairRivals,
  resetRivalsForNewRound,
  rivalStartExtras,
  onScoreChanged,
  onPlayerLeft,
  seatRivalPlayer,
  RIVAL_FLIP_COOLDOWN_MS,
  type RivalRoom,
  type RivalEmit,
} from '../rivalPairs';

type Seat = { isBot?: boolean; isHost?: boolean; isPractice?: boolean };

function room(names: string[], extra: Record<string, Seat> = {}, sessionId = 1): RivalRoom {
  const users: RivalRoom['users'] = {};
  const playerScores: Record<string, number> = {};
  for (const name of names) {
    users[name] = { avatar: { emoji: name[0] }, isHost: false, ...(extra[name] ?? {}) };
    playerScores[name] = 0;
  }
  return { users, playerScores, gameSessionId: sessionId, rivalry: null };
}

const start = (r: RivalRoom, opts: Partial<Parameters<typeof resetRivalsForNewRound>[1]> = {}) =>
  resetRivalsForNewRound(r, { enabled: true, mode: 'classic', seed: 'ROOM1', abilities: {}, ...opts });

const rivalOf = (r: RivalRoom, name: string) => rivalStartExtras(r, name)?.rivalName ?? null;
const privateTo = (events: RivalEmit[], name: string) =>
  events.filter((e) => e.kind === 'private' && e.username === name);
const flips = (events: RivalEmit[]) => events.filter((e) => e.kind === 'room');

function score(r: RivalRoom, name: string, value: number, now = 0) {
  r.playerScores[name] = value;
  return onScoreChanged(r, name, now);
}

describe('pairRivals', () => {
  it('Given fewer than 2 players, When paired, Then there are no groups', () => {
    expect(pairRivals([], {}, { seed: 's' })).toEqual([]);
    expect(pairRivals(['ana'], {}, { seed: 's' })).toEqual([]);
  });

  it('Given 2 players, When paired, Then they are each other\'s pair', () => {
    expect(pairRivals(['ana', 'bo'], {}, { seed: 's' }).map((g) => [...g].sort())).toEqual([['ana', 'bo']]);
  });

  it('Given 3 players, When paired, Then one trio holds everyone', () => {
    const groups = pairRivals(['ana', 'bo', 'cy'], {}, { seed: 's' });
    expect(groups).toHaveLength(1);
    expect([...groups[0]].sort()).toEqual(['ana', 'bo', 'cy']);
  });

  it('Given 4 players with abilities, When paired, Then neighbours by ability are paired', () => {
    const groups = pairRivals(['ana', 'bo', 'cy', 'di'], { ana: 3, bo: 1, cy: 3, di: 1 }, { seed: 's' });
    const sets = groups.map((g) => [...g].sort().join(','));
    expect(sets.sort()).toEqual(['ana,cy', 'bo,di']);
  });

  it('Given 50 players, When paired, Then every player is in exactly one group of 2 or 3', () => {
    const names = Array.from({ length: 50 }, (_, i) => `kid${i}`);
    const groups = pairRivals(names, {}, { seed: 's' });
    expect(groups.flat().sort()).toEqual([...names].sort());
    expect(groups.every((g) => g.length === 2 || g.length === 3)).toBe(true);
    expect(groups).toHaveLength(25);
  });

  it('Given 51 players, When paired, Then exactly one trio', () => {
    const names = Array.from({ length: 51 }, (_, i) => `kid${i}`);
    const groups = pairRivals(names, {}, { seed: 's' });
    expect(groups.filter((g) => g.length === 3)).toHaveLength(1);
    expect(groups.flat()).toHaveLength(51);
  });

  it('Given the same input in a different order, When paired twice, Then the result is identical', () => {
    const a = pairRivals(['ana', 'bo', 'cy', 'di', 'ed'], { ana: 2 }, { seed: 'x' });
    const b = pairRivals(['ed', 'di', 'cy', 'bo', 'ana'], { ana: 2 }, { seed: 'x' });
    expect(a).toEqual(b);
  });

  it('Given guests with no ability, When paired, Then they rank at the default 0 like team assignment', () => {
    const groups = pairRivals(['ana', 'guest1', 'bo', 'guest2'], { ana: 1, bo: 1 }, { seed: 's' });
    const sets = groups.map((g) => [...g].sort().join(',')).sort();
    expect(sets).toEqual(['ana,bo', 'guest1,guest2']);
  });

  it('Given abilities keyed lowercase, When names are mixed case, Then the ability still applies', () => {
    const groups = pairRivals(['Ana', 'Bo', 'Cy', 'Di'], { ana: 3, cy: 3 }, { seed: 's' });
    expect(groups.map((g) => [...g].sort().join(',')).sort()).toEqual(['Ana,Cy', 'Bo,Di']);
  });

  it('Given team mode, When neighbours share a team, Then pairs cross teams where possible', () => {
    const teamOf = { ana: 0, bo: 0, cy: 1, di: 1 };
    const groups = pairRivals(['ana', 'bo', 'cy', 'di'], { ana: 3, bo: 3, cy: 2, di: 2 }, { seed: 's', teamOf });
    for (const g of groups) expect(teamOf[g[0] as keyof typeof teamOf]).not.toBe(teamOf[g[1] as keyof typeof teamOf]);
  });

  it('Given uneven teams, When paired, Then everyone still gets a group', () => {
    const teamOf = { ana: 0, bo: 0, cy: 0, di: 1, ed: 1 };
    const groups = pairRivals(Object.keys(teamOf), {}, { seed: 's', teamOf });
    expect(groups.flat().sort()).toEqual(Object.keys(teamOf).sort());
    expect(groups.filter((g) => g.length === 3)).toHaveLength(1);
  });
});

describe('resetRivalsForNewRound + rivalStartExtras', () => {
  it('Given a host, a bot and a practice seat, When the round starts, Then none of them is a rival', () => {
    const r = room(['teach', 'robo', 'prac', 'ana', 'bo'], {
      teach: { isHost: true }, robo: { isBot: true }, prac: { isPractice: true },
    });
    start(r);
    expect(rivalOf(r, 'ana')).toBe('bo');
    expect(rivalOf(r, 'bo')).toBe('ana');
    expect(rivalOf(r, 'teach')).toBeNull();
    expect(rivalOf(r, 'robo')).toBeNull();
    expect(rivalOf(r, 'prac')).toBeNull();
  });

  it('Given 1 human, When the round starts, Then nobody has a rival', () => {
    const r = room(['ana', 'robo'], { robo: { isBot: true } });
    expect(start(r)).toEqual([]);
    expect(rivalOf(r, 'ana')).toBeNull();
  });

  it('Given all guests, When the round starts, Then they are still paired', () => {
    const r = room(['g1', 'g2', 'g3', 'g4']);
    start(r);
    for (const name of ['g1', 'g2', 'g3', 'g4']) expect(rivalOf(r, name)).not.toBeNull();
  });

  it('Given a trio, When the round starts, Then each member\'s rival is the next one round the trio', () => {
    const r = room(['ana', 'bo', 'cy']);
    start(r);
    const a = rivalOf(r, 'ana')!;
    const b = rivalOf(r, a)!;
    expect(rivalOf(r, b)).toBe('ana');
    expect(new Set(['ana', a, b]).size).toBe(3);
  });

  it('Given a pairing, When the round starts, Then each paired student gets one private update carrying the session id', () => {
    const r = room(['ana', 'bo'], {}, 7);
    const events = start(r);
    expect(privateTo(events, 'ana')).toHaveLength(1);
    expect(privateTo(events, 'bo')).toHaveLength(1);
    expect(flips(events)).toEqual([]);
    const update = privateTo(events, 'ana')[0];
    expect(update.kind === 'private' && update.payload).toEqual({
      gameSessionId: 7,
      rival: { rivalName: 'bo', rivalAvatar: { emoji: 'b' }, myScore: 0, rivalScore: 0 },
    });
  });

  it('Given the rivalry setting off, When the round starts, Then no pairing and no events', () => {
    const r = room(['ana', 'bo']);
    expect(start(r, { enabled: false })).toEqual([]);
    expect(rivalOf(r, 'ana')).toBeNull();
    expect(score(r, 'ana', 5)).toEqual([]);
  });

  it('Given settings saved before the toggle existed, When the round starts, Then rivalry is on', () => {
    const r = room(['ana', 'bo']);
    start(r, { enabled: undefined });
    expect(rivalOf(r, 'ana')).toBe('bo');
  });

  it.each(['vocab-quiz', 'crossword', 'wheel-rush', 'wordcraft'])('Given mode %s, When the round starts, Then rivalry is off', (mode) => {
    const r = room(['ana', 'bo']);
    expect(start(r, { mode })).toEqual([]);
    expect(rivalOf(r, 'ana')).toBeNull();
  });

  it('Given the teacher hid the live leaderboard, When the round starts, Then rivalry is off', () => {
    const r = room(['ana', 'bo']);
    expect(start(r, { leaderboardHidden: true })).toEqual([]);
    expect(rivalOf(r, 'ana')).toBeNull();
  });

  it('Given a new round with different players, When it starts, Then the old pairs and lead state are gone', () => {
    const r = room(['ana', 'bo']);
    start(r);
    score(r, 'bo', 3);
    score(r, 'ana', 9);
    const next = room(['ana', 'cy'], {}, 2);
    next.rivalry = r.rivalry;
    start(next);
    expect(rivalOf(next, 'ana')).toBe('cy');
    expect(rivalOf(next, 'bo')).toBeNull();
    expect(next.rivalry?.ahead).toEqual({});
    expect(rivalStartExtras(next, 'ana')).toMatchObject({ myScore: 0, rivalScore: 0 });
  });

  it('Given a stored pairing, When the same student asks twice, Then both answers are identical', () => {
    const r = room(['ana', 'bo', 'cy', 'di']);
    start(r);
    r.playerScores.ana = 4;
    expect(rivalStartExtras(r, 'ana')).toEqual(rivalStartExtras(r, 'ana'));
  });
});

describe('onScoreChanged', () => {
  it('Given a level pair, When one scores first, Then both get updates, the scorer took the lead, and no flip over a 0', () => {
    const r = room(['ana', 'bo']);
    start(r);
    const events = score(r, 'ana', 5);
    const toAna = privateTo(events, 'ana')[0];
    const toBo = privateTo(events, 'bo')[0];
    expect(toAna.kind === 'private' && toAna.payload).toMatchObject({ tookLead: true, rival: { myScore: 5, rivalScore: 0 } });
    expect(toBo.kind === 'private' && toBo.payload).toMatchObject({ rival: { myScore: 0, rivalScore: 5 } });
    expect(toBo.kind === 'private' && toBo.payload.tookLead).toBeFalsy();
    expect(flips(events)).toEqual([]);
  });

  it('Given a student behind a scoring rival, When they pass, Then a room flip names only the winner', () => {
    const r = room(['ana', 'bo']);
    start(r);
    score(r, 'ana', 5, 0);
    const events = score(r, 'bo', 6, 1_000);
    expect(flips(events)).toEqual([{ kind: 'room', event: 'rivalFlip', payload: { gameSessionId: 1, winnerName: 'bo', winnerAvatar: { emoji: 'b' } } }]);
    expect(JSON.stringify(flips(events))).not.toContain('ana');
  });

  it('Given a level score, When a student only ties, Then no lead and no flip', () => {
    const r = room(['ana', 'bo']);
    start(r);
    score(r, 'ana', 5);
    const events = score(r, 'bo', 5, 1_000);
    expect(flips(events)).toEqual([]);
    const toBo = privateTo(events, 'bo')[0];
    expect(toBo.kind === 'private' && toBo.payload.tookLead).toBeFalsy();
  });

  it('Given a pair trading the lead faster than the cooldown, When they pass each other, Then at most one flip per cooldown', () => {
    const r = room(['ana', 'bo']);
    start(r);
    score(r, 'ana', 2, 0);
    const first = score(r, 'bo', 4, 1_000);
    const second = score(r, 'ana', 6, 2_000);
    const third = score(r, 'bo', 8, 3_000);
    const late = score(r, 'ana', 10, 1_000 + RIVAL_FLIP_COOLDOWN_MS);
    expect(flips(first)).toHaveLength(1);
    expect(flips(second)).toHaveLength(0);
    expect(flips(third)).toHaveLength(0);
    expect(privateTo(second, 'ana')[0]).toMatchObject({ payload: { tookLead: true } });
    expect(flips(late)).toHaveLength(1);
  });

  it('Given both members score in the same tick, When each change is reported, Then the final updates match the stored scores', () => {
    const r = room(['ana', 'bo']);
    start(r);
    score(r, 'ana', 3, 0);
    r.playerScores.ana = 10;
    r.playerScores.bo = 12;
    const a = onScoreChanged(r, 'ana', 9_000);
    const b = onScoreChanged(r, 'bo', 9_000);
    expect(flips([...a, ...b])).toHaveLength(1);
    const last = privateTo(b, 'ana')[0];
    expect(last.kind === 'private' && last.payload.rival).toMatchObject({ myScore: 10, rivalScore: 12 });
  });

  it('Given a score that drops (peer rejection), When reported, Then the rival can take the lead', () => {
    const r = room(['ana', 'bo']);
    start(r);
    score(r, 'bo', 4, 0);
    score(r, 'ana', 6, 0);
    const events = score(r, 'ana', 2, 20_000);
    expect(flips(events)).toEqual([expect.objectContaining({ payload: expect.objectContaining({ winnerName: 'bo' }) })]);
  });

  it('Given a bot or non-member scores, When reported, Then nothing is emitted', () => {
    const r = room(['ana', 'bo', 'robo'], { robo: { isBot: true } });
    start(r);
    expect(score(r, 'robo', 50)).toEqual([]);
  });

  it('Given a trio, When one member scores, Then every trio member is updated', () => {
    const r = room(['ana', 'bo', 'cy']);
    start(r);
    const events = score(r, 'ana', 3);
    expect(new Set(events.filter((e) => e.kind === 'private').map((e) => e.kind === 'private' && e.username))).toEqual(new Set(['ana', 'bo', 'cy']));
  });
});

describe('onPlayerLeft + seatRivalPlayer', () => {
  it('Given a pair and another pair, When one student leaves, Then the orphan joins the other pair as a trio', () => {
    const r = room(['ana', 'bo', 'cy', 'di'], {}, 1);
    start(r);
    const leaver = 'ana';
    const orphan = rivalOf(r, leaver)!;
    const events = onPlayerLeft(r, leaver);
    expect(rivalOf(r, leaver)).toBeNull();
    expect(rivalOf(r, orphan)).not.toBeNull();
    expect(rivalOf(r, orphan)).not.toBe(leaver);
    expect(privateTo(events, orphan)).toHaveLength(1);
    expect(r.rivalry?.groups.map((g) => g.members.length)).toEqual([3]);
  });

  it('Given two orphans, When the second appears, Then the orphans pair with each other', () => {
    const r = room(['ana', 'bo', 'cy', 'di', 'ed', 'fi']);
    start(r, { abilities: { ana: 3, bo: 3, cy: 2, di: 2, ed: 1, fi: 1 } });
    onPlayerLeft(r, 'ana');
    expect(rivalOf(r, 'bo')).not.toBeNull();
    onPlayerLeft(r, 'fi');
    const sizes = r.rivalry!.groups.map((g) => g.members.length).sort();
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(4);
    expect(rivalOf(r, 'ed')).not.toBeNull();
  });

  it('Given a trio member leaves, When re-paired, Then the other two stay rivals', () => {
    const r = room(['ana', 'bo', 'cy']);
    start(r);
    onPlayerLeft(r, 'ana');
    expect(rivalOf(r, 'bo')).toBe('cy');
    expect(rivalOf(r, 'cy')).toBe('bo');
  });

  it('Given the only pair, When one leaves and returns, Then they get their old rival back', () => {
    const r = room(['ana', 'bo']);
    start(r);
    const left = onPlayerLeft(r, 'ana');
    expect(privateTo(left, 'bo')[0]).toMatchObject({ payload: { rival: null } });
    expect(rivalOf(r, 'bo')).toBeNull();
    const back = seatRivalPlayer(r, 'ana');
    expect(rivalOf(r, 'ana')).toBe('bo');
    expect(rivalOf(r, 'bo')).toBe('ana');
    expect(privateTo(back, 'bo')).toHaveLength(1);
  });

  it('Given the old rival was re-paired, When the leaver returns, Then everyone is seated again', () => {
    const r = room(['ana', 'bo', 'cy', 'di']);
    start(r);
    const old = rivalOf(r, 'ana')!;
    onPlayerLeft(r, 'ana');
    seatRivalPlayer(r, 'ana');
    expect(rivalOf(r, 'ana')).not.toBeNull();
    expect(r.rivalry!.groups.flatMap((g) => g.members).sort()).toEqual(['ana', 'bo', 'cy', 'di']);
    expect(rivalOf(r, old)).not.toBeNull();
  });

  it('Given a seated student, When seated again (retry, recovery), Then nothing changes', () => {
    const r = room(['ana', 'bo']);
    start(r);
    expect(seatRivalPlayer(r, 'ana')).toEqual([]);
    expect(rivalOf(r, 'ana')).toBe('bo');
  });

  it('Given a single student at start, When a late joiner arrives, Then they become rivals', () => {
    const r = room(['ana']);
    start(r);
    r.users.bo = { avatar: null, isHost: false };
    r.playerScores.bo = 0;
    seatRivalPlayer(r, 'bo');
    expect(rivalOf(r, 'ana')).toBe('bo');
  });

  it('Given rivalry off, When someone leaves or joins, Then nothing is emitted', () => {
    const r = room(['ana', 'bo', 'cy']);
    start(r, { enabled: false });
    expect(onPlayerLeft(r, 'ana')).toEqual([]);
    expect(seatRivalPlayer(r, 'ana')).toEqual([]);
  });

  it('Given a bot or teacher, When seated, Then they never become a rival', () => {
    const r = room(['ana', 'teach'], { teach: { isHost: true } });
    start(r);
    expect(seatRivalPlayer(r, 'teach')).toEqual([]);
    expect(rivalOf(r, 'teach')).toBeNull();
  });
});

describe('round start before scores exist', () => {
  it('Given a fresh room whose score map is not built yet, When duels are dealt, Then everyone starts level at 0 instead of the start failing', () => {
    const room = { users: { ana: {}, bo: {} }, gameSessionId: 1, rivalry: null } as never;
    const events = resetRivalsForNewRound(room, { enabled: true, leaderboardHidden: false, mode: 'classic', seed: 's', abilities: {}, teams: [] });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ payload: { rival: { myScore: 0, rivalScore: 0 } } });
  });
});
