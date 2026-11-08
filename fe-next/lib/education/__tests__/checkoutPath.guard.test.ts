import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/**
 * The Teacher Pro till has exactly one address. External probing could not
 * verify checkout because it guessed /api/checkout/teacher-pro (404) — the real
 * route is /api/subscription/checkout. This guard pins that answer so the path
 * can never silently drift between the API route and its client callers:
 * a renamed route folder or a caller posting to a copied literal fails here.
 */

const src = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

const ROUTE_FILE = 'app/api/subscription/checkout/route.ts';
// Derived from the route folder (app/ is the Next.js app-dir prefix, not part
// of the URL), so the assertion tracks a rename automatically.
const CHECKOUT_PATH = '/' + ROUTE_FILE.split('/').slice(1, -1).join('/');

/** Every production surface that POSTs the checkout. Tests and e2e may reference the path freely. */
const CALLER_FILES = [
  'hooks/useUpgradeCheckout.tsx',
  'lib/education/postTeacherProCheckout.ts',
  'components/teacher/PendingCheckoutBanner.tsx',
] as const;

const CODE_DIRS = ['app', 'lib', 'hooks', 'components', 'utils', 'contexts'];
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']);

function isTestFile(path: string): boolean {
  return path.includes('__tests__') || /\.(test|spec|guard)\.[tj]sx?$/.test(path);
}

function productionCodeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next') || entry === 'backend') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...productionCodeFiles(full));
    } else if (CODE_EXTENSIONS.has(extname(entry)) && !isTestFile(full)) {
      out.push(full);
    }
  }
  return out;
}

describe('Teacher Pro checkout path (external probes cannot see inside the app)', () => {
  it('serves the checkout API at the pinned route and exports POST', () => {
    expect(CHECKOUT_PATH).toBe('/api/subscription/checkout');
    expect(existsSync(join(process.cwd(), ROUTE_FILE))).toBe(true);
    const route = src(ROUTE_FILE);
    expect(route).toContain('export async function POST');
    expect(route).toContain('createCheckout');
  });

  it('every client caller posts to the same checkout path the route serves', () => {
    for (const rel of CALLER_FILES) {
      expect(src(rel), rel).toContain(`'${CHECKOUT_PATH}'`);
    }
  });

  it('no production code references the dead guessed path /api/checkout/*', () => {
    // The 2026-11 external revenue audit 404'd on /api/checkout/teacher-pro —
    // that prefix must never reappear in code, or the next probe reopens the
    // "checkout state unknown" question this guard exists to retire.
    const offenders: string[] = [];
    for (const dir of CODE_DIRS) {
      for (const file of productionCodeFiles(join(process.cwd(), dir))) {
        if (readFileSync(file, 'utf8').includes('/api/checkout')) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
