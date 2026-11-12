import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const FE_ROOT = join(__dirname, '..', '..', '..');
const APP_DIR = join(FE_ROOT, 'app');
const EDU_ROUTE_ERROR = join(FE_ROOT, 'components', 'education', 'shell', 'EduRouteError.tsx');

/** Boundaries that may skip stale-deploy recovery, each with the reason. Paths relative to fe-next/. */
const ALLOWLIST: Record<string, string> = {};

function listBoundaries(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...listBoundaries(full));
    else if (/^(global-)?error\.(tsx|ts|jsx|js)$/.test(name)) found.push(full);
  }
  return found;
}

const usesSharedRecovery = (src: string): boolean =>
  /\buseStaleDeployRecovery\s*\(/.test(src) || /from ['"]@\/components\/education\/shell\/EduRouteError['"]/.test(src);

describe('every route error boundary recovers from a stale deploy', () => {
  const boundaries = listBoundaries(APP_DIR);

  it('finds the error boundaries (an empty scan is not a pass)', () => {
    expect(boundaries.length).toBeGreaterThanOrEqual(16);
  });

  it('each error.tsx / global-error.tsx uses useStaleDeployRecovery (directly or via EduRouteError) or is allowlisted with a reason', () => {
    const missing = boundaries
      .map((file) => relative(FE_ROOT, file))
      .filter((rel) => !ALLOWLIST[rel] && !usesSharedRecovery(readFileSync(join(FE_ROOT, rel), 'utf8')));
    expect(missing).toEqual([]);
  });

  it('EduRouteError itself runs the shared hook', () => {
    expect(readFileSync(EDU_ROUTE_ERROR, 'utf8')).toMatch(/\buseStaleDeployRecovery\s*\(/);
  });

  it('allowlist entries point at real files and carry a reason', () => {
    for (const [rel, reason] of Object.entries(ALLOWLIST)) {
      expect(existsSync(join(FE_ROOT, rel)), rel).toBe(true);
      expect(reason.trim().length, rel).toBeGreaterThan(10);
    }
  });

  it('no boundary clears the one-reload guard, which would let the next failure reload again', () => {
    const clearing = boundaries
      .map((file) => relative(FE_ROOT, file))
      .filter((rel) => /\bclearChunkRecoveryGuard\s*\(/.test(readFileSync(join(FE_ROOT, rel), 'utf8')));
    expect(clearing).toEqual([]);
  });
});
