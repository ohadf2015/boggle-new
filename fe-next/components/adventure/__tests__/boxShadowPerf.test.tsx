/**
 * PF-H3: Verify no animated boxShadow in adventure components.
 * Animated boxShadow causes per-frame repaints. Use opacity on a static-shadow overlay instead.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';

const ADVENTURE_DIR = path.resolve(__dirname, '..');

// Match framer-motion animate={{ boxShadow: [...] }} pattern
const ANIMATED_BOX_SHADOW = /animate\s*[:=]\s*\{[^}]*boxShadow\s*:/s;

describe('PF-H3: No animated boxShadow in adventure components', () => {
  const files = glob.sync('**/*.{tsx,ts}', {
    cwd: ADVENTURE_DIR,
    ignore: ['__tests__/**', '**/*.test.*'],
    absolute: true,
  });

  it('finds adventure component files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map(f => [path.relative(ADVENTURE_DIR, f), f]))(
    '%s has no animated boxShadow',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath as string, 'utf-8');
      expect(content).not.toMatch(ANIMATED_BOX_SHADOW);
    }
  );
});
