import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  KNOWN_APP_ROOT_SEGMENTS,
  decideNextHandle,
  isSeoCrawler,
} from '../nextHandleGate';

const LOCALE_DIR = path.resolve(__dirname, '../../../app/[locale]');

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
});
