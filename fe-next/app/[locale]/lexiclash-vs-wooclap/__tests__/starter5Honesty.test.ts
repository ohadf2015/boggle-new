import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-wooclap Starter 5 active / 30d honesty wiring', () => {
  it('wires WooclapStarterHonestyStrip and locks 5-active + URLs', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/WooclapStarterHonestyStrip/);
    expect(page).toMatch(/5 active questions/);
    expect(page).toMatch(/30 days/);
    expect(page).toMatch(/3\+ responses from unique participants/);
    expect(page).toMatch(/5 questions per month/);
    expect(page).toMatch(/docs\.wooclap\.com\/en\/articles\/14402104/);
    expect(page).toMatch(/wooclap\.com\/en\/pricing\/pricing-education/);
    expect(page).toMatch(/https:\/\/www\.lexiclash\.live/);
    expect(page).not.toMatch(/https:\/\/([a-z.]*\.)?lexiclash\.com/);
    expect(page).toMatch(/Unlimited participants/);
    expect(page).toMatch(/1000 participants/);
  });

  it('JA/ES CTA i18n has LexiClash free-classroom only — no Wooclap meter copy', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsWooclap"');
      expect(vs).toBeGreaterThan(-1);
      const ft = src.indexOf('"starter5"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/free|gratis|無料|classroom|clase|クラス/i);
      expect(line).not.toMatch(/5 active|30 days|1000 participants|14402104|3\+/);
    }
  });
});
