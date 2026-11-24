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

function rootReq(ua: string, extraHeaders: Record<string, string> = {}): GeoRequest {
  return { headers: { 'user-agent': ua, ...extraHeaders }, url: '/' } as unknown as GeoRequest;
}

// A real browser top-level navigation always sends Sec-Fetch-Mode: navigate.
const browserNav = (ua: string) => rootReq(ua, { 'sec-fetch-mode': 'navigate' });

function mockRes(): Response & { _status?: number; _location?: string; _headers: Record<string, string> } {
  const res = {
    _headers: {} as Record<string, string>,
    writeHead(status: number, headers: Record<string, string>) {
      (res as { _status?: number })._status = status;
      (res as { _location?: string })._location = headers?.Location;
      return res;
    },
    getHeader(name: string) {
      return res._headers[name.toLowerCase()];
    },
    setHeader(name: string, value: string) {
      res._headers[name.toLowerCase()] = value;
      return res;
    },
    end() { return res; },
  };
  return res as unknown as Response & { _status?: number; _location?: string; _headers: Record<string, string> };
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

  it('honours NEXT_LOCALE when boggle_language is absent', () => {
    const r = req({
      cookie: 'NEXT_LOCALE=ja',
      'accept-language': 'en-US',
    });
    expect(determineLocale(r)).toBe('ja');
  });

  it('prefers Accept-Language over an IL country header', () => {
    const r = req({
      'accept-language': 'en-GB,en;q=0.9',
      'cf-ipcountry': 'IL',
    });
    expect(determineLocale(r)).toBe('en');
  });

  it('uses country only when Accept-Language does not map', () => {
    const r = req({
      'accept-language': 'de-DE,fr;q=0.8',
      'x-country-code': 'IL',
    });
    expect(determineLocale(r)).toBe('he');
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
  });
});

describe('handleLocaleRedirect — root always rewrites (never 301)', () => {
  it('rewrites a real browser navigation to its detected locale (200, no redirect)', () => {
    const res = mockRes();
    // Hebrew browser → /he content served at root, never redirected.
    const r = { headers: { 'user-agent': 'Mozilla/5.0 (Windows) Chrome/120', 'sec-fetch-mode': 'navigate', 'accept-language': 'he-IL,he;q=0.9' }, url: '/' } as unknown as GeoRequest;
    const handled = handleLocaleRedirect(r, res, parsed());
    expect(handled).toBe(false);
    expect(r.url).toBe('/he');
    expect(res._status).toBeUndefined();
    expect((res as { _headers: Record<string, string> })._headers['vary']).toMatch(/Accept-Language/i);
    expect((res as { _headers: Record<string, string> })._headers['vary']).toMatch(/Cookie/i);
  });

  it('serves x-default /en to SEO crawlers (sitemap canonical)', () => {
    const res = mockRes();
    const r = rootReq('Googlebot/2.1 (+http://www.google.com/bot.html)');
    expect(handleLocaleRedirect(r, res, parsed())).toBe(false);
    expect(r.url).toBe('/en');
  });

  it('rewrites a non-browser / spoofing client to /en (no redirect)', () => {
    for (const ua of ['curl/8.0', '', 'Mozilla/5.0 (compatible; verifier)']) {
      const r = rootReq(ua);
      const res = mockRes();
      expect(handleLocaleRedirect(r, res, parsed())).toBe(false);
      expect(r.url).toBe('/en');
      expect(res._status).toBeUndefined();
    }
  });

  it('preserves the query string on the internal rewrite', () => {
    const res = mockRes();
    const r = rootReq('curl/8');
    expect(handleLocaleRedirect(r, res, { pathname: '/', search: '?ref=x' } as unknown as UrlWithParsedQuery)).toBe(false);
    expect(r.url).toBe('/en?ref=x');
  });

  it('honours explicit ?locale= query param (documented ?locale=he support for RTL/testing)', () => {
    const res = mockRes();
    const r = { headers: { 'user-agent': 'Mozilla/5.0', 'sec-fetch-mode': 'navigate' }, url: '/?locale=he' } as unknown as GeoRequest;
    const p = { pathname: '/', search: '?locale=he' } as unknown as UrlWithParsedQuery;
    expect(handleLocaleRedirect(r, res, p)).toBe(false);
    // After fix: should rewrite to /he?locale=he (query preserved)
    expect(r.url).toBe('/he?locale=he');
  });
});

describe('handleLocaleRedirect — root-served marker header', () => {
  // The [locale] layout reads x-lc-root-served to self-canonicalize the page
  // at `/` (lib/seo/hreflang.ts). The rewrite must tag the request with the
  // locale bundle it picked, or `/` keeps emitting /en's canonical + an
  // hreflang set with no entry for the URL actually served.
  it('tags a crawler/non-browser rewrite with x-lc-root-served: en', () => {
    const res = mockRes();
    const r = rootReq('Googlebot/2.1 (+http://www.google.com/bot.html)');
    expect(handleLocaleRedirect(r, res, parsed())).toBe(false);
    expect(r.url).toBe('/en');
    expect((r.headers as Record<string, string>)['x-lc-root-served']).toBe('en');
  });

  it('tags a browser-navigation rewrite with the negotiated locale', () => {
    const res = mockRes();
    const r = browserNav('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    (r.headers as Record<string, string>)['cookie'] = 'boggle_language=he';
    expect(handleLocaleRedirect(r, res, parsed())).toBe(false);
    expect(r.url).toBe('/he');
    expect((r.headers as Record<string, string>)['x-lc-root-served']).toBe('he');
  });

  it('overwrites a client-sent copy of the marker', () => {
    const res = mockRes();
    const r = rootReq('curl/8.0', { 'x-lc-root-served': 'ru' });
    expect(handleLocaleRedirect(r, res, parsed())).toBe(false);
    expect((r.headers as Record<string, string>)['x-lc-root-served']).toBe('en');
  });
});
