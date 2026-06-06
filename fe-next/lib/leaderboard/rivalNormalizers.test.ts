import { describe, it, expect } from 'vitest';
import { rosterToRivals, blastEntriesToRivals } from './rivalNormalizers';

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
