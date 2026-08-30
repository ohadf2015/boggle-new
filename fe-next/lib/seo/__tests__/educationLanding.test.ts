import { describe, it, expect } from 'vitest';
import {
  EDUCATION_LOCALES,
  EDUCATION_BASE_URL,
  buildEducationLandingMetadata,
  buildEducationLandingJsonLd,
  type EducationLandingContent,
} from '../educationLanding';

/**
 * Fixture mirrors the shape a real page's content.ts exports, but with
 * locale-distinct values so we can assert nothing leaks English into a
 * non-English page (the defect the current per-page copies all share).
 */
function content(overrides: Partial<EducationLandingContent> = {}): EducationLandingContent {
  return {
    accent: 'lime',
    meta: {
      title: 'TITLE_HE',
      description: 'DESC_HE',
      ogTitle: 'OG_HE',
      ogDescription: 'OGDESC_HE',
      twitterDescription: 'TW_HE',
      keywords: ['מילים', 'כיתה'],
    },
    hero: {
      facts: ['F1_HE', 'F2_HE'],
      h1: { part1: 'A_HE', highlight: 'B_HE', part2: 'C_HE' },
      subtitle: 'SUB_HE',
      primaryCta: { label: 'P_HE', sublabel: 'PS_HE', href: '/education/classroom-game' },
      secondaryCta: { label: 'S_HE', sublabel: 'SS_HE', href: '/education' },
    },
    answer: { question: 'Q_HE', answer: 'A_HE' },
    sections: [],
    faqs: [{ q: 'FQ_HE', a: 'FA_HE' }],
    labels: { faqTitle: 'FAQT_HE', relatedTitle: 'REL_HE' },
    related: [],
    breadcrumb: { home: 'HOME_HE', hub: 'HUB_HE', current: 'CUR_HE' },
    learning: {
      educationalUse: ['Classroom Activity'],
      educationalLevel: ['Primary'],
      typicalAgeRange: '6-12',
      teaches: 'TEACHES_HE',
      timeRequired: 'PT5M',
    },
    ...overrides,
  };
}

const PATH = '/education/brain-breaks-word-games';

