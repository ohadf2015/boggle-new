import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-nearpod Silver free-tier honesty wiring', () => {
  it('wires NearpodSilverFreeTierHonestyStrip on the compare page', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/NearpodSilverFreeTierHonestyStrip/);
    expect(page).toMatch(/40 joins per lesson/);
    expect(page).toMatch(/300 MB/);
  });

  it('JA/ES CTA i18n has LexiClash 50 only — no competitor caps', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsNearpod"');
      expect(vs).toBeGreaterThan(-1);
      const ft = src.indexOf('"silverFree"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/\b40\b|300\s*MB|75|90|250/);
    }
  });
});
