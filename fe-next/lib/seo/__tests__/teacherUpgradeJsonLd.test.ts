import { describe, it, expect } from 'vitest';
import {
  buildTeacherProProductJsonLd,
  buildTeacherUpgradeFaqJsonLd,
} from '../teacherUpgradeJsonLd';

const INPUT = {
  name: 'Teacher Pro',
  description: 'Upgrade to Teacher Pro for unlimited classrooms and unlimited students per class. $9/month.',
};

describe('teacherUpgradeJsonLd', () => {
  describe('buildTeacherProProductJsonLd', () => {
    it('returns a Product schema with an Offer carrying the $9/month price', () => {
      const schema = buildTeacherProProductJsonLd('en', INPUT);
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Product');
      expect(schema['@id']).toBe('https://www.lexiclash.live/en/teacher/upgrade#product');
      expect(schema.name).toBe('Teacher Pro');
      expect(schema.brand).toEqual({ '@type': 'Brand', name: 'LexiClash' });
      expect(schema.offers).toMatchObject({
        '@type': 'Offer',
        price: '9',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: 'https://www.lexiclash.live/en/teacher/upgrade',
      });
      expect(schema.offers.priceSpecification).toMatchObject({
        '@type': 'UnitPriceSpecification',
        price: '9',
        priceCurrency: 'USD',
        unitCode: 'MON',
      });
    });

    it('never emits fabricated aggregateRating or review fields', () => {
      const schema = buildTeacherProProductJsonLd('en', INPUT);
      expect(schema).not.toHaveProperty('aggregateRating');
      expect(schema).not.toHaveProperty('review');
    });

    it('localizes the canonical url and @id', () => {
      expect(buildTeacherProProductJsonLd('he', INPUT).url)
        .toBe('https://www.lexiclash.live/he/teacher/upgrade');
      expect(buildTeacherProProductJsonLd('ja', INPUT)['@id'])
        .toBe('https://www.lexiclash.live/ja/teacher/upgrade#product');
    });

    it('falls back to en for unsupported locales', () => {
      expect(buildTeacherProProductJsonLd('fr', INPUT).url)
        .toBe('https://www.lexiclash.live/en/teacher/upgrade');
    });
  });

  describe('buildTeacherUpgradeFaqJsonLd', () => {
    it('returns a FAQPage schema with mainEntity built from provided FAQs', () => {
      const faq = [
        { question: 'Can I cancel anytime?', answer: 'Yes!' },
        { question: 'Will I be charged automatically?', answer: 'Yes, monthly.' },
      ];
      const schema = buildTeacherUpgradeFaqJsonLd('en', faq);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema['@id']).toBe('https://www.lexiclash.live/en/teacher/upgrade#faq');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]).toMatchObject({
        '@type': 'Question',
        name: 'Can I cancel anytime?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes!' },
      });
    });

    it('returns null when faq array is empty (avoids invalid FAQPage)', () => {
      expect(buildTeacherUpgradeFaqJsonLd('sv', [])).toBeNull();
    });

    it('uses locale in @id', () => {
      const schema = buildTeacherUpgradeFaqJsonLd('ru', [{ question: 'q', answer: 'a' }]);
      expect(schema!['@id']).toBe('https://www.lexiclash.live/ru/teacher/upgrade#faq');
    });
  });
});
