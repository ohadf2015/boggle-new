/**
 * vs-Kahoot page must surface the Go Free participant-limit honesty foil.
 * Does not redo Kahoot Unplugged #1124 product CTAs or reopen #1125/#1126/#1127/#1131.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = join(__dirname, '..', 'page.tsx');
const EN = join(__dirname, '..', '..', '..', '..', 'translations', 'en.js');
const HE = join(__dirname, '..', '..', '..', '..', 'translations', 'he.js');

describe('lexiclash-vs-kahoot Go Free limit honesty foil', () => {
  const page = readFileSync(PAGE, 'utf8');
  const en = readFileSync(EN, 'utf8');
  const he = readFileSync(HE, 'utf8');

  it('mounts KahootGoLimitHonestyStrip on the vs page', () => {
    expect(page).toContain('KahootGoLimitHonestyStrip');
    expect(page).toContain('locale={locale}');
  });

  it('cites plans table 40 vs FAQ 10 against LexiClash clear 50', () => {
    expect(page).toMatch(/Participant limit/);
    expect(page).toMatch(/\b40\b/);
    expect(page).toMatch(/\b10\b/);
    expect(page).toMatch(/Go Free|Kahoot! Go/i);
    expect(page).toMatch(/FAQ/);
    expect(page).toMatch(/\b50\b/);
    expect(page).toMatch(/kahoot\.com\/schools\/plans/);
  });

  it('does not re-implement Kahoot Unplugged #1124 CTA product surface', () => {
    expect(page).not.toContain('MissGapUnpluggedReteachLiveCta');
    expect(page).not.toContain('missGapUnpluggedReteachDeeplink');
    expect(page).not.toContain('BlooketGapsSetHonestyStrip');
    expect(page).not.toContain('kahoot.com/blog/2026/09/21');
  });

  it('ships en/he education.vsKahoot.goLimit copy', () => {
    for (const src of [en, he]) {
      expect(src).toContain('"vsKahoot"');
      expect(src).toContain('"goLimit"');
      expect(src).toMatch(/\b40\b/);
      expect(src).toMatch(/\b10\b/);
      expect(src).toMatch(/\b50\b/);
    }
    expect(en).toMatch(/Participant limit/);
    expect(en).toMatch(/What are the participant limits per game/);
    expect(he).toMatch(/Participant limit|מגבלת משתתפים/);
  });
});
