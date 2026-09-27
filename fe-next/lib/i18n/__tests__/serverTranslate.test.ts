import { describe, it, expect } from 'vitest';
import { translateKey } from '../serverTranslate';

describe('translateKey — server-side dotted-path i18n resolver', () => {
  it('resolves a dotted key to the English string', () => {
    // Given a known landing key, When resolved in en, Then returns the value
    expect(translateKey('landing.arena', 'en')).toBe('Multiplayer');
  });

  it('resolves keys from non-landing namespaces', () => {
    expect(translateKey('crossword.name', 'en')).toBe('Crossword');
    expect(translateKey('wordcraft.modeTitle', 'en')).toBe('WordCraft');
  });

  it('returns a localized value for non-English languages (differs from en)', () => {
    const en = translateKey('landing.arena', 'en');
    const he = translateKey('landing.arena', 'he');
    expect(he).toBeTruthy();
    expect(he).not.toBe(en);
  });

  it('falls back to English when the language lacks the key', () => {
    // Unknown language → English value, never empty
    expect(translateKey('landing.arena', 'zz')).toBe('Multiplayer');
  });

  it('returns the explicit fallback when the key is missing everywhere', () => {
    expect(translateKey('does.not.exist.anywhere', 'en', 'FALLBACK')).toBe('FALLBACK');
  });

  it('returns the key itself when missing and no fallback given', () => {
    expect(translateKey('does.not.exist.anywhere', 'en')).toBe('does.not.exist.anywhere');
  });

  it('never returns a non-string (object) when the path stops at a namespace', () => {
    // 'landing' is an object, not a leaf — must not leak the object
    const result = translateKey('landing', 'en', 'SAFE');
    expect(typeof result).toBe('string');
    expect(result).toBe('SAFE');
  });
});
