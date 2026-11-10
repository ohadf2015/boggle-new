/**
 * Admin pages are Hebrew-only (proxy redirects every other locale), and `t(key, 'English')`
 * silently shows the English fallback when a key is missing. Every literal `admin.*` key the
 * admin sources ask for must therefore exist in he.js.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { he } from '../../../translations/he';

const ROOT = path.resolve(__dirname, '../../..');
const DIRS = ['components/admin', 'app/[locale]/admin', 'lib/admin'];
const FILES = ['hooks/useAdminDashboard.ts', 'hooks/useOverviewPulse.ts'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

const KEY = /\bt\(\s*(['"])(admin\.[\w.]+)\1/g;
const has = (key: string) => key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), he) !== undefined;

describe('admin Hebrew catalogue', () => {
  it('has a Hebrew string for every literal admin key the admin UI asks for', () => {
    const sources = [...DIRS.flatMap((d) => walk(path.join(ROOT, d))), ...FILES.map((f) => path.join(ROOT, f))];
    const missing = new Set<string>();
    for (const file of sources) {
      for (const m of readFileSync(file, 'utf8').matchAll(KEY)) if (!has(m[2])) missing.add(m[2]);
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('keeps every locale file self-contained', () => {
    // Server code and backend tests load these with a synchronous require(); a sibling import
    // makes that throw and every translation lookup returns undefined.
    for (const lang of ['en', 'he', 'es', 'sv', 'ja', 'ru']) {
      const source = readFileSync(path.join(ROOT, 'translations', `${lang}.js`), 'utf8');
      expect(source.match(/^\s*import\s/m), `${lang}.js must not import`).toBeNull();
    }
  });
});
