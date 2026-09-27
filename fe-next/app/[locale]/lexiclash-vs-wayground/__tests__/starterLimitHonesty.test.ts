/**
 * vs-Wayground page must surface the Starter 20-activity library honesty foil.
 * Distinct from Kahoot Go #1132 and Blooket Gaps #1125.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = join(__dirname, '..', 'page.tsx');
const EN = join(__dirname, '..', '..', '..', '..', 'translations', 'en.js');
const HE = join(__dirname, '..', '..', '..', '..', 'translations', 'he.js');

describe('lexiclash-vs-wayground Starter 20-activity honesty foil', () => {
  const page = readFileSync(PAGE, 'utf8');
  const en = readFileSync(EN, 'utf8');
  const he = readFileSync(HE, 'utf8');

  it('mounts WaygroundStarterLimitHonestyStrip on the vs page', () => {
    expect(page).toContain('WaygroundStarterLimitHonestyStrip');
    expect(page).toContain('locale={locale}');
  });

  it('cites Starter 20 activity limit Updated 12 May 2026 against LexiClash reteach Live', () => {
    expect(page).toMatch(/20 activity limit|Store up to 20 resources/i);
    expect(page).toMatch(/\b20\b/);
    expect(page).toMatch(/12 May 2026/);
    expect(page).toMatch(/Wayground|Quizizz/i);
    expect(page).toMatch(/reteach|Live/i);
    expect(page).toMatch(/help\.wayground\.com/);
  });

  it('does not re-implement Kahoot Go #1132 or Blooket Gaps #1125 product surfaces', () => {
    expect(page).not.toContain('KahootGoLimitHonestyStrip');
    expect(page).not.toContain('BlooketGapsSetHonestyStrip');
    expect(page).not.toContain('MissGapUnpluggedReteachLiveCta');
  });

  it('ships en/he education.vsWayground.starterLimit copy', () => {
    for (const src of [en, he]) {
      expect(src).toContain('"vsWayground"');
      expect(src).toContain('"starterLimit"');
      expect(src).toMatch(/\b20\b/);
    }
    expect(en).toMatch(/20 activity limit|Store up to 20 resources/i);
    expect(en).toMatch(/12 May 2026/);
    expect(he).toMatch(/20/);
  });
});
