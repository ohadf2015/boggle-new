import { describe, it, expect } from 'vitest';
import { generateRoomCode, PARTY_ROOM_CODE_LENGTH } from '../partyHandler';
import { GameCodeSchema } from '../../../shared/schemas/socketSchemas';

describe('party generateRoomCode', () => {
  it('produces a 6-char code (aligned with main multiplayer length)', () => {
    expect(PARTY_ROOM_CODE_LENGTH).toBe(6);
    for (let i = 0; i < 100; i++) {
      expect(generateRoomCode()).toHaveLength(6);
    }
  });

  it('uses the unambiguous charset (no I/O/0/1)', () => {
    const charset = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    for (let i = 0; i < 100; i++) {
      expect(generateRoomCode()).toMatch(charset);
    }
  });

  it('passes the shared GameCodeSchema — closes the latent min-6 mismatch', () => {
    // Previously party emitted 5-char codes that would FAIL GameCodeSchema
    // (min 6) if ever routed through the shared validator. Now they align.
    for (let i = 0; i < 100; i++) {
      expect(() => GameCodeSchema.parse(generateRoomCode())).not.toThrow();
    }
  });
});
