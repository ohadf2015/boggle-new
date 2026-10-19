/**
 * Landing PSI: @supabase/gotrue must not be a static import of the
 * EssentialProviders graph. Auth mounts immediately off-landing via
 * dynamic import(); landing waits for pointer/key.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const feRoot = join(__dirname, '..', '..');
const essential = join(feRoot, 'app', 'essential-providers.tsx');
const deferred = join(feRoot, 'app', 'deferredAuthProvider.tsx');
const authContext = join(feRoot, 'contexts', 'AuthContext.tsx');
const coin = join(feRoot, 'contexts', 'CoinContext.tsx');
const growth = join(feRoot, 'utils', 'growthTracking.ts');
const authFetch = join(feRoot, 'utils', 'authFetch.ts');

const exts = ['.ts', '.tsx', '.js', '.jsx'];

function resolveSpec(from: string, spec: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const base = spec.startsWith('@/')
    ? join(feRoot, spec.slice(2))
    : resolve(dirname(from), spec);
  const cands = [base, ...exts.map((e) => base + e), ...exts.map((e) => join(base, 'index' + e))];
  for (const c of cands) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function staticEdges(file: string): string[] {
  const src = stripComments(readFileSync(file, 'utf8'));
  const out: string[] = [];
  const re = /(?:import|export)\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const clause = m[1].trim();
    if (/^type\b/.test(clause)) continue;
    if (/^\{[^}]*\}$/.test(clause) && !clause.replace(/\btype\s+\w+/g, '').match(/[A-Za-z0-9_]/)) continue;
    out.push(m[2]);
  }
  const star = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = star.exec(src))) out.push(m[1]);
  return out;
}

function reachableFrom(start: string): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of staticEdges(file)) {
      const next = resolveSpec(file, spec);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

describe('landing gotrue defer', () => {
  it('does not statically import AuthProvider into EssentialProviders', () => {
    const src = readFileSync(essential, 'utf8');
    expect(src).not.toMatch(/from\s+['"]@\/contexts\/AuthContext['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/contexts\/AuthProvider['"]/);
    expect(src).toMatch(/DeferredAuthProvider/);
    expect(src).toMatch(/from\s+['"]\.\/deferredAuthProvider['"]/);
  });

  it('loads AuthProvider only through a non-preloaded dynamic import, armed by pointer not scroll', () => {
    const src = readFileSync(deferred, 'utf8');
    expect(src).toMatch(/import\(\s*(?:\/\*[\s\S]*?\*\/\s*)?['"]@\/contexts\/AuthProvider['"]\s*\)/);
    expect(src).toMatch(/webpackPrefetch:\s*false/);
    expect(src).toMatch(/webpackPreload:\s*false/);
    expect(src).toMatch(/pointerdown/);
    expect(src).toMatch(/keydown/);
    expect(src).not.toMatch(/['"]scroll['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/contexts\/AuthProvider['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
  });

  it('keeps useAuth free of the supabase hook barrel', () => {
    const src = readFileSync(authContext, 'utf8');
    expect(src).not.toMatch(/from\s+['"]\.\/auth['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    expect(src).toMatch(/export function useAuth/);
  });

  it('does not statically import @/lib/supabase from the landing provider graph', () => {
    const seen = reachableFrom(essential);
    const rel = [...seen].map((f) => f.slice(feRoot.length + 1));
    expect(rel).not.toContain('lib/supabase.ts');
    expect(rel).not.toContain('utils/supabase/client.ts');
    expect(rel).not.toContain('contexts/AuthProvider.tsx');
    for (const file of seen) {
      const src = stripComments(readFileSync(file, 'utf8'));
      // import type is erased. Only a value import puts @supabase/* in the chunk.
      expect(src, file).not.toMatch(/(?:import|export)\s+(?!type\b)[^;]*from\s+['"]@supabase\//);
    }
  });

  it('defers the other landing edges that used to pull the same client', () => {
    expect(readFileSync(coin, 'utf8')).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    expect(readFileSync(growth, 'utf8')).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    expect(readFileSync(authFetch, 'utf8')).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    expect(readFileSync(growth, 'utf8')).toMatch(/shouldDeferLandingGotrue/);
  });

  it('does not statically import the supabase client from the landing page or site chrome', () => {
    const home = join(feRoot, 'app', '[locale]', '(home)', 'HomeClient.tsx');
    const extras = join(feRoot, 'app', '[locale]', 'SiteExtras.tsx');
    const header = join(feRoot, 'components', 'Header.tsx');
    for (const start of [home, extras, essential]) {
      const seen = reachableFrom(start);
      for (const file of seen) {
        const src = stripComments(readFileSync(file, 'utf8'));
        expect(src, file).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
        expect(src, file).not.toMatch(/from\s+['"]@\/utils\/supabase\/client['"]/);
        expect(src, file).not.toMatch(/(?:import|export)\s+(?!type\b)[^;]*from\s+['"]@supabase\//);
      }
    }
    const headerSrc = readFileSync(header, 'utf8');
    expect(headerSrc).toMatch(/authEverOpened &&/);
    expect(headerSrc).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    const extrasSrc = readFileSync(extras, 'utf8');
    expect(extrasSrc).not.toMatch(/from\s+['"]@\/components\/auth\/GoogleOneTapInitializer['"]/);
    expect(extrasSrc).toMatch(/DeferredGoogleOneTap/);
    expect(extrasSrc).toMatch(/pointerdown/);
  });
});
