/**
 * spelling-bee-practice EN-only indexing gate (2026-05-30).
 * Body prose is hardcoded English in page.tsx; only meta is localized. Non-EN
 * routes must be noindex to avoid English-bodied near-duplicate pages under
 * /he|/es|/sv|/ja. EN stays indexable.
 */
import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../spelling-bee-practice/page';

async function robotsFor(locale: string) {
  const meta = await generateMetadata({ params: Promise.resolve({ locale }) } as never);
  return meta.robots as { index: boolean; follow: boolean };
}

describe('spelling-bee-practice robots gate', () => {
  it('EN is indexable', async () => {
    expect(await robotsFor('en')).toEqual({ index: true, follow: true });
  });

  it('non-EN locales are noindex (still followed)', async () => {
    for (const loc of ['he', 'es', 'sv', 'ja']) {
      expect(await robotsFor(loc), `locale ${loc}`).toEqual({ index: false, follow: true });
    }
  });
});
