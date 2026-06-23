import { describe, it, expect, vi } from 'vitest';
import {
  determineLocale,
  isNonBrowserClient,
  handleLocaleRedirect,
  type GeoRequest,
} from '../localeRedirect';
import type { Response } from 'express';
import type { UrlWithParsedQuery } from 'url';

function req(headers: Record<string, string | undefined>): GeoRequest {
  return { headers, url: '/' } as unknown as GeoRequest;
}

function rootReq(ua: string): GeoRequest {
  return { headers: { 'user-agent': ua }, url: '/' } as unknown as GeoRequest;
}

function mockRes(): Response & { _status?: number; _location?: string } {
  const res = {
    writeHead(status: number, headers: Record<string, string>) {
      (res as { _status?: number })._status = status;
      (res as { _location?: string })._location = headers?.Location;
      return res;
    },
    end() { return res; },
  };
  return res as unknown as Response & { _status?: number; _location?: string };
}

const parsed = (): UrlWithParsedQuery => ({ pathname: '/', search: '' } as unknown as UrlWithParsedQuery);

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

describe('isNonBrowserClient', () => {
  it('treats real browser UAs (contain Mozilla) as browsers', () => {
    expect(isNonBrowserClient('Mozilla/5.0 (Macintosh) AppleWebKit Chrome/120 Safari')).toBe(false);
    expect(isNonBrowserClient('Mozilla/5.0 (iPhone) Safari')).toBe(false);
  });

  it('treats empty / library / verifier UAs as non-browser clients', () => {
    expect(isNonBrowserClient('')).toBe(true);
    expect(isNonBrowserClient('curl/8.0')).toBe(true);
    expect(isNonBrowserClient('python-requests/2.31')).toBe(true);
    expect(isNonBrowserClient('Go-http-client/2.0')).toBe(true);
    expect(isNonBrowserClient('Monetag-Verifier/1.0')).toBe(true);
  });
});

describe('handleLocaleRedirect — ownership verifiers must NOT be redirected', () => {
  it('301-redirects a real browser at root (locale-aware)', () => {
    const res = mockRes();
    const handled = handleLocaleRedirect(rootReq('Mozilla/5.0 (Windows) Chrome/120'), res, parsed());
    expect(handled).toBe(true);
    expect(res._status).toBe(301);
  });

  it('rewrites (serves 200 content, no redirect) for a non-browser verifier so it reads the meta', () => {
    const req2 = rootReq('Monetag-Verifier/1.0');
    const res = mockRes();
    const handled = handleLocaleRedirect(req2, res, parsed());
    expect(handled).toBe(false);          // continues to Next → 200 HTML with the meta
    expect(req2.url).toBe('/en');          // internally rewritten to default locale
    expect(res._status).toBeUndefined();   // never redirected
  });

  it('rewrites for an empty UA (typical verification crawler)', () => {
    const req2 = rootReq('');
    const res = mockRes();
    expect(handleLocaleRedirect(req2, res, parsed())).toBe(false);
    expect(req2.url).toBe('/en');
  });
});
