/**
 * The handshake that stops REMATCH stranding both students.
 *
 * Round 3 shipped a REMATCH that INSERTED a duel per tap. Both kids tapped it
 * on their own podium, two duel rows existed, each client navigated to its own
 * room id, and both sat on "Waiting for opponent…" forever. That is the bug the
 * blind critic disqualified us on.
 *
 * A rematch is an agreement between two people, so it needs a pact: the first
 * tap OFFERS, the second tap MATCHES, and exactly ONE duel is created for both.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  rematchPactKey,
  offerRematch,
  cancelRematch,
  peekRematchPact,
  clearRematchPacts,
  REMATCH_PACT_TTL_MS,
} from '../duelRematchPacts';

const A = 'aaaaaaaa-0000-0000-0000-000000000001';
const B = 'bbbbbbbb-0000-0000-0000-000000000002';
const LESSON = 'cccccccc-0000-0000-0000-000000000003';
const DUEL = 'dddddddd-0000-0000-0000-000000000004';

describe('duelRematchPacts', () => {
  beforeEach(() => clearRematchPacts());

  describe('rematchPactKey', () => {
    it('is the same key whichever student asks first', () => {
      expect(rematchPactKey(A, B, LESSON)).toBe(rematchPactKey(B, A, LESSON));
    });

    it('separates two lessons between the same pair', () => {
      expect(rematchPactKey(A, B, LESSON)).not.toBe(rematchPactKey(A, B, 'other-lesson'));
    });
  });

  describe('offerRematch', () => {
    it('offers on the first tap — nothing is created yet', () => {
      const key = rematchPactKey(A, B, LESSON);
      const result = offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      expect(result.status).toBe('offered');
    });

    it('matches when the OTHER student taps, and names the first as challenger', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      const result = offerRematch({ key, userId: B, duelId: DUEL, now: 2_000 });

      expect(result.status).toBe('matched');
      if (result.status !== 'matched') return;
      expect(result.challengerId).toBe(A);
      expect(result.opponentId).toBe(B);
      expect(result.sourceDuelId).toBe(DUEL);
    });

    it('consumes the pact so a third tap starts a new offer, not a second duel', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      offerRematch({ key, userId: B, duelId: DUEL, now: 2_000 });

      expect(offerRematch({ key, userId: A, duelId: DUEL, now: 3_000 }).status).toBe('offered');
    });

    it('treats a re-tap by the same student as still waiting, never a match', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      const again = offerRematch({ key, userId: A, duelId: DUEL, now: 1_500 });
      expect(again.status).toBe('waiting');
    });

    it('lets a stale offer expire instead of matching a student who left', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      const late = offerRematch({
        key,
        userId: B,
        duelId: DUEL,
        now: 1_000 + REMATCH_PACT_TTL_MS + 1,
      });
      expect(late.status).toBe('offered');
    });
  });

  describe('peek / cancel', () => {
    it('reads back a live offer', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      expect(peekRematchPact(key, 1_500)?.requesterId).toBe(A);
    });

    it('reports nothing once the offer expired', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });
      expect(peekRematchPact(key, 1_000 + REMATCH_PACT_TTL_MS + 1)).toBeNull();
    });

    it('cancels only the offer its own requester made', () => {
      const key = rematchPactKey(A, B, LESSON);
      offerRematch({ key, userId: A, duelId: DUEL, now: 1_000 });

      expect(cancelRematch(key, B)).toBe(false);
      expect(peekRematchPact(key, 1_100)).not.toBeNull();

      expect(cancelRematch(key, A)).toBe(true);
      expect(peekRematchPact(key, 1_100)).toBeNull();
    });
  });
});
