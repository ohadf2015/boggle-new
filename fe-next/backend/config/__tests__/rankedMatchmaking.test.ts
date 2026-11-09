import { describe, expect, it } from 'vitest';
import {
  buildRankedMatchTicket,
  isRankedMatchTicketValid,
  isRankedMatchmakingEnabled,
} from '../rankedMatchmaking';

describe('isRankedMatchmakingEnabled', () => {
  it('defaults OFF when env unset', () => {
    expect(isRankedMatchmakingEnabled({})).toBe(false);
  });

  it('defaults OFF for any value other than exact true', () => {
    expect(isRankedMatchmakingEnabled({ RANKED_MATCHMAKING_ENABLED: '1' })).toBe(false);
    expect(isRankedMatchmakingEnabled({ RANKED_MATCHMAKING_ENABLED: 'TRUE' })).toBe(false);
    expect(isRankedMatchmakingEnabled({ RANKED_MATCHMAKING_ENABLED: 'false' })).toBe(false);
    expect(isRankedMatchmakingEnabled({ RANKED_MATCHMAKING_ENABLED: '' })).toBe(false);
  });

  it('enables only when RANKED_MATCHMAKING_ENABLED=true', () => {
    expect(isRankedMatchmakingEnabled({ RANKED_MATCHMAKING_ENABLED: 'true' })).toBe(true);
  });
});

describe('isRankedMatchTicketValid', () => {
  const base = buildRankedMatchTicket({
    roomId: 'RABC12',
    role: 'host',
    playerId: 'u1',
    opponentId: 'u2',
    now: 1_000,
  });

  it('accepts a matching unexpired host ticket', () => {
    expect(
      isRankedMatchTicketValid(base, { roomId: 'RABC12', role: 'host', playerId: 'u1', now: 1_000 }),
    ).toBe(true);
  });

  it('rejects forged room ids, roles, players, and expired tickets', () => {
    expect(isRankedMatchTicketValid(base, { roomId: 'OTHER', role: 'host', playerId: 'u1', now: 1_000 })).toBe(false);
    expect(isRankedMatchTicketValid(base, { roomId: 'RABC12', role: 'joiner', playerId: 'u1', now: 1_000 })).toBe(false);
    expect(isRankedMatchTicketValid(base, { roomId: 'RABC12', role: 'host', playerId: 'u2', now: 1_000 })).toBe(false);
    expect(isRankedMatchTicketValid(base, { roomId: 'RABC12', role: 'host', playerId: 'u1', now: base.expiresAt + 1 })).toBe(false);
    expect(isRankedMatchTicketValid(null, { roomId: 'RABC12', role: 'host', playerId: 'u1', now: 1_000 })).toBe(false);
  });
});
