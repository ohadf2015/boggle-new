import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

// Read as source: happy-dom drops color-mix() from inline styles, so a render cannot see these shades.
const src = fs.readFileSync(path.resolve(__dirname, '../AcademyScene.tsx'), 'utf8');

describe('AcademyScene on the sky page', () => {
  it('shades its dim, vignette and floor from the page token, not fixed night navy', () => {
    expect(src).not.toMatch(/rgba\(1[0-4],\s*1[0-4],\s*(2[89]|3[0-4])/);
    expect(src.match(/color-mix\(in srgb, var\(--edu-page\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
