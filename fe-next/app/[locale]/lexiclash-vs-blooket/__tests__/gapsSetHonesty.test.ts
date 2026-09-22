/**
 * vs-Blooket page must surface the Gaps Set honesty foil and keep #1124 as a cite,
 * not a redo of Kahoot Unplugged product CTAs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = join(__dirname, '..', 'page.tsx');
const EN = join(__dirname, '..', '..', '..', '..', 'translations', 'en.js');
const HE = join(__dirname, '..', '..', '..', '..', 'translations', 'he.js');

describe('lexiclash-vs-blooket Gaps Set honesty foil', () => {
  const page = readFileSync(PAGE, 'utf8');
  const en = readFileSync(EN, 'utf8');
  const he = readFileSync(HE, 'utf8');

  it('mounts BlooketGapsSetHonestyStrip on the vs page', () => {
    expect(page).toContain('BlooketGapsSetHonestyStrip');
    expect(page).toContain('locale={locale}');
  });

  it('compares Incorrect% / Opportunities for Growth Gaps Set vs #1124 deep-link', () => {
    expect(page).toMatch(/Gaps Set/);
    expect(page).toMatch(/Incorrect%/);
    expect(page).toMatch(/Opportunities for Growth/);
    expect(page).toMatch(/#1124/);
    expect(page).toMatch(/deep-link/i);
  });

  it('does not re-implement Kahoot Unplugged #1124 CTA product surface', () => {
    expect(page).not.toContain('MissGapUnpluggedReteachLiveCta');
    expect(page).not.toContain('missGapUnpluggedReteachDeeplink');
    expect(page).not.toContain('kahoot.com/blog/2026/09/21');
  });

  it('ships en/he education.vsBlooket.gapsSet copy', () => {
    for (const src of [en, he]) {
      expect(src).toContain('"vsBlooket"');
      expect(src).toContain('"gapsSet"');
      expect(src).toMatch(/Gaps Set/);
      expect(src).toMatch(/#1124/);
    }
    expect(en).toMatch(/Incorrect%/);
    expect(en).toMatch(/Opportunities for Growth/);
    expect(he).toMatch(/Incorrect%/);
  });
});
