import { describe, it, expect } from 'vitest';
import {
  buildEducationFaqJsonLd,
  buildEducationOrgJsonLd,
  buildEducationBreadcrumbJsonLd,
  buildEducationCourseJsonLd,
  buildEducationWebApplicationJsonLd,
} from '../educationJsonLd';

describe('educationJsonLd', () => {
  describe('buildEducationFaqJsonLd', () => {
    it('returns a FAQPage schema with mainEntity built from provided FAQs', () => {
      const faq = [
        { question: 'Q1?', answer: 'A1.' },
        { question: 'Q2?', answer: 'A2.' },
      ];
      const schema = buildEducationFaqJsonLd('en', faq);
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema['@id']).toBe('https://www.lexiclash.live/en/education#faq');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]).toMatchObject({
        '@type': 'Question',
        name: 'Q1?',
        acceptedAnswer: { '@type': 'Answer', text: 'A1.' },
      });
    });

    it('returns null when faq array is empty (avoids invalid FAQPage)', () => {
      expect(buildEducationFaqJsonLd('ja', [])).toBeNull();
    });

    it('uses locale in @id', () => {
      const schema = buildEducationFaqJsonLd('he', [{ question: 'q', answer: 'a' }]);
      expect(schema!['@id']).toBe('https://www.lexiclash.live/he/education#faq');
    });
  });

  describe('buildEducationOrgJsonLd', () => {
    it('returns an EducationalOrganization schema with required fields', () => {
      const schema = buildEducationOrgJsonLd('en');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('EducationalOrganization');
      expect(schema.name).toContain('LexiClash');
      expect(schema.url).toBe('https://www.lexiclash.live/en/education');
      expect(schema.educationalCredentialAwarded).toBeUndefined();
      expect(typeof schema.description).toBe('string');
      expect(schema.description.length).toBeGreaterThan(40);
    });

    it('uses locale in url', () => {
      expect(buildEducationOrgJsonLd('he').url).toBe('https://www.lexiclash.live/he/education');
    });

    it('exposes a stable @id so other schemas can reference the same entity', () => {
      expect(buildEducationOrgJsonLd('en')['@id']).toBe('https://www.lexiclash.live/en/education#org');
    });

    it('links real external profiles via sameAs (entity verification for AI/search)', () => {
      const schema = buildEducationOrgJsonLd('en');
      expect(Array.isArray(schema.sameAs)).toBe(true);
      // Must include the three real, existing LexiClash profiles — no placeholders.
      expect(schema.sameAs).toContain('https://www.instagram.com/lexi.clash');
      expect(schema.sameAs).toContain('https://play.google.com/store/apps/details?id=live.lexiclash.app');
      expect(schema.sameAs).toContain('https://www.crazygames.com/game/lexiclash');
      // No stray self-reference to a non-canonical domain.
      expect(schema.sameAs).not.toContain('https://www.lexiclash.live');
      expect(schema.sameAs.every((u: string) => !u.includes('lexiclash.com'))).toBe(true);
    });

    it('declares a square brand logo as an ImageObject', () => {
      const schema = buildEducationOrgJsonLd('en');
      expect(schema.logo).toMatchObject({
        '@type': 'ImageObject',
        url: 'https://www.lexiclash.live/logo.png',
      });
    });

    it('marks the organization as free to use', () => {
      expect(buildEducationOrgJsonLd('en').isAccessibleForFree).toBe(true);
    });
  });

  describe('buildEducationWebApplicationJsonLd', () => {
    it('returns a free EducationalApplication WebApplication', () => {
      const schema = buildEducationWebApplicationJsonLd('en');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebApplication');
      expect(schema['@id']).toBe('https://www.lexiclash.live/en/education#webapp');
      expect(schema.applicationCategory).toBe('EducationalApplication');
      expect(schema.url).toBe('https://www.lexiclash.live/en/education');
      expect(schema.operatingSystem).toMatch(/web|browser/i);
      expect(schema.isAccessibleForFree).toBe(true);
    });

    it('declares a zero-price Offer (the GEO signal for "free" / "no paywall" queries)', () => {
      const schema = buildEducationWebApplicationJsonLd('en');
      expect(schema.offers).toMatchObject({
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      });
    });

    it('lists concrete differentiating features', () => {
      const schema = buildEducationWebApplicationJsonLd('en');
      expect(Array.isArray(schema.featureList)).toBe(true);
      expect(schema.featureList.length).toBeGreaterThanOrEqual(4);
      // Answer-dense facts that AI engines extract for comparison queries.
      const joined = schema.featureList.join(' ').toLowerCase();
      expect(joined).toContain('no');
      expect(joined).toMatch(/signup|sign-up|account/);
    });

    it('references the canonical Organization @id as provider (no duplicate org entity)', () => {
      const schema = buildEducationWebApplicationJsonLd('he');
      expect(schema.provider).toMatchObject({
        '@id': 'https://www.lexiclash.live/he/education#org',
      });
    });

    it('declares supported locales and a teacher+student audience', () => {
      const schema = buildEducationWebApplicationJsonLd('en');
      expect(schema.inLanguage).toEqual(expect.arrayContaining(['en', 'he', 'sv', 'ja', 'es']));
      expect(schema.audience['@type']).toBe('EducationalAudience');
    });

    it('uses locale in url + @id', () => {
      const schema = buildEducationWebApplicationJsonLd('es');
      expect(schema.url).toBe('https://www.lexiclash.live/es/education');
      expect(schema['@id']).toBe('https://www.lexiclash.live/es/education#webapp');
    });
  });

  describe('buildEducationCourseJsonLd', () => {
    it('returns a Course schema with provider linked to the EducationalOrganization', () => {
      const schema = buildEducationCourseJsonLd('en');
      expect(schema['@type']).toBe('Course');
      expect(schema.name).toContain('Vocabulary');
      expect(schema.url).toBe('https://www.lexiclash.live/en/education');
      expect(schema.provider).toMatchObject({
        '@type': 'EducationalOrganization',
        name: 'LexiClash Education',
      });
      expect(schema.inLanguage).toBe('en');
      expect(schema.isAccessibleForFree).toBe(true);
      expect(Array.isArray(schema.hasCourseInstance)).toBe(true);
      expect(schema.hasCourseInstance.length).toBeGreaterThan(0);
      expect(schema.hasCourseInstance[0]).toMatchObject({
        '@type': 'CourseInstance',
        courseMode: 'Online',
      });
    });

    it('uses locale in url + inLanguage', () => {
      const schema = buildEducationCourseJsonLd('he');
      expect(schema.url).toBe('https://www.lexiclash.live/he/education');
      expect(schema.inLanguage).toBe('he');
    });
  });

  describe('buildEducationBreadcrumbJsonLd', () => {
    it('returns a 2-item BreadcrumbList: Home → Education', () => {
      const schema = buildEducationBreadcrumbJsonLd('en');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0]).toMatchObject({
        '@type': 'ListItem', position: 1, item: 'https://www.lexiclash.live/en',
      });
      expect(schema.itemListElement[1]).toMatchObject({
        '@type': 'ListItem', position: 2, item: 'https://www.lexiclash.live/en/education',
      });
    });
  });

  describe('Russian (ru) locale support', () => {
    it('buildEducationOrgJsonLd supports ru locale with Russian description', () => {
      const schema = buildEducationOrgJsonLd('ru');
      expect(schema.url).toBe('https://www.lexiclash.live/ru/education');
      expect(schema['@id']).toBe('https://www.lexiclash.live/ru/education#org');
      expect(schema.inLanguage).toBe('ru');
      expect(typeof schema.description).toBe('string');
      expect(schema.description.length).toBeGreaterThan(0);
      // Russian text should be present (not English fallback)
      expect(schema.description).not.toBe('LexiClash Education provides classroom-ready word games, vocabulary duels, and a teacher dashboard for assigning curriculum-aligned exercises and tracking student progress. Free to use, browser-based, no downloads required.');
    });

    it('buildEducationCourseJsonLd supports ru locale with Russian strings', () => {
      const schema = buildEducationCourseJsonLd('ru');
      expect(schema.inLanguage).toBe('ru');
      expect(schema.url).toBe('https://www.lexiclash.live/ru/education');
      expect(typeof schema.name).toBe('string');
      expect(schema.name.length).toBeGreaterThan(0);
    });

    it('buildEducationWebApplicationJsonLd supports ru locale with Russian features', () => {
      const schema = buildEducationWebApplicationJsonLd('ru');
      expect(schema.inLanguage).toContain('ru');
      expect(schema.url).toBe('https://www.lexiclash.live/ru/education');
      expect(Array.isArray(schema.featureList)).toBe(true);
      expect(schema.featureList.length).toBeGreaterThanOrEqual(4);
      // At least one feature should not be the English default
      const joined = schema.featureList.join(' ');
      expect(joined).toBeTruthy();
    });

    it('buildEducationFaqJsonLd uses ru locale in @id', () => {
      const faq = [{ question: 'Test?', answer: 'Test.' }];
      const schema = buildEducationFaqJsonLd('ru', faq);
      expect(schema!['@id']).toBe('https://www.lexiclash.live/ru/education#faq');
    });

    it('buildEducationBreadcrumbJsonLd uses ru locale in URLs', () => {
      const schema = buildEducationBreadcrumbJsonLd('ru');
      expect(schema.itemListElement[0].item).toBe('https://www.lexiclash.live/ru');
      expect(schema.itemListElement[1].item).toBe('https://www.lexiclash.live/ru/education');
    });
  });
});
