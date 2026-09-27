import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

/**
 * Live Chromium (2026-09-22): /en/daily SSR is "Loading Daily Challenge..." then
 * React #419 ("server could not finish this Suspense boundary") at ~1.5s, then
 * the hub paints. next/dynamic + loading fallback is what makes the document
 * body a loader — same lesson as multiplayer PageClient ssr:true for the lobby.
 *
 * Round-2: static-importing DailyRedirect was not enough. DailyRedirect and
 * DailyChallengeLanding both call useSearchParams; wrapping the hub in
 * <Suspense fallback={<PageLoader />}> still SSRs the spinner. Isolate those
 * hooks behind nested <Suspense fallback={null}> so START QUEST is in the HTML.
 */
const dir = dirname(fileURLToPath(import.meta.url));
const pageSrc = readFileSync(join(dir, '../page.tsx'), 'utf8');
const redirectSrc = readFileSync(
  join(dir, '../../../../components/daily/DailyRedirect.tsx'),
  'utf8',
);
const landingSrc = readFileSync(
  join(dir, '../../../../components/daily/DailyChallengeLanding.tsx'),
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

  it('does not wrap a useSearchParams consumer in the page-level daily loader Suspense', () => {
    // Fails if someone puts LoadingFallback / PageLoader back around DailyRedirect.
    const pageFn = pageSrc.split(/export default async function DailyChallengePage/)[1] ?? '';
    expect(pageFn).not.toMatch(/LoadingFallback/);
    expect(pageFn).not.toMatch(/PageLoader/);
    expect(pageFn).not.toMatch(/<Suspense/);
    expect(pageFn).toMatch(/<DailyRedirect\s*\/>/);
  });

  it('isolates DailyRedirect useSearchParams behind nested empty Suspense', () => {
    expect(redirectSrc).toMatch(/<Suspense\s+fallback=\{null\}>/);
    const body = redirectSrc.split(/export default function DailyRedirect/)[1] ?? '';
    expect(body).not.toMatch(/useDailyRivalChallenge\s*\(/);
    expect(redirectSrc).toMatch(/useDailyRivalChallenge\s*\(/);
  });

  it('isolates DailyChallengeLanding useSearchParams behind nested empty Suspense', () => {
    expect(landingSrc).toMatch(/<Suspense\s+fallback=\{null\}>/);
    const body = landingSrc.split(/export function DailyChallengeLanding/)[1] ?? '';
    expect(body).not.toMatch(/useSearchParams\s*\(/);
    expect(landingSrc).toMatch(/useSearchParams\s*\(/);
  });
});
