import { describe, expect, it, beforeEach } from 'vitest';
import {
  shouldOfferQuickPlayRecovery,
  markRoomEndedRecoveryAccepted,
  consumeRoomEndedRecoveryAccepted,
  resetRoomEndedRecoveryForTests,
} from '../roomEndedRecovery';

// Prod, last 28 days: 156 people tried to join a room that no longer existed
// (GAME_NOT_FOUND, mostly old room links) and about a third never played after.
// The arcade player gets a one-tap "Play now" into Quick Play; a classroom
// student must never be offered public matchmaking.
describe('shouldOfferQuickPlayRecovery', () => {
  const base = { wasActive: false, context: 'arcade' as const, isHost: false };

  it('GIVEN a cold arcade join to a dead room THEN offers Quick Play', () => {
    expect(shouldOfferQuickPlayRecovery(base)).toBe(true);
  });

  it('GIVEN a classroom room THEN never offers public Quick Play', () => {
    expect(shouldOfferQuickPlayRecovery({ ...base, context: 'classroom' })).toBe(false);
  });

  it('GIVEN the classroom record is still pending THEN does not guess arcade', () => {
    expect(shouldOfferQuickPlayRecovery({ ...base, context: 'pending' })).toBe(false);
  });

  it('GIVEN a host (teacher or room owner) THEN does not offer it', () => {
    expect(shouldOfferQuickPlayRecovery({ ...base, isHost: true })).toBe(false);
  });

  it('GIVEN the player was already in the room (mid-game teardown) THEN keeps the timed-out path', () => {
    expect(shouldOfferQuickPlayRecovery({ ...base, wasActive: true })).toBe(false);
  });
});

describe('room-ended recovery acceptance marker', () => {
  beforeEach(() => resetRoomEndedRecoveryForTests());

  it('is consumed exactly once after an accept', () => {
    markRoomEndedRecoveryAccepted();
    expect(consumeRoomEndedRecoveryAccepted()).toBe(true);
    expect(consumeRoomEndedRecoveryAccepted()).toBe(false);
  });

  it('reads false when nothing was accepted', () => {
    expect(consumeRoomEndedRecoveryAccepted()).toBe(false);
  });
});
