import { describe, it, expect } from 'vitest';
import { acceptGuestBoardName } from '../guestBoardName';

describe('acceptGuestBoardName', () => {
  it('Given a name the guest typed, Then it is trimmed and kept', () => {
    expect(acceptGuestBoardName('  Zigzag  ')).toBe('Zigzag');
  });

  it('Given a generated default name (any case, numbered), Then it is refused', () => {
    expect(acceptGuestBoardName('sneaky  potato 2')).toBeNull();
    expect(acceptGuestBoardName('Player')).toBeNull();
  });

  it('Given an empty, non-string or control-only value, Then it is refused', () => {
    expect(acceptGuestBoardName('   ')).toBeNull();
    expect(acceptGuestBoardName(' \u0007 ')).toBeNull();
    expect(acceptGuestBoardName(42)).toBeNull();
    expect(acceptGuestBoardName(undefined)).toBeNull();
  });

  it('Given a profane name, Then it is refused', () => {
    expect(acceptGuestBoardName('shit')).toBeNull();
  });

  it('Given an over-long name, Then it is clamped to 40 characters', () => {
    expect(acceptGuestBoardName('x'.repeat(60))).toHaveLength(40);
  });
});
