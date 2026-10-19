/**
 * A Next route file may export only HTTP handlers and route config. Anything else (a test
 * helper, a shared constant) fails `next build` with TS2344 in .next/types, and `tsc` alone
 * does NOT see it: one stray export kept production on an old build while every local check
 * was green. Export shared things from a lib module instead.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = new Set([
  'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS',
  'runtime', 'dynamic', 'dynamicParams', 'revalidate', 'fetchCache', 'preferredRegion',
  'maxDuration', 'generateStaticParams', 'config', 'default',
]);

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) routeFiles(p, out);
    else if (/^route\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function valueExports(src: string): string[] {
  const names: string[] = [];
  const decl = /^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (let m = decl.exec(src); m; m = decl.exec(src)) names.push(m[1]);
  const list = /^export\s*\{([^}]*)\}(?!\s*from)/gm;
  for (let m = list.exec(src); m; m = list.exec(src)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && !part.trim().startsWith('type ')) names.push(name);
    }
  }
  return names;
}

describe('route files export only handlers and route config', () => {
  const files = routeFiles(join(process.cwd(), 'app'));

  it('finds the routes', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no stray exports (those break `next build`, not `tsc`)', () => {
    const offenders = files.flatMap((f) =>
      valueExports(readFileSync(f, 'utf8'))
        .filter((n) => !ALLOWED.has(n))
        .map((n) => `${f.replace(process.cwd() + '/', '')}: export ${n}`),
    );
    expect(offenders).toEqual([]);
  });
});
