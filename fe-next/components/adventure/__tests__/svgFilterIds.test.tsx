/**
 * PF-H5: Verify no hardcoded SVG filter IDs in adventure components.
 * Hardcoded IDs collide when multiple component instances render.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';

const ADVENTURE_DIR = path.resolve(__dirname, '..');

// Match hardcoded filter id= (not template literals with dynamic parts)
const HARDCODED_FILTER_ID = /<filter\s+id=["'][a-zA-Z0-9-]+["']/;

describe('PF-H5: No hardcoded SVG filter IDs in adventure components', () => {
  const files = glob.sync('**/*.{tsx,ts}', {
    cwd: ADVENTURE_DIR,
    ignore: ['__tests__/**', '**/*.test.*'],
    absolute: true,
  });

  it.each(files.map(f => [path.relative(ADVENTURE_DIR, f), f]))(
    '%s has no hardcoded SVG filter IDs',
    (_name, filePath) => {
      const content = fs.readFileSync(filePath as string, 'utf-8');
      expect(content).not.toMatch(HARDCODED_FILTER_ID);
    }
  );
});
