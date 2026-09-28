// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page from './page';
import { getGamesForTeachersLanding } from './landing';

describe('games-for-teachers page', () => {
  it('renders a district/school upsell CTA linking to for-schools lead form', async () => {
    const { container } = render(
      await Page({ params: Promise.resolve({ locale: 'en' }) })
    );
    const districtLink = container.querySelector('a[href="/en/education/for-schools"]');
    expect(districtLink).not.toBeNull();
  });

  it('renders a visible GEO answer block and H3 FAQs (not collapsed details)', async () => {
    const { container } = render(
      await Page({ params: Promise.resolve({ locale: 'en' }) }),
    );
    expect(container.querySelector('[data-answer]')).not.toBeNull();
    expect(container.querySelector('[data-geo-faq] h3')).not.toBeNull();
    expect(container.querySelector('[data-geo-faq] details')).toBeNull();
  });
});

describe('games-for-teachers landing — Course JSON-LD + GEO answer', () => {
  it('emits Course extraJsonLd with a free Offer for en/he/es', () => {
    for (const locale of ['en', 'he', 'es'] as const) {
      const landing = getGamesForTeachersLanding(locale);
      const course = landing.extraJsonLd?.find((n) => n['@type'] === 'Course') as
        | { offers?: { price?: string }; hasCourseInstance?: unknown[] }
        | undefined;
      expect(course, locale).toBeDefined();
      expect(course!.offers?.price).toBe('0');
      expect(course!.hasCourseInstance?.length).toBeGreaterThan(0);
      expect(landing.answer?.answer.length).toBeGreaterThan(40);
    }
  });
});
