import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('lexiclash-vs-peardeck Teacher Free named-response honesty wiring', () => {
  it('wires PearDeckTeacherFreeHonestyStrip and locks named-response foil + URLs', () => {
    const page = readFileSync(join(__dirname, '../page.tsx'), 'utf8');
    expect(page).toMatch(/PearDeckTeacherFreeHonestyStrip/);
    expect(page).toMatch(/export const revalidate = 86400/);
    expect(page).toMatch(/anonymous|anonymously/);
    expect(page).toMatch(/spreadsheet/);
    expect(page).toMatch(/Flashcard Factory/);
    expect(page).toMatch(/Teacher Dashboard|Teacher Premium/);
    expect(page).toMatch(/Drawing/);
    expect(page).toMatch(/Draggable/);
    expect(page).toMatch(/Reflect & Review|Reflect &amp; Review/);
    expect(page).toMatch(/Teacher Feedback/);
    expect(page).toMatch(/classroom roster|named feedback/i);
    expect(page).toMatch(/peardeck\.com\/pricing/);
    expect(page).toMatch(/handling-inappropriate-responses/);
    expect(page).toMatch(/https:\/\/www\.lexiclash\.live/);
    expect(page).not.toMatch(/https:\/\/([a-z.]*\.)?lexiclash\.com/);
    expect(page).toMatch(/#1204|Do NOT touch open #1204/);
  });

  it('JA/ES CTA i18n has LexiClash 50 / roster only — no Pear Deck Premium dashboard copy', () => {
    for (const loc of ['ja', 'es']) {
      const src = readFileSync(
        join(__dirname, `../../../../translations/${loc}.js`),
        'utf8',
      );
      const vs = src.indexOf('"vsPearDeck"');
      expect(vs).toBeGreaterThan(-1);
      const ft = src.indexOf('"teacherFree"', vs);
      const cta = src.indexOf('"cta":', ft);
      const line = src.slice(cta, src.indexOf('\n', cta));
      expect(line).toMatch(/50/);
      expect(line).not.toMatch(/spreadsheet|Flashcard Factory|Teacher Dashboard|Drawing|Draggable|Reflect/);
    }
  });
});
