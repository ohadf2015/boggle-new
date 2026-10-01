import { describe, it, expect } from 'vitest';
import { roundOutcome } from '../roundOutcome';

const p = (username: string, score: number) => ({ username, score });

describe('roundOutcome — the recap never celebrates a round nobody won', () => {
  it('Given no players, Then the round is empty and nothing celebrates', () => {
    expect(roundOutcome([])).toMatchObject({ kind: 'empty', celebrate: false, leaders: [] });
  });

  it('Given everyone scored zero, Then it is a zero round with no leaders and no celebration', () => {
    const out = roundOutcome([p('Zoe', 0), p('Dan', 0)]);
    expect(out).toMatchObject({ kind: 'zero', celebrate: false, leaders: [], topScore: 0 });
  });

  it('Given one player who scored zero, Then it is still a zero round, not a solo win', () => {
    expect(roundOutcome([p('Zoe', 0)]).kind).toBe('zero');
  });

  it('Given one player who scored, Then it is a solo round that celebrates the player', () => {
    expect(roundOutcome([p('Zoe', 130)])).toMatchObject({
      kind: 'solo',
      celebrate: true,
      leaders: ['Zoe'],
      topScore: 130,
    });
  });

  it('Given a player count larger than the podium, Then one podium entry is not a solo round', () => {
    expect(roundOutcome([p('Zoe', 130)], 4).kind).toBe('winner');
  });

  it('Given two players tied on top, Then it is a tie naming both leaders', () => {
    const out = roundOutcome([p('Maya', 90), p('Leo', 90), p('Noa', 40)]);
    expect(out).toMatchObject({ kind: 'tie', celebrate: true, leaders: ['Maya', 'Leo'], topScore: 90 });
  });

  it('Given a clear top score, Then it is a winner round', () => {
    const out = roundOutcome([p('Leo', 112), p('Maya', 148)]);
    expect(out).toMatchObject({ kind: 'winner', celebrate: true, leaders: ['Maya'], topScore: 148, players: 2 });
  });

  it('Given only the winner scored, Then zero scorers do not turn it into a tie', () => {
    expect(roundOutcome([p('Maya', 20), p('Leo', 0), p('Noa', 0)]).kind).toBe('winner');
  });
});
