import { describe, it, expect, afterEach } from 'vitest';
import { readServerPresence } from '../serverPresence';

const g = globalThis as Record<string, unknown>;

describe('readServerPresence', () => {
  afterEach(() => {
    delete g.__lcAuthUserConnections;
    delete g.__lcGameLookup;
  });

  it('Given no socket process in this runtime, Then everyone is null, never an error', () => {
    expect(readServerPresence(['a'])).toEqual([{ userId: 'a', status: null }]);
  });

  it('Given shared socket state, Then rooms map through the presence rules (classroom hidden)', () => {
    g.__lcAuthUserConnections = new Map([
      ['a', { gameCode: 'OPEN', username: 'A' }],
      ['k', { gameCode: 'CLASS', username: 'K' }],
    ]);
    const games: Record<string, unknown> = {
      OPEN: { gameState: 'waiting', users: { A: {} } },
      CLASS: { gameState: 'waiting', isClassroom: true, users: { K: {} } },
    };
    g.__lcGameLookup = (code: string) => games[code] ?? null;
    expect(readServerPresence(['a', 'k'])).toEqual([
      { userId: 'a', status: 'in_lobby', gameCode: 'OPEN' },
      { userId: 'k', status: null },
    ]);
  });
});
