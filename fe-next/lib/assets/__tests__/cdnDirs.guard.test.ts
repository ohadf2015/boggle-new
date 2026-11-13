// getAssetUrl rewrites to the CDN bucket; a path in a folder the bucket never received renders as a broken image in prod only.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const uploaded = (() => {
  const src = readFileSync(path.join(ROOT, 'scripts/upload-static-cdn.mjs'), 'utf8');
  const m = src.match(/const DIRS = \[([^\]]*)\]/);
  return new Set([...(m?.[1].matchAll(/'([^']+)'/g) ?? [])].map((x) => x[1]).concat(['mascots']));
})();

describe('getAssetUrl only points at folders uploaded to the CDN', () => {
  it('every literal getAssetUrl path lives in an uploaded folder', () => {
    const pattern = 'getAssetUrl\\(\\s*[\'"`]/?[A-Za-z0-9_-]+/';
    let out = '';
    try {
      out = execFileSync('git', ['grep', '-nE', pattern, '--', '*.ts', '*.tsx', ':!**/__tests__/**'], { cwd: ROOT, encoding: 'utf8' });
    } catch (e) {
      if ((e as { status?: number }).status !== 1) throw e;
    }
    const bad = out.split('\n').filter(Boolean).filter((line) => {
      const dir = line.match(/getAssetUrl\(\s*['"`]\/?([A-Za-z0-9_-]+)\//)?.[1];
      return dir && !uploaded.has(dir);
    });
    expect(bad).toEqual([]);
  });
});
