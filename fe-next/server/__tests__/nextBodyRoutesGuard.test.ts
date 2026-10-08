import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';
import { EXPRESS_API_ROUTES, shouldExpressParseJsonBody } from '../middleware';

/**
 * Guard: a Next.js App Router route that reads a request body and lives under
 * an EXPRESS_API_ROUTES prefix must not be pre-parsed by Express, or its
 * `request.json()` hangs forever on the drained stream (guest-session,
 * log-session and single-player/vote all hung on prod until 2026-10-07).
 *
 * Exception: routes an Express handler answers first, so the Next file
 * never runs in production. Add a path here only after you confirm an
 * Express route is mounted for it.
 *
 * /api/admin is out of scope: it has a large Express router plus its own
 * NEXT_ADMIN_BODY_ROUTES list, and many Next admin files are shadowed by it.
 */
const EXPRESS_SHADOWED = new Set([
  '/api/solve-grid', // backend/routes/solveGrid.ts
  '/api/dictionary/check', // backend/routes/dictionary.ts
  '/api/generate-word-hints', // backend/routes/aiHints.ts
]);

const APP_API = join(__dirname, '..', '..', 'app', 'api');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p);
    return name === 'route.ts' ? [p] : [];
  });
}

function toPath(file: string): string {
  const segs = relative(APP_API, file).split(sep).slice(0, -1);
  return '/api/' + segs.map((s) => (s.startsWith('[') ? 'x' : s)).join('/');
}

const BODY_METHOD = /export\s+(async\s+)?function\s+(POST|PUT|PATCH)\b|export\s+const\s+(POST|PUT|PATCH)\b/;
const READS_BODY = /\.(json|text|formData|arrayBuffer)\(\)/;

describe('Next.js body routes under Express prefixes', () => {
  it('are excluded from Express JSON pre-parsing', () => {
    const offenders = walk(APP_API)
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return BODY_METHOD.test(src) && READS_BODY.test(src);
      })
      .map(toPath)
      .filter((p) => !p.startsWith('/api/admin'))
      .filter((p) => EXPRESS_API_ROUTES.some((r) => p.startsWith(r)))
      .filter((p) => !EXPRESS_SHADOWED.has(p))
      .filter((p) => shouldExpressParseJsonBody(p));
    expect(offenders).toEqual([]);
  });
});
