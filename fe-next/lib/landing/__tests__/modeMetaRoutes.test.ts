/**
 * Every MODE_META entry's `path` must resolve to a real route under
 * `app/[locale]/` — i.e. a directory chain ending in a `page.tsx`.
 *
 * This is the guard that would have caught `practice: { path: '/practice' }`
 * pointing at a route deleted by `54b07afd3` (`feat(ftue): retire the
 * /practice routes behind permanent redirects`). `/practice` still "works" —
 * it 301s to `/singleplayer` via `lib/seo/retiredPracticeRedirects.mjs` — but
 * a MODE_META consumer that builds a link from `meta.path` directly (see
 * `lib/email/welcomeModes.ts`, which reads `.path` for the welcome/
 * re-engagement email mode grid) would ship a needless redirect hop instead
 * of the real destination. MODE_META.path should always be the REAL route,
 * never a URL that only works by surviving a redirect.
 *
 * A path may carry a query string (e.g. `?autoStart=practice`) — only the
 * directory segment is resolved against the filesystem.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { MODE_META } from '../modeMeta';

const APP_LOCALE_DIR = join(__dirname, '..', '..', '..', 'app', '[locale]');

describe('MODE_META — every entry path resolves to a real app/[locale] route', () => {
  it.each(Object.keys(MODE_META))('mode "%s" path resolves to a route with a page.tsx', (key) => {
    const { path } = MODE_META[key];
    const routePath = path.split('?')[0];
    const segments = routePath.split('/').filter(Boolean);

    expect(segments.length, `${key} path "${path}" must have at least one segment`).toBeGreaterThan(0);

    const dir = join(APP_LOCALE_DIR, ...segments);
    expect(existsSync(dir), `${key} path "${path}" → app/[locale]${routePath} does not exist as a directory`).toBe(true);
    expect(
      existsSync(join(dir, 'page.tsx')),
      `${key} path "${path}" → app/[locale]${routePath}/page.tsx does not exist`,
    ).toBe(true);
  });
});
