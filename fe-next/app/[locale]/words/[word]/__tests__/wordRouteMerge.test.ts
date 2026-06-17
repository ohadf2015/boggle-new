import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

/**
 * Route-merge fix (2026-06-17): /words/ had two conflicting sibling dynamic segments
 * ([word] + [n]-letter-words) → Next couldn't match /words/{x} → BOTH 404'd. Merged:
 * the [word] route now serves /words/{n}-letter-words too, delegating to the N-letter
 * view (moved to private _nletter/). This verifies the discrimination + robots.
 * Spec: docs/2026-06-17-adsense-thin-page-noindex-spec.md
 */
const meta = (locale: string, word: string) =>
  generateMetadata({ params: Promise.resolve({ locale, word }) });

describe('/words/[word] — N-letter-words delegation', () => {
  it('serves /words/3-letter-words as the N-letter content page (EN indexable)', async () => {
    const m = await meta('en', '3-letter-words');
    expect(String(m.title)).toMatch(/3-Letter Words/i);
    expect(m.robots).toMatchObject({ index: true });
  });

  it('noindexes the N-letter page on non-EN locales (English word list)', async () => {
    const m = await meta('he', '3-letter-words');
    expect(String(m.title)).toMatch(/3-Letter Words/i);
    expect(m.robots).toMatchObject({ index: false });
  });

  it('handles all valid lengths 3–8', async () => {
    for (const n of [3, 4, 5, 6, 7, 8]) {
      const m = await meta('en', `${n}-letter-words`);
      expect(String(m.title), `length ${n}`).toMatch(new RegExp(`${n}-Letter Words`, 'i'));
    }
  });

  it('an out-of-range length (9) is NOT treated as an N-letter page', async () => {
    const m = await meta('en', '9-letter-words');
    expect(String(m.title)).not.toMatch(/9-Letter Words/i);
  });
});

describe('/words/[word] — regular word pages (noindex by design)', () => {
  it('a real word renders the word page, noindexed', async () => {
    const m = await meta('en', 'care');
    expect(String(m.title)).toMatch(/CARE/);
    expect(m.robots).toMatchObject({ index: false });
  });

  it('an invalid word param is noindexed (not a leaking soft-404)', async () => {
    const m = await meta('en', 'x'); // length 1 → sanitizeWord null
    expect(m.robots).toMatchObject({ index: false });
  });
});
