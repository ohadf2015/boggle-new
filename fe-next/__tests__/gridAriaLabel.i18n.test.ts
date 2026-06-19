/**
 * Grid aria-label must be translated, not hardcoded English.
 *
 * GridComponent shipped `aria-label="Letter grid"` (hardcoded), which violates
 * the project translation-first rule and leaves Hebrew/JA/SV/ES screen-reader
 * users with an English label. This guards the t() key across all 5 locales
 * and prevents the hardcoded string from regressing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { en } from '../translations/en.js';
import { he } from '../translations/he.js';
import { sv } from '../translations/sv.js';
import { ja } from '../translations/ja.js';
import { es } from '../translations/es.js';

const locales: Record<string, Record<string, unknown>> = { en, he, sv, ja, es };

describe('grid.ariaLabel translation key', () => {
  it('exists and is a non-empty string in all 5 locales', () => {
    for (const [code, dict] of Object.entries(locales)) {
      const grid = dict.grid as Record<string, unknown> | undefined;
      expect(grid, `${code} missing grid namespace`).toBeDefined();
      expect(typeof grid!.ariaLabel, `${code} grid.ariaLabel type`).toBe('string');
      expect((grid!.ariaLabel as string).trim().length, `${code} grid.ariaLabel empty`).toBeGreaterThan(0);
    }
  });

  it('GridComponent uses the t() key and does not hardcode "Letter grid"', () => {
    const src = readFileSync(join(__dirname, '../components/GridComponent.tsx'), 'utf8');
    expect(src).toContain("t('grid.ariaLabel')");
    expect(src).not.toContain('aria-label="Letter grid"');
  });
});
