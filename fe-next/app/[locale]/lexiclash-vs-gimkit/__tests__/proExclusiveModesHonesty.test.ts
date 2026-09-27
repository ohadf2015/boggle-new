/**
 * vs-Gimkit page must surface the Basic Pro-Exclusive 5-player honesty foil.
 * Distinct from Wayground #1136, Kahoot Go #1132, and Blooket Gaps #1125.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PAGE = join(__dirname, '..', 'page.tsx');
const EN = join(__dirname, '..', '..', '..', '..', 'translations', 'en.js');
const HE = join(__dirname, '..', '..', '..', '..', 'translations', 'he.js');

describe('lexiclash-vs-gimkit Pro-Exclusive 5-player honesty foil', () => {
  const page = readFileSync(PAGE, 'utf8');
  const en = readFileSync(EN, 'utf8');
  const he = readFileSync(HE, 'utf8');

  it('mounts GimkitProExclusiveModesHonestyStrip on the vs page', () => {
    expect(page).toContain('GimkitProExclusiveModesHonestyStrip');
    expect(page).toContain('locale={locale}');
  });

  it('does not pass invalid locale prop to TopBackLink', () => {
    expect(page).toContain('TopBackLink');
    expect(page).not.toMatch(/<TopBackLink[^>]*\blocale=/);
  });

  it('cites Pro Exclusive 5-player Basic limit against LexiClash whole-class vocab', () => {
    expect(page).toMatch(/Pro Exclusive|Pro-Exclusive/i);
    expect(page).toMatch(/\b5\b/);
    expect(page).toMatch(/Gimkit Basic|Gimkit/i);
    expect(page).toMatch(/whole-class|vocab|50/i);
    expect(page).toMatch(/help\.gimkit\.com/);
    expect(page).toContain('player-maximums-18mbcz0');
    expect(page).toContain('gimkit-pro-faq-14h6d62');
    expect(page).toContain('lexiclash.live');
    expect(page).not.toContain('lexiclash.com');
  });

  it('does not re-implement Wayground #1136, Kahoot Go #1132, or Blooket Gaps #1125 surfaces', () => {
    expect(page).not.toContain('WaygroundStarterLimitHonestyStrip');
    expect(page).not.toContain('KahootGoLimitHonestyStrip');
    expect(page).not.toContain('BlooketGapsSetHonestyStrip');
    expect(page).not.toContain('MissGapUnpluggedReteachLiveCta');
  });

  it('ships en/he education.vsGimkit.proExclusiveModes copy', () => {
    for (const src of [en, he]) {
      expect(src).toContain('"vsGimkit"');
      expect(src).toContain('"proExclusiveModes"');
      expect(src).toMatch(/\b5\b/);
    }
    expect(en).toMatch(/Pro Exclusive|Pro-Exclusive/i);
    expect(en).toMatch(/5 players/i);
    expect(he).toMatch(/5/);
  });
});