describe('EDUCATION_LOCALES', () => {
  it('covers the six locales the app ships', () => {
    expect([...EDUCATION_LOCALES].sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
  });
});

describe('buildEducationLandingMetadata', () => {
  it('uses the per-locale copy rather than a hardcoded English string', () => {
    const m = buildEducationLandingMetadata({ locale: 'he', path: PATH, content: content() });
    expect(m.title).toBe('TITLE_HE');
    expect(m.description).toBe('DESC_HE');
    // keywords must come from content, never a fixed English list
    expect(m.keywords).toEqual(['מילים', 'כיתה']);
  });

  it('emits a self-referencing canonical for the requested locale', () => {
    const m = buildEducationLandingMetadata({ locale: 'ja', path: PATH, content: content() });
    expect(m.alternates?.canonical).toBe(`${EDUCATION_BASE_URL}/ja${PATH}`);
  });

  it('emits hreflang for every locale plus an x-default pointing at en', () => {
    const m = buildEducationLandingMetadata({ locale: 'sv', path: PATH, content: content() });
    const langs = m.alternates?.languages as Record<string, string>;
    for (const loc of EDUCATION_LOCALES) {
      expect(langs[loc]).toBe(`${EDUCATION_BASE_URL}/${loc}${PATH}`);
    }
    expect(langs['x-default']).toBe(`${EDUCATION_BASE_URL}/en${PATH}`);
  });

  it('maps each locale to its OpenGraph locale code', () => {
    const cases: Array<[string, string]> = [
      ['en', 'en_US'],
      ['he', 'he_IL'],
      ['es', 'es_ES'],
      ['sv', 'sv_SE'],
      ['ja', 'ja_JP'],
      ['ru', 'ru_RU'],
    ];
    for (const [locale, og] of cases) {
      const m = buildEducationLandingMetadata({ locale, path: PATH, content: content() });
      expect(m.openGraph?.locale).toBe(og);
    }
  });

  it('noindexes a locale outside the supported set but keeps it followable', () => {
    const m = buildEducationLandingMetadata({ locale: 'de', path: PATH, content: content() });
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it('indexes supported locales', () => {
    const m = buildEducationLandingMetadata({ locale: 'ru', path: PATH, content: content() });
    expect(m.robots).toEqual({ index: true, follow: true });
  });

  it('falls back to the meta title when og/twitter copy is absent', () => {
    const c = content();
    delete c.meta.ogTitle;
    delete c.meta.ogDescription;
    delete c.meta.twitterDescription;
    const m = buildEducationLandingMetadata({ locale: 'en', path: PATH, content: c });
    expect(m.openGraph?.title).toBe('TITLE_HE');
    expect(m.openGraph?.description).toBe('DESC_HE');
    expect(m.twitter?.description).toBe('DESC_HE');
  });

  it('points OG images at the locale hero, falling back to the English asset', () => {
    const he = buildEducationLandingMetadata({ locale: 'he', path: PATH, content: content() });
    expect(JSON.stringify(he.openGraph?.images)).toContain('education-hero-he');
    // ru has no bespoke hero asset — must not 404, must fall back
    const ru = buildEducationLandingMetadata({ locale: 'ru', path: PATH, content: content() });
    expect(JSON.stringify(ru.openGraph?.images)).toContain('education-hero-en');
  });
});

describe('buildEducationLandingJsonLd', () => {
  const graph = (locale: string, c = content()) =>
    buildEducationLandingJsonLd({ locale, path: PATH, content: c });

  const byType = (locale: string, type: string, c = content()) =>
    graph(locale, c).find((n) => n['@type'] === type) as Record<string, unknown> | undefined;

  it('declares inLanguage as the page locale, not always English', () => {
    expect(byType('ja', 'LearningResource')?.inLanguage).toBe('ja');
    expect(byType('he', 'LearningResource')?.inLanguage).toBe('he');
    expect(byType('en', 'LearningResource')?.inLanguage).toBe('en');
  });

  it('localizes the breadcrumb trail instead of hardcoding English names', () => {
    const crumbs = byType('he', 'BreadcrumbList')?.itemListElement as Array<Record<string, unknown>>;
    expect(crumbs.map((c) => c.name)).toEqual(['HOME_HE', 'HUB_HE', 'CUR_HE']);
    expect(crumbs.map((c) => c.item)).toEqual([
      `${EDUCATION_BASE_URL}/he`,
      `${EDUCATION_BASE_URL}/he/education`,
      `${EDUCATION_BASE_URL}/he${PATH}`,
    ]);
  });

  it('emits a FAQPage built from the localized FAQ list', () => {
    const faq = byType('es', 'FAQPage');
    const entities = faq?.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('FQ_HE');
    expect((entities[0].acceptedAnswer as Record<string, unknown>).text).toBe('FA_HE');
  });

  it('omits the FAQPage node entirely when the page has no FAQs', () => {
    expect(byType('en', 'FAQPage', content({ faqs: [] }))).toBeUndefined();
  });

  it('exposes the answer-first block as speakable so AI answer engines can quote it', () => {
    const page = byType('en', 'WebPage');
    expect(page?.speakable).toBeTruthy();
    const speakable = page?.speakable as Record<string, unknown>;
    expect(speakable['@type']).toBe('SpeakableSpecification');
    expect(speakable.cssSelector).toContain('[data-answer]');
  });

  it('gives every node a unique absolute @id anchored on the localized URL', () => {
    const ids = graph('sv').map((n) => n['@id'] as string);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith(`${EDUCATION_BASE_URL}/sv${PATH}#`)).toBe(true);
    }
  });

  it('carries the learning metadata through to the LearningResource node', () => {
    const lr = byType('en', 'LearningResource');
    expect(lr?.educationalUse).toEqual(['Classroom Activity']);
    expect(lr?.educationalLevel).toEqual(['Primary']);
    expect(lr?.typicalAgeRange).toBe('6-12');
    expect(lr?.teaches).toBe('TEACHES_HE');
    expect(lr?.timeRequired).toBe('PT5M');
    expect(lr?.isAccessibleForFree).toBe(true);
  });

  it('links the LearningResource to the shared EducationalOrganization entity', () => {
    const lr = byType('en', 'LearningResource');
    const provider = lr?.provider as Record<string, unknown>;
    expect(provider['@id']).toBe(`${EDUCATION_BASE_URL}/en/education#org`);
  });
});
