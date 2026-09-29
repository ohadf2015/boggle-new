/**
 * vs-Wayground page must surface Basic/Starter 20 max activity storage honesty foil.
 * Distinct from Mentimeter #1183, Wooclap #1186, Nearpod #1169, Blooket #1166, Gimkit #1137.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = join(__dirname, '..', 'page.tsx');
const EN = join(__dirname, '..', '..', '..', '..', 'translations', 'en.js');
const HE = join(__dirname, '..', '..', '..', '..', 'translations', 'he.js');

describe('lexiclash-vs-wayground Basic 20 max honesty foil', () => {
  const page = readFileSync(PAGE, 'utf8');
  const en = readFileSync(EN, 'utf8');
  const he = readFileSync(HE, 'utf8');

  it('mounts WaygroundStarterLimitHonestyStrip on the vs page', () => {
    expect(page).toContain('WaygroundStarterLimitHonestyStrip');
    expect(page).toContain('locale={locale}');
  });

  it('cites plans 20 max + Starter help Updated 12 May 2026 against LexiClash free classroom vocab', () => {
    expect(page).toMatch(/20 max/i);
    expect(page).toMatch(/Store up to 20 resources/i);
    expect(page).toMatch(/12 May 2026/);
    expect(page).toMatch(/Wayground|Quizizz/i);
    expect(page).toMatch(/reteach|Live|classroom vocab/i);
    expect(page).toMatch(/help\.wayground\.com/);
    expect(page).toMatch(/wayground\.com\/home\/plans/);
    expect(page).toMatch(/lexiclash\.live/);
    expect(page).not.toMatch(/lexiclash\.com/);
  });

  it('does not re-implement Mentimeter/Wooclap/Nearpod/Blooket/Gimkit product surfaces', () => {
    expect(page).not.toContain('MentimeterFreeTierHonestyStrip');
    expect(page).not.toContain('WooclapStarterHonestyStrip');
    expect(page).not.toContain('NearpodSilverFreeTierHonestyStrip');
    expect(page).not.toContain('BlooketFreeTierHonestyStrip');
    expect(page).not.toContain('GimkitProExclusiveModesHonestyStrip');
    expect(page).not.toContain('KahootGoLimitHonestyStrip');
  });

  it('ships en/he education.vsWayground.starterLimit copy with dual cite keys', () => {
    for (const src of [en, he]) {
      expect(src).toContain('"vsWayground"');
      expect(src).toContain('"starterLimit"');
      expect(src).toContain('"citePlansLabel"');
      expect(src).toContain('"citeHelpLabel"');
      expect(src).toMatch(/\b20\b/);
    }
    expect(en).toMatch(/20 max/i);
    expect(en).toMatch(/12 May 2026/);
    expect(he).toMatch(/20/);
  });
});
