import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TONE_FILL, toneStyle } from '../chrome';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../../../..', rel), 'utf8');

describe('academy on the sky skin', () => {
  it('Given the daytime map art, Then the hub and the page frame are sky pages, not dark islands', () => {
    for (const rel of ['components/student/academy/AcademyHubView.tsx', 'components/student/pages/AcademyPageFrame.tsx']) {
      expect(read(rel), rel).not.toMatch(/data-edu-theme="dark"/);
    }
  });

  it('Then the map has no night vignette and the ambient layer draws no night runes or fireflies', () => {
    expect(read('components/student/academy/AcademyMap.tsx')).not.toMatch(/rgba\(18,\s*13,\s*51/);
    const ambient = read('components/student/academy/AcademyAmbient.tsx');
    expect(ambient).not.toMatch(/<Rune\b/);
    expect(ambient).not.toMatch(/<Mote\b/);
  });

  it('Then panels are flat cards with a bottom lip: the night tone is the white surface, no gloss or gradient', () => {
    expect(TONE_FILL.night).toBe('var(--edu-surface)');
    for (const fill of Object.values(TONE_FILL)) expect(fill).not.toMatch(/gradient/);
    const style = toneStyle('night', { shadow: 4 });
    expect(style.boxShadow).toBe('0 4px 0 #101114');
    expect(style.backgroundColor).toBe('var(--edu-surface)');
  });
});
