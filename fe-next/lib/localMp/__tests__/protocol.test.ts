import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSION,
  serialize,
  parseMessage,
  submitWord,
  join,
  stateSnapshot,
  heartbeat,
  hostChanged,
} from '../protocol';

describe('local MP protocol', () => {
  it('round-trips a submitWord message', () => {
    const msg = submitWord({ word: 'hello', playerId: 'p1', seq: 3 });
    const parsed = parseMessage(serialize(msg));
    expect(parsed).toEqual({ v: PROTOCOL_VERSION, t: 'submitWord', word: 'hello', playerId: 'p1', seq: 3 });
  });

  it('round-trips a join message', () => {
    const parsed = parseMessage(serialize(join({ playerId: 'p2', displayName: 'Ada' })));
    expect(parsed).toMatchObject({ t: 'join', playerId: 'p2', displayName: 'Ada' });
  });

  it('round-trips a versioned state snapshot', () => {
    const state = { board: ['A', 'B'], scores: { p1: 10 }, timeLeft: 42 };
    const parsed = parseMessage(serialize(stateSnapshot({ version: 7, state })));
    expect(parsed).toMatchObject({ t: 'state', version: 7, state });
  });

  it('round-trips heartbeat and hostChanged', () => {
    expect(parseMessage(serialize(heartbeat({ version: 5 })))).toMatchObject({ t: 'heartbeat', version: 5 });
    expect(parseMessage(serialize(hostChanged({ hostPlayerId: 'p3' })))).toMatchObject({
      t: 'hostChanged',
      hostPlayerId: 'p3',
    });
  });

  it('stamps the protocol version on every message', () => {
    expect(submitWord({ word: 'x', playerId: 'p1' }).v).toBe(PROTOCOL_VERSION);
  });

  it('returns null on malformed JSON (never throws)', () => {
    expect(parseMessage('not json{')).toBeNull();
    expect(parseMessage('')).toBeNull();
  });

  it('returns null on a version mismatch', () => {
    const wrong = JSON.stringify({ v: PROTOCOL_VERSION + 99, t: 'submitWord', word: 'x', playerId: 'p1' });
    expect(parseMessage(wrong)).toBeNull();
  });

  it('returns null on an unknown message type', () => {
    expect(parseMessage(JSON.stringify({ v: PROTOCOL_VERSION, t: 'evilType', x: 1 }))).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    expect(parseMessage(JSON.stringify({ v: PROTOCOL_VERSION, t: 'submitWord', playerId: 'p1' }))).toBeNull();
    expect(parseMessage(JSON.stringify({ v: PROTOCOL_VERSION, t: 'state' }))).toBeNull();
  });
});
