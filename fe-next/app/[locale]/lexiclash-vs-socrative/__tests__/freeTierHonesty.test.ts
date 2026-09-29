import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-socrative Free 5/1/50 honesty wiring', () => {
  it('wires SocrativeFreeTierHonestyStrip and locks 5 Quizzes / 1 Room / 50 + URLs', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/SocrativeFreeTierHonestyStrip/);
    expect(page).toMatch(/5 Quizzes/);
    expect(page).toMatch(/1 Room/);
    expect(page).toMatch(/50 student/);
    expect(page).toMatch(/socrative\.com\/pricing/);
    expect(page).toMatch(/help\.socrative\.com/);
    expect(page).toMatch(/https:\/\/www\.lexiclash\.live/);
    expect(page).not.toMatch(/https:\/\/([a-z.]*\.)?lexiclash\.com/);
    expect(page).toMatch(/Wayground Basic 20 max|20 max activity storage/);
    expect(page).toMatch(/#1187|Skip open #1187/);
  });

  it('JA/ES CTA i18n has LexiClash 50 only — no Socrative 5-quiz / 1-room copy', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsSocrative"');
      expect(vs).toBeGreaterThan(-1);
      const ft = src.indexOf('"freeTier"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/5 Quizzes|1 Room|30-day|8228775/);
    }
  });
});
