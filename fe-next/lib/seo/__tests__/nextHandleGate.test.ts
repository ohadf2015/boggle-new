import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  KNOWN_APP_ROOT_SEGMENTS,
  decideNextHandle,
  isSeoCrawler,
} from '../nextHandleGate';
import { GAME_ROUTE_ALIASES } from '../gameRouteAliases.mjs';
import { RETIRED_PRACTICE_REDIRECTS } from '../retiredPracticeRedirects.mjs';
import { SCHOOL_ROUTE_ALIASES } from '../schoolRouteAliases.mjs';

const LOCALE_DIR = path.resolve(__dirname, '../../../app/[locale]');
const NEXT_CONFIG = path.resolve(__dirname, '../../../next.config.mjs');

function staticRedirectSources(): string[] {
  const config = fs.readFileSync(NEXT_CONFIG, 'utf8');
  const start = config.indexOf('async redirects()');
  const end = config.indexOf('\n  async ', start + 1);
  const redirects = config.slice(start, end === -1 ? undefined : end);
  const inline = [...redirects.matchAll(/source:\s*'([^']+)'/g)].map((m) => m[1]);
  const imported = [...GAME_ROUTE_ALIASES, ...RETIRED_PRACTICE_REDIRECTS, ...SCHOOL_ROUTE_ALIASES].map(
    (r: { source: string }) => r.source,
  );
  return [...inline, ...imported].filter((s) => !s.includes('(?'));
}

function samplePath(source: string): string {
  return source.replace(/:locale\([^)]*\)/g, 'es').replace(/:\w+[+*]?/g, 'x');
}

describe('decideNextHandle', () => {
  it('passes locale homepages and known SEO/game routes', () => {
    expect(decideNextHandle('/en')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/he/blog')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/en/education/boggle-for-kids')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/blog')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/singleplayer')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/_next/static/chunk.js')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/favicon.ico')).toEqual({ action: 'pass' });
  });

  it('drops scanner probes before App Router (same family as proxy PROBE_RE)', () => {
    expect(decideNextHandle('/.env')).toEqual({ action: 'drop', reason: 'probe' });
    expect(decideNextHandle('/wp-admin/install.php')).toEqual({ action: 'drop', reason: 'probe' });
    expect(decideNextHandle('/xmlrpc.php')).toEqual({ action: 'drop', reason: 'probe' });
  });

  it('drops unknown first segments instead of rewriting them into /{locale}/…', () => {
    expect(decideNextHandle('/not-a-real-page')).toEqual({
      action: 'drop',
      reason: 'unknown-segment',
    });
    expect(decideNextHandle('/en/not-a-real-page')).toEqual({
      action: 'drop',
      reason: 'unknown-segment',
    });
    expect(decideNextHandle('/product/12345')).toEqual({
      action: 'drop',
      reason: 'unknown-segment',
    });
  });

  it('drops SEO crawlers on noindex high-cardinality invite URLs, keeps social unfurl + humans', () => {
    expect(decideNextHandle('/en/join/AB12', 'Mozilla/5.0')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/en/join/AB12', 'WhatsApp/2.0')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/en/join/AB12', 'Googlebot/2.1')).toEqual({
      action: 'drop',
      reason: 'cardinality',
    });
    expect(decideNextHandle('/en/join', 'Googlebot/2.1')).toEqual({ action: 'pass' });
  });

  it('does not treat social unfurlers as SEO crawlers', () => {
    expect(isSeoCrawler('facebookexternalhit/1.1')).toBe(false);
    expect(isSeoCrawler('Googlebot/2.1')).toBe(true);
  });

  it('KNOWN_APP_ROOT_SEGMENTS covers every app/[locale] URL segment', () => {
    const names = fs
      .readdirSync(LOCALE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((n) => !n.startsWith('(') && n !== '__tests__');
    const missing = names.filter((n) => !KNOWN_APP_ROOT_SEGMENTS.has(n));
    expect(missing).toEqual([]);
  });

  it('passes every static next.config redirect source so the redirect can run', () => {
    const sources = staticRedirectSources();
    expect(sources).toContain('/es/scrabble');
    const dropped = sources.map(samplePath).filter((p) => decideNextHandle(p).action === 'drop');
    expect(dropped).toEqual([]);
  });

  it('still drops unknown slugs next to the redirect-only ones', () => {
    expect(decideNextHandle('/es/scrabble-gratis').action).toBe('drop');
  });

  it('308s dotted non-locale prefixes when the rest is a real page', () => {
    expect(decideNextHandle('/sitemap.xml/online-word-games-with-friends')).toEqual({
      action: 'redirect',
      location: '/en/online-word-games-with-friends',
    });
    expect(decideNextHandle('/sitemap.xml/education/sight-words-practice')).toEqual({
      action: 'redirect',
      location: '/en/education/sight-words-practice',
    });
    expect(decideNextHandle('/robots.txt/blog/')).toEqual({
      action: 'redirect',
      location: '/en/blog',
    });
  });

  it('404s dotted non-locale prefixes when the rest is not a real page', () => {
    expect(decideNextHandle('/foo.php/x')).toEqual({
      action: 'drop',
      reason: 'dotted-misroute',
    });
    expect(decideNextHandle('/sitemap.xml/not-a-page')).toEqual({
      action: 'drop',
      reason: 'dotted-misroute',
    });
    expect(decideNextHandle('/sitemap.xml/blog/../../evil')).toEqual({
      action: 'drop',
      reason: 'dotted-misroute',
    });
  });

  it('still passes bare sitemap/robots/public files and .well-known', () => {
    expect(decideNextHandle('/sitemap.xml')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/robots.txt')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/llms.txt')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/.well-known/apple-app-site-association')).toEqual({ action: 'pass' });
    expect(decideNextHandle('/en/online-word-games-with-friends')).toEqual({ action: 'pass' });
  });

  it('proxy and the custom server 308 before Next handle, and leave /sitemap.xml alone', () => {
    const proxy = fs.readFileSync(path.resolve(__dirname, '../../../proxy.ts'), 'utf8');
    const server = fs.readFileSync(path.resolve(__dirname, '../../../server/index.ts'), 'utf8');
    expect(proxy).toMatch(/gate\.action === 'redirect'[\s\S]{0,180}308/);
    expect(server).toMatch(/gate\.action === 'redirect'[\s\S]{0,240}res\.status\(308\)/);
    expect(server).toMatch(/app\.get\('\/sitemap\.xml'/);
  });
});
