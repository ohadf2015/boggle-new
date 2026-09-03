import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES } from '@/lib/localeResolution';

/**
 * Brain Gym and Connections were added here after a mode-polish audit: both are
 * public mode landing pages whose server output is fully deterministic per
 * locale (static SEO copy + JSON-LD, no cookies/headers/searchParams/fetch), yet
 * both declared `force-dynamic` — so every request re-rendered them and no CDN
 * or ISR cache could hold them. They prerender on exactly the multiplayer
 * pattern below.
 *
 * `next build` reported 453 of 456 routes as ƒ (Dynamic) — only /robots.txt was
 * static. Every page, including the ones that declare `revalidate`, rendered per
 * request and shipped `cache-control: private, no-cache, no-store, max-age=0,
 * must-revalidate` (verified live against www.lexiclash.live on /en, /en/faq,
 * /en/tools, /en/blog/*).
 *
 * Cause: `[locale]` is a dynamic segment with no `generateStaticParams`, so Next
 * cannot prerender anything beneath it and every `revalidate` is inert.
 *
 * Multiplayer is the biggest prerenderable surface (1,032 sessions/14d, second
 * only to the landing page's 1,480 — which is NOT prerenderable, see the note in
 * (home)/page.tsx). It must enumerate EVERY shipped locale: a partial list
 * silently leaves the missing ones dynamic, which is what this test catches.
 */
describe('prerendered locale routes', () => {
  it.each([
    ['home', () => import('../(home)/page')],
    ['multiplayer', () => import('../multiplayer/page')],
    ['brain', () => import('../brain/page')],
    ['connections', () => import('../connections/page')],
  ])('%s enumerates every shipped locale', async (_name, load) => {
    const mod = (await load()) as { generateStaticParams?: () => Array<{ locale: string }> };

    expect(typeof mod.generateStaticParams).toBe('function');

    const params = mod.generateStaticParams!();
    expect(params.map((p) => p.locale).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it.each([
    ['home', () => import('../(home)/page')],
    ['multiplayer', () => import('../multiplayer/page')],
    ['brain', () => import('../brain/page')],
    ['connections', () => import('../connections/page')],
  ])('%s does not opt out of static rendering', async (_name, load) => {
    const mod = (await load()) as { dynamic?: string; revalidate?: number };

    // `force-dynamic` would defeat generateStaticParams entirely.
    expect(mod.dynamic).not.toBe('force-dynamic');
    expect(typeof mod.revalidate).toBe('number');
  });
});
