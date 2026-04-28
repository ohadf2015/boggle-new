import { detectCrazyGamesLanguage } from '../cgLocaleDetect';

describe('detectCrazyGamesLanguage', () => {
  const origNav = global.navigator;
  const setNav = (language: string, languages: string[] = []) => {
    Object.defineProperty(global, 'navigator', {
      value: { language, languages },
      configurable: true,
    });
  };
  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: origNav,
      configurable: true,
    });
  });

  it('maps IL country code to he', () => {
    expect(detectCrazyGamesLanguage('IL')).toBe('he');
  });

  it('maps JP to ja, SE to sv, MX to es', () => {
    expect(detectCrazyGamesLanguage('JP')).toBe('ja');
    expect(detectCrazyGamesLanguage('SE')).toBe('sv');
    expect(detectCrazyGamesLanguage('MX')).toBe('es');
  });

  it('falls back to navigator.language primary subtag when country unmapped', () => {
    setNav('he-IL');
    expect(detectCrazyGamesLanguage('US')).toBe('he');
  });

  it('handles legacy iw tag for Hebrew', () => {
    setNav('iw-IL');
    expect(detectCrazyGamesLanguage(null)).toBe('he');
  });

  it('walks navigator.languages when primary is unsupported', () => {
    setNav('de-DE', ['de-DE', 'fr-FR', 'es-ES']);
    expect(detectCrazyGamesLanguage(null)).toBe('es');
  });

  it('returns null when no supported signal present', () => {
    setNav('de-DE', ['de-DE']);
    expect(detectCrazyGamesLanguage(null)).toBeNull();
  });

  it('country signal beats browser when both present', () => {
    setNav('en-US');
    expect(detectCrazyGamesLanguage('JP')).toBe('ja');
  });
});
