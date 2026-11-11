import { describe, it, expect } from 'vitest';
import { isUnderdogFinish, underdogFor } from '../classroomUnderdog';

describe('isUnderdogFinish', () => {
  it('Given a 3-player round, When I finish last, Then it is not an underdog finish', () => {
    expect(isUnderdogFinish(5, [30, 20, 5])).toBe(false);
  });

  it('Given a 4-player round, When I finish last alone, Then it is an underdog finish', () => {
    expect(isUnderdogFinish(5, [30, 20, 10, 5])).toBe(true);
  });

  it('Given a 4-player round, When I finish third, Then it is not', () => {
    expect(isUnderdogFinish(10, [30, 20, 10, 5])).toBe(false);
  });

  it('Given 8 players, When I finish 7th or 8th, Then both are bottom quartile and 6th is not', () => {
    const scores = [80, 70, 60, 50, 40, 30, 20, 10];
    expect(isUnderdogFinish(10, scores)).toBe(true);
    expect(isUnderdogFinish(20, scores)).toBe(true);
    expect(isUnderdogFinish(30, scores)).toBe(false);
  });

  it('Given two players tied for last in 4, Then both get the underdog finish', () => {
    expect(isUnderdogFinish(5, [30, 20, 5, 5])).toBe(true);
  });

  it('Given a tie reaching into the quartile cut in 8, Then both tied players qualify', () => {
    expect(isUnderdogFinish(20, [80, 70, 60, 50, 40, 20, 20, 10])).toBe(true);
  });

  it('Given a tie sitting just above the cut in 8, Then neither tied player qualifies', () => {
    expect(isUnderdogFinish(30, [80, 70, 60, 50, 30, 30, 20, 10])).toBe(false);
  });

  it('Given everyone tied (nobody scored), Then nobody is an underdog', () => {
    expect(isUnderdogFinish(0, [0, 0, 0, 0])).toBe(false);
  });
});

describe('underdogFor', () => {
  const users = {
    Teacher: { authUserId: 't1', isHost: true },
    Ann: { authUserId: 'u1' },
    Ben: { authUserId: 'u2' },
    Cy: { authUserId: 'u3' },
    Dee: { authUserId: 'u4' },
    Bot: { isBot: true },
    Practice: { authUserId: 't1', isPractice: true },
  };

  it('Given a finished classic round, When the last student asks, Then it reads totalScore and says underdog', () => {
    const game = {
      users,
      cachedResultsPayload: {
        scores: [
          { username: 'Ann', totalScore: 40 },
          { username: 'Ben', totalScore: 30 },
          { username: 'Cy', totalScore: 20 },
          { username: 'Dee', totalScore: 5 },
          { username: 'Bot', totalScore: 1 },
          { username: 'Teacher', totalScore: 0 },
          { username: 'Practice', totalScore: 0 },
        ],
      },
    };
    expect(underdogFor(game, 'u4')).toBe(true);
    expect(underdogFor(game, 'u1')).toBe(false);
  });

  it('Given a quiz round payload with score only, Then it reads score', () => {
    const game = {
      users,
      cachedResultsPayload: { scores: ['Ann', 'Ben', 'Cy', 'Dee'].map((username, i) => ({ username, score: 40 - i * 10 })) },
    };
    expect(underdogFor(game, 'u4')).toBe(true);
  });

  it('Given bots, the host and the practice seat fill the room to 4, Then three students are never an underdog round', () => {
    const game = {
      users,
      cachedResultsPayload: {
        scores: [
          { username: 'Ann', totalScore: 40 },
          { username: 'Ben', totalScore: 30 },
          { username: 'Cy', totalScore: 5 },
          { username: 'Bot', totalScore: 1 },
          { username: 'Teacher', totalScore: 0 },
          { username: 'Practice', totalScore: 0 },
        ],
      },
    };
    expect(underdogFor(game, 'u3')).toBe(false);
  });

  it('Given no results payload or a student not in it, Then false and no throw', () => {
    expect(underdogFor({ users }, 'u4')).toBe(false);
    expect(underdogFor({ users, cachedResultsPayload: { gameSessionId: 7 } }, 'u4')).toBe(false);
    expect(underdogFor(null, 'u4')).toBe(false);
    expect(underdogFor({ users, cachedResultsPayload: { scores: [{ username: 'Ann', totalScore: 1 }] } }, 'nobody')).toBe(false);
  });
});
