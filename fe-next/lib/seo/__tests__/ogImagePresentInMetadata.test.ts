import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { OG_IMAGE_BY_LOCALE, defaultOgImages, defaultOgImageUrl } from '../defaultOgImage';

/**
 * GUARD (source-grep): Next.js merges metadata shallowly, so a page/layout that
 * sets `openGraph: {...}` or `twitter: {...}` without `images` drops the root
 * layout's share image entirely. Regression 2026-10-07: guides, rules, glossary,
 * tools, words, anagram, daily archive and custom pages had no og:image on prod.
 * Every app/ file that declares openGraph must also declare images.
 */
const FE_ROOT = join(__dirname, '..', '..', '..');
const APP_DIR = join(FE_ROOT, 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '__tests__') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('page-level openGraph metadata keeps a share image', () => {
  it('every app/ file with openGraph also sets images', () => {
    const offenders: string[] = [];
    for (const file of walk(APP_DIR)) {
      const src = readFileSync(file, 'utf8');
      if (/openGraph\s*:\s*\{/.test(src) && !/\bimages\b/.test(src)) offenders.push(relative(FE_ROOT, file));
    }
    expect(offenders, `openGraph without images (no og:image will ship):\n${offenders.join('\n')}`).toEqual([]);
  });

  it('default share images exist in public/ and fall back to English', () => {
    for (const file of Object.values(OG_IMAGE_BY_LOCALE)) {
      expect(existsSync(join(FE_ROOT, 'public', file)), file).toBe(true);
    }
    expect(defaultOgImageUrl('he')).toBe('https://www.lexiclash.live/og-image-he.webp');
    expect(defaultOgImageUrl('ru')).toBe('https://www.lexiclash.live/og-image-en.webp');
    expect(defaultOgImageUrl(undefined)).toBe('https://www.lexiclash.live/og-image-en.webp');
    expect(defaultOgImages('sv')[0]).toMatchObject({ width: 1200, height: 630 });
  });
});
