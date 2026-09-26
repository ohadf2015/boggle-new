/**
 * entryChrome.css hides the hidden global header's CLS spacer for the whole MP
 * route by keying on the MP layout's canonical <link> (MP_ROUTE_CANONICAL): Next
 * renders it in the SSR <head> and swaps it in the same commit that leaves the
 * route, so the rule can never outlive /multiplayer. That holds only while the
 * MP layout declares a canonical ending in /multiplayer for every locale, and no
 * other route declares one — pin both.
 */
import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MP_ROUTE_CANONICAL } from '../entryChrome';

vi.mock('@/translations/loadTranslation', () => ({
  loadTranslation: async () => ({
    seo: {
      locale: 'en_US',
      multiplayer: { title: 't', description: 'd', ogTitle: 'ot', ogDescription: 'od' },
    },
  }),
}));

import { generateMetadata } from '@/app/[locale]/multiplayer/layout';

const FE_ROOT = join(__dirname, '..', '..', '..', '..');
const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function routeSources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') continue;
    if (statSync(abs).isDirectory()) routeSources(abs, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(abs);
  }
  return out;
}

describe('MP route canonical — the route key of the chrome rule', () => {
  it('keys on a canonical link ending in /multiplayer', () => {
    expect(MP_ROUTE_CANONICAL).toBe("link[rel='canonical'][href$='/multiplayer']");
  });

  it.each(LOCALES)('%s: the MP layout declares that canonical', async (locale) => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(String(meta.alternates?.canonical ?? '')).toMatch(new RegExp(`/${locale}/multiplayer$`));
  });

  it('no other route declares a canonical ending in /multiplayer', () => {
    const declaring = routeSources(join(FE_ROOT, 'app'))
      .filter((file) => /canonical\s*:\s*[`'"][^`'"\n]*\/multiplayer[`'"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(FE_ROOT, file));
    expect(declaring).toEqual(['app/[locale]/multiplayer/layout.tsx']);
  });
});
