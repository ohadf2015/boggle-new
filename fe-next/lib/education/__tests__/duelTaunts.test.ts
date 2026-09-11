/**
 * Taunt sticker catalogue + the device-local memory of what you already sent,
 * so the turn card can keep showing your sticker after a reload.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DUEL_TAUNTS,
  duelTauntById,
  rememberSentTaunt,
  readSentTaunt,
} from '../duelTaunts';

describe('duelTaunts', () => {
  beforeEach(() => localStorage.clear());

  it('offers exactly four stickers', () => {
    expect(DUEL_TAUNTS).toHaveLength(4);
  });

  it('points every sticker at a real mascot sticker asset and an education key', () => {
    for (const taunt of DUEL_TAUNTS) {
      expect(taunt.src).toBe(`/mascot/teacher/sticker-${taunt.id}.webp`);
      expect(taunt.labelKey.startsWith('education.duels.taunt')).toBe(true);
    }
  });

  it('looks a sticker up by id', () => {
    expect(duelTauntById('fire')?.id).toBe('fire');
    expect(duelTauntById('nope')).toBeUndefined();
  });

  it('remembers the sticker sent for a duel', () => {
    rememberSentTaunt('duel-1', 'trophy');
    expect(readSentTaunt('duel-1')).toBe('trophy');
  });

  it('keeps taunts separate per duel and returns null when none was sent', () => {
    rememberSentTaunt('duel-1', 'fire');
    expect(readSentTaunt('duel-2')).toBeNull();
  });

  it('ignores an unknown sticker id rather than persisting junk', () => {
    rememberSentTaunt('duel-3', 'garbage');
    expect(readSentTaunt('duel-3')).toBeNull();
  });
});
