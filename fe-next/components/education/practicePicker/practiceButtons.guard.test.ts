import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ui/button's outline/ghost/link variants carry dark: white ink, which wins on the sky page unless the edu-sky: variant overrides it.
describe('practice drills on the sky skin', () => {
  it.each(['WordTowerPractice.tsx', 'WordCraftPractice.tsx'])('Given %s, Then every ghost/outline/link Button sets sky ink and line', (file) => {
    const src = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
    const buttons = src.match(/<Button\b[^>]*variant="(?:ghost|outline|link)"[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(b).toContain('edu-sky:text-edu-ink');
      expect(b).toContain('edu-sky:border-edu-line');
    }
  });
});
