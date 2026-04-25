import { describe, it, expect } from 'vitest';
import {
  buildEducationFaqJsonLd,
  buildEducationOrgJsonLd,
  buildEducationBreadcrumbJsonLd,
  buildEducationCourseJsonLd,
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
});
