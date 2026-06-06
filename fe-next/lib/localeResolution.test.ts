import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_PROXIMITY,
  mapToSupportedLocale,
  matchAcceptLanguage,
  resolveLocaleFromAcceptLanguage,
} from './localeResolution';

describe('mapToSupportedLocale', () => {
  it('returns directly-supported locales unchanged', () => {
    expect(mapToSupportedLocale('en')).toBe('en');
    expect(mapToSupportedLocale('es')).toBe('es');
    expect(mapToSupportedLocale('he')).toBe('he');
    expect(mapToSupportedLocale('sv')).toBe('sv');
    expect(mapToSupportedLocale('ja')).toBe('ja');
  });

  it('strips region + casing (es-MX, EN-gb, ja_JP)', () => {
    expect(mapToSupportedLocale('es-MX')).toBe('es');
    expect(mapToSupportedLocale('EN-gb')).toBe('en');
    expect(mapToSupportedLocale('ja_JP')).toBe('ja');
  });

  it('normalises legacy Hebrew code iw -> he', () => {
    expect(mapToSupportedLocale('iw')).toBe('he');
    expect(mapToSupportedLocale('iw-IL')).toBe('he');
  });

  // The reported bug: Brazilian (and other Romance) speakers get our Spanish
  // bundle, which they understand far better than English.
  it('maps Portuguese (incl. Brazil) to Spanish', () => {
    expect(mapToSupportedLocale('pt')).toBe('es');
    expect(mapToSupportedLocale('pt-BR')).toBe('es');
    expect(mapToSupportedLocale('pt-PT')).toBe('es');
  });

  it('maps other close Romance languages to Spanish', () => {
    expect(mapToSupportedLocale('gl')).toBe('es'); // Galician
    expect(mapToSupportedLocale('ca')).toBe('es'); // Catalan
    expect(mapToSupportedLocale('it')).toBe('es'); // Italian
  });

  it('returns null for languages with no native bundle and no close match', () => {
    expect(mapToSupportedLocale('de')).toBeNull();
    expect(mapToSupportedLocale('fr')).toBeNull();
    expect(mapToSupportedLocale('zh')).toBeNull();
    expect(mapToSupportedLocale('')).toBeNull();
    expect(mapToSupportedLocale(null)).toBeNull();
    expect(mapToSupportedLocale(undefined)).toBeNull();
  });

  it('every proximity target is itself a supported locale', () => {
    for (const target of Object.values(LOCALE_PROXIMITY)) {
      expect(SUPPORTED_LOCALES).toContain(target);
    }
  });
});

describe('matchAcceptLanguage (null when nothing maps)', () => {
  it('returns the highest-quality supported tag', () => {
    expect(matchAcceptLanguage('en-US,en;q=0.9,he;q=0.8')).toBe('en');
    expect(matchAcceptLanguage('he-IL,he;q=0.9')).toBe('he');
  });

  // THE discriminating case. en is present at lower q. A naive "match supported,
  // else fall back" returns en@0.8. The correct per-tag/interleaved resolver
  // hits pt->es on the FIRST (highest-q) tag, before en is ever considered.
  it('prefers proximity on a higher-q tag over a lower-q exact match', () => {
    expect(matchAcceptLanguage('pt-BR,pt;q=0.9,en;q=0.8')).toBe('es');
    expect(matchAcceptLanguage('pt-BR,en;q=0.8')).toBe('es');
  });

  it('still honours a genuinely higher-priority supported language', () => {
    // User prefers English over Portuguese -> English wins (higher q).
    expect(matchAcceptLanguage('en;q=0.9,pt-BR;q=0.8')).toBe('en');
  });

  it('returns null when no tag maps to anything', () => {
    expect(matchAcceptLanguage('de-DE,de;q=0.9,fr;q=0.8')).toBeNull();
    expect(matchAcceptLanguage('')).toBeNull();
    expect(matchAcceptLanguage(null)).toBeNull();
    expect(matchAcceptLanguage(undefined)).toBeNull();
  });

  it('treats a tag with no explicit q as q=1', () => {
    // pt has implicit q=1, beats en@0.5 -> proximity es.
    expect(matchAcceptLanguage('pt-BR,en;q=0.5')).toBe('es');
  });
});

describe('resolveLocaleFromAcceptLanguage (defaults to en)', () => {
  it('falls back to DEFAULT_LOCALE when nothing maps', () => {
    expect(resolveLocaleFromAcceptLanguage('de-DE,fr;q=0.8')).toBe(DEFAULT_LOCALE);
    expect(resolveLocaleFromAcceptLanguage(undefined)).toBe(DEFAULT_LOCALE);
    expect(resolveLocaleFromAcceptLanguage('')).toBe(DEFAULT_LOCALE);
  });

  it('routes a Brazilian header to Spanish, not the English default', () => {
    expect(resolveLocaleFromAcceptLanguage('pt-BR,pt;q=0.9,en;q=0.8')).toBe('es');
  });
});
