import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const SERVER_ONLY = /wordLists\/(catalog|rail|sitemapRoutes)|wordLists\.generated\.json|EducationRelatedLinks|EducationLandingTemplate/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe('word-list snapshot stays on the server', () => {
  it('no client module imports the catalog, its consumers, or the snapshot JSON', () => {
    const offenders = ['app', 'components', 'lib']
      .flatMap((d) => walk(join(ROOT, d)))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        return /^['"]use client['"]/m.test(src) && SERVER_ONLY.test(src);
      });
    expect(offenders).toEqual([]);
  });
});
