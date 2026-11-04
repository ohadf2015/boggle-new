import { describe, it, expect } from 'vitest';
import { parseRosterName, teacherFacingName } from '../rosterName';

describe('parseRosterName', () => {
  it('trims, keeps 1..40 characters, and treats null as clear', () => {
    expect(parseRosterName('  Dani ')).toEqual({ ok: true, value: 'Dani' });
    expect(parseRosterName(null)).toEqual({ ok: true, value: null });
    expect(parseRosterName(' \t ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseRosterName('א'.repeat(40))).toEqual({ ok: true, value: 'א'.repeat(40) });
    expect(parseRosterName('a'.repeat(41))).toEqual({ ok: false, reason: 'tooLong' });
  });
});

describe('teacherFacingName', () => {
  const profile = { display_name: 'Victoria Delong', username: 'Player_570b3674' };

  it('prefers the roster name, else the student’s own name, else the fallback', () => {
    expect(teacherFacingName('Vicky', profile, '?')).toBe('Vicky');
    expect(teacherFacingName(null, profile, '?')).toBe('Victoria Delong');
    expect(teacherFacingName(undefined, profile, '?')).toBe('Victoria Delong');
    expect(teacherFacingName('   ', profile, '?')).toBe('Victoria Delong');
    expect(teacherFacingName(null, { username: 'Player_570b3674' }, '?')).toBe('?');
    expect(teacherFacingName(null, null, '?')).toBe('?');
  });
});
