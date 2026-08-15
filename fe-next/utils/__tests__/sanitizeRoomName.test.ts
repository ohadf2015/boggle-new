/**
 * Regression: sanitizeRoomName carried its own Unicode range list (ASCII +
 * Hebrew/kana/CJK only) that was narrower than the pattern it claimed to mirror,
 * so it silently ate accents and Cyrillic — "Björn" became "Bjrn". Room names are
 * generated from usernames (CreateRoomModal), so this mangled the default room
 * name for every accented player. It now strips exactly what NAME_VALID_PATTERN
 * disallows.
 */
import { sanitizeRoomName, NAME_VALID_PATTERN } from '../consts';

describe('sanitizeRoomName', () => {
  it('keeps accented Latin letters', () => {
    expect(sanitizeRoomName('Björn Room')).toBe('Björn Room');
    expect(sanitizeRoomName('Andrés Room')).toBe('Andrés Room');
  });

  it('keeps non-Latin scripts', () => {
    expect(sanitizeRoomName('Дмитрий')).toBe('Дмитрий');
    expect(sanitizeRoomName('אוהד')).toBe('אוהד');
    expect(sanitizeRoomName('김민준')).toBe('김민준');
  });

  it('strips punctuation that is not . _ or -', () => {
    expect(sanitizeRoomName('<script>alert(1)</script>')).toBe('scriptalert1script');
    expect(sanitizeRoomName('a/b&c')).toBe('abc');
  });

  it('strips control, zero-width and bidi-override characters', () => {
    expect(sanitizeRoomName('bad\u0001name')).toBe('badname');
    expect(sanitizeRoomName('bad\u200Bname')).toBe('badname');
    expect(sanitizeRoomName('bad\u202Ename')).toBe('badname');
    expect(sanitizeRoomName('bad\uFEFFname')).toBe('badname');
  });

  it('trims and tolerates empty input', () => {
    expect(sanitizeRoomName('  spaced  ')).toBe('spaced');
    expect(sanitizeRoomName('')).toBe('');
  });

  it('always produces something the shared pattern accepts', () => {
    for (const raw of ['Björn Room', 'a/b&c', '  Дмитрий  ', 'ok.name_1-2']) {
      const cleaned = sanitizeRoomName(raw);
      expect(NAME_VALID_PATTERN.test(cleaned)).toBe(true);
    }
  });
});
