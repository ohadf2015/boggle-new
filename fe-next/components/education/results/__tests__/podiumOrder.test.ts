import { describe, it, expect } from 'vitest';
import { orderPodiumByScore, podiumCountFloor } from '../podiumOrder';

const e = (username: string, score: number, rank: number) => ({ username, score, rank });

describe('orderPodiumByScore — a pedestal can never out-score the one above it', () => {
  it('Given a server podium whose ranks contradict the scores, When ordered, Then rank follows score', () => {
    const out = orderPodiumByScore([e('Maya', 148, 1), e('Leo', 85, 2), e('Noa', 87, 3)]);
    expect(out.map((p) => [p.username, p.rank])).toEqual([
      ['Maya', 1],
      ['Noa', 2],
      ['Leo', 3],
    ]);
  });

  it('Given entries in any array order, When ordered, Then output is rank order 1..n', () => {
    const out = orderPodiumByScore([e('C', 10, 3), e('A', 30, 1), e('B', 20, 2)]);
    expect(out.map((p) => p.username)).toEqual(['A', 'B', 'C']);
    expect(out.map((p) => p.rank)).toEqual([1, 2, 3]);
  });

  it('Given a tie on score, When ordered, Then the server rank breaks it (stable, no reshuffle)', () => {
    const out = orderPodiumByScore([e('B', 50, 2), e('A', 50, 1), e('C', 40, 3)]);
    expect(out.map((p) => p.username)).toEqual(['A', 'B', 'C']);
  });

  it('Given more than three entries, When ordered, Then only the top three stand on the podium', () => {
    const out = orderPodiumByScore([e('A', 1, 1), e('B', 9, 2), e('C', 5, 3), e('D', 7, 4)]);
    expect(out.map((p) => p.username)).toEqual(['B', 'D', 'C']);
  });

  it('keeps every other field of an entry (detail lines travel with their student)', () => {
    const out = orderPodiumByScore([
      { ...e('A', 5, 1), detail: 'a' },
      { ...e('B', 9, 2), detail: 'b' },
    ]);
    expect(out[0]).toMatchObject({ username: 'B', detail: 'b', rank: 1 });
  });

  it('does not mutate its input', () => {
    const input = [e('A', 5, 1), e('B', 9, 2)];
    orderPodiumByScore(input);
    expect(input.map((p) => p.rank)).toEqual([1, 2]);
  });

  it('handles an empty podium', () => {
    expect(orderPodiumByScore([])).toEqual([]);
  });
});

describe('podiumCountFloor — a count-up never shows silver below bronze mid-reveal', () => {
  const ordered = orderPodiumByScore([e('Maya', 148, 1), e('Leo', 112, 2), e('Noa', 87, 3)]);

  it('Given silver is counting up, Then it starts from bronze (it climbs past, never under)', () => {
    expect(podiumCountFloor(ordered, 2)).toBe(87);
  });

  it('Given gold is counting up, Then it starts from silver', () => {
    expect(podiumCountFloor(ordered, 1)).toBe(112);
  });

  it('Given bronze, Then it starts from zero', () => {
    expect(podiumCountFloor(ordered, 3)).toBe(0);
  });

  it('Given a two-player podium, Then second starts from zero', () => {
    const two = orderPodiumByScore([e('A', 20, 1), e('B', 10, 2)]);
    expect(podiumCountFloor(two, 2)).toBe(0);
    expect(podiumCountFloor(two, 1)).toBe(10);
  });
});
