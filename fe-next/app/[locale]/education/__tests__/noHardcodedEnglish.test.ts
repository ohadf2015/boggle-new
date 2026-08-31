import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Education landing pages are server components: they read copy from a
 * per-locale `content.ts`, NOT from `t()`. That puts them outside the repo's
 * translation guard, which only sees statically-written `t()` keys — so an
 * English string typed straight into JSX here is invisible to every other check.
 *
 * That is exactly how an es-PE teacher arriving from Google (LogRocket,
 * 2026-08-31) got a Spanish headline sitting above English hero buttons.
 *
 * This test reads RAW SOURCE and fails on any JSX text node that looks like
 * prose. Fix by moving the string into the page's `content.ts` for all locales.
 */

const EDUCATION_DIR = path.join(process.cwd(), 'app', '[locale]', 'education');

function pageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...pageFiles(full));
    } else if (entry.name === 'page.tsx' || entry.name === 'PageClient.tsx') {
      out.push(full);
    }
  }
  return out;
}

/**
 * A JSX text node with two or more word-like runs is prose meant for a human.
 * One word ("Free", an icon, a number) is left alone — those are usually
 * symbols or already-localized fragments, and flagging them buys noise.
 *
 * KNOWN BLIND SPOT: it needs two runs of 3+ ASCII letters, so short-token copy
 * slips past — "2-by-2 practice", "1v1 duel", "Free · No ads" all read as one
 * word. This test passing is evidence against regression, NOT proof a page is
 * clean. Read new hero/CTA copy by eye as well.
 */
function prosyTextNodes(source: string): Array<{ line: number; text: string }> {
  const found: Array<{ line: number; text: string }> = [];
  source.split('\n').forEach((line, i) => {
    for (const raw of line.match(/>([^<>{}\n]+)</g) ?? []) {
      const text = raw.slice(1, -1).trim();
      const words = text.match(/[A-Za-z]{3,}/g) ?? [];
      if (words.length >= 2) found.push({ line: i + 1, text });
    }
  });
  return found;
}

describe('education landing pages carry no hardcoded English', () => {
  const files = pageFiles(EDUCATION_DIR);

  it('finds the pages it is meant to guard', () => {
    // A silently-empty scan would pass forever while covering nothing.
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [path.relative(EDUCATION_DIR, f), f]))(
    '%s renders copy from locale content, not literals',
    (_rel, file) => {
      const hits = prosyTextNodes(fs.readFileSync(file, 'utf8'));
      expect(
        hits.map((h) => `line ${h.line}: ${JSON.stringify(h.text)}`),
        'Move these strings into the page\'s content.ts (one entry per locale) and render them via `c.…`.'
      ).toEqual([]);
    }
  );

  it('would catch a regression', () => {
    // Proves the detector is not vacuous — a common failure mode for source scans.
    expect(prosyTextNodes('  <span>Run an ESL Game</span>')).toHaveLength(1);
    expect(prosyTextNodes('  <span>{c.heroCtas.primary}</span>')).toHaveLength(0);
  });
});
