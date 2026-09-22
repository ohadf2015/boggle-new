import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/**
 * Live Chromium (2026-09-22): /en/daily SSR is "Loading Daily Challenge..." then
 * React #419 ("server could not finish this Suspense boundary") at ~1.5s, then
 * the hub paints. next/dynamic + loading fallback is what makes the document
 * body a loader — same lesson as multiplayer PageClient ssr:true for the lobby.
 * The hub must be a static client import so SSR emits quest cards, not a spinner.
 */
const pageSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../page.tsx'),
  'utf8',
);

describe('daily hub SSR is the quest landing, not a loader', () => {
  it('statically imports DailyRedirect (no next/dynamic loading fallback)', () => {
    expect(pageSrc).toMatch(
      /import\s+DailyRedirect\s+from\s+'@\/components\/daily\/DailyRedirect'/,
    );
    expect(pageSrc).not.toMatch(/from 'next\/dynamic'/);
    expect(pageSrc).not.toMatch(/retryImport\(\(\) => import\('@\/components\/daily\/DailyRedirect'\)\)/);
  });

  it('still wraps the hub in Suspense for useSearchParams', () => {
    expect(pageSrc).toMatch(/<Suspense[\s\S]*<DailyRedirect/);
  });
});
