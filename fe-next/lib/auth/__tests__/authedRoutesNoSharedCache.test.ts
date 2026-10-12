// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const API = join(__dirname, '..', '..', '..', 'app', 'api');

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === 'route.ts' ? [full] : [];
  });
}

const sharedCacheValue = (src: string): string[] =>
  (src.match(/['"`][^'"`\n]*max-?age[^'"`\n]*['"`]/g) ?? []).filter((v) => /\bpublic\b|s-maxage/.test(v));

// Optional auth: the shared header is only sent on the anonymous branch; personalized replies are private.
const ANONYMOUS_BRANCH_ONLY = new Set([join('connections', 'daily', '[date]', 'leaderboard', 'route.ts')]);

const authedRoutes = routeFiles(API)
  .map((file) => ({ route: relative(API, file), src: readFileSync(file, 'utf8') }))
  .filter(({ route }) => !ANONYMOUS_BRANCH_ONLY.has(route))
  .filter(({ src }) => /\b401\b|getAuthedUser\(|getBearerUser\(|auth\.getUser\(|requireAdmin|requireTeacher/.test(src));

describe('routes that authenticate the caller never let shared caches store the response', () => {
  it('finds the authenticated routes', () => {
    expect(authedRoutes.map((r) => r.route)).toContain(join('quests', 'feed', 'route.ts'));
  });

  it.each(authedRoutes.map((r) => [r.route, r.src]))('%s has no public / s-maxage Cache-Control', (_route, src) => {
    expect(sharedCacheValue(src)).toEqual([]);
  });
});
