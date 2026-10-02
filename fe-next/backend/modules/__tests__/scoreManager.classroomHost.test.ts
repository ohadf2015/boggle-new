import { getLeaderboard, type ScoreGameBase } from '../scoreManager';

function makeGame(overrides: Partial<ScoreGameBase> & { isClassroom?: boolean } = {}): ScoreGameBase {
  return {
    users: {
      'Ms Free': { username: 'Ms Free', isHost: true, isBot: false } as never,
      Zoe: { username: 'Zoe', isHost: false, isBot: false } as never,
    },
    playerScores: { 'Ms Free': 0, Zoe: 130 },
    playerWords: { 'Ms Free': [], Zoe: ['house'] },
    ...overrides,
  } as ScoreGameBase;
}

describe('getLeaderboard — the teacher is the screen, not a contestant', () => {
  it('Given a classroom room, Then a host who found nothing is not ranked', () => {
    const board = getLeaderboard(makeGame({ isClassroom: true } as never));
    expect(board.map((p) => p.username)).toEqual(['Zoe']);
  });

  it('Given an arcade room, Then the host still plays and is ranked', () => {
    const board = getLeaderboard(makeGame());
    expect(board.map((p) => p.username)).toEqual(['Zoe', 'Ms Free']);
  });

  it('Given a classroom host who somehow scored, Then they are not hidden', () => {
    const board = getLeaderboard(
      makeGame({ isClassroom: true, playerScores: { 'Ms Free': 20, Zoe: 130 }, playerWords: { 'Ms Free': ['cat'], Zoe: ['house'] } } as never)
    );
    expect(board.map((p) => p.username)).toEqual(['Zoe', 'Ms Free']);
  });
});
