import { describe, expect, it } from 'vitest';
import {
  HOLIDAY_LANDINGS,
  landingAlternates,
  landingFor,
  landingJsonLd,
  landingMetadata,
  landingSeason,
  landingUrl,
} from '../landing';

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('holiday landing registry', () => {
  it('has hanukkah in he+en and christmas in en/es/sv/ja/ru, one slug each', () => {
    const pairs = HOLIDAY_LANDINGS.map((p) => `${p.holiday}:${p.locale}`).sort();
    expect(pairs).toEqual(
      ['christmas:en', 'christmas:es', 'christmas:ja', 'christmas:ru', 'christmas:sv', 'hanukkah:en', 'hanukkah:he'].sort(),
    );
    expect(new Set(HOLIDAY_LANDINGS.map((p) => p.slug)).size).toBe(HOLIDAY_LANDINGS.length);
  });

  it('keeps every title under 61 chars and description under 161', () => {
    for (const p of HOLIDAY_LANDINGS) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(60);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(160);
    }
  });

  it('links only language versions of the same holiday in hreflang, with x-default en', () => {
    const he = landingFor('hanukkah', 'he')!;
    expect(landingAlternates(he)).toEqual({
      he: 'https://www.lexiclash.live/he/mischakim-lechanuka',
      en: 'https://www.lexiclash.live/en/hanukkah-word-game',
      'x-default': 'https://www.lexiclash.live/en/hanukkah-word-game',
    });
    const sv = landingFor('christmas', 'sv')!;
    const alt = landingAlternates(sv);
    expect(Object.keys(alt).sort()).toEqual(['en', 'es', 'ja', 'ru', 'sv', 'x-default']);
    expect(Object.values(alt).some((u) => u.includes('hanukkah'))).toBe(false);
  });
});

describe('landingSeason', () => {
  it('Given Dec 6 2026, When reading hanukkah, Then it is live with the 2026 window', () => {
    const s = landingSeason('hanukkah', 'he', at('2026-12-06'));
    expect(s.live).toBe(true);
    expect(s.window?.start).toBe('2026-12-04');
  });

  it('Given July 2027, When reading hanukkah, Then it is off with Dec 24 2027 next', () => {
    const s = landingSeason('hanukkah', 'en', at('2027-07-01'));
    expect(s.live).toBe(false);
    expect(s.window?.start).toBe('2027-12-24');
  });

  it('Given 2029 (no calendar data), When reading hanukkah, Then it is off with no window', () => {
    const s = landingSeason('hanukkah', 'en', at('2029-03-01'));
    expect(s).toEqual({ live: false, window: null });
  });

  it('Given Jan 5 2027, When reading es christmas, Then it is still live (Reyes window)', () => {
    expect(landingSeason('christmas', 'es', at('2027-01-05')).live).toBe(true);
    expect(landingSeason('christmas', 'en', at('2027-01-05')).live).toBe(false);
  });

  it('Given Feb 2027, When reading christmas, Then the next window is Dec 13 2027', () => {
    const s = landingSeason('christmas', 'sv', at('2027-02-01'));
    expect(s.live).toBe(false);
    expect(s.window?.start).toBe('2027-12-13');
  });
});

describe('landingMetadata', () => {
  it('indexes the page only in its own locale and canonicalises to it', () => {
    const p = landingFor('christmas', 'es')!;
    const own = landingMetadata(p, 'es');
    expect(own.robots).toEqual({ index: true, follow: true });
    expect(own.alternates?.canonical).toBe(landingUrl(p));
    expect(own.title).toBe(p.title);
    const other = landingMetadata(p, 'en');
    expect(other.robots).toEqual({ index: false, follow: true });
    expect(other.alternates?.canonical).toBe('https://www.lexiclash.live/es/juegos-de-navidad');
  });

  it('uses the holiday hero art as the OG image', () => {
    const p = landingFor('hanukkah', 'he')!;
    const og = landingMetadata(p, 'he').openGraph as { images: Array<{ url: string }>; locale: string };
    expect(og.images[0].url).toBe('https://www.lexiclash.live/holidays/hero-hanukkah.webp');
    expect(og.locale).toBe('he_IL');
  });
});

describe('landingJsonLd', () => {
  it('emits WebPage+VideoGame, FAQPage and an Event with the real calendar dates', () => {
    const p = landingFor('christmas', 'ru')!;
    const faqs = [{ q: 'Q?', a: 'A.' }];
    const graph = landingJsonLd(p, landingSeason('christmas', 'ru', at('2026-11-27')), faqs)['@graph'] as Array<Record<string, unknown>>;
    const types = graph.map((n) => n['@type']);
    expect(types).toEqual(expect.arrayContaining(['WebPage', 'VideoGame', 'FAQPage', 'Event']));
    const ev = graph.find((n) => n['@type'] === 'Event')!;
    expect(ev.startDate).toBe('2026-12-13');
    expect(ev.endDate).toBe('2027-01-07');
    expect(ev.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
  });

  it('omits the Event when no next window is known', () => {
    const p = landingFor('hanukkah', 'en')!;
    const graph = landingJsonLd(p, { live: false, window: null }, [])['@graph'] as Array<Record<string, unknown>>;
    expect(graph.some((n) => n['@type'] === 'Event')).toBe(false);
  });
});
