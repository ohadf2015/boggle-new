import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GUARD (source-grep, NOT behavioural): ad config must read NEXT_PUBLIC_* env vars
 * as `process.env.NEXT_PUBLIC_X` — NEVER `process.env?.NEXT_PUBLIC_X`.
 *
 * Why a grep and not a unit test: Next.js/webpack DefinePlugin inlines client env by
 * a LITERAL textual replace of `process.env.NEXT_PUBLIC_X`. The optional-chaining form
 * `process.env?.NEXT_PUBLIC_X` is a different AST node and is NOT replaced — so in the
 * browser bundle it reads the empty `process/browser` polyfill (`{}`) → undefined →
 * every ad gate silently fails in production. In Node (where these tests run) `process.env`
 * is a real object, so a behavioural test passes either way and CANNOT catch this. Only
 * scanning the source can. Regression on 2026-06-25: every web ad surface was dark because
 * all of lib/ads used `process.env?.` optional chaining.
 */
describe('ad config env inlining guard', () => {
  const adsDir = join(__dirname, '..');
  const files = readdirSync(adsDir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

  it('reads every NEXT_PUBLIC_* env var WITHOUT optional chaining (so DefinePlugin inlines it)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(join(adsDir, file), 'utf8');
      src.split('\n').forEach((line, i) => {
        if (/process\.env\?\.\s*NEXT_PUBLIC/.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, `process.env?.NEXT_PUBLIC_* breaks browser inlining — use process.env.NEXT_PUBLIC_*:\n${offenders.join('\n')}`).toEqual([]);
  });
});
