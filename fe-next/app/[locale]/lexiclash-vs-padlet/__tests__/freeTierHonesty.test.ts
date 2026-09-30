import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-padlet Neon Free 3-padlet / 20MB honesty wiring', () => {
  it('wires PadletNeonFreeHonestyStrip and locks Neon Free foil + URLs', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/PadletNeonFreeHonestyStrip/);
    expect(page).toMatch(/export const revalidate = 86400/);
    expect(page).toMatch(/3 (active )?padlets/i);
    expect(page).toMatch(/20MB/);
    expect(page).toMatch(/Platinum/);
    expect(page).toMatch(/500MB/);
    expect(page).toMatch(/padlet\.help/);
    expect(page).toMatch(/d7d009lugq-is-it-free/);
    expect(page).toMatch(/padlet\.com\/site\/subscriptions/);
    expect(page).toMatch(/https:\/\/www\.lexiclash\.live/);
    expect(page).not.toMatch(/https:\/\/([a-z.]*\.)?lexiclash\.com/);
    expect(page).toMatch(/#1204|Do NOT touch open #1204/);
  });

  it('JA/ES CTA i18n has LexiClash 50 / whole-class only — no Padlet 20MB / Platinum copy', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsPadlet"');
      expect(vs).toBeGreaterThan(-1);
      const nf = src.indexOf('"neonFree"', vs);
      const cta = src.indexOf('"cta":', nf);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/20MB|Platinum|Neon Free 3|3 active/);
    }
  });
});
