/**
 * Regression: the server UsernameSchema enumerated Unicode script ranges by hand
 * while the client validated with /^[\p{L}\p{N}\s._-]+$/u. Any letter outside the
 * server's hardcoded list (Greek, Korean, Vietnamese, Arabic, Thai, ...) passed
 * client validation and was rejected by the socket handler, leaving the player
 * stuck in a retry loop on /multiplayer.
 * Sentry JAVASCRIPT-NEXTJS-1Y8 / 1YJ / 1YK — the 5th patch to this same allowlist.
 */
import { UsernameSchema, RoomNameSchema } from '../schemas/socketSchemas';
import { NAME_VALID_PATTERN } from '../constants/namePattern';

const accepted: [string, string][] = [
  ['ascii', 'Player_1'],
  ['spanish', 'Andrés'],
  ['swedish', 'Björn'],
  ['hebrew', 'אוהד'],
  ['japanese', 'ひろし'],
  ['cyrillic', 'Дмитрий'],
  ['greek', 'Γιώργος'],
  ['korean', '김민준'],
  ['vietnamese', 'Nguyễn'],
  ['arabic', 'محمد'],
  ['thai', 'สมชาย'],
  ['devanagari', 'अर्जुन'],
];

describe('UsernameSchema', () => {
  it.each(accepted)('accepts a %s name', (_label, name) => {
    expect(UsernameSchema.safeParse(name).success).toBe(true);
  });

  it('agrees with the client-side NAME_VALID_PATTERN', () => {
    for (const [, name] of accepted) {
      expect(NAME_VALID_PATTERN.test(name)).toBe(true);
    }
  });

  it('still rejects control characters', () => {
    expect(UsernameSchema.safeParse('bad\u0001name').success).toBe(false);
    expect(UsernameSchema.safeParse('bad\u009Fname').success).toBe(false);
  });

  it('still rejects zero-width characters and BOM', () => {
    expect(UsernameSchema.safeParse('bad\u200Bname').success).toBe(false);
    expect(UsernameSchema.safeParse('bad\uFEFFname').success).toBe(false);
  });

  it('still rejects bidi override characters used for display spoofing', () => {
    expect(UsernameSchema.safeParse('bad\u202Ename').success).toBe(false);
    expect(UsernameSchema.safeParse('bad\u2066name').success).toBe(false);
  });

  it('still rejects emoji, matching the client pattern', () => {
    expect(UsernameSchema.safeParse('player\u{1F600}').success).toBe(false);
  });

  it('still rejects punctuation that is not . _ or -', () => {
    expect(UsernameSchema.safeParse('<script>').success).toBe(false);
    expect(UsernameSchema.safeParse('a/b').success).toBe(false);
  });

  it('still enforces length bounds', () => {
    expect(UsernameSchema.safeParse('').success).toBe(false);
    expect(UsernameSchema.safeParse('x'.repeat(31)).success).toBe(false);
  });
});

describe('RoomNameSchema', () => {
  // Its old hand-written range list was even narrower than the username one --
  // no Latin accents and no Cyrillic at all -- so an accented room name passed
  // client validation and was rejected server-side.
  it.each(accepted)('accepts a %s room name', (_label, name) => {
    expect(RoomNameSchema.safeParse(name).success).toBe(true);
  });

  it('stays optional', () => {
    expect(RoomNameSchema.safeParse(undefined).success).toBe(true);
  });

  it('still rejects unsafe characters and over-long names', () => {
    expect(RoomNameSchema.safeParse('<script>').success).toBe(false);
    expect(RoomNameSchema.safeParse('bad\u200Bname').success).toBe(false);
    expect(RoomNameSchema.safeParse('x'.repeat(51)).success).toBe(false);
  });
});
