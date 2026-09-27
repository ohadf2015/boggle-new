/**
 * One ranking in the system, carried — never a second one computed.
 */
import { describe, it, expect } from 'vitest';
import { toStandings } from '../resultsStandings';

describe('toStandings', () => {
  it('keeps the order it was given — the server already ranked the room', () => {
    const rows = [
      { username: 'Noa', score: 300, isBot: false, wordDetails: [], rank: 1 },
      { username: 'Bot Ziv', score: 250, isBot: true, wordDetails: [] },
      { username: 'Ari', score: 250, isBot: false, wordDetails: [] },
    ];
    expect(toStandings(rows)).toEqual([
      { username: 'Noa', score: 300, isBot: false },
      { username: 'Bot Ziv', score: 250, isBot: true },
      { username: 'Ari', score: 250, isBot: false },
    ]);
  });

  it('carries the bot flag through, because the podium counts humans only', () => {
    expect(toStandings([{ username: 'Bot', score: 10, isBot: true }])[0].isBot).toBe(true);
  });

  it('survives a payload that never mentions bots', () => {
    expect(toStandings([{ username: 'Noa', score: 5 }])).toEqual([
      { username: 'Noa', score: 5, isBot: undefined },
    ]);
  });

  it('is empty for an empty room instead of throwing', () => {
    expect(toStandings([])).toEqual([]);
  });
});
