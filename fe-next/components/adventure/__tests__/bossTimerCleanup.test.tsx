/**
 * PF-H8: Verify all setTimeout/setInterval calls in boss components are
 * stored in refs (enabling cleanup on unmount).
 *
 * Pattern caught: bare `setTimeout(() => ...)` not assigned to a ref.
 * Pattern allowed: `someRef.current = setTimeout(...)` or `const t = setTimeout(...)`
 *                   paired with cleanup in a useEffect return.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';

const ADVENTURE_DIR = path.resolve(__dirname, '..');

/**
 * Matches bare setTimeout/setInterval calls that are NOT assigned to anything.
 * Catches:   setTimeout(() => ..., 900);
 * Ignores:   ref.current = setTimeout(...)
 *            const t1 = setTimeout(...)
 */
const BARE_TIMER_RE = /(?<!\w\s*=\s*)(?<!\.current\s*=\s*)(?:setTimeout|setInterval)\s*\(/;

// Only check boss-related files
const BOSS_FILES = glob.sync('**/*[Bb]oss*.{tsx,ts}', {
  cwd: ADVENTURE_DIR,
  ignore: ['__tests__/**', '**/*.test.*'],
  absolute: true,
});

describe('PF-H8: Boss timer cleanup — no bare setTimeout/setInterval', () => {
  it.each(BOSS_FILES.map(f => [path.relative(ADVENTURE_DIR, f), f]))(
    '%s has no bare timer calls',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath as string, 'utf-8');
      const lines = content.split('\n');
      const violations: string[] = [];
      lines.forEach((line, i) => {
        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        if (BARE_TIMER_RE.test(line)) {
          violations.push(`  Line ${i + 1}: ${line.trim()}`);
        }
      });
      expect(violations).toEqual([]);
    }
  );
});
