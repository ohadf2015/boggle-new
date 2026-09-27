import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GlobalBottomNav is rendered directly by app/[locale]/layout.tsx, so its hooks
 * apply to EVERY route under `[locale]`. It called `useSearchParams()`, which
 * opts a route out of static rendering — and with `generateStaticParams` present
 * that becomes a hard build failure:
 *
 *   ⨯ useSearchParams() should be wrapped in a suspense boundary at page
 *     "/[locale]/multiplayer"
 *   Error occurred prerendering page "/en/multiplayer"
 *
 * That single hook is why `next build` reported 453 of 456 routes as ƒ (Dynamic)
 * and production served `cache-control: no-store` on every page, including the
 * `revalidate = 86400` SEO pages. The search params were never read during
 * render — only inside the incoming-message toast callback, through a ref — so
 * the hook was pure cost.
 *
 * A source assertion rather than a render test: the failure mode is a *build*
 * property (does this component force dynamic rendering), which no amount of
 * jsdom rendering can observe.
 */
describe('GlobalBottomNav static-rendering compatibility', () => {
  const raw = readFileSync(
    join(process.cwd(), 'components/GlobalBottomNav.tsx'),
    'utf-8'
  );
  // Comments in that file name the hook to explain why it is absent — strip
  // them, or this test flags its own documentation.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('does not call useSearchParams', () => {
    expect(source).not.toMatch(/useSearchParams\s*\(/);
  });

  it('does not import useSearchParams from next/navigation', () => {
    const navImport = source.match(/import\s*\{[^}]*\}\s*from\s*'next\/navigation'/);
    expect(navImport?.[0]).toBeDefined();
    expect(navImport![0]).not.toContain('useSearchParams');
  });
});
