import { describe, it, expect } from 'vitest';
import { determineLocale, type GeoRequest } from '../localeRedirect';

function req(headers: Record<string, string | undefined>): GeoRequest {
  return { headers, url: '/' } as unknown as GeoRequest;
}

describe('determineLocale', () => {
  it('honours an explicit boggle_language cookie above everything', () => {
    const r = req({
      cookie: 'boggle_language=he; other=1',
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
    });
    expect(determineLocale(r)).toBe('he');
  });

  it('ignores an unsupported cookie value and falls through to header', () => {
    const r = req({
      cookie: 'boggle_language=pt',
      'accept-language': 'en-US,en;q=0.9',
    });
    expect(determineLocale(r)).toBe('en');
  });

  // The reported bug: Brazilian browsers send pt first, en at lower priority.
  // They must land on Spanish, not English.
  it('routes a Brazilian Accept-Language to Spanish, not English', () => {
    const r = req({ 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' });
    expect(determineLocale(r)).toBe('es');
  });

  it('respects a genuine English-first preference over Portuguese', () => {
    const r = req({ 'accept-language': 'en;q=0.9,pt-BR;q=0.8' });
    expect(determineLocale(r)).toBe('en');
  });

  it('falls back to the default locale when nothing maps', () => {
    expect(determineLocale(req({ 'accept-language': 'de-DE,fr;q=0.8' }))).toBe('en');
    expect(determineLocale(req({}))).toBe('en');
  });
});
