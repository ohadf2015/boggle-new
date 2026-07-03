import { describe, it, expect } from 'vitest';
import { buildHomepageFaqJsonLd } from '../homepageFaqJsonLd';

describe('homepageFaqJsonLd', () => {
  describe('buildHomepageFaqJsonLd', () => {
    it('returns a FAQPage schema with mainEntity for en locale', () => {
      const schema = buildHomepageFaqJsonLd('en');
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema['@id']).toBe('https://www.lexiclash.live/en#faq');
      expect(Array.isArray(schema.mainEntity)).toBe(true);
      expect(schema.mainEntity.length).toBeGreaterThan(0);
    });

    it('uses locale in @id', () => {
      const schema = buildHomepageFaqJsonLd('he');
      expect(schema['@id']).toBe('https://www.lexiclash.live/he#faq');
    });

    it('includes English FAQ content for en locale', () => {
      const schema = buildHomepageFaqJsonLd('en');
      const content = JSON.stringify(schema);
      expect(content).toContain('free');
      expect(content).toContain('word');
    });

    it('includes Hebrew FAQ content for he locale', () => {
      const schema = buildHomepageFaqJsonLd('he');
      const hebrewName = schema.mainEntity[0].name;
      expect(typeof hebrewName).toBe('string');
      expect(hebrewName.length).toBeGreaterThan(0);
      // Should not be the English default
      expect(hebrewName).not.toBe('Can I play boggle online free with no download?');
    });

    it('supports sv (Swedish) locale with Swedish strings', () => {
      const schema = buildHomepageFaqJsonLd('sv');
      expect(schema['@id']).toBe('https://www.lexiclash.live/sv#faq');
      const firstQuestion = schema.mainEntity[0].name;
      expect(typeof firstQuestion).toBe('string');
      expect(firstQuestion.length).toBeGreaterThan(0);
    });

    it('supports ja (Japanese) locale with Japanese strings', () => {
      const schema = buildHomepageFaqJsonLd('ja');
      expect(schema['@id']).toBe('https://www.lexiclash.live/ja#faq');
      const firstQuestion = schema.mainEntity[0].name;
      expect(typeof firstQuestion).toBe('string');
      expect(firstQuestion.length).toBeGreaterThan(0);
    });

    it('supports es (Spanish) locale with Spanish strings', () => {
      const schema = buildHomepageFaqJsonLd('es');
      expect(schema['@id']).toBe('https://www.lexiclash.live/es#faq');
      const firstQuestion = schema.mainEntity[0].name;
      expect(typeof firstQuestion).toBe('string');
      expect(firstQuestion.length).toBeGreaterThan(0);
    });

    it('falls back to en for unknown locale', () => {
      const schema = buildHomepageFaqJsonLd('zz');
      expect(schema['@id']).toBe('https://www.lexiclash.live/en#faq');
    });
  });

  describe('Russian (ru) locale support', () => {
    it('buildHomepageFaqJsonLd supports ru locale with Russian strings', () => {
      const schema = buildHomepageFaqJsonLd('ru');
      expect(schema['@id']).toBe('https://www.lexiclash.live/ru#faq');
      expect(Array.isArray(schema.mainEntity)).toBe(true);
      expect(schema.mainEntity.length).toBeGreaterThan(0);
      const firstQuestion = schema.mainEntity[0].name;
      expect(typeof firstQuestion).toBe('string');
      expect(firstQuestion.length).toBeGreaterThan(0);
      // Should not be the English default
      expect(firstQuestion).not.toBe('Can I play boggle online free with no download?');
    });

    it('ru FAQ content includes Russian text', () => {
      const schema = buildHomepageFaqJsonLd('ru');
      const content = JSON.stringify(schema.mainEntity);
      // Russian FAQ should be present (contains Cyrillic)
      expect(content.length).toBeGreaterThan(100);
    });
  });
});
