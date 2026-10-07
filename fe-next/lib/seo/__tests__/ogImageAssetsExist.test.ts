import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * GUARD (source-grep): every first-party image URL hard-coded in app/ metadata
 * (`https://www.lexiclash.live/<file>.jpg|png|webp` or `${BASE_URL}/<file>...`)
 * must exist in public/. A missing root-level asset does NOT 404 on prod — it is
 * served as the homepage HTML with a 1-year immutable cache, so og:image /
 * twitter:image silently break link previews. Regression 2026-10-07:
 * /lexiclash.jpg (never in public/) was the og:image on faq, profile, legal/*,
 * about, contact, blog, leaderboard, adventure and tools/word-solver.
 */
const FE_ROOT = join(__dirname, '..', '..', '..');
const APP_DIR = join(FE_ROOT, 'app');
const PUBLIC_DIR = join(FE_ROOT, 'public');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('hard-coded og/twitter image assets exist in public/', () => {
  it('every https://www.lexiclash.live/<asset> and ${BASE_URL}/<asset> image path is a real file', () => {
    const re = /(?:https:\/\/www\.lexiclash\.live|\$\{BASE_URL\})(\/[A-Za-z0-9_\-\/]+\.(?:jpe?g|png|webp))/g;
    const missing: string[] = [];
    for (const file of walk(APP_DIR)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(re)) {
        if (!existsSync(join(PUBLIC_DIR, m[1]))) missing.push(`${relative(FE_ROOT, file)}: ${m[1]}`);
      }
    }
    expect(missing, `Missing public/ assets referenced from app/:\n${missing.join('\n')}`).toEqual([]);
  });
});
