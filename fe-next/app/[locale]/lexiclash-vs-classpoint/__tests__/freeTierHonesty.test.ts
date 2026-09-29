import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-classpoint Basic Free 25/5Q honesty wiring', () => {
  it('wires ClassPointBasicFreeHonestyStrip and locks 25 / 5 Q + URLs', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/ClassPointBasicFreeHonestyStrip/);
    expect(page).toMatch(/Max 25 class size/);
    expect(page).toMatch(/5 Questions per PPT/);
    expect(page).toMatch(/3 Draggable objects/);
    expect(page).toMatch(/3 saved classes/);
    expect(page).toMatch(/classpoint\.io\/pricing/);
    expect(page).toMatch(/classpoint\.io\/schools-districts/);
    expect(page).toMatch(/https:\/\/www\.lexiclash\.live/);
    expect(page).not.toMatch(/https:\/\/([a-z.]*\.)?lexiclash\.com/);
    expect(page).toMatch(/Socrative Free 5 Quizzes|5 Quizzes \/ 1 Room \/ 50/);
    expect(page).toMatch(/#1187|Skip open #1187/);
  });

  it('JA/ES CTA i18n has LexiClash 50 only — no ClassPoint 25 / 5 Q copy', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsClassPoint"');
      expect(vs).toBeGreaterThan(-1);
      const ft = src.indexOf('"basicFree"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/Max 25|5 Questions|Draggable|3 saved/);
    }
  });
});
