import { describe, it, expect } from 'vitest';
import { rosterToRivals, blastEntriesToRivals, playersToRivals } from './rivalNormalizers';

describe('rosterToRivals (classic desktop shell)', () => {
  const roster = [
    { userId: 'u1', username: 'Alpha', score: 250, wordCount: 12, isYou: true, customAvatar: null },
    { userId: 'u2', username: 'Beta', score: 100, wordCount: 5 },
  ];

  it('flags isMe from the isYou field', () => {
    const rivals = rosterToRivals(roster, 'whatever');
    expect(rivals.find((r) => r.id === 'u1')!.isMe).toBe(true);
    expect(rivals.find((r) => r.id === 'u2')!.isMe).toBe(false);
  });

  it('flags isMe via meId matching username (classic meId IS the username)', () => {
    const noFlag = roster.map(({ isYou: _isYou, ...rest }) => rest);
    const rivals = rosterToRivals(noFlag, 'Beta');
    expect(rivals.find((r) => r.id === 'u2')!.isMe).toBe(true);
    expect(rivals.find((r) => r.id === 'u1')!.isMe).toBe(false);
  });

  it('flags isMe via meId matching userId', () => {
    const noFlag = roster.map(({ isYou: _isYou, ...rest }) => rest);
    const rivals = rosterToRivals(noFlag, 'u1');
    expect(rivals.find((r) => r.id === 'u1')!.isMe).toBe(true);
  });

  it('maps name, score, wordsFound and passes avatar through', () => {
    const rivals = rosterToRivals(roster, 'u1');
    const a = rivals.find((r) => r.id === 'u1')!;
    expect(a.name).toBe('Alpha');
    expect(a.score).toBe(250);
    expect(a.wordsFound).toBe(12);
    expect(a).toHaveProperty('customAvatar');
  });
});

describe('blastEntriesToRivals (blast)', () => {
  const entries = [
    { username: 'Me', score: 80, wordCount: 4, avatar: { customAvatar: null } },
    { username: 'Rival', score: 60, wordCount: 3 },
  ];

  it('flags isMe by username match', () => {
    const rivals = blastEntriesToRivals(entries, 'Me');
    expect(rivals.find((r) => r.id === 'Me')!.isMe).toBe(true);
    expect(rivals.find((r) => r.id === 'Rival')!.isMe).toBe(false);
  });

  it('no one is me when username is undefined', () => {
    const rivals = blastEntriesToRivals(entries, undefined);
    expect(rivals.every((r) => !r.isMe)).toBe(true);
  });

  it('uses username as id and name, maps wordsFound, passes avatar through', () => {
    const rivals = blastEntriesToRivals(entries, 'Me');
    const me = rivals.find((r) => r.id === 'Me')!;
    expect(me.name).toBe('Me');
    expect(me.wordsFound).toBe(4);
    expect(me.customAvatar).toBeNull();
  });
});

describe('playersToRivals (results-page Player[] → RivalInput[])', () => {
  const players = [
    { username: 'Me', score: 300, allWords: [{ word: 'cat' }, { word: 'dog' }], avatar: { customAvatar: { hat: 'x' } } },
    { username: 'Rival', score: 280, allWords: [{ word: 'fox' }] },
    { username: 'Other', score: 120 },
  ] as never[];

  it('keys id/name by username and flags isMe by username match', () => {
    const rivals = playersToRivals(players, 'Me');
    const me = rivals.find((r) => r.id === 'Me')!;
    expect(me.name).toBe('Me');
    expect(me.isMe).toBe(true);
    expect(rivals.find((r) => r.id === 'Rival')!.isMe).toBe(false);
  });

  it('derives wordsFound from allWords length', () => {
    const rivals = playersToRivals(players, 'Me');
    expect(rivals.find((r) => r.id === 'Me')!.wordsFound).toBe(2);
    expect(rivals.find((r) => r.id === 'Other')!.wordsFound).toBe(0);
  });

  it('passes avatar.customAvatar through, null when absent', () => {
    const rivals = playersToRivals(players, 'Me');
    expect(rivals.find((r) => r.id === 'Me')!.customAvatar).toEqual({ hat: 'x' });
    expect(rivals.find((r) => r.id === 'Other')!.customAvatar).toBeNull();
  });

  it('no one is me when username is undefined', () => {
    const rivals = playersToRivals(players, undefined);
    expect(rivals.every((r) => !r.isMe)).toBe(true);
  });

  it('preserves score and order', () => {
    const rivals = playersToRivals(players, 'Me');
    expect(rivals.map((r) => r.score)).toEqual([300, 280, 120]);
  });
});
